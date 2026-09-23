import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ClosingPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);

  const loadPreview = () => api.get(`/closing/preview?date=${date}`).then(setPreview).catch(() => setPreview(null));
  const loadHistory = () => api.get('/closing/history').then(setHistory).catch(() => setHistory([]));

  useEffect(() => { loadPreview(); loadHistory(); /* eslint-disable-next-line */ }, [date]);

  useEffect(() => {
    if (preview && preview.already_closed && preview.existing) {
      setActualCash(String(preview.existing.actual_cash));
    } else {
      setActualCash('');
    }
  }, [preview]);

  const submitClosing = async () => {
    if (actualCash === '') return alert('Enter the actual counted cash');
    const res = await api.post('/closing', { date, actual_cash: Number(actualCash) });
    setResult(res);
    loadPreview();
    loadHistory();
  };

  if (!preview) return <div className="card">Loading...</div>;

  const difference = actualCash !== '' ? Number(actualCash) - preview.expected_cash : null;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Day Closing</h3>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {preview.already_closed && (
        <div className="card" style={{ background: '#e8f5e9' }}>
          ✅ This day has already been closed. You can re-save if you need to correct the actual cash.
        </div>
      )}

      <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <h4 style={{ marginTop: 0 }}>Sales</h4>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Total Sales</span><strong>₹{preview.total_sales.toFixed(2)}</strong></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Cash</span><span>₹{preview.cash_sales.toFixed(2)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>UPI</span><span>₹{preview.upi_sales.toFixed(2)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Card</span><span>₹{preview.card_sales.toFixed(2)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Bills</span><span>{preview.total_bills}</span></div>

          <h4>Expenses</h4>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Total Expenses</span><strong>₹{preview.total_expenses.toFixed(2)}</strong></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Cash Expenses</span><span>₹{preview.cash_expenses.toFixed(2)}</span></div>

          <h4>Profit</h4>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Gross Profit</span><span>₹{preview.gross_profit.toFixed(2)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Net Profit</span><span>₹{preview.net_profit.toFixed(2)}</span></div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <h4 style={{ marginTop: 0 }}>Cash Reconciliation</h4>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>Opening Cash</span><span>₹{preview.opening_cash.toFixed(2)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>+ Cash Sales</span><span>₹{preview.cash_sales.toFixed(2)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>- Cash Expenses</span><span>₹{preview.cash_expenses.toFixed(2)}</span></div>
          <hr />
          <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}><span>Expected Cash</span><span>₹{preview.expected_cash.toFixed(2)}</span></div>

          <div style={{ marginTop: 16 }}>
            <label>Actual Cash Counted</label>
            <input type="number" style={{ width: '100%', marginTop: 4 }} value={actualCash} onChange={e => setActualCash(e.target.value)} />
          </div>

          {difference !== null && (
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, fontWeight: 700 }}>
              <span>Difference</span>
              <span style={{ color: difference === 0 ? '#2e7d32' : difference < 0 ? '#d32f2f' : '#ef6c00' }}>
                {difference > 0 ? '+' : ''}₹{difference.toFixed(2)}
              </span>
            </div>
          )}

          <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={submitClosing}>
            {preview.already_closed ? 'Update Closing' : 'Close Day'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 16, background: '#fff8e1' }}>
          Saved — Expected ₹{result.expected_cash.toFixed(2)}, Actual ₹{result.actual_cash.toFixed(2)},
          Difference {result.cash_difference > 0 ? '+' : ''}₹{result.cash_difference.toFixed(2)}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h4 style={{ marginTop: 0 }}>Closing History</h4>
        <table>
          <thead><tr><th>Date</th><th>Sales</th><th>Expenses</th><th>Net Profit</th><th>Expected Cash</th><th>Actual Cash</th><th>Difference</th></tr></thead>
          <tbody>
            {history.map(h => (
              <tr key={h.closing_date}>
                <td>{h.closing_date}</td>
                <td>₹{h.total_sales.toFixed(2)}</td>
                <td>₹{h.total_expenses.toFixed(2)}</td>
                <td>₹{h.net_profit.toFixed(2)}</td>
                <td>₹{h.expected_cash.toFixed(2)}</td>
                <td>₹{h.actual_cash.toFixed(2)}</td>
                <td style={{ color: h.cash_difference === 0 ? '#2e7d32' : h.cash_difference < 0 ? '#d32f2f' : '#ef6c00' }}>
                  {h.cash_difference > 0 ? '+' : ''}₹{h.cash_difference.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p>No closings recorded yet.</p>}
      </div>
    </div>
  );
}
