import React, { useEffect, useState } from 'react';
import { api } from '../api';

const today = new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const [subTab, setSubTab] = useState('sales');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="row">
          {['sales', 'products', 'payments', 'purchases', 'stock'].map(t => (
            <button key={t} className={`btn ${subTab === t ? '' : 'btn-secondary'}`} onClick={() => setSubTab(t)} style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
        {subTab !== 'stock' && (
          <div className="row">
            <label>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <label>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {subTab === 'sales' && <SalesReport from={from} to={to} />}
      {subTab === 'products' && <ProductReport from={from} to={to} />}
      {subTab === 'payments' && <PaymentReport from={from} to={to} />}
      {subTab === 'purchases' && <PurchaseReport from={from} to={to} />}
      {subTab === 'stock' && <StockReport />}
    </div>
  );
}

function SalesReport({ from, to }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/reports/sales?from=${from}&to=${to}`).then(setData).catch(() => setData(null)); }, [from, to]);
  if (!data) return <div className="card">Loading...</div>;
  return (
    <div>
      <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
        <StatCard label="Total Sales" value={`₹${data.total_sales.toFixed(2)}`} />
        <StatCard label="Total Bills" value={data.total_bills} />
        <StatCard label="Avg Bill Value" value={`₹${data.avg_bill_value.toFixed(2)}`} />
        <StatCard label="Discounts Given" value={`₹${data.total_discount.toFixed(2)}`} />
        <StatCard label="Cancelled Bills" value={data.cancelled_bills} />
      </div>
      <ExportButton type="sales" from={from} to={to} />
    </div>
  );
}

function ProductReport({ from, to }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/reports/products?from=${from}&to=${to}`).then(setData).catch(() => setData(null)); }, [from, to]);
  if (!data) return <div className="card">Loading...</div>;
  return (
    <div>
      <div style={{ marginBottom: 10 }}><ExportButton type="products" from={from} to={to} /></div>
      <div className="card">
        <table>
          <thead><tr><th>Product</th><th>Qty Sold</th><th>Sales</th><th>Cost</th><th>Profit</th></tr></thead>
          <tbody>
            {data.products.map(p => (
              <tr key={p.product}>
                <td>{p.product}</td>
                <td>{p.qty_sold}</td>
                <td>₹{p.sales.toFixed(2)}</td>
                <td>₹{p.cost.toFixed(2)}</td>
                <td style={{ color: p.profit >= 0 ? 'var(--pistachio-dark)' : 'var(--danger-dark)' }}>₹{p.profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.products.length === 0 && <p>No sales in this period.</p>}
      </div>
    </div>
  );
}

function PaymentReport({ from, to }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/reports/payments?from=${from}&to=${to}`).then(setData).catch(() => setData(null)); }, [from, to]);
  if (!data) return <div className="card">Loading...</div>;
  return (
    <div className="card">
      <table>
        <thead><tr><th>Payment Mode</th><th>Amount</th><th>%</th></tr></thead>
        <tbody>
          {data.breakdown.map(b => (
            <tr key={b.mode}>
              <td style={{ textTransform: 'capitalize' }}>{b.mode}</td>
              <td>₹{b.amount.toFixed(2)}</td>
              <td>{b.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.breakdown.length === 0 && <p>No payments in this period.</p>}
    </div>
  );
}

function PurchaseReport({ from, to }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/reports/purchases?from=${from}&to=${to}`).then(setData).catch(() => setData(null)); }, [from, to]);
  if (!data) return <div className="card">Loading...</div>;
  return (
    <div>
      <div className="row" style={{ gap: 16, marginBottom: 14 }}>
        <StatCard label="Total Purchased" value={`₹${data.totals.total_purchased.toFixed(2)}`} />
        <StatCard label="Total Paid" value={`₹${data.totals.total_paid.toFixed(2)}`} />
        <StatCard label="Outstanding" value={`₹${data.totals.total_outstanding.toFixed(2)}`} />
      </div>
      <div style={{ marginBottom: 10 }}><ExportButton type="purchases" from={from} to={to} /></div>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Supplier</th><th>Invoice</th><th>Total</th><th>Paid</th></tr></thead>
          <tbody>
            {data.purchases.map(p => (
              <tr key={p.id}>
                <td>{p.purchase_date}</td>
                <td>{p.supplier_name}</td>
                <td>{p.invoice_no || '-'}</td>
                <td>₹{p.total_amount.toFixed(2)}</td>
                <td>₹{p.paid_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.purchases.length === 0 && <p>No purchases in this period.</p>}
      </div>
    </div>
  );
}

function StockReport() {
  const [data, setData] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null); // material id whose ledger is open

  useEffect(() => { api.get('/reports/stock').then(setData).catch(() => setData(null)); }, []);
  if (!data) return <div className="card">Loading...</div>;

  const statusColor = { Normal: '#2e7d32', Low: '#ef6c00', Critical: '#d32f2f' };
  const statusDot = { Normal: '🟢', Low: '🟡', Critical: '🔴' };

  if (ledgerFor) {
    return <StockLedger materialId={ledgerFor} onBack={() => setLedgerFor(null)} />;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <strong>Total Stock Value: ₹{data.total_value.toFixed(2)}</strong>
      </div>
      <div style={{ marginBottom: 10 }}>
        <button className="btn btn-secondary" onClick={() => {
          const token = localStorage.getItem('icecream_token');
          window.open(`http://localhost:6001/api/reports/export/stock?token=${token}`, '_blank');
        }}>Export CSV</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Raw Material</th><th>Current Stock</th><th>Unit</th><th>Value</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data.materials.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.current_stock.toFixed(2)}</td>
                <td>{m.unit}</td>
                <td>₹{m.value.toFixed(2)}</td>
                <td style={{ color: statusColor[m.status] }}>{statusDot[m.status]} {m.status}</td>
                <td><button className="btn btn-secondary" onClick={() => setLedgerFor(m.id)}>View Ledger</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.materials.length === 0 && <p>No raw materials yet.</p>}
      </div>
    </div>
  );
}

