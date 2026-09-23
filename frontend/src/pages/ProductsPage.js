import React, { useEffect, useState } from 'react';
import { api } from '../api';
import RawMaterialForm from './RawMaterialForm';

export default function ProductsPage() {
  const [subTab, setSubTab] = useState('products');
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', selling_price: '', output_qty: '1', recipe: [] });

  const loadMaterials = () => api.get('/raw-materials').then(setMaterials).catch(() => setMaterials([]));
  const loadProducts = () => api.get('/products').then(setProducts).catch(() => setProducts([]));

  useEffect(() => { loadMaterials(); loadProducts(); }, []);

  const addMaterial = async () => {
    // replaced by RawMaterialForm
  };

  const removeMaterial = async (id) => {
    if (!window.confirm('Remove this raw material?')) return;
    await api.del(`/raw-materials/${id}`);
    loadMaterials();
  };

  const openNewForm = () => {
    setEditing(null);
    setForm({ name: '', category: '', selling_price: '', output_qty: '1', recipe: [] });
    setShowForm(true);
  };

  const openEditForm = (p) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category || '', selling_price: String(p.selling_price),
      output_qty: String(p.output_qty || 1),
      recipe: (p.recipe || []).map(r => ({ raw_material_id: r.raw_material_id, quantity_required: r.quantity_required }))
    });
    setShowForm(true);
  };

  const addRecipeLine = () => {
    if (materials.length === 0) return alert('Add a raw material first');
    setForm(f => ({ ...f, recipe: [...f.recipe, { raw_material_id: materials[0].id, quantity_required: '' }] }));
  };

  const updateRecipeLine = (idx, field, value) => {
    setForm(f => {
      const recipe = [...f.recipe];
      recipe[idx] = { ...recipe[idx], [field]: value };
      return { ...f, recipe };
    });
  };

  const removeRecipeLine = (idx) => setForm(f => ({ ...f, recipe: f.recipe.filter((_, i) => i !== idx) }));

  const saveProduct = async () => {
    if (!form.name.trim() || !form.selling_price) return alert('Name and selling price required');
    const body = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      selling_price: Number(form.selling_price),
      output_qty: Number(form.output_qty) || 1,
      recipe: form.recipe.filter(r => r.raw_material_id && r.quantity_required)
        .map(r => ({ raw_material_id: Number(r.raw_material_id), quantity_required: Number(r.quantity_required) }))
    };
    if (editing) await api.put(`/products/${editing.id}`, body);
    else await api.post('/products', body);
    setShowForm(false);
    loadProducts();
  };

  const removeProduct = async (id) => {
    if (!window.confirm('Remove this product?')) return;
    await api.del(`/products/${id}`);
    loadProducts();
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={`btn ${subTab === 'products' ? '' : 'btn-secondary'}`} onClick={() => setSubTab('products')}>Products & Recipes</button>
        <button className={`btn ${subTab === 'materials' ? '' : 'btn-secondary'}`} onClick={() => setSubTab('materials')}>Raw Materials</button>
      </div>

      {subTab === 'materials' && (
        <div>
          <button className="btn" style={{ marginBottom: 14 }} onClick={() => { setEditingMaterial(null); setShowMaterialForm(true); }}>
            + Add Raw Material
          </button>

          {showMaterialForm && (
            <RawMaterialForm
              editing={editingMaterial}
              onSaved={() => { setShowMaterialForm(false); loadMaterials(); }}
              onCancel={() => setShowMaterialForm(false)}
            />
          )}

          {materials.map(m => (
            <div key={m.id} className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{m.name}</strong> {m.category && m.category !== 'Uncategorized' ? `(${m.category})` : ''} — {Number(m.current_stock).toFixed(2)} {m.unit} in stock
                {Number(m.current_stock) <= Number(m.reorder_level) && <span className="low-stock"> ⚠ LOW STOCK</span>}
              </div>
              <div className="row">
                <button className="btn btn-secondary" onClick={() => { setEditingMaterial(m); setShowMaterialForm(true); }}>Edit</button>
                <button className="btn btn-secondary" onClick={() => removeMaterial(m.id)}>Remove</button>
              </div>
            </div>
          ))}
          {materials.length === 0 && !showMaterialForm && <p>No raw materials yet.</p>}
        </div>
      )}

      {subTab === 'products' && (
        <div>
          <button className="btn" style={{ marginBottom: 14 }} onClick={openNewForm}>+ Add Product</button>

          {showForm && (
            <div className="card">
              <h4 style={{ marginTop: 0 }}>{editing ? 'Edit Product' : 'New Product'}</h4>
              <div className="row" style={{ marginBottom: 10 }}>
                <input placeholder="Product name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                <input placeholder="Selling price ₹" type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} />
                <input placeholder="Batch output qty" type="number" value={form.output_qty} onChange={e => setForm({ ...form, output_qty: e.target.value })} />
              </div>

              <h5>Recipe (ingredients per batch)</h5>
              {form.recipe.map((r, idx) => (
                <div key={idx} className="row" style={{ marginBottom: 8 }}>
                  <select value={r.raw_material_id} onChange={e => updateRecipeLine(idx, 'raw_material_id', e.target.value)}>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                  </select>
                  <input placeholder="Quantity" type="number" value={r.quantity_required} onChange={e => updateRecipeLine(idx, 'quantity_required', e.target.value)} />
                  <button className="btn btn-secondary" onClick={() => removeRecipeLine(idx)}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={addRecipeLine}>+ Add Ingredient</button>

              <div className="row">
                <button className="btn" onClick={saveProduct}>Save</button>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {products.map(p => (
            <div key={p.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div><strong>{p.name}</strong> {p.category ? `(${p.category})` : ''} — ₹{Number(p.selling_price).toFixed(2)}</div>
                <div className="row">
                  <button className="btn btn-secondary" onClick={() => openEditForm(p)}>Edit</button>
                  <button className="btn btn-secondary" onClick={() => removeProduct(p.id)}>Remove</button>
                </div>
              </div>
              {p.recipe?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                  Makes {p.output_qty} unit(s) using: {p.recipe.map(r => `${r.quantity_required}${r.unit} ${r.raw_material_name}`).join(', ')}
                </div>
              )}
            </div>
          ))}
          {products.length === 0 && !showForm && <p>No products yet.</p>}
        </div>
      )}
    </div>
  );
}
