const express = require('express');
const router = express.Router();
const db = require('../db');

const CATEGORIES = ['Rent', 'Electricity', 'Staff Salary', 'Maintenance', 'Gas', 'Packaging', 'Cleaning', 'Transportation', 'Internet', 'Repairs', 'Miscellaneous'];

router.get('/categories', (req, res) => res.json(CATEGORIES));

// List expenses, optional filters: date, category, payment_mode
router.get('/', (req, res) => {
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (req.query.date) {
    query += ' AND expense_date = ?';
    params.push(req.query.date);
  }
  if (req.query.from && req.query.to) {
    query += ' AND expense_date BETWEEN ? AND ?';
    params.push(req.query.from, req.query.to);
  }
  if (req.query.category) {
    query += ' AND category = ?';
    params.push(req.query.category);
  }
  if (req.query.payment_mode) {
    query += ' AND payment_mode = ?';
    params.push(req.query.payment_mode);
  }
  query += ' ORDER BY expense_date DESC, id DESC';

  const rows = db.prepare(query).all(...params);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  res.json({ expenses: rows, total, count: rows.length });
});

router.post('/', (req, res) => {
  const { expense_date, category, amount, payment_mode, description } = req.body;
  if (!category || !amount) return res.status(400).json({ error: 'category and amount are required' });

  const result = db.prepare(
    `INSERT INTO expenses (expense_date, category, amount, payment_mode, description)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    expense_date || new Date().toISOString().slice(0, 10),
    category, amount, payment_mode || 'cash', description || null
  );
  res.json({ id: result.lastInsertRowid, success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Summary: today's total, this month's total, breakdown by category
router.get('/summary', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const todayTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date = ?').get(today).total;
  const monthTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date >= ?').get(monthStart).total;

  const byCategory = db.prepare(
    `SELECT category, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date >= ? GROUP BY category ORDER BY total DESC`
  ).all(monthStart);

  res.json({ today_total: todayTotal, month_total: monthTotal, by_category: byCategory });
});

module.exports = router;
