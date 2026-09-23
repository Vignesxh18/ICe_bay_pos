const express = require('express');
const router = express.Router();
const db = require('../db');
const { permissionsFor } = require('./auth');

function nextBillNo() {
  const row = db.prepare('SELECT bill_no FROM bills ORDER BY id DESC LIMIT 1').get();
  if (!row) return 'ICS-000001';
  const lastNum = parseInt(row.bill_no.split('-')[1], 10);
  return 'ICS-' + String(lastNum + 1).padStart(6, '0');
}

function getCostPerUnit(productId) {
  const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(productId);
  const outputQty = (product && product.output_qty) || 1;
  const rows = db.prepare(
    `SELECT r.quantity_required,
            (SELECT rate FROM purchase_items pi WHERE pi.raw_material_id = r.raw_material_id ORDER BY pi.id DESC LIMIT 1) AS last_rate
     FROM recipes r WHERE r.product_id = ?`
  ).all(productId);
  const batchCost = rows.reduce((sum, r) => sum + (r.quantity_required * (r.last_rate || 0)), 0);
  return batchCost / outputQty;
}

function deductStockForProduct(productId, quantitySold) {
  const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  const outputQty = product.output_qty || 1;
  const batchFraction = quantitySold / outputQty;

  const recipeRows = db.prepare('SELECT raw_material_id, quantity_required FROM recipes WHERE product_id = ?').all(productId);
  const bumpStock = db.prepare('UPDATE raw_materials SET current_stock = current_stock - ? WHERE id = ?');
  for (const r of recipeRows) {
    bumpStock.run(r.quantity_required * batchFraction, r.raw_material_id);
  }
}

function restoreStockForProduct(productId, quantitySold) {
  const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(productId);
  const outputQty = (product && product.output_qty) || 1;
  const batchFraction = quantitySold / outputQty;
  const recipeRows = db.prepare('SELECT raw_material_id, quantity_required FROM recipes WHERE product_id = ?').all(productId);
  const bumpStock = db.prepare('UPDATE raw_materials SET current_stock = current_stock + ? WHERE id = ?');
  for (const r of recipeRows) {
    bumpStock.run(r.quantity_required * batchFraction, r.raw_material_id);
  }
}

