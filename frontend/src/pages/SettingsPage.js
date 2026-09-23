import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [backups, setBackups] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadSettings = () => api.get('/settings').then(setSettings).catch(() => setSettings(null));
  const loadBackups = () => api.get('/backup/list').then(setBackups).catch(() => setBackups([]));

  useEffect(() => { loadSettings(); loadBackups(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      alert('Settings saved');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    try {
      const res = await api.post('/backup/create', {});
      alert(`Backup created: ${res.filename}`);
      loadBackups();
    } catch (err) {
      alert(err.message);
    }
  };

  const downloadBackup = (filename) => {
    const token = localStorage.getItem('icecream_token');
    window.open(`http://localhost:6001/api/backup/download/${filename}?token=${token}`, '_blank');
  };

  if (!settings) return <div className="card">Loading...</div>;

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Settings</h3>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Shop Details</h4>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Shop Name</label>
            <input style={{ width: '100%' }} value={settings.shop_name || ''} onChange={e => setSettings({ ...settings, shop_name: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Phone</label>
            <input style={{ width: '100%' }} value={settings.shop_phone || ''} onChange={e => setSettings({ ...settings, shop_phone: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>GST Number (optional)</label>
            <input style={{ width: '100%' }} value={settings.shop_gst || ''} onChange={e => setSettings({ ...settings, shop_gst: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Address</label>
          <input style={{ width: '100%' }} value={settings.shop_address || ''} onChange={e => setSettings({ ...settings, shop_address: e.target.value })} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>Receipt Footer Message</label>
          <input style={{ width: '100%' }} value={settings.receipt_footer || ''} onChange={e => setSettings({ ...settings, receipt_footer: e.target.value })} />
        </div>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h4 style={{ marginTop: 0 }}>Backup & Restore</h4>
          <button className="btn" onClick={createBackup}>Create Backup Now</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--chocolate)' }}>
          A backup is a full copy of your database at this moment. Download it and keep it somewhere safe
          (cloud drive, email to yourself) — this is your only protection if this computer's file is ever lost.
        </p>
        <table>
          <thead><tr><th>Backup File</th><th>Size</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.filename}>
                <td>{b.filename}</td>
                <td>{b.size_kb} KB</td>
                <td>{new Date(b.created_at).toLocaleString()}</td>
                <td><button className="btn btn-secondary" onClick={() => downloadBackup(b.filename)}>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {backups.length === 0 && <p>No backups yet — click "Create Backup Now" above.</p>}
      </div>
    </div>
  );
}
