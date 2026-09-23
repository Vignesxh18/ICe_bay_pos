const express = require('express');
const router = express.Router();
const db = require('../db');

// Chennai coordinates (Tamil Nadu) - update if the shop is elsewhere
const LAT = 13.0827;
const LON = 80.2707;

// ---------- WEATHER-LINKED INSIGHT ----------
router.get('/weather', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather service unavailable');
    const data = await response.json();

    const days = data.daily.time.map((date, i) => ({
      date,
      max_temp: data.daily.temperature_2m_max[i],
      min_temp: data.daily.temperature_2m_min[i]
    }));

    const tomorrow = days[1] || days[0];
    let advice = null;
    if (tomorrow) {
      if (tomorrow.max_temp >= 35) {
        advice = { level: 'high', message: `Very hot day ahead (${tomorrow.max_temp}°C) — expect higher footfall. Consider stocking extra milk and ice cream base.` };
      } else if (tomorrow.max_temp >= 31) {
        advice = { level: 'moderate', message: `Warm day ahead (${tomorrow.max_temp}°C) — typical demand expected.` };
      } else {
        advice = { level: 'low', message: `Cooler day ahead (${tomorrow.max_temp}°C) — demand may be lighter than usual.` };
      }
    }

    res.json({ days, advice });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch weather data', details: err.message });
  }
});

// ---------- AUTO PURCHASE SUGGESTIONS ----------
// For each raw material at or below its reorder level, suggest a restock quantity
// based on its average daily consumption over the last 14 days.
router.get('/purchase-suggestions', (req, res) => {
  const materials = db.prepare(
    `SELECT * FROM raw_materials WHERE is_active = 1 AND current_stock <= reorder_level`
  ).all();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const suggestions = materials.map(m => {
    // Total consumed via recipe over the last 14 days
    const consumedRow = db.prepare(
      `SELECT COALESCE(SUM((bi.quantity / pr.output_qty) * r.quantity_required), 0) AS total
       FROM bill_items bi
       JOIN bills b ON b.id = bi.bill_id
       JOIN products pr ON pr.id = bi.product_id
       JOIN recipes r ON r.product_id = pr.id AND r.raw_material_id = ?
       WHERE b.status = 'active' AND date(b.bill_date) >= ?`
    ).get(m.id, fourteenDaysAgo);

    const avgDailyConsumption = consumedRow.total / 14;
    const targetLevel = m.at_par_stock_level > 0 ? m.at_par_stock_level : m.reorder_level * 2;
    const suggestedQty = Math.max(0, targetLevel - m.current_stock);

    const lastRate = db.prepare(
      `SELECT rate FROM purchase_items WHERE raw_material_id = ? ORDER BY id DESC LIMIT 1`
    ).get(m.id);

    return {
      raw_material_id: m.id,
      name: m.name,
      unit: m.unit,
      current_stock: m.current_stock,
      reorder_level: m.reorder_level,
      avg_daily_consumption: Math.round(avgDailyConsumption * 100) / 100,
      days_of_stock_left: avgDailyConsumption > 0 ? Math.round((m.current_stock / avgDailyConsumption) * 10) / 10 : null,
      suggested_qty: Math.round(suggestedQty * 100) / 100,
      estimated_cost: lastRate ? Math.round(suggestedQty * lastRate.rate * 100) / 100 : null
    };
  });

  res.json({ suggestions, count: suggestions.length });
});

module.exports = router;
