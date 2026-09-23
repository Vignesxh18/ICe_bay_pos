import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [newSupplier, setNewSupplier] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [items, setItems] = useState([{ raw_material_id: '', quantity: '', rate: '' }]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');

  const loadSuppliers = () => api.get('/purchases/suppliers').then(setSuppliers).catch(() => setSuppliers([]));
  const loadMaterials = () => api.get('/raw-materials').then(setMaterials).catch(() => setMaterials([]));
  const loadPurchases = () => api.get('/purchases').then(setPurchases).catch(() => setPurchases([]));

  useEffect(() => { loadSuppliers(); loadMaterials(); loadPurchases(); }, []);

  const addSupplier = async () => {
    if (!newSupplier.trim()) return;
    const s = await api.post('/purchases/suppliers', { name: newSupplier.trim() });
    setNewSupplier('');
    loadSuppliers();
    setSupplierId(String(s.id));
  };

  const updateItem = (idx, field, value) => {
    setItems(list => list.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItemLine = () => setItems(list => [...list, { raw_material_id: '', quantity: '', rate: '' }]);
  const removeItemLine = (idx) => setItems(list => list.filter((_, i) => i !== idx));

  const savePurchase = async () => {
    if (!supplierId) return alert('Choose or add a supplier');
    const validItems = items
      .filter(it => it.raw_material_id && it.quantity && it.rate)
      .map(it => ({ raw_material_id: Number(it.raw_material_id), quantity: Number(it.quantity), rate: Number(it.rate) }));
    if (validItems.length === 0) return alert('Add at least one item');

    await api.post('/purchases', {
      supplier_id: Number(supplierId),
      invoice_no: invoiceNo || null,
      paid_amount: Number(paidAmount) || 0,
      payment_mode: paymentMode,
      items: validItems
    });

    setItems([{ raw_material_id: '', quantity: '', rate: '' }]);
    setInvoiceNo('');
    setPaidAmount('');
    loadPurchases();
    loadMaterials();
    alert('Purchase recorded, stock updated');
  };

  return (
    <div>
      <div className="card">
        <h4 style={{ marginTop: 0 }}>Supplier</h4>
        <div className="row">
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">-- choose supplier --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="Or add new supplier" value={newSupplier} onChange={e => setNewSupplier(e.target.value)} />
          <button className="btn btn-secondary" onClick={addSupplier}>+ Add Supplier</button>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>New Purchase</h4>
        <div className="row" style={{ marginBottom: 10 }}>
          <input placeholder="Invoice no." value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
          <input placeholder="Paid amount ₹" type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
          <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <h5>Items</h5>
        {items.map((it, idx) => (
          <div key={idx} className="row" style={{ marginBottom: 8 }}>
            <select value={it.raw_material_id} onChange={e => updateItem(idx, 'raw_material_id', e.target.value)}>
              <option value="">-- material --</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            <input placeholder="Quantity" type="number" value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
            <input placeholder="Rate ₹" type="number" value={it.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
            <button className="btn btn-secondary" onClick={() => removeItemLine(idx)}>✕</button>
          </div>
        ))}
        <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={addItemLine}>+ Add Item</button>

        <div>
          <button className="btn" onClick={savePurchase}>Save Purchase</button>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Recent Purchases</h4>
        <table>
          <thead><tr><th>Date</th><th>Supplier</th><th>Invoice</th><th>Total</th><th>Paid</th><th></th></tr></thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id}>
                <td>{p.purchase_date}</td>
                <td>{p.supplier_name}</td>
                <td>{p.invoice_no || '-'}</td>
                <td>₹{p.total_amount.toFixed(2)}</td>
                <td>₹{p.paid_amount.toFixed(2)}</td>
                <td><a href={`http://localhost:6001/api/purchases/${p.id}/invoice`} target="_blank" rel="noreferrer">View Invoice</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && <p>No purchases yet.</p>}
      </div>
    </div>
  );
}
