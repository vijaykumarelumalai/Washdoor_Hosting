// src/components/CustomerManagement.jsx
// Complete Customer CRUD Management View with Full Master Data Visual Presentation

import React, { useState, useEffect, useCallback } from 'react';
import { getAllCustomers, searchCustomers, updateCustomer, deleteCustomer, createCustomer, getNextCustomerId } from '../services/customerService';
import CustomerForm from './CustomerForm';
import { friendlySupabaseError, formatPhoneDisplay, isMobileNumberQuery, formatDOB, getAgeFromDOB, normalizeMobileNumber } from '../utils/validation';

export default function CustomerManagement({ showToast }) {
  // Stale-while-revalidate: instant local cache for 0ms load time
  const [customers, setCustomers] = useState(() => {
    try {
      const cached = localStorage.getItem('washdoor_customers_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [nextCustId, setNextCustId] = useState('');
  const [prefillData, setPrefillData] = useState(null);
  const [expandedCustIds, setExpandedCustIds] = useState(new Set());
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ── Customer Pagination ──
  const [custsPageSizeKey, setCustsPageSizeKey] = useState('5');
  const [custPage, setCustPage] = useState(1);
  const CUSTS_PER_PAGE = custsPageSizeKey === 'all' ? Math.max(customers.length, 1) : parseInt(custsPageSizeKey, 10);

  // Toggle expandable drop-down card view
  const toggleExpandCustomer = (id) => {
    if (!id) return;
    setExpandedCustIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // One-click formatted customer profile copy
  const handleCopyCustomer = (c) => {
    const name = c.customer_name || c.customerName || 'Customer';
    const id = c.customerId || c.customer_code || c.customer_id || '';
    const phone = formatPhoneDisplay(c.mobile_number || c.mobileNumber);
    const alt = c.alternate_phone || c.alternatePhoneNumber ? formatPhoneDisplay(c.alternate_phone || c.alternatePhoneNumber) : null;
    const email = c.email || c.contactDetails?.email;
    const address = [c.address || c.streetArea, c.city, c.pincode].filter(Boolean).join(', ');
    const company = c.company_name || c.companyName;
    const gst = c.gst_number || c.gstNumber;

    const lines = [
      `*Customer Profile: ${name} (${id})*`,
      `📞 Mobile: ${phone}`,
      alt ? `📞 Alt Phone: ${alt}` : null,
      email ? `✉️ Email: ${email}` : null,
      address ? `📍 Address: ${address}` : null,
      company ? `🏢 Company: ${company}` : null,
      gst ? `🧾 GSTIN: ${gst}` : null,
      c.customer_status ? `Status: ${c.customer_status}` : null,
    ].filter(Boolean).join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lines).then(() => {
        showToast?.(`Copied ${name}'s details to clipboard!`, 'info');
      }).catch(() => {});
    }
  };

  function formatRegisteredDate(isoDate) {
    if (!isoDate) return null;
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  }

  // Lock background scroll when any dialog or modal is open
  const isAnyModalOpen = Boolean(editingCustomer || isRegisteringNew || deleteConfirmTarget);
  useEffect(() => {
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // Window scroll event listener for Scroll To Top control
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRegister = async (presetData = null) => {
    setPrefillData(presetData);
    try {
      const nextId = await getNextCustomerId();
      if (nextId) setNextCustId(nextId);
    } catch {}
    setIsRegisteringNew(true);
  };

  const handleOpenRegisterWithNumber = (searchedTerm) => {
    const digitsOnly = String(searchedTerm || '').replace(/\D/g, '');
    const cleanNumber = digitsOnly.length === 12 && digitsOnly.startsWith('91')
      ? digitsOnly.slice(2)
      : digitsOnly.length === 11 && digitsOnly.startsWith('0')
      ? digitsOnly.slice(1)
      : digitsOnly;

    handleOpenRegister(cleanNumber ? { mobile_number: cleanNumber.slice(-10) } : null);
  };

  const loadData = useCallback(async (q = '') => {
    setLoading(true);
    let res;
    if (q.trim()) {
      res = await searchCustomers(q);
    } else {
      res = await getAllCustomers();
    }
    setLoading(false);

    if (res.error) {
      showToast(`⚠️ ${friendlySupabaseError(res.error)}`);
    } else if (res.data && Array.isArray(res.data)) {
      setCustomers(res.data);
      if (!q.trim()) {
        try {
          localStorage.setItem('washdoor_customers_cache', JSON.stringify(res.data));
        } catch {}
      }
    }
  }, [showToast]);

  useEffect(() => {
    loadData(query);
  }, [loadData, query]);

  // Reset to page 1 whenever search query or page size changes
  useEffect(() => {
    setCustPage(1);
  }, [query, custsPageSizeKey]);

  const handleUpdate = async ({ customerData, existingCustomerId }) => {
    const targetId = existingCustomerId || editingCustomer?.customerId || editingCustomer?.customer_id || customerData?.customer_id;
    const { error } = await updateCustomer(targetId, customerData);
    if (error) {
      showToast(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }
    showToast(`✅ Customer ${customerData.customer_name} updated successfully.`);
    setEditingCustomer(null);
    loadData(query);
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    const { error } = await deleteCustomer(id);
    setIsDeleting(false);
    setDeleteConfirmTarget(null);

    if (error) {
      showToast(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }
    showToast('✅ Customer deleted successfully.');
    loadData(query);
  };

  // ── Pagination computed values ──
  const custTotalPages = Math.max(1, Math.ceil(customers.length / CUSTS_PER_PAGE));
  const paginatedCustomers = custsPageSizeKey === 'all'
    ? customers
    : customers.slice((custPage - 1) * CUSTS_PER_PAGE, custPage * CUSTS_PER_PAGE);

  return (
    <div>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div>
          <h1>Customer Master Records</h1>
          <div className="muted">Direct CRUD operations: View, Search, Edit, and Manage Master Customers</div>
        </div>
        <button
          type="button"
          className="create"
          onClick={() => handleOpenRegister(null)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Register Customer</span>
        </button>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '780px', flexWrap: 'wrap' }}>
          <div className="toolbar-search-wrap cust-search-wrap" style={{ flex: 1, minWidth: '280px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7185a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search by customer name, ID, mobile, address, city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                padding: 0,
                margin: 0,
                width: '100%',
                height: '100%',
                fontSize: '13.5px',
                color: 'inherit',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                title="Clear search"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7185a1',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          {/* Show Register Customer button next to search ONLY when query is a valid mobile number and not found */}
          {Boolean(isMobileNumberQuery(query) && customers.length === 0 && !loading) && (
            <button
              type="button"
              className="create search-register-btn"
              onClick={() => handleOpenRegisterWithNumber(query.trim())}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '44px',
                padding: '0 18px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Register Customer</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
          <span className="cust-count-badge">
            {customers.length} customer record{customers.length === 1 ? '' : 's'} loaded{custTotalPages > 1 ? ` · Page ${custPage}/${custTotalPages}` : ''}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={loading}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              loadData(query);
              showToast('↻ Syncing customer records...');
            }}
            title="Reload customers from database"
          >
            <svg
              className={loading ? 'sync-spinner' : ''}
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
            <span>{loading ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Customer List Loading State with Theme-Adaptive Skeleton Cards ── */}
      {loading ? (
        <div className="orders">
          <div className="syncing-banner" style={{ margin: '16px 0', alignSelf: 'flex-start' }}>
            <span className="sync-spinner"></span>
            <span>{customers.length > 0 ? 'Syncing latest customer records with Supabase…' : 'Connecting to Supabase and syncing customer records…'}</span>
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-cust-card">
              <div className="skeleton-cust-header">
                <div className="skeleton-avatar skeleton-shimmer"></div>
                <div className="skeleton-cust-info">
                  <div className="skeleton-cust-row">
                    <div className="skeleton-bar skeleton-cust-id skeleton-shimmer"></div>
                    <div className="skeleton-bar skeleton-cust-name skeleton-shimmer"></div>
                    <div className="skeleton-bar skeleton-cust-phone skeleton-shimmer"></div>
                  </div>
                  <div className="skeleton-bar skeleton-cust-sub skeleton-shimmer"></div>
                </div>
                <div className="skeleton-cust-actions">
                  <div className="skeleton-btn skeleton-btn-sm skeleton-shimmer"></div>
                  <div className="skeleton-btn skeleton-btn-sm skeleton-shimmer"></div>
                  <div className="skeleton-btn skeleton-btn-sm skeleton-shimmer"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="orders" style={{ textAlign: 'center', padding: '52px 20px', color: '#7e91ac' }}>
          {/* Animated 3D/Layered Not-Found Illustration matching user reference */}
          <div className="empty-illustration-container">
            <svg
              width="240"
              height="165"
              viewBox="0 0 240 165"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Atmospheric Glow */}
                <radialGradient id="emptyGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>

                {/* ID Card Glossy Gradient */}
                <linearGradient id="emptyCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fbff" />
                  <stop offset="40%" stopColor="#dbeafe" />
                  <stop offset="100%" stopColor="#bfdbfe" />
                </linearGradient>

                {/* Back Envelope Gradient */}
                <linearGradient id="emptyEnvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>

                {/* Magnifier Rim Gradient */}
                <linearGradient id="emptyMagRim" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>

                {/* Magnifier Glass Dark Gradient */}
                <linearGradient id="emptyMagGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0c2340" />
                  <stop offset="100%" stopColor="#051224" />
                </linearGradient>

                {/* Card Drop Shadow */}
                <filter id="emptyShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Background Glow */}
              <ellipse cx="120" cy="80" rx="85" ry="60" fill="url(#emptyGlow)" />

              {/* Floating Twinkling Stars (Left Side) */}
              <g className="empty-star-a">
                <path
                  d="M 36 26 Q 36 32 42 32 Q 36 32 36 38 Q 36 32 30 32 Q 36 32 36 26 Z"
                  fill="#ffffff"
                  opacity="0.9"
                />
              </g>
              <g className="empty-star-b">
                <path
                  d="M 22 61 Q 22 66 27 66 Q 22 66 22 71 Q 22 66 17 66 Q 22 66 22 61 Z"
                  fill="#67e8f9"
                  opacity="0.85"
                />
              </g>
              <g className="empty-star-a">
                <path
                  d="M 32 88 Q 32 92 36 92 Q 32 92 32 96 Q 32 92 28 92 Q 32 92 32 88 Z"
                  fill="#93c5fd"
                  opacity="0.75"
                />
              </g>

              {/* Floating Twinkling Stars (Right Side) */}
              <g className="empty-star-b">
                <path
                  d="M 186 24 Q 186 30 192 30 Q 186 30 186 36 Q 186 30 180 30 Q 186 30 186 24 Z"
                  fill="#ffffff"
                  opacity="0.95"
                />
              </g>
              <g className="empty-star-a">
                <path
                  d="M 206 57 Q 206 62 211 62 Q 206 62 206 67 Q 206 62 201 62 Q 206 62 206 57 Z"
                  fill="#38bdf8"
                  opacity="0.8"
                />
              </g>
              <g className="empty-star-b">
                <path
                  d="M 196 84 Q 196 88 200 88 Q 196 88 196 92 Q 196 88 192 88 Q 196 88 196 84 Z"
                  fill="#93c5fd"
                  opacity="0.75"
                />
              </g>

              {/* Back Blue Card / Envelope (Tilted Left) */}
              <g transform="rotate(-12 55 90)">
                <rect
                  x="42"
                  y="62"
                  width="54"
                  height="42"
                  rx="9"
                  fill="url(#emptyEnvGrad)"
                  stroke="#60a5fa"
                  strokeWidth="1.2"
                  filter="url(#emptyShadow)"
                />
                <path
                  d="M 43 65 L 69 82 L 95 65"
                  stroke="#93c5fd"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.65"
                  strokeLinecap="round"
                />
              </g>

              {/* Main Profile / ID Document Card */}
              <g filter="url(#emptyShadow)">
                <rect
                  x="78"
                  y="24"
                  width="88"
                  height="116"
                  rx="16"
                  fill="url(#emptyCardGrad)"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                />

                {/* Avatar Badge Circle */}
                <circle cx="122" cy="56" r="18.5" fill="#1e3a8a" />

                {/* Avatar Silhouette User Icon */}
                <circle cx="122" cy="51" r="5.6" fill="#f8fafc" />
                <path
                  d="M 111 67.5 C 111 62 115 59.8 122 59.8 C 129 59.8 133 62 133 67.5 Z"
                  fill="#f8fafc"
                />

                {/* Profile Placeholder Lines */}
                <rect x="94" y="85" width="56" height="5.5" rx="2.75" fill="#60a5fa" />
                <rect x="99" y="96" width="46" height="4.5" rx="2.25" fill="#93c5fd" />
                <rect x="103" y="106" width="38" height="4.5" rx="2.25" fill="#bfdbfe" />
              </g>

              {/* Alert Bubble (Top-Right) */}
              <g className="empty-alert-bubble">
                <circle
                  cx="174"
                  cy="38"
                  r="13.5"
                  fill="#061830"
                  stroke="#0284c7"
                  strokeWidth="2.4"
                  filter="url(#emptyShadow)"
                />
                <circle cx="174" cy="38" r="10.5" fill="#082245" />
                <line
                  x1="174"
                  y1="31"
                  x2="174"
                  y2="39"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="174" cy="44.2" r="1.4" fill="#38bdf8" />
              </g>

              {/* Magnifying Glass with Not-Found Mark (Foreground Bottom-Right) */}
              <g className="empty-magnifier">
                <line
                  x1="172"
                  y1="118"
                  x2="194"
                  y2="140"
                  stroke="#0284c7"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <line
                  x1="174"
                  y1="120"
                  x2="190"
                  y2="136"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />

                <circle
                  cx="158"
                  cy="104"
                  r="21.5"
                  fill="url(#emptyMagGlass)"
                  stroke="url(#emptyMagRim)"
                  strokeWidth="4.8"
                  filter="url(#emptyShadow)"
                />

                <circle
                  cx="158"
                  cy="104"
                  r="10"
                  stroke="#38bdf8"
                  strokeWidth="2.6"
                  fill="none"
                  opacity="0.95"
                />
                <line
                  x1="151"
                  y1="97"
                  x2="165"
                  y2="111"
                  stroke="#38bdf8"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  opacity="0.95"
                />
              </g>
            </svg>
          </div>
          <p className="empty-title">No customers found</p>
          <p className="empty-subtitle">No customer records match your filter criteria.</p>
        </div>
      ) : (
        <div className="orders">
          {paginatedCustomers.map((c) => {
            const custId = c.customerId || c.customer_code || c.customer_id || c.id || '';
            const status = c.customerStatus || c.customer_status || '';
            const displayMembershipId = c.membershipId || c.membership_id || '';
            const email = c.email || c.contactDetails?.email;
            const altPhone = c.alternatePhoneNumber || c.alternate_phone || c.contactDetails?.alternatePhoneNumber;
            const gst = c.gstNumber || c.gst_number;
            const company = c.companyName || c.company_name;
            const name = c.customer_name || c.customerName || 'Customer';
            const locationParts = [c.address || c.streetArea || c.street_area, c.city, c.pincode].filter(Boolean);
            const cardKey = c.id || custId;
            const isExpanded = expandedCustIds.has(cardKey);
            const cleanMobile = normalizeMobileNumber(c.mobile_number || c.mobileNumber);
            const age = getAgeFromDOB(c.date_of_birth);
            const regDate = formatRegisteredDate(c.created_at || c.registered_at);

            return (
              <div key={cardKey} className="cust-card">
                {/* ── Top Header Row ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div className="avatar" style={{ width: '46px', height: '46px', fontSize: '18px' }}>
                    {name.slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {custId && <span className="cust-id-pill">{custId}</span>}
                      <strong className="cust-name-text" style={{ fontSize: '17px' }}>{name}</strong>
                      <span className="phone" style={{ fontSize: '14px' }}>{formatPhoneDisplay(c.mobile_number || c.mobileNumber)}</span>
                      {status && <span className="badge-tag badge-status">{status}</span>}
                      {displayMembershipId && (
                        <span className="membership-id-badge">
                          💳 {displayMembershipId}
                        </span>
                      )}
                    </div>

                    {/* ── Subtitle: Contact Details & Location ── */}
                    <div className="muted" style={{ marginTop: '5px', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                      {locationParts.length > 0 && <span>📍 {locationParts.join(', ')}</span>}
                      {email && <span>✉️ {email}</span>}
                      {altPhone && <span>📞 Alt: {formatPhoneDisplay(altPhone)}</span>}
                      {company && <span>🏢 {company} {gst ? `(GST: ${gst})` : ''}</span>}
                      {Array.isArray(c.additional_addresses) && c.additional_addresses.length > 0 && (
                        <span className="additional-addr-count">
                          🏠 +{c.additional_addresses.length} additional address{c.additional_addresses.length > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Action Buttons ── */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`secondary cust-btn-view ${isExpanded ? 'active' : ''}`}
                      style={{ padding: '7px 13px', fontSize: '12.5px' }}
                      title={isExpanded ? 'Collapse Customer Details' : 'View Full Customer Profile'}
                      onClick={() => toggleExpandCustomer(cardKey)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>{isExpanded ? 'Hide' : 'View'}</span>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`cust-chevron ${isExpanded ? 'rotated' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="select cust-btn-edit"
                      style={{ padding: '7px 14px', fontSize: '12.5px' }}
                      onClick={() => setEditingCustomer(c)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="secondary danger cust-btn-delete"
                      style={{ padding: '7px 13px', fontSize: '12.5px' }}
                      onClick={() => setDeleteConfirmTarget(c)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* ── Drop Card View (Professional & Unique Master Record Drawer) ── */}
                {isExpanded && (
                  <div className="cust-drop-view">
                    {/* ── Ribbon: Quick Stats & Instant Connect ── */}
                    <div className="cust-drop-ribbon">
                      <div className="cust-drop-tags">
                        <span className="cust-meta-chip id-chip">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><line x1="15" y1="8" x2="17" y2="8"/><line x1="15" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
                          {custId}
                        </span>
                        {displayMembershipId && (
                          <span className="cust-meta-chip member-chip">
                            💳 {displayMembershipId}
                          </span>
                        )}
                        <span className="cust-meta-chip tier-chip">
                          {c.customer_classification || c.customerClassification || 'Regular Customer'}
                        </span>
                        <span className="cust-meta-chip price-chip">
                          💰 {c.price_list || c.priceList || 'Standard Price List'}
                        </span>
                        {c.service_zone && (
                          <span className="cust-meta-chip zone-chip">
                            📍 {c.service_zone}
                          </span>
                        )}
                        {regDate && (
                          <span className="cust-meta-chip date-chip">
                            📅 Joined {regDate}
                          </span>
                        )}
                      </div>

                      <div className="cust-quick-actions">
                        {cleanMobile && (
                          <>
                            <a
                              href={`tel:+91${cleanMobile}`}
                              className="cust-quick-action action-call"
                              title="Call customer"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              <span>Call</span>
                            </a>
                            <a
                              href={`https://wa.me/91${cleanMobile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cust-quick-action action-wa"
                              title="Chat on WhatsApp"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                              <span>WhatsApp</span>
                            </a>
                          </>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="cust-quick-action action-mail"
                            title="Send email"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span>Email</span>
                          </a>
                        )}
                        {(c.map_link || locationParts.length > 0) && (
                          <a
                            href={c.map_link || `https://maps.google.com/?q=${encodeURIComponent(locationParts.join(', '))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cust-quick-action action-map"
                            title="Open Google Maps location"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>Map</span>
                          </a>
                        )}
                        <button
                          type="button"
                          className="cust-quick-action action-copy"
                          onClick={() => handleCopyCustomer(c)}
                          title="Copy customer details to clipboard"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* ── Bento Grid: 3 Structured Columns ── */}
                    <div className="cust-bento-grid">
                      {/* ── Column 1: Identity & Profile ── */}
                      <div className="cust-bento-card">
                        <div className="cust-bento-header">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span>Personal & Identity</span>
                        </div>
                        <div className="cust-bento-body">
                          <div className="cust-bento-item">
                            <span className="lbl">Full Name</span>
                            <span className="val highlight">{name}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Date of Birth</span>
                            <span className="val">
                              {c.date_of_birth ? `${formatDOB(c.date_of_birth)}${age ? ` (${age} yrs)` : ''}` : <span className="muted-dash">—</span>}
                            </span>
                          </div>
                          {c.anniversary_date && (
                            <div className="cust-bento-item">
                              <span className="lbl">Anniversary</span>
                              <span className="val">💍 {formatDOB(c.anniversary_date)}</span>
                            </div>
                          )}
                          {c.special_occasion && (
                            <div className="cust-bento-item">
                              <span className="lbl">Special Occasion</span>
                              <span className="val">🎉 {c.special_occasion} {c.special_occasion_date ? `(${formatDOB(c.special_occasion_date)})` : ''}</span>
                            </div>
                          )}
                          <div className="cust-bento-item">
                            <span className="lbl">Marketing Source</span>
                            <span className="val">{c.marketing_source || 'Walk-in'}</span>
                          </div>
                          {c.referral_code && (
                            <div className="cust-bento-item">
                              <span className="lbl">Referral Code</span>
                              <span className="val code-val">{c.referral_code}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Column 2: Contact & Communication ── */}
                      <div className="cust-bento-card">
                        <div className="cust-bento-header">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <span>Contact & Preferences</span>
                        </div>
                        <div className="cust-bento-body">
                          <div className="cust-bento-item">
                            <span className="lbl">Primary Mobile</span>
                            <span className="val">{formatPhoneDisplay(c.mobile_number || c.mobileNumber)}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Alternate Phone</span>
                            <span className="val">{altPhone ? formatPhoneDisplay(altPhone) : <span className="muted-dash">—</span>}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Email Address</span>
                            <span className="val">{email || <span className="muted-dash">—</span>}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Preferred Language</span>
                            <span className="val">{c.communication_lang || c.preferred_language || 'English'}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Channel Preference</span>
                            <span className="val">{c.communication_pref || 'WhatsApp'}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">DND Notifications</span>
                            <span className="val">
                              {c.dnd ? (
                                <span className="dnd-pill dnd-active">⛔ DND Active</span>
                              ) : (
                                <span className="dnd-pill dnd-ok">✓ Notifications Allowed</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Column 3: Commercial & Billing ── */}
                      <div className="cust-bento-card">
                        <div className="cust-bento-header">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                          <span>Commercial & Billing</span>
                        </div>
                        <div className="cust-bento-body">
                          <div className="cust-bento-item">
                            <span className="lbl">Company / Entity</span>
                            <span className="val">{company || 'Individual Account'}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">GSTIN / Tax ID</span>
                            <span className="val gst-val">{gst || <span className="muted-dash">—</span>}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Tax Exemption</span>
                            <span className="val">
                              {c.tax_exemption ? (
                                <span className="tax-pill tax-exempt">Tax Exempt</span>
                              ) : (
                                <span className="tax-pill tax-std">Standard Taxable (GST)</span>
                              )}
                            </span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Price List Tier</span>
                            <span className="val">{c.price_list || 'Standard'}</span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Default Discount</span>
                            <span className="val">
                              {c.default_discount || c.default_discount_pct ? `${c.default_discount || c.default_discount_pct}% OFF` : '0%'}
                            </span>
                          </div>
                          <div className="cust-bento-item">
                            <span className="lbl">Credit Limit</span>
                            <span className="val">
                              {c.credit_limit ? `₹${Number(c.credit_limit).toLocaleString('en-IN')}` : 'No credit limit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Full Width Section: Primary Address & Additional Addresses ── */}
                    <div className="cust-address-section">
                      <div className="cust-address-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>Addresses & Delivery Locations</span>
                      </div>
                      <div className="cust-primary-address-box">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <div className="addr-tag-main">Primary Address</div>
                            <div className="addr-text">
                              {c.address || c.streetArea || 'No street address recorded'}
                            </div>
                            <div className="addr-sub">
                              {[c.city, c.pincode ? `PIN: ${c.pincode}` : '', c.service_zone ? `Zone: ${c.service_zone}` : ''].filter(Boolean).join(' • ')}
                            </div>
                          </div>
                          {c.map_link && (
                            <a
                              href={c.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="map-button"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              <span>View Map</span>
                            </a>
                          )}
                        </div>

                        {/* Additional Addresses (if present) */}
                        {Array.isArray(c.additional_addresses) && c.additional_addresses.length > 0 && (
                          <div className="cust-additional-grid">
                            {c.additional_addresses.map((addr, idx) => (
                              <div key={idx} className="cust-additional-card">
                                <div className="addr-badge">
                                  {addr.label || addr.addressType || `Address #${idx + 1}`}
                                </div>
                                <div className="addr-content">
                                  {addr.streetAddress || addr.address || addr.addressLine1}
                                </div>
                                {addr.landmark && (
                                  <div className="addr-landmark">🚩 Landmark: {addr.landmark}</div>
                                )}
                                <div className="addr-citypin">
                                  {[addr.city, addr.pincode].filter(Boolean).join(' - ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Preferences & Internal Staff Notes (if present) ── */}
                    {(c.service_category || c.preference || c.preference_notes || c.internal_comments || c.notes) && (
                      <div className="cust-notes-section">
                        {c.service_category || c.preference ? (
                          <div className="cust-pref-box">
                            <span className="pref-lbl">Service Preference:</span>
                            <span className="pref-val">🧺 {c.service_category || c.preference}</span>
                            {c.preference_notes && (
                              <span className="pref-sub">({c.preference_notes})</span>
                            )}
                          </div>
                        ) : null}
                        {(c.internal_comments || c.notes) && (
                          <div className="cust-pref-box">
                            <span className="comment-lbl">📌 Staff Notes:</span>
                            <span className="comment-val">{c.internal_comments || c.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* ── Customer Pagination Bar ── */}
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing {customers.length === 0 ? 0 : ((custPage - 1) * CUSTS_PER_PAGE) + 1}–{Math.min(custPage * CUSTS_PER_PAGE, customers.length)} of {customers.length} customers
            </span>
            <div className="pagination-right">
              <div className="pagination-size-wrap">
                <label className="pagination-size-label">Show:</label>
                <select
                  className="pagination-size-select"
                  value={custsPageSizeKey}
                  onChange={(e) => { setCustsPageSizeKey(e.target.value); setCustPage(1); }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCustPage(1)}
                  disabled={custPage === 1}
                  title="First page"
                >«</button>
                <button
                  className="pagination-btn"
                  onClick={() => setCustPage(p => Math.max(1, p - 1))}
                  disabled={custPage === 1}
                  title="Previous page"
                >‹</button>
                {Array.from({ length: custTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === custTotalPages || Math.abs(p - custPage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={item}
                        className={`pagination-btn pagination-num ${item === custPage ? 'active' : ''}`}
                        onClick={() => setCustPage(item)}
                      >{item}</button>
                    )
                  )}
                <button
                  className="pagination-btn"
                  onClick={() => setCustPage(p => Math.min(custTotalPages, p + 1))}
                  disabled={custPage === custTotalPages}
                  title="Next page"
                >›</button>
                <button
                  className="pagination-btn"
                  onClick={() => setCustPage(custTotalPages)}
                  disabled={custPage === custTotalPages}
                  title="Last page"
                >»</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingCustomer && (
        <div
          className="overlay"
          style={{ display: 'flex' }}
          onClick={(e) => {
            if (e.target.className === 'overlay') setEditingCustomer(null);
          }}
        >
          <div className="modal" style={{ width: '100%', maxWidth: '820px' }}>
            <div className="modal-head">
              <div className="modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                <div className="modal-title">Edit Customer Record</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="cust-id-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                    {editingCustomer.customerId || editingCustomer.customer_id || `CUST-${String(editingCustomer.id).padStart(5, '0')}`}
                  </span>
                  <span className="modal-sub-label">
                    {editingCustomer.customer_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setEditingCustomer(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <CustomerForm
              initialCustomer={editingCustomer}
              customerId={editingCustomer.customerId || editingCustomer.customer_id || `CUST-${String(editingCustomer.id).padStart(5, '0')}`}
              isOrderFlow={false}
              submitLabel="Update Customer Record"
              onBack={() => setEditingCustomer(null)}
              onSubmit={handleUpdate}
            />
          </div>
        </div>
      )}

      {/* ── Register New Customer Modal ── */}
      {isRegisteringNew && (
        <div
          className="overlay"
          style={{ display: 'flex' }}
          onClick={(e) => {
            if (e.target.className === 'overlay') setIsRegisteringNew(false);
          }}
        >
          <div className="modal" style={{ width: '100%', maxWidth: '820px' }}>
            <div className="modal-head">
              <div className="modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                <div className="modal-title">Register New Customer</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="cust-id-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                    {nextCustId}
                  </span>
                  <span className="modal-sub-label">
                    Register new customer profile &amp; master account
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setIsRegisteringNew(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <CustomerForm
              initialCustomer={prefillData}
              customerId={nextCustId}
              isOrderFlow={false}
              submitLabel="Register Customer"
              onBack={() => {
                setIsRegisteringNew(false);
                setPrefillData(null);
              }}
              onSubmit={async ({ customerData }) => {
                const res = await createCustomer({
                  ...customerData,
                  customer_id: nextCustId,
                });
                if (res.error) {
                  showToast(`⚠️ ${friendlySupabaseError(res.error)}`);
                  return;
                }
                const assignedId = res.data?.id || res.data?.customerId || nextCustId;
                showToast(`✅ Customer ${customerData.customer_name} registered successfully with ID ${assignedId}!`);
                setIsRegisteringNew(false);
                setPrefillData(null);
                await loadData(query);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirmTarget && (
        <div className="overlay" style={{ display: 'flex' }}>
          <div className="modal delete-confirm-modal">
            <div className="modal-head delete-confirm-head">
              <div className="modal-title delete-confirm-title">
                Confirm Customer Deletion
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setDeleteConfirmTarget(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="delete-confirm-body">
              Are you sure you want to delete{' '}
              <strong className="cust-name-text">{deleteConfirmTarget.customer_name}</strong> ({formatPhoneDisplay(deleteConfirmTarget.mobile_number)})?
              <div className="delete-confirm-warning-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>
                  <strong>Data Integrity Guard:</strong> If this customer has existing order history in Supabase, the database foreign key constraint will safely prevent deletion.
                </span>
              </div>
            </div>
            <div className="delete-confirm-footer">
              <button
                type="button"
                className="secondary"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-btn"
                onClick={() => handleDelete(deleteConfirmTarget.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Smooth Scroll-To-Top Control ── */}
      {showScrollTop && (
        <button
          type="button"
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          title="Back to top"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
