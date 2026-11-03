// src/App.jsx
// Washdoor POS & Customer Management Application

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CustomerManagement from './components/CustomerManagement';
import POSModule from './components/POSModule';
import DashboardModule from './components/DashboardModule';
import CreateOrderModal from './components/CreateOrderModal';
import EditOrderModal from './components/EditOrderModal';
import AuditLogModule from './components/AuditLogModule';
import SettingsModule from './components/SettingsModule';
import ReportsModule from './components/ReportsModule';
import { getOrders, updateOrderInSupabase, deleteOrderFromSupabase } from './services/customerService';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { useLanguage } from './context/LanguageContext';

const SAMPLE_CURRENCIES = [
  { code: 'IN', symbol: '₹', label: 'INR ₹', name: 'India (INR - ₹)' },
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
    label: 'Dashboard',
    title: 'Dashboard Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
  },
  {
    id: 'order',
    label: 'Orders',
    title: 'Orders & POS Intake',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <path d="M9 12h6"></path>
        <path d="M9 16h6"></path>
      </svg>
    ),
  },
  {
    id: 'customer',
    label: 'Customers',
    title: 'Customer Master Directory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    id: 'report',
    label: 'Reports',
    title: 'Reports & Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10"></line>
        <line x1="18" y1="20" x2="18" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    ),
  },
  {
    id: 'apps',
    label: 'Apps',
    title: 'Apps & Add-ons',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1.5"></rect>
        <rect width="7" height="7" x="14" y="3" rx="1.5"></rect>
        <rect width="7" height="7" x="14" y="14" rx="1.5"></rect>
        <rect width="7" height="7" x="3" y="14" rx="1.5"></rect>
      </svg>
    ),
  },
  {
    id: 'account',
    label: 'Account',
    title: 'Account Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M20 21a8 8 0 1 0-16 0"></path>
      </svg>
    ),
  },
  {
    id: 'audit',
    label: 'Audit Log',
    title: 'Audit Log & History',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M16 13H8"></path>
        <path d="M16 17H8"></path>
        <path d="M10 9H8"></path>
      </svg>
    ),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Centralized Global Search Bar State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Extension panel (sidebar collapsed state & hover-overlap expansion)
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);

  const toggleNavCollapse = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsNavCollapsed((prev) => {
      const next = !prev;
      setIsNavHovered(false);
      try {
        localStorage.setItem('washdoor_nav_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Centralized tab navigation: auto-collapses navigation menu whenever navigating to any module
  const navigateToTab = (tab) => {
    if (tab === 'pos' || tab === 'orders' || tab === 'order') setActiveTab('order');
    else if (tab === 'customers' || tab === 'customer') setActiveTab('customer');
    else if (tab === 'reports' || tab === 'report') setActiveTab('report');
    else if (tab === 'audit_log' || tab === 'auditlog' || tab === 'audit') setActiveTab('audit');
    else if (tab === 'account' || tab === 'settings') setActiveTab('account');
    else setActiveTab(tab);

    setSidebarOpen(false);
    setIsNavHovered(false);
  };

  const isSidebarExpanded = !isNavCollapsed || isNavHovered;

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
  const [currentCurrency, setCurrentCurrency] = useState(SAMPLE_CURRENCIES[0] || { symbol: '₹', code: 'IN', label: 'INR ₹' });
  // Language context
  const { language: currentLanguage, setLanguage: setCurrentLanguage, SAMPLE_LANGUAGES, t } = useLanguage();

  // Theme State: 'light' (default design) | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      const isManual = localStorage.getItem('washdoor_theme_manual') === 'true';
      const saved = localStorage.getItem('washdoor_theme');
      return (isManual && (saved === 'dark' || saved === 'light')) ? saved : 'light';
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
      try {
        localStorage.setItem('washdoor_theme_manual', 'true');
        localStorage.setItem('washdoor_theme', next);
      } catch {}
      showToast(next === 'light' ? t('switched_light') : t('switched_dark'));
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
  // Keyboard shortcuts: 'N' for new order, 'Ctrl+K' / 'Cmd+K' for global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'n' || e.key === 'N') && !isModalOpen) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          e.preventDefault();
          setIsModalOpen(true);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.topbar-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === 'Escape') {
        setIsSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Click outside to dismiss search results popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.topbar-search-wrap')) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Compute live search matches across customer name, phone number, and order ID
  const searchMatches = useMemo(() => {
    if (!globalSearchQuery || !globalSearchQuery.trim()) return [];
    const rawQ = globalSearchQuery.trim().toLowerCase();
    const cleanDigits = rawQ.replace(/\D/g, '');

    return orders.filter((o) => {
      const num = String(o.order_number || o.id || '').toLowerCase();
      const numDigits = num.replace(/\D/g, '');
      const name = String(o.customer_name || o.customer?.customer_name || '').toLowerCase();
      const phone = String(o.mobile_number || o.customer?.mobile_number || '').replace(/\D/g, '');
      const addr = String(o.address || o.delivery_address || o.customer?.address || '').toLowerCase();
      const srv = String(o.service_category || o.preference || o.service_type || '').toLowerCase();

      const matchNum = num.includes(rawQ) || (cleanDigits.length > 0 && numDigits.includes(cleanDigits));
      const matchName = name.includes(rawQ);
      const matchPhone = cleanDigits.length > 0 && phone.includes(cleanDigits);
      const matchAddr = addr.includes(rawQ);
      const matchSrv = srv.includes(rawQ);

      return matchNum || matchName || matchPhone || matchAddr || matchSrv;
    });
  }, [orders, globalSearchQuery]);

  return (
    <div className="app">
      {/* ── Topbar ── */}
      <header className={`topbar ${isNavCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="topbar-mobile-menu-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Mobile-only brand */}
        <div className="topbar-mobile-brand">
          <div className="topbar-mobile-logo">
            <img src="/logo.png" alt="Washdoor Logo" />
          </div>
          <span className="topbar-mobile-name">Washdoor</span>
        </div>

        {/* ── Centralized Global Search Bar ── */}
        <div className="topbar-search-wrap">
          <div className="topbar-search-box">
            <svg
              className="topbar-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="topbar-search-input"
              placeholder="Search by Order ID, Customer Name, or Phone Number..."
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => {
                if (globalSearchQuery.trim()) setIsSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('order');
                  setIsSearchDropdownOpen(false);
                } else if (e.key === 'Escape') {
                  setIsSearchDropdownOpen(false);
                }
              }}
              aria-label="Centralized Search"
            />
            {globalSearchQuery && (
              <button
                type="button"
                className="topbar-search-clear-btn"
                onClick={() => {
                  setGlobalSearchQuery('');
                  setIsSearchDropdownOpen(false);
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <div className="topbar-search-shortcut" title="Press Ctrl+K or ⌘K to search">
              <kbd>Ctrl + K</kbd>
            </div>
          </div>

          {/* Live Search Results Dropdown */}
          {isSearchDropdownOpen && globalSearchQuery.trim() && (
            <div className="topbar-search-dropdown" role="listbox">
              <div className="topbar-search-dropdown-head">
                <span>Matching Orders &amp; Customers</span>
                <span className="topbar-search-count-badge">
                  {searchMatches.length} {searchMatches.length === 1 ? 'match' : 'matches'}
                </span>
              </div>

              {searchMatches.length === 0 ? (
                <div className="topbar-search-empty">
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🔍</div>
                  <div style={{ fontWeight: 650, color: 'inherit' }}>No matching records found</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Try searching by full 10-digit number, customer name, or order ID (e.g. ORD-00020).
                  </div>
                </div>
              ) : (
                <div className="topbar-search-results-list">
                  {searchMatches.slice(0, 6).map((ord) => {
                    const custName = ord.customer_name || ord.customer?.customer_name || 'Walk-in Customer';
                    const orderNum = ord.order_number || ord.order_id || ord.id || '—';
                    const phone = ord.formatted_mobile || ord.mobile_number || ord.customer?.mobile_number || '—';
                    const status = ord.order_status || ord.status || 'Received';
                    const total = ord.total_amount || ord.grand_total || ord.bill_amount || 0;

                    return (
                      <div
                        key={ord.id || orderNum}
                        className="topbar-search-result-item"
                        onClick={() => {
                          setActiveTab('order');
                          setIsSearchDropdownOpen(false);
                        }}
                      >
                        <div className="topbar-search-item-left">
                          <span className="topbar-search-order-pill">{orderNum}</span>
                          <div className="topbar-search-cust-info">
                            <span className="topbar-search-cust-name">{custName}</span>
                            <span className="topbar-search-cust-phone">
                              📞 {phone}
                            </span>
                          </div>
                        </div>
                        <div className="topbar-search-item-right">
                          <span className="topbar-search-status-tag">{status}</span>
                          <span className="topbar-search-amount">
                            {currentCurrency?.symbol || '₹'}{Number(total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                className="topbar-search-dropdown-footer"
                onClick={() => {
                  setActiveTab('order');
                  setIsSearchDropdownOpen(false);
                }}
              >
                <span>View all matching orders in Orders Register</span>
                <kbd>↵ Enter</kbd>
              </div>
            </div>
          )}
        </div>

        <div className="spacer"></div>

        {/* Notification Bell Icon */}
        <button
          type="button"
          className="topbar-notification-btn"
          title="Notifications"
          aria-label="Notifications"
          onClick={() => showToast('No new notifications')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="topbar-notification-dot" aria-hidden="true"></span>
        </button>

        {isSupabaseConfigured() ? (
          <a
            href="https://supabase.com/dashboard/project/eunguuboxwbblioljwmy/editor/17680?schema=public&sort=customer_id:asc"
            target="_blank"
            rel="noopener noreferrer"
            className="top-pill top-pill-status"
            style={{
              fontSize: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Open Supabase Table Editor in new tab"
          >
            <span className="top-pill-label-full">● {t('supabase_live')}</span>
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
            title={t('sample_languages')}
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
              <div className="top-pill-menu-title">{t('sample_languages')}</div>
              {SAMPLE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`top-pill-item ${currentLanguage.code === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentLanguage(lang);
                    setActiveDropdown(null);
                    showToast(t('language_set', { name: lang.name, native: lang.native }));
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
          title={theme === 'dark' ? t('switch_to_light') : t('switch_to_dark')}
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
              <span className="theme-toggle-label">{t('dark_mode')}</span>
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
              <span className="theme-toggle-label">{t('light_mode')}</span>
            </>
          )}
        </button>

        {/* Quick Reports & Download Audit Button in Topbar */}
        <button
          type="button"
          className="top-pill topbar-reports-btn"
          onClick={() => navigateToTab('report')}
          title="Open Reports & Audit Download Center"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '6px 12px',
            fontSize: '12.5px',
            fontWeight: '600',
            background: activeTab === 'report' ? 'rgba(59, 130, 246, 0.15)' : undefined,
            borderColor: activeTab === 'report' ? '#3b82f6' : undefined,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span className="theme-toggle-label">Reports &amp; Audit</span>
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
              <div className="top-pill-menu-title">{t('admin_account')}</div>
              <div className="top-admin-details">
                <div className="top-admin-user-row">
                  <div className="top-admin-avatar-small">
                    A
                  </div>
                  <div className="top-admin-user-info">
                    <div className="top-admin-user-name">{t('store_admin')}</div>
                    <div className="top-admin-user-email">admin@washdoor.in</div>
                  </div>
                </div>
                <div className="top-admin-branch">{t('branch_ranipet')}</div>
                <div className="top-admin-status">
                  <span className="top-admin-status-dot"></span>
                  {t('session_active')}
                </div>
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #2563eb',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: 650,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onClick={() => {
                      setActiveTab('account');
                      setActiveDropdown(null);
                    }}
                  >
                    <span>⚙️</span>
                    <span>Store Settings &amp; Profile</span>
                  </button>
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

      <aside
        className={`sidebar${isNavCollapsed ? ' collapsed' : ''}${isNavHovered ? ' hover-expanded' : ''}${sidebarOpen ? ' mobile-open' : ''}`}
        aria-label="Main Navigation"
        onMouseEnter={() => {
          if (isNavCollapsed) setIsNavHovered(true);
        }}
        onMouseLeave={() => {
          setIsNavHovered(false);
        }}
      >
        {/* Circular Extension Panel Toggle Button (positioned on right border) */}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleNavCollapse}
          title={isNavCollapsed ? 'Expand navigation menu (Extension panel)' : 'Collapse navigation menu (Extension panel)'}
          aria-label={isNavCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isNavCollapsed && !isNavHovered ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>

        {/* Sidebar Brand Header */}
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-logo" title="Washdoor">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
            </svg>
          </div>
          {isSidebarExpanded && (
            <div className="sidebar-brand-info">
              <span className="sidebar-brand-name">{t('brand_name', 'Washdoor')}</span>
              <span className="sidebar-brand-sub" title="Laundry &amp; Dry Clean POS">{t('brand_subtitle', 'Ranipet')}</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="sidebar-nav-items">
          {NAV_ITEMS.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'order' && (activeTab === 'pos' || activeTab === 'orders')) ||
              (item.id === 'customer' && (activeTab === 'customers' || activeTab === 'customer')) ||
              (item.id === 'report' && (activeTab === 'reports' || activeTab === 'report')) ||
              (item.id === 'audit' && (activeTab === 'audit' || activeTab === 'audit_log' || activeTab === 'auditlog'));
            return (
              <button
                key={item.id}
                type="button"
                className={`nav ${isActive ? 'active' : ''}`}
                onClick={() => navigateToTab(item.id)}
                title={!isSidebarExpanded ? (item.id === 'order' ? 'Orders & POS' : item.label) : undefined}
                data-nav={item.id}
              >
                {item.icon}
                {isSidebarExpanded && (
                  <span className="nav-label">
                    {item.id === 'order'
                      ? t('nav_orders_pos')
                      : item.id === 'customer'
                      ? t('nav_customers')
                      : item.id === 'audit'
                      ? t('nav_audit_log', 'Audit Log')
                      : item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Sidebar Bottom: Store Status Card & Sign Out Button ── */}
        <div className="sidebar-bottom">
          <div className="sidebar-store-card" title="Ranipet Store #1 • Live Counter Active">
            <div className="sidebar-store-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                <path d="M2 7h20" />
                <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
              </svg>
            </div>
            {isSidebarExpanded && (
              <div className="sidebar-store-info">
                <div className="sidebar-store-name">Ranipet Store #1</div>
                <div className="sidebar-store-status">
                  <span className="sidebar-store-dot">●</span> Live Counter Active
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-signout-btn nav-signout"
            onClick={() => {
              showToast('Signed out of session');
              setActiveTab('dashboard');
              setSidebarOpen(false);
            }}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {isSidebarExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={`main ${isNavCollapsed ? 'sidebar-collapsed' : ''}`}>
        {activeTab === 'dashboard' ? (
          <DashboardModule
            orders={orders}
            loadingOrders={loadingOrders}
            currencySymbol={currentCurrency?.symbol || '₹'}
            onCreateOrder={() => setIsModalOpen(true)}
            onNavigateTab={navigateToTab}
            onRefreshOrders={loadOrders}
            onEditOrder={(orderToEdit) => setEditingOrder(orderToEdit)}
            showToast={showToast}
            searchQuery={globalSearchQuery}
            onClearSearch={() => setGlobalSearchQuery('')}
            onUpdateOrder={handleUpdateOrderRecord}
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
            onNavigateTab={navigateToTab}
            onUpdateOrder={handleUpdateOrderRecord}
            onDeleteOrder={handleDeleteOrderRecord}
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
          />
        ) : (activeTab === 'customer' || activeTab === 'customers') ? (
          <CustomerManagement
            showToast={showToast}
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
          />
        ) : (activeTab === 'report' || activeTab === 'reports') ? (
          <ReportsModule
            orders={orders}
            loadingOrders={loadingOrders}
            currencySymbol={currentCurrency?.symbol || '₹'}
            showToast={showToast}
            onNavigateTab={navigateToTab}
          />
        ) : (activeTab === 'audit' || activeTab === 'audit_log' || activeTab === 'auditlog') ? (
          <AuditLogModule
            orders={orders}
            loadingOrders={loadingOrders}
            currencySymbol={currentCurrency?.symbol || '₹'}
            onNavigateTab={navigateToTab}
            showToast={showToast}
          />
        ) : (activeTab === 'account' || activeTab === 'settings' || activeTab === 'apps') ? (
          <SettingsModule
            showToast={showToast}
            initialTab={activeTab === 'apps' ? 'apps' : 'business_profile'}
            onSignOut={() => {
              showToast('Signed out of counter session');
              setActiveTab('dashboard');
            }}
          />
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
