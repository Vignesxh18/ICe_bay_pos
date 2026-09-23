import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const getToday = () =>
  new Date().toISOString().slice(0, 10);

const createEmptyForm = () => ({
  expense_date: getToday(),
  category: '',
  amount: '',
  payment_mode: 'cash',
  description: '',
});

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ExpensesPage() {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(createEmptyForm());

  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

  const [saving, setSaving] = useState(false);

  /* =====================================================
     LOAD DATA
     ===================================================== */

  const loadCategories = () =>
    api
      .get('/expenses/categories')
      .then(setCategories)
      .catch(() => setCategories([]));

  const loadSummary = () =>
    api
      .get('/expenses/summary')
      .then(setSummary)
      .catch(() => setSummary(null));

  const loadExpenses = () => {
    const query = filterDate
      ? `?date=${filterDate}`
      : '';

    api
      .get(`/expenses${query}`)
      .then((data) =>
        setExpenses(data.expenses || [])
      )
      .catch(() => setExpenses([]));
  };

  useEffect(() => {
    loadCategories();
    loadSummary();
  }, []);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line
  }, [filterDate]);

  /* =====================================================
     FORM
     ===================================================== */

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openForm = () => {
    setForm(createEmptyForm());
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(createEmptyForm());
  };

  const save = async () => {
    if (!form.category) {
      alert('Please select an expense category');
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      alert('Please enter a valid amount');
      return;
    }

    setSaving(true);

    try {
      await api.post('/expenses', {
        ...form,
        amount: Number(form.amount),
      });

      closeForm();

      await loadExpenses();
      await loadSummary();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE
     ===================================================== */

  const remove = async (id) => {
    if (
      !window.confirm(
        'Delete this expense? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await api.del(`/expenses/${id}`);
      await loadExpenses();
      await loadSummary();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =====================================================
     FILTER
     ===================================================== */

  const filteredExpenses = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !term ||
        String(expense.category || '')
          .toLowerCase()
          .includes(term) ||
        String(expense.description || '')
          .toLowerCase()
          .includes(term) ||
        String(expense.payment_mode || '')
          .toLowerCase()
          .includes(term);

      const matchesPayment =
        paymentFilter === 'All' ||
        String(
          expense.payment_mode || ''
        ).toLowerCase() ===
          paymentFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesPayment
      );
    });
  }, [
    expenses,
    search,
    paymentFilter,
  ]);

  /* =====================================================
     LOCAL TOTAL
     ===================================================== */

  const displayedTotal =
    filteredExpenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );

  const cashTotal = expenses
    .filter(
      (e) =>
        String(e.payment_mode)
          .toLowerCase() === 'cash'
    )
    .reduce(
      (sum, e) =>
        sum + Number(e.amount || 0),
      0
    );

  const upiTotal = expenses
    .filter(
      (e) =>
        String(e.payment_mode)
          .toLowerCase() === 'upi'
    )
    .reduce(
      (sum, e) =>
        sum + Number(e.amount || 0),
      0
    );

  const bankTotal = expenses
    .filter(
      (e) =>
        String(e.payment_mode)
          .toLowerCase() === 'bank'
    )
    .reduce(
      (sum, e) =>
        sum + Number(e.amount || 0),
      0
    );

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="expenses-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="expenses-header">

        <div>
          <div className="expenses-breadcrumb">
            FINANCE / EXPENSES
          </div>

          <h1>Expenses</h1>

          <p>
            Track operating expenses and
            understand where your money goes
          </p>
        </div>

        <button
          className="btn expenses-add-btn"
          onClick={openForm}
        >
          + Add Expense
        </button>

      </div>

      {/* =================================================
          SUMMARY CARDS
          ================================================= */}

      {summary && (
        <div className="expenses-summary">

          <div className="expense-stat-card">

            <div className="expense-stat-icon">
              ₹
            </div>

            <div>
              <span>
                Today's Expenses
              </span>

              <strong>
                {formatMoney(
                  summary.today_total
                )}
              </strong>

              <small>
                Today's spending
              </small>
            </div>

          </div>

          <div className="expense-stat-card">

            <div className="expense-stat-icon purple">
              ₹
            </div>

            <div>
              <span>
                This Month
              </span>

              <strong>
                {formatMoney(
                  summary.month_total
                )}
              </strong>

              <small>
                Current month
              </small>
            </div>

          </div>

          <div className="expense-stat-card">

            <div className="expense-stat-icon green">
              #
            </div>

            <div>
              <span>
                Entries
              </span>

              <strong>
                {expenses.length}
              </strong>

              <small>
                {filterDate
                  ? 'Selected date'
                  : 'Loaded records'}
              </small>
            </div>

          </div>

        </div>
      )}

      {/* =================================================
          MONTHLY BREAKDOWN
          ================================================= */}

      {summary && (
        <div className="expense-breakdown-card">

          <div className="expense-breakdown-header">

            <div>
              <div className="expense-eyebrow">
                MONTHLY OVERVIEW
              </div>

              <h2>
                Expense Breakdown
              </h2>

              <p>
                Category-wise expenses for
                this month
              </p>
            </div>

            <div className="expense-breakdown-total">
              {formatMoney(
                summary.month_total
              )}
            </div>

          </div>

          {summary.by_category &&
          summary.by_category.length > 0 ? (
            <div className="expense-category-list">

              {summary.by_category.map(
                (category, index) => {

                  const monthTotal =
                    Number(
                      summary.month_total ||
                        0
                    );

                  const categoryTotal =
                    Number(
                      category.total || 0
                    );

                  const percentage =
                    monthTotal > 0
                      ? Math.min(
                          100,
                          (categoryTotal /
                            monthTotal) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      className="expense-category-row"
                      key={
                        category.category
                      }
                    >

                      <div className="expense-category-top">

                        <div className="expense-category-name">

                          <span className="expense-category-dot">
                            {index + 1}
                          </span>

                          <strong>
                            {
                              category.category
                            }
                          </strong>

                        </div>

                        <strong>
                          {formatMoney(
                            category.total
                          )}
                        </strong>

                      </div>

                      <div className="expense-progress">
                        <div
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                    </div>
                  );
                }
              )}

            </div>
          ) : (
            <div className="expense-no-breakdown">
              No expenses recorded this month.
            </div>
          )}

        </div>
      )}

      {/* =================================================
          PAYMENT SUMMARY
          ================================================= */}

      <div className="expense-payment-summary">

        <div>
          <span>Cash</span>
          <strong>
            {formatMoney(cashTotal)}
          </strong>
        </div>

        <div>
          <span>UPI</span>
          <strong>
            {formatMoney(upiTotal)}
          </strong>
        </div>

        <div>
          <span>Bank</span>
          <strong>
            {formatMoney(bankTotal)}
          </strong>
        </div>

        <div>
          <span>Displayed Total</span>
          <strong>
            {formatMoney(displayedTotal)}
          </strong>
        </div>

      </div>

      {/* =================================================
          ADD EXPENSE FORM
          ================================================= */}

      {showForm && (
        <div className="expense-form-card">

          <div className="expense-form-header">

            <div>

              <div className="expense-eyebrow">
                NEW EXPENSE
              </div>

              <h2>
                Add Expense
              </h2>

              <p>
                Record an operating expense
                for your shop
              </p>

            </div>

            <button
              className="expense-close-btn"
              onClick={closeForm}
            >
              ×
            </button>

          </div>

          <div className="expense-form-body">

            <div className="expense-form-grid">

              <div className="expense-field">

                <label>
                  Date *
                </label>

                <input
                  type="date"
                  value={
                    form.expense_date
                  }
                  onChange={(e) =>
                    updateForm(
                      'expense_date',
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="expense-field">

                <label>
                  Category *
                </label>

                <select
                  value={form.category}
                  onChange={(e) =>
                    updateForm(
                      'category',
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="expense-field">

                <label>
                  Amount *
                </label>

                <div className="expense-amount-input">

                  <span>₹</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) =>
                      updateForm(
                        'amount',
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="expense-field">

                <label>
                  Payment Mode *
                </label>

                <select
                  value={
                    form.payment_mode
                  }
                  onChange={(e) =>
                    updateForm(
                      'payment_mode',
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

                  <option value="card">
                    Card
                  </option>

                </select>

              </div>

            </div>

            <div className="expense-field expense-description">

              <label>
                Description
              </label>

              <input
                placeholder="e.g. Electricity bill, cleaning supplies, transport..."
                value={
                  form.description
                }
                onChange={(e) =>
                  updateForm(
                    'description',
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="expense-form-actions">

            <button
              className="btn btn-secondary"
              onClick={closeForm}
            >
              Cancel
            </button>

            <button
              className="btn"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Expense'}
            </button>

          </div>

        </div>
      )}

      {/* =================================================
          EXPENSE HISTORY
          ================================================= */}

      <div className="expense-history-card">

        <div className="expense-history-header">

          <div>

            <div className="expense-eyebrow">
              TRANSACTIONS
            </div>

            <h2>
              Expense History
            </h2>

            <p>
              Review and manage recorded
              expenses
            </p>

          </div>

          <div className="expense-history-tools">

            <div className="expense-search">

              <span>
                ⌕
              </span>

              <input
                placeholder="Search category or description..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

              {search && (
                <button
                  onClick={() =>
                    setSearch('')
                  }
                >
                  ×
                </button>
              )}

            </div>

            <input
              className="expense-date-filter"
              type="date"
              value={filterDate}
              onChange={(e) =>
                setFilterDate(
                  e.target.value
                )
              }
            />

            {filterDate && (
              <button
                className="btn btn-secondary expense-clear-btn"
                onClick={() =>
                  setFilterDate('')
                }
              >
                Clear
              </button>
            )}

          </div>

        </div>

        {/* PAYMENT FILTERS */}

        <div className="expense-filter-bar">

          {[
            'All',
            'Cash',
            'UPI',
            'Bank',
            'Card',
          ].map((mode) => (
            <button
              key={mode}
              className={
                paymentFilter === mode
                  ? 'expense-filter active'
                  : 'expense-filter'
              }
              onClick={() =>
                setPaymentFilter(mode)
              }
            >
              {mode}
            </button>
          ))}

          <span className="expense-result-count">
            {filteredExpenses.length}{' '}
            {filteredExpenses.length === 1
              ? 'entry'
              : 'entries'}
          </span>

        </div>

        {filteredExpenses.length >
        0 ? (
          <div className="expense-table-wrap">

            <table className="expense-table">

              <thead>

                <tr>
                  <th>
                    Date
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Description
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                  </th>
                </tr>

              </thead>

              <tbody>

                {filteredExpenses.map(
                  (expense) => (
                    <tr
                      key={expense.id}
                    >

                      <td>
                        <strong>
                          {
                            expense.expense_date
                          }
                        </strong>
                      </td>

                      <td>
                        <span className="expense-category-badge">
                          {
                            expense.category
                          }
                        </span>
                      </td>

                      <td>
                        <span className="expense-description-text">
                          {expense.description ||
                            'No description'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`expense-payment-badge ${String(
                            expense.payment_mode ||
                              ''
                          ).toLowerCase()}`}
                        >
                          {String(
                            expense.payment_mode ||
                              ''
                          ).toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <strong className="expense-amount">
                          {formatMoney(
                            expense.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <button
                          className="expense-delete-btn"
                          onClick={() =>
                            remove(
                              expense.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="expense-empty">

            <div className="expense-empty-icon">
              ₹
            </div>

            <strong>
              No expenses found
            </strong>

            <span>
              {filterDate
                ? 'No expenses were recorded for this date.'
                : search
                ? 'Try a different search term.'
                : 'Your expense transactions will appear here.'}
            </span>

            {!filterDate &&
              !search && (
                <button
                  className="btn"
                  onClick={openForm}
                >
                  + Add First Expense
                </button>
              )}

          </div>
        )}

      </div>

    </div>
  );
}