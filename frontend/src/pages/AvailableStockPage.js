import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function AvailableStockPage() {
  const [materials, setMaterials] = useState([]);
  const [counts, setCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const load = () => {
    api
      .get('/stock-count')
      .then(data => setMaterials(Array.isArray(data) ? data : []))
      .catch(() => setMaterials([]));
  };

  useEffect(() => {
    load();
  }, []);

  /* -----------------------------
     CATEGORIES
  ----------------------------- */

  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        materials.map(m => m.category || 'Uncategorized')
      ),
    ];

    return ['All', ...unique];
  }, [materials]);

  /* -----------------------------
     FILTER + SEARCH
  ----------------------------- */

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return materials.filter(m => {
      const category = m.category || 'Uncategorized';

      const matchesCategory =
        selectedCategory === 'All' ||
        category === selectedCategory;

      const matchesSearch =
        !searchText ||
        String(m.name || '').toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [materials, selectedCategory, search]);

  /* -----------------------------
     COUNT HANDLING
  ----------------------------- */

  const updateCount = (id, value) => {
    setCounts(current => ({
      ...current,
      [id]: value,
    }));
  };

  const getVariance = material => {
    const counted = counts[material.id];

    if (counted === undefined || counted === '') {
      return null;
    }

    return Number(counted) - Number(material.current_stock);
  };

  const countedMaterials = Object.entries(counts).filter(
    ([, value]) => value !== '' && value !== undefined
  ).length;

  const varianceMaterials = materials.filter(material => {
    const variance = getVariance(material);
    return variance !== null && Math.abs(variance) > 0.000001;
  }).length;

  const pendingMaterials = Math.max(
    materials.length - countedMaterials,
    0
  );

  /* -----------------------------
     COUNT ALL
  ----------------------------- */

  const countAll = () => {
    const newCounts = { ...counts };

    materials.forEach(material => {
      newCounts[material.id] = Number(material.current_stock);
    });

    setCounts(newCounts);
  };

  /* -----------------------------
     CLEAR COUNTS
  ----------------------------- */

  const clearCounts = () => {
    setCounts({});
  };

  /* -----------------------------
     SUBMIT
  ----------------------------- */

  const submitCounts = async () => {
    const payload = Object.entries(counts)
      .filter(
        ([, value]) =>
          value !== '' &&
          value !== undefined &&
          value !== null &&
          !Number.isNaN(Number(value))
      )
      .map(([raw_material_id, counted_stock]) => ({
        raw_material_id: Number(raw_material_id),
        counted_stock: Number(counted_stock),
      }));

    if (payload.length === 0) {
      alert('Enter at least one physical stock count.');
      return;
    }

    setSaving(true);

    try {
      const result = await api.post('/stock-count/submit', {
        counts: payload,
      });

      setLastResult(result);
      setCounts({});
      load();
    } catch (err) {
      alert(err.message || 'Unable to save stock counts.');
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------
     KEYBOARD NAVIGATION
  ----------------------------- */

  const handleKeyDown = (event, index) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();

    const inputs = document.querySelectorAll(
      '.stock-count-input'
    );

    if (inputs[index + 1]) {
      inputs[index + 1].focus();
    }
  };

  /* -----------------------------
     FORMAT
  ----------------------------- */

  const formatNumber = value => {
    const number = Number(value);

    if (Number.isInteger(number)) {
      return number.toLocaleString('en-IN');
    }

    return number.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="stock-page">

      {/* --------------------------------
          PAGE HEADER
      -------------------------------- */}

      <div className="stock-page-header">

        <div>
          <div className="stock-breadcrumb">
            INVENTORY / STOCK COUNT
          </div>

          <h1>Available Stock</h1>

          <p>
            Reconcile physical stock with the quantity recorded in the system.
          </p>
        </div>

        <div className="stock-header-actions">
          <button
            className="btn btn-secondary stock-action-btn"
            onClick={countAll}
            disabled={materials.length === 0}
          >
            ✓ Count All
          </button>

          <button
            className="btn btn-secondary stock-action-btn"
            onClick={clearCounts}
            disabled={countedMaterials === 0}
          >
            Clear
          </button>

          <button
            className="btn stock-save-top"
            onClick={submitCounts}
            disabled={saving || countedMaterials === 0}
          >
            {saving
              ? 'Saving...'
              : `Save ${countedMaterials || ''} Count${countedMaterials === 1 ? '' : 's'}`}
          </button>
        </div>

      </div>


      {/* --------------------------------
          SUMMARY CARDS
      -------------------------------- */}

      <div className="stock-summary-grid">

        <div className="stock-summary-card">
          <div className="stock-summary-icon stock-icon-purple">
            📦
          </div>

          <div>
            <div className="stock-summary-label">
              Total Materials
            </div>

            <div className="stock-summary-value">
              {materials.length}
            </div>
          </div>
        </div>


        <div className="stock-summary-card">
          <div className="stock-summary-icon stock-icon-green">
            ✓
          </div>

          <div>
            <div className="stock-summary-label">
              Counted
            </div>

            <div className="stock-summary-value">
              {countedMaterials}
            </div>
          </div>
        </div>


        <div className="stock-summary-card">
          <div className="stock-summary-icon stock-icon-yellow">
            !
          </div>

          <div>
            <div className="stock-summary-label">
              Variances
            </div>

            <div className="stock-summary-value">
              {varianceMaterials}
            </div>
          </div>
        </div>


        <div className="stock-summary-card">
          <div className="stock-summary-icon stock-icon-neutral">
            ○
          </div>

          <div>
            <div className="stock-summary-label">
              Pending
            </div>

            <div className="stock-summary-value">
              {pendingMaterials}
            </div>
          </div>
        </div>

      </div>


      {/* --------------------------------
          LAST SAVE MESSAGE
      -------------------------------- */}

      {lastResult && (
        <div className="stock-result-card">

          <div className="stock-result-icon">
            ✓
          </div>

          <div className="stock-result-content">

            <strong>
              Stock count saved successfully
            </strong>

            {lastResult.variances &&
              lastResult.variances.length > 0 ? (
              <div className="stock-result-details">

                {lastResult.variances.map(v => (
                  <span key={v.raw_material_id}>
                    {v.name}:{' '}
                    <strong
                      className={
                        Number(v.variance) < 0
                          ? 'variance-negative'
                          : 'variance-positive'
                      }
                    >
                      {Number(v.variance) > 0 ? '+' : ''}
                      {Number(v.variance).toFixed(2)}
                    </strong>
                  </span>
                ))}

              </div>
            ) : (
              <div className="stock-result-subtitle">
                No stock differences were found.
              </div>
            )}

          </div>

        </div>
      )}


      {/* --------------------------------
          MAIN STOCK CARD
      -------------------------------- */}

      <div className="stock-main-card">

        {/* Toolbar */}

        <div className="stock-toolbar">

          <div className="stock-search">

            <span className="stock-search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search raw materials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {search && (
              <button
                className="stock-search-clear"
                onClick={() => setSearch('')}
              >
                ×
              </button>
            )}

          </div>


          <div className="stock-filter-info">
            Showing{' '}
            <strong>{filtered.length}</strong>{' '}
            of{' '}
            <strong>{materials.length}</strong>
          </div>

        </div>


        {/* Category Tabs */}

        <div className="stock-category-row">

          {categories.map(category => {

            const count =
              category === 'All'
                ? materials.length
                : materials.filter(
                    m =>
                      (m.category || 'Uncategorized') ===
                      category
                  ).length;

            const active =
              selectedCategory === category;

            return (
              <button
                key={category}
                className={`stock-category-tab ${
                  active ? 'active' : ''
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                <span>{category}</span>
                <span className="stock-category-count">
                  {count}
                </span>
              </button>
            );
          })}

        </div>


        {/* Table */}

        <div className="stock-table-wrapper">

          <table className="stock-table">

            <thead>
              <tr>
                <th className="stock-material-column">
                  Raw Material
                </th>

                <th>
                  System Stock
                </th>

                <th>
                  Physical Count
                </th>

                <th>
                  Variance
                </th>

                <th>
                  Status
                </th>
              </tr>
            </thead>


            <tbody>

              {filtered.map((material, index) => {

                const variance = getVariance(material);

                const hasCount =
                  counts[material.id] !== undefined &&
                  counts[material.id] !== '';

                let status = 'Pending';

                if (hasCount) {
                  if (Math.abs(variance) < 0.000001) {
                    status = 'Matched';
                  } else if (variance < 0) {
                    status = 'Short';
                  } else {
                    status = 'Excess';
                  }
                }

                return (
                  <tr key={material.id}>

                    {/* MATERIAL */}

                    <td>

                      <div className="stock-material">

                        <div className="stock-material-name">
                          {material.name}
                        </div>

                        {material.category && (
                          <div className="stock-material-category">
                            {material.category}
                          </div>
                        )}

                      </div>

                    </td>


                    {/* SYSTEM STOCK */}

                    <td>

                      <div className="system-stock-value">
                        <strong>
                          {formatNumber(material.current_stock)}
                        </strong>

                        <span>
                          {material.unit}
                        </span>
                      </div>

                    </td>


                    {/* PHYSICAL COUNT */}

                    <td>

                      <div className="physical-count-wrapper">

                        <input
                          className="stock-count-input"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Enter count"
                          value={
                            counts[material.id] ?? ''
                          }
                          onChange={e =>
                            updateCount(
                              material.id,
                              e.target.value
                            )
                          }
                          onKeyDown={e =>
                            handleKeyDown(e, index)
                          }
                        />

                        <span>
                          {material.unit}
                        </span>

                      </div>

                    </td>


                    {/* VARIANCE */}

                    <td>

                      {variance === null ? (
                        <span className="variance-empty">
                          —
                        </span>
                      ) : (
                        <span
                          className={`variance-value ${
                            variance < 0
                              ? 'negative'
                              : variance > 0
                              ? 'positive'
                              : 'zero'
                          }`}
                        >
                          {variance > 0 ? '+' : ''}
                          {formatNumber(variance)}
                          <small>
                            {material.unit}
                          </small>
                        </span>
                      )}

                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={`stock-status status-${status.toLowerCase()}`}
                      >
                        <span className="status-dot" />
                        {status}
                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {filtered.length === 0 && (
            <div className="stock-empty-state">

              <div className="stock-empty-icon">
                🔍
              </div>

              <strong>
                No materials found
              </strong>

              <span>
                Try changing your search or category filter.
              </span>

            </div>
          )}

        </div>

      </div>


      {/* --------------------------------
          BOTTOM ACTION BAR
      -------------------------------- */}

      {countedMaterials > 0 && (
        <div className="stock-bottom-bar">

          <div>

            <strong>
              {countedMaterials}
            </strong>{' '}
            material{countedMaterials !== 1 ? 's' : ''} counted

            {varianceMaterials > 0 && (
              <span className="bottom-warning">
                · {varianceMaterials} difference
                {varianceMaterials !== 1 ? 's' : ''}
              </span>
            )}

          </div>

          <div className="stock-bottom-actions">

            <button
              className="btn btn-secondary"
              onClick={clearCounts}
            >
              Clear
            </button>

            <button
              className="btn"
              onClick={submitCounts}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : `Save ${countedMaterials} Count${
                    countedMaterials === 1 ? '' : 's'
                  }`}
            </button>

          </div>

        </div>
      )}

    </div>
  );
}