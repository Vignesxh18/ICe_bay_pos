const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function parseInvoiceText(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  // For the item table, strip newlines entirely (no space) since pdf-parse splits
  // single numbers like "87.62" + "15" across lines with no separator
  const itemsText = text.replace(/\n/g, '');

  // Supplier name: the line right after "Tax Invoice" and before the GSTIN line, best-effort
  let supplierName = null;
  const supplierMatch = normalized.match(/Tax Invoice\s+([A-Z0-9][A-Za-z0-9 .,'&-]{2,60}?)\s+(?:GROUND|[\dA-Z].*?(?:Road|Salai|Street|Nagar|,))/);
  if (supplierMatch) supplierName = supplierMatch[1].trim();

  // Invoice number
  let invoiceNo = null;
  const invMatch = normalized.match(/Invoice No\.?:?\s*([A-Za-z0-9/-]+)/i);
  if (invMatch) invoiceNo = invMatch[1];

  // Date (formats like 18-Sep-26 or 18-Sep-2026)
  let invoiceDate = null;
  const dateMatch = normalized.match(/Dated:?\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})/i);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed)) invoiceDate = parsed.toISOString().slice(0, 10);
  }

  // Grand total - appears as "Total<currency symbol> 14,531.30615 Pcs" (amount then qty run together)
  let grandTotal = null;
  const totalMatch = normalized.match(/Total[^\d]*([\d,]+\.\d{2})/);
  if (totalMatch) grandTotal = parseFloat(totalMatch[1].replace(/,/g, ''));

  // Line items - actual column order in extracted text is:
  // SrNo, Description, Amount, Unit, Rate, Quantity, Unit, GST%
  // Numbers run together with no separator, so rate/qty split relies on rate always
  // having exactly 2 decimal places (e.g. "87.6215" = rate 87.62 + qty 15)
  const items = [];
  const unitAlt = '(?:Pcs|pcs|Kg|kg|g|ml|l|L|Ltr|ltr)';
  const itemRegex = new RegExp(
    `(\\d+)([A-Za-z][A-Za-z0-9 .'&-]*?)([\\d,]+\\.\\d{2})\\s*${unitAlt}(\\d+\\.\\d{2})(\\d+(?:\\.\\d+)?)\\s*${unitAlt}(\\d+(?:\\.\\d+)?)\\s*%`,
    'g'
  );

  let match;
  while ((match = itemRegex.exec(itemsText)) !== null) {
    items.push({
      sr_no: match[1],
      description: match[2].trim(),
      amount: parseFloat(match[3].replace(/,/g, '')),
      rate: parseFloat(match[4]),
      quantity: parseFloat(match[5]),
      gst_percent: parseFloat(match[6]),
      unit: 'pcs' // most supplier invoices for this shop are per-piece; adjust manually if needed
    });
  }

  return { supplierName, invoiceNo, invoiceDate, grandTotal, items };
}

function findMatchingMaterial(description, materials) {
  const desc = description.toLowerCase().trim();
  // Exact match only - a partial/substring match is too risky (e.g. "Oreo Milk Popsicle"
  // would wrongly match a raw material simply called "Milk"). Better to create a new
  // item than silently merge two different things.
  return materials.find(m => m.name.toLowerCase().trim() === desc) || null;
}

function findMatchingSupplier(name, suppliers) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return suppliers.find(s => s.name.toLowerCase().trim() === n || s.company?.toLowerCase().trim() === n) || null;
}

router.post('/parse-invoice', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const pdfData = await pdfParse(req.file.buffer);
    const parsed = parseInvoiceText(pdfData.text);

    const materials = db.prepare('SELECT * FROM raw_materials WHERE is_active = 1').all();
    const suppliers = db.prepare('SELECT * FROM suppliers').all();

    const matchedSupplier = findMatchingSupplier(parsed.supplierName, suppliers);

    const itemsWithMatches = parsed.items.map(item => {
      const matched = findMatchingMaterial(item.description, materials);
      return {
        ...item,
        matched_raw_material_id: matched ? matched.id : null,
        matched_raw_material_name: matched ? matched.name : null
      };
    });

    res.json({
      supplier_name: parsed.supplierName,
      matched_supplier_id: matchedSupplier ? matchedSupplier.id : null,
      invoice_no: parsed.invoiceNo,
      invoice_date: parsed.invoiceDate,
      grand_total: parsed.grandTotal,
      items: itemsWithMatches,
      raw_text_preview: pdfData.text.slice(0, 500)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

module.exports = router;
