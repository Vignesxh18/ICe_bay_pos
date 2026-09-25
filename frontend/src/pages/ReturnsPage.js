import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ReturnsPage() {
  const [subTab, setSubTab] = useState('purchase');
  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={`btn ${subTab === 'purchase' ? '' : 'btn-secondary'}`} onClick={() => setSubTab('purchase')}>Purchase Return</button>
        <button className={`btn ${subTab === 'sales' ? '' : 'btn-secondary'}`} onClick={() => setSubTab('sales')}>Sales Refund</button>
      </div>
      {subTab === 'purchase' ? <PurchaseReturn /> : <SalesRefund />}
    </div>
  );
}

function PurchaseReturn() {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [returns, setReturns] = useState([]);
  const [form, setForm] = useState({ supplier_id: '', raw_material_id: '', quantity: '', rate: '', reason: '' });

  const loadAll = () => {
    api.get('/purchases/suppliers').then(setSuppliers).catch(() => setSuppliers([]));
    api.get('/raw-materials').then(setMaterials).catch(() => setMaterials([]));
    api.get('/purchases/returns').then(setReturns).catch(() => setReturns([]));
  };
  useEffect(loadAll, []);

  const submit = async () => {
    if (!form.supplier_id || !form.raw_material_id || !form.quantity || !form.rate) {
      return alert('Supplier, raw material, quantity, and rate are all required');
    }
    try {
      await api.post('/purchases/returns', {
        supplier_id: Number(form.supplier_id),
        raw_material_id: Number(form.raw_material_id),
        quantity: Number(form.quantity),
        rate: Number(form.rate),
        reason: form.reason || null
      });
      setForm({ supplier_id: '', raw_material_id: '', quantity: '', rate: '', reason: '' });
      loadAll();
      alert('Return recorded, stock adjusted, supplier outstanding updated');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="card">
        <h4 style={{ marginTop: 0 }}>Record a Purchase Return</h4>
        <p style={{ fontSize: 13, color: 'var(--chocolate)', marginTop: -6 }}>
          Sending stock back to a supplier (damaged goods, wrong item, etc.) — this reduces your stock and reduces what you owe that supplier.
        </p>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Supplier</label>
            <select style={{ width: '100%' }} value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">-- supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Raw Material</label>
            <select style={{ width: '100%' }} value={form.raw_material_id} onChange={e => setForm({ ...form, raw_material_id: e.target.value })}>
              <option value="">-- material --</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label>Quantity</label>
            <input type="number" style={{ width: '100%' }} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label>Rate ₹</label>
            <input type="number" style={{ width: '100%' }} value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>Reason</label>
          <input style={{ width: '100%' }} placeholder="e.g. damaged, wrong item" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
        </div>
        <button className="btn" onClick={submit}>Save Return</button>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Return History</h4>
        <table>
          <thead><tr><th>Date</th><th>Supplier</th><th>Raw Material</th><th>Qty</th><th>Amount</th><th>Reason</th></tr></thead>
          <tbody>
            {returns.map(r => (
              <tr key={r.id}>
                <td>{r.return_date}</td>
                <td>{r.supplier_name}</td>
                <td>{r.raw_material_name}</td>
                <td>{r.quantity} {r.unit}</td>
                <td>₹{r.amount.toFixed(2)}</td>
                <td>{r.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {returns.length === 0 && <p>No purchase returns recorded yet.</p>}
      </div>
    </div>
  );
}

function SalesRefund() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bills, setBills] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const loadBills = () => {
    api.get(`/bills?date=${date}`).then(data => setBills(data.bills)).catch(() => setBills([]));
  };
  useEffect(loadBills, [date]);

  const cancelBill = async (bill) => {
    if (!window.confirm(`Cancel ${bill.bill_no}? Stock will be restored for the whole bill.`)) return;
    const reason = window.prompt('Reason for cancelling this bill (required):');
    if (!reason || !reason.trim()) return alert('A reason is required to cancel a bill');
    try {
      await api.post(`/bills/${bill.id}/cancel`, { reason: reason.trim() });
      alert('Bill cancelled, stock restored');
      loadBills();
    } catch (err) {
      alert(err.message);
    }
  };

  const quickRefund = async (bill) => {
    let items;
    try {
      items = (await api.get(`/bills/${bill.id}`)).items;
    } catch (err) {
      return alert(err.message);
    }
    const refundable = items.filter(i => !i.is_free);
    if (refundable.length === 0) return alert('Nothing on this bill can be refunded');

    const productList = refundable.map((i, idx) => `${idx + 1}. ${i.product_name} (qty sold: ${i.quantity})`).join('\n');
    const choice = window.prompt(`Which item to refund?\n${productList}\n\nEnter the number:`);
    const idx = Number(choice) - 1;
    if (choice === null || !refundable[idx]) return;
    const item = refundable[idx];

    const qtyStr = window.prompt(`Refund how many of "${item.product_name}" (max ${item.quantity})?`, item.quantity);
    if (!qtyStr) return;
    const quantity = Number(qtyStr);
    if (!quantity || quantity <= 0 || quantity > item.quantity) return alert('Invalid quantity');
    const reason = window.prompt('Reason for refund (optional):') || '';

    try {
      const res = await api.post(`/bills/${bill.id}/refund`, { items: [{ bill_item_id: item.id, quantity }], reason });
      alert(`Refunded ₹${res.refund_amount.toFixed(2)}, stock restored`);
      loadBills();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h4 style={{ marginTop: 0 }}>Recent Bills</h4>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <table>
        <thead><tr><th>Bill No</th><th>Time</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id}>
              <td>{b.bill_no}</td>
              <td>{b.bill_date?.split(' ')[1] || b.bill_date}</td>
              <td>{b.item_summary || '-'}</td>
              <td>₹{b.total_amount.toFixed(2)}</td>
              <td style={{ textTransform: 'capitalize' }}>{b.payment_mode}</td>
              <td style={{ textTransform: 'capitalize' }}>{b.status}</td>
              <td>
                {b.status === 'active' && (
                  <div className="row">
                    <button className="btn btn-secondary" onClick={() => quickRefund(b)}>Refund</button>
                    <button className="btn btn-secondary" style={{ color: 'var(--danger-dark)' }} onClick={() => cancelBill(b)}>Cancel</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bills.length === 0 && <p>No bills on this date.</p>}
    </div>
  );
}
