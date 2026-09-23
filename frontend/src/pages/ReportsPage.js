import React, { useEffect, useState } from 'react';
import { api } from '../api';

const today = new Date().toISOString().slice(0, 10);

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value, digits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export default function ReportsPage() {
  const [subTab, setSubTab] = useState('sales');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const tabs = [
    { id: 'sales', label: 'Sales', icon: '₹' },
    { id: 'products', label: 'Products', icon: '◈' },
    { id: 'payments', label: 'Payments', icon: '↔' },
    { id: 'purchases', label: 'Purchases', icon: '▣' },
    { id: 'stock', label: 'Stock', icon: '▤' },
  ];

  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">
        <div>
          <div className="reports-breadcrumb">
            FINANCE / REPORTS
          </div>

          <h1>Reports</h1>

          <p>
            Analyse sales, products, payments, purchases and stock
          </p>
        </div>

        {subTab !== 'stock' && (
          <div className="reports-date-card">

            <div>
              <label>FROM</label>

              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="reports-date-arrow">
              →
            </div>

            <div>
              <label>TO</label>

              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

          </div>
        )}
      </div>

      {/* TABS */}
      <div className="reports-tabs">

        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={
              subTab === tab.id
                ? 'reports-tab active'
                : 'reports-tab'
            }
            onClick={() => setSubTab(tab.id)}
          >
            <span className="reports-tab-icon">
              {tab.icon}
            </span>

            <span>
              {tab.label}
            </span>
          </button>
        ))}

      </div>

      {/* REPORT CONTENT */}

      {subTab === 'sales' && (
        <SalesReport
          from={from}
          to={to}
        />
      )}

      {subTab === 'products' && (
        <ProductReport
          from={from}
          to={to}
        />
      )}

      {subTab === 'payments' && (
        <PaymentReport
          from={from}
          to={to}
        />
      )}

      {subTab === 'purchases' && (
        <PurchaseReport
          from={from}
          to={to}
        />
      )}

      {subTab === 'stock' && (
        <StockReport />
      )}

    </div>
  );
}


/* =========================================================
   SALES REPORT
   ========================================================= */

function SalesReport({ from, to }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);

    api
      .get(`/reports/sales?from=${from}&to=${to}`)
      .then(setData)
      .catch(() => setData(null));
  }, [from, to]);

  if (!data) {
    return <ReportLoading />;
  }

  return (
    <div className="report-content">

      <div className="report-section-heading">

        <div>
          <div className="report-mini-label">
            SALES PERFORMANCE
          </div>

          <h2>Sales Overview</h2>

          <p>
            Performance from {from} to {to}
          </p>
        </div>

        <ExportButton
          type="sales"
          from={from}
          to={to}
        />

      </div>


      {/* SALES STATS */}

      <div className="report-stat-grid five">

        <ReportStat
          label="Total Sales"
          value={money(data.total_sales)}
          icon="₹"
          type="purple"
        />

        <ReportStat
          label="Total Bills"
          value={data.total_bills}
          icon="#"
          type="blue"
        />

        <ReportStat
          label="Average Bill"
          value={money(data.avg_bill_value)}
          icon="↗"
          type="green"
        />

        <ReportStat
          label="Discounts Given"
          value={money(data.total_discount)}
          icon="%"
          type="orange"
        />

        <ReportStat
          label="Cancelled Bills"
          value={data.cancelled_bills}
          icon="×"
          type="red"
        />

      </div>


      {/* HIGHLIGHTS */}

      <div className="report-highlight-grid">

        <div className="report-highlight-card">

          <div className="highlight-icon purple">
            ₹
          </div>

          <div>
            <span>Revenue</span>

            <strong>
              {money(data.total_sales)}
            </strong>

            <small>
              Gross sales during selected period
            </small>
          </div>

        </div>


        <div className="report-highlight-card">

          <div className="highlight-icon green">
            ↗
          </div>

          <div>
            <span>Average Order Value</span>

            <strong>
              {money(data.avg_bill_value)}
            </strong>

            <small>
              Average value per bill
            </small>
          </div>

        </div>


        <div className="report-highlight-card">

          <div className="highlight-icon orange">
            %
          </div>

          <div>
            <span>Discounts</span>

            <strong>
              {money(data.total_discount)}
            </strong>

            <small>
              Total discounts given
            </small>
          </div>

        </div>

      </div>


      <div className="report-export-note">

        <span>↓</span>

        Export this report to CSV for accounting or analysis.

      </div>

    </div>
  );
}


