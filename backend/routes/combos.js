const express = require('express');
const router = express.Router();
const db = require('../db');

function isActiveToday(combo) {
  const today = new Date().toISOString().slice(0, 10);
  if (combo.start_date && today < combo.start_date) return false;
  if (combo.end_date && today > combo.end_date) return false;
  return !!combo.is_active;
}

// List all combos with their items (paid + free)
router.get('/', (req, res) => {
  const combos = db.prepare('SELECT * FROM combos ORDER BY name').all();
  const itemStmt = db.prepare(
    `SELECT ci.*, p.name AS product_name, p.selling_price
     FROM combo_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.combo_id = ?`
  );
  const withItems = combos.map(c => ({
    ...c,
    is_currently_active: isActiveToday(c),
    items: itemStmt.all(c.id)
  }));
  res.json(withItems);
});

// Create an offer: one trigger product + one free product (simple case, matches the spec)
// body: { name, price, trigger_product_id, trigger_quantity, free_product_id, free_quantity, start_date, end_date }
router.post('/', (req, res) => {
  const { name, price, trigger_product_id, trigger_quantity, free_product_id, free_quantity, start_date, end_date } = req.body;

  if (!name || price == null || !trigger_product_id || !free_product_id) {
    return res.status(400).json({ error: 'name, price, trigger_product_id, and free_product_id are required' });
  }

  const tx = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO combos (name, price, is_active, start_date, end_date) VALUES (?, ?, 1, ?, ?)`
    ).run(name, price, start_date || null, end_date || null);
    const comboId = result.lastInsertRowid;

    db.prepare('INSERT INTO combo_items (combo_id, product_id, quantity, is_free) VALUES (?, ?, ?, 0)')
      .run(comboId, trigger_product_id, trigger_quantity || 1);

    db.prepare('INSERT INTO combo_items (combo_id, product_id, quantity, is_free) VALUES (?, ?, ?, 1)')
      .run(comboId, free_product_id, free_quantity || 1);

    return comboId;
  });

  const comboId = tx();
  res.json({ id: comboId, success: true });
});

router.put('/:id', (req, res) => {
  const { name, price, trigger_product_id, trigger_quantity, free_product_id, free_quantity, start_date, end_date, is_active } = req.body;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE combos SET name = ?, price = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?`
    ).run(name, price, start_date || null, end_date || null, is_active ? 1 : 0, req.params.id);

    db.prepare('DELETE FROM combo_items WHERE combo_id = ?').run(req.params.id);

    db.prepare('INSERT INTO combo_items (combo_id, product_id, quantity, is_free) VALUES (?, ?, ?, 0)')
      .run(req.params.id, trigger_product_id, trigger_quantity || 1);
    db.prepare('INSERT INTO combo_items (combo_id, product_id, quantity, is_free) VALUES (?, ?, ?, 1)')
      .run(req.params.id, free_product_id, free_quantity || 1);
  });

  tx();
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE combos SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
