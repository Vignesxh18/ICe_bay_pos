import React, { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import BillingPage from './pages/BillingPage';
import PurchasesPage from './pages/PurchasesPage';
import AvailableStockPage from './pages/AvailableStockPage';
import SuppliersPage from './pages/SuppliersPage';
import OffersPage from './pages/OffersPage';
import ExpensesPage from './pages/ExpensesPage';
import ClosingPage from './pages/ClosingPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { getCurrentUser, logout } from './api';
import './App.css';

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [tab, setTab] = useState('dashboard');

  if (!user) {
    return <LoginPage onLoggedIn={() => setUser(getCurrentUser())} />;
  }

  const perms = user.permissions || {};

  // Cashiers see a minimal, fast-only interface
  const isCashierOnly = user.role === 'cashier';

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍦 Ice Cream Shop</h1>
        <nav>
          {!isCashierOnly && <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>}
          <button className={tab === 'billing' ? 'active' : ''} onClick={() => setTab('billing')}>Billing</button>
          {perms.canManageInventory && <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products & Recipes</button>}
          {perms.canManageInventory && <button className={tab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}>Offers</button>}
          {perms.canManagePurchases && <button className={tab === 'purchases' ? 'active' : ''} onClick={() => setTab('purchases')}>Purchases</button>}
          {perms.canManagePurchases && <button className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>Suppliers</button>}
          {perms.canManageExpenses && <button className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}>Expenses</button>}
          {perms.canManageInventory && <button className={tab === 'stockcount' ? 'active' : ''} onClick={() => setTab('stockcount')}>Available Stock</button>}
          {!isCashierOnly && <button className={tab === 'closing' ? 'active' : ''} onClick={() => setTab('closing')}>Day Closing</button>}
          {perms.canViewReports && <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Reports</button>}
          {perms.canViewReports && <button className={tab === 'insights' ? 'active' : ''} onClick={() => setTab('insights')}>Insights</button>}
          {perms.canManageUsers && <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Staff</button>}
          {perms.canManageUsers && <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>}
        </nav>
        <div className="row" style={{ color: 'white' }}>
          <span style={{ fontSize: 13 }}>{user.username} ({user.role})</span>
          <button className="btn btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && !isCashierOnly && <DashboardPage />}
        {tab === 'billing' && <BillingPage />}
        {tab === 'products' && perms.canManageInventory && <ProductsPage />}
        {tab === 'offers' && perms.canManageInventory && <OffersPage />}
        {tab === 'purchases' && perms.canManagePurchases && <PurchasesPage />}
        {tab === 'suppliers' && perms.canManagePurchases && <SuppliersPage />}
        {tab === 'expenses' && perms.canManageExpenses && <ExpensesPage />}
        {tab === 'stockcount' && perms.canManageInventory && <AvailableStockPage />}
        {tab === 'closing' && !isCashierOnly && <ClosingPage />}
        {tab === 'reports' && perms.canViewReports && <ReportsPage />}
        {tab === 'insights' && perms.canViewReports && <InsightsPage />}
        {tab === 'users' && perms.canManageUsers && <UsersPage />}
        {tab === 'settings' && perms.canManageUsers && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
