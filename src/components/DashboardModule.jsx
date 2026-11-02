// src/components/DashboardModule.jsx
// Washdoor Laundry & Dry Clean Management Dashboard

import React, { useMemo } from 'react';
import '../styles/Dashboard.css';

export default function DashboardModule({
  orders = [],
  loadingOrders = false,
  currencySymbol = '₹',
  onCreateOrder,
  onNavigateTab,
  onRefreshOrders,
  onEditOrder,
  showToast,
}) {
  // Compute dynamic KPI metrics from real orders
  const metrics = useMemo(() => {
    const total = orders.length;
    let revenue = 0;
    let advance = 0;
    let balanceDue = 0;
    let totalPieces = 0;

    let received = 0;
    let inProgress = 0;
    let ready = 0;
    let delivered = 0;
    let cancelled = 0;

    let paid = 0;
    let partial = 0;
    let unpaid = 0;

    const serviceCounts = {};

    orders.forEach((o) => {
      const tot = Number(o.total_amount) || 0;
      const adv = Number(o.advance_paid) || 0;
      const bal = Number(o.balance_due) || Math.max(0, tot - adv);
      const pieces = Number(o.total_pieces) || (Array.isArray(o.items) ? o.items.length : 1) || 1;

      revenue += tot;
      advance += adv;
      balanceDue += bal;
      totalPieces += pieces;

      const st = String(o.order_status || o.status || '').toLowerCase();
      if (st.includes('ready')) ready++;
      else if (st.includes('deliver') || st.includes('complete')) delivered++;
      else if (st.includes('progress') || st.includes('wash')) inProgress++;
      else if (st.includes('cancel')) cancelled++;
      else received++;

      const pay = String(o.payment_status || o.payment?.status || '').toLowerCase();
      if (pay.includes('partial')) partial++;
      else if (pay.includes('unpaid')) unpaid++;
      else paid++;

      const srv = o.service_category || o.service_type || 'Wash & Steam Press';
      serviceCounts[srv] = (serviceCounts[srv] || 0) + 1;
    });

    const activeInShop = received + inProgress + ready;

    return {
      total,
      revenue,
      advance,
      balanceDue,
      totalPieces,
      received,
      inProgress,
      ready,
      delivered,
      cancelled,
      activeInShop,
      paid,
      partial,
      unpaid,
      serviceCounts,
    };
  }, [orders]);

  // Recent 5-6 orders
  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 6);
  }, [orders]);

  // Formatted date
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="dashboard-container" data-message="Welcom to washdoor">
      {/* ── Top Welcome Banner ── */}
      <section className="dashboard-welcome-banner">
        <div className="dashboard-welcome-left">
          <div className="dashboard-welcome-avatar">W</div>
          <div>
            <h1 className="dashboard-welcome-title">Welcome to washdoor</h1>
            <p className="dashboard-welcome-sub">
              <span>{todayFormatted}</span>
              <span>•</span>
              <span className="dashboard-branch-tag">Ranipet Store #1</span>
              <span>•</span>
              <span style={{ color: '#4ade80', fontWeight: '600' }}>● Live Counter Active</span>
            </p>
          </div>
        </div>

        <div className="dashboard-welcome-actions">
          <button
            type="button"
            className="dash-btn secondary"
            onClick={onRefreshOrders}
            title="Refresh Real-time Orders"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{loadingOrders ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="dash-btn secondary"
            onClick={() => onNavigateTab && onNavigateTab('customer')}
            title="Manage Customers Master"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            <span>Customers</span>
          </button>

          <button
            type="button"
            className="dash-btn primary"
            onClick={onCreateOrder}
            title="Create New Order (Press N)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ New Order</span>
          </button>
        </div>
      </section>

      {/* ── Key Metrics KPI Cards ── */}
      <section className="dashboard-kpi-grid">
        {/* Total Orders */}
        <div className="dash-kpi-card" onClick={() => onNavigateTab && onNavigateTab('order')} style={{ cursor: 'pointer' }}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Total Orders</span>
            <div className="dash-kpi-icon blue">📦</div>
          </div>
          <div className="dash-kpi-value">{metrics.total}</div>
          <div className="dash-kpi-sub">{metrics.activeInShop} currently active in workshop</div>
        </div>

        {/* Total Revenue */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Total Revenue</span>
            <div className="dash-kpi-icon green">💰</div>
          </div>
          <div className="dash-kpi-value">{currencySymbol}{metrics.revenue.toLocaleString()}</div>
          <div className="dash-kpi-sub">{currencySymbol}{metrics.advance.toLocaleString()} collected advance</div>
        </div>

        {/* Ready for Pickup */}
        <div className="dash-kpi-card" onClick={() => onNavigateTab && onNavigateTab('order')} style={{ cursor: 'pointer' }}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Ready for Pickup</span>
            <div className="dash-kpi-icon cyan">✨</div>
          </div>
          <div className="dash-kpi-value">{metrics.ready}</div>
          <div className="dash-kpi-sub">Ironed &amp; bagged for customer</div>
        </div>

        {/* In Progress / Washing */}
        <div className="dash-kpi-card" onClick={() => onNavigateTab && onNavigateTab('order')} style={{ cursor: 'pointer' }}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">In Washing &amp; Press</span>
            <div className="dash-kpi-icon amber">🔄</div>
          </div>
          <div className="dash-kpi-value">{metrics.inProgress}</div>
          <div className="dash-kpi-sub">{metrics.received} pending wash cycle</div>
        </div>

        {/* Pending Balance */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Pending Payments</span>
            <div className="dash-kpi-icon rose">⏳</div>
          </div>
          <div className="dash-kpi-value">{currencySymbol}{metrics.balanceDue.toLocaleString()}</div>
          <div className="dash-kpi-sub">{metrics.unpaid + metrics.partial} orders with dues</div>
        </div>

        {/* Completed Deliveries */}
        <div className="dash-kpi-card" onClick={() => onNavigateTab && onNavigateTab('order')} style={{ cursor: 'pointer' }}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Delivered Orders</span>
            <div className="dash-kpi-icon purple">✅</div>
          </div>
          <div className="dash-kpi-value">{metrics.delivered}</div>
          <div className="dash-kpi-sub">{metrics.totalPieces} total pieces laundered</div>
        </div>
      </section>

      {/* ── Laundry Operations Workflow Pipeline ── */}
      <section className="dashboard-pipeline-card">
        <div className="dashboard-card-head">
          <h2 className="dashboard-card-title">
            <span>🧺 Operations Stage Pipeline</span>
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94a3b8' }}>
              ({metrics.activeInShop} active units)
            </span>
          </h2>
          <button
            type="button"
            className="dash-btn secondary"
            onClick={() => onNavigateTab && onNavigateTab('order')}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            <span>View Orders Register →</span>
          </button>
        </div>

        <div className="pipeline-steps-grid">
          <div className="pipeline-step" onClick={() => onNavigateTab && onNavigateTab('order')}>
            <div className="pipeline-step-head">
              <span className="pipeline-step-name">1. Order Received</span>
              <span className="pipeline-step-count">{metrics.received}</span>
            </div>
            <div className="pipeline-step-bar">
              <div
                className="pipeline-step-fill received"
                style={{ width: `${metrics.total ? (metrics.received / metrics.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="pipeline-step" onClick={() => onNavigateTab && onNavigateTab('order')}>
            <div className="pipeline-step-head">
              <span className="pipeline-step-name">2. In Progress / Wash</span>
              <span className="pipeline-step-count">{metrics.inProgress}</span>
            </div>
            <div className="pipeline-step-bar">
              <div
                className="pipeline-step-fill progress"
                style={{ width: `${metrics.total ? (metrics.inProgress / metrics.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="pipeline-step" onClick={() => onNavigateTab && onNavigateTab('order')}>
            <div className="pipeline-step-head">
              <span className="pipeline-step-name">3. Ready for Delivery</span>
              <span className="pipeline-step-count">{metrics.ready}</span>
            </div>
            <div className="pipeline-step-bar">
              <div
                className="pipeline-step-fill ready"
                style={{ width: `${metrics.total ? (metrics.ready / metrics.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="pipeline-step" onClick={() => onNavigateTab && onNavigateTab('order')}>
            <div className="pipeline-step-head">
              <span className="pipeline-step-name">4. Delivered</span>
              <span className="pipeline-step-count">{metrics.delivered}</span>
            </div>
            <div className="pipeline-step-bar">
              <div
                className="pipeline-step-fill delivered"
                style={{ width: `${metrics.total ? (metrics.delivered / metrics.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Split Grid: Recent Orders & Services Overview ── */}
      <section className="dashboard-split-grid">
        {/* Recent Orders Register */}
        <div className="dashboard-panel-card">
          <div className="dashboard-card-head">
            <h2 className="dashboard-card-title">
              <span>📋 Recent Orders</span>
            </h2>
            <button
              type="button"
              className="dash-btn secondary"
              onClick={() => onNavigateTab && onNavigateTab('order')}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              <span>View All ({metrics.total})</span>
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="dash-empty-orders">
              <div className="dash-empty-icon">📭</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>No orders recorded yet</div>
              <button
                type="button"
                className="dash-btn primary"
                onClick={onCreateOrder}
                style={{ marginTop: '12px' }}
              >
                + Create First Order
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dash-orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => {
                    const st = String(o.order_status || o.status || 'Received').toLowerCase();
                    let stClass = 'received';
                    if (st.includes('ready')) stClass = 'ready';
                    else if (st.includes('progress') || st.includes('wash')) stClass = 'progress';
                    else if (st.includes('deliver')) stClass = 'delivered';

                    return (
                      <tr key={o.id || o.order_number}>
                        <td>
                          <span className="dash-order-num">{o.order_number || o.id}</span>
                        </td>
                        <td>
                          <div className="dash-cust-name">{o.customer_name || 'Walk-in Customer'}</div>
                          <div className="dash-cust-phone">{o.mobile_number || 'No phone'}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {o.service_category || o.service_type || 'Wash & Steam'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700' }}>
                            {currencySymbol}{Number(o.total_amount || 0).toLocaleString()}
                          </div>
                          <span style={{ fontSize: '11px', color: o.balance_due > 0 ? '#fb7185' : '#34d399' }}>
                            {o.balance_due > 0 ? `Due: ${currencySymbol}${o.balance_due}` : 'Paid'}
                          </span>
                        </td>
                        <td>
                          <span className={`dash-status-pill ${stClass}`}>
                            ● {o.order_status || o.status || 'Received'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dash-btn secondary"
                            onClick={() => onEditOrder ? onEditOrder(o) : onNavigateTab && onNavigateTab('order')}
                            style={{ padding: '4px 9px', fontSize: '11.5px' }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Services & Quick Distribution */}
        <div className="dashboard-panel-card">
          <div className="dashboard-card-head">
            <h2 className="dashboard-card-title">
              <span>🏷️ Top Services</span>
            </h2>
          </div>

          <div className="dash-services-list">
            {Object.keys(metrics.serviceCounts).length === 0 ? (
              <>
                <div className="dash-service-item">
                  <span className="dash-service-name">🧺 Wash &amp; Steam Press</span>
                  <span className="dash-service-count">Active</span>
                </div>
                <div className="dash-service-item">
                  <span className="dash-service-name">👔 Dry Cleaning</span>
                  <span className="dash-service-count">Active</span>
                </div>
                <div className="dash-service-item">
                  <span className="dash-service-name">⚡ Steam Ironing</span>
                  <span className="dash-service-count">Active</span>
                </div>
                <div className="dash-service-item">
                  <span className="dash-service-name">✨ Premium Garment Care</span>
                  <span className="dash-service-count">Active</span>
                </div>
              </>
            ) : (
              Object.entries(metrics.serviceCounts).map(([srv, count]) => (
                <div key={srv} className="dash-service-item">
                  <span className="dash-service-name">🧺 {srv}</span>
                  <span className="dash-service-count">{count} {count === 1 ? 'order' : 'orders'}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid #1a293f', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: '750', color: '#cbd5e1', margin: '0 0 10px' }}>
              💳 Payment Status Distribution
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="dash-status-pill ready">Paid: {metrics.paid}</span>
              <span className="dash-status-pill progress">Partial: {metrics.partial}</span>
              <span className="dash-status-pill received" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
                Unpaid: {metrics.unpaid}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
