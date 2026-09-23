const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/suppliers', (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
});

router.post('/suppliers', (req, res) => {
  const {
    name, company, phone, email, registered_under_gst, gst_no,
    register_address, state, city, pincode,
    fssai_lic_no, pan, msme_number, type, opening_balance
  } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(
    `INSERT INTO suppliers
     (name, company, phone, email, registered_under_gst, gst_no, register_address, state, city, pincode,
      fssai_lic_no, pan, msme_number, type, opening_balance, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`
  ).run(
    name, company || null, phone || null, email || null,
    registered_under_gst || 'No', gst_no || null,
    register_address || null, state || null, city || null, pincode || null,
    fssai_lic_no || null, pan || null, msme_number || null,
    type || 'Both', opening_balance || 0
  );
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
  res.json(supplier);
});

router.put('/suppliers/:id', (req, res) => {
  const {
    name, company, phone, email, registered_under_gst, gst_no,
    register_address, state, city, pincode,
    fssai_lic_no, pan, msme_number, type, status
  } = req.body;

  db.prepare(
    `UPDATE suppliers SET
     name = ?, company = ?, phone = ?, email = ?, registered_under_gst = ?, gst_no = ?,
     register_address = ?, state = ?, city = ?, pincode = ?,
     fssai_lic_no = ?, pan = ?, msme_number = ?, type = ?, status = ?
     WHERE id = ?`
  ).run(
    name, company || null, phone || null, email || null,
    registered_under_gst || 'No', gst_no || null,
    register_address || null, state || null, city || null, pincode || null,
    fssai_lic_no || null, pan || null, msme_number || null,
    type || 'Both', status || 'Active', req.params.id
  );
  res.json({ success: true });
});

router.get('/suppliers/:id/statement', (req, res) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const purchases = db.prepare(
    `SELECT id, purchase_date AS date, invoice_no, total_amount, paid_amount, 'purchase' AS type
     FROM purchases WHERE supplier_id = ?`
  ).all(req.params.id);

  const payments = db.prepare(
    `SELECT id, payment_date AS date, amount, mode, notes, 'payment' AS type
     FROM supplier_payments WHERE supplier_id = ?`
  ).all(req.params.id);

  const totalPurchased = purchases.reduce((s, p) => s + p.total_amount, 0);
  const totalPaidAtPurchase = purchases.reduce((s, p) => s + p.paid_amount, 0);
  const totalPaidSeparately = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = supplier.opening_balance + totalPurchased - totalPaidAtPurchase - totalPaidSeparately;

  res.json({
    supplier, purchases, payments,
    totals: { total_purchased: totalPurchased, total_paid: totalPaidAtPurchase + totalPaidSeparately, outstanding }
  });
});

router.post('/suppliers/:id/payments', (req, res) => {
  const { amount, mode, notes, payment_date } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  const result = db.prepare(
    'INSERT INTO supplier_payments (supplier_id, payment_date, amount, mode, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, payment_date || new Date().toISOString().slice(0, 10), amount, mode || null, notes || null);
  res.json({ id: result.lastInsertRowid, success: true });
});

// ---------- PURCHASES ----------

router.get('/', (req, res) => {
  let query = `SELECT p.*, s.name AS supplier_name FROM purchases p JOIN suppliers s ON s.id = p.supplier_id`;
  const params = [];
  if (req.query.supplier_id) {
    query += ' WHERE p.supplier_id = ?';
    params.push(req.query.supplier_id);
  }
  query += ' ORDER BY p.purchase_date DESC, p.id DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const purchase = db.prepare(
    `SELECT p.*, s.name AS supplier_name FROM purchases p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`
  ).get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

  const items = db.prepare(
    `SELECT pi.*, m.name AS raw_material_name, m.unit FROM purchase_items pi
     JOIN raw_materials m ON m.id = pi.raw_material_id WHERE pi.purchase_id = ?`
  ).all(req.params.id);

  res.json({ ...purchase, items });
});

// Printable HTML invoice for a purchase - opens in a new tab, uses browser print
router.get('/:id/invoice', (req, res) => {
  const purchase = db.prepare(
    `SELECT p.*, s.name AS supplier_name, s.address, s.phone FROM purchases p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`
  ).get(req.params.id);
  if (!purchase) return res.status(404).send('Purchase not found');

  const items = db.prepare(
    `SELECT pi.*, m.name AS raw_material_name, m.unit FROM purchase_items pi
     JOIN raw_materials m ON m.id = pi.raw_material_id WHERE pi.purchase_id = ?`
  ).all(req.params.id);

  const rows = items.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.raw_material_name}</td>
      <td>${it.unit}</td>
      <td>${it.quantity}</td>
      <td>₹${it.rate.toFixed(2)}</td>
      <td>₹${it.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  res.send(`
    <html>
    <head>
      <title>Invoice - Purchase #${purchase.id}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 30px; color: #222; }
        h1 { color: #d32f2f; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .total-row td { font-weight: bold; }
        .box { border: 1px solid #ccc; padding: 12px; margin-bottom: 16px; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h1>Invoice</h1>
      <div class="box">
        <strong>From:</strong> ${purchase.supplier_name}<br/>
        ${purchase.address || ''} ${purchase.phone || ''}
      </div>
      <p>Purchase date: ${purchase.purchase_date}${purchase.invoice_no ? ` &middot; Invoice No: ${purchase.invoice_no}` : ''}</p>
      <table>
        <thead><tr><th>#</th><th>Raw Material</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row"><td colspan="5">Total</td><td>₹${purchase.total_amount.toFixed(2)}</td></tr>
          <tr class="total-row"><td colspan="5">Paid</td><td>₹${purchase.paid_amount.toFixed(2)}</td></tr>
          <tr class="total-row"><td colspan="5">Outstanding</td><td>₹${(purchase.total_amount - purchase.paid_amount).toFixed(2)}</td></tr>
        </tbody>
      </table>
      <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;">Print</button>
    </body>
    </html>
  `);
});

router.post('/', (req, res) => {
  const { supplier_id, invoice_no, purchase_date, paid_amount, payment_mode, items } = req.body;
  if (!supplier_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'supplier_id and at least one item are required' });
  }

  const insertPurchase = db.prepare(
    `INSERT INTO purchases (supplier_id, invoice_no, purchase_date, total_amount, paid_amount, payment_mode)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    'INSERT INTO purchase_items (purchase_id, raw_material_id, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)'
  );
  const bumpStock = db.prepare('UPDATE raw_materials SET current_stock = current_stock + ? WHERE id = ?');

  const tx = db.transaction(() => {
    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
    const result = insertPurchase.run(
      supplier_id, invoice_no || null, purchase_date || new Date().toISOString().slice(0, 10),
      totalAmount, paid_amount || 0, payment_mode || null
    );
    const purchaseId = result.lastInsertRowid;

    for (const item of items) {
      const amount = item.quantity * item.rate;
      insertItem.run(purchaseId, item.raw_material_id, item.quantity, item.rate, amount);
      bumpStock.run(item.quantity, item.raw_material_id);
    }
    return { purchaseId, totalAmount };
  });

  const { purchaseId, totalAmount } = tx();
  res.json({ id: purchaseId, total_amount: totalAmount, success: true });
});

router.post('/:id/pay', (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  db.prepare('UPDATE purchases SET paid_amount = paid_amount + ? WHERE id = ?').run(amount, req.params.id);
  res.json({ success: true });
});

module.exports = router;
