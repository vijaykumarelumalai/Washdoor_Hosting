// src/App.jsx
// Washdoor POS & Customer Management Application

import React, { useState, useEffect, useCallback } from 'react';
import CustomerManagement from './components/CustomerManagement';
import POSModule from './components/POSModule';
import CreateOrderModal from './components/CreateOrderModal';
import OrderStatusModal from './components/OrderStatusModal';
import EditOrderModal from './components/EditOrderModal';
import { getOrders } from './services/customerService';
import masterOrders from './data/masterOrders.json';
import { isSupabaseConfigured } from './lib/supabaseClient';
import './styles/OrderStatusModal.css';

const SAMPLE_CURRENCIES = [
  { code: 'IN', symbol: '₹', label: 'IN • ₹', name: 'India (INR - ₹)' },
  { code: 'US', symbol: '$', label: 'US • $', name: 'United States (USD - $)' },
  { code: 'AE', symbol: 'AED', label: 'AE • AED', name: 'UAE (AED - د.إ)' },
  { code: 'UK', symbol: '£', label: 'UK • £', name: 'United Kingdom (GBP - £)' },
  { code: 'EU', symbol: '€', label: 'EU • €', name: 'European Union (EUR - €)' },
  { code: 'SG', symbol: 'S$', label: 'SG • S$', name: 'Singapore (SGD - S$)' },
  { code: 'CA', symbol: 'C$', label: 'CA • C$', name: 'Canada (CAD - C$)' },
  { code: 'AU', symbol: 'A$', label: 'AU • A$', name: 'Australia (AUD - A$)' },
];

