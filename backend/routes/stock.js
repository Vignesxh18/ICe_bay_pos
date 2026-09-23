const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  let query = `
    SELECT sa.*, m.name AS raw_material_name, m.unit
    FROM stock_adjustments sa JOIN raw_materials m ON m.id = sa.raw_material_id
  `;
  const params = [];
  if (req.query.raw_material_id) {
    query += ' WHERE sa.raw_material_id = ?';
    params.push(req.query.raw_material_id);
  }
  query += ' ORDER BY sa.adjustment_date DESC, sa.id DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { raw_material_id, quantity_change, reason, notes, adjustment_date } = req.body;
  if (!raw_material_id || quantity_change == null) {
    return res.status(400).json({ error: 'raw_material_id and quantity_change are required' });
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO stock_adjustments (raw_material_id, adjustment_date, quantity_change, reason, notes)
       VALUES (?, ?, ?, ?, ?)`
    ).run(raw_material_id, adjustment_date || new Date().toISOString().slice(0, 10), quantity_change, reason || 'correction', notes || null);

    db.prepare('UPDATE raw_materials SET current_stock = current_stock + ? WHERE id = ?')
      .run(quantity_change, raw_material_id);
  });

  tx();
  res.json({ success: true });
});

module.exports = router;
