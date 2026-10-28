// src/components/CustomerManagement.jsx
// Complete Customer CRUD Management View with Full Master Data Visual Presentation

import React, { useState, useEffect, useCallback } from 'react';
import { getAllCustomers, searchCustomers, updateCustomer, deleteCustomer, createCustomer } from '../services/customerService';
import CustomerForm from './CustomerForm';
import { friendlySupabaseError, formatPhoneDisplay } from '../utils/validation';

export default function CustomerManagement({ showToast }) {
  // Stale-while-revalidate: instant local cache for 0ms load time
  const [customers, setCustomers] = useState(() => {
    try {
      const cached = localStorage.getItem('washdoor_customers_cache');
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [viewingJsonCustomer, setViewingJsonCustomer] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          onClick={() => setIsRegisteringNew(true)}
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
        <div className="toolbar-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7185a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by customer name, ID, mobile, address, city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '13px', color: '#90a4c0' }}>
            {customers.length} customer record{customers.length === 1 ? '' : 's'} loaded
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

      {/* ── Customer List with Skeleton Loader ── */}
      {loading && customers.length === 0 ? (
        <div className="orders">
          <div className="syncing-banner">
            <span className="sync-spinner"></span>
            <span>Connecting to Supabase and syncing customer records…</span>
          </div>
          {[1, 2, 3].map((n) => (
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
                <div className="skeleton-bar skeleton-bar-phone skeleton-shimmer"></div>
              </div>
              <div className="skeleton-btn skeleton-shimmer"></div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="orders" style={{ textAlign: 'center', padding: '48px', color: '#7e91ac' }}>
          <p style={{ fontSize: '18px', color: '#d8e0ed' }}>No customers found</p>
          <p>No customer records match your filter criteria.</p>
        </div>
      ) : (
        <div className="orders">
          {loading && (
            <div className="syncing-banner" style={{ margin: '0 0 6px 0', alignSelf: 'flex-start' }}>
              <span className="sync-spinner"></span>
              <span>Syncing latest customer records…</span>
            </div>
          )}
          {customers.map((c) => {
            const custId = c.customerId || c.customer_code || c.id || 'CUST-00001';
            const status = c.customerStatus || c.customer_status || 'Active';
            const displayMembershipId = c.membershipId || c.membership_id || `MEM-${(String(custId).match(/\d+/) ? String(custId).match(/\d+/)[0] : '1').padStart(5, '0')}`;
            const email = c.email;
            const altPhone = c.alternatePhoneNumber || c.alternate_phone;
            const gst = c.gstNumber || c.gst_number;
            const company = c.companyName || c.company_name;

            return (
              <div key={c.id || custId} className="cust-card">
                {/* ── Top Header Row ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div className="avatar" style={{ width: '46px', height: '46px', fontSize: '18px' }}>
                    {c.customer_name ? c.customer_name.slice(0, 2).toUpperCase() : 'CU'}
                  </div>

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="cust-id-pill">{custId}</span>
                      <strong style={{ fontSize: '17px', color: '#fff' }}>{c.customer_name}</strong>
                      <span className="phone" style={{ fontSize: '14px' }}>{formatPhoneDisplay(c.mobile_number)}</span>
                      <span className="badge-tag badge-status">{status}</span>
                      <span style={{ fontSize: '11px', color: '#a78bfa', background: '#21133c', border: '1px solid #432179', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        💳 {displayMembershipId}
                      </span>
                    </div>

                    {/* ── Subtitle: Contact Details & Location ── */}
                    <div className="muted" style={{ marginTop: '5px', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                      <span>📍 {c.address || c.streetArea || 'Street address'}, {c.city || 'Vellore'} {c.pincode ? `- ${c.pincode}` : ''}</span>
                      {email && <span>✉️ {email}</span>}
                      {altPhone && <span>📞 Alt: {formatPhoneDisplay(altPhone)}</span>}
                      {company && <span>🏢 {company} {gst ? `(GST: ${gst})` : ''}</span>}
                    </div>
                  </div>

                  {/* ── Action Buttons ── */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: '7px 13px', fontSize: '12.5px' }}
                      title="View Customer JSON record"
                      onClick={() => setViewingJsonCustomer(c)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span>JSON</span>
                    </button>
                    <button
                      type="button"
                      className="select"
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
                      className="secondary danger"
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
              </div>
            );
          })}
        </div>
      )}

      {/* ── View JSON Modal ── */}
      {viewingJsonCustomer && (
        <div
          className="overlay"
          style={{ display: 'flex' }}
          onClick={(e) => {
            if (e.target.className === 'overlay') setViewingJsonCustomer(null);
          }}
        >
          <div className="modal" style={{ width: '100%', maxWidth: '720px' }}>
            <div className="modal-head">
              <div className="modal-icon">{'{ }'}</div>
              <div>
                <div className="modal-title">Customer Master Data (JSON)</div>
                <div style={{ color: '#7a8fae', fontSize: '13px' }}>
                  {viewingJsonCustomer.customerId || viewingJsonCustomer.customer_code} • {viewingJsonCustomer.customerName || viewingJsonCustomer.customer_name}
                </div>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setViewingJsonCustomer(null)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px 24px 28px' }}>
              <pre className="json-pre-viewer">
                {JSON.stringify(viewingJsonCustomer, null, 2)}
              </pre>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setViewingJsonCustomer(null)}
                >
                  Close
                </button>
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
                  <span style={{ fontSize: '12.5px', color: '#9aacc5', fontWeight: '550' }}>
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
                <div style={{ fontSize: '12px', color: '#9aacc5' }}>
                  Register new customer profile
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
              isOrderFlow={false}
              submitLabel="Register Customer"
              onBack={() => setIsRegisteringNew(false)}
              onSubmit={({ customerData }) => {
                showToast(`✅ Customer ${customerData.customer_name} registered successfully!`);
                setIsRegisteringNew(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirmTarget && (
        <div className="overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div className="modal-head" style={{ padding: '0 0 16px', borderBottom: '1px solid #203049' }}>
              <div className="modal-title" style={{ fontSize: '20px', color: '#ff8b98' }}>
                Confirm Customer Deletion
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setDeleteConfirmTarget(null)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px 0', color: '#c8d3e4', fontSize: '14px', lineHeight: 1.6 }}>
              Are you sure you want to delete{' '}
              <strong style={{ color: '#fff' }}>{deleteConfirmTarget.customer_name}</strong> ({formatPhoneDisplay(deleteConfirmTarget.mobile_number)})?
              <br /><br />
              <span style={{ color: '#ffb4bc' }}>
                Note: In accordance with data integrity rules, if this customer has existing order history in Supabase, the database foreign key constraint will prevent deletion.
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                className="create"
                style={{ background: 'linear-gradient(120deg, #d32f2f, #9a0007)' }}
                onClick={() => handleDelete(deleteConfirmTarget.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
