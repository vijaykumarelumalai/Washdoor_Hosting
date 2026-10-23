// src/App.jsx
// Washdoor POS & Counter Intake Application
// Matching washdoor_create_order_updated.html layout and aesthetics

import React, { useState, useEffect, useCallback } from 'react';
import CreateOrderModal from './components/CreateOrderModal';
import CustomerManagement from './components/CustomerManagement';
import NoOrdersGraphic from './components/NoOrdersGraphic';
import { getOrders } from './services/customerService';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { formatPhoneDisplay } from './utils/validation';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Toast helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  }, []);

  // Fetch orders from Supabase
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const { data, error } = await getOrders();
    setLoadingOrders(false);

    if (error) {
      console.warn('Orders fetch note:', error.message);
    } else if (data) {
      setOrders(data);
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

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const orderNo = (o.order_number || `WD-${o.id}`).toLowerCase();
    const custName = (o.customer?.customer_name || '').toLowerCase();
    const phone = (o.customer?.mobile_number || '').toLowerCase();
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
          </div>
        </div>
        <button
          type="button"
          className={`top-pill hide-mobile ${activeTab === 'orders' ? 'blue' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders &amp; POS
        </button>
        <button
          type="button"
          className={`top-pill hide-mobile ${activeTab === 'customers' ? 'blue' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          👤 Customers
        </button>
        <div className="spacer"></div>
        {isSupabaseConfigured() ? (
          <span className="top-pill" style={{ color: '#4ee2af', borderColor: '#175438', background: '#0b2923', fontSize: '12px' }}>
            ● Supabase Live
          </span>
        ) : (
          <span className="top-pill" style={{ color: '#ffd768', borderColor: '#59430f', background: '#332608', fontSize: '12px' }} title="Configure Supabase in .env.local">
            ● Local Master Mode
          </span>
        )}
        <button
          type="button"
          className="top-pill blue"
          onClick={() => showToast('Tracking order search active')}
        >
          ⌕ Track Order
        </button>
        <button
          type="button"
          className="top-pill"
          onClick={() => showToast('Admin configuration panel')}
        >
          ♟ Admin
        </button>
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
            <div className="toolbar">
              <input
                type="text"
                placeholder="Search by phone / Order ID / Customer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  width: '320px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span>
                  {filteredOrders.length} Order{filteredOrders.length === 1 ? '' : 's'} • Sort: Newest
                </span>
                <button
                  type="button"
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => {
                    loadOrders();
                    showToast('↻ Orders refreshed');
                  }}
                  title="Reload orders from database"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* ── Orders List ── */}
            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9aacc5' }}>
                Loading live orders from Supabase…
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-orders-container">
                <NoOrdersGraphic />
                <h2 className="empty-orders-title">No orders yet</h2>
                <p className="empty-orders-desc">
                  Create your first order to start tracking customer items, payments, and delivery.
                </p>
              </div>
            ) : (
              <div className="orders">
                {filteredOrders.map((o) => {
                  let statusClass = 'status';
                  if (o.status === 'Ready') statusClass = 'status ready';
                  if (o.status === 'In Part') statusClass = 'status purple';

                  const cust = o.customer || {};
                  const custCode = cust.customerId || cust.customer_code;
                  const custName = cust.customer_name || 'Walk-in Customer';
                  const phone = cust.mobile_number ? formatPhoneDisplay(cust.mobile_number) : '';
                  const orderTypeTag = o.order_type === 'on-call' ? ' (On-Call)' : ' (Walk-in)';
                  const zoneTag = cust.areaServiceZone || (cust.service_zone ? `Zone ${cust.service_zone.replace('zone-', '')}` : null);
                  const commTag = cust.communicationPreference || cust.communication_pref;

                  return (
                    <div key={o.id} className="order">
                      <span>⌄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong>{o.order_number || `WD-${o.id}`}</strong>
                          {custCode && <span className="cust-id-pill" style={{ fontSize: '11px', padding: '2px 6px' }}>{custCode}</span>}
                          {zoneTag && <span className="badge-tag badge-zone" style={{ fontSize: '10.5px', padding: '1px 6px' }}>{zoneTag}</span>}
                          {commTag && <span className="badge-tag badge-comm" style={{ fontSize: '10.5px', padding: '1px 6px' }}>{commTag}</span>}
                        </div>
                        <div className="muted" style={{ marginTop: '3px' }}>
                          {custName} {orderTypeTag} {phone && `• ${phone}`}
                          {o.preference && ` • [${o.preference}]`}
                        </div>
                      </div>
                      <div className="amount">₹{Number(o.total_amount || 0).toFixed(2)}</div>
                      <span className={statusClass}>{o.status || 'Laundry In Progress'}</span>
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
        onOrderSuccess={loadOrders}
        showToast={showToast}
      />

      {/* ── Global Toast ── */}
      <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast" role="status">
        {toastMessage}
      </div>
    </div>
  );
}
