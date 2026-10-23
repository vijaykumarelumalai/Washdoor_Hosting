// src/components/CustomerManagement.jsx
// Complete Customer CRUD Management View with Full Master Data Visual Presentation

import React, { useState, useEffect, useCallback } from 'react';
import { getAllCustomers, searchCustomers, updateCustomer, deleteCustomer } from '../services/customerService';
import CustomerForm from './CustomerForm';
import { friendlySupabaseError, formatPhoneDisplay } from '../utils/validation';

export default function CustomerManagement({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
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
    } else {
      setCustomers(res.data || []);
    }
  }, [showToast]);

  useEffect(() => {
    loadData(query);
  }, [loadData, query]);

  const handleUpdate = async ({ customerData, existingCustomerId }) => {
    const { error } = await updateCustomer(existingCustomerId, customerData);
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
      </div>

      {/* ── Search & Filter ── */}
      <div className="toolbar" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by customer name, ID, mobile, address, city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            width: '380px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>{customers.length} customer records loaded</span>
          <button
            type="button"
            className="secondary"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={() => {
              loadData(query);
              showToast('↻ Customer records refreshed');
            }}
            title="Reload customers from database"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9aacc5' }}>
          Loading customer records…
        </div>
      ) : customers.length === 0 ? (
        <div className="orders" style={{ textAlign: 'center', padding: '48px', color: '#7e91ac' }}>
          <p style={{ fontSize: '18px', color: '#d8e0ed' }}>No customers found</p>
          <p>No customer records match your filter criteria.</p>
        </div>
      ) : (
        <div className="orders">
          {customers.map((c) => {
            const custId = c.customerId || c.customer_code || c.id || 'CUST-00001';
            const orderCount = c.orders?.[0]?.count ?? 1;
            const intakeType = c.intakeType || c.intake_type || 'Walk-In';
            const commPref = c.communicationPreference || c.communication_pref || 'WhatsApp';
            const commLang = c.preferredCommunicationLanguage || 'English';
            const isDnd = Boolean(c.doNotDisturb || c.dnd);
            const discount = c.defaultDiscountPercentage ?? c.default_discount ?? 0;
            const refCode = c.referralCode || c.referral_code;
            const mktSource = c.marketingSource || c.marketing_source || 'Walk-in';
            const membershipId = c.membershipId || c.membership_id;
            const classification = c.customerClassification || c.customer_classification || 'Regular Customer';
            const status = c.customerStatus || c.customer_status || 'Active';
            const priceList = c.priceList || c.price_list || 'Standard';
            const zone = c.areaServiceZone || 'Zone 1';
            const creditLimit = c.creditLimit ?? c.credit_limit ?? 0;
            const email = c.email;
            const altPhone = c.alternatePhoneNumber || c.alternate_phone;
            const gst = c.gstNumber || c.gst_number;
            const company = c.companyName || c.company_name;
            const notes = c.notes;
            const comments = c.internalComments || c.internal_comments;

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
                      <span className="tier">{c.tier || 'SILVER'}</span>
                      {c.tax_exemption && (
                        <span style={{ fontSize: '11px', color: '#ffd45c', background: '#3a300e', padding: '2px 8px', borderRadius: '12px' }}>
                          Tax Exempt
                        </span>
                      )}
                      {membershipId && (
                        <span style={{ fontSize: '11px', color: '#8a55ff', background: '#21133c', border: '1px solid #432179', padding: '2px 8px', borderRadius: '12px' }}>
                          💳 {membershipId}
                        </span>
                      )}
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
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      title="View Customer JSON record"
                      onClick={() => setViewingJsonCustomer(c)}
                    >
                      {'{ }'} JSON
                    </button>
                    <button
                      type="button"
                      className="select"
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={() => setEditingCustomer(c)}
                    >
                      ✏ Edit
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: '8px 12px', borderColor: '#792434', color: '#ff8b98', fontSize: '13px' }}
                      onClick={() => setDeleteConfirmTarget(c)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* ── Master Data Badges Row ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                  <span className="badge-tag badge-intake" title="Intake Method">
                    📥 {intakeType}
                  </span>
                  <span className="badge-tag badge-comm" title="Communication Preference & Language">
                    💬 {commPref} ({commLang})
                  </span>
                  <span className={`badge-tag ${isDnd ? 'badge-dnd' : 'badge-intake'}`} title="Do Not Disturb Status">
                    {isDnd ? '🔕 DND: Active' : '🔔 DND: Off'}
                  </span>
                  {discount > 0 && (
                    <span className="badge-tag badge-discount" title="Default Discount Percentage">
                      🏷️ {discount}% Discount
                    </span>
                  )}
                  <span className="badge-tag badge-zone" title="Service Zone">
                    🗺️ {zone}
                  </span>
                  <span className="badge-tag badge-price" title="Price List Scheme">
                    💲 {priceList}
                  </span>
                  <span className="badge-tag badge-intake" title="Customer Classification">
                    👤 {classification}
                  </span>
                  {creditLimit > 0 && (
                    <span className="badge-tag" style={{ background: '#0a3048', color: '#4ac7ff', border: '1px solid #145982' }} title="Approved Credit Limit">
                      💳 Credit Limit: ₹{Number(creditLimit).toLocaleString()}
                    </span>
                  )}
                  {refCode && (
                    <span className="badge-tag badge-intake" title="Referral Code">
                      🎟️ Ref: {refCode} ({mktSource})
                    </span>
                  )}
                </div>

                {/* ── Comments, Notes & Insights Bar ── */}
                {(comments || notes) && (
                  <div style={{ background: '#070f1d', border: '1px solid #16243a', borderRadius: '10px', padding: '8px 12px', fontSize: '12.5px', color: '#9bb0cd' }}>
                    {comments && <span><strong>Internal:</strong> {comments}</span>}
                    {comments && notes && <span> • </span>}
                    {notes && <span><strong>Notes:</strong> {notes}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── View JSON Modal ── */}
      {viewingJsonCustomer && (
        <div
          className="overlay"
          style={{ display: 'grid' }}
          onClick={(e) => {
            if (e.target.className === 'overlay') setViewingJsonCustomer(null);
          }}
        >
          <div className="modal" style={{ maxWidth: '720px' }}>
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
          style={{ display: 'grid' }}
          onClick={(e) => {
            if (e.target.className === 'overlay') setEditingCustomer(null);
          }}
        >
          <div className="modal" style={{ maxWidth: '820px' }}>
            <div className="modal-head">
              <div className="modal-icon">✏</div>
              <div className="modal-title">Edit Customer Record</div>
              <button
                type="button"
                className="close"
                onClick={() => setEditingCustomer(null)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <CustomerForm
                initialCustomer={editingCustomer}
                onBack={() => setEditingCustomer(null)}
                onSubmit={handleUpdate}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirmTarget && (
        <div className="overlay" style={{ display: 'grid' }}>
          <div className="modal" style={{ maxWidth: '480px', padding: '24px' }}>
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
