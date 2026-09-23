import React, { useState } from 'react';
import { login } from '../api';

export default function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8' }}>
      <form onSubmit={submit} className="card" style={{ width: 320 }}>
        <h2 style={{ textAlign: 'center', marginTop: 0 }}>🍦 Ice Cream Shop</h2>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <label>Username</label>
          <input style={{ width: '100%', marginTop: 4 }} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input type="password" style={{ width: '100%', marginTop: 4 }} value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="btn" type="submit" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
          Default: owner / owner123
        </p>
      </form>
    </div>
  );
}
