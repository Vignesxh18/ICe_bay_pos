import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');

  const load = () => {
    api.get('/categories').then(setCategories).catch(() => setCategories([]));
  };
  useEffect(load, []);

  const add = async () => {
    if (!name.trim()) return alert('Enter a category name');
    try {
      await api.post('/categories', { name: name.trim() });
      setName('');
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? This won't remove it from raw materials or products that already use it.`)) return;
    try {
      await api.del(`/categories/${cat.id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="card">
      <h4 style={{ marginTop: 0 }}>Categories</h4>
      <p style={{ fontSize: 13, color: 'var(--chocolate)', marginTop: -6 }}>
        Manage the category names used across Raw Materials and Products (e.g. Milk Base, Water Base, Milkshake, Bulk).
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <input
          style={{ flex: 1, minWidth: 200 }}
          placeholder="e.g. Milk Base"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="btn" onClick={add}>+ Add Category</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th></th></tr></thead>
        <tbody>
          {categories.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td><button className="btn btn-secondary" onClick={() => remove(c)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {categories.length === 0 && <p>No categories yet — add your first one above.</p>}
    </div>
  );
}
