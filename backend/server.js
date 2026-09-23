const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 6001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const { router: authRouter, requireAuth } = require('./routes/auth');
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'icecream-shop-backend' }));

// Everything below requires a logged-in user
app.use('/api', requireAuth);

app.use('/api', require('./routes/products'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/stock-adjustments', require('./routes/stock'));
app.use('/api/bills', require('./routes/billing'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/stock-count', require('./routes/stock-count'));
app.use('/api/combos', require('./routes/combos'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/closing', require('./routes/closing'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/invoice-parser', require('./routes/invoice-parser'));

app.listen(PORT, () => {
  console.log(`Ice cream shop backend running on http://localhost:${PORT}`);
});
