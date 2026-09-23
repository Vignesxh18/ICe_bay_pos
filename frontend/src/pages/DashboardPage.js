import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const MODE_COLORS = {
  cash: '#FF6F91',
  upi: '#8FCB9B',
  card: '#FFC857',
};

const getLocalDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [date, setDate] = useState(getLocalDate());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await api.get(`/dashboard?date=${date}`);
      setData(result);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [date]);

  const activeHours = useMemo(() => {
    if (!data?.hourly) return [];
    return data.hourly.filter((h) => Number(h.amount) > 0);
  }, [data]);

  const maxHourly = useMemo(() => {
    if (!data?.hourly?.length) return 1;
    return Math.max(1, ...data.hourly.map((h) => Number(h.amount || 0)));
  }, [data]);

  const salesByPayment = useMemo(() => {
    if (!data?.payment_breakdown) return [];

    return data.payment_breakdown.map((p) => ({
      ...p,
      color: MODE_COLORS[p.mode] || '#999',
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner" />
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-error">
        <div className="dashboard-error-icon">!</div>
        <h3>Unable to load dashboard</h3>
        <p>Please check your connection and try again.</p>

        <button className="btn" onClick={() => load()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-breadcrumb">
            OVERVIEW / DASHBOARD
          </div>

          <h1>Good day 👋</h1>

          <p>
            Here's what's happening with your shop on{' '}
            <strong>{data.date}</strong>
          </p>
        </div>

        <div className="dashboard-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="dashboard-date"
          />

          <button
            className="btn dashboard-refresh"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="dashboard-kpi-grid">

        <div className="dashboard-kpi sales">
          <div className="kpi-top">
            <span className="kpi-label">TOTAL SALES</span>
            <span className="kpi-icon">₹</span>
          </div>

          <div className="kpi-value">
            {money(data.total_sales)}
          </div>

          <div className="kpi-bottom">
            <span>{data.total_bills} orders</span>
            <span>Today</span>
          </div>
        </div>

        <div className="dashboard-kpi profit">
          <div className="kpi-top">
            <span className="kpi-label">GROSS PROFIT</span>
            <span className="kpi-icon">↗</span>
          </div>

          <div className="kpi-value">
            {money(data.gross_profit)}
          </div>

          <div className="kpi-bottom">
            <span>After product cost</span>
            <span>
              COGS {money(data.total_cogs)}
            </span>
          </div>
        </div>

        <div className="dashboard-kpi net">
          <div className="kpi-top">
            <span className="kpi-label">NET PROFIT</span>
            <span className="kpi-icon">✓</span>
          </div>

          <div className="kpi-value">
            {money(data.net_profit)}
          </div>

          <div className="kpi-bottom">
            <span>After expenses</span>
            <span>
              {money(data.total_expenses)} expenses
            </span>
          </div>
        </div>

        <div
          className={`dashboard-kpi ${
            data.low_stock_count > 0 ? 'warning' : 'stock-ok'
          }`}
        >
          <div className="kpi-top">
            <span className="kpi-label">LOW STOCK</span>
            <span className="kpi-icon">!</span>
          </div>

          <div className="kpi-value">
            {data.low_stock_count}
          </div>

          <div className="kpi-bottom">
            <span>
              {data.low_stock_count > 0
                ? 'Items need attention'
                : 'Stock looks good'}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN ROW */}
      <div className="dashboard-main-grid">

        {/* HOURLY SALES */}
        <div className="dashboard-card sales-chart-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Sales Overview</h3>
              <p>Hourly sales performance</p>
            </div>

            <div className="chart-total">
              {money(data.total_sales)}
            </div>
          </div>

          {activeHours.length === 0 ? (
            <div className="empty-dashboard">
              <div className="empty-icon">₹</div>
              <strong>No sales yet</strong>
              <span>Sales will appear here once billing starts.</span>
            </div>
          ) : (
            <>
              <div className="sales-chart">
                {data.hourly.map((h) => {
                  const amount = Number(h.amount || 0);
                  const height =
                    amount > 0
                      ? Math.max((amount / maxHourly) * 100, 4)
                      : 2;

                  return (
                    <div className="chart-column" key={h.hour}>
                      <div className="chart-tooltip">
                        {h.hour}:00
                        <br />
                        {money(amount)}
                      </div>

                      <div
                        className={`chart-bar ${
                          amount > 0 ? 'has-sales' : 'no-sales'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="chart-labels">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
              </div>
            </>
          )}
        </div>

        {/* PAYMENT BREAKDOWN */}
        <div className="dashboard-card payment-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Payment Methods</h3>
              <p>Today's collection</p>
            </div>
          </div>

          {salesByPayment.length === 0 ? (
            <div className="empty-dashboard small">
              No payments recorded yet.
            </div>
          ) : (
            <>
              <div className="payment-total">
                {money(data.total_sales)}
              </div>

              <div className="payment-bar">
                {salesByPayment.map((p) => (
                  <div
                    key={p.mode}
                    className="payment-segment"
                    style={{
                      width: `${p.percent}%`,
                      background: p.color,
                    }}
                  />
                ))}
              </div>

              <div className="payment-list">
                {salesByPayment.map((p) => (
                  <div className="payment-row" key={p.mode}>
                    <div className="payment-name">
                      <span
                        className="payment-dot"
                        style={{ background: p.color }}
                      />

                      <span>
                        {p.mode.charAt(0).toUpperCase() +
                          p.mode.slice(1)}
                      </span>
                    </div>

                    <div className="payment-amount">
                      <strong>{money(p.amount)}</strong>
                      <span>{p.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="dashboard-bottom-grid">

        {/* PROFIT SUMMARY */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Profit Summary</h3>
              <p>Today's financial overview</p>
            </div>
          </div>

          <div className="profit-list">

            <div className="profit-row">
              <span>Sales</span>
              <strong>{money(data.total_sales)}</strong>
            </div>

            <div className="profit-row">
              <span>Cost of Goods</span>
              <strong className="negative">
                − {money(data.total_cogs)}
              </strong>
            </div>

            <div className="profit-divider" />

            <div className="profit-row gross">
              <span>Gross Profit</span>
              <strong>{money(data.gross_profit)}</strong>
            </div>

            <div className="profit-row">
              <span>Expenses</span>
              <strong className="negative">
                − {money(data.total_expenses)}
              </strong>
            </div>

            <div className="profit-divider" />

            <div className="profit-row net-profit">
              <span>Net Profit</span>
              <strong>{money(data.net_profit)}</strong>
            </div>

          </div>
        </div>

        {/* LOW STOCK */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Stock Alerts</h3>
              <p>Items that need attention</p>
            </div>

            <span
              className={`stock-badge ${
                data.low_stock_count > 0 ? 'danger' : 'success'
              }`}
            >
              {data.low_stock_count > 0
                ? `${data.low_stock_count} Alerts`
                : 'All Good'}
            </span>
          </div>

          {data.low_stock_count === 0 ? (
            <div className="stock-empty">
              <div className="stock-check">✓</div>
              <strong>Everything looks good</strong>
              <span>No low-stock items right now.</span>
            </div>
          ) : (
            <div className="stock-alert-list">
              {data.low_stock_items.slice(0, 5).map((item) => (
                <div className="stock-alert-row" key={item.id}>
                  <div className="stock-item-icon">
                    !
                  </div>

                  <div className="stock-item-info">
                    <strong>{item.name}</strong>
                    <span>
                      Current stock: {item.current_stock} {item.unit}
                    </span>
                  </div>

                  <span className="stock-low-text">
                    Low
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}