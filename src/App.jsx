// src/App.jsx
// Washdoor POS & Counter Intake Application
// Matching washdoor_create_order_updated.html layout and aesthetics

import React, { useState, useEffect, useCallback } from 'react';
import CreateOrderModal from './components/CreateOrderModal';
import OrderStatusModal from './components/OrderStatusModal';
import EditOrderModal from './components/EditOrderModal';
import CustomerManagement from './components/CustomerManagement';
import CustomerForm from './components/CustomerForm';
import OrderReviewCard from './components/OrderReviewCard';
import NoOrdersGraphic from './components/NoOrdersGraphic';
import { getOrders, updateCustomer } from './services/customerService';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { formatPhoneDisplay } from './utils/validation';
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

const AVATAR_COLORS = [
  '#1d72fe', // vibrant blue
  '#7c3aed', // purple
  '#10b981', // green
  '#f97316', // orange
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
];

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusOrder, setSelectedStatusOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  // Stale-while-revalidate: instant local cache for 0ms load time
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('washdoor_orders_cache');
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [statusModalViewBill, setStatusModalViewBill] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const handleOpenOrderStatus = (order, viewBill = false) => {
    setSelectedStatusOrder(order);
    setStatusModalViewBill(viewBill);
    setIsStatusModalOpen(true);
  };

  // Topbar dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'currency' | 'language' | 'admin' | 'sort' | null
  const [sortBy, setSortBy] = useState('newest');
  const [currentCurrency, setCurrentCurrency] = useState(SAMPLE_CURRENCIES[0] || { symbol: '₹', code: 'IN', label: 'IN • ₹' });
  const [currentLanguage, setCurrentLanguage] = useState(SAMPLE_LANGUAGES[0] || { name: 'English', code: 'en' });

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

  // Filtered and sorted orders with defensive guard
  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = safeOrders.filter((o) => {
    if (!o) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const orderNo = String(o.order_number || (o.id ? `ORDER-${o.id}` : '')).toLowerCase();
    const cust = o.customer || {};
    const custName = String(cust.customer_name || o.customer_name || '').toLowerCase();
    const phone = String(cust.mobile_number || o.mobile_number || '').toLowerCase();
    return orderNo.includes(term) || custName.includes(term) || phone.includes(term);
  }).sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }
    if (sortBy === 'amount_high') {
      return Number(b.total_amount || 0) - Number(a.total_amount || 0);
    }
    if (sortBy === 'amount_low') {
      return Number(a.total_amount || 0) - Number(b.total_amount || 0);
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

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
            href="https://supabase.com/dashboard/project/eunguuboxwbblioljwmy/editor/17680?schema=public&sort=customer_id:asc"
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
            href="https://supabase.com/dashboard/project/eunguuboxwbblioljwmy/editor/17680?schema=public&sort=customer_id:asc"
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
                  <span style={{ fontWeight: '700', color: currentCurrency.code === cur.code ? '#5bb3ff' : '#94a7c1' }}>
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
                  <span style={{ fontSize: '12px', color: currentLanguage.code === lang.code ? '#5bb3ff' : '#7d91ae' }}>
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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
            <div className="top-pill-menu" style={{ minWidth: '220px', right: 0, left: 'auto' }}>
              <div className="top-pill-menu-title">Admin Account</div>
              <div style={{ padding: '8px 12px', fontSize: '12.5px', color: '#d2dfee', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: '750',
                      color: '#fff',
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    A
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff' }}>Store Administrator</div>
                    <div style={{ color: '#889bb6', fontSize: '11px' }}>admin@washdoor.in</div>
                  </div>
                </div>
                <div style={{ color: '#889bb6', fontSize: '11.5px' }}>Branch: Ranipet Store #1</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', color: '#4ee2af', fontSize: '11.5px', fontWeight: '600' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ee2af' }}></span>
                  Session Active
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <button
          type="button"
          className={`nav ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span>▣</span> Orders
        </button>
        <button
          type="button"
          className={`nav ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <span>👤</span> Customers
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="main">
        {activeTab === 'orders' ? (
          <>
            <div className="page-head">
              <div>
                <h1>Orders &amp; Counter Intake</h1>
                <div className="muted">Unified counter POS intake, dispatch, and order management</div>
              </div>
              <button
                type="button"
                className="create"
                id="openCreate"
                onClick={() => setIsModalOpen(true)}
              >
                ＋ Create Order <span className="key" style={{ background: '#7668ff' }}>N</span>
              </button>
            </div>

            {/* ── Toolbar ── */}
            <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div className="toolbar-search-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7185a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search by name / phone / Order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={loadingOrders}
                  style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    loadOrders();
                    showToast('↻ Syncing orders with Supabase...');
                  }}
                  title="Reload orders from database"
                >
                  <svg
                    className={loadingOrders ? 'sync-spinner' : ''}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>{loadingOrders ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* ── Orders List with Skeleton Loader ── */}
            {loadingOrders && filteredOrders.length === 0 ? (
              <div className="orders">
                <div className="syncing-banner">
                  <span className="sync-spinner"></span>
                  <span>Connecting to Supabase cloud and fetching live orders…</span>
                </div>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="skeleton-order-card">
                    <span className="order-chevron" style={{ opacity: 0.2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                    <div className="skeleton-avatar skeleton-shimmer"></div>
                    <div className="skeleton-info-wrap">
                      <div className="skeleton-bar skeleton-bar-name skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-pill skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-type skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-phone skeleton-shimmer"></div>
                    </div>
                    <div className="skeleton-btn skeleton-shimmer"></div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-orders-container">
                <NoOrdersGraphic />
                <h2 className="empty-orders-title">No orders yet</h2>
                <p className="empty-orders-desc">
                  Create your first order to start tracking customer items, payments, and delivery.
                </p>
                <button
                  type="button"
                  className="create"
                  style={{ marginTop: '16px' }}
                  onClick={() => setIsModalOpen(true)}
                >
                  ＋ Create Order <span className="key" style={{ background: '#7668ff' }}>N</span>
                </button>
              </div>
            ) : (
              <div className="orders">
                {loadingOrders && (
                  <div className="syncing-banner" style={{ margin: '0 0 6px 0', alignSelf: 'flex-start' }}>
                    <span className="sync-spinner"></span>
                    <span>Syncing latest orders with Supabase…</span>
                  </div>
                )}
                {filteredOrders.map((o) => (
                  <OrderReviewCard
                    key={o.id}
                    order={o}
                    isExpanded={expandedOrderId === o.id}
                    onToggleExpand={() => {
                      setExpandedOrderId((prev) => (prev === o.id ? null : o.id));
                    }}
                    onEdit={(orderToEdit) => setEditingOrder(orderToEdit)}
                    onOpenStatus={(orderStatus) => handleOpenOrderStatus(orderStatus, false)}
                    onOpenBill={(orderBill) => handleOpenOrderStatus(orderBill, true)}
                    showToast={showToast}
                    currencySymbol={currentCurrency?.symbol || '₹'}
                  />
                ))}
              </div>
            )}
          </>
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
