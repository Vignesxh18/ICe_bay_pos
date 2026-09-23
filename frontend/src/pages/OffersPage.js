import React, { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  name: '', price: '',
  trigger_product_id: '', trigger_quantity: '1',
  free_product_id: '', free_quantity: '1',
  start_date: '', end_date: ''
};

export default function OffersPage() {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadCombos = () => api.get('/combos').then(setCombos).catch(() => setCombos([]));
  const loadProducts = () => api.get('/products').then(setProducts).catch(() => setProducts([]));

  useEffect(() => { loadCombos(); loadProducts(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (c) => {
    const trigger = c.items.find(i => !i.is_free);
    const free = c.items.find(i => i.is_free);
    setEditing(c);
    setForm({
      name: c.name, price: String(c.price),
      trigger_product_id: trigger ? String(trigger.product_id) : '',
      trigger_quantity: trigger ? String(trigger.quantity) : '1',
      free_product_id: free ? String(free.product_id) : '',
      free_quantity: free ? String(free.quantity) : '1',
      start_date: c.start_date || '', end_date: c.end_date || ''
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.trigger_product_id || !form.free_product_id) {
      return alert('Offer name, price, trigger product, and free product are all required');
    }
    const body = {
      name: form.name.trim(),
      price: Number(form.price),
      trigger_product_id: Number(form.trigger_product_id),
      trigger_quantity: Number(form.trigger_quantity) || 1,
      free_product_id: Number(form.free_product_id),
      free_quantity: Number(form.free_quantity) || 1,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: true
    };
    if (editing) await api.put(`/combos/${editing.id}`, body);
    else await api.post('/combos', body);
    setShowForm(false);
    loadCombos();
  };

  const removeCombo = async (id) => {
    if (!window.confirm('Deactivate this offer?')) return;
    await api.del(`/combos/${id}`);
    loadCombos();
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Offers & Combos</h3>
        <button className="btn" onClick={openNew}>+ Create Offer</button>
      </div>

      {showForm && (
        <div className="card">
          <h4 style={{ marginTop: 0 }}>{editing ? 'Edit Offer' : 'New Offer'}</h4>

          <div style={{ marginBottom: 10 }}>
            <label>Offer Name</label>
            <input style={{ width: '100%' }} placeholder="e.g. Cold Milo + Free Chicken" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label>Trigger Product (customer buys this)</label>
              <select style={{ width: '100%' }} value={form.trigger_product_id} onChange={e => setForm({ ...form, trigger_product_id: e.target.value })}>
                <option value="">-- select product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label>Trigger Qty</label>
              <input type="number" style={{ width: '100%' }} value={form.trigger_quantity} onChange={e => setForm({ ...form, trigger_quantity: e.target.value })} />
            </div>
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label>🎁 Free Product (given free)</label>
              <select style={{ width: '100%' }} value={form.free_product_id} onChange={e => setForm({ ...form, free_product_id: e.target.value })}>
                <option value="">-- select product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label>Free Qty</label>
              <input type="number" style={{ width: '100%' }} value={form.free_quantity} onChange={e => setForm({ ...form, free_quantity: e.target.value })} />
            </div>
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Offer Price (what customer pays)</label>
              <input type="number" style={{ width: '100%' }} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Start Date (optional)</label>
              <input type="date" style={{ width: '100%' }} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>End Date (optional)</label>
              <input type="date" style={{ width: '100%' }} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>

          <div className="row">
            <button className="btn" onClick={save}>Save Offer</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {combos.map(c => (
        <div key={c.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{c.name}</strong> — ₹{c.price}
              {!c.is_currently_active && <span style={{ color: '#d32f2f', marginLeft: 8, fontWeight: 700 }}>INACTIVE</span>}
            </div>
            <div className="row">
              <button className="btn btn-secondary" onClick={() => openEdit(c)}>Edit</button>
              <button className="btn btn-secondary" onClick={() => removeCombo(c.id)}>Deactivate</button>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
            {c.items.map(i => `${i.quantity}x ${i.product_name}${i.is_free ? ' (FREE)' : ''}`).join(' + ')}
            {c.start_date || c.end_date ? ` — Valid ${c.start_date || '...'} to ${c.end_date || '...'}` : ''}
          </div>
        </div>
      ))}
      {combos.length === 0 && !showForm && <p>No offers yet — click "+ Create Offer" above.</p>}
    </div>
  );
}
