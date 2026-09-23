import React, { useEffect, useState } from 'react';
import { api } from '../api';

const BACKEND = 'http://localhost:6001';

export default function BillingPage() {
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cart, setCart] = useState([]); // [{ product_id, name, price, quantity, discount }] or [{ combo_id, name, price, quantity }]
  const [paymentMode, setPaymentMode] = useState('cash');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', upi: '', card: '' });
  const [billDiscount, setBillDiscount] = useState('');
  const [lastBill, setLastBill] = useState(null);
  const [todaySales, setTodaySales] = useState(null);
  const [heldBills, setHeldBills] = useState([]); // client-side held carts

  const loadProducts = () => api.get('/products').then(setProducts).catch(() => setProducts([]));
  const loadCombos = () => api.get('/combos').then(data => setCombos(data.filter(c => c.is_currently_active))).catch(() => setCombos([]));
  const loadToday = () => api.get('/bills').then(setTodaySales).catch(() => setTodaySales(null));

  useEffect(() => { loadProducts(); loadCombos(); loadToday(); }, []);

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(i => i.product_id === product.id);
      if (existing) return c.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { product_id: product.id, name: product.name, price: product.selling_price, quantity: 1, discount: 0 }];
    });
  };

  const addComboToCart = (combo) => {
    setCart(c => {
      const existing = c.find(i => i.combo_id === combo.id);
      if (existing) return c.map(i => i.combo_id === combo.id ? { ...i, quantity: i.quantity + 1 } : i);
      const freeItem = combo.items.find(it => it.is_free);
      const label = freeItem ? `${combo.name} (+ free ${freeItem.product_name})` : combo.name;
      return [...c, { combo_id: combo.id, name: label, price: combo.price, quantity: 1, discount: 0, isCombo: true }];
    });
  };

  const changeQty = (key, delta) => {
    setCart(c => c.map(i => {
      const itemKey = i.combo_id ? `combo-${i.combo_id}` : `product-${i.product_id}`;
      return itemKey === key ? { ...i, quantity: i.quantity + delta } : i;
    }).filter(i => i.quantity > 0));
  };

  const setLineDiscount = (key, value) => {
    setCart(c => c.map(i => {
      const itemKey = i.combo_id ? `combo-${i.combo_id}` : `product-${i.product_id}`;
      return itemKey === key ? { ...i, discount: Number(value) || 0 } : i;
    }));
  };

  const lineTotal = (item) => Math.max(0, item.price * item.quantity - (item.discount || 0));
  const subtotal = cart.reduce((sum, i) => sum + lineTotal(i), 0);
  const billDiscountAmount = Number(billDiscount) || 0;
  const total = subtotal - billDiscountAmount;

  const clearCart = () => { setCart([]); setBillDiscount(''); };

  const holdBill = () => {
    if (cart.length === 0) return alert('Cart is empty');
    setHeldBills(h => [...h, { id: Date.now(), cart, billDiscount, paymentMode, heldAt: new Date().toLocaleTimeString() }]);
    clearCart();
  };

  const resumeBill = (held) => {
    setCart(held.cart);
    setBillDiscount(held.billDiscount);
    setPaymentMode(held.paymentMode);
    setHeldBills(h => h.filter(b => b.id !== held.id));
  };

  const discardHeld = (id) => setHeldBills(h => h.filter(b => b.id !== id));

  const completeBill = async () => {
    if (cart.length === 0) return alert('Cart is empty');

    let body = {
      discount: billDiscountAmount,
      lines: cart.map(i => i.combo_id
        ? { combo_id: i.combo_id, quantity: i.quantity }
        : { product_id: i.product_id, quantity: i.quantity, discount: i.discount }
      )
    };

    if (isSplitPayment) {
      const payments = Object.entries(splitAmounts)
        .filter(([, v]) => v && Number(v) > 0)
        .map(([mode, v]) => ({ mode, amount: Number(v) }));
      const splitTotal = payments.reduce((s, p) => s + p.amount, 0);
      if (payments.length < 2) return alert('Enter amounts for at least two payment modes to split');
      if (Math.abs(splitTotal - total) > 0.01) return alert(`Split amounts (₹${splitTotal.toFixed(2)}) must add up to the total (₹${total.toFixed(2)})`);
      body.payments = payments;
    } else {
      body.payment_mode = paymentMode;
    }

    try {
      const bill = await api.post('/bills', body);
      setLastBill(bill);
      clearCart();
      setSplitAmounts({ cash: '', upi: '', card: '' });
      loadToday();
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelBill = async (billId) => {
    if (!window.confirm('Cancel this bill? Stock will be restored.')) return;
    try {
      await api.post(`/bills/${billId}/cancel`, {});
      if (lastBill && lastBill.id === billId) setLastBill(null);
      loadToday();
      alert('Bill cancelled, stock restored');
    } catch (err) {
      alert(err.message);
    }
  };

  const reprintBill = (billId) => {
    window.open(`${BACKEND}/api/bills/${billId}/receipt`, '_blank');
  };

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
      <div style={{ flex: 2, minWidth: 300 }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Tap a product to add it</h4>
          <div className="product-grid">
            {products.map(p => (
              <div key={p.id} className="product-tile" onClick={() => addToCart(p)}>
                {p.name}
                <div style={{ fontWeight: 400, fontSize: 12, color: '#666' }}>₹{p.selling_price}</div>
              </div>
            ))}
          </div>
          {products.length === 0 && <p>No products yet — add some in Products & Recipes.</p>}
        </div>

        {combos.length > 0 && (
          <div className="card">
            <h4 style={{ marginTop: 0 }}>🎁 Active Offers</h4>
            <div className="product-grid">
              {combos.map(c => (
                <div key={c.id} className="product-tile" style={{ borderColor: '#ff9800' }} onClick={() => addComboToCart(c)}>
                  {c.name}
                  <div style={{ fontWeight: 400, fontSize: 12, color: '#666' }}>₹{c.price}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {todaySales && (
          <div className="card">
            <strong>Today:</strong> {todaySales.bill_count} bills, ₹{todaySales.total_sales.toFixed(2)} total sales
          </div>
        )}

        {heldBills.length > 0 && (
          <div className="card">
            <h4 style={{ marginTop: 0 }}>Held Bills</h4>
            {heldBills.map(h => (
              <div key={h.id} className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{h.cart.length} item(s) · held at {h.heldAt}</span>
                <div className="row">
                  <button className="btn btn-secondary" onClick={() => resumeBill(h)}>Resume</button>
                  <button className="btn btn-secondary" onClick={() => discardHeld(h.id)}>Discard</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 300 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Current Bill</h4>
            {cart.length > 0 && <button className="btn btn-secondary" onClick={holdBill}>Hold</button>}
          </div>

          {cart.map(item => {
            const key = item.combo_id ? `combo-${item.combo_id}` : `product-${item.product_id}`;
            return (
              <div key={key} className="cart-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{item.name}</span>
                  <div className="row">
                    <button className="btn btn-secondary" onClick={() => changeQty(key, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="btn btn-secondary" onClick={() => changeQty(key, 1)}>+</button>
                    <span style={{ minWidth: 60, textAlign: 'right' }}>₹{lineTotal(item).toFixed(2)}</span>
                  </div>
                </div>
                {!item.isCombo && (
                  <div className="row" style={{ marginTop: 4 }}>
                    <label style={{ fontSize: 12, color: '#888' }}>Item discount ₹</label>
                    <input
                      type="number"
                      style={{ width: 80 }}
                      value={item.discount || ''}
                      onChange={e => setLineDiscount(key, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {cart.length === 0 && <p style={{ color: '#888' }}>Cart is empty</p>}

          <div style={{ marginTop: 12 }}>
            <label>Bill-level Discount ₹</label>
            <input type="number" value={billDiscount} onChange={e => setBillDiscount(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <input type="checkbox" checked={isSplitPayment} onChange={e => setIsSplitPayment(e.target.checked)} /> Split Payment
            </label>
          </div>

          {!isSplitPayment ? (
            <div style={{ marginTop: 8 }}>
              <label>Payment mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <label>Split amounts (must total ₹{total.toFixed(2)})</label>
              <div className="row" style={{ marginTop: 4 }}>
                <input type="number" placeholder="Cash" style={{ flex: 1 }} value={splitAmounts.cash} onChange={e => setSplitAmounts({ ...splitAmounts, cash: e.target.value })} />
                <input type="number" placeholder="UPI" style={{ flex: 1 }} value={splitAmounts.upi} onChange={e => setSplitAmounts({ ...splitAmounts, upi: e.target.value })} />
                <input type="number" placeholder="Card" style={{ flex: 1 }} value={splitAmounts.card} onChange={e => setSplitAmounts({ ...splitAmounts, card: e.target.value })} />
              </div>
            </div>
          )}

          <div className="total-row">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={completeBill}>Complete Sale</button>
        </div>

        {lastBill && (
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0 }}>Last Bill: {lastBill.bill_no}</h4>
              <div className="row">
                <button className="btn btn-secondary" onClick={() => reprintBill(lastBill.id)}>Reprint</button>
                <button className="btn btn-secondary" onClick={() => cancelBill(lastBill.id)}>Cancel</button>
              </div>
            </div>
            {lastBill.items.map(i => (
              <div key={i.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{i.product_name} x{i.quantity}</span>
                <span>₹{i.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="total-row"><span>Total</span><span>₹{lastBill.total_amount.toFixed(2)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
