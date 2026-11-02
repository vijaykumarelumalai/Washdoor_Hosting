// src/App.jsx
// Washdoor POS & Customer Management Application

import React, { useState, useEffect, useCallback } from 'react';
import CustomerManagement from './components/CustomerManagement';
import POSModule from './components/POSModule';
import DashboardModule from './components/DashboardModule';
import CreateOrderModal from './components/CreateOrderModal';
import EditOrderModal from './components/EditOrderModal';
import { getOrders, updateOrderInSupabase, deleteOrderFromSupabase } from './services/customerService';
import { isSupabaseConfigured } from './lib/supabaseClient';

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

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'dashboard',
    title: 'dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
  },
  {
    id: 'order',
    label: 'Order',
    title: 'Order',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
  },
  {
    id: 'customer',
    label: 'Customer',
    title: 'Customer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    id: 'report',
    label: 'Report',
    title: 'Report',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    ),
  },
  {
    id: 'apps',
    label: 'Apps',
    title: 'Apps',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="8" height="8" rx="2"></rect>
        <rect x="14" y="2" width="8" height="8" rx="2"></rect>
        <rect x="2" y="14" width="8" height="8" rx="2"></rect>
        <rect x="14" y="14" width="8" height="8" rx="2"></rect>
      </svg>
    ),
  },
  {
    id: 'help',
    label: 'Help',
    title: 'Help',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
  },
  {
    id: 'account',
    label: 'Account',
    title: 'Account',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4"></circle>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      </svg>
    ),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extension panel (sidebar collapsed state)
  const [isNavCollapsed, setIsNavCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('washdoor_nav_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleNavCollapse = () => {
    setIsNavCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('washdoor_nav_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Orders state with cache support (authentically loaded from database, no hardcoded mock records)
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('washdoor_orders_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map((o) => {
            const s = String(o.order_status || o.status || '').toLowerCase();
            let norm = 'Order Received';
            if (s.includes('cancel')) norm = 'Cancelled';
            else if (s.includes('deliver') || s.includes('complete')) norm = 'Delivered';
            else if (s.includes('ready') || s.includes('billing')) norm = 'Ready';
            else if (s.includes('progress') || s.includes('wash')) norm = 'In Progress';
            else if (s.includes('receive') || s.includes('intake') || s.includes('overdue')) norm = 'Order Received';
            return { ...o, status: norm, order_status: norm };
          });
        }
      }
    } catch {}
    return [];
  });
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Topbar dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'currency' | 'language' | 'admin' | null
  const [currentCurrency, setCurrentCurrency] = useState(SAMPLE_CURRENCIES[0] || { symbol: '₹', code: 'IN', label: 'IN • ₹' });
  const [currentLanguage, setCurrentLanguage] = useState(SAMPLE_LANGUAGES[0] || { name: 'English', code: 'en' });

  // Theme State: 'dark' (default design) | 'light'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('washdoor_theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
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
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleUpdateOrderRecord = useCallback((updatedOrder) => {
    if (!updatedOrder) return;
    setOrders((prev) => {
      const next = prev.map((o) =>
        (o.id === updatedOrder.id || o.order_number === updatedOrder.order_number) ? updatedOrder : o
      );
      try {
        localStorage.setItem('washdoor_orders_cache', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Dedicated backend update service: persist change to Supabase customer_works
    const orderKey = updatedOrder.order_number || updatedOrder.id || updatedOrder.work_number;
    if (orderKey) {
      updateOrderInSupabase(orderKey, {
        status: updatedOrder.order_status || updatedOrder.status,
        customerName: updatedOrder.customer_name || updatedOrder.customer?.customer_name,
        mobileNumber: updatedOrder.mobile_number || updatedOrder.customer?.mobile_number,
        address: updatedOrder.address || updatedOrder.delivery_address || updatedOrder.customer?.address,
        serviceCategory: updatedOrder.service_category || updatedOrder.service_type || updatedOrder.preference,
        orderNotes: updatedOrder.order_notes || updatedOrder.special_instructions || updatedOrder.comments,
        totalAmount: updatedOrder.total_amount,
        advancePaid: updatedOrder.advance_paid,
        paymentStatus: updatedOrder.payment_status,
        paymentMethod: updatedOrder.payment_method,
        items: updatedOrder.items,
      }).catch((err) => console.warn('Background Supabase order update note:', err));
    }
  }, []);

  const handleDeleteOrderRecord = useCallback(async (orderId) => {
    if (!orderId) return;
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId && o.order_number !== orderId && o.work_number !== orderId);
      try {
        localStorage.setItem('washdoor_orders_cache', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await deleteOrderFromSupabase(orderId);
    } catch (err) {
      console.warn('Supabase delete order note:', err);
    }
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
        <div className={`brand-container ${isNavCollapsed ? 'collapsed' : ''}`}>
          <div className="brand" title="Washdoor • Laundry & Dry Clean">
            <div className="logo" aria-label="Washdoor Logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
              </svg>
            </div>
            {!isNavCollapsed && (
              <div className="brand-text-wrap">
                <div className="brand-name">Washdoor</div>
                <span className="sub" style={{ fontSize: '11px', color: '#8aa0be', fontWeight: '600' }}>
                  Laundry &amp; Dry Clean
                </span>
              </div>
            )}
          </div>

          {/* Extension panel toggle button (circle with < or > on border) */}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleNavCollapse}
            title={isNavCollapsed ? 'Expand navigation menu (Extension panel)' : 'Collapse navigation menu (Extension panel)'}
            aria-label={isNavCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isNavCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        <div className="spacer"></div>

        {isSupabaseConfigured() ? (
          <a
            href="https://supabase.com/dashboard/project/eunguuboxwbblioljwmy/editor/17680?schema=public&sort=customer_id:asc"
            target="_blank"
            rel="noopener noreferrer"
            className="top-pill top-pill-status"
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
            <span className="top-pill-label-full">● Supabase Live</span>
            <span className="top-pill-label-short">● Live</span>
          </a>
        ) : (
          <a
            href="https://supabase.com/dashboard/project/eunguuboxwbblioljwmy/editor/17680?schema=public&sort=customer_id:asc"
            target="_blank"
            rel="noopener noreferrer"
            className="top-pill top-pill-status"
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
            <span className="top-pill-label-full">● Local Master Mode</span>
            <span className="top-pill-label-short">● Local</span>
          </a>
        )}

        {/* Currency & Location Dropdown */}
        <div className="top-pill-dropdown-wrap">
          <button
            type="button"
            className={`top-pill top-pill-currency ${activeDropdown === 'currency' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown((prev) => (prev === 'currency' ? null : 'currency'));
            }}
            title="Select Sample Currency"
          >
            <span>📍</span>
            <span className="top-pill-label-full">{currentCurrency.label}</span>
            <span className="top-pill-label-short">{currentCurrency.symbol}</span>
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
            className={`top-pill top-pill-language ${activeDropdown === 'language' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown((prev) => (prev === 'language' ? null : 'language'));
            }}
            title="Select Sample Language"
          >
            <span>🌐</span>
            <span className="top-pill-label-full">{currentLanguage.name}</span>
            <span className="top-pill-label-short">{currentLanguage.code.toUpperCase()}</span>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span className="theme-toggle-label">Dark Mode</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
              <span className="theme-toggle-label">Light Mode</span>
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

      {/* ── Sidebar Navigation ── */}
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${isNavCollapsed ? ' collapsed' : ''}${sidebarOpen ? ' mobile-open' : ''}`} aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'order' && activeTab === 'pos') ||
            (item.id === 'customer' && activeTab === 'customers');
          return (
            <button
              key={item.id}
              type="button"
              className={`nav ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              title={item.title}
              data-nav={item.id}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </aside>

      {/* ── Main Content ── */}
      <main className={`main ${isNavCollapsed ? 'sidebar-collapsed' : ''}`}>
        {activeTab === 'dashboard' ? (
          <DashboardModule
            orders={orders}
            loadingOrders={loadingOrders}
            currencySymbol={currentCurrency?.symbol || '₹'}
            onCreateOrder={() => setIsModalOpen(true)}
            onNavigateTab={(tab) => {
              if (tab === 'pos' || tab === 'orders') setActiveTab('order');
              else if (tab === 'customers') setActiveTab('customer');
              else setActiveTab(tab);
            }}
            onRefreshOrders={loadOrders}
            onEditOrder={(orderToEdit) => setEditingOrder(orderToEdit)}
            showToast={showToast}
          />
        ) : (activeTab === 'order' || activeTab === 'pos') ? (
          <POSModule
            orders={orders}
            loadingOrders={loadingOrders}
            onRefreshOrders={loadOrders}
            onCreateOrder={() => setIsModalOpen(true)}
            currencySymbol={currentCurrency?.symbol || '₹'}
            showToast={showToast}
            onEditOrder={(orderToEdit) => setEditingOrder(orderToEdit)}
            onOrderCreated={loadOrders}
            onNavigateTab={(tab) => {
              if (tab === 'pos' || tab === 'orders') setActiveTab('order');
              else if (tab === 'customers') setActiveTab('customer');
              else setActiveTab(tab);
            }}
            onUpdateOrder={handleUpdateOrderRecord}
            onDeleteOrder={handleDeleteOrderRecord}
          />
        ) : (activeTab === 'customer' || activeTab === 'customers') ? (
          <CustomerManagement showToast={showToast} />
        ) : (
          <div className="welcome-screen-wrap">
            <div className="welcome-screen-card">
              <div className="welcome-screen-logo-badge">
                <div className="welcome-logo-icon">W</div>
                <span className="welcome-brand-text">Washdoor Ranipet</span>
              </div>
              <h1 className="welcome-heading">Welcom to washdoor</h1>
              <p className="welcome-subtitle">
                Welcome to washdoor • Laundry &amp; Dry Cleaning Management Portal
              </p>
              {activeTab !== 'dashboard' && (
                <div className="welcome-tab-pill">
                  <span>Current Section:</span>
                  <strong>{NAV_ITEMS.find((item) => item.id === activeTab)?.label || activeTab}</strong>
                </div>
              )}
              <div className="welcome-quick-actions">
                <button
                  type="button"
                  className="welcome-action-btn primary"
                  onClick={() => setActiveTab('order')}
                >
                  <span>Go to Order</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="welcome-action-btn secondary"
                  onClick={() => setActiveTab('customer')}
                >
                  <span>Go to Customer</span>
                </button>
              </div>
            </div>
          </div>
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
