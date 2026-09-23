const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'icecream-dev-secret-change-in-production';

// Permission map: what each role is allowed to do
const ROLE_PERMISSIONS = {
  owner: { maxDiscountPercent: 100, canManageUsers: true, canViewReports: true, canManagePurchases: true, canManageInventory: true, canManageExpenses: true, canCancelBills: true },
  manager: { maxDiscountPercent: 25, canManageUsers: false, canViewReports: true, canManagePurchases: true, canManageInventory: true, canManageExpenses: true, canCancelBills: true },
  cashier: { maxDiscountPercent: 10, canManageUsers: false, canViewReports: false, canManagePurchases: false, canManageInventory: false, canManageExpenses: false, canCancelBills: false }
};

function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
}

// Middleware: verifies the JWT and attaches req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = req.query.token;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Middleware factory: requires a specific permission flag to be true for the user's role
function requirePermission(flag) {
  return (req, res, next) => {
    const perms = permissionsFor(req.user.role);
    if (!perms[flag]) return res.status(403).json({ error: 'You do not have permission to do this' });
    next();
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role }, permissions: permissionsFor(user.role) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, permissions: permissionsFor(req.user.role) });
});

// User management - owner only
router.get('/users', requireAuth, requirePermission('canManageUsers'), (req, res) => {
  const users = db.prepare('SELECT id, username, role, is_active, created_at FROM users ORDER BY username').all();
  res.json(users);
});

router.post('/users', requireAuth, requirePermission('canManageUsers'), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, and role are required' });
  if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ error: 'Invalid role' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
    res.json({ id: result.lastInsertRowid, username, role });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

router.put('/users/:id/deactivate', requireAuth, requirePermission('canManageUsers'), (req, res) => {
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/audit-log', requireAuth, requirePermission('canViewReports'), (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all();
  res.json(rows);
});

module.exports = { router, requireAuth, requirePermission, permissionsFor };
