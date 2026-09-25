import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function BillHistoryPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bills, setBills] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);

  const loadBills = () => {
    api.get(`/bills?date=${date}`).then(data => setBills(data.bills)).catch(() => setBills([]));
    setExpandedId(null);
    setExpandedDetail(null);
  };
  useEffect(loadBills, [date]);

  const toggleExpand = async (bill) => {
    if (expandedId === bill.id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(bill.id);
    try {
      const detail = await api.get(`/bills/${bill.id}`);
      setExpandedDetail(detail);
    } catch (err) {
      setExpandedDetail(null);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d)) return dateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const totalForDay = bills.reduce((s, b) => s + b.total_amount, 0);

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h4 style={{ marginTop: 0 }}>Bill History</h4>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--chocolate)', marginTop: -6 }}>
          {bills.length} bills · ₹{totalForDay.toFixed(2)} total for this date. Click a bill to see the exact time and payment breakdown.
        </p>

        <table>
          <thead><tr><th>Bill No</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {bills.map(b => (
              <React.Fragment key={b.id}>
                <tr
                  style={{ cursor: 'pointer', background: b.status === 'cancelled' ? '#FDF0F3' : 'transparent' }}
                  onClick={() => toggleExpand(b)}
                >
                  <td>{b.bill_no}</td>
                  <td>{b.item_summary || '-'}</td>
                  <td>₹{b.total_amount.toFixed(2)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{b.payment_mode}</td>
                  <td style={{ textTransform: 'capitalize', color: b.status === 'cancelled' ? 'var(--danger-dark)' : 'inherit', fontWeight: b.status === 'cancelled' ? 700 : 400 }}>
                    {b.status === 'cancelled' ? `Cancelled${b.cancel_reason ? ` — ${b.cancel_reason}` : ''}` : b.status}
                  </td>
                </tr>
                {expandedId === b.id && (
                  <tr>
                    <td colSpan={5} style={{ background: '#FAF9FD', padding: '10px 16px' }}>
                      {!expandedDetail ? (
                        <span>Loading...</span>
                      ) : (
                        <div className="row" style={{ gap: 40, flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ fontSize: 12.5 }}>Time</strong>
                            <div>{formatTime(expandedDetail.bill_date)}</div>
                          </div>
                          <div>
                            <strong style={{ fontSize: 12.5 }}>Payment Breakdown</strong>
                            {expandedDetail.payments && expandedDetail.payments.length > 0 ? (
                              expandedDetail.payments.map((p, i) => (
                                <div key={i} style={{ textTransform: 'capitalize' }}>{p.mode}: ₹{p.amount.toFixed(2)}</div>
                              ))
                            ) : (
                              <div style={{ textTransform: 'capitalize' }}>{expandedDetail.payment_mode}: ₹{expandedDetail.total_amount.toFixed(2)}</div>
                            )}
                          </div>
                          {expandedDetail.returns && expandedDetail.returns.length > 0 && (
                            <div>
                              <strong style={{ fontSize: 12.5 }}>Refunds</strong>
                              {expandedDetail.returns.map(r => (
                                <div key={r.id}>₹{r.refund_amount.toFixed(2)} ({r.quantity} qty)</div>
                              ))}
                            </div>
                          )}
                          {expandedDetail.status === 'cancelled' && (
                            <div>
                              <strong style={{ fontSize: 12.5, color: 'var(--danger-dark)' }}>Cancelled</strong>
                              <div>By: {expandedDetail.cancelled_by || '-'}</div>
                              <div>At: {expandedDetail.cancelled_at || '-'}</div>
                              <div>Reason: {expandedDetail.cancel_reason || '-'}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && <p>No bills on this date.</p>}
      </div>
    </div>
  );
}
