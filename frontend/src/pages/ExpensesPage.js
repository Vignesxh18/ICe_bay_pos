import React, { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { expense_date: new Date().toISOString().slice(0, 10), category: '', amount: '', payment_mode: 'cash', description: '' };

export default function ExpensesPage() {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState('');

  const loadCategories = () => api.get('/expenses/categories').then(setCategories).catch(() => setCategories([]));
  const loadSummary = () => api.get('/expenses/summary').then(setSummary).catch(() => setSummary(null));
  const loadExpenses = () => {
    const query = filterDate ? `?date=${filterDate}` : '';
    api.get(`/expenses${query}`).then(data => setExpenses(data.expenses)).catch(() => setExpenses([]));
  };

  useEffect(() => { loadCategories(); loadSummary(); }, []);
  useEffect(() => { loadExpenses(); /* eslint-disable-next-line */ }, [filterDate]);

  const save = async () => {
    if (!form.category || !form.amount) return alert('Category and amount are required');
    await api.post('/expenses', { ...form, amount: Number(form.amount) });
    setForm(emptyForm);
    setShowForm(false);
    loadExpenses();
    loadSummary();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.del(`/expenses/${id}`);
    loadExpenses();
    loadSummary();
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Expenses</h3>
        <button className="btn" onClick={() => setShowForm(true)}>+ Add Expense</button>
      </div>

      {summary && (
        <div className="row" style={{ gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ color: '#888', fontSize: 13 }}>Today's Expenses</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>₹{summary.today_total.toFixed(2)}</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ color: '#888', fontSize: 13 }}>This Month</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>₹{summary.month_total.toFixed(2)}</div>
          </div>
          <div className="card" style={{ flex: 2, minWidth: 240 }}>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>By Category (this month)</div>
            {summary.by_category.slice(0, 4).map(c => (
              <div key={c.category} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                <span>{c.category}</span><span>₹{c.total.toFixed(2)}</span>
              </div>
            ))}
            {summary.by_category.length === 0 && <p style={{ margin: 0, color: '#888' }}>No expenses yet</p>}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Add Expense</h4>
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Date</label>
              <input type="date" style={{ width: '100%' }} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Category</label>
              <select style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">-- select --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Amount ₹</label>
              <input type="number" style={{ width: '100%' }} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Payment Mode</label>
              <select style={{ width: '100%' }} value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Description</label>
            <input style={{ width: '100%' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="row">
            <button className="btn" onClick={save}>Save Expense</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h4 style={{ margin: 0 }}>All Expenses</h4>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} placeholder="Filter by date" />
          {filterDate && <button className="btn btn-secondary" onClick={() => setFilterDate('')}>Clear filter</button>}
        </div>
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Payment</th><th>Amount</th><th></th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td>{e.expense_date}</td>
                <td>{e.category}</td>
                <td>{e.description || '-'}</td>
                <td style={{ textTransform: 'capitalize' }}>{e.payment_mode}</td>
                <td>₹{e.amount.toFixed(2)}</td>
                <td><button className="btn btn-secondary" onClick={() => remove(e.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && <p>No expenses recorded{filterDate ? ' for this date' : ''}.</p>}
      </div>
    </div>
  );
}