/* =========================================================
   PRODUCT REPORT
   ========================================================= */

function ProductReport({ from, to }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);

    api
      .get(`/reports/products?from=${from}&to=${to}`)
      .then(setData)
      .catch(() => setData(null));
  }, [from, to]);

  if (!data) {
    return <ReportLoading />;
  }

  /*
   * IMPORTANT:
   * This is intentionally calculated with reduce()
   * instead of useMemo(), so there is no conditional
   * React Hook problem.
   */

  const products = Array.isArray(data.products)
    ? data.products
    : [];

  const totals = products.reduce(
    (acc, p) => {
      acc.qty += Number(p.qty_sold || 0);
      acc.sales += Number(p.sales || 0);
      acc.cost += Number(p.cost || 0);
      acc.profit += Number(p.profit || 0);

      return acc;
    },
    {
      qty: 0,
      sales: 0,
      cost: 0,
      profit: 0,
    }
  );

  return (
    <div className="report-content">

      <div className="report-section-heading">

        <div>
          <div className="report-mini-label">
            PRODUCT PERFORMANCE
          </div>

          <h2>Product Sales</h2>

          <p>
            Product-wise sales and profitability
          </p>
        </div>

        <ExportButton
          type="products"
          from={from}
          to={to}
        />

      </div>


      {/* PRODUCT STATS */}

      <div className="report-stat-grid four">

        <ReportStat
          label="Items Sold"
          value={number(totals.qty, 0)}
          icon="◈"
          type="purple"
        />

        <ReportStat
          label="Sales"
          value={money(totals.sales)}
          icon="₹"
          type="blue"
        />

        <ReportStat
          label="Product Cost"
          value={money(totals.cost)}
          icon="−"
          type="orange"
        />

        <ReportStat
          label="Profit"
          value={money(totals.profit)}
          icon="↗"
          type="green"
        />

      </div>


      {/* PRODUCT TABLE */}

      <div className="report-table-card">

        <div className="report-table-header">

          <div>
            <h3>
              Product Breakdown
            </h3>

            <span>
              {products.length} products
            </span>
          </div>

        </div>


        <div className="report-table-scroll">

          <table className="modern-report-table">

            <thead>

              <tr>
                <th>PRODUCT</th>
                <th>QTY SOLD</th>
                <th>SALES</th>
                <th>COST</th>
                <th>PROFIT</th>
                <th>MARGIN</th>
              </tr>

            </thead>


            <tbody>

              {products.map((p, index) => {

                const sales = Number(p.sales || 0);
                const profit = Number(p.profit || 0);

                const margin =
                  sales > 0
                    ? (profit / sales) * 100
                    : 0;

                return (
                  <tr
                    key={
                      p.product ||
                      p.id ||
                      index
                    }
                  >

                    <td>

                      <div className="product-name-cell">

                        <span className="product-report-icon">
                          🍨
                        </span>

                        <strong>
                          {p.product}
                        </strong>

                      </div>

                    </td>


                    <td>
                      {number(p.qty_sold, 0)}
                    </td>


                    <td>
                      <strong>
                        {money(p.sales)}
                      </strong>
                    </td>


                    <td>
                      {money(p.cost)}
                    </td>


                    <td>

                      <span
                        className={
                          profit >= 0
                            ? 'profit-positive'
                            : 'profit-negative'
                        }
                      >
                        {money(p.profit)}
                      </span>

                    </td>


                    <td>

                      <span className="margin-badge">
                        {margin.toFixed(1)}%
                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {products.length === 0 && (
            <ReportEmpty
              title="No product sales"
              text="No products were sold during this period."
            />
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   PAYMENT REPORT
   ========================================================= */

function PaymentReport({ from, to }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);

    api
      .get(`/reports/payments?from=${from}&to=${to}`)
      .then(setData)
      .catch(() => setData(null));
  }, [from, to]);

  if (!data) {
    return <ReportLoading />;
  }

  const breakdown = Array.isArray(data.breakdown)
    ? data.breakdown
    : [];

  const total = breakdown.reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  );

  return (
    <div className="report-content">

      <div className="report-section-heading">

        <div>
          <div className="report-mini-label">
            PAYMENT ANALYSIS
          </div>

          <h2>
            Payment Methods
          </h2>

          <p>
            Collection breakdown for the selected period
          </p>
        </div>

      </div>


      {/* TOTAL COLLECTION */}

      <div className="payment-total-card">

        <div>

          <span>
            Total Collection
          </span>

          <strong>
            {money(total)}
          </strong>

        </div>

        <div className="payment-total-icon">
          ₹
        </div>

      </div>


      {/* PAYMENT CARDS */}

      <div className="payment-grid">

        {breakdown.map((b, index) => {

          const mode =
            String(b.mode || '').toLowerCase();

          let icon = '₹';
          let type = 'green';

          if (mode === 'upi') {
            icon = '↗';
            type = 'purple';
          }

          if (mode === 'card') {
            icon = '▣';
            type = 'orange';
          }

          const percent =
            Number(
              b.percent ||
              (total > 0
                ? (Number(b.amount || 0) / total) * 100
                : 0)
            );

          return (
            <div
              className="payment-method-card"
              key={b.mode || index}
            >

              <div
                className={`payment-method-icon ${type}`}
              >
                {icon}
              </div>


              <div className="payment-method-info">

                <span>
                  {String(
                    b.mode || 'Other'
                  ).toUpperCase()}
                </span>

                <strong>
                  {money(b.amount)}
                </strong>


                <div className="payment-progress">

                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, percent)
                      )}%`,
                    }}
                  />

                </div>


                <small>
                  {percent.toFixed(1)}% of total collection
                </small>

              </div>

            </div>
          );
        })}

      </div>


      {/* PAYMENT TABLE */}

      <div className="report-table-card">

        <div className="report-table-header">

          <div>

            <h3>
              Payment Breakdown
            </h3>

            <span>
              Collection by payment mode
            </span>

          </div>

        </div>


        <div className="report-table-scroll">

          <table className="modern-report-table">

            <thead>

              <tr>
                <th>PAYMENT MODE</th>
                <th>AMOUNT</th>
                <th>SHARE</th>
              </tr>

            </thead>


            <tbody>

              {breakdown.map((b, index) => {

                const percent =
                  Number(
                    b.percent ||
                    (total > 0
                      ? (Number(b.amount || 0) /
                          total) *
                        100
                      : 0)
                  );

                return (
                  <tr
                    key={
                      b.mode ||
                      index
                    }
                  >

                    <td>

                      <strong className="capitalize">
                        {b.mode || 'Other'}
                      </strong>

                    </td>


                    <td>
                      {money(b.amount)}
                    </td>


                    <td>

                      <span className="margin-badge">
                        {percent.toFixed(1)}%
                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {breakdown.length === 0 && (
            <ReportEmpty
              title="No payments"
              text="No payment transactions were recorded."
            />
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   PURCHASE REPORT
   ========================================================= */

function PurchaseReport({ from, to }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);

    api
      .get(`/reports/purchases?from=${from}&to=${to}`)
      .then(setData)
      .catch(() => setData(null));
  }, [from, to]);

  if (!data) {
    return <ReportLoading />;
  }

  const purchases = Array.isArray(data.purchases)
    ? data.purchases
    : [];

  const totals = data.totals || {};

  return (
    <div className="report-content">

      <div className="report-section-heading">

        <div>

          <div className="report-mini-label">
            PURCHASE ANALYSIS
          </div>

          <h2>
            Purchase Report
          </h2>

          <p>
            Supplier purchases and outstanding amounts
          </p>

        </div>


        <ExportButton
          type="purchases"
          from={from}
          to={to}
        />

      </div>


      {/* PURCHASE STATS */}

      <div className="report-stat-grid three">

        <ReportStat
          label="Total Purchased"
          value={money(
            totals.total_purchased
          )}
          icon="₹"
          type="purple"
        />

        <ReportStat
          label="Total Paid"
          value={money(
            totals.total_paid
          )}
          icon="✓"
          type="green"
        />

        <ReportStat
          label="Outstanding"
          value={money(
            totals.total_outstanding
          )}
          icon="!"
          type="orange"
        />

      </div>


      {/* PURCHASE TABLE */}

      <div className="report-table-card">

        <div className="report-table-header">

          <div>

            <h3>
              Purchase History
            </h3>

            <span>
              {purchases.length} purchase records
            </span>

          </div>

        </div>


        <div className="report-table-scroll">

          <table className="modern-report-table">

            <thead>

              <tr>
                <th>DATE</th>
                <th>SUPPLIER</th>
                <th>INVOICE</th>
                <th>TOTAL</th>
                <th>PAID</th>
                <th>BALANCE</th>
              </tr>

            </thead>


            <tbody>

              {purchases.map((p, index) => {

                const totalAmount =
                  Number(
                    p.total_amount || 0
                  );

                const paidAmount =
                  Number(
                    p.paid_amount || 0
                  );

                const balance =
                  totalAmount -
                  paidAmount;

                return (
                  <tr
                    key={
                      p.id ||
                      index
                    }
                  >

                    <td>

                      <strong>
                        {p.purchase_date}
                      </strong>

                    </td>


                    <td>
                      {p.supplier_name}
                    </td>


                    <td>

                      <span className="invoice-badge">
                        {p.invoice_no || '—'}
                      </span>

                    </td>


                    <td>

                      <strong>
                        {money(totalAmount)}
                      </strong>

                    </td>


                    <td>

                      <span className="profit-positive">
                        {money(paidAmount)}
                      </span>

                    </td>


                    <td>

                      <span
                        className={
                          balance > 0
                            ? 'profit-negative'
                            : 'profit-positive'
                        }
                      >
                        {money(balance)}
                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {purchases.length === 0 && (
            <ReportEmpty
              title="No purchases"
              text="No purchases were recorded during this period."
            />
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   STOCK REPORT
   ========================================================= */

function StockReport() {
  const [data, setData] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null);

  useEffect(() => {
    api
      .get('/reports/stock')
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <ReportLoading />;
  }

  if (ledgerFor) {
    return (
      <StockLedger
        materialId={ledgerFor}
        onBack={() => setLedgerFor(null)}
      />
    );
  }

  const materials = Array.isArray(data.materials)
    ? data.materials
    : [];

  const normalCount = materials.filter(
    (m) => m.status === 'Normal'
  ).length;

  const lowCount = materials.filter(
    (m) => m.status === 'Low'
  ).length;

  const criticalCount = materials.filter(
    (m) => m.status === 'Critical'
  ).length;


  const exportStock = () => {

    const token =
      localStorage.getItem('icecream_token');

    window.open(
      `http://localhost:6001/api/reports/export/stock?token=${token}`,
      '_blank'
    );
  };


  return (
    <div className="report-content">

      <div className="report-section-heading">

        <div>

          <div className="report-mini-label">
            INVENTORY ANALYSIS
          </div>

          <h2>
            Stock Report
          </h2>

          <p>
            Current raw material inventory and stock value
          </p>

        </div>


        <button
          className="report-export-btn"
          onClick={exportStock}
        >
          ↓ Export CSV
        </button>

      </div>


      {/* STOCK STATS */}

      <div className="report-stat-grid four">

        <ReportStat
          label="Total Stock Value"
          value={money(data.total_value)}
          icon="₹"
          type="purple"
        />

        <ReportStat
          label="Normal Stock"
          value={normalCount}
          icon="✓"
          type="green"
        />

        <ReportStat
          label="Low Stock"
          value={lowCount}
          icon="!"
          type="orange"
        />

        <ReportStat
          label="Critical Stock"
          value={criticalCount}
          icon="!"
          type="red"
        />

      </div>


      {/* STOCK HEALTH */}

      <div className="stock-alert-strip">

        <div>

          <strong>
            Stock Health
          </strong>

          <span>

            {criticalCount > 0
              ? `${criticalCount} materials need immediate attention`
              : lowCount > 0
              ? `${lowCount} materials are running low`
              : 'All materials are currently at healthy levels'}

          </span>

        </div>


        <div
          className={
            criticalCount > 0
              ? 'stock-health critical'
              : lowCount > 0
              ? 'stock-health low'
              : 'stock-health normal'
          }
        >

          {criticalCount > 0
            ? 'Critical'
            : lowCount > 0
            ? 'Attention'
            : 'All Good'}

        </div>

      </div>


      {/* STOCK TABLE */}

      <div className="report-table-card">

        <div className="report-table-header">

          <div>

            <h3>
              Raw Materials
            </h3>

            <span>
              {materials.length} materials
            </span>

          </div>

        </div>


        <div className="report-table-scroll">

          <table className="modern-report-table">

            <thead>

              <tr>
                <th>RAW MATERIAL</th>
                <th>CURRENT STOCK</th>
                <th>UNIT</th>
                <th>VALUE</th>
                <th>STATUS</th>
                <th></th>
              </tr>

            </thead>


            <tbody>

              {materials.map((m) => {

                const statusClass =
                  m.status === 'Critical'
                    ? 'critical'
                    : m.status === 'Low'
                    ? 'low'
                    : 'normal';

                return (
                  <tr key={m.id}>

                    <td>

                      <div className="product-name-cell">

                        <span className="stock-material-icon">
                          ◈
                        </span>

                        <strong>
                          {m.name}
                        </strong>

                      </div>

                    </td>


                    <td>

                      <strong>
                        {number(m.current_stock)}
                      </strong>

                    </td>


                    <td>
                      {m.unit}
                    </td>


                    <td>
                      {money(m.value)}
                    </td>


                    <td>

                      <span
                        className={`stock-status ${statusClass}`}
                      >

                        <i />

                        {m.status}

                      </span>

                    </td>


                    <td>

                      <button
                        className="ledger-btn"
                        onClick={() =>
                          setLedgerFor(m.id)
                        }
                      >
                        View Ledger →
                      </button>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {materials.length === 0 && (
            <ReportEmpty
              title="No raw materials"
              text="No stock records are available."
            />
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   STOCK LEDGER
   ========================================================= */

function StockLedger({
  materialId,
  onBack,
}) {
  const [from, setFrom] = useState(
    new Date(
      new Date().getTime() -
        30 * 86400000
    )
      .toISOString()
      .slice(0, 10)
  );

  const [to, setTo] = useState(today);

  const [data, setData] = useState(null);


  useEffect(() => {

    setData(null);

    api
      .get(
        `/reports/stock/${materialId}/ledger?from=${from}&to=${to}`
      )
      .then(setData)
      .catch(() => setData(null));

  }, [materialId, from, to]);


  if (!data) {
    return <ReportLoading />;
  }


  const transactions =
    Array.isArray(data.transactions)
      ? data.transactions
      : [];


  return (
    <div className="report-content">

      {/* BACK */}

      <button
        className="report-back-btn"
        onClick={onBack}
      >
        ← Back to Stock Report
      </button>


      {/* HEADER */}

      <div className="ledger-header">

        <div>

          <div className="report-mini-label">
            STOCK LEDGER
          </div>

          <h2>
            {data.material}
          </h2>

          <p>
            Detailed stock movement for the selected period
          </p>

        </div>


        <div className="ledger-date-card">

          <div>

            <label>
              FROM
            </label>

            <input
              type="date"
              value={from}
              onChange={(e) =>
                setFrom(e.target.value)
              }
            />

          </div>


          <span>
            →
          </span>


          <div>

            <label>
              TO
            </label>

            <input
              type="date"
              value={to}
              onChange={(e) =>
                setTo(e.target.value)
              }
            />

          </div>

        </div>

      </div>


      {/* LEDGER STATS */}

      <div className="report-stat-grid five">

        <ReportStat
          label="Opening Stock"
          value={`${number(
            data.opening_stock
          )} ${data.unit}`}
          icon="◀"
          type="blue"
        />

        <ReportStat
          label="Purchased"
          value={`+${number(
            data.total_purchased
          )} ${data.unit}`}
          icon="+"
          type="green"
        />

        <ReportStat
          label="Consumed"
          value={`-${number(
            data.total_sold_consumption
          )} ${data.unit}`}
          icon="−"
          type="purple"
        />

        <ReportStat
          label="Wastage"
          value={`-${number(
            data.total_wastage
          )} ${data.unit}`}
          icon="×"
          type="red"
        />

        <ReportStat
          label="Current Stock"
          value={`${number(
            data.current_stock
          )} ${data.unit}`}
          icon="✓"
          type="orange"
        />

      </div>


      {/* LEDGER TABLE */}

      <div className="report-table-card">

        <div className="report-table-header">

          <div>

            <h3>
              Stock Movement
            </h3>

            <span>
              {transactions.length} transactions
            </span>

          </div>

        </div>


        <div className="report-table-scroll">

          <table className="modern-report-table">

            <thead>

              <tr>
                <th>DATE</th>
                <th>TYPE</th>
                <th>REFERENCE</th>
                <th>QTY IN</th>
                <th>QTY OUT</th>
                <th>BALANCE</th>
              </tr>

            </thead>


            <tbody>

              {transactions.map((t, index) => (

                <tr key={index}>

                  <td>

                    <strong>
                      {t.date}
                    </strong>

                  </td>


                  <td>

                    <span className="ledger-type">
                      {t.type}
                    </span>

                  </td>


                  <td>
                    {t.reference || '—'}
                  </td>


                  <td>

                    {Number(t.qty_in || 0) > 0 ? (
                      <span className="profit-positive">
                        +{number(t.qty_in, 3)}
                      </span>
                    ) : (
                      '—'
                    )}

                  </td>


                  <td>

                    {Number(t.qty_out || 0) > 0 ? (
                      <span className="profit-negative">
                        -{number(t.qty_out, 3)}
                      </span>
                    ) : (
                      '—'
                    )}

                  </td>


                  <td>

                    <strong>
                      {number(t.balance, 3)}
                    </strong>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>


          {transactions.length === 0 && (
            <ReportEmpty
              title="No stock movement"
              text="There was no stock movement during this period."
            />
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   EXPORT BUTTON
   ========================================================= */

function ExportButton({
  type,
  from,
  to,
}) {
  const download = () => {

    const token =
      localStorage.getItem(
        'icecream_token'
      );

    const params =
      new URLSearchParams({
        from,
        to,
        token: token || '',
      });


    window.open(
      `http://localhost:6001/api/reports/export/${type}?${params.toString()}`,
      '_blank'
    );
  };


  return (
    <button
      className="report-export-btn"
      onClick={download}
    >
      ↓ Export CSV
    </button>
  );
}


/* =========================================================
   STAT CARD
   ========================================================= */

function ReportStat({
  label,
  value,
  icon,
  type = 'purple',
}) {
  return (
    <div className="report-stat-card">

      <div
        className={`report-stat-icon ${type}`}
      >
        {icon}
      </div>


      <div className="report-stat-content">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}


/* =========================================================
   LOADING
   ========================================================= */

function ReportLoading() {
  return (
    <div className="report-loading">

      <div className="report-loading-spinner">
        ◌
      </div>

      <strong>
        Loading report...
      </strong>

      <span>
        Fetching your business data
      </span>

    </div>
  );
}


/* =========================================================
   EMPTY
   ========================================================= */

function ReportEmpty({
  title,
  text,
}) {
  return (
    <div className="report-empty">

      <div className="report-empty-icon">
        ◌
      </div>

      <strong>
        {title}
      </strong>

      <span>
        {text}
      </span>

    </div>
  );
}