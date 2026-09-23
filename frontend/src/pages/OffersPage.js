import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  name: '',
  price: '',
  trigger_product_id: '',
  trigger_quantity: '1',
  free_product_id: '',
  free_quantity: '1',
  start_date: '',
  end_date: '',
};

export default function OffersPage() {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadCombos = () =>
    api
      .get('/combos')
      .then(setCombos)
      .catch(() => setCombos([]));

  const loadProducts = () =>
    api
      .get('/products')
      .then(setProducts)
      .catch(() => setProducts([]));

  useEffect(() => {
    loadCombos();
    loadProducts();
  }, []);

  /* =====================================================
     HELPERS
     ===================================================== */

  const getProduct = (id) =>
    products.find(
      (product) => Number(product.id) === Number(id)
    );

  const isOfferActive = (combo) =>
    Boolean(combo.is_currently_active);

  const activeCount = combos.filter(isOfferActive).length;

  const inactiveCount =
    combos.length - activeCount;

  /* =====================================================
     FILTER
     ===================================================== */

  const filteredCombos = useMemo(() => {
    const term = search.trim().toLowerCase();

    return combos.filter((combo) => {
      const matchesSearch =
        !term ||
        String(combo.name || '')
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' &&
          isOfferActive(combo)) ||
        (statusFilter === 'inactive' &&
          !isOfferActive(combo));

      return matchesSearch && matchesStatus;
    });
  }, [combos, search, statusFilter]);

  /* =====================================================
     FORM
     ===================================================== */

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (combo) => {
    const trigger = combo.items.find(
      (item) => !item.is_free
    );

    const free = combo.items.find(
      (item) => item.is_free
    );

    setEditing(combo);

    setForm({
      name: combo.name,
      price: String(combo.price),

      trigger_product_id: trigger
        ? String(trigger.product_id)
        : '',

      trigger_quantity: trigger
        ? String(trigger.quantity)
        : '1',

      free_product_id: free
        ? String(free.product_id)
        : '',

      free_quantity: free
        ? String(free.quantity)
        : '1',

      start_date: combo.start_date || '',
      end_date: combo.end_date || '',
    });

    setShowForm(true);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const save = async () => {
    if (
      !form.name.trim() ||
      !form.price ||
      !form.trigger_product_id ||
      !form.free_product_id
    ) {
      alert(
        'Offer name, price, trigger product, and free product are all required'
      );
      return;
    }

    const body = {
      name: form.name.trim(),

      price: Number(form.price),

      trigger_product_id: Number(
        form.trigger_product_id
      ),

      trigger_quantity:
        Number(form.trigger_quantity) || 1,

      free_product_id: Number(
        form.free_product_id
      ),

      free_quantity:
        Number(form.free_quantity) || 1,

      start_date:
        form.start_date || null,

      end_date:
        form.end_date || null,

      is_active: true,
    };

    try {
      if (editing) {
        await api.put(
          `/combos/${editing.id}`,
          body
        );
      } else {
        await api.post('/combos', body);
      }

      setShowForm(false);
      setEditing(null);
      loadCombos();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeCombo = async (id) => {
    if (
      !window.confirm(
        'Deactivate this offer?'
      )
    ) {
      return;
    }

    try {
      await api.del(`/combos/${id}`);
      loadCombos();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="offers-page">

      {/* HEADER */}

      <div className="offers-header">

        <div>
          <div className="offers-breadcrumb">
            MASTERS / OFFERS
          </div>

          <h1>Offers & Combos</h1>

          <p>
            Create promotional offers and free-item
            combinations
          </p>
        </div>

        <button
          className="btn offers-create-btn"
          onClick={openNew}
        >
          + Create Offer
        </button>

      </div>

      {/* SUMMARY */}

      <div className="offers-summary">

        <div className="offer-stat">
          <div className="offer-stat-icon">
            🎁
          </div>

          <div>
            <span>Total Offers</span>
            <strong>{combos.length}</strong>
          </div>
        </div>

        <div className="offer-stat">
          <div className="offer-stat-icon active">
            ✓
          </div>

          <div>
            <span>Active</span>
            <strong className="success-number">
              {activeCount}
            </strong>
          </div>
        </div>

        <div className="offer-stat">
          <div className="offer-stat-icon inactive">
            ○
          </div>

          <div>
            <span>Inactive</span>
            <strong className="inactive-number">
              {inactiveCount}
            </strong>
          </div>
        </div>

      </div>

      {/* CREATE / EDIT FORM */}

      {showForm && (
        <div className="offer-form-card">

          <div className="offer-form-header">

            <div>
              <div className="offer-form-eyebrow">
                {editing
                  ? 'EDIT OFFER'
                  : 'NEW OFFER'}
              </div>

              <h2>
                {editing
                  ? 'Edit Offer'
                  : 'Create New Offer'}
              </h2>

              <p>
                Define what the customer buys,
                what they receive free, and the
                price they pay.
              </p>
            </div>

            <button
              className="offer-close-btn"
              onClick={() =>
                setShowForm(false)
              }
            >
              ×
            </button>

          </div>

          <div className="offer-form-body">

            {/* OFFER NAME */}

            <div className="offer-field full">

              <label>
                Offer Name
              </label>

              <input
                placeholder="e.g. Cold Milo + Free Hendy's Chicken"
                value={form.name}
                onChange={(e) =>
                  updateForm(
                    'name',
                    e.target.value
                  )
                }
              />

            </div>

            {/* OFFER FLOW */}

            <div className="offer-flow">

              {/* TRIGGER */}

              <div className="offer-flow-card">

                <div className="offer-flow-title">
                  <span className="offer-step-number">
                    1
                  </span>

                  <div>
                    <strong>
                      Customer Buys
                    </strong>

                    <small>
                      Trigger product
                    </small>
                  </div>
                </div>

                <div className="offer-field">

                  <label>
                    Product
                  </label>

                  <select
                    value={
                      form.trigger_product_id
                    }
                    onChange={(e) =>
                      updateForm(
                        'trigger_product_id',
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select product
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.name} — ₹
                          {Number(
                            product.selling_price
                          ).toFixed(0)}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="offer-field">

                  <label>
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      form.trigger_quantity
                    }
                    onChange={(e) =>
                      updateForm(
                        'trigger_quantity',
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="offer-arrow">
                →
              </div>

              {/* FREE PRODUCT */}

              <div className="offer-flow-card free">

                <div className="offer-flow-title">

                  <span className="offer-step-number free">
                    🎁
                  </span>

                  <div>
                    <strong>
                      Customer Gets Free
                    </strong>

                    <small>
                      Free product
                    </small>
                  </div>

                </div>

                <div className="offer-field">

                  <label>
                    Free Product
                  </label>

                  <select
                    value={
                      form.free_product_id
                    }
                    onChange={(e) =>
                      updateForm(
                        'free_product_id',
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select free product
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.name}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="offer-field">

                  <label>
                    Free Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      form.free_quantity
                    }
                    onChange={(e) =>
                      updateForm(
                        'free_quantity',
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

            </div>

            {/* PRICE + DATES */}

            <div className="offer-details-grid">

              <div className="offer-field">

                <label>
                  Offer Price
                  <small>
                    Customer pays
                  </small>
                </label>

                <div className="price-input">
                  <span>₹</span>

                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    placeholder="0"
                    onChange={(e) =>
                      updateForm(
                        'price',
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

              <div className="offer-field">

                <label>
                  Start Date
                  <small>
                    Optional
                  </small>
                </label>

                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    updateForm(
                      'start_date',
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="offer-field">

                <label>
                  End Date
                  <small>
                    Optional
                  </small>
                </label>

                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    updateForm(
                      'end_date',
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            {/* PREVIEW */}

            <div className="offer-preview">

              <div className="offer-preview-title">
                OFFER PREVIEW
              </div>

              <div className="offer-preview-content">

                <div className="preview-product">

                  <span>
                    BUY
                  </span>

                  <strong>
                    {getProduct(
                      form.trigger_product_id
                    )?.name ||
                      'Select product'}
                  </strong>

                  <small>
                    ×{' '}
                    {form.trigger_quantity ||
                      1}
                  </small>

                </div>

                <div className="preview-arrow">
                  →
                </div>

                <div className="preview-product free">

                  <span>
                    FREE 🎁
                  </span>

                  <strong>
                    {getProduct(
                      form.free_product_id
                    )?.name ||
                      'Select free product'}
                  </strong>

                  <small>
                    ×{' '}
                    {form.free_quantity ||
                      1}
                  </small>

                </div>

                <div className="preview-price">

                  <span>
                    Customer pays
                  </span>

                  <strong>
                    ₹
                    {Number(
                      form.price || 0
                    ).toFixed(0)}
                  </strong>

                </div>

              </div>

            </div>

          </div>

          {/* FORM ACTIONS */}

          <div className="offer-form-actions">

            <button
              className="btn btn-secondary"
              onClick={() =>
                setShowForm(false)
              }
            >
              Cancel
            </button>

            <button
              className="btn"
              onClick={save}
            >
              {editing
                ? 'Save Changes'
                : 'Create Offer'}
            </button>

          </div>

        </div>
      )}

      {/* FILTER BAR */}

      <div className="offers-toolbar">

        <div className="offers-search">

          <span>⌕</span>

          <input
            placeholder="Search offers..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
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

        <div className="offers-status-tabs">

          <button
            className={
              statusFilter === 'all'
                ? 'offer-filter active'
                : 'offer-filter'
            }
            onClick={() =>
              setStatusFilter('all')
            }
          >
            All
            <span>{combos.length}</span>
          </button>

          <button
            className={
              statusFilter === 'active'
                ? 'offer-filter active'
                : 'offer-filter'
            }
            onClick={() =>
              setStatusFilter('active')
            }
          >
            Active
            <span>{activeCount}</span>
          </button>

          <button
            className={
              statusFilter === 'inactive'
                ? 'offer-filter active'
                : 'offer-filter'
            }
            onClick={() =>
              setStatusFilter('inactive')
            }
          >
            Inactive
            <span>{inactiveCount}</span>
          </button>

        </div>

      </div>

      {/* OFFERS */}

      {filteredCombos.length === 0 ? (
        <div className="offers-empty">

          <div className="offers-empty-icon">
            🎁
          </div>

          <strong>
            {combos.length === 0
              ? 'No offers yet'
              : 'No offers found'}
          </strong>

          <span>
            {combos.length === 0
              ? 'Create your first promotional offer.'
              : 'Try a different search or filter.'}
          </span>

          {combos.length === 0 && (
            <button
              className="btn"
              onClick={openNew}
            >
              + Create Offer
            </button>
          )}

        </div>
      ) : (
        <div className="offers-grid">

          {filteredCombos.map((combo) => {

            const trigger =
              combo.items.find(
                (item) => !item.is_free
              );

            const free =
              combo.items.find(
                (item) => item.is_free
              );

            const active =
              isOfferActive(combo);

            return (
              <div
                key={combo.id}
                className={
                  active
                    ? 'offer-card'
                    : 'offer-card inactive'
                }
              >

                {/* CARD HEADER */}

                <div className="offer-card-header">

                  <div className="offer-card-icon">
                    🎁
                  </div>

                  <div className="offer-card-status">

                    <span
                      className={
                        active
                          ? 'offer-status active'
                          : 'offer-status inactive'
                      }
                    >
                      <i />
                      {active
                        ? 'ACTIVE'
                        : 'INACTIVE'}
                    </span>

                  </div>

                </div>

                {/* NAME */}

                <h3>
                  {combo.name}
                </h3>

                {/* OFFER FLOW */}

                <div className="offer-card-flow">

                  <div className="offer-card-product">

                    <span className="flow-label">
                      BUY
                    </span>

                    <strong>
                      {trigger?.product_name ||
                        'Product'}
                    </strong>

                    <small>
                      ×{' '}
                      {trigger?.quantity ||
                        1}
                    </small>

                  </div>

                  <div className="offer-card-arrow">
                    →
                  </div>

                  <div className="offer-card-product free">

                    <span className="flow-label">
                      FREE 🎁
                    </span>

                    <strong>
                      {free?.product_name ||
                        'Product'}
                    </strong>

                    <small>
                      ×{' '}
                      {free?.quantity || 1}
                    </small>

                  </div>

                </div>

                {/* PRICE */}

                <div className="offer-card-price">

                  <div>
                    <span>
                      Customer pays
                    </span>

                    <strong>
                      ₹
                      {Number(
                        combo.price
                      ).toFixed(0)}
                    </strong>
                  </div>

                </div>

                {/* VALIDITY */}

                {(combo.start_date ||
                  combo.end_date) && (
                  <div className="offer-validity">

                    <span>
                      VALIDITY
                    </span>

                    <strong>
                      {combo.start_date ||
                        'No start'}{' '}
                      →{' '}
                      {combo.end_date ||
                        'No end'}
                    </strong>

                  </div>
                )}

                {/* ACTIONS */}

                <div className="offer-card-actions">

                  <button
                    className="offer-edit-btn"
                    onClick={() =>
                      openEdit(combo)
                    }
                  >
                    Edit
                  </button>

                  {active && (
                    <button
                      className="offer-deactivate-btn"
                      onClick={() =>
                        removeCombo(
                          combo.id
                        )
                      }
                    >
                      Deactivate
                    </button>
                  )}

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}