function StockLedger({ materialId, onBack }) {
  const [from, setFrom] = useState(new Date(new Date().getTime() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/reports/stock/${materialId}/ledger?from=${from}&to=${to}`).then(setData).catch(() => setData(null));
  }, [materialId, from, to]);

  if (!data) return <div className="card">Loading...</div>;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back to Stock Report</button>
        <div className="row">
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <h3>{data.material}</h3>

      <div className="row" style={{ gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatCard label="Opening Stock" value={`${data.opening_stock.toFixed(2)} ${data.unit}`} />
        <StatCard label="Purchased" value={`+${data.total_purchased.toFixed(2)} ${data.unit}`} />
        <StatCard label="Sold (Consumption)" value={`-${data.total_sold_consumption.toFixed(2)} ${data.unit}`} />
        <StatCard label="Wastage" value={`-${data.total_wastage.toFixed(2)} ${data.unit}`} />
        <StatCard label="Current Stock" value={`${data.current_stock.toFixed(2)} ${data.unit}`} />
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Qty In</th><th>Qty Out</th><th>Balance</th></tr></thead>
          <tbody>
            {data.transactions.map((t, i) => (
              <tr key={i}>
                <td>{t.date}</td>
                <td>{t.type}</td>
                <td>{t.reference}</td>
                <td style={{ color: '#2e7d32' }}>{t.qty_in > 0 ? `+${t.qty_in.toFixed(3)}` : ''}</td>
                <td style={{ color: '#d32f2f' }}>{t.qty_out > 0 ? `-${t.qty_out.toFixed(3)}` : ''}</td>
                <td style={{ fontWeight: 700 }}>{t.balance.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.transactions.length === 0 && <p>No movement in this period.</p>}
      </div>
    </div>
  );
}

function ExportButton({ type, from, to }) {
  const download = () => {
    const token = localStorage.getItem('icecream_token');
    const params = new URLSearchParams({ from, to, token });
    window.open(`http://localhost:6001/api/reports/export/${type}?${params.toString()}`, '_blank');
  };
  return <button className="btn btn-secondary" onClick={download}>Export CSV</button>;
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
