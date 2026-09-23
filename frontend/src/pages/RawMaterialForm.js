import React, { useState } from 'react';
import { api } from '../api';

const UNITS = ['g', 'kg', 'ml', 'l', 'pcs'];

const emptyForm = {
  name: '', purchase_unit: 'g', consumption_unit: 'g', category: '',
  purchase_price: '', transfer_price: '', reconciliation_price: '',
  tax_type: 'GST', tax_percent: '',
  reorder_level: '', at_par_stock_level: '', closing_stock_frequency: 'Daily',
  allow_restock_level: false, opening_stock: '',
  barcode: '', hsn_code: '',
  is_expiry: 'No', allow_decimal_quantity: 'Yes', description: '', normal_loss_percent: ''
};

export default function RawMaterialForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(() => editing ? {
    name: editing.name, purchase_unit: editing.purchase_unit || editing.unit, consumption_unit: editing.consumption_unit || editing.unit,
    category: editing.category || '',
    purchase_price: editing.purchase_price || '', transfer_price: editing.transfer_price || '', reconciliation_price: editing.reconciliation_price || '',
    tax_type: editing.tax_type || 'GST', tax_percent: editing.tax_percent || '',
    reorder_level: editing.reorder_level || '', at_par_stock_level: editing.at_par_stock_level || '',
    closing_stock_frequency: editing.closing_stock_frequency || 'Daily',
    allow_restock_level: !!editing.allow_restock_level, opening_stock: '',
    barcode: editing.barcode || '', hsn_code: editing.hsn_code || '',
    is_expiry: editing.is_expiry || 'No', allow_decimal_quantity: editing.allow_decimal_quantity || 'Yes',
    description: editing.description || '', normal_loss_percent: editing.normal_loss_percent || ''
  } : emptyForm);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.name.trim()) return alert('Name is required');
    if (!form.purchase_unit) return alert('Purchase unit is required');

    const body = {
      ...form,
      unit: form.consumption_unit || form.purchase_unit, // stock is tracked in consumption unit
      purchase_price: Number(form.purchase_price) || 0,
      transfer_price: Number(form.transfer_price) || 0,
      reconciliation_price: Number(form.reconciliation_price) || 0,
      tax_percent: Number(form.tax_percent) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      at_par_stock_level: Number(form.at_par_stock_level) || 0,
      opening_stock: Number(form.opening_stock) || 0,
      normal_loss_percent: Number(form.normal_loss_percent) || 0
    };

    if (editing) await api.put(`/raw-materials/${editing.id}`, body);
    else await api.post('/raw-materials', body);
    onSaved();
  };

  return (
    <div className="card">
      <h4 style={{ marginTop: 0 }}>{editing ? 'Edit Raw Material' : 'Add Raw Material'}</h4>

      <h5>Basic Details</h5>
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label>Name *</label>
          <input style={{ width: '100%' }} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label>Purchase Unit *</label>
          <select style={{ width: '100%' }} value={form.purchase_unit} onChange={e => set('purchase_unit', e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label>Consumption Unit *</label>
          <select style={{ width: '100%' }} value={form.consumption_unit} onChange={e => set('consumption_unit', e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Category</label>
          <input style={{ width: '100%' }} placeholder="e.g. Chocolate" value={form.category} onChange={e => set('category', e.target.value)} />
        </div>
      </div>

      <h5>Prices</h5>
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Purchase Price</label>
          <input type="number" style={{ width: '100%' }} value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Transfer Price</label>
          <input type="number" style={{ width: '100%' }} value={form.transfer_price} onChange={e => set('transfer_price', e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Reconciliation Price</label>
          <input type="number" style={{ width: '100%' }} value={form.reconciliation_price} onChange={e => set('reconciliation_price', e.target.value)} />
        </div>
      </div>

      <h5>Taxes</h5>
      <div className="row" style={{ marginBottom: 10 }}>
        <div>
          <label style={{ marginRight: 12 }}>
            <input type="radio" checked={form.tax_type === 'GST'} onChange={() => set('tax_type', 'GST')} /> GST
          </label>
          <label>
            <input type="radio" checked={form.tax_type === 'VAT'} onChange={() => set('tax_type', 'VAT')} /> VAT
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Tax (%)</label>
          <input type="number" style={{ width: '100%' }} value={form.tax_percent} onChange={e => set('tax_percent', e.target.value)} />
        </div>
      </div>

      <h5>Set Levels</h5>
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Minimum Stock Level (reorder alert)</label>
          <input type="number" style={{ width: '100%' }} value={form.reorder_level} onChange={e => set('reorder_level', e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>At Par Stock Level</label>
          <input type="number" style={{ width: '100%' }} value={form.at_par_stock_level} onChange={e => set('at_par_stock_level', e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Closing stock updated on</label>
          <select style={{ width: '100%' }} value={form.closing_stock_frequency} onChange={e => set('closing_stock_frequency', e.target.value)}>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>
          <input type="checkbox" checked={form.allow_restock_level} onChange={e => set('allow_restock_level', e.target.checked)} /> Allow Restock Level
        </label>
      </div>
      {!editing && (
        <div style={{ marginBottom: 14 }}>
          <label>Opening Stock</label>
          <input type="number" style={{ width: 200 }} value={form.opening_stock} onChange={e => set('opening_stock', e.target.value)} />
        </div>
      )}

      <h5>Related Codes</h5>
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Barcode/Short Code</label>
          <input style={{ width: '100%' }} value={form.barcode} onChange={e => set('barcode', e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>HSN Code</label>
          <input style={{ width: '100%' }} value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)} />
        </div>
      </div>

      <h5>Other Details</h5>
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Is Expiry</label>
          <select style={{ width: '100%' }} value={form.is_expiry} onChange={e => set('is_expiry', e.target.value)}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Allow Decimal Quantity</label>
          <div>
            <label style={{ marginRight: 12 }}>
              <input type="radio" checked={form.allow_decimal_quantity === 'Yes'} onChange={() => set('allow_decimal_quantity', 'Yes')} /> Yes
            </label>
            <label>
              <input type="radio" checked={form.allow_decimal_quantity === 'No'} onChange={() => set('allow_decimal_quantity', 'No')} /> No
            </label>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Normal Loss (%)</label>
          <input type="number" style={{ width: '100%' }} value={form.normal_loss_percent} onChange={e => set('normal_loss_percent', e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label>Description</label>
        <textarea style={{ width: '100%', minHeight: 60 }} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div className="row">
        <button className="btn" onClick={save}>Save Changes</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
