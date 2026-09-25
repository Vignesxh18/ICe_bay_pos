import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import BillHistoryPanel from './BillHistoryPanel';

const BACKEND = '';

const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Cash', icon: '₹' },
  { id: 'upi', label: 'UPI', icon: '⌁' },
  { id: 'card', label: 'Card', icon: '▣' },
];

export default function BillingPage() {
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cart, setCart] = useState([]);

  const [paymentMode, setPaymentMode] = useState('cash');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({
    cash: '',
    upi: '',
    card: '',
  });

  const [billDiscount, setBillDiscount] = useState('');
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' or 'percent'
  const [lastBill, setLastBill] = useState(null);
  const [todaySales, setTodaySales] = useState(null);
  const [heldBills, setHeldBills] = useState([]);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadProducts = () =>
    api
      .get('/products')
      .then(setProducts)
      .catch(() => setProducts([]));

  const loadCombos = () =>
    api
      .get('/combos')
      .then((data) =>
        setCombos(data.filter((c) => c.is_currently_active))
      )
      .catch(() => setCombos([]));

  const loadToday = () =>
    api
      .get('/bills')
      .then(setTodaySales)
      .catch(() => setTodaySales(null));

  useEffect(() => {
    loadProducts();
    loadCombos();
    loadToday();
  }, []);

  /* =====================================================
     PRODUCT SEARCH
     ===================================================== */

  const categories = useMemo(() => {
    const values = products.map((p) => p.category).filter((c) => c && String(c).trim());
    return ['All', ...new Set(values)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) => {
      const matchesSearch = !term || String(p.name || '').toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  /* =====================================================
     CART
     ===================================================== */

  const addToCart = (product) => {
    if (product.pricing_type === 'weighted') {
      const gramsStr = window.prompt(`Enter weight in grams for "${product.name}" (₹${product.selling_price}/g):`);
      if (!gramsStr) return;
      const grams = Number(gramsStr);
      if (!grams || grams <= 0) return alert('Enter a valid weight in grams');

      setCart((current) => {
        const existing = current.find((item) => item.product_id === product.id);
        if (existing) {
          return current.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + grams }
              : item
          );
        }
        return [
          ...current,
          {
            product_id: product.id,
            name: product.name,
            price: product.selling_price,
            quantity: grams,
            discount: 0,
          },
        ];
      });
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.product_id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const addComboToCart = (combo) => {
    setCart((current) => {
      const existing = current.find(
        (item) => item.combo_id === combo.id
      );

      if (existing) {
        return current.map((item) =>
          item.combo_id === combo.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      const freeItem = combo.items.find((item) => item.is_free);

      const label = freeItem
        ? `${combo.name} (+ free ${freeItem.product_name})`
        : combo.name;

      return [
        ...current,
        {
          combo_id: combo.id,
          name: label,
          price: combo.price,
          quantity: 1,
          discount: 0,
          isCombo: true,
        },
      ];
    });
  };

  const getItemKey = (item) =>
    item.combo_id
      ? `combo-${item.combo_id}`
      : `product-${item.product_id}`;

  const changeQty = (key, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          getItemKey(item) === key
            ? {
                ...item,
                quantity: item.quantity + delta,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (key) => {
    setCart((current) =>
      current.filter((item) => getItemKey(item) !== key)
    );
  };

  const setLineDiscount = (key, value) => {
    setCart((current) =>
      current.map((item) =>
        getItemKey(item) === key
          ? {
              ...item,
              discount: Number(value) || 0,
            }
          : item
      )
    );
  };

  /* =====================================================
     TOTALS
     ===================================================== */

  const lineTotal = (item) =>
    Math.max(
      0,
      item.price * item.quantity - (item.discount || 0)
    );

  const subtotal = cart.reduce(
    (sum, item) => sum + lineTotal(item),
    0
  );

  const billDiscountAmount = discountType === 'percent'
    ? Math.round(subtotal * ((Number(billDiscount) || 0) / 100) * 100) / 100
    : (Number(billDiscount) || 0);

  const total = Math.max(
    0,
    subtotal - billDiscountAmount
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  /* =====================================================
     BILL ACTIONS
     ===================================================== */

  const clearCart = () => {
    setCart([]);
    setBillDiscount('');
    setSplitAmounts({
      cash: '',
      upi: '',
      card: '',
    });
  };

  const holdBill = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setHeldBills((current) => [
      ...current,
      {
        id: Date.now(),
        cart,
        billDiscount,
        paymentMode,
        heldAt: new Date().toLocaleTimeString(),
      },
    ]);

    clearCart();
  };

  const resumeBill = (held) => {
    setCart(held.cart);
    setBillDiscount(held.billDiscount);
    setPaymentMode(held.paymentMode);

    setHeldBills((current) =>
      current.filter((bill) => bill.id !== held.id)
    );
  };

  const discardHeld = (id) => {
    setHeldBills((current) =>
      current.filter((bill) => bill.id !== id)
    );
  };

  const completeBill = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    let body = {
      discount: billDiscountAmount,
      lines: cart.map((item) =>
        item.combo_id
          ? {
              combo_id: item.combo_id,
              quantity: item.quantity,
            }
          : {
              product_id: item.product_id,
              quantity: item.quantity,
              discount: item.discount,
            }
      ),
    };

    if (isSplitPayment) {
      const payments = Object.entries(splitAmounts)
        .filter(([, value]) => value && Number(value) > 0)
        .map(([mode, value]) => ({
          mode,
          amount: Number(value),
        }));

      const splitTotal = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      if (payments.length < 2) {
        alert(
          'Enter amounts for at least two payment modes to split'
        );
        return;
      }

      if (Math.abs(splitTotal - total) > 0.01) {
        alert(
          `Split amounts (₹${splitTotal.toFixed(
            2
          )}) must add up to the total (₹${total.toFixed(2)})`
        );
        return;
      }

      body.payments = payments;
    } else {
      body.payment_mode = paymentMode;
    }

    try {
      setSaving(true);

      const bill = await api.post('/bills', body);

      if (bill.stock_warnings && bill.stock_warnings.length > 0) {
        alert('Sale completed, but stock is now short:\n\n' + bill.stock_warnings.join('\n'));
      }

      setLastBill(bill);

      clearCart();

      setIsSplitPayment(false);

      loadToday();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelBill = async (billId) => {
    if (
      !window.confirm(
        'Cancel this bill? Stock will be restored.'
      )
    ) {
      return;
    }

    const reason = window.prompt('Reason for cancelling this bill (required):');
    if (!reason || !reason.trim()) {
      alert('A reason is required to cancel a bill');
      return;
    }

    try {
      await api.post(`/bills/${billId}/cancel`, { reason: reason.trim() });

      if (lastBill && lastBill.id === billId) {
        setLastBill(null);
      }

      loadToday();

      alert('Bill cancelled, stock restored');
    } catch (err) {
      alert(err.message);
    }
  };

  const reprintBill = (billId) => {
    const token = localStorage.getItem('icecream_token');
    window.open(
      `${BACKEND}/api/bills/${billId}/receipt?token=${token}`,
      '_blank'
    );
  };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="billing-page">

      {/* PAGE HEADER */}

      <div className="billing-header">
        <div>
          <div className="billing-breadcrumb">
            SALES / BILLING
          </div>

          <h1>Billing</h1>

          <p>
            Create a new bill and collect payment
          </p>
        </div>

        {todaySales && (
          <div className="billing-today-summary">
            <div>
              <span>Today's Sales</span>
              <strong>
                ₹{Number(todaySales.total_sales || 0).toFixed(0)}
              </strong>
            </div>

            <div className="billing-today-divider" />

            <div>
              <span>Bills</span>
              <strong>{todaySales.bill_count}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="billing-layout">

        {/* =================================================
            LEFT — PRODUCTS
            ================================================= */}

        <div className="billing-products-area">

          {/* SEARCH */}

          <div className="billing-search-card">

            <div className="billing-search-wrapper">
              <span className="billing-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />

              {search && (
                <button
                  className="billing-search-clear"
                  onClick={() => setSearch('')}
                >
                  ×
                </button>
              )}
            </div>

            <div className="billing-category-rail">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={activeTab === 'all' && selectedCategory === cat ? 'category-chip active' : 'category-chip'}
                  onClick={() => { setSelectedCategory(cat); setActiveTab('all'); }}
                >
                  {cat}
                </button>
              ))}
              <button
                className={activeTab === 'offers' ? 'category-chip active offer' : 'category-chip offer'}
                onClick={() => setActiveTab('offers')}
              >
                🎁 Offers ({combos.length})
              </button>
            </div>
          </div>

          {/* OFFERS */}

          {activeTab === 'offers' && (
            <div className="billing-section">

              <div className="billing-section-title">
                <div>
                  <h3>Active Offers</h3>
                  <span>Tap an offer to add it</span>
                </div>

                <span className="section-count">
                  {combos.length}
                </span>
              </div>

              {combos.length === 0 ? (
                <div className="billing-empty">
                  <div>🎁</div>
                  <strong>No active offers</strong>
                  <span>
                    Create offers from the Offers section.
                  </span>
                </div>
              ) : (
                <div className="billing-product-grid">
                  {combos.map((combo) => (
                    <button
                      key={combo.id}
                      className="billing-product-card offer-card"
                      onClick={() => addComboToCart(combo)}
                    >
                      <span className="offer-ribbon">
                        OFFER
                      </span>

                      <span className="billing-product-name">
                        {combo.name}
                      </span>

                      <span className="billing-product-price">
                        ₹{Number(combo.price).toFixed(0)}
                      </span>

                      <span className="billing-add">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRODUCTS */}

          {activeTab === 'all' && (
            <div className="billing-section">

              <div className="billing-section-title">
                <div>
                  <h3>Products</h3>

                  <span>
                    {search
                      ? `${filteredProducts.length} results`
                      : 'Tap a product to add it'}
                  </span>
                </div>

                <span className="section-count">
                  {filteredProducts.length}
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="billing-empty">
                  <div>⌕</div>

                  <strong>
                    {search
                      ? 'No products found'
                      : 'No products available'}
                  </strong>

                  <span>
                    {search
                      ? 'Try a different search.'
                      : 'Add products from Products & Recipes.'}
                  </span>
                </div>
              ) : (
                <div className="billing-product-grid">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      className="billing-product-card"
                      onClick={() => addToCart(product)}
                    >
                      <span className="billing-product-name">
                        {product.name}
                      </span>

                      <span className="billing-product-price">
                        ₹
                        {Number(
                          product.selling_price
                        ).toFixed(0)}
                      </span>

                      <span className="billing-add">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HELD BILLS */}

          {heldBills.length > 0 && (
            <div className="billing-section held-section">

              <div className="billing-section-title">
                <div>
                  <h3>Held Bills</h3>
                  <span>
                    Bills waiting to be resumed
                  </span>
                </div>

                <span className="section-count">
                  {heldBills.length}
                </span>
              </div>

              <div className="held-bills-list">
                {heldBills.map((held) => (
                  <div
                    key={held.id}
                    className="held-bill-row"
                  >
                    <div className="held-bill-info">
                      <strong>
                        {held.cart.reduce(
                          (sum, item) =>
                            sum + item.quantity,
                          0
                        )}{' '}
                        items
                      </strong>

                      <span>
                        Held at {held.heldAt}
                      </span>
                    </div>

                    <div className="held-bill-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          resumeBill(held)
                        }
                      >
                        Resume
                      </button>

                      <button
                        className="held-discard"
                        onClick={() =>
                          discardHeld(held.id)
                        }
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            RIGHT — CURRENT BILL
            ================================================= */}

        <div className="billing-cart-area">

          <div className="billing-cart-card">

            {/* CART HEADER */}

            <div className="billing-cart-header">

              <div>
                <div className="billing-cart-title">
                  Current Bill
                </div>

                <span>
                  {totalItems === 0
                    ? 'No items added'
                    : `${totalItems} ${
                        totalItems === 1
                          ? 'item'
                          : 'items'
                      }`}
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  className="billing-clear-btn"
                  onClick={clearCart}
                >
                  Clear
                </button>
              )}
              <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setShowHistory(true)}>
                History
              </button>
            </div>
            {showHistory && <BillHistoryPanel onClose={() => setShowHistory(false)} />}

            {/* CART ITEMS */}

            <div className="billing-cart-items">

              {cart.length === 0 ? (
                <div className="billing-cart-empty">
                  <div className="cart-empty-icon">
                    🛒
                  </div>

                  <strong>Your bill is empty</strong>

                  <span>
                    Select products from the left
                    to start billing.
                  </span>
                </div>
              ) : (
                cart.map((item) => {
                  const key = getItemKey(item);

                  return (
                    <div
                      key={key}
                      className="billing-cart-item"
                    >

                      <div className="cart-item-top">

                        <div className="cart-item-info">
                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            ₹
                            {Number(
                              item.price
                            ).toFixed(2)}{' '}
                            each
                          </span>
                        </div>

                        <strong className="cart-item-total">
                          ₹
                          {lineTotal(item).toFixed(2)}
                        </strong>
                      </div>

                      <div className="cart-item-bottom">

                        <div className="quantity-control">

                          <button
                            onClick={() =>
                              changeQty(key, -1)
                            }
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              changeQty(key, 1)
                            }
                          >
                            +
                          </button>

                        </div>

                        {!item.isCombo && (
                          <div className="cart-discount">
                            <span>
                              Discount
                            </span>

                            <input
                              type="number"
                              min="0"
                              value={
                                item.discount || ''
                              }
                              placeholder="₹0"
                              onChange={(e) =>
                                setLineDiscount(
                                  key,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        )}

                        <button
                          className="cart-remove"
                          onClick={() =>
                            removeItem(key)
                          }
                        >
                          ×
                        </button>

                      </div>

                    </div>
                  );
                })
              )}

            </div>

            {/* BILL CALCULATION */}

            {cart.length > 0 && (
              <>

                <div className="billing-calculation">

                  <div>
                    <span>Subtotal</span>
                    <strong>
                      ₹{subtotal.toFixed(2)}
                    </strong>
                  </div>

                  <div className="bill-discount-row">
                    <span>Bill Discount</span>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        style={{ padding: '6px 8px' }}
                      >
                        <option value="fixed">₹ Fixed</option>
                        <option value="percent">% Percent</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        placeholder={discountType === 'percent' ? '0%' : '₹0'}
                        value={billDiscount}
                        onChange={(e) =>
                          setBillDiscount(
                            e.target.value
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </div>
                  </div>

                  {discountType === 'percent' && billDiscount && (
                    <div className="row" style={{ justifyContent: 'flex-end', fontSize: 12, color: 'var(--chocolate)' }}>
                      = ₹{billDiscountAmount.toFixed(2)} off
                    </div>
                  )}

                </div>

                {/* PAYMENT */}

                <div className="billing-payment">

                  <div className="payment-heading">
                    <span>Payment</span>

                    <label className="split-toggle">
                      <input
                        type="checkbox"
                        checked={isSplitPayment}
                        onChange={(e) => {
                          setIsSplitPayment(
                            e.target.checked
                          );

                          if (
                            !e.target.checked
                          ) {
                            setSplitAmounts({
                              cash: '',
                              upi: '',
                              card: '',
                            });
                          }
                        }}
                      />

                      <span>
                        Split Payment
                      </span>
                    </label>
                  </div>

                  {!isSplitPayment ? (
                    <div className="payment-buttons">

                      {PAYMENT_OPTIONS.map(
                        (payment) => (
                          <button
                            key={payment.id}
                            className={
                              paymentMode ===
                              payment.id
                                ? 'payment-method active'
                                : 'payment-method'
                            }
                            onClick={() =>
                              setPaymentMode(
                                payment.id
                              )
                            }
                          >
                            <span className="payment-method-icon">
                              {payment.icon}
                            </span>

                            <span>
                              {payment.label}
                            </span>
                          </button>
                        )
                      )}

                    </div>
                  ) : (
                    <div className="split-payment-box">

                      <div className="split-total">
                        Split total:{' '}
                        <strong>
                          ₹{total.toFixed(2)}
                        </strong>
                      </div>

                      <div className="split-inputs">

                        <div>
                          <label>Cash</label>

                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={
                              splitAmounts.cash
                            }
                            onChange={(e) =>
                              setSplitAmounts({
                                ...splitAmounts,
                                cash: e.target
                                  .value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label>UPI</label>

                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={
                              splitAmounts.upi
                            }
                            onChange={(e) =>
                              setSplitAmounts({
                                ...splitAmounts,
                                upi: e.target
                                  .value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label>Card</label>

                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={
                              splitAmounts.card
                            }
                            onChange={(e) =>
                              setSplitAmounts({
                                ...splitAmounts,
                                card: e.target
                                  .value,
                              })
                            }
                          />
                        </div>

                      </div>

                    </div>
                  )}

                </div>

                {/* TOTAL */}

                <div className="billing-total-box">

                  <span>Total Amount</span>

                  <strong>
                    ₹{total.toFixed(2)}
                  </strong>

                </div>

                {/* ACTIONS */}

                <div className="billing-actions">

                  <button
                    className="billing-hold-btn"
                    onClick={holdBill}
                    disabled={saving}
                  >
                    Hold Bill
                  </button>

                  <button
                    className="billing-complete-btn"
                    onClick={completeBill}
                    disabled={saving}
                  >
                    {saving
                      ? 'Processing...'
                      : 'Complete Sale'}
                  </button>

                </div>

              </>
            )}

          </div>

          {/* LAST BILL */}

          {lastBill && (
            <div className="last-bill-card">

              <div className="last-bill-header">

                <div>
                  <span>SALE COMPLETED</span>

                  <strong>
                    {lastBill.bill_no}
                  </strong>
                </div>

                <div className="last-bill-check">
                  ✓
                </div>

              </div>

              <div className="last-bill-items">
                {lastBill.items.map((item) => (
                  <div
                    key={item.id}
                    className="last-bill-row"
                  >
                    <span>
                      {item.product_name} ×
                      {item.quantity}
                    </span>

                    <strong>
                      ₹{item.price.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="last-bill-total">
                <span>Total</span>

                <strong>
                  ₹
                  {lastBill.total_amount.toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="last-bill-actions">

                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    reprintBill(lastBill.id)
                  }
                >
                  Reprint
                </button>

                <button
                  className="last-bill-cancel"
                  onClick={() =>
                    cancelBill(lastBill.id)
                  }
                >
                  Cancel Bill
                </button>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}