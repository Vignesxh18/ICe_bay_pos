const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'icecream.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

router.post('/create', (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `icecream-backup-${timestamp}.db`;
  const destPath = path.join(BACKUP_DIR, filename);

  try {
    fs.copyFileSync(DB_PATH, destPath);
    res.json({ success: true, filename, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

router.get('/list', (req, res) => {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size_kb: Math.round(stat.size / 1024), created_at: stat.mtime };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(files);
});

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(BACKUP_DIR, req.params.filename);
  if (!fs.existsSync(filePath) || !req.params.filename.endsWith('.db')) {
    return res.status(404).json({ error: 'Backup not found' });
  }
  res.download(filePath);
});

module.exports = router;
