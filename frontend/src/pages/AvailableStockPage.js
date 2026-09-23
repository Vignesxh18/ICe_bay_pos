import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AvailableStockPage() {
  const [materials, setMaterials] = useState([]);
  const [counts, setCounts] = useState({}); // { raw_material_id: countedValue }
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const load = () => api.get('/stock-count').then(setMaterials).catch(() => setMaterials([]));
  useEffect(() => { load(); }, []);

  const categories = ['All', ...new Set(materials.map(m => m.category || 'Uncategorized'))];
  const filtered = selectedCategory === 'All' ? materials : materials.filter(m => (m.category || 'Uncategorized') === selectedCategory);

  const updateCount = (id, value) => setCounts(c => ({ ...c, [id]: value }));

  const variance = (m) => {
    const counted = counts[m.id];
    if (counted === undefined || counted === '') return null;
    return Number(counted) - m.current_stock;
  };

  const submitCounts = async () => {
    const payload = Object.entries(counts)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([raw_material_id, counted_stock]) => ({ raw_material_id: Number(raw_material_id), counted_stock: Number(counted_stock) }));

    if (payload.length === 0) return alert('Enter at least one count');

    setSaving(true);
    try {
      const result = await api.post('/stock-count/submit', { counts: payload });
      setLastResult(result);
      setCounts({});
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Available Stock — Daily Count</h3>
        <button className="btn" onClick={submitCounts} disabled={saving}>
          {saving ? 'Saving...' : 'Save Counts'}
        </button>
      </div>

      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn ${selectedCategory === cat ? '' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat} {cat !== 'All' ? `(${materials.filter(m => (m.category || 'Uncategorized') === cat).length})` : `(${materials.length})`}
          </button>
        ))}
      </div>

      {lastResult && lastResult.variances.length > 0 && (
        <div className="card" style={{ background: '#fff8e1' }}>
          <strong>Last save — variances recorded:</strong>
          {lastResult.variances.map(v => (
            <div key={v.raw_material_id} style={{ fontSize: 13 }}>
              {v.name}: {v.variance > 0 ? '+' : ''}{v.variance.toFixed(2)}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Raw Material</th>
              <th>Current (system)</th>
              <th>New Stock (counted)</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const v = variance(m);
              return (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.current_stock.toFixed(2)} {m.unit}</td>
                  <td>
                    <input
                      type="number"
                      style={{ width: 100 }}
                      placeholder={m.unit}
                      value={counts[m.id] ?? ''}
                      onChange={e => updateCount(m.id, e.target.value)}
                    />
                  </td>
                  <td style={{ color: v == null ? '#888' : v < 0 ? '#d32f2f' : v > 0 ? '#2e7d32' : '#888', fontWeight: 700 }}>
                    {v == null ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p>No raw materials in this category.</p>}
      </div>
    </div>
  );
}
