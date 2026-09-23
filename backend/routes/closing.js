const express = require('express');
const router = express.Router();
const db = require('../db');

// Get the closing computation for a date (before saving) - shows what "expected" would be
router.get('/preview', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const bills = db.prepare(`SELECT * FROM bills WHERE date(bill_date) = ? AND status = 'active'`).all(date);
  const totalSales = bills.reduce((s, b) => s + b.total_amount, 0);
  const cashSales = bills.filter(b => b.payment_mode === 'cash').reduce((s, b) => s + b.total_amount, 0);
  const upiSales = bills.filter(b => b.payment_mode === 'upi').reduce((s, b) => s + b.total_amount, 0);
  const cardSales = bills.filter(b => b.payment_mode === 'card').reduce((s, b) => s + b.total_amount, 0);

  const expenses = db.prepare(`SELECT * FROM expenses WHERE expense_date = ?`).all(date);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cashExpenses = expenses.filter(e => e.payment_mode === 'cash').reduce((s, e) => s + e.amount, 0);

  const billIds = bills.map(b => b.id);
  let totalCogs = 0;
  if (billIds.length > 0) {
    const placeholders = billIds.map(() => '?').join(',');
    totalCogs = db.prepare(`SELECT COALESCE(SUM(cost_price), 0) AS total FROM bill_items WHERE bill_id IN (${placeholders})`).get(...billIds).total;
  }
  const grossProfit = totalSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
  const prevClosing = db.prepare('SELECT actual_cash FROM daily_closing WHERE closing_date = ?').get(yesterday);
  const openingCash = prevClosing ? prevClosing.actual_cash : 0;

  const expectedCash = openingCash + cashSales - cashExpenses;

  const alreadyClosed = db.prepare('SELECT * FROM daily_closing WHERE closing_date = ?').get(date);

  res.json({
    date, total_sales: totalSales, cash_sales: cashSales, upi_sales: upiSales, card_sales: cardSales,
    total_expenses: totalExpenses, cash_expenses: cashExpenses,
    total_cogs: totalCogs, gross_profit: grossProfit, net_profit: netProfit,
    opening_cash: openingCash, expected_cash: expectedCash,
    total_bills: bills.length,
    already_closed: !!alreadyClosed,
    existing: alreadyClosed || null
  });
});

// Submit the day closing with actual counted cash
router.post('/', (req, res) => {
  const { date, actual_cash } = req.body;
  const closingDate = date || new Date().toISOString().slice(0, 10);
  if (actual_cash == null) return res.status(400).json({ error: 'actual_cash is required' });

  const bills = db.prepare(`SELECT * FROM bills WHERE date(bill_date) = ? AND status = 'active'`).all(closingDate);
  const totalSales = bills.reduce((s, b) => s + b.total_amount, 0);
  const cashSales = bills.filter(b => b.payment_mode === 'cash').reduce((s, b) => s + b.total_amount, 0);
  const upiSales = bills.filter(b => b.payment_mode === 'upi').reduce((s, b) => s + b.total_amount, 0);
  const cardSales = bills.filter(b => b.payment_mode === 'card').reduce((s, b) => s + b.total_amount, 0);

  const expenses = db.prepare(`SELECT * FROM expenses WHERE expense_date = ?`).all(closingDate);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cashExpenses = expenses.filter(e => e.payment_mode === 'cash').reduce((s, e) => s + e.amount, 0);

  const billIds = bills.map(b => b.id);
  let totalCogs = 0;
  if (billIds.length > 0) {
    const placeholders = billIds.map(() => '?').join(',');
    totalCogs = db.prepare(`SELECT COALESCE(SUM(cost_price), 0) AS total FROM bill_items WHERE bill_id IN (${placeholders})`).get(...billIds).total;
  }
  const grossProfit = totalSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  const yesterday = new Date(new Date(closingDate).getTime() - 86400000).toISOString().slice(0, 10);
  const prevClosing = db.prepare('SELECT actual_cash FROM daily_closing WHERE closing_date = ?').get(yesterday);
  const openingCash = prevClosing ? prevClosing.actual_cash : 0;
  const expectedCash = openingCash + cashSales - cashExpenses;
  const cashDifference = actual_cash - expectedCash;

  db.prepare(
    `INSERT INTO daily_closing
     (closing_date, total_sales, total_cogs, total_expenses, gross_profit, net_profit,
      opening_cash, cash_sales, upi_sales, card_sales, cash_expenses, expected_cash, actual_cash, cash_difference, total_bills)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(closing_date) DO UPDATE SET
       total_sales=excluded.total_sales, total_cogs=excluded.total_cogs, total_expenses=excluded.total_expenses,
       gross_profit=excluded.gross_profit, net_profit=excluded.net_profit, opening_cash=excluded.opening_cash,
       cash_sales=excluded.cash_sales, upi_sales=excluded.upi_sales, card_sales=excluded.card_sales,
       cash_expenses=excluded.cash_expenses, expected_cash=excluded.expected_cash, actual_cash=excluded.actual_cash,
       cash_difference=excluded.cash_difference, total_bills=excluded.total_bills`
  ).run(
    closingDate, totalSales, totalCogs, totalExpenses, grossProfit, netProfit,
    openingCash, cashSales, upiSales, cardSales, cashExpenses, expectedCash, actual_cash, cashDifference, bills.length
  );

  res.json({ success: true, date: closingDate, expected_cash: expectedCash, actual_cash, cash_difference: cashDifference });
});

// History of past closings
router.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM daily_closing ORDER BY closing_date DESC LIMIT 30').all();
  res.json(rows);
});

module.exports = router;
