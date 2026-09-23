const express = require('express');
const router = express.Router();
const db = require('../db');

function dateRange(req) {
  const to = req.query.to || new Date().toISOString().slice(0, 10);
  const from = req.query.from || to;
  return { from, to };
}

// ---------- SALES SUMMARY ----------
router.get('/sales', (req, res) => {
  const { from, to } = dateRange(req);
  const bills = db.prepare(
    `SELECT * FROM bills WHERE date(bill_date) BETWEEN ? AND ? AND status = 'active'`
  ).all(from, to);

  const totalSales = bills.reduce((s, b) => s + b.total_amount, 0);
  const totalDiscount = bills.reduce((s, b) => s + b.discount, 0);
  const totalBills = bills.length;
  const avgBillValue = totalBills > 0 ? totalSales / totalBills : 0;

  const cancelledBills = db.prepare(
    `SELECT COUNT(*) AS count FROM bills WHERE date(bill_date) BETWEEN ? AND ? AND status = 'cancelled'`
  ).get(from, to).count;

  res.json({
    from, to, total_sales: totalSales, total_bills: totalBills,
    avg_bill_value: avgBillValue, total_discount: totalDiscount, cancelled_bills: cancelledBills
  });
});

// ---------- PRODUCT SALES / PROFITABILITY ----------
router.get('/products', (req, res) => {
  const { from, to } = dateRange(req);
  const rows = db.prepare(
    `SELECT p.name AS product, SUM(bi.quantity) AS qty_sold,
            SUM(bi.price) AS sales, SUM(bi.cost_price) AS cost
     FROM bill_items bi
     JOIN bills b ON b.id = bi.bill_id
     JOIN products p ON p.id = bi.product_id
     WHERE date(b.bill_date) BETWEEN ? AND ? AND b.status = 'active'
     GROUP BY p.id ORDER BY sales DESC`
  ).all(from, to);

  const withProfit = rows.map(r => ({ ...r, profit: r.sales - r.cost }));
  res.json({ from, to, products: withProfit });
});

// ---------- PAYMENT REPORT ----------
router.get('/payments', (req, res) => {
  const { from, to } = dateRange(req);
  const bills = db.prepare(
    `SELECT payment_mode, total_amount FROM bills WHERE date(bill_date) BETWEEN ? AND ? AND status = 'active'`
  ).all(from, to);

  const total = bills.reduce((s, b) => s + b.total_amount, 0);
  const map = {};
  for (const b of bills) map[b.payment_mode] = (map[b.payment_mode] || 0) + b.total_amount;

  const breakdown = Object.entries(map).map(([mode, amount]) => ({
    mode, amount, percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0
  }));

  res.json({ from, to, total, breakdown });
});

// ---------- PURCHASE REPORT ----------
router.get('/purchases', (req, res) => {
  const { from, to } = dateRange(req);
  const supplierId = req.query.supplier_id;

  let query = `
    SELECT p.*, s.name AS supplier_name FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.purchase_date BETWEEN ? AND ?
  `;
  const params = [from, to];
  if (supplierId) {
    query += ' AND p.supplier_id = ?';
    params.push(supplierId);
  }
  query += ' ORDER BY p.purchase_date DESC';

  const purchases = db.prepare(query).all(...params);
  const totalPurchased = purchases.reduce((s, p) => s + p.total_amount, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.paid_amount, 0);
  const totalOutstanding = totalPurchased - totalPaid;

  res.json({ from, to, purchases, totals: { total_purchased: totalPurchased, total_paid: totalPaid, total_outstanding: totalOutstanding } });
});

// ---------- STOCK REPORT ----------
router.get('/stock', (req, res) => {
  const materials = db.prepare('SELECT * FROM raw_materials WHERE is_active = 1 ORDER BY category, name').all();

  const withValue = materials.map(m => {
    const lastRate = db.prepare(
      `SELECT rate FROM purchase_items WHERE raw_material_id = ? ORDER BY id DESC LIMIT 1`
    ).get(m.id);
    const rate = lastRate ? lastRate.rate : 0;
    const value = m.current_stock * rate;

    let status = 'Normal';
    if (m.current_stock <= 0) status = 'Critical';
    else if (m.current_stock <= m.reorder_level) status = 'Low';

    return { ...m, value, status };
  });

  const totalValue = withValue.reduce((s, m) => s + m.value, 0);
  res.json({ materials: withValue, total_value: totalValue });
});

