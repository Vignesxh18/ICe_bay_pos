import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function BillHistoryPanel({ onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bills, setBills] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);

  useEffect(() => {
    api.get(`/bills?date=${date}`).then(data => setBills(data.bills)).catch(() => setBills([]));
    setExpandedId(null);
    setExpandedDetail(null);
  }, [date]);

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

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--white)', zIndex: 20,
      borderRadius: 'var(--radius)', padding: 16, overflowY: 'auto'
    }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <strong>Bill History</strong>
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 10, width: '100%' }} />
      {bills.length === 0 && <p style={{ fontSize: 13, color: 'var(--chocolate)' }}>No bills on this date.</p>}
      {bills.map(b => (
        <div key={b.id}>
          <div
            className="cart-item"
            style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }}
            onClick={() => toggleExpand(b)}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{b.bill_no}</strong>
              <span>₹{b.total_amount.toFixed(2)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--chocolate)' }}>
              <span>{b.item_summary}</span>
              <span style={{ textTransform: 'capitalize' }}>{b.payment_mode} · {b.status}</span>
            </div>
          </div>

          {expandedId === b.id && (
            <div style={{ background: '#FAF9FD', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 12.5 }}>
              {!expandedDetail ? (
                <span>Loading...</span>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span>Time</span>
                    <strong>{formatTime(expandedDetail.bill_date)}</strong>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 600 }}>Payment breakdown:</span>
                    {expandedDetail.payments && expandedDetail.payments.length > 0 ? (
                      expandedDetail.payments.map((p, i) => (
                        <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
                          <span style={{ textTransform: 'capitalize' }}>{p.mode}</span>
                          <span>₹{p.amount.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ textTransform: 'capitalize' }}>{expandedDetail.payment_mode}</span>
                        <span>₹{expandedDetail.total_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
