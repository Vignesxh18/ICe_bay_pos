const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const bills = db.prepare(
    `SELECT * FROM bills WHERE date(bill_date) = ? AND status = 'active'`
  ).all(date);

  const totalSales = bills.reduce((s, b) => s + b.total_amount, 0);
  const totalBills = bills.length;

  // Payment mode breakdown — split-payment bills contribute to each mode they actually used
  const modeMap = {};
  const splitStmt = db.prepare('SELECT mode, amount FROM bill_payments WHERE bill_id = ?');
  for (const b of bills) {
    const splits = splitStmt.all(b.id);
    if (splits.length > 0) {
      for (const s of splits) modeMap[s.mode] = (modeMap[s.mode] || 0) + s.amount;
    } else {
      modeMap[b.payment_mode] = (modeMap[b.payment_mode] || 0) + b.total_amount;
    }
  }
  const paymentBreakdown = Object.entries(modeMap).map(([mode, amount]) => ({
    mode,
    amount,
    percent: totalSales > 0 ? Math.round((amount / totalSales) * 1000) / 10 : 0
  }));

  // Hourly breakdown (0-23)
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, amount: 0 }));
  for (const b of bills) {
    const hour = new Date(b.bill_date.replace(' ', 'T')).getHours();
    if (!isNaN(hour)) hourly[hour].amount += b.total_amount;
  }

  // Cost of goods sold & profit for the day
  const billIds = bills.map(b => b.id);
  let totalCogs = 0;
  if (billIds.length > 0) {
    const placeholders = billIds.map(() => '?').join(',');
    const costRow = db.prepare(
      `SELECT COALESCE(SUM(cost_price), 0) AS total_cogs FROM bill_items WHERE bill_id IN (${placeholders})`
    ).get(...billIds);
    totalCogs = costRow.total_cogs;
  }
  const grossProfit = totalSales - totalCogs;

  // Today's expenses
  const expenseRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date = ?`
  ).get(date);
  const totalExpenses = expenseRow.total;
  const netProfit = grossProfit - totalExpenses;

  // Low stock
  const lowStock = db.prepare(
    `SELECT * FROM raw_materials WHERE is_active = 1 AND current_stock <= reorder_level`
  ).all();

  res.json({
    date,
    total_sales: totalSales,
    total_bills: totalBills,
    payment_breakdown: paymentBreakdown,
    hourly,
    total_cogs: totalCogs,
    gross_profit: grossProfit,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    low_stock_count: lowStock.length,
    low_stock_items: lowStock
  });
});

module.exports = router;
