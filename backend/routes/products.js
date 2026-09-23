const express = require('express');
const router = express.Router();
const db = require('../db');

// ---------- RAW MATERIALS ----------

router.get('/raw-materials', (req, res) => {
  const rows = db.prepare('SELECT * FROM raw_materials WHERE is_active = 1 ORDER BY category, name').all();
  res.json(rows);
});

router.get('/raw-materials/categories', (req, res) => {
  const rows = db.prepare(
    `SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*) AS count
     FROM raw_materials WHERE is_active = 1 GROUP BY category ORDER BY category`
  ).all();
  res.json(rows);
});

router.get('/raw-materials/low-stock', (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM raw_materials WHERE is_active = 1 AND current_stock <= reorder_level ORDER BY current_stock ASC`
  ).all();
  res.json(rows);
});

router.post('/raw-materials', (req, res) => {
  const {
    name, unit, category, reorder_level,
    purchase_unit, consumption_unit, purchase_price, transfer_price, reconciliation_price,
    tax_type, tax_percent, at_par_stock_level, closing_stock_frequency, allow_restock_level,
    barcode, hsn_code, is_expiry, allow_decimal_quantity, description, normal_loss_percent,
    opening_stock
  } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'name and unit are required' });

  const result = db.prepare(
    `INSERT INTO raw_materials
     (name, unit, category, current_stock, reorder_level,
      purchase_unit, consumption_unit, purchase_price, transfer_price, reconciliation_price,
      tax_type, tax_percent, at_par_stock_level, closing_stock_frequency, allow_restock_level,
      barcode, hsn_code, is_expiry, allow_decimal_quantity, description, normal_loss_percent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name, unit, category || 'Uncategorized', opening_stock || 0, reorder_level || 0,
    purchase_unit || unit, consumption_unit || unit, purchase_price || 0, transfer_price || 0, reconciliation_price || 0,
    tax_type || 'GST', tax_percent || 0, at_par_stock_level || 0, closing_stock_frequency || 'Daily', allow_restock_level ? 1 : 0,
    barcode || null, hsn_code || null, is_expiry || 'No', allow_decimal_quantity || 'Yes', description || null, normal_loss_percent || 0
  );
  const material = db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(result.lastInsertRowid);
  res.json(material);
});

router.put('/raw-materials/:id', (req, res) => {
  const {
    name, unit, category, reorder_level,
    purchase_unit, consumption_unit, purchase_price, transfer_price, reconciliation_price,
    tax_type, tax_percent, at_par_stock_level, closing_stock_frequency, allow_restock_level,
    barcode, hsn_code, is_expiry, allow_decimal_quantity, description, normal_loss_percent
  } = req.body;

  db.prepare(
    `UPDATE raw_materials SET
     name = ?, unit = ?, category = ?, reorder_level = ?,
     purchase_unit = ?, consumption_unit = ?, purchase_price = ?, transfer_price = ?, reconciliation_price = ?,
     tax_type = ?, tax_percent = ?, at_par_stock_level = ?, closing_stock_frequency = ?, allow_restock_level = ?,
     barcode = ?, hsn_code = ?, is_expiry = ?, allow_decimal_quantity = ?, description = ?, normal_loss_percent = ?
     WHERE id = ?`
  ).run(
    name, unit, category || 'Uncategorized', reorder_level,
    purchase_unit || unit, consumption_unit || unit, purchase_price || 0, transfer_price || 0, reconciliation_price || 0,
    tax_type || 'GST', tax_percent || 0, at_par_stock_level || 0, closing_stock_frequency || 'Daily', allow_restock_level ? 1 : 0,
    barcode || null, hsn_code || null, is_expiry || 'No', allow_decimal_quantity || 'Yes', description || null, normal_loss_percent || 0,
    req.params.id
  );
  res.json({ success: true });
});

router.delete('/raw-materials/:id', (req, res) => {
  db.prepare('UPDATE raw_materials SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- PRODUCTS + RECIPES ----------

router.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name').all();
  if (products.length === 0) return res.json([]);

  const recipeStmt = db.prepare(
    `SELECT r.product_id, r.raw_material_id, r.quantity_required, m.name AS raw_material_name, m.unit
     FROM recipes r JOIN raw_materials m ON m.id = r.raw_material_id
     WHERE r.product_id = ?`
  );

  const withRecipes = products.map(p => ({ ...p, recipe: recipeStmt.all(p.id) }));
  res.json(withRecipes);
});

router.post('/products', (req, res) => {
  const { name, category, selling_price, output_qty, recipe } = req.body;
  if (!name || selling_price == null) {
    return res.status(400).json({ error: 'name and selling_price are required' });
  }

  const insertProduct = db.prepare(
    'INSERT INTO products (name, category, selling_price, output_qty) VALUES (?, ?, ?, ?)'
  );
  const insertRecipe = db.prepare(
    'INSERT INTO recipes (product_id, raw_material_id, quantity_required) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    const result = insertProduct.run(name, category || null, selling_price, output_qty || 1);
    const productId = result.lastInsertRowid;
    if (Array.isArray(recipe)) {
      for (const r of recipe) {
        if (r.raw_material_id && r.quantity_required) {
          insertRecipe.run(productId, r.raw_material_id, r.quantity_required);
        }
      }
    }
    return productId;
  });

  const productId = tx();
  res.json({ id: productId, name, category, selling_price, output_qty: output_qty || 1 });
});

router.put('/products/:id', (req, res) => {
  const { name, category, selling_price, output_qty, recipe } = req.body;
  const productId = req.params.id;

  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET name = ?, category = ?, selling_price = ?, output_qty = ? WHERE id = ?')
      .run(name, category, selling_price, output_qty, productId);
    db.prepare('DELETE FROM recipes WHERE product_id = ?').run(productId);
    if (Array.isArray(recipe)) {
      const insertRecipe = db.prepare(
        'INSERT INTO recipes (product_id, raw_material_id, quantity_required) VALUES (?, ?, ?)'
      );
      for (const r of recipe) {
        if (r.raw_material_id && r.quantity_required) {
          insertRecipe.run(productId, r.raw_material_id, r.quantity_required);
        }
      }
    }
  });

  tx();
  res.json({ success: true });
});

router.delete('/products/:id', (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/products/:id/cost', (req, res) => {
  const product = db.prepare('SELECT selling_price, output_qty FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const rows = db.prepare(
    `SELECT r.quantity_required, r.raw_material_id,
            (SELECT rate FROM purchase_items pi WHERE pi.raw_material_id = r.raw_material_id ORDER BY pi.id DESC LIMIT 1) AS last_rate
     FROM recipes r WHERE r.product_id = ?`
  ).all(req.params.id);

  const batchCost = rows.reduce((sum, r) => sum + (r.quantity_required * (r.last_rate || 0)), 0);
  const outputQty = product.output_qty || 1;
  const costPerUnit = batchCost / outputQty;

  res.json({
    batch_cost: batchCost,
    output_qty: outputQty,
    cost_per_unit: costPerUnit,
    selling_price: product.selling_price,
    gross_profit_per_unit: product.selling_price - costPerUnit
  });
});

module.exports = router;