const SAMPLE_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'es', name: 'Spanish', native: 'Español' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusOrder, setSelectedStatusOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [statusModalViewBill, setStatusModalViewBill] = useState(false);

  // Orders state with cache support and master orders default
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('washdoor_orders_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= masterOrders.length) {
          // Normalize any legacy status tags from cache
          return parsed.map((o) => {
            const s = String(o.order_status || o.status || '').toLowerCase();
            let norm = 'In Progress';
            if (s.includes('cancel')) norm = 'Cancelled';
            else if (s.includes('deliver') || s.includes('complete')) norm = 'Delivered';
            else if (s.includes('ready') || s.includes('billing')) norm = 'Ready';
            else if (s.includes('receive') || s.includes('intake') || s.includes('overdue')) norm = 'Received';
            else if (s.includes('progress') || s.includes('wash')) norm = 'In Progress';
            return { ...o, status: norm, order_status: norm };
          });
        }
      }
    } catch {}
    return masterOrders;
  });
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Topbar dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'currency' | 'language' | 'admin' | null
  const [currentCurrency, setCurrentCurrency] = useState(SAMPLE_CURRENCIES[0] || { symbol: '₹', code: 'IN', label: 'IN • ₹' });
  const [currentLanguage, setCurrentLanguage] = useState(SAMPLE_LANGUAGES[0] || { name: 'English', code: 'en' });

  // Theme State: 'light' (default matching screenshot) | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('washdoor_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
    try {
      localStorage.setItem('washdoor_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(next === 'light' ? '☀️ Switched to Light Theme' : '🌙 Switched to Dark Theme');
      return next;
    });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.top-pill-dropdown-wrap')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Toast helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  }, []);

  // Fetch orders from Supabase with local cache sync
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const { data, error } = await getOrders();
    setLoadingOrders(false);

    if (error) {
      console.warn('Orders fetch note:', error.message);
    } else if (data && Array.isArray(data)) {
      setOrders(data);
      try {
        localStorage.setItem('washdoor_orders_cache', JSON.stringify(data));
      } catch {}
      setSelectedStatusOrder((prev) => {
        if (!prev) return null;
        return data.find((o) => o.order_number === prev.order_number || o.order_id === prev.order_id) || prev;
      });
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenOrderStatus = (order, viewBill = false) => {
    if (viewBill) {
      showToast('bill viewed!');
      return;
    }
    setSelectedStatusOrder(order);
    setStatusModalViewBill(false);
    setIsStatusModalOpen(true);
  };

  const handleUpdateOrderRecord = useCallback((updatedOrder) => {
    setOrders((prev) => {
      const next = prev.map((o) =>
        (o.id === updatedOrder.id || o.order_number === updatedOrder.order_number) ? updatedOrder : o
      );
      try {
        localStorage.setItem('washdoor_orders_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut: Press 'N' or 'n' to open Create Order
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'n' || e.key === 'N') && !isModalOpen) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          e.preventDefault();
          setIsModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <div className="app">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="logo">W</div>
          <div>
            <div className="brand-name">Washdoor</div>
            <span className="sub" style={{ fontSize: '11px', color: '#8aa0be', fontWeight: '600' }}>
              Ranipet
            </span>
          </div>
        </div>

        <div className="spacer"></div>

        {isSupabaseConfigured() ? (
          <a
            href="https://supabase.com/dashboard/project/bpnruunbdxxwadtrswao/editor/17640?schema=public"
            target="_blank"
            rel="noopener noreferrer"
            className="top-pill"
            style={{
              color: '#4ee2af',
              borderColor: '#175438',
              background: '#0b2923',
              fontSize: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Open Supabase Table Editor in new tab"
          >
            ● Supabase Live
          </a>
        ) : (
          <a
            href="https://supabase.com/dashboard/project/bpnruunbdxxwadtrswao/editor/17640?schema=public"
            target="_blank"
            rel="noopener noreferrer"
            className="top-pill"
            style={{
              color: '#ffd768',
              borderColor: '#59430f',
              background: '#332608',
              fontSize: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Open Supabase Table Editor in new tab (Configure Supabase in .env.local)"
          >
            ● Local Master Mode
          </a>
        )}

        {/* Currency & Location Dropdown */}
        <div className="top-pill-dropdown-wrap">
          <button
            type="button"
            className={`top-pill ${activeDropdown === 'currency' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown((prev) => (prev === 'currency' ? null : 'currency'));
            }}
            title="Select Sample Currency"
          >
            <span>📍</span>
            <span>{currentCurrency.label}</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'transform 0.2s ease',
                transform: activeDropdown === 'currency' ? 'rotate(180deg)' : 'none',
                opacity: 0.8,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {activeDropdown === 'currency' && (
            <div className="top-pill-menu" style={{ minWidth: '220px' }}>
              <div className="top-pill-menu-title">Sample Currencies</div>
              {SAMPLE_CURRENCIES.map((cur) => (
                <button
                  key={cur.code}
                  type="button"
                  className={`top-pill-item ${currentCurrency.code === cur.code ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentCurrency(cur);
                    setActiveDropdown(null);
                    showToast(`Currency changed to ${cur.name}`);
                  }}
                >
                  <span>{cur.name}</span>
                  <span className="top-pill-item-symbol">
                    {cur.symbol}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Dropdown */}
        <div className="top-pill-dropdown-wrap">
          <button
            type="button"
            className={`top-pill ${activeDropdown === 'language' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown((prev) => (prev === 'language' ? null : 'language'));
            }}
            title="Select Sample Language"
          >
            <span>🌐</span>
            <span>{currentLanguage.name}</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'transform 0.2s ease',
                transform: activeDropdown === 'language' ? 'rotate(180deg)' : 'none',
                opacity: 0.8,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {activeDropdown === 'language' && (
            <div className="top-pill-menu" style={{ minWidth: '190px' }}>
              <div className="top-pill-menu-title">Sample Languages</div>
              {SAMPLE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`top-pill-item ${currentLanguage.code === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentLanguage(lang);
                    setActiveDropdown(null);
                    showToast(`Language set to ${lang.name} (${lang.native})`);
                  }}
                >
                  <span>{lang.name}</span>
                  <span className="top-pill-item-native">
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark / Light Theme Toggle Button */}
        <button
          type="button"
          className="top-pill theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle theme"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '6px 12px',
            fontSize: '12.5px',
            fontWeight: '600',
          }}
        >
          {theme === 'dark' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Admin Details Dropdown (Avatar Circle Only) */}
        <div className="top-pill-dropdown-wrap">
          <button
            type="button"
            className={`top-admin-avatar-btn ${activeDropdown === 'admin' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown((prev) => (prev === 'admin' ? null : 'admin'));
            }}
            title="Tenant / Admin: Store Administrator"
            aria-label="Admin Avatar"
          >
            A
          </button>

          {activeDropdown === 'admin' && (
            <div className="top-pill-menu top-admin-dropdown" style={{ minWidth: '220px', right: 0, left: 'auto' }}>
              <div className="top-pill-menu-title">Admin Account</div>
              <div className="top-admin-details">
                <div className="top-admin-user-row">
                  <div className="top-admin-avatar-small">
                    A
                  </div>
                  <div className="top-admin-user-info">
                    <div className="top-admin-user-name">Store Administrator</div>
                    <div className="top-admin-user-email">admin@washdoor.in</div>
                  </div>
                </div>
                <div className="top-admin-branch">Branch: Ranipet Store #1</div>
                <div className="top-admin-status">
                  <span className="top-admin-status-dot"></span>
                  Session Active
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Sidebar: Orders & POS, Customers ── */}
      <aside className="sidebar">
        <button
          type="button"
          className={`nav ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
          title="Orders & POS Intake Register"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Orders &amp; POS
        </button>

        <button
          type="button"
          className={`nav ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
          title="Customer Records & Master Data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Customers
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="main">
        {activeTab === 'pos' ? (
          <POSModule
            orders={orders}
            loadingOrders={loadingOrders}
            onRefreshOrders={loadOrders}
            onCreateOrder={() => setIsModalOpen(true)}
            currencySymbol={currentCurrency?.symbol || '₹'}
            showToast={showToast}
            onOpenOrderStatus={handleOpenOrderStatus}
            onEditOrder={(orderToEdit) => setEditingOrder(orderToEdit)}
            onOrderCreated={loadOrders}
            onNavigateTab={setActiveTab}
            onUpdateOrder={handleUpdateOrderRecord}
          />
        ) : (
          <CustomerManagement showToast={showToast} />
        )}
      </main>

      {/* ── Create Order Modal ── */}
      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOrderSuccess={() => {
          loadOrders();
        }}
        showToast={showToast}
      />

      {/* ── Laundry Order Status Modal ── */}
      <OrderStatusModal
        isOpen={isStatusModalOpen}
        order={selectedStatusOrder}
        initialViewBill={statusModalViewBill}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedStatusOrder(null);
          setStatusModalViewBill(false);
        }}
        onOrderUpdated={loadOrders}
        onEditOrder={(orderToEdit) => setEditingOrder(orderToEdit)}
        showToast={showToast}
        currencySymbol={currentCurrency.symbol}
      />

      {/* ── Edit Order Modal (Interactive Product Catalog & Cart Dialog) ── */}
      <EditOrderModal
        isOpen={Boolean(editingOrder)}
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onOrderUpdated={loadOrders}
        showToast={showToast}
        currencySymbol={currentCurrency?.symbol || '₹'}
      />

      {/* ── Global Toast ── */}
      <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast" role="status">
        {toastMessage}
      </div>
    </div>
  );
}
