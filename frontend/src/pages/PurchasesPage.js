import React, { useEffect, useState } from 'react';
import { api, uploadFile } from '../api';

const UNIT_MAP = { pcs: 'pcs', kg: 'kg', g: 'g', ml: 'ml', l: 'l', ltr: 'l' };
const today = new Date().toISOString().slice(0, 10);

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [newSupplier, setNewSupplier] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [items, setItems] = useState([{ raw_material_id: '', quantity: '', rate: '', tax_percent: '' }]);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');

  const [parsing, setParsing] = useState(false);
  const [parsedNotice, setParsedNotice] = useState(null);

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

  const addItemLine = () => setItems(list => [...list, { raw_material_id: '', quantity: '', rate: '', tax_percent: '' }]);
  const removeItemLine = (idx) => setItems(list => list.filter((_, i) => i !== idx));

  const materialUnit = (id) => materials.find(m => String(m.id) === String(id))?.unit || '';
  const lineBase = (it) => (Number(it.quantity) || 0) * (Number(it.rate) || 0);
  const lineTax = (it) => lineBase(it) * ((Number(it.tax_percent) || 0) / 100);
  const lineAmount = (it) => lineBase(it) + lineTax(it);
  const subTotal = items.reduce((sum, it) => sum + lineBase(it), 0);
  const totalTax = items.reduce((sum, it) => sum + lineTax(it), 0);
  const grandTotal = subTotal + totalTax;

  const resetForm = () => {
    setItems([{ raw_material_id: '', quantity: '', rate: '', tax_percent: '' }]);
    setInvoiceNo('');
    setInvoiceDate(today);
    setIsPaid(false);
    setParsedNotice(null);
  };

  const savePurchase = async () => {
    if (!supplierId) return alert('Choose or add a supplier');
    const validItems = items
      .filter(it => it.raw_material_id && it.quantity && it.rate)
      .map(it => ({ raw_material_id: Number(it.raw_material_id), quantity: Number(it.quantity), rate: Number(it.rate), tax_percent: Number(it.tax_percent) || 0 }));
    if (validItems.length === 0) return alert('Add at least one item');

    await api.post('/purchases', {
      supplier_id: Number(supplierId),
      invoice_no: invoiceNo || null,
      purchase_date: invoiceDate,
      paid_amount: isPaid ? grandTotal : 0,
      payment_mode: isPaid ? paymentMode : 'pending',
      items: validItems
    });

    resetForm();
    loadPurchases();
    loadMaterials();
    alert('Purchase recorded, stock updated');
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    setParsedNotice(null);
    try {
      const result = await uploadFile('/invoice-parser/parse-invoice', file);

      let resolvedSupplierId = result.matched_supplier_id;
      if (!resolvedSupplierId && result.supplier_name) {
        const newSup = await api.post('/purchases/suppliers', { name: result.supplier_name });
        resolvedSupplierId = newSup.id;
        loadSuppliers();
      }
      if (resolvedSupplierId) setSupplierId(String(resolvedSupplierId));
      if (result.invoice_no) setInvoiceNo(result.invoice_no);
      if (result.invoice_date) setInvoiceDate(result.invoice_date);

      const resolvedItems = [];
      let createdCount = 0;

      for (const item of result.items) {
        let materialId = item.matched_raw_material_id;
        if (!materialId) {
          const unit = UNIT_MAP[item.unit] || 'pcs';
          const created = await api.post('/raw-materials', { name: item.description, unit, category: 'Uncategorized' });
          materialId = created.id;
          createdCount++;
        }
        resolvedItems.push({ raw_material_id: String(materialId), quantity: String(item.quantity), rate: String(item.rate), tax_percent: String(item.gst_percent || 0) });
      }

      setItems(resolvedItems.length > 0 ? resolvedItems : [{ raw_material_id: '', quantity: '', rate: '', tax_percent: '' }]);
      loadMaterials();

      setParsedNotice({
        itemCount: result.items.length,
        createdCount,
        grandTotal: result.grand_total,
        supplierName: result.supplier_name
      });
    } catch (err) {
      alert('Could not parse this PDF: ' + err.message);
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Add Purchase</h3>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            {parsing ? 'Parsing...' : '📄 Upload Invoice'}
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} disabled={parsing} style={{ display: 'none' }} />
          </label>
        </div>

        {parsedNotice && (
          <div className="stat-card stat-profit" style={{ marginBottom: 16 }}>
            Parsed {parsedNotice.itemCount} item(s) from {parsedNotice.supplierName || 'the invoice'}.
            {parsedNotice.createdCount > 0 && ` Created ${parsedNotice.createdCount} new raw material(s).`}
            {parsedNotice.grandTotal && ` Invoice total: ₹${parsedNotice.grandTotal.toFixed(2)}.`}
            {' '}Review below, then Save.
          </div>
        )}

        {/* Supplier / Date / Invoice row */}
        <div className="row" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label>Supplier *</label>
            <select style={{ width: '100%' }} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">-- choose supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Invoice Date *</label>
            <input type="date" style={{ width: '100%' }} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Invoice Number</label>
            <input style={{ width: '100%' }} placeholder="Invoice Number" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginBottom: 16 }}>
          <input placeholder="Or type a new supplier name" value={newSupplier} onChange={e => setNewSupplier(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn btn-secondary" onClick={addSupplier}>+ Add Supplier</button>
        </div>

        {/* Items table */}
        <table>
          <thead>
            <tr>
              <th>Raw Material *</th><th>Qty *</th><th>Unit</th><th>Price</th><th>Tax %</th><th>Amount</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td>
                  <select style={{ width: '100%', minWidth: 180 }} value={it.raw_material_id} onChange={e => updateItem(idx, 'raw_material_id', e.target.value)}>
                    <option value="">Select/Add Raw Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
                <td><input type="number" style={{ width: 80 }} value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></td>
                <td>{materialUnit(it.raw_material_id) || '-'}</td>
                <td><input type="number" style={{ width: 90 }} placeholder="₹" value={it.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} /></td>
                <td><input type="number" style={{ width: 70 }} placeholder="0" value={it.tax_percent} onChange={e => updateItem(idx, 'tax_percent', e.target.value)} /></td>
                <td style={{ fontWeight: 700 }}>₹{lineAmount(it).toFixed(2)}</td>
                <td><button className="btn btn-secondary" onClick={() => removeItemLine(idx)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-secondary" style={{ marginTop: 10, marginBottom: 20 }} onClick={addItemLine}>+ Add New</button>

        {/* Totals + payment */}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 280 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Sub Total:</span><span>₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, color: 'var(--chocolate)' }}>
              <span>Total Tax (GST):</span><span>₹{totalTax.toFixed(2)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginBottom: 14, borderTop: '2px solid var(--plum)', paddingTop: 8 }}>
              <span>Grand Total:</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label>Payment Type</label>
              <div className="row" style={{ marginTop: 4 }}>
                <button className={`btn ${!isPaid ? '' : 'btn-secondary'}`} onClick={() => setIsPaid(false)}>Unpaid</button>
                <button className={`btn ${isPaid ? '' : 'btn-secondary'}`} onClick={() => setIsPaid(true)}>Paid</button>
              </div>
            </div>
            {isPaid && (
              <div style={{ marginBottom: 14 }}>
                <label>Paid via</label>
                <select style={{ width: '100%' }} value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
            )}

            <button className="btn" style={{ width: '100%' }} onClick={savePurchase}>Save Changes</button>
          </div>
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
