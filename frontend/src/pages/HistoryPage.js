import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function HistoryPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [priceHistory, setPriceHistory] = useState([]);
  const [recipeHistory, setRecipeHistory] = useState([]);

  useEffect(() => {
    api.get('/products').then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!productId) { setPriceHistory([]); setRecipeHistory([]); return; }
    api.get(`/products/${productId}/price-history`).then(setPriceHistory).catch(() => setPriceHistory([]));
    api.get(`/products/${productId}/recipe-history`).then(setRecipeHistory).catch(() => setRecipeHistory([]));
  }, [productId]);

  return (
    <div>
      <div className="card">
        <h4 style={{ marginTop: 0 }}>Price & Recipe History</h4>
        <p style={{ fontSize: 13, color: 'var(--chocolate)', marginTop: -6 }}>
          See every past selling-price change and every past recipe version for a product. Editing a product
          today never changes the cost/profit already recorded on old bills — this is just for your own
          reference and audit trail.
        </p>
        <label>Select Product</label>
        <select style={{ width: '100%', maxWidth: 320 }} value={productId} onChange={e => setProductId(e.target.value)}>
          <option value="">-- choose a product --</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {productId && (
        <>
          <div className="card">
            <h4 style={{ marginTop: 0 }}>Price History</h4>
            <table>
              <thead><tr><th>Changed On</th><th>Old Price</th><th>New Price</th><th>Changed By</th></tr></thead>
              <tbody>
                {priceHistory.map(h => (
                  <tr key={h.id}>
                    <td>{h.changed_at}</td>
                    <td>{h.old_price != null ? `₹${h.old_price.toFixed(2)}` : '-'}</td>
                    <td>₹{h.new_price.toFixed(2)}</td>
                    <td>{h.changed_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {priceHistory.length === 0 && <p>No price changes recorded yet for this product.</p>}
          </div>

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Recipe History (past versions)</h4>
            <table>
              <thead><tr><th>Raw Material</th><th>Quantity</th><th>Active Until</th><th>Changed By</th></tr></thead>
              <tbody>
                {recipeHistory.map(h => (
                  <tr key={h.id}>
                    <td>{h.raw_material_name}</td>
                    <td>{h.quantity_required} {h.unit}</td>
                    <td>{h.effective_to}</td>
                    <td>{h.changed_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipeHistory.length === 0 && <p>No recipe changes recorded yet for this product (current recipe is the original one).</p>}
          </div>
        </>
      )}
    </div>
  );
}
