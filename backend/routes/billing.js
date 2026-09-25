const express = require('express');
const router = express.Router();
const db = require('../db');
const { permissionsFor } = require('./auth');

function nextBillNo() {
  const row = db.prepare('SELECT bill_no FROM bills ORDER BY id DESC LIMIT 1').get();
  if (!row) return 'ICS-000001';
  const lastNum = parseInt(row.bill_no.split('-')[1], 10);
  return 'ICS-' + String(lastNum + 1).padStart(6, '0');
}

function getCostPerUnit(productId) {
  const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(productId);
  const outputQty = (product && product.output_qty) || 1;
  const rows = db.prepare(
    `SELECT r.quantity_required,
            (SELECT rate FROM purchase_items pi WHERE pi.raw_material_id = r.raw_material_id ORDER BY pi.id DESC LIMIT 1) AS last_rate
     FROM recipes r WHERE r.product_id = ?`
  ).all(productId);
  const batchCost = rows.reduce((sum, r) => sum + (r.quantity_required * (r.last_rate || 0)), 0);
  return batchCost / outputQty;
}

function deductStockForProduct(productId, quantitySold, warnings) {
  const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  const outputQty = product.output_qty || 1;
  const batchFraction = quantitySold / outputQty;

  const recipeRows = db.prepare(
    `SELECT r.raw_material_id, r.quantity_required, m.name, m.current_stock, m.unit
     FROM recipes r JOIN raw_materials m ON m.id = r.raw_material_id WHERE r.product_id = ?`
  ).all(productId);
  const bumpStock = db.prepare('UPDATE raw_materials SET current_stock = current_stock - ? WHERE id = ?');
  for (const r of recipeRows) {
    const needed = r.quantity_required * batchFraction;
    if (needed > r.current_stock && warnings) {
      warnings.push(`${r.name}: only ${r.current_stock}${r.unit} left, this sale needs ${needed.toFixed(2)}${r.unit} (stock will go negative)`);
    }
    bumpStock.run(needed, r.raw_material_id);
  }
}

function restoreStockForProduct(productId, quantitySold) {
  const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(productId);
  const outputQty = (product && product.output_qty) || 1;
  const batchFraction = quantitySold / outputQty;
  const recipeRows = db.prepare('SELECT raw_material_id, quantity_required FROM recipes WHERE product_id = ?').all(productId);
  const bumpStock = db.prepare('UPDATE raw_materials SET current_stock = current_stock + ? WHERE id = ?');
  for (const r of recipeRows) {
    bumpStock.run(r.quantity_required * batchFraction, r.raw_material_id);
  }
}

