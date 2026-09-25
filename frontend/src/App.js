import React, { useState } from 'react';
import {
  FaChartPie, FaCashRegister, FaIceCream, FaGift, FaTruck, FaWarehouse,
  FaMoneyBillWave, FaClipboardCheck, FaLock, FaChartLine, FaLightbulb,
  FaUsers, FaCog, FaSignOutAlt, FaChevronDown, FaChevronRight, FaLayerGroup,
  FaTasks, FaCoins, FaUserShield, FaUndoAlt, FaHistory, FaBalanceScale, FaFileInvoiceDollar, FaReceipt, FaShieldAlt
} from 'react-icons/fa';
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
import ReturnsPage from './pages/ReturnsPage';
import PnLPage from './pages/PnLPage';
import HistoryPage from './pages/HistoryPage';
import SupplierLedgerPage from './pages/SupplierLedgerPage';
import BillHistoryPage from './pages/BillHistoryPage';
import AuditLogPage from './pages/AuditLogPage';
import LoginPage from './pages/LoginPage';
import { getCurrentUser, logout } from './api';
import './App.css';

// Top-level items (always visible, no group) + grouped sections (collapsible)
const TOP_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FaChartPie, perm: null },
  { key: 'billing', label: 'Billing', icon: FaCashRegister, perm: null },
];

const GROUPS = [
  {
    key: 'masters', label: 'Masters', icon: FaLayerGroup,
    items: [
      { key: 'products', label: 'Products & Recipes', icon: FaIceCream, perm: 'canManageInventory' },
      { key: 'offers', label: 'Offers', icon: FaGift, perm: 'canManageInventory' },
      { key: 'suppliers', label: 'Suppliers', icon: FaWarehouse, perm: 'canManagePurchases' },
      { key: 'ledger', label: 'Supplier Ledger', icon: FaFileInvoiceDollar, perm: 'canManagePurchases' },
      { key: 'billhistory', label: 'Bill History', icon: FaReceipt, perm: null },
      { key: 'history', label: 'Price & Recipe History', icon: FaHistory, perm: 'canManageInventory' },
    ]
  },
  {
    key: 'operations', label: 'Operations', icon: FaTasks,
    items: [
      { key: 'purchases', label: 'Purchases', icon: FaTruck, perm: 'canManagePurchases' },
      { key: 'stockcount', label: 'Available Stock', icon: FaClipboardCheck, perm: 'canManageInventory' },
      { key: 'returns', label: 'Returns & Refunds', icon: FaUndoAlt, perm: 'canManagePurchases' },
    ]
  },
  {
    key: 'finance', label: 'Finance', icon: FaCoins,
    items: [
      { key: 'expenses', label: 'Expenses', icon: FaMoneyBillWave, perm:'canManageExpenses' },
      { key: 'closing', label: 'Day Closing', icon: FaLock, perm: null },
      { key: 'reports', label: 'Reports', icon: FaChartLine, perm: 'canViewReports' },
      { key: 'pnl', label: 'P&L Report', icon: FaBalanceScale, perm: 'canViewReports' },
      { key: 'insights', label: 'Insights', icon: FaLightbulb, perm: 'canViewReports' },
    ]
  },
  {
    key: 'admin', label: 'Admin', icon: FaUserShield,
    items: [
      { key: 'users', label: 'Staff', icon: FaUsers, perm: 'canManageUsers' },
      { key: 'auditlog', label: 'Audit Log', icon: FaShieldAlt, perm: 'canViewReports' },
      { key: 'settings', label: 'Settings', icon: FaCog, perm: 'canManageUsers' },
    ]
  },
];

const ALL_ITEMS = [...TOP_ITEMS, ...GROUPS.flatMap(g => g.items)];

const PAGES = {
  dashboard: DashboardPage, billing: BillingPage, products: ProductsPage, offers: OffersPage,
  purchases: PurchasesPage, suppliers: SuppliersPage, expenses: ExpensesPage,
  stockcount: AvailableStockPage, closing: ClosingPage, reports: ReportsPage,
  insights: InsightsPage, users: UsersPage, settings: SettingsPage,
  returns: ReturnsPage, pnl: PnLPage, history: HistoryPage, ledger: SupplierLedgerPage, billhistory: BillHistoryPage, auditlog: AuditLogPage
};

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [tab, setTab] = useState('dashboard');
  const [openGroups, setOpenGroups] = useState({ masters: true, operations: true, finance: false, admin: false });

  if (!user) {
    return <LoginPage onLoggedIn={() => setUser(getCurrentUser())} />;
  }

  const perms = user.permissions || {};
  const isCashierOnly = user.role === 'cashier';

  const itemVisible = (item) => {
    if (isCashierOnly && (item.key === 'dashboard' || item.key === 'closing')) return false;
    if (!item.perm) return true;
    return perms[item.perm];
  };

  const toggleGroup = (key) => setOpenGroups(g => ({ ...g, [key]: !g[key] }));

  const PageComponent = PAGES[tab] || DashboardPage;
  const activeLabel = ALL_ITEMS.find(i => i.key === tab)?.label || 'Dashboard';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">🍦</div>
          <div className="brand-text">Ice Cream Shop</div>
        </div>

        <nav className="sidebar-nav">
          {TOP_ITEMS.filter(itemVisible).map(item => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={`sidebar-link ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
                <Icon className="sidebar-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {GROUPS.map(group => {
            const visibleItems = group.items.filter(itemVisible);
            if (visibleItems.length === 0) return null;
            const GroupIcon = group.icon;
            const isOpen = openGroups[group.key];
            return (
              <div key={group.key} className="sidebar-group">
                <button className="sidebar-group-header" onClick={() => toggleGroup(group.key)}>
                  <GroupIcon className="sidebar-icon" />
                  <span>{group.label}</span>
                  {isOpen ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
                </button>
                <div className={`sidebar-group-items ${isOpen ? 'open' :''}`}>
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.key} className={`sidebar-link nested ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
                        <Icon className="sidebar-icon" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div>
              <div className="user-name">{user.username}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Logout">
            <FaSignOutAlt />
          </button>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <h2>{activeLabel}</h2>
        </header>
        <main className="app-main">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}

export default App;
