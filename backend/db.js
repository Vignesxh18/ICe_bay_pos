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

module.exports = db;
