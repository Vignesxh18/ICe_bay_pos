const BASE = '/api';

function getToken() {
  return localStorage.getItem('icecream_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  if (res.status === 401) {
    localStorage.removeItem('icecream_token');
    localStorage.removeItem('icecream_user');
    window.location.reload();
    throw new Error('Session expired, please log in again');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' })
};

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('icecream_token', data.token);
  localStorage.setItem('icecream_user', JSON.stringify({ ...data.user, permissions: data.permissions }));
  return data;
}

export function logout() {
  localStorage.removeItem('icecream_token');
  localStorage.removeItem('icecream_user');
  window.location.reload();
}

export function getCurrentUser() {
  const raw = localStorage.getItem('icecream_user');
  return raw ? JSON.parse(raw) : null;
}

export async function uploadFile(path, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}
