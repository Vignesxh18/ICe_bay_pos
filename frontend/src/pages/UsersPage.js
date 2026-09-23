import React, { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { username: '', password: '', role: 'cashier' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => api.get('/auth/users').then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.username.trim() || !form.password) return alert('Username and password are required');
    try {
      await api.post('/auth/users', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    await api.put(`/auth/users/${id}/deactivate`, {});
    load();
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Staff / Users</h3>
        <button className="btn" onClick={() => setShowForm(true)}>+ Add User</button>
      </div>

      {showForm && (
        <div className="card">
          <h4 style={{ marginTop: 0 }}>New User</h4>
          <div className="row" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Username</label>
              <input style={{ width: '100%' }} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Password</label>
              <input type="password" style={{ width: '100%' }} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Role</label>
              <select style={{ width: '100%' }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Cashier (billing only, max 10% discount)</option>
                <option value="manager">Manager (reports + purchases + inventory, max 25% discount)</option>
                <option value="owner">Owner (full access, unlimited discount)</option>
              </select>
            </div>
          </div>
          <div className="row">
            <button className="btn" onClick={save}>Create User</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td>{u.is_active ? 'Active' : 'Deactivated'}</td>
                <td>{u.created_at}</td>
                <td>{u.is_active ? <button className="btn btn-secondary" onClick={() => deactivate(u.id)}>Deactivate</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
