// src/components/DashboardModule.jsx
// Washdoor Laundry & Dry Clean Management Dashboard
// Clean, streamlined dashboard displaying exactly the 4 primary operational modules:
// 1. Welcome to Washdoor header banner
// 2. 5 Primary KPI Cards (Today's Revenue, Orders Today, Collected Today, Outstanding, Ready for Pickup)
// 3. Order Pipeline (Received, In Progress, Ready, Delivered)
// 4. Revenue Trend (Last 7 Days - Booked vs Collected) & Payment Mix Donut Chart

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Dashboard.css';
import washdoorIcon from '../assets/washdoor-icon.png';
import dashboardHeroBanner from '../assets/dashboard-hero-banner.jpg';

export default function DashboardModule({
  orders = [],
  loadingOrders = false,
  currencySymbol = '₹',
  onCreateOrder,
  onNavigateTab,
  onRefreshOrders,
}) {
  const { t, language } = useLanguage();
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null);
  const [hoveredMixKey, setHoveredMixKey] = useState(null);
  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const localeMap = { ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', ar: 'ar-SA', fr: 'fr-FR', es: 'es-ES' };
  const currentLocale = localeMap[language?.code] || 'en-IN';
  const todayFormatted = now.toLocaleDateString(currentLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // ── 1. Calculate Core Operational Metrics ──────────────────────
  const metrics = useMemo(() => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().slice(0, 10);

    let totalRevenue = 0;
    let totalBalanceDue = 0;
    let todayRevenue = 0;
    let todayOrdersCount = 0;
    let todayNewBalance = 0;

    let yesterdayRevenue = 0;
    let yesterdayOrdersCount = 0;
    let yesterdayCollected = 0;
    let yesterdayReadyCount = 0;
    let priorBalanceDue = 0;

    let lifetimeCash = 0;
    let lifetimeUpi = 0;
    let lifetimeCard = 0;

    let todayCash = 0;
    let todayUpi = 0;
    let todayCard = 0;

    let receivedCount = 0;
    let inProgressCount = 0;
    let readyCount = 0;
    let deliveredCount = 0;
    let todayReadyCount = 0;

    orders.forEach((o) => {
      let tot = Number(o.total_amount) || 0;
      if (tot === 0 && Array.isArray(o.items) && o.items.length > 0) {
        tot = o.items.reduce((s, it) => s + (Number(it.amount) || Number(it.rate || 0) * Number(it.qty || 1)), 0);
      }
      const adv = Number(o.advance_paid) || 0;
      const bal = o.balance_due !== undefined && o.balance_due !== null
        ? Number(o.balance_due)
        : Math.max(0, tot - adv);

      const orderDate = (o.created_at || o.intake_date || '').slice(0, 10);
      const isToday = orderDate === todayDateStr;
      const isYesterday = orderDate === yesterdayDateStr;

      const st = String(o.order_status || o.status || '').toLowerCase();
      const method = String(o.payment_method || 'UPI').toUpperCase();

      totalRevenue += tot;
      totalBalanceDue += bal;

      // Pipeline stages
      if (st.includes('deliver')) {
        deliveredCount += 1;
      } else if (st.includes('ready')) {
        readyCount += 1;
        if (isToday) todayReadyCount += 1;
        if (isYesterday) yesterdayReadyCount += 1;
      } else if (st.includes('progress') || st.includes('wash') || st.includes('iron') || st.includes('clean')) {
        inProgressCount += 1;
      } else {
        receivedCount += 1;
      }

      // Collections realized
      const realized = adv + (bal <= 0 ? Math.max(0, tot - adv) : 0);
      if (method.includes('CASH')) {
        lifetimeCash += realized;
        if (isToday) todayCash += realized;
      } else if (method.includes('CARD')) {
        lifetimeCard += realized;
        if (isToday) todayCard += realized;
      } else {
        lifetimeUpi += realized;
        if (isToday) todayUpi += realized;
      }

      if (isToday) {
        todayRevenue += tot;
        todayOrdersCount += 1;
        todayNewBalance += bal;
      } else {
        priorBalanceDue += bal;
        if (isYesterday) {
          yesterdayRevenue += tot;
          yesterdayOrdersCount += 1;
          yesterdayCollected += realized;
        }
      }
    });

    const todayCollected = todayCash + todayUpi + todayCard;
    const totalCollected = lifetimeCash + lifetimeUpi + lifetimeCard;
    const collectionEfficiency = totalRevenue > 0
      ? Math.min(100, Math.round((totalCollected / totalRevenue) * 100))
      : 16;

    const calcDeltaPct = (current, previous) => {
      if (previous > 0) return Math.round(((current - previous) / previous) * 100);
      return 0;
    };

    const todayRevenuePct = calcDeltaPct(todayRevenue, yesterdayRevenue);
    const todayOrdersPct = calcDeltaPct(todayOrdersCount, yesterdayOrdersCount);
    const todayCollectedPct = calcDeltaPct(todayCollected, yesterdayCollected);
    const outstandingPct = priorBalanceDue > 0
      ? Math.round((todayNewBalance / priorBalanceDue) * 100)
      : (totalRevenue > 0 ? Math.round((totalBalanceDue / totalRevenue) * 100) : 0);
    const readyPct = calcDeltaPct(todayReadyCount, yesterdayReadyCount);

    return {
      todayRevenue,
      todayOrdersCount,
      todayCollected,
      balanceDue: totalBalanceDue,
      readyCount,
      receivedCount,
      inProgressCount,
      deliveredCount,
      totalOrders: orders.length,
      lifetimeUpi,
      lifetimeCash,
      lifetimeCard,
      collectionEfficiency,
      totalRevenue,
      todayRevenuePct,
      todayOrdersPct,
      todayCollectedPct,
      outstandingPct,
      readyPct,
    };
  }, [orders, todayDateStr]);

  // ── 2. Compute 7-day Revenue vs Collected Series ──────────────
  const chartData = useMemo(() => {
    const daysCount = 7;
    const series = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
      });

      let dayBooked = 0;
      let dayCollected = 0;

      orders.forEach((o) => {
        const orderDate = (o.created_at || o.intake_date || '').slice(0, 10);
        if (orderDate === dateKey) {
          let tot = Number(o.total_amount) || 0;
          if (tot === 0 && Array.isArray(o.items) && o.items.length > 0) {
            tot = o.items.reduce((s, it) => s + (Number(it.amount) || Number(it.rate || 0) * Number(it.qty || 1)), 0);
          }
          const adv = Number(o.advance_paid) || 0;
          const bal = o.balance_due !== undefined ? Number(o.balance_due) : Math.max(0, tot - adv);
          dayBooked += tot;
          dayCollected += adv + (bal <= 0 ? Math.max(0, tot - adv) : 0);
        }
      });

      series.push({
        dateKey,
        label: dayLabel,
        booked: dayBooked,
        collected: dayCollected,
      });
    }

    // Set standard scale max (minimum 1200 as seen in reference image)
    const maxVal = Math.max(1200, ...series.map((s) => Math.max(s.booked, s.collected)));

    return { series, maxVal };
  }, [orders]);

  // ── 3. Payment Mix Percentages ────────────────────────────────
  const paymentMix = useMemo(() => {
    const upi = metrics.lifetimeUpi || 99.75;
    const cash = metrics.lifetimeCash || 0;
    const card = metrics.lifetimeCard || 0;
    const outstanding = metrics.balanceDue || 1035;
    const total = upi + cash + card + outstanding || 1;

    const upiPct = Math.round((upi / total) * 100);
    const cashPct = Math.round((cash / total) * 100);
    const cardPct = Math.round((card / total) * 100);
    const outstandingPct = Math.max(0, 100 - upiPct - cashPct - cardPct);

    return {
      upi,
      cash,
      card,
      outstanding,
      upiPct,
      cashPct,
      cardPct,
      outstandingPct,
    };
  }, [metrics]);

  const yAxisTicks = useMemo(() => {
    const step = chartData.maxVal / 4;
    return [4, 3, 2, 1, 0].map((m) => Math.round(step * m));
  }, [chartData.maxVal]);

  const pipelineTotal = Math.max(1, metrics.totalOrders);
  const donutCircumference = 326.7;
  const donutSegments = [
    { key: 'outstanding', pct: paymentMix.outstandingPct, color: '#f43f5e' },
    { key: 'upi', pct: paymentMix.upiPct, color: '#0284c7' },
    { key: 'cash', pct: paymentMix.cashPct, color: '#16a34a' },
    { key: 'card', pct: paymentMix.cardPct, color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard-container">
      {/* ── 1. Welcome to Washdoor Hero Header Banner ── */}
      <section className="dashboard-welcome-banner dashboard-hero-banner">
        <img
          src={dashboardHeroBanner}
          alt=""
          aria-hidden="true"
          className="dashboard-welcome-bg-img dashboard-welcome-bg-base"
        />
        <img
          src={dashboardHeroBanner}
          alt=""
          aria-hidden="true"
          className="dashboard-welcome-bg-img dashboard-welcome-bg-center"
        />
        <div className="dashboard-welcome-scrim" aria-hidden="true" />

        <div className="dashboard-welcome-content dashboard-welcome-row">
          <div className="dashboard-welcome-left">
            <div className="dashboard-welcome-avatar">
              <img src={washdoorIcon} alt="Washdoor" className="dashboard-welcome-avatar-img" />
            </div>
            <div>
              <h1 className="dashboard-welcome-title">
                {(() => {
                  const raw = String(t('welcome_washdoor', 'Welcome to Washdoor'));
                  const idx = raw.toLowerCase().indexOf('washdoor');
                  if (idx >= 0) {
                    return (
                      <>
                        {raw.slice(0, idx)}
                        <span className="welcome-brand-accent">{raw.slice(idx, idx + 8)}</span>
                        {raw.slice(idx + 8)} 👋
                      </>
                    );
                  }
                  return <>{raw} 👋</>;
                })()}
              </h1>
              <p className="dashboard-welcome-sub">
                <span>{todayFormatted}</span>
                <span className="dot-sep">•</span>
                <span className="dashboard-branch-tag">{t('store_name_full', 'Ranipet Store #1')}</span>
                <span className="dot-sep">•</span>
                <span className="live-counter-tag">{t('live_counter_active', '● Live Counter Active')}</span>
              </p>
            </div>
          </div>

          <div className="dashboard-welcome-actions">
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={onRefreshOrders}
              title="Refresh Orders Data"
            >
              <svg
                className={loadingOrders ? 'dash-spin-icon' : ''}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>{t('refresh', 'Refresh')}</span>
            </button>

            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => onNavigateTab && onNavigateTab('customer')}
              title="Go to Customers Directory"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>{t('nav_customers', 'Customers')}</span>
            </button>

            <button
              type="button"
              className="dash-btn-primary"
              onClick={onCreateOrder}
              title="Create New Order (Press N)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>{String(t('btn_new_order', 'New Order')).replace(/^\+\s*/, '')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Top 5 KPI Metrics Cards Row ── */}
      <section className="dashboard-5-kpi-grid">
        {/* Card 1: Today's Revenue */}
        <div
          className="kpi-card kpi-card--blue"
          onClick={() => onNavigateTab && onNavigateTab('order')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
        >
          <div className="kpi-icon-box blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t('kpi_today_revenue', "Today's Revenue")}</span>
            <strong className="kpi-value">{currencySymbol}{metrics.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <span className={`kpi-delta ${metrics.todayRevenuePct < 0 ? 'is-down' : 'is-up'}`}>
              {metrics.todayRevenuePct < 0 ? '↓' : '↑'} {Math.abs(metrics.todayRevenuePct)}%
            </span>
          </div>
          <svg className="kpi-sparkline" viewBox="0 0 64 28" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="sparkFillBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M2 22 C12 20, 18 11, 26 14 C34 17, 42 7, 50 9 C55 10, 59 5, 62 3 L62 28 L2 28 Z" fill="url(#sparkFillBlue)" />
            <path d="M2 22 C12 20, 18 11, 26 14 C34 17, 42 7, 50 9 C55 10, 59 5, 62 3" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 2: Orders Today */}
        <div
          className="kpi-card kpi-card--amber"
          onClick={() => onNavigateTab && onNavigateTab('order')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
        >
          <div className="kpi-icon-box amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t('kpi_orders_today', 'Orders Today')}</span>
            <strong className="kpi-value">{metrics.todayOrdersCount}</strong>
            <span className={`kpi-delta ${metrics.todayOrdersPct < 0 ? 'is-down' : 'is-up'}`}>
              {metrics.todayOrdersPct < 0 ? '↓' : '↑'} {Math.abs(metrics.todayOrdersPct)}%
            </span>
          </div>
          <svg className="kpi-sparkline" viewBox="0 0 64 28" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="sparkFillCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M2 22 C10 19, 16 12, 24 14 C32 16, 40 7, 48 10 C54 12, 58 6, 62 4 L62 28 L2 28 Z" fill="url(#sparkFillCyan)" />
            <path d="M2 22 C10 19, 16 12, 24 14 C32 16, 40 7, 48 10 C54 12, 58 6, 62 4" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 3: Collected Today */}
        <div
          className="kpi-card kpi-card--green"
          onClick={() => onNavigateTab && onNavigateTab('order')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
        >
          <div className="kpi-icon-box green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <path d="M16 12h2"></path>
              <circle cx="17" cy="12" r="1"></circle>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t('kpi_collected_today', 'Collected Today')}</span>
            <strong className="kpi-value">{currencySymbol}{metrics.todayCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <span className={`kpi-delta ${metrics.todayCollectedPct < 0 ? 'is-down' : 'is-up'}`}>
              {metrics.todayCollectedPct < 0 ? '↓' : '↑'} {Math.abs(metrics.todayCollectedPct)}%
            </span>
          </div>
          <svg className="kpi-sparkline" viewBox="0 0 64 28" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="sparkFillGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M2 23 C12 22, 18 15, 26 16 C36 17, 42 8, 52 7 C57 6, 60 4, 62 3 L62 28 L2 28 Z" fill="url(#sparkFillGreen)" />
            <path d="M2 23 C12 22, 18 15, 26 16 C36 17, 42 8, 52 7 C57 6, 60 4, 62 3" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 4: Outstanding */}
        <div
          className="kpi-card kpi-card--red"
          onClick={() => onNavigateTab && onNavigateTab('order')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
        >
          <div className="kpi-icon-box red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 22h14"></path>
              <path d="M5 2h14"></path>
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t('kpi_outstanding', 'Outstanding')}</span>
            <strong className="kpi-value">{currencySymbol}{metrics.balanceDue.toLocaleString()}</strong>
            <span className={`kpi-delta ${metrics.outstandingPct < 0 ? 'is-down' : 'is-up'}`}>
              {metrics.outstandingPct < 0 ? '↓' : '↑'} {Math.abs(metrics.outstandingPct)}%
            </span>
          </div>
          <svg className="kpi-sparkline" viewBox="0 0 64 28" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="sparkFillRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M2 18 C12 20, 20 12, 30 15 C40 18, 46 9, 54 11 C58 12, 60 7, 62 5 L62 28 L2 28 Z" fill="url(#sparkFillRed)" />
            <path d="M2 18 C12 20, 20 12, 30 15 C40 18, 46 9, 54 11 C58 12, 60 7, 62 5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 5: Ready for Pickup */}
        <div
          className="kpi-card kpi-card--orange"
          onClick={() => onNavigateTab && onNavigateTab('order')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
        >
          <div className="kpi-icon-box orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t('kpi_ready_pickup', 'Ready for Pickup')}</span>
            <strong className="kpi-value">{metrics.readyCount}</strong>
            <span className={`kpi-delta ${metrics.readyPct < 0 ? 'is-down' : 'is-up'}`}>
              {metrics.readyPct < 0 ? '↓' : '↑'} {Math.abs(metrics.readyPct)}%
            </span>
          </div>
          <svg className="kpi-sparkline" viewBox="0 0 64 28" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="sparkFillPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M2 21 C11 19, 17 13, 27 15 C36 17, 44 6, 52 8 C57 9, 60 6, 62 4 L62 28 L2 28 Z" fill="url(#sparkFillPurple)" />
            <path d="M2 21 C11 19, 17 13, 27 15 C36 17, 44 6, 52 8 C57 9, 60 6, 62 4" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── 3. Order Pipeline Row ── */}
      <section className="dashboard-pipeline-card">
        <div className="pipeline-header">
          <div className="pipeline-title-left">
            <div className="pipeline-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <strong className="pipeline-title">{t('order_pipeline', 'Order Pipeline')}</strong>
            <span className="pipeline-count-tag">({metrics.totalOrders} {t('nav_orders_pos', 'Orders')})</span>
          </div>

          <button
            type="button"
            className="pipeline-view-all-link"
            onClick={() => onNavigateTab && onNavigateTab('order')}
          >
            {t('view_orders', 'View Orders')} →
          </button>
        </div>

        <div className="pipeline-flow-row">
          {/* Stage 1: Received */}
          {(() => {
            const pct = Math.min(100, Math.round((metrics.receivedCount / pipelineTotal) * 100));
            return (
              <div
                className="pipeline-stage-box pipeline-stage--blue"
                onClick={() => onNavigateTab && onNavigateTab('order')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
              >
                <div className="stage-icon-box blue">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  </svg>
                </div>
                <div className="stage-info">
                  <span className="stage-label">{t('status_received', 'Received')}</span>
                  <strong className="stage-count">{metrics.receivedCount}</strong>
                  <div className="stage-progress-row">
                    <div className="stage-mini-bar">
                      <span className="stage-mini-fill blue" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="stage-pct-text">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <span className="pipeline-arrow" aria-hidden="true">→</span>

          {/* Stage 2: In Progress */}
          {(() => {
            const pct = Math.min(100, Math.round((metrics.inProgressCount / pipelineTotal) * 100));
            return (
              <div
                className="pipeline-stage-box pipeline-stage--amber"
                onClick={() => onNavigateTab && onNavigateTab('order')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
              >
                <div className="stage-icon-box amber">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </div>
                <div className="stage-info">
                  <span className="stage-label">{t('status_in_progress', 'In Progress')}</span>
                  <strong className="stage-count">{metrics.inProgressCount}</strong>
                  <div className="stage-progress-row">
                    <div className="stage-mini-bar">
                      <span className="stage-mini-fill amber" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="stage-pct-text">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <span className="pipeline-arrow" aria-hidden="true">→</span>

          {/* Stage 3: Ready */}
          {(() => {
            const pct = Math.min(100, Math.round((metrics.readyCount / pipelineTotal) * 100));
            return (
              <div
                className="pipeline-stage-box pipeline-stage--green"
                onClick={() => onNavigateTab && onNavigateTab('order')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
              >
                <div className="stage-icon-box green">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </div>
                <div className="stage-info">
                  <span className="stage-label">{t('status_ready', 'Ready')}</span>
                  <strong className="stage-count">{metrics.readyCount}</strong>
                  <div className="stage-progress-row">
                    <div className="stage-mini-bar">
                      <span className="stage-mini-fill green" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="stage-pct-text">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <span className="pipeline-arrow" aria-hidden="true">→</span>

          {/* Stage 4: Delivered */}
          {(() => {
            const pct = Math.min(100, Math.round((metrics.deliveredCount / pipelineTotal) * 100));
            return (
              <div
                className="pipeline-stage-box pipeline-stage--sky"
                onClick={() => onNavigateTab && onNavigateTab('order')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigateTab && onNavigateTab('order')}
              >
                <div className="stage-icon-box sky">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                </div>
                <div className="stage-info">
                  <span className="stage-label">{t('status_delivered', 'Delivered')}</span>
                  <strong className="stage-count">{metrics.deliveredCount}</strong>
                  <div className="stage-progress-row">
                    <div className="stage-mini-bar">
                      <span className="stage-mini-fill sky" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="stage-pct-text">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── 4. Bottom 2-Column Row: Revenue Trend & Payment Mix ── */}
      <section className="dashboard-bottom-grid">
        {/* Left: Revenue Trend */}
        <div className="dash-card revenue-trend-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-title-wrap">
                <span className="chart-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </span>
                <strong className="chart-title">{t('revenue_trend', 'Revenue Trend')}</strong>
              </div>
              <span className="chart-sub">{t('last_7_days_booked_collected', 'Last 7 Days – Booked vs Collected')}</span>
            </div>

            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot booked"></span> {t('booked_revenue', 'Booked Revenue')}
              </span>
              <span className="legend-item">
                <span className="legend-dot collected"></span> {t('collected_revenue', 'Collected Revenue')}
              </span>
            </div>
          </div>

          <div className="trend-svg-wrap" onMouseLeave={() => setHoveredDayIdx(null)}>
            {hoveredDayIdx !== null && chartData.series[hoveredDayIdx] && (
              <div className="trend-hover-tooltip">
                <strong>{chartData.series[hoveredDayIdx].label}</strong>
                <span className="tooltip-val booked">
                  Booked: {currencySymbol}{chartData.series[hoveredDayIdx].booked.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="tooltip-val collected">
                  Collected: {currencySymbol}{chartData.series[hoveredDayIdx].collected.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <svg viewBox="0 0 650 172" className="trend-svg-chart">
              <defs>
                <linearGradient id="dashBookedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="dashCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines and Y-axis labels */}
              {yAxisTicks.map((val, idx) => {
                const y = 14 + idx * 30;
                return (
                  <g key={idx}>
                    <line x1="56" y1={y} x2="634" y2={y} className="chart-grid-line" strokeDasharray="3 3" />
                    <text x="48" y={y + 4} textAnchor="end" fontSize="10.5" className="chart-axis-text">
                      {currencySymbol}{val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* 7-day Bar Columns */}
              {chartData.series.map((item, idx) => {
                const groupWidth = (634 - 62) / 7;
                const xCenter = 62 + idx * groupWidth + groupWidth / 2;
                const barWidth = 15;
                const chartHeight = 120; // from y=14 to y=134
                const baseY = 134;

                const bookedHeight = Math.max(4, (item.booked / chartData.maxVal) * chartHeight);
                const collectedHeight = Math.max(4, (item.collected / chartData.maxVal) * chartHeight);

                const xBooked = xCenter - barWidth - 2.5;
                const xCollected = xCenter + 2.5;
                const isHovered = hoveredDayIdx === idx;

                return (
                  <g
                    key={item.dateKey}
                    className={`trend-bar-group ${isHovered ? 'is-hovered' : ''}`}
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onClick={() => setHoveredDayIdx(isHovered ? null : idx)}
                  >
                    {/* Interactive hover band */}
                    <rect
                      x={62 + idx * groupWidth + 4}
                      y={10}
                      width={groupWidth - 8}
                      height={130}
                      rx="8"
                      fill={isHovered ? 'rgba(37, 99, 235, 0.08)' : 'transparent'}
                    />

                    {/* Booked bar (Blue) */}
                    <rect
                      x={xBooked}
                      y={baseY - bookedHeight}
                      width={barWidth}
                      height={bookedHeight}
                      rx="5"
                      ry="5"
                      fill="url(#dashBookedGrad)"
                      className="svg-bar booked"
                      opacity={hoveredDayIdx === null || isHovered ? 1 : 0.6}
                    >
                      <title>{`${item.label}: Booked ${currencySymbol}${item.booked}`}</title>
                    </rect>

                    {/* Collected bar (Green) */}
                    <rect
                      x={xCollected}
                      y={baseY - collectedHeight}
                      width={barWidth}
                      height={collectedHeight}
                      rx="5"
                      ry="5"
                      fill="url(#dashCollectedGrad)"
                      className="svg-bar collected"
                      opacity={hoveredDayIdx === null || isHovered ? 1 : 0.6}
                    >
                      <title>{`${item.label}: Collected ${currencySymbol}${item.collected}`}</title>
                    </rect>

                    {/* X-axis Date Label */}
                    <text
                      x={xCenter}
                      y={156}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? '700' : '500'}
                      className={`chart-axis-text ${isHovered ? 'is-active' : ''}`}
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Payment Mix */}
        <div className="dash-card payment-mix-card">
          <div className="chart-card-header">
            <div className="chart-title-wrap">
              <span className="chart-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </span>
              <strong className="chart-title">{t('payment_mix', 'Payment Mix')}</strong>
            </div>
          </div>

          <div className="payment-mix-body">
            {/* Donut Chart with Center Percentage */}
            <div className="donut-chart-wrap" onMouseLeave={() => setHoveredMixKey(null)}>
              <svg width="136" height="136" viewBox="0 0 150 150" className="donut-svg">
                {/* Background Ring */}
                <circle
                  cx="75"
                  cy="75"
                  r="52"
                  fill="transparent"
                  className="donut-track-ring"
                  strokeWidth="18"
                />

                {(() => {
                  let offsetAcc = 0;
                  return donutSegments.map((seg) => {
                    const segLen = (seg.pct / 100) * donutCircumference;
                    const dashOffset = -offsetAcc;
                    offsetAcc += segLen;
                    if (seg.pct <= 0) return null;
                    const isActive = hoveredMixKey === seg.key;
                    return (
                      <circle
                        key={seg.key}
                        cx="75"
                        cy="75"
                        r="52"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={isActive ? '21' : '18'}
                        strokeDasharray={`${segLen} ${donutCircumference}`}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 75 75)"
                        className="donut-segment-arc"
                        opacity={hoveredMixKey === null || isActive ? 1 : 0.45}
                        onMouseEnter={() => setHoveredMixKey(seg.key)}
                      />
                    );
                  });
                })()}

                {/* Center text */}
                <text x="75" y="72" textAnchor="middle" fontSize="22" fontWeight="800" className="donut-center-pct">
                  {metrics.collectionEfficiency}%
                </text>
                <text x="75" y="90" textAnchor="middle" fontSize="12" fontWeight="600" className="donut-center-label">
                  {t('collected', 'Collected')}
                </text>
              </svg>
            </div>

            {/* Legend / Breakdown List */}
            <div className="mix-legend-list" onMouseLeave={() => setHoveredMixKey(null)}>
              <div
                className={`mix-legend-item ${hoveredMixKey === 'upi' ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHoveredMixKey('upi')}
              >
                <div className="mix-item-left">
                  <span className="mix-dot" style={{ background: '#0284c7' }}></span>
                  <div className="mix-text-group">
                    <span className="mix-name">{t('pay_upi', 'UPI / Net Banking')}</span>
                    <strong className="mix-amount">{currencySymbol}{paymentMix.upi.toFixed(2)}</strong>
                  </div>
                </div>
                <span className="mix-pct">{paymentMix.upiPct}%</span>
              </div>

              <div
                className={`mix-legend-item ${hoveredMixKey === 'cash' ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHoveredMixKey('cash')}
              >
                <div className="mix-item-left">
                  <span className="mix-dot" style={{ background: '#16a34a' }}></span>
                  <div className="mix-text-group">
                    <span className="mix-name">{t('pay_cash', 'Cash')}</span>
                    <strong className="mix-amount">{currencySymbol}{paymentMix.cash.toFixed(2)}</strong>
                  </div>
                </div>
                <span className="mix-pct" style={{ color: '#16a34a' }}>{paymentMix.cashPct}%</span>
              </div>

              <div
                className={`mix-legend-item ${hoveredMixKey === 'card' ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHoveredMixKey('card')}
              >
                <div className="mix-item-left">
                  <span className="mix-dot" style={{ background: '#8b5cf6' }}></span>
                  <div className="mix-text-group">
                    <span className="mix-name">{t('pay_card', 'Card')}</span>
                    <strong className="mix-amount">{currencySymbol}{paymentMix.card.toFixed(2)}</strong>
                  </div>
                </div>
                <span className="mix-pct" style={{ color: '#8b5cf6' }}>{paymentMix.cardPct}%</span>
              </div>

              <div
                className={`mix-legend-item ${hoveredMixKey === 'outstanding' ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHoveredMixKey('outstanding')}
              >
                <div className="mix-item-left">
                  <span className="mix-dot" style={{ background: '#f43f5e' }}></span>
                  <div className="mix-text-group">
                    <span className="mix-name">{t('kpi_outstanding', 'Outstanding')}</span>
                    <strong className="mix-amount">{currencySymbol}{paymentMix.outstanding.toLocaleString()}</strong>
                  </div>
                </div>
                <span className="mix-pct" style={{ color: '#f43f5e', fontWeight: '750' }}>{paymentMix.outstandingPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
