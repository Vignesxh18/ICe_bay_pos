import React, { useEffect, useMemo, useState } from 'react';
import { api, uploadFile } from '../api';

const UNIT_MAP = {
  pcs: 'pcs',
  kg: 'kg',
  g: 'g',
  ml: 'ml',
  l: 'l',
  ltr: 'l',
};

const today = new Date().toISOString().slice(0, 10);

const emptyItem = {
  raw_material_id: '',
  quantity: '',
  rate: '',
  tax_percent: '',
};

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [newSupplier, setNewSupplier] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');

  const [items, setItems] = useState([
    { ...emptyItem },
  ]);

  const [isPaid, setIsPaid] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');

  const [parsing, setParsing] = useState(false);
  const [parsedNotice, setParsedNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');

  const loadSuppliers = () =>
    api
      .get('/purchases/suppliers')
      .then(setSuppliers)
      .catch(() => setSuppliers([]));

  const loadMaterials = () =>
    api
      .get('/raw-materials')
      .then(setMaterials)
      .catch(() => setMaterials([]));

  const loadPurchases = () =>
    api
      .get('/purchases')
      .then(setPurchases)
      .catch(() => setPurchases([]));

  useEffect(() => {
    loadSuppliers();
    loadMaterials();
    loadPurchases();
  }, []);

  /* =====================================================
     SUPPLIER
     ===================================================== */

  const addSupplier = async () => {
    if (!newSupplier.trim()) {
      alert('Enter supplier name');
      return;
    }

    try {
      const s = await api.post(
        '/purchases/suppliers',
        {
          name: newSupplier.trim(),
        }
      );

      setNewSupplier('');
      await loadSuppliers();
      setSupplierId(String(s.id));
    } catch (err) {
      alert(err.message);
    }
  };

  /* =====================================================
     ITEMS
     ===================================================== */

  const updateItem = (
    index,
    field,
    value
  ) => {
    setItems((list) =>
      list.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItemLine = () => {
    setItems((list) => [
      ...list,
      { ...emptyItem },
    ]);
  };

  const removeItemLine = (index) => {
    setItems((list) => {
      if (list.length === 1) {
        return [{ ...emptyItem }];
      }

      return list.filter(
        (_, i) => i !== index
      );
    });
  };

  const materialUnit = (id) =>
    materials.find(
      (m) => String(m.id) === String(id)
    )?.unit || '';

  /* =====================================================
     CALCULATIONS
     ===================================================== */

  const lineBase = (item) =>
    (Number(item.quantity) || 0) *
    (Number(item.rate) || 0);

  const lineTax = (item) =>
    lineBase(item) *
    ((Number(item.tax_percent) || 0) /
      100);

  const lineAmount = (item) =>
    lineBase(item) + lineTax(item);

  const subTotal = items.reduce(
    (sum, item) =>
      sum + lineBase(item),
    0
  );

  const totalTax = items.reduce(
    (sum, item) =>
      sum + lineTax(item),
    0
  );

  const grandTotal =
    subTotal + totalTax;

  /* =====================================================
     FORM RESET
     ===================================================== */

  const resetForm = () => {
    setItems([{ ...emptyItem }]);
    setInvoiceNo('');
    setInvoiceDate(today);
    setSupplierId('');
    setNewSupplier('');
    setIsPaid(false);
    setPaymentMode('cash');
    setParsedNotice(null);
  };

  /* =====================================================
     SAVE PURCHASE
     ===================================================== */

  const savePurchase = async () => {
    if (!supplierId) {
      alert('Choose or add a supplier');
      return;
    }

    const validItems = items
      .filter(
        (item) =>
          item.raw_material_id &&
          item.quantity &&
          item.rate
      )
      .map((item) => ({
        raw_material_id:
          Number(item.raw_material_id),
        quantity:
          Number(item.quantity),
        rate:
          Number(item.rate),
        tax_percent:
          Number(item.tax_percent) || 0,
      }));

    if (validItems.length === 0) {
      alert(
        'Add at least one purchase item'
      );
      return;
    }

    setSaving(true);

    try {
      await api.post('/purchases', {
        supplier_id:
          Number(supplierId),
        invoice_no:
          invoiceNo || null,
        purchase_date:
          invoiceDate,
        paid_amount:
          isPaid ? grandTotal : 0,
        payment_mode:
          isPaid
            ? paymentMode
            : 'pending',
        items: validItems,
      });

      resetForm();

      await loadPurchases();
      await loadMaterials();

      alert(
        'Purchase recorded successfully. Stock updated.'
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     PDF INVOICE
     ===================================================== */

  const handlePdfUpload = async (event) => {
    const file =
      event.target.files[0];

    if (!file) return;

    setParsing(true);
    setParsedNotice(null);

    try {
      const result =
        await uploadFile(
          '/invoice-parser/parse-invoice',
          file
        );

      let resolvedSupplierId =
        result.matched_supplier_id;

      if (
        !resolvedSupplierId &&
        result.supplier_name
      ) {
        const newSup =
          await api.post(
            '/purchases/suppliers',
            {
              name:
                result.supplier_name,
            }
          );

        resolvedSupplierId =
          newSup.id;

        loadSuppliers();
      }

      if (resolvedSupplierId) {
        setSupplierId(
          String(resolvedSupplierId)
        );
      }

      if (result.invoice_no) {
        setInvoiceNo(
          result.invoice_no
        );
      }

      if (result.invoice_date) {
        setInvoiceDate(
          result.invoice_date
        );
      }

      const resolvedItems = [];
      let createdCount = 0;

      for (const item of result.items) {
        let materialId =
          item.matched_raw_material_id;

        if (!materialId) {
          const unit =
            UNIT_MAP[item.unit] ||
            'pcs';

          const created =
            await api.post(
              '/raw-materials',
              {
                name:
                  item.description,
                unit,
                category:
                  'Uncategorized',
              }
            );

          materialId =
            created.id;

          createdCount++;
        }

        resolvedItems.push({
          raw_material_id:
            String(materialId),
          quantity:
            String(item.quantity),
          rate:
            String(item.rate),
          tax_percent:
            String(
              item.gst_percent || 0
            ),
        });
      }

      setItems(
        resolvedItems.length > 0
          ? resolvedItems
          : [{ ...emptyItem }]
      );

      loadMaterials();

      setParsedNotice({
        itemCount:
          result.items.length,
        createdCount,
        grandTotal:
          result.grand_total,
        supplierName:
          result.supplier_name,
      });
    } catch (err) {
      alert(
        'Could not parse this PDF: ' +
          err.message
      );
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  /* =====================================================
     PURCHASE HISTORY
     ===================================================== */

  const filteredPurchases =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return purchases;
      }

      return purchases.filter(
        (purchase) =>
          String(
            purchase.supplier_name ||
              ''
          )
            .toLowerCase()
            .includes(term) ||
          String(
            purchase.invoice_no || ''
          )
            .toLowerCase()
            .includes(term)
      );
    }, [purchases, search]);

  const totalPurchaseValue =
    purchases.reduce(
      (sum, purchase) =>
        sum +
        Number(
          purchase.total_amount || 0
        ),
      0
    );

  const totalPaid =
    purchases.reduce(
      (sum, purchase) =>
        sum +
        Number(
          purchase.paid_amount || 0
        ),
      0
    );

  const totalOutstanding =
    totalPurchaseValue -
    totalPaid;

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="purchases-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="purchases-header">

        <div>
          <div className="purchases-breadcrumb">
            OPERATIONS / PURCHASES
          </div>

          <h1>Purchases</h1>

          <p>
            Record stock purchases, supplier
            invoices and payments
          </p>
        </div>

        <label className="btn purchases-upload-btn">

          {parsing
            ? 'Parsing Invoice...'
            : '📄 Upload Invoice'}

          <input
            type="file"
            accept="application/pdf"
            onChange={
              handlePdfUpload
            }
            disabled={parsing}
            style={{
              display: 'none',
            }}
          />

        </label>

      </div>

      {/* =================================================
          SUMMARY
          ================================================= */}

      <div className="purchases-summary">

        <div className="purchase-stat-card">

          <div className="purchase-stat-icon">
            🧾
          </div>

          <div>
            <span>
              Total Purchases
            </span>

            <strong>
              {purchases.length}
            </strong>
          </div>

        </div>

        <div className="purchase-stat-card">

          <div className="purchase-stat-icon purple">
            ₹
          </div>

          <div>
            <span>
              Purchase Value
            </span>

            <strong>
              ₹
              {totalPurchaseValue.toLocaleString(
                'en-IN',
                {
                  maximumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

        </div>

        <div className="purchase-stat-card">

          <div className="purchase-stat-icon green">
            ✓
          </div>

          <div>
            <span>
              Paid
            </span>

            <strong className="purchase-green">
              ₹
              {totalPaid.toLocaleString(
                'en-IN',
                {
                  maximumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

        </div>

        <div className="purchase-stat-card">

          <div className="purchase-stat-icon orange">
            !
          </div>

          <div>
            <span>
              Outstanding
            </span>

            <strong className="purchase-orange">
              ₹
              {totalOutstanding.toLocaleString(
                'en-IN',
                {
                  maximumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

        </div>

      </div>

      {/* =================================================
          PURCHASE ENTRY
          ================================================= */}

      <div className="purchase-form-card">

        <div className="purchase-form-header">

          <div>

            <div className="purchase-form-eyebrow">
              NEW PURCHASE
            </div>

            <h2>
              Purchase Entry
            </h2>

            <p>
              Add supplier invoice details
              and purchase items
            </p>

          </div>

          <div className="purchase-form-total">

            <span>
              Current Total
            </span>

            <strong>
              ₹
              {grandTotal.toFixed(2)}
            </strong>

          </div>

        </div>

        {/* PARSED NOTICE */}

        {parsedNotice && (
          <div className="purchase-parsed-notice">

            <div className="parsed-icon">
              ✓
            </div>

            <div>

              <strong>
                Invoice imported successfully
              </strong>

              <span>
                Parsed{' '}
                {parsedNotice.itemCount}{' '}
                item(s)
                {parsedNotice.supplierName
                  ? ` from ${parsedNotice.supplierName}`
                  : ''}
                .
                {parsedNotice.createdCount >
                0
                  ? ` Created ${parsedNotice.createdCount} new raw material(s).`
                  : ''}
              </span>

            </div>

            <div className="parsed-total">
              {parsedNotice.grandTotal
                ? `₹${Number(
                    parsedNotice.grandTotal
                  ).toFixed(2)}`
                : ''}
            </div>

          </div>
        )}

        <div className="purchase-form-body">

          {/* SUPPLIER SECTION */}

          <div className="purchase-section">

            <div className="purchase-section-heading">

              <div className="purchase-section-icon">
                🏢
              </div>

              <div>
                <h3>
                  Supplier & Invoice
                </h3>

                <span>
                  Basic purchase document details
                </span>
              </div>

            </div>

            <div className="purchase-header-grid">

              <div className="purchase-field supplier-field-large">

                <label>
                  Supplier *
                </label>

                <select
                  value={supplierId}
                  onChange={(e) =>
                    setSupplierId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select supplier
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="purchase-field">

                <label>
                  Invoice Date *
                </label>

                <input
                  type="date"
                  value={
                    invoiceDate
                  }
                  onChange={(e) =>
                    setInvoiceDate(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="purchase-field">

                <label>
                  Invoice Number
                </label>

                <input
                  placeholder="e.g. INV-1025"
                  value={invoiceNo}
                  onChange={(e) =>
                    setInvoiceNo(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            <div className="quick-supplier">

              <span>
                Supplier not listed?
              </span>

              <input
                placeholder="Type supplier name"
                value={newSupplier}
                onChange={(e) =>
                  setNewSupplier(
                    e.target.value
                  )
                }
              />

              <button
                className="btn btn-secondary"
                onClick={addSupplier}
              >
                + Add Supplier
              </button>

            </div>

          </div>

          {/* ITEMS SECTION */}

          <div className="purchase-section">

            <div className="purchase-section-heading">

              <div className="purchase-section-icon">
                📦
              </div>

              <div>
                <h3>
                  Purchase Items
                </h3>

                <span>
                  Add raw materials received
                  in this invoice
                </span>
              </div>

            </div>

            <div className="purchase-items-wrapper">

              <table className="purchase-items-table">

                <thead>
                  <tr>
                    <th>
                      Raw Material *
                    </th>

                    <th>
                      Qty *
                    </th>

                    <th>
                      Unit
                    </th>

                    <th>
                      Rate
                    </th>

                    <th>
                      GST %
                    </th>

                    <th>
                      Amount
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>

                  {items.map(
                    (item, index) => (
                      <tr key={index}>

                        <td>
                          <select
                            value={
                              item.raw_material_id
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                'raw_material_id',
                                e.target.value
                              )
                            }
                          >
                            <option value="">
                              Select raw material
                            </option>

                            {materials.map(
                              (material) => (
                                <option
                                  key={
                                    material.id
                                  }
                                  value={
                                    material.id
                                  }
                                >
                                  {
                                    material.name
                                  }
                                </option>
                              )
                            )}

                          </select>
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={
                              item.quantity
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                'quantity',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>

                          <span className="purchase-unit">
                            {materialUnit(
                              item.raw_material_id
                            ) || '—'}
                          </span>

                        </td>

                        <td>
                          <div className="purchase-rate-input">
                            <span>
                              ₹
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={
                                item.rate
                              }
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  'rate',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </td>

                        <td>
                          <div className="purchase-tax-input">

                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={
                                item.tax_percent
                              }
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  'tax_percent',
                                  e.target.value
                                )
                              }
                            />

                            <span>
                              %
                            </span>

                          </div>
                        </td>

                        <td>
                          <strong className="purchase-line-total">
                            ₹
                            {lineAmount(
                              item
                            ).toFixed(2)}
                          </strong>
                        </td>

                        <td>
                          <button
                            className="purchase-remove-btn"
                            onClick={() =>
                              removeItemLine(
                                index
                              )
                            }
                          >
                            ×
                          </button>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            <button
              className="purchase-add-item-btn"
              onClick={addItemLine}
            >
              + Add Item
            </button>

          </div>

          {/* TOTALS + PAYMENT */}

          <div className="purchase-bottom">

            <div className="purchase-payment-card">

              <div className="purchase-section-heading">

                <div className="purchase-section-icon">
                  💳
                </div>

                <div>
                  <h3>
                    Payment
                  </h3>

                  <span>
                    Record supplier payment
                  </span>
                </div>

              </div>

              <div className="payment-choice">

                <button
                  className={
                    !isPaid
                      ? 'payment-option active'
                      : 'payment-option'
                  }
                  onClick={() =>
                    setIsPaid(false)
                  }
                >
                  <span>
                    ○
                  </span>

                  <div>
                    <strong>
                      Unpaid
                    </strong>

                    <small>
                      Add to outstanding
                    </small>
                  </div>

                </button>

                <button
                  className={
                    isPaid
                      ? 'payment-option active'
                      : 'payment-option'
                  }
                  onClick={() =>
                    setIsPaid(true)
                  }
                >
                  <span>
                    ✓
                  </span>

                  <div>
                    <strong>
                      Paid
                    </strong>

                    <small>
                      Payment completed
                    </small>
                  </div>

                </button>

              </div>

              {isPaid && (
                <div className="payment-mode-field">

                  <label>
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMode
                    }
                    onChange={(e) =>
                      setPaymentMode(
                        e.target.value
                      )
                    }
                  >
                    <option value="cash">
                      Cash
                    </option>

                    <option value="upi">
                      UPI
                    </option>

                    <option value="bank">
                      Bank
                    </option>
                  </select>

                </div>
              )}

            </div>

            <div className="purchase-totals-card">

              <div className="purchase-total-row">
                <span>
                  Sub Total
                </span>

                <strong>
                  ₹
                  {subTotal.toFixed(2)}
                </strong>
              </div>

              <div className="purchase-total-row tax">
                <span>
                  Total GST
                </span>

                <strong>
                  ₹
                  {totalTax.toFixed(2)}
                </strong>
              </div>

              <div className="purchase-grand-total">

                <span>
                  Grand Total
                </span>

                <strong>
                  ₹
                  {grandTotal.toFixed(2)}
                </strong>

              </div>

              <div className="purchase-balance">

                <span>
                  {isPaid
                    ? 'Payment Status'
                    : 'Amount Outstanding'}
                </span>

                <strong
                  className={
                    isPaid
                      ? 'paid-text'
                      : 'outstanding-text'
                  }
                >
                  {isPaid
                    ? 'PAID'
                    : `₹${grandTotal.toFixed(
                        2
                      )}`}
                </strong>

              </div>

              <button
                className="btn purchase-save-btn"
                onClick={
                  savePurchase
                }
                disabled={saving}
              >
                {saving
                  ? 'Saving Purchase...'
                  : 'Save Purchase'}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          RECENT PURCHASES
          ================================================= */}

      <div className="recent-purchases-card">

        <div className="recent-purchases-header">

          <div>

            <div className="recent-eyebrow">
              HISTORY
            </div>

            <h2>
              Recent Purchases
            </h2>

            <p>
              Review previous supplier invoices
              and payments
            </p>

          </div>

          <div className="purchase-history-search">

            <span>
              ⌕
            </span>

            <input
              placeholder="Search supplier or invoice..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

          </div>

        </div>

        {filteredPurchases.length >
        0 ? (
          <div className="recent-purchases-table-wrap">

            <table className="recent-purchases-table">

              <thead>
                <tr>
                  <th>
                    Date
                  </th>

                  <th>
                    Supplier
                  </th>

                  <th>
                    Invoice
                  </th>

                  <th>
                    Total
                  </th>

                  <th>
                    Paid
                  </th>

                  <th>
                    Balance
                  </th>

                  <th>
                    Invoice
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredPurchases.map(
                  (purchase) => {

                    const total =
                      Number(
                        purchase.total_amount ||
                          0
                      );

                    const paid =
                      Number(
                        purchase.paid_amount ||
                          0
                      );

                    const balance =
                      total - paid;

                    return (
                      <tr
                        key={
                          purchase.id
                        }
                      >

                        <td>
                          <strong>
                            {
                              purchase.purchase_date
                            }
                          </strong>
                        </td>

                        <td>
                          <span className="history-supplier">
                            {
                              purchase.supplier_name
                            }
                          </span>
                        </td>

                        <td>
                          <span className="history-invoice">
                            {
                              purchase.invoice_no ||
                              '—'
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            ₹
                            {total.toFixed(
                              2
                            )}
                          </strong>
                        </td>

                        <td>
                          <span className="paid-amount">
                            ₹
                            {paid.toFixed(
                              2
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              balance >
                              0
                                ? 'balance-amount'
                                : 'balance-paid'
                            }
                          >
                            {balance >
                            0
                              ? `₹${balance.toFixed(
                                  2
                                )}`
                              : 'Paid'}
                          </span>
                        </td>

                        <td>
                          <a
                            className="invoice-link"
                            href={`/api/purchases/${purchase.id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="purchases-empty">

            <div className="purchases-empty-icon">
              🧾
            </div>

            <strong>
              {purchases.length ===
              0
                ? 'No purchases yet'
                : 'No purchases found'}
            </strong>

            <span>
              {purchases.length ===
              0
                ? 'Your purchase history will appear here.'
                : 'Try a different search.'}
            </span>

          </div>
        )}

      </div>

    </div>
  );
}