// ---------- CREATE BILL ----------
router.post('/', (req, res) => {
  const { payment_mode, discount, lines } = req.body;
  if (!payment_mode || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'payment_mode and at least one line item are required' });
  }

  try {
    const tx = db.transaction(() => {
      const expandedLines = [];

      for (const line of lines) {
        if (line.combo_id) {
          const combo = db.prepare('SELECT * FROM combos WHERE id = ?').get(line.combo_id);
          if (!combo) throw new Error(`Combo ${line.combo_id} not found`);
          const comboItems = db.prepare('SELECT * FROM combo_items WHERE combo_id = ?').all(line.combo_id);
          const comboQty = line.quantity || 1;
          const paidCount = comboItems.filter(x => !x.is_free).length || 1;

          for (const ci of comboItems) {
            expandedLines.push({
              product_id: ci.product_id,
              quantity: ci.quantity * comboQty,
              is_free: !!ci.is_free,
              combo_id: line.combo_id,
              combo_price_share: ci.is_free ? 0 : (combo.price / paidCount) * comboQty
            });
          }
        } else {
          const product = db.prepare('SELECT selling_price FROM products WHERE id = ?').get(line.product_id);
          if (!product) throw new Error(`Product ${line.product_id} not found`);
          const lineDiscount = line.discount || 0;
          const original = product.selling_price * line.quantity;
          expandedLines.push({
            product_id: line.product_id,
            quantity: line.quantity,
            is_free: false,
            combo_id: null,
            price: original - lineDiscount,
            original_price: original
          });
        }
      }

      let subtotal = 0;
      let undiscountedSubtotal = 0;
      const billItemsToInsert = [];

      for (const line of expandedLines) {
        deductStockForProduct(line.product_id, line.quantity);
        const costPerUnit = getCostPerUnit(line.product_id);
        const lineCost = costPerUnit * line.quantity;
        const linePrice = line.is_free ? 0 : (line.price != null ? line.price : line.combo_price_share);
        subtotal += linePrice;
        undiscountedSubtotal += line.original_price != null ? line.original_price : linePrice;

        billItemsToInsert.push({
          product_id: line.product_id,
          combo_id: line.combo_id,
          quantity: line.quantity,
          price: linePrice,
          is_free: line.is_free ? 1 : 0,
          cost_price: lineCost
        });
      }

      const discountAmount = discount || 0;
      const totalAmount = subtotal - discountAmount;

      // Enforce the logged-in user's discount limit (percent of the undiscounted total)
      const totalDiscountGiven = (undiscountedSubtotal - subtotal) + discountAmount;
      const perms = permissionsFor(req.user.role);
      const maxAllowedDiscount = undiscountedSubtotal * (perms.maxDiscountPercent / 100);
      if (totalDiscountGiven > maxAllowedDiscount + 0.01) {
        throw new Error(`Discount exceeds your limit (max ${perms.maxDiscountPercent}% for ${req.user.role})`);
      }

      const billNo = nextBillNo();

      const billResult = db.prepare(
        `INSERT INTO bills (bill_no, subtotal, discount, total_amount, payment_mode, status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      ).run(billNo, subtotal, discountAmount, totalAmount, payment_mode);
      const billId = billResult.lastInsertRowid;

      const insertItem = db.prepare(
        `INSERT INTO bill_items (bill_id, product_id, combo_id, quantity, price, is_free, cost_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const item of billItemsToInsert) {
        insertItem.run(billId, item.product_id, item.combo_id, item.quantity, item.price, item.is_free, item.cost_price);
      }

      return { billId, billNo, subtotal, discountAmount, totalAmount };
    });

    const { billId, billNo, subtotal, discountAmount, totalAmount } = tx();

    if (discountAmount > 0) {
      db.prepare('INSERT INTO audit_log (user_id, username, action, reference, amount, reason) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.user.id, req.user.username, 'Discount Applied', billNo, discountAmount, req.body.discount_reason || null);
    }

    const items = db.prepare(
      `SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
    ).all(billId);

    res.json({ id: billId, bill_no: billNo, subtotal, discount: discountAmount, total_amount: totalAmount, payment_mode, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create bill' });
  }
});

router.post('/:id/cancel', (req, res) => {
  const perms = permissionsFor(req.user.role);
  if (!perms.canCancelBills) return res.status(403).json({ error: 'You do not have permission to cancel bills' });

  try {
    const tx = db.transaction(() => {
      const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
      if (!bill) throw new Error('Bill not found');
      if (bill.status === 'cancelled') throw new Error('Bill already cancelled');

      const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(req.params.id);
      for (const item of items) {
        restoreStockForProduct(item.product_id, item.quantity);
      }
      db.prepare("UPDATE bills SET status = 'cancelled' WHERE id = ?").run(req.params.id);
      return bill;
    });
    const bill = tx();

    db.prepare('INSERT INTO audit_log (user_id, username, action, reference, amount, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, req.user.username, 'Bill Cancelled', bill.bill_no, bill.total_amount, req.body.reason || null);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to cancel bill' });
  }
});

router.get('/:id', (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  const items = db.prepare(
    `SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
  ).all(req.params.id);
  res.json({ ...bill, items });
});

// Printable receipt - narrow thermal-printer-style layout, opens in new tab
router.get('/:id/receipt', (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).send('Bill not found');

  const items = db.prepare(
    `SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
  ).all(req.params.id);

  const rows = items.map(i => `
    <tr>
      <td>${i.product_name}${i.is_free ? ' (FREE)' : ''}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">₹${i.price.toFixed(2)}</td>
    </tr>
  `).join('');

  res.send(`
    <html>
    <head>
      <title>Receipt - ${bill.bill_no}</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 16px; font-size: 13px; }
        h2 { text-align: center; margin: 4px 0; }
        .center { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td { padding: 2px 0; }
        hr { border: none; border-top: 1px dashed #000; }
        .total { font-weight: bold; font-size: 15px; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h2>🍦 Ice Cream Shop</h2>
      <div class="center">${bill.bill_no}</div>
      <div class="center">${bill.bill_date}</div>
      <hr/>
      <table>
        <tbody>${rows}</tbody>
      </table>
      <hr/>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">₹${bill.subtotal.toFixed(2)}</td></tr>
        ${bill.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-₹${bill.discount.toFixed(2)}</td></tr>` : ''}
        <tr class="total"><td>Total</td><td style="text-align:right">₹${bill.total_amount.toFixed(2)}</td></tr>
        <tr><td>Payment</td><td style="text-align:right">${bill.payment_mode.toUpperCase()}</td></tr>
      </table>
      <hr/>
      <div class="center">Thank you, visit again!</div>
      <button onclick="window.print()" style="width:100%;margin-top:16px;padding:10px;">Print</button>
    </body>
    </html>
  `);
});

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(
    `SELECT * FROM bills WHERE date(bill_date) = ? AND status = 'active' ORDER BY bill_date DESC`
  ).all(date);
  const totalSales = rows.reduce((s, b) => s + b.total_amount, 0);
  res.json({ date, bills: rows, total_sales: totalSales, bill_count: rows.length });
});

module.exports = router;
