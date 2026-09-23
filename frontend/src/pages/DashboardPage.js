import React, { useEffect, useState } from 'react';
import { api } from '../api';

const MODE_COLORS = { cash: '#FF6F91', upi: '#8FCB9B', card: '#FFC857' };

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => api.get(`/dashboard?date=${date}`).then(setData).catch(() => setData(null));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  if (!data) return <div className="card">Loading...</div>;

  const maxHourly = Math.max(1, ...data.hourly.map(h => h.amount));
  const activeHours = data.hourly.filter(h => h.amount > 0);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Dashboard</h3>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className="stat-card stat-sales" style={{ flex: 1, minWidth: 260 }}>
          <div className="stat-label">Total Sales · {data.date} · {data.total_bills} orders</div>
          <div className="stat-value">₹{data.total_sales.toFixed(0)}</div>

          {data.total_sales > 0 && (
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', margin: '12px 0' }}>
              {data.payment_breakdown.map(p => (
                <div key={p.mode} style={{ width: `${p.percent}%`, background: MODE_COLORS[p.mode] || '#999' }} />
              ))}
            </div>
          )}

          {data.payment_breakdown.map(p => (
            <div key={p.mode} className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ textTransform: 'capitalize' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: MODE_COLORS[p.mode] || '#999', marginRight: 6 }} />
                {p.mode}
              </span>
              <span>₹{p.amount.toFixed(0)} <span style={{ color: 'var(--chocolate)' }}>({p.percent}%)</span></span>
            </div>
          ))}
          {data.payment_breakdown.length === 0 && <p style={{ color: 'var(--chocolate)' }}>No sales yet</p>}
        </div>

        <div className="card" style={{ flex: 2, minWidth: 300 }}>
          <h4 style={{ marginTop: 0 }}>Sales by hour</h4>
          {activeHours.length === 0 && <p style={{ color: 'var(--chocolate)' }}>No sales yet today</p>}
          {activeHours.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
              {data.hourly.map(h => (
                <div key={h.hour} title={`${h.hour}:00 — ₹${h.amount.toFixed(0)}`} style={{
                  flex: 1,
                  height: `${(h.amount / maxHourly) * 100}%`,
                  background: h.amount > 0 ? 'var(--strawberry)' : 'var(--line)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 2
                }} />
              ))}
            </div>
          )}
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--chocolate)', marginTop: 4 }}>
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 16, marginTop: 16 }}>
        <div className={`stat-card ${data.gross_profit >= 0 ? 'stat-profit' : 'stat-loss'}`} style={{ flex: 1, minWidth: 200 }}>
          <div className="stat-label">Gross Profit</div>
          <div className="stat-value">₹{data.gross_profit.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: 'var(--chocolate)', marginTop: 4 }}>Sales − Cost of Goods (₹{data.total_cogs.toFixed(0)})</div>
        </div>

        <div className={`stat-card ${data.net_profit >= 0 ? 'stat-profit' : 'stat-loss'}`} style={{ flex: 1, minWidth: 200 }}>
          <div className="stat-label">Net Profit</div>
          <div className="stat-value">₹{data.net_profit.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: 'var(--chocolate)', marginTop: 4 }}>After expenses (₹{data.total_expenses.toFixed(0)})</div>
        </div>

        <div className={`stat-card ${data.low_stock_count > 0 ? 'stat-alert' : 'stat-profit'}`} style={{ flex: 1, minWidth: 200 }}>
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value">{data.low_stock_count}</div>
          {data.low_stock_items.slice(0, 3).map(item => (
            <div key={item.id} style={{ fontSize: 12, color: 'var(--chocolate)' }}>
              {item.name}: {item.current_stock} {item.unit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
