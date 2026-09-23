import React, { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import BillingPage from './pages/BillingPage';
import PurchasesPage from './pages/PurchasesPage';
import AvailableStockPage from './pages/AvailableStockPage';
import SuppliersPage from './pages/SuppliersPage';
import OffersPage from './pages/OffersPage';
import './App.css';

function App() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍦 Ice Cream Shop</h1>
        <nav>
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
          <button className={tab === 'billing' ? 'active' : ''} onClick={() => setTab('billing')}>Billing</button>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products & Recipes</button>
          <button className={tab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}>Offers</button>
          <button className={tab === 'purchases' ? 'active' : ''} onClick={() => setTab('purchases')}>Purchases</button>
          <button className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>Suppliers</button>
          <button className={tab === 'stockcount' ? 'active' : ''} onClick={() => setTab('stockcount')}>Available Stock</button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'billing' && <BillingPage />}
        {tab === 'products' && <ProductsPage />}
        {tab === 'offers' && <OffersPage />}
        {tab === 'purchases' && <PurchasesPage />}
        {tab === 'suppliers' && <SuppliersPage />}
        {tab === 'stockcount' && <AvailableStockPage />}
      </main>
    </div>
  );
}

export default App;
