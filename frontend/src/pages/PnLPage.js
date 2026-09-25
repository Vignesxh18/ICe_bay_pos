import React, { useEffect, useState } from 'react';
import { api } from '../api';

const today = new Date().toISOString().slice(0, 10);

export default function PnLPage() {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/reports/pnl?from=${from}&to=${to}`).then(setData).catch(() => setData(null));
  }, [from, to]);

  const setPreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      setFrom(today); setTo(today);
    } else if (preset === 'week') {
      const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
      setFrom(weekAgo); setTo(today);
    } else if (preset === 'month') {
      const monthStart = today.slice(0, 7) + '-01';
      setFrom(monthStart); setTo(today);
    }
  };

  if (!data) return <div className="card">Loading...</div>;

  const Row = ({ label, value, bold, indent, color }) => (
    <div className="row" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: bold ? '2px solid var(--plum)' : '1px solid var(--line)' }}>
      <span style={{ fontWeight: bold ? 700 : 500, paddingLeft: indent ? 16 : 0 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: color || 'inherit' }}>
        {value < 0 ? '-' : ''}₹{Math.abs(value).toFixed(2)}
      </span>
    </div>
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => setPreset('today')}>Today</button>
          <button className="btn btn-secondary" onClick={() => setPreset('week')}>This Week</button>
          <button className="btn btn-secondary" onClick={() => setPreset('month')}>This Month</button>
        </div>
        <div className="row">
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h4 style={{ marginTop: 0 }}>Profit & Loss — {from} to {to}</h4>
        <Row label="Gross Sales" value={data.gross_sales} />
        <Row label="Less: Discounts" value={-data.discounts} indent />
        <Row label="Net Sales" value={data.net_sales} bold />
        <Row label="Less: Refunds" value={-data.refunds} indent />
        <Row label="Less: Cost of Goods Sold" value={-data.cogs} indent />
        <Row label="Gross Profit" value={data.gross_profit} bold color={data.gross_profit >= 0 ? 'var(--pistachio-dark)' : 'var(--danger-dark)'} />
        <Row label="Less: Expenses" value={-data.expenses} indent />
        <Row label="Net Profit" value={data.net_profit} bold color={data.net_profit >= 0 ? 'var(--pistachio-dark)' : 'var(--danger-dark)'} />
      </div>
    </div>
  );
}
