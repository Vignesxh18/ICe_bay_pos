const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'icecream.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations: add columns that were introduced after the initial schema
const migrations = [
  "ALTER TABLE raw_materials ADD COLUMN category TEXT DEFAULT 'Uncategorized'",
  "ALTER TABLE raw_materials ADD COLUMN purchase_unit TEXT",
  "ALTER TABLE raw_materials ADD COLUMN consumption_unit TEXT",
  "ALTER TABLE raw_materials ADD COLUMN purchase_price REAL DEFAULT 0",
  "ALTER TABLE raw_materials ADD COLUMN transfer_price REAL DEFAULT 0",
  "ALTER TABLE raw_materials ADD COLUMN reconciliation_price REAL DEFAULT 0",
  "ALTER TABLE raw_materials ADD COLUMN tax_type TEXT DEFAULT 'GST'",
  "ALTER TABLE raw_materials ADD COLUMN tax_percent REAL DEFAULT 0",
  "ALTER TABLE raw_materials ADD COLUMN at_par_stock_level REAL DEFAULT 0",
  "ALTER TABLE raw_materials ADD COLUMN closing_stock_frequency TEXT DEFAULT 'Daily'",
  "ALTER TABLE raw_materials ADD COLUMN allow_restock_level INTEGER DEFAULT 0",
  "ALTER TABLE raw_materials ADD COLUMN barcode TEXT",
  "ALTER TABLE raw_materials ADD COLUMN hsn_code TEXT",
  "ALTER TABLE raw_materials ADD COLUMN is_expiry TEXT DEFAULT 'No'",
  "ALTER TABLE raw_materials ADD COLUMN allow_decimal_quantity TEXT DEFAULT 'Yes'",
  "ALTER TABLE raw_materials ADD COLUMN description TEXT",
  "ALTER TABLE raw_materials ADD COLUMN normal_loss_percent REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN opening_cash REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN cash_sales REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN upi_sales REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN card_sales REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN cash_expenses REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN expected_cash REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN actual_cash REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN cash_difference REAL DEFAULT 0",
  "ALTER TABLE daily_closing ADD COLUMN total_bills INTEGER DEFAULT 0",
  "ALTER TABLE combos ADD COLUMN start_date TEXT",
  "ALTER TABLE combos ADD COLUMN end_date TEXT",
  "ALTER TABLE suppliers ADD COLUMN company TEXT",
  "ALTER TABLE suppliers ADD COLUMN email TEXT",
  "ALTER TABLE suppliers ADD COLUMN registered_under_gst TEXT DEFAULT 'No'",
  "ALTER TABLE suppliers ADD COLUMN gst_no TEXT",
  "ALTER TABLE suppliers ADD COLUMN register_address TEXT",
  "ALTER TABLE suppliers ADD COLUMN state TEXT",
  "ALTER TABLE suppliers ADD COLUMN city TEXT",
  "ALTER TABLE suppliers ADD COLUMN pincode TEXT",
  "ALTER TABLE suppliers ADD COLUMN fssai_lic_no TEXT",
  "ALTER TABLE suppliers ADD COLUMN pan TEXT",
  "ALTER TABLE suppliers ADD COLUMN msme_number TEXT",
  "ALTER TABLE suppliers ADD COLUMN type TEXT DEFAULT 'Both'",
  "ALTER TABLE suppliers ADD COLUMN status TEXT DEFAULT 'Active'"
];
for (const m of migrations) {
  try { db.exec(m); } catch (e) { /* column already exists, ignore */ }
}

// New tables: users (login + roles) and audit_log (discount/cancel tracking)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    reference TEXT,
    amount REAL,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed a default owner account if no users exist yet
const bcrypt = require('bcryptjs');
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('owner123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('owner', hash, 'owner');
  console.log('Created default owner account — username: owner, password: owner123 (change this!)');
}

module.exports = db;
