import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ClosingPage() {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [preview, setPreview] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPreview = () =>
    api
      .get(`/closing/preview?date=${date}`)
      .then(setPreview)
      .catch(() => setPreview(null));

  const loadHistory = () =>
    api
      .get('/closing/history')
      .then(setHistory)
      .catch(() => setHistory([]));

  useEffect(() => {
    loadPreview();
    loadHistory();
    setResult(null);

    // eslint-disable-next-line
  }, [date]);

  useEffect(() => {
    if (preview && preview.already_closed && preview.existing) {
      setActualCash(
        String(preview.existing.actual_cash)
      );
    } else {
      setActualCash('');
    }
  }, [preview]);

  const submitClosing = async () => {
    if (actualCash === '') {
      alert('Enter the actual counted cash');
      return;
    }

    setSaving(true);

    try {
      const res = await api.post('/closing', {
        date,
        actual_cash: Number(actualCash),
      });

      setResult(res);

      await loadPreview();
      await loadHistory();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const difference = useMemo(() => {
    if (actualCash === '') return null;

    return (
      Number(actualCash) -
      Number(preview?.expected_cash || 0)
    );
  }, [actualCash, preview]);

  const differenceClass =
    difference === null
      ? ''
      : difference === 0
      ? 'closing-match'
      : difference < 0
      ? 'closing-short'
      : 'closing-excess';

  if (!preview) {
    return (
      <div className="closing-loading">
        <div className="closing-loading-card">
          <div className="closing-loading-icon">₹</div>
          <strong>Loading day closing...</strong>
          <span>
            Preparing your sales and cash summary
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="closing-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="closing-header">

        <div>
          <div className="closing-breadcrumb">
            FINANCE / DAY CLOSING
          </div>

          <h1>Day Closing</h1>

          <p>
            Reconcile today's sales, expenses and
            physical cash before closing the day.
          </p>
        </div>

        <div className="closing-date-box">

          <label>BUSINESS DATE</label>

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
          />

        </div>

      </div>

      {/* =====================================================
          ALREADY CLOSED
          ===================================================== */}

      {preview.already_closed && (
        <div className="closing-status-banner">

          <div className="closing-status-icon">
            ✓
          </div>

          <div>
            <strong>
              This day has already been closed
            </strong>

            <span>
              You can update the actual cash if
              a correction is required.
            </span>
          </div>

          <div className="closing-status-badge">
            CLOSED
          </div>

        </div>
      )}

      {/* =====================================================
          TOP SUMMARY
          ===================================================== */}

      <div className="closing-summary-grid">

        <div className="closing-stat-card">

          <div className="closing-stat-icon sales">
            ₹
          </div>

          <div>
            <span>Total Sales</span>

            <strong>
              {money(preview.total_sales)}
            </strong>

            <small>
              {preview.total_bills} bills
            </small>
          </div>

        </div>

        <div className="closing-stat-card">

          <div className="closing-stat-icon expense">
            −
          </div>

          <div>
            <span>Total Expenses</span>

            <strong>
              {money(preview.total_expenses)}
            </strong>

            <small>
              Cash {money(preview.cash_expenses)}
            </small>
          </div>

        </div>

        <div className="closing-stat-card">

          <div className="closing-stat-icon profit">
            ↗
          </div>

          <div>
            <span>Net Profit</span>

            <strong>
              {money(preview.net_profit)}
            </strong>

            <small>
              After expenses
            </small>
          </div>

        </div>

      </div>

      {/* =====================================================
          MAIN GRID
          ===================================================== */}

      <div className="closing-main-grid">

        {/* =================================================
            SALES + PROFIT
            ================================================= */}

        <div className="closing-panel">

          <div className="closing-panel-header">

            <div className="closing-panel-icon">
              ₹
            </div>

            <div>
              <h2>Sales & Profit</h2>

              <p>
                Financial summary for this day
              </p>
            </div>

          </div>

          <div className="closing-section">

            <div className="closing-section-title">
              SALES
            </div>

            <div className="closing-line total">

              <span>Total Sales</span>

              <strong>
                {money(preview.total_sales)}
              </strong>

            </div>

            <div className="closing-line">

              <span>
                <i className="closing-dot cash" />
                Cash
              </span>

              <span>
                {money(preview.cash_sales)}
              </span>

            </div>

            <div className="closing-line">

              <span>
                <i className="closing-dot upi" />
                UPI
              </span>

              <span>
                {money(preview.upi_sales)}
              </span>

            </div>

            <div className="closing-line">

              <span>
                <i className="closing-dot card" />
                Card
              </span>

              <span>
                {money(preview.card_sales)}
              </span>

            </div>

            <div className="closing-line">

              <span>Bills</span>

              <span>
                {preview.total_bills}
              </span>

            </div>

          </div>

          <div className="closing-divider" />

          <div className="closing-section">

            <div className="closing-section-title">
              EXPENSES
            </div>

            <div className="closing-line total">

              <span>Total Expenses</span>

              <strong>
                {money(preview.total_expenses)}
              </strong>

            </div>

            <div className="closing-line">

              <span>Cash Expenses</span>

              <span>
                {money(preview.cash_expenses)}
              </span>

            </div>

          </div>

          <div className="closing-divider" />

          <div className="closing-profit-box">

            <div>

              <span>Gross Profit</span>

              <strong>
                {money(preview.gross_profit)}
              </strong>

            </div>

            <div>

              <span>Net Profit</span>

              <strong>
                {money(preview.net_profit)}
              </strong>

            </div>

          </div>

        </div>

        {/* =================================================
            CASH RECONCILIATION
            ================================================= */}

        <div className="closing-panel cash-panel">

          <div className="closing-panel-header">

            <div className="closing-panel-icon purple">
              ₹
            </div>

            <div>
              <h2>Cash Reconciliation</h2>

              <p>
                Compare expected cash with
                physical cash
              </p>
            </div>

          </div>

          <div className="cash-calculation">

            <div className="cash-calc-line">

              <span>Opening Cash</span>

              <strong>
                {money(preview.opening_cash)}
              </strong>

            </div>

            <div className="cash-calc-line">

              <span>+ Cash Sales</span>

              <strong className="positive">
                {money(preview.cash_sales)}
              </strong>

            </div>

            <div className="cash-calc-line">

              <span>− Cash Expenses</span>

              <strong className="negative">
                {money(preview.cash_expenses)}
              </strong>

            </div>

            <div className="cash-expected">

              <span>Expected Cash</span>

              <strong>
                {money(preview.expected_cash)}
              </strong>

            </div>

          </div>

          {/* ACTUAL CASH */}

          <div className="actual-cash-section">

            <label>
              ACTUAL CASH COUNTED
            </label>

            <div className="actual-cash-input">

              <span>₹</span>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter counted cash"
                value={actualCash}
                onChange={(e) =>
                  setActualCash(e.target.value)
                }
              />

            </div>

          </div>

          {/* DIFFERENCE */}

          {difference !== null && (
            <div
              className={`closing-difference ${differenceClass}`}
            >

              <div>

                <span>
                  {difference === 0
                    ? 'Cash Matched'
                    : difference < 0
                    ? 'Cash Shortage'
                    : 'Cash Excess'}
                </span>

                <small>
                  Expected {money(
                    preview.expected_cash
                  )}
                </small>

              </div>

              <strong>
                {difference > 0 ? '+' : ''}
                {money(difference)}
              </strong>

            </div>
          )}

          <button
            className="closing-submit-btn"
            onClick={submitClosing}
            disabled={saving}
          >
            <span>
              {saving
                ? 'Saving...'
                : preview.already_closed
                ? 'Update Closing'
                : 'Close Day'}
            </span>

            {!saving && (
              <span className="closing-submit-arrow">
                →
              </span>
            )}
          </button>

        </div>

      </div>

      {/* =====================================================
          RESULT
          ===================================================== */}

      {result && (
        <div className="closing-result">

          <div className="closing-result-icon">
            ✓
          </div>

          <div>

            <strong>
              Day closing saved successfully
            </strong>

            <span>
              Expected {money(result.expected_cash)}
              {' • '}
              Actual {money(result.actual_cash)}
              {' • '}
              Difference{' '}
              {result.cash_difference > 0
                ? '+'
                : ''}
              {money(result.cash_difference)}
            </span>

          </div>

        </div>
      )}

      {/* =====================================================
          CLOSING HISTORY
          ===================================================== */}

      <div className="closing-history">

        <div className="closing-history-header">

          <div>

            <div className="closing-breadcrumb">
              HISTORY
            </div>

            <h2>Closing History</h2>

            <p>
              Previous day-end reconciliations
            </p>

          </div>

          <div className="closing-history-count">
            {history.length}{' '}
            {history.length === 1
              ? 'closing'
              : 'closings'}
          </div>

        </div>

        {history.length > 0 ? (

          <div className="closing-history-table-wrap">

            <table className="closing-history-table">

              <thead>

                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Expenses</th>
                  <th>Net Profit</th>
                  <th>Expected Cash</th>
                  <th>Actual Cash</th>
                  <th>Difference</th>
                </tr>

              </thead>

              <tbody>

                {history.map((h) => {

                  const diff =
                    Number(
                      h.cash_difference || 0
                    );

                  return (
                    <tr
                      key={h.closing_date}
                    >

                      <td>
                        <strong>
                          {h.closing_date}
                        </strong>
                      </td>

                      <td>
                        {money(
                          h.total_sales
                        )}
                      </td>

                      <td>
                        {money(
                          h.total_expenses
                        )}
                      </td>

                      <td>
                        <strong className="history-profit">
                          {money(
                            h.net_profit
                          )}
                        </strong>
                      </td>

                      <td>
                        {money(
                          h.expected_cash
                        )}
                      </td>

                      <td>
                        {money(
                          h.actual_cash
                        )}
                      </td>

                      <td>

                        <span
                          className={
                            diff === 0
                              ? 'history-diff match'
                              : diff < 0
                              ? 'history-diff shortage'
                              : 'history-diff excess'
                          }
                        >
                          {diff > 0
                            ? '+'
                            : ''}
                          {money(diff)}
                        </span>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        ) : (

          <div className="closing-empty">

            <div className="closing-empty-icon">
              ✓
            </div>

            <strong>
              No closings recorded yet
            </strong>

            <span>
              Your completed day closings will
              appear here.
            </span>

          </div>

        )}

      </div>

    </div>
  );
}