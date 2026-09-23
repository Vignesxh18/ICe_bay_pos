import React, { useEffect, useState } from 'react';
import { api } from '../api';

const STATES = ['Tamil Nadu', 'Puducherry', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Other'];

const emptyForm = {
  name: '', company: '', phone: '', email: '',
  registered_under_gst: 'No', gst_no: '',
  register_address: '', state: 'Tamil Nadu', city: '', pincode: '',
  fssai_lic_no: '', pan: '', msme_number: '', type: 'Both'
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => api.get('/purchases/suppliers').then(setSuppliers).catch(() => setSuppliers([]));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '', company: s.company || '', phone: s.phone || '', email: s.email || '',
      registered_under_gst: s.registered_under_gst || 'No', gst_no: s.gst_no || '',
      register_address: s.register_address || '', state: s.state || 'Tamil Nadu', city: s.city || '', pincode: s.pincode || '',
      fssai_lic_no: s.fssai_lic_no || '', pan: s.pan || '', msme_number: s.msme_number || '', type: s.type || 'Both'
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('Name is required');
    if (editing) await api.put(`/purchases/suppliers/${editing.id}`, form);
    else await api.post('/purchases/suppliers', form);
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Supplier / Third Party Management</h3>
        <button className="btn" onClick={openNew}>+ Create New</button>
      </div>

      {showForm && (
        <div className="card">
          <h4 style={{ marginTop: 0 }}>{editing ? 'Edit Supplier' : 'Add Supplier/Third Party'}</h4>

          <h5>Basic Details</h5>
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Name *</label>
              <input style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Company</label>
              <input style={{ width: '100%' }} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Email</label>
              <input style={{ width: '100%' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Phone</label>
              <input style={{ width: '100%' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Registered Under GST</label>
              <select style={{ width: '100%' }} value={form.registered_under_gst} onChange={e => setForm({ ...form, registered_under_gst: e.target.value })}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>GST No</label>
              <input style={{ width: '100%' }} value={form.gst_no} onChange={e => setForm({ ...form, gst_no: e.target.value })} disabled={form.registered_under_gst === 'No'} />
            </div>
          </div>

          <h5>Address</h5>
          <div style={{ marginBottom: 10 }}>
            <label>Register Address</label>
            <textarea style={{ width: '100%', minHeight: 60 }} value={form.register_address} onChange={e => setForm({ ...form, register_address: e.target.value })} />
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>State</label>
              <select style={{ width: '100%' }} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>City</label>
              <input style={{ width: '100%' }} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Pin Code</label>
              <input style={{ width: '100%' }} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} />
            </div>
          </div>

          <h5>Other Details</h5>
          <div className="row" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>FSSAI Lic. No.</label>
              <input style={{ width: '100%' }} value={form.fssai_lic_no} onChange={e => setForm({ ...form, fssai_lic_no: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>PAN</label>
              <input style={{ width: '100%' }} value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>MSME Number</label>
              <input style={{ width: '100%' }} value={form.msme_number} onChange={e => setForm({ ...form, msme_number: e.target.value })} />
            </div>
          </div>

          <div className="row">
            <button className="btn" onClick={save}>Save Changes</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Email</th><th>Company</th><th>Phone</th>
              <th>GST No</th><th>FSSAI Lic No.</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.type || 'Both'}</td>
                <td>{s.email || '-'}</td>
                <td>{s.company || '-'}</td>
                <td>{s.phone || '-'}</td>
                <td>{s.gst_no || '-'}</td>
                <td>{s.fssai_lic_no || '-'}</td>
                <td>{s.status || 'Active'}</td>
                <td><button className="btn btn-secondary" onClick={() => openEdit(s)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && <p>No suppliers yet — click "+ Create New" above.</p>}
      </div>
    </div>
  );
}