// ---------- STOCK MOVEMENT (for one raw material) ----------
router.get('/stock/:materialId/movement', (req, res) => {
  const { from, to } = dateRange(req);
  const materialId = req.params.materialId;

  const material = db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(materialId);
  if (!material) return res.status(404).json({ error: 'Raw material not found' });

  const purchases = db.prepare(
    `SELECT p.purchase_date AS date, pi.quantity FROM purchase_items pi
     JOIN purchases p ON p.id = pi.purchase_id
     WHERE pi.raw_material_id = ? AND p.purchase_date BETWEEN ? AND ?`
  ).all(materialId, from, to);
  const totalPurchased = purchases.reduce((s, p) => s + p.quantity, 0);

  const adjustments = db.prepare(
    `SELECT reason, SUM(quantity_change) AS total FROM stock_adjustments
     WHERE raw_material_id = ? AND adjustment_date BETWEEN ? AND ? GROUP BY reason`
  ).all(materialId, from, to);

  res.json({
    material: material.name, unit: material.unit, current_stock: material.current_stock,
    period_purchased: totalPurchased, adjustments_by_reason: adjustments
  });
});

// ---------- STOCK LEDGER (all transactions for one material, chronological, running balance) ----------
router.get('/stock/:materialId/ledger', (req, res) => {
  const { from, to } = dateRange(req);
  const materialId = req.params.materialId;

  const material = db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(materialId);
  if (!material) return res.status(404).json({ error: 'Raw material not found' });

  // Purchases (stock IN)
  const purchases = db.prepare(
    `SELECT p.purchase_date AS date, p.id AS ref_id, p.invoice_no, pi.quantity, s.name AS supplier_name
     FROM purchase_items pi
     JOIN purchases p ON p.id = pi.purchase_id
     JOIN suppliers s ON s.id = p.supplier_id
     WHERE pi.raw_material_id = ? AND p.purchase_date BETWEEN ? AND ?`
  ).all(materialId, from, to).map(p => ({
    date: p.date, type: 'Purchase', reference: p.invoice_no || `From ${p.supplier_name}`,
    qty_in: p.quantity, qty_out: 0
  }));

  // Sales consumption (stock OUT, via recipe) - only from active (non-cancelled) bills
  const salesRows = db.prepare(
    `SELECT date(b.bill_date) AS date, b.bill_no, bi.quantity AS sold_qty,
            pr.output_qty, r.quantity_required
     FROM bill_items bi
     JOIN bills b ON b.id = bi.bill_id
     JOIN products pr ON pr.id = bi.product_id
     JOIN recipes r ON r.product_id = pr.id AND r.raw_material_id = ?
     WHERE b.status = 'active' AND date(b.bill_date) BETWEEN ? AND ?`
  ).all(materialId, from, to).map(s => ({
    date: s.date, type: 'Sale', reference: s.bill_no,
    qty_in: 0, qty_out: (s.sold_qty / (s.output_qty || 1)) * s.quantity_required
  }));

  // Stock adjustments (wastage, damage, correction, daily-recount) - either direction
  const adjustments = db.prepare(
    `SELECT adjustment_date AS date, reason, notes, quantity_change
     FROM stock_adjustments WHERE raw_material_id = ? AND adjustment_date BETWEEN ? AND ?`
  ).all(materialId, from, to).map(a => ({
    date: a.date,
    type: a.reason === 'daily-recount' ? 'Stock Count' : a.reason.charAt(0).toUpperCase() + a.reason.slice(1),
    reference: a.notes || '-',
    qty_in: a.quantity_change > 0 ? a.quantity_change : 0,
    qty_out: a.quantity_change < 0 ? Math.abs(a.quantity_change) : 0
  }));

  const allTransactions = [...purchases, ...salesRows, ...adjustments].sort((a, b) => a.date.localeCompare(b.date));

  // Opening stock = current stock minus every movement in this period (working backwards)
  const netMovementInPeriod = allTransactions.reduce((sum, t) => sum + t.qty_in - t.qty_out, 0);
  const openingStock = material.current_stock - netMovementInPeriod;

  let running = openingStock;
  const withBalance = allTransactions.map(t => {
    running += t.qty_in - t.qty_out;
    return { ...t, balance: running };
  });

  const totalPurchased = purchases.reduce((s, p) => s + p.qty_in, 0);
  const totalSold = salesRows.reduce((s, r) => s + r.qty_out, 0);
  const totalWastage = adjustments.filter(a => a.type === 'Wastage' || a.type === 'Damaged').reduce((s, a) => s + a.qty_out, 0);
  const totalCorrection = adjustments.filter(a => a.type === 'Correction' || a.type === 'Stock Count')
    .reduce((s, a) => s + a.qty_in - a.qty_out, 0);

  res.json({
    material: material.name, unit: material.unit,
    opening_stock: openingStock, current_stock: material.current_stock,
    total_purchased: totalPurchased, total_sold_consumption: totalSold,
    total_wastage: totalWastage, total_correction: totalCorrection,
    transactions: withBalance
  });
});

module.exports = router;
