const express = require('express');
const router = express.Router();
const db = require('../db');

// Returns all raw materials with their current system stock, for the count screen
router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM raw_materials WHERE is_active = 1 ORDER BY category, name`
  ).all();
  res.json(rows);
});

// Submit a batch of physical counts. For each item, records the variance as a stock_adjustment
// and updates current_stock to match the counted value.
// body: { counts: [{ raw_material_id, counted_stock }], date }
router.post('/submit', (req, res) => {
  const { counts, date } = req.body;
  if (!Array.isArray(counts) || counts.length === 0) {
    return res.status(400).json({ error: 'counts array is required' });
  }

  const countDate = date || new Date().toISOString().slice(0, 10);
  const results = [];

  const tx = db.transaction(() => {
    for (const c of counts) {
      const material = db.prepare('SELECT current_stock, name, unit FROM raw_materials WHERE id = ?').get(c.raw_material_id);
      if (!material) continue;

      const variance = c.counted_stock - material.current_stock;
      if (variance === 0) continue; // no change, skip logging

      db.prepare(
        `INSERT INTO stock_adjustments (raw_material_id, adjustment_date, quantity_change, reason, notes)
         VALUES (?, ?, ?, 'daily-recount', ?)`
      ).run(c.raw_material_id, countDate, variance, `Physical count: ${c.counted_stock} ${material.unit} (system had ${material.current_stock})`);

      db.prepare('UPDATE raw_materials SET current_stock = ? WHERE id = ?').run(c.counted_stock, c.raw_material_id);

      results.push({ raw_material_id: c.raw_material_id, name: material.name, variance });
    }
  });

  tx();
  res.json({ success: true, updated: results.length, variances: results });
});

// History of past recounts, grouped by date
router.get('/history', (req, res) => {
  const rows = db.prepare(
    `SELECT sa.adjustment_date, COUNT(*) AS items_recounted
     FROM stock_adjustments sa WHERE sa.reason = 'daily-recount'
     GROUP BY sa.adjustment_date ORDER BY sa.adjustment_date DESC LIMIT 30`
  ).all();
  res.json(rows);
});

module.exports = router;