// ---------- CREATE BILL ----------
// payment_mode: single mode string (e.g. "cash"), OR
// payments: [{ mode, amount }] for a split payment - if provided, payment_mode is derived as the largest share
router.post('/', (req, res) => {
  const { discount, lines } = req.body;
  let { payment_mode, payments } = req.body;

  if (Array.isArray(payments) && payments.length > 0) {
    // Derive a primary mode (largest amount) for legacy single-mode reporting fields
    const sorted = [...payments].sort((a, b) => b.amount - a.amount);
    payment_mode = sorted[0].mode;
  }

  if (!payment_mode || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'payment_mode (or payments) and at least one line item are required' });
  }

  try {
    const stockWarnings = [];
    const tx = db.transaction(() => {
      const expandedLines = [];

      for (const line of lines) {
        if (line.combo_id) {
          const combo = db.prepare('SELECT * FROM combos WHERE id = ?').get(line.combo_id);
          if (!combo) throw new Error(`Combo ${line.combo_id} not found`);
          const comboItems = db.prepare('SELECT * FROM combo_items WHERE combo_id = ?').all(line.combo_id);
          const comboQty = line.quantity || 1;
          const paidCount = comboItems.filter(x => !x.is_free).length || 1;

          for (const ci of comboItems) {
            expandedLines.push({
              product_id: ci.product_id,
              quantity: ci.quantity * comboQty,
              is_free: !!ci.is_free,
              combo_id: line.combo_id,
              combo_price_share: ci.is_free ? 0 : (combo.price / paidCount) * comboQty
            });
          }
        } else {
          const product = db.prepare('SELECT selling_price FROM products WHERE id = ?').get(line.product_id);
          if (!product) throw new Error(`Product ${line.product_id} not found`);
          const lineDiscount = line.discount || 0;
          const original = product.selling_price * line.quantity;
          expandedLines.push({
            product_id: line.product_id,
            quantity: line.quantity,
            is_free: false,
            combo_id: null,
            price: original - lineDiscount,
            original_price: original
          });
        }
      }

      let subtotal = 0;
      let undiscountedSubtotal = 0;
      const billItemsToInsert = [];

      for (const line of expandedLines) {
        deductStockForProduct(line.product_id, line.quantity, stockWarnings);
        const costPerUnit = getCostPerUnit(line.product_id);
        const lineCost = costPerUnit * line.quantity;
        const linePrice = line.is_free ? 0 : (line.price != null ? line.price : line.combo_price_share);
        subtotal += linePrice;
        undiscountedSubtotal += line.original_price != null ? line.original_price : linePrice;

        billItemsToInsert.push({
          product_id: line.product_id,
          combo_id: line.combo_id,
          quantity: line.quantity,
          price: linePrice,
          is_free: line.is_free ? 1 : 0,
          cost_price: lineCost
        });
      }

      const discountAmount = discount || 0;
      const totalAmount = subtotal - discountAmount;

      // Enforce the logged-in user's discount limit (percent of the undiscounted total)
      const totalDiscountGiven = (undiscountedSubtotal - subtotal) + discountAmount;
      const perms = permissionsFor(req.user.role);
      const maxAllowedDiscount = undiscountedSubtotal * (perms.maxDiscountPercent / 100);
      if (totalDiscountGiven > maxAllowedDiscount + 0.01) {
        throw new Error(`Discount exceeds your limit (max ${perms.maxDiscountPercent}% for ${req.user.role})`);
      }

      const billNo = nextBillNo();

      const billResult = db.prepare(
        `INSERT INTO bills (bill_no, subtotal, discount, total_amount, payment_mode, status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      ).run(billNo, subtotal, discountAmount, totalAmount, payment_mode);
      const billId = billResult.lastInsertRowid;

      const insertItem = db.prepare(
        `INSERT INTO bill_items (bill_id, product_id, combo_id, quantity, price, is_free, cost_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const item of billItemsToInsert) {
        insertItem.run(billId, item.product_id, item.combo_id, item.quantity, item.price, item.is_free, item.cost_price);
      }

      return { billId, billNo, subtotal, discountAmount, totalAmount };
    });

    const { billId, billNo, subtotal, discountAmount, totalAmount } = tx();

    if (Array.isArray(payments) && payments.length > 0) {
      const insertPayment = db.prepare('INSERT INTO bill_payments (bill_id, mode, amount) VALUES (?, ?, ?)');
      for (const p of payments) insertPayment.run(billId, p.mode, p.amount);
    }

    if (discountAmount > 0) {
      db.prepare('INSERT INTO audit_log (user_id, username, action, reference, amount, reason) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.user.id, req.user.username, 'Discount Applied', billNo, discountAmount, req.body.discount_reason || null);
    }

    const items = db.prepare(
      `SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
    ).all(billId);
    const billPayments = db.prepare('SELECT mode, amount FROM bill_payments WHERE bill_id = ?').all(billId);

    res.json({ id: billId, bill_no: billNo, subtotal, discount: discountAmount, total_amount: totalAmount, payment_mode, payments: billPayments, items, stock_warnings: stockWarnings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create bill' });
  }
});

router.post('/:id/cancel', (req, res) => {
  const perms = permissionsFor(req.user.role);
  if (!perms.canCancelBills) return res.status(403).json({ error: 'You do not have permission to cancel bills' });
  if (!req.body.reason || !req.body.reason.trim()) return res.status(400).json({ error: 'A reason is required to cancel a bill' });

  try {
    const tx = db.transaction(() => {
      const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
      if (!bill) throw new Error('Bill not found');
      if (bill.status === 'cancelled') throw new Error('Bill already cancelled');

      const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(req.params.id);
      for (const item of items) {
        restoreStockForProduct(item.product_id, item.quantity);
      }
      db.prepare("UPDATE bills SET status = 'cancelled' WHERE id = ?").run(req.params.id);
      return bill;
    });
    const bill = tx();

    db.prepare('INSERT INTO audit_log (user_id, username, action, reference, amount, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, req.user.username, 'Bill Cancelled', bill.bill_no, bill.total_amount, req.body.reason || null);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to cancel bill' });
  }
});

router.get('/:id', (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  const items = db.prepare(
    `SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
  ).all(req.params.id);
  const returns = db.prepare('SELECT * FROM sale_returns WHERE bill_id = ?').all(req.params.id);
  const payments = db.prepare('SELECT mode, amount FROM bill_payments WHERE bill_id = ?').all(req.params.id);

  let cancelInfo = {};
  if (bill.status === 'cancelled') {
    const row = db.prepare(
      `SELECT reason, username, created_at FROM audit_log WHERE action = 'Bill Cancelled' AND reference = ? ORDER BY id DESC LIMIT 1`
    ).get(bill.bill_no);
    if (row) cancelInfo = { cancel_reason: row.reason, cancelled_by: row.username, cancelled_at: row.created_at };
  }

  res.json({ ...bill, items, returns, payments, ...cancelInfo });
});

// ---------- PARTIAL REFUND (bill stays active, specific item quantity refunded) ----------
// body: { items: [{ bill_item_id, quantity }], reason }
router.post('/:id/refund', (req, res) => {
  const perms = permissionsFor(req.user.role);
  if (!perms.canCancelBills) return res.status(403).json({ error: 'You do not have permission to process refunds' });

  const { items, reason } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item to refund is required' });
  }

  try {
    const totalRefund = { amount: 0 };

    const tx = db.transaction(() => {
      const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
      if (!bill) throw new Error('Bill not found');
      if (bill.status === 'cancelled') throw new Error('Cannot refund a cancelled bill');

      for (const refundItem of items) {
        const billItem = db.prepare('SELECT * FROM bill_items WHERE id = ? AND bill_id = ?').get(refundItem.bill_item_id, req.params.id);
        if (!billItem) throw new Error(`Bill item ${refundItem.bill_item_id} not found on this bill`);
        if (refundItem.quantity > billItem.quantity) throw new Error(`Cannot refund more than was sold (${billItem.quantity})`);

        const alreadyRefunded = db.prepare(
          'SELECT COALESCE(SUM(quantity), 0) AS total FROM sale_returns WHERE bill_item_id = ?'
        ).get(billItem.id).total;
        if (alreadyRefunded + refundItem.quantity > billItem.quantity) {
          throw new Error(`Refund would exceed quantity sold for this item`);
        }

        // Restore stock proportionally via the product's recipe
        const product = db.prepare('SELECT output_qty FROM products WHERE id = ?').get(billItem.product_id);
        const outputQty = (product && product.output_qty) || 1;
        const batchFraction = refundItem.quantity / outputQty;
        const recipeRows = db.prepare('SELECT raw_material_id, quantity_required FROM recipes WHERE product_id = ?').all(billItem.product_id);
        for (const r of recipeRows) {
          db.prepare('UPDATE raw_materials SET current_stock = current_stock + ? WHERE id = ?')
            .run(r.quantity_required * batchFraction, r.raw_material_id);
        }

        // Refund amount is proportional to the price paid for this line
        const unitPrice = billItem.quantity > 0 ? billItem.price / billItem.quantity : 0;
        const refundAmount = unitPrice * refundItem.quantity;
        totalRefund.amount += refundAmount;

        db.prepare(
          `INSERT INTO sale_returns (bill_id, bill_item_id, product_id, quantity, refund_amount, reason, return_date, user_id, username)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          req.params.id, billItem.id, billItem.product_id, refundItem.quantity, refundAmount,
          reason || null, new Date().toISOString().slice(0, 10), req.user.id, req.user.username
        );
      }
    });

    tx();

    db.prepare('INSERT INTO audit_log (user_id, username, action, reference, amount, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, req.user.username, 'Sale Refund', `Bill #${req.params.id}`, totalRefund.amount, reason || null);

    res.json({ success: true, refund_amount: totalRefund.amount });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to process refund' });
  }
});

// Printable receipt - narrow thermal-printer-style layout, opens in new tab
router.get('/:id/receipt', (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).send('Bill not found');

  const items = db.prepare(
    `SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
  ).all(req.params.id);

  const billPayments = db.prepare('SELECT mode, amount FROM bill_payments WHERE bill_id = ?').all(req.params.id);

  const settingsRows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const r of settingsRows) settings[r.key] = r.value;

  // Paper width: query param overrides saved setting; defaults to 80mm.
  // Once you know the printer's actual paper size, set it once in Settings
  // (key: receipt_paper_width, value: "58" or "80") and every receipt uses it.
  const paperWidthMm = req.query.width || settings.receipt_paper_width || '80';
  const screenPreviewPx = paperWidthMm === '58' ? 220 : 300;

  res.send(`
    <html>
    <head>
      <title>Receipt - ${bill.bill_no}</title>
      <style>
        @page { size: ${paperWidthMm}mm auto; margin: 0; }
        * { box-sizing: border-box; }

        body {
          font-family: -apple-system, 'Segoe UI', sans-serif;
          background: #EDEDED;
          margin: 0;
          padding: 30px 12px;
          display: flex;
          justify-content: center;
        }

        .receipt {
          font-family: 'Courier New', monospace;
          width: ${screenPreviewPx}px;
          background: #fff;
          padding: 20px 18px;
          font-size: 13px;
          line-height: 1.5;
          color: #111;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border-radius: 4px;
        }

        .shop-name { text-align: center; font-size: 16px; font-weight: 800; margin: 0 0 2px; letter-spacing: 0.02em; }
        .shop-meta { text-align: center; font-size: 11.5px; color: #444; margin: 1px 0; }
        .bill-meta { text-align: center; font-size: 11.5px; margin-top: 8px; color: #333; }

        .divider { border: none; border-top: 1px dashed #999; margin: 10px 0; }
        .divider.solid { border-top: 1.5px solid #111; }

        table { width: 100%; border-collapse: collapse; }
        .item-row td { padding: 3px 0; vertical-align: top; font-size: 12.5px; }
        .item-name { width: 55%; }
        .item-qty { width: 15%; text-align: center; color: #555; }
        .item-price { width: 30%; text-align: right; font-weight: 600; }

        .totals-row td { padding: 3px 0; font-size: 12.5px; }
        .totals-label { color: #444; }
        .totals-value { text-align: right; }
        .grand-total td { padding-top: 8px; font-size: 16px; font-weight: 800; }

        .footer { text-align: center; margin-top: 14px; font-size: 12px; font-style: italic; color: #333; }

        .print-btn {
          display: block;
          width: 100%;
          margin-top: 20px;
          padding: 11px;
          border: none;
          border-radius: 8px;
          background: #7B61FF;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        @media print {
          body { background: #fff; padding: 0; display: block; }
          .receipt { box-shadow: none; border-radius: 0; width: 100%; padding: 4mm; }
          .print-btn { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="shop-name">🍦 ${settings.shop_name || 'Ice Cream Shop'}</div>
        ${settings.shop_address ? `<div class="shop-meta">${settings.shop_address}</div>` : ''}
        ${settings.shop_phone ? `<div class="shop-meta">Ph: ${settings.shop_phone}</div>` : ''}
        ${settings.shop_gst ? `<div class="shop-meta">GSTIN: ${settings.shop_gst}</div>` : ''}

        <div class="bill-meta">${bill.bill_no} &nbsp;·&nbsp; ${bill.bill_date}</div>

        <hr class="divider solid"/>

        <table>
          ${items.map(i => `
            <tr class="item-row">
              <td class="item-name">${i.product_name}${i.is_free ? ' <b>(FREE)</b>' : ''}</td>
              <td class="item-qty">x${i.quantity}</td>
              <td class="item-price">₹${i.price.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>

        <hr class="divider"/>

        <table>
          <tr class="totals-row"><td class="totals-label">Subtotal</td><td class="totals-value">₹${bill.subtotal.toFixed(2)}</td></tr>
          ${bill.discount > 0 ? `<tr class="totals-row"><td class="totals-label">Discount</td><td class="totals-value">-₹${bill.discount.toFixed(2)}</td></tr>` : ''}
          <tr class="grand-total"><td>Total</td><td class="totals-value">₹${bill.total_amount.toFixed(2)}</td></tr>
        </table>

        <hr class="divider"/>

        <table>
          ${billPayments.length > 0
            ? billPayments.map(p => `<tr class="totals-row"><td class="totals-label">${p.mode.toUpperCase()}</td><td class="totals-value">₹${p.amount.toFixed(2)}</td></tr>`).join('')
            : `<tr class="totals-row"><td class="totals-label">Payment</td><td class="totals-value">${bill.payment_mode.toUpperCase()}</td></tr>`}
        </table>

        <hr class="divider solid"/>

        <div class="footer">${settings.receipt_footer || 'Thank you, visit again!'}</div>

        <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
      </div>

      <script>
        // Auto-open the print dialog so the counter doesn't need an extra click.
        // The manual Print button above still works if the popup gets blocked
        // or the print dialog is dismissed by mistake.
        window.onload = function() {
          setTimeout(function() { window.print(); }, 200);
        };
      </script>
    </body>
    </html>
  `);
});

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(
    `SELECT * FROM bills WHERE date(bill_date) = ? ORDER BY bill_date DESC`
  ).all(date);

  const itemsStmt = db.prepare(
    `SELECT bi.quantity, p.name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = ?`
  );
  const cancelReasonStmt = db.prepare(
    `SELECT reason, username, created_at FROM audit_log WHERE action = 'Bill Cancelled' AND reference = ? ORDER BY id DESC LIMIT 1`
  );
  for (const bill of rows) {
    const items = itemsStmt.all(bill.id);
    bill.item_summary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
    if (bill.status === 'cancelled') {
      const cancelInfo = cancelReasonStmt.get(bill.bill_no);
      if (cancelInfo) {
        bill.cancel_reason = cancelInfo.reason;
        bill.cancelled_by = cancelInfo.username;
        bill.cancelled_at = cancelInfo.created_at;
      }
    }
  }

  const activeRows = rows.filter(b => b.status === 'active');
  const totalSales = activeRows.reduce((s, b) => s + b.total_amount, 0);
  res.json({ date, bills: rows, total_sales: totalSales, bill_count: activeRows.length });
});

module.exports = router;
