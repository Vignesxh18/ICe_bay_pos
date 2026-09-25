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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2B1B2E 0%, #3D2740 60%, #4A2E4D 100%)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <form onSubmit={submit} style={{
        width: 360,
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '36px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🍦</div>
          <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, color: '#2B1B2E' }}>Ice Cream Shop</h2>
          <p style={{ color: '#8A7268', fontSize: 13, marginTop: 4 }}>Sign in to your counter</p>
        </div>

        {error && (
          <div style={{ background: '#FFF0F3', color: '#E85677', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13.5, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label>Username</label>
          <input style={{ width: '100%', marginTop: 4 }} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label>Password</label>
          <input type="password" style={{ width: '100%', marginTop: 4 }} value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <button className="btn" type="submit" style={{ width: '100%', padding: '12px 18px', fontSize: 14.5 }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>

      </form>
    </div>
  );
}
