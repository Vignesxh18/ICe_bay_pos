import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function SupplierLedgerPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [statement, setStatement] = useState(null);

  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    api.get('/purchases/suppliers').then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const loadStatement = () => {
    if (!supplierId) { setStatement(null); return; }
    api.get(`/purchases/suppliers/${supplierId}/statement`).then(setStatement).catch(() => setStatement(null));
  };

  useEffect(loadStatement, [supplierId]);

  const recordPayment = async () => {
    if (!payAmount) return alert('Enter an amount');
    try {
      await api.post(`/purchases/suppliers/${supplierId}/payments`, {
        amount: Number(payAmount), mode: payMode, notes: payNotes || null
      });
      setPayAmount(''); setPayNotes('');
      loadStatement();
      alert('Payment recorded');
    } catch (err) {
      alert(err.message);
    }
  };

  const [expandedPurchase, setExpandedPurchase] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState([]);

  const toggleItems = async (purchaseId) => {
    if (expandedPurchase === purchaseId) {
      setExpandedPurchase(null);
      return;
    }
    const data = await api.get(`/purchases/${purchaseId}`);
    setPurchaseItems(data.items || []);
    setExpandedPurchase(purchaseId);
  };

  // Build one combined, chronological ledger from purchases + payments + returns
  const ledgerRows = statement ? [
    ...statement.purchases.map(p => ({ date: p.date, type: 'Purchase', reference: p.invoice_no || `Purchase #${p.id}`, debit: p.total_amount, credit: p.paid_amount, purchaseId: p.id })),
    ...statement.payments.map(p => ({ date: p.date, type: 'Payment', reference: p.notes || p.mode, debit: 0, credit: p.amount })),
    ...statement.returns.map(r => ({ date: r.date, type: 'Return', reference: `${r.raw_material_name}${r.reason ? ' - ' + r.reason : ''}`, debit: 0, credit: r.amount }))
  ].sort((a, b) => a.date.localeCompare(b.date)) : [];

  let runningBalance = statement ? statement.supplier.opening_balance : 0;
  const rowsWithBalance = ledgerRows.map(r => {
    runningBalance += r.debit - r.credit;
    return { ...r, balance: runningBalance };
  });

  return (
    <div>
      <div className="card">
        <label>Select Supplier</label>
        <select style={{ width: '100%', maxWidth: 320 }} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">-- choose a supplier --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {statement && (
        <>
          <div className="row" style={{ gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="stat-card stat-sales" style={{ flex: 1, minWidth: 180 }}>
              <div className="stat-label">Total Purchased</div>
              <div className="stat-value">₹{statement.totals.total_purchased.toFixed(2)}</div>
            </div>
            <div className="stat-card stat-profit" style={{ flex: 1, minWidth: 180 }}>
              <div className="stat-label">Total Paid</div>
              <div className="stat-value">₹{statement.totals.total_paid.toFixed(2)}</div>
            </div>
            <div className="stat-card stat-alert" style={{ flex: 1, minWidth: 180 }}>
              <div className="stat-label">Total Returned</div>
              <div className="stat-value">₹{statement.totals.total_returned.toFixed(2)}</div>
            </div>
            <div className={`stat-card ${statement.totals.outstanding > 0 ? 'stat-loss' : 'stat-profit'}`} style={{ flex: 1, minWidth: 180 }}>
              <div className="stat-label">Outstanding</div>
              <div className="stat-value">₹{statement.totals.outstanding.toFixed(2)}</div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Record a Payment to {statement.supplier.name}</h4>
            <div className="row">
              <input type="number" placeholder="Amount ₹" style={{ flex: 1, minWidth: 120 }} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <select value={payMode} onChange={e => setPayMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank</option>
              </select>
              <input placeholder="Notes (optional)" style={{ flex: 2, minWidth: 160 }} value={payNotes} onChange={e => setPayNotes(e.target.value)} />
              <button className="btn" onClick={recordPayment}>Record Payment</button>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Ledger — {statement.supplier.name}</h4>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit (owed)</th><th>Credit (paid/returned)</th><th>Balance</th><th></th></tr></thead>
              <tbody>
                {statement.supplier.opening_balance !== 0 && (
                  <tr>
                    <td colSpan={6} style={{ fontStyle: 'italic', color: 'var(--chocolate)' }}>Opening Balance</td>
                    <td style={{ fontWeight: 700 }}>₹{statement.supplier.opening_balance.toFixed(2)}</td>
                  </tr>
                )}
                {rowsWithBalance.map((r, i) => (
                  <React.Fragment key={i}>
                    <tr>
                      <td>{r.date}</td>
                      <td>{r.type}</td>
                      <td>{r.reference}</td>
                      <td>{r.debit > 0 ? `₹${r.debit.toFixed(2)}` : '-'}</td>
                      <td>{r.credit > 0 ? `₹${r.credit.toFixed(2)}` : '-'}</td>
                      <td style={{ fontWeight: 700 }}>₹{r.balance.toFixed(2)}</td>
                      <td>
                        {r.purchaseId && (
                          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleItems(r.purchaseId)}>
                            {expandedPurchase === r.purchaseId ? 'Hide' : 'View Items'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedPurchase === r.purchaseId && (
                      <tr>
                        <td colSpan={7} style={{ background: '#FAF9FD', padding: '10px 16px' }}>
                          <strong style={{ fontSize: 12.5 }}>Stock received on this purchase:</strong>
                          <table style={{ marginTop: 6 }}>
                            <thead><tr><th>Raw Material</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                            <tbody>
                              {purchaseItems.map(item => (
                                <tr key={item.id}>
                                  <td>{item.raw_material_name}</td>
                                  <td>{item.quantity} {item.unit}</td>
                                  <td>₹{item.rate.toFixed(2)}</td>
                                  <td>₹{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {rowsWithBalance.length === 0 && <p>No transactions with this supplier yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}
