// src/App.jsx
// Washdoor POS & Counter Intake Application
// Matching washdoor_create_order_updated.html layout and aesthetics

import React, { useState, useEffect, useCallback } from 'react';
import CreateOrderModal from './components/CreateOrderModal';
import OrderStatusModal from './components/OrderStatusModal';
import CustomerManagement from './components/CustomerManagement';
import CustomerForm from './components/CustomerForm';
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

  const handleOpenOrderStatus = (order) => {
    setSelectedStatusOrder(order);
    setIsStatusModalOpen(true);
  };

  // Topbar dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'currency' | 'language' | 'admin' | null
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

  // Filtered orders with defensive guard
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
            <span style={{ fontSize: '10px', marginLeft: '1px', opacity: 0.8 }}>⌄</span>
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
            <span style={{ fontSize: '10px', marginLeft: '1px', opacity: 0.8 }}>⌄</span>
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

        {/* Admin Details Dropdown */}
        <div className="top-pill-dropdown-wrap">
          <button
            type="button"
            className={`top-pill ${activeDropdown === 'admin' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown((prev) => (prev === 'admin' ? null : 'admin'));
            }}
            style={{
              padding: '4px 10px 4px 6px',
              borderRadius: '22px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            title="Admin Profile"
          >
            <div
              className="avatar"
              style={{
                width: '26px',
                height: '26px',
                fontSize: '12.5px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #7164ff, #4338ca)',
                color: '#ffffff',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              A
            </div>
            <span style={{ fontSize: '13px', fontWeight: '650', color: '#d8e0ed' }}>Admin</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>⌄</span>
          </button>

          {activeDropdown === 'admin' && (
            <div className="top-pill-menu" style={{ minWidth: '210px' }}>
              <div className="top-pill-menu-title">User Session</div>
              <div style={{ padding: '8px 10px', fontSize: '12.5px', color: '#d2dfee', lineHeight: 1.4 }}>
                <div style={{ fontWeight: '700', color: '#fff' }}>Store Administrator</div>
                <div style={{ color: '#889bb6', fontSize: '11.5px', marginTop: '2px' }}>Branch: Ranipet Store #1</div>
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
                <span style={{ fontSize: '13px', color: '#90a4c0' }}>
                  {filteredOrders.length} Order{filteredOrders.length === 1 ? '' : 's'} • Sort: <strong style={{ color: '#d8e4f5', fontWeight: '600' }}>Newest ⌄</strong>
                </span>
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
                  <span className={loadingOrders ? 'sync-spinner' : ''}>{loadingOrders ? '' : '↻'}</span>
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
                    <span className="order-chevron" style={{ opacity: 0.2 }}>⌄</span>
                    <div className="skeleton-avatar skeleton-shimmer"></div>
                    <div className="skeleton-info-wrap">
                      <div className="skeleton-bar skeleton-bar-name skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-pill skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-type skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-phone skeleton-shimmer"></div>
                    </div>
                    <div className="skeleton-amount skeleton-shimmer"></div>
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
                {filteredOrders.map((o, idx) => {
                  const cust = o.customer || {};
                  const custName = cust.customer_name || 'Walk-in Customer';
                  const phone = cust.mobile_number ? formatPhoneDisplay(cust.mobile_number) : '';
                  const isOnCall = o.order_type === 'on-call';
                  const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                  return (
                    <div
                      key={o.id}
                      className="order-row-card"
                      onClick={() => setEditingOrder(o)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view & edit customer order"
                    >
                      <span className="order-chevron">⌄</span>

                      {/* Avatar with person silhouette */}
                      <div
                        className="order-avatar-circle"
                        style={{ backgroundColor: avatarBg }}
                        title={custName}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>

                      {/* Single-row main content */}
                      <div className="order-main-info">
                        <span className="order-customer-name">{custName}</span>
                        <span className="order-num-pill">
                          {o.order_number || 'ORDER-00001'}
                        </span>
                        <span className="order-type-pill">
                          {isOnCall ? '📞 On-Call' : '🚶 Walk-in'}
                        </span>
                        {phone && (
                          <span className="order-phone-tag">
                            📞 {phone}
                          </span>
                        )}
                        {o.preference && (
                          <span className="order-pref-tag">
                            • [{o.preference}]
                          </span>
                        )}
                      </div>

                      {/* Right-aligned Amount & Status */}
                      <div className="order-amount-display">
                        {(currentCurrency?.symbol || '₹')}{Number(o.total_amount || 0).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        className={`order-status-pill ${
                          o.status === 'Ready for Billing' ? 'ready' :
                          o.status === 'Product Status' ? 'purple' : 'in-progress'
                        }`}
                        title={`Status: ${o.status || 'Order in Progress'} (${o.progress || 25}%) - Click to open status dialog`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenOrderStatus(o);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="status-dot"></span>
                        <span>Order Status</span>
                      </button>
                    </div>
                  );
                })}
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
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedStatusOrder(null);
        }}
        onOrderUpdated={loadOrders}
        showToast={showToast}
        currencySymbol={currentCurrency.symbol}
      />

      {/* ── Edit Order Modal (Exact same UI as Create New Order & Edit Customer) ── */}
      {editingOrder && (
        <div
          className="overlay"
          style={{ display: 'grid' }}
          onClick={(e) => {
            if (e.target.className === 'overlay') setEditingOrder(null);
          }}
        >
          <div className="modal" style={{ width: '100%', maxWidth: '480px' }}>
            <div className="modal-head">
              <div className="modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                <div className="modal-title">Edit Order Record</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="cust-id-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                    {editingOrder.order_number || editingOrder.order_id}
                  </span>
                  <span style={{ fontSize: '12.5px', color: '#9aacc5', fontWeight: '550' }}>
                    {editingOrder.customer?.customer_name || editingOrder.customer_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setEditingOrder(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <CustomerForm
              initialCustomer={editingOrder.customer || {
                customer_name: editingOrder.customer_name,
                mobile_number: editingOrder.mobile_number,
              }}
              customerId={editingOrder.customer?.customerId || editingOrder.customer?.customer_id || editingOrder.customer_id}
              initialOrderType={editingOrder.order_type}
              isOrderFlow={true}
              submitLabel="Update Order Record"
              onBack={() => setEditingOrder(null)}
              onSubmit={async ({ customerData, orderPreference, orderPreferenceNotes }) => {
                const targetId = editingOrder.customer?.customerId || editingOrder.customer?.customer_id || editingOrder.order_number;
                const { error } = await updateCustomer(targetId, {
                  ...customerData,
                  orderPreference,
                  orderPreferenceNotes,
                });
                if (error) {
                  showToast(`⚠️ ${error.message}`);
                } else {
                  showToast(`✓ Order ${editingOrder.order_number} updated successfully!`);
                  setEditingOrder(null);
                  loadOrders();
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── Global Toast ── */}
      <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast" role="status">
        {toastMessage}
      </div>
    </div>
  );
}
