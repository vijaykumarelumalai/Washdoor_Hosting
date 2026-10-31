// src/components/ViewOrderModal.jsx
// Comprehensive Quick View Order Modal for Washdoor POS (Read-Only Dynamic Overview)

import React, { useState, useEffect } from 'react';
import '../styles/ViewOrderModal.css';

export default function ViewOrderModal({
  isOpen,
  order,
  onClose,
  onOpenEdit,
  currencySymbol = '₹',
  showToast,
}) {
  const [copied, setCopied] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (enlargedPhoto) {
          setEnlargedPhoto(null);
        } else {
          onClose?.();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enlargedPhoto, onClose]);

  if (!isOpen || !order) return null;

  const orderNum = order.order_number || order.order_id || order.id || 'ORD-00000';
  const custName = order.customer_name || order.customer?.customer_name || 'Walk-in Customer';
  const phone = order.mobile_number || order.customer?.mobile_number || '—';
  const altPhone = order.alternate_phone || order.customer?.alternate_phone || '';
  const email = order.email || order.customer?.email || '';
  const address = order.address || order.delivery_address || order.customer?.address || 'Counter Walk-In';
  const status = order.status || order.order_status || 'Order Received';
  const priority = order.priority || 'Normal';
  const intakeMethod = order.intake_method || order.order_type || 'Walk-In';
  const expectedDelivery = order.expected_delivery || order.delivery_date || '—';
  const notes = order.order_notes || order.comments || order.special_instructions || '';
  const assignedStaff = order.assigned_driver_full || order.assigned_staff || order.assigned_driver || 'Store Central';

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_amount || order.discount || 0);
  const tax = Number(order.tax_amount || order.tax || 0);
  const grandTotal = Number(order.total_amount || order.grand_total || 0);
  const advancePaid = Number(order.advance_paid || 0);
  const balanceDue = Number(order.balance_due !== undefined ? order.balance_due : Math.max(0, grandTotal - advancePaid));
  const paymentStatus = order.payment_status || (balanceDue <= 0 ? 'Paid' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid');
  const paymentMethod = order.payment_method || order.payment?.mode || 'Cash';

  const items = Array.isArray(order.items) ? order.items : [];
  const totalPieces = Number(order.total_pieces || order.item_count || items.reduce((s, i) => s + (Number(i.qty) || 1), 0));

  // Extract garment inspection pieces
  let inspections = {};
  if (order.garment_inspections && typeof order.garment_inspections === 'object') {
    inspections = order.garment_inspections;
  } else if (order.inspections && typeof order.inspections === 'object' && !Array.isArray(order.inspections)) {
    inspections = order.inspections;
  } else if (items.length > 0) {
    items.forEach((it) => {
      if (it.inspections && Array.isArray(it.inspections)) {
        it.inspections.forEach((insp) => {
          if (insp.id) inspections[insp.id] = insp;
        });
      }
    });
  }
  const inspectionPieces = Object.values(inspections);

  // Status step index calculation
  const statusLower = status.toLowerCase();
  let stepIndex = 0;
  if (statusLower.includes('cancel')) {
    stepIndex = -1;
  } else if (statusLower.includes('deliver') || statusLower.includes('complete')) {
    stepIndex = 3;
  } else if (statusLower.includes('ready')) {
    stepIndex = 2;
  } else if (statusLower.includes('progress') || statusLower.includes('wash')) {
    stepIndex = 1;
  } else {
    stepIndex = 0;
  }

  const handleCopyOrderNum = () => {
    navigator.clipboard?.writeText(orderNum);
    setCopied(true);
    showToast?.(`📋 Copied order number ${orderNum}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeClass = () => {
    if (statusLower.includes('cancel')) return 'status-cancelled';
    if (statusLower.includes('deliver')) return 'status-delivered';
    if (statusLower.includes('ready')) return 'status-ready';
    if (statusLower.includes('progress')) return 'status-progress';
    return 'status-received';
  };

  return (
    <div className="view-order-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="view-order-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Top Header Bar ── */}
        <div className="view-order-header">
          <div className="view-order-title-wrap">
            <span className="view-order-num">
              <span>🧾</span>
              <span>{orderNum}</span>
            </span>
            <button
              type="button"
              className="view-order-copy-btn"
              onClick={handleCopyOrderNum}
              title="Copy Order Number"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>

            {/* Badges */}
            <span className={`view-order-badge ${getStatusBadgeClass()}`}>
              <span>●</span>
              <span>{status}</span>
            </span>

            <span className={`view-order-badge ${priority === 'Urgent' ? 'priority-urgent' : 'priority-normal'}`}>
              {priority === 'Urgent' ? '⚡ Urgent' : '● Normal'}
            </span>

            <span className="view-order-badge intake-badge">
              {intakeMethod.toLowerCase().includes('delivery') || intakeMethod.toLowerCase().includes('pickup') ? '🚚 ' : '🚶 '}
              {intakeMethod}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="view-order-actions">
            <button
              type="button"
              className="view-order-btn view-order-btn-print"
              onClick={handlePrint}
              title="Print Order Receipt"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Print</span>
            </button>

            {onOpenEdit && (
              <button
                type="button"
                className="view-order-btn view-order-btn-edit"
                onClick={() => {
                  onOpenEdit(order);
                }}
                title="Open in Edit Mode"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Order</span>
              </button>
            )}

            <button
              type="button"
              className="view-order-btn-close"
              onClick={onClose}
              title="Close View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body Content ── */}
        <div className="view-order-body">
          {/* Milestone Stepper */}
          {stepIndex >= 0 && (
            <div className="view-order-stepper">
              {[
                { title: 'Received', label: '1. Received' },
                { title: 'In Progress', label: '2. Washing / Iron' },
                { title: 'Ready', label: '3. Ready & Packed' },
                { title: 'Delivered', label: '4. Delivered' },
              ].map((step, idx) => {
                const isCompleted = stepIndex > idx;
                const isActive = stepIndex === idx;
                return (
                  <React.Fragment key={step.title}>
                    <div className={`view-order-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                      <div className="view-order-step-num">
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className="view-order-step-text">{step.label}</span>
                    </div>
                    {idx < 3 && (
                      <div className={`view-order-step-divider ${stepIndex > idx ? 'filled' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* 2-Column Responsive Overview */}
          <div className="view-order-grid">
            {/* Left Column: Customer & Logistics Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Profile Card */}
              <div className="view-order-card">
                <div className="view-order-card-title">
                  <span>👤</span>
                  <span>Customer Profile</span>
                </div>

                <div className="view-order-cust-head">
                  <div className="view-order-avatar">
                    {custName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="view-order-cust-name">{custName}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Customer ID: {order.customer_id || order.customer?.customerId || 'CUST-0001'}
                    </div>
                  </div>
                </div>

                <div className="view-order-detail-row">
                  <span style={{ width: '16px' }}>📞</span>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Primary Mobile</span>
                    <strong>{phone}</strong>
                  </div>
                </div>

                {altPhone && (
                  <div className="view-order-detail-row">
                    <span style={{ width: '16px' }}>📱</span>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Alternate Phone</span>
                      <strong>{altPhone}</strong>
                    </div>
                  </div>
                )}

                {email && (
                  <div className="view-order-detail-row">
                    <span style={{ width: '16px' }}>✉️</span>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Email</span>
                      <strong>{email}</strong>
                    </div>
                  </div>
                )}

                <div className="view-order-detail-row">
                  <span style={{ width: '16px' }}>📍</span>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Delivery Address</span>
                    <strong>{address}</strong>
                  </div>
                </div>
              </div>

              {/* Logistics & Delivery Card */}
              <div className="view-order-card">
                <div className="view-order-card-title">
                  <span>🚚</span>
                  <span>Delivery &amp; Logistics</span>
                </div>

                {/* Highlight Target Delivery Box */}
                <div className="view-order-delivery-box">
                  <div className="view-order-delivery-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <div className="view-order-delivery-label">Target Delivery Date</div>
                    <div className="view-order-delivery-val">{expectedDelivery}</div>
                  </div>
                </div>

                <div className="view-order-detail-row">
                  <span style={{ width: '16px' }}>🛵</span>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Assigned Driver / Staff</span>
                    <strong>{assignedStaff}</strong>
                  </div>
                </div>

                {order.rack_shelf_location && (
                  <div className="view-order-detail-row">
                    <span style={{ width: '16px' }}>🏷</span>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Rack / Shelf Location</span>
                      <strong>{order.rack_shelf_location}</strong>
                    </div>
                  </div>
                )}

                {notes && (
                  <div className="view-order-detail-row">
                    <span style={{ width: '16px' }}>📝</span>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Special Instructions / Notes</span>
                      <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#cbd5e1' }}>
                        "{notes}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Services, Inspections, Billing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Items & Services Card */}
              <div className="view-order-card">
                <div className="view-order-card-title" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧺</span>
                    <span>Allocated Services &amp; Items</span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 700 }}>
                    {totalPieces} Pieces Total
                  </span>
                </div>

                {items.length > 0 ? (
                  <table className="view-order-table">
                    <thead>
                      <tr>
                        <th>Item &amp; Service</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px' }}>{it.icon || '👕'}</span>
                              <div>
                                <strong style={{ display: 'block' }}>{it.name || it.item_name || 'Garment'}</strong>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  {it.service || it.serviceType || it.service_type || order.service_category || 'Wash & Steam Press'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.qty || it.quantity || 1}</td>
                          <td style={{ textAlign: 'right' }}>{currencySymbol}{Number(it.rate || it.price || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 750, color: '#38bdf8' }}>
                            {currencySymbol}{(Number(it.rate || it.price || 0) * Number(it.qty || it.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No line items recorded for this order.
                  </div>
                )}
              </div>

              {/* Dynamic Garment-by-Garment Inspection Card */}
              <div className="view-order-card">
                <div className="view-order-card-title" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔍</span>
                    <span>Garment-by-Garment Inspection &amp; Care</span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 700 }}>
                    {inspectionPieces.length} Inspected Pieces
                  </span>
                </div>

                {inspectionPieces.length > 0 ? (
                  <div>
                    {inspectionPieces.map((piece, pIdx) => {
                      const piecePhotos = Array.isArray(piece.photos) ? piece.photos : [];
                      return (
                        <div key={piece.id || pIdx} className="view-order-piece-card">
                          <div className="view-order-piece-head">
                            <span className="view-order-piece-title">
                              <span>👕</span>
                              <span>{piece.name || 'Garment Piece'}</span>
                            </span>
                            <span className="view-order-piece-badge">
                              Piece #{piece.pieceNumber || pIdx + 1}
                            </span>
                          </div>

                          <div className="view-order-piece-grid">
                            <div className="view-order-piece-field">
                              <span className="view-order-piece-label">Color</span>
                              <span className="view-order-piece-val">{piece.color || '—'}</span>
                            </div>

                            <div className="view-order-piece-field">
                              <span className="view-order-piece-label">Stains / Marks</span>
                              <span className="view-order-piece-val" style={{ color: piece.stains && piece.stains !== 'None' ? '#f87171' : 'inherit' }}>
                                {piece.stains || 'None'}
                              </span>
                            </div>

                            <div className="view-order-piece-field">
                              <span className="view-order-piece-label">Brand</span>
                              <span className="view-order-piece-val">{piece.brand || '—'}</span>
                            </div>

                            <div className="view-order-piece-field">
                              <span className="view-order-piece-label">Fabric Type</span>
                              <span className="view-order-piece-val">{piece.fabric || '—'}</span>
                            </div>

                            <div className="view-order-piece-field">
                              <span className="view-order-piece-label">Make / Style</span>
                              <span className="view-order-piece-val">{piece.make || '—'}</span>
                            </div>

                            <div className="view-order-piece-field">
                              <span className="view-order-piece-label">Notes</span>
                              <span className="view-order-piece-val">{piece.notes || '—'}</span>
                            </div>
                          </div>

                          {piecePhotos.length > 0 && (
                            <div>
                              <span className="view-order-piece-label" style={{ display: 'block', marginBottom: '4px' }}>
                                Visual Evidence ({piecePhotos.length} Photos)
                              </span>
                              <div className="view-order-photos-grid">
                                {piecePhotos.map((photo, phIdx) => (
                                  <img
                                    key={photo.id || phIdx}
                                    src={photo.url}
                                    alt={photo.name || 'Garment evidence'}
                                    className="view-order-photo-thumb"
                                    onClick={() => setEnlargedPhoto(photo.url)}
                                    title="Click to enlarge"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No individual garment inspection records filled yet.
                  </div>
                )}
              </div>

              {/* Financial & Billing Summary Card */}
              <div className="view-order-card">
                <div className="view-order-card-title" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💳</span>
                    <span>Billing &amp; Payment Summary</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`view-order-badge ${paymentStatus === 'Paid' ? 'status-ready' : paymentStatus === 'Partially Paid' ? 'status-progress' : 'status-cancelled'}`}>
                      ● {paymentStatus}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>({paymentMethod})</span>
                  </div>
                </div>

                <div className="view-order-billing-grid">
                  <div className="view-order-bill-card">
                    <span className="view-order-bill-label">Subtotal</span>
                    <span className="view-order-bill-val">{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="view-order-bill-card">
                    <span className="view-order-bill-label">Discount</span>
                    <span className="view-order-bill-val">-{currencySymbol}{discount.toFixed(2)}</span>
                  </div>

                  <div className="view-order-bill-card">
                    <span className="view-order-bill-label">Tax (5% GST)</span>
                    <span className="view-order-bill-val">+{currencySymbol}{tax.toFixed(2)}</span>
                  </div>

                  <div className="view-order-bill-card highlight">
                    <span className="view-order-bill-label">Grand Total</span>
                    <span className="view-order-bill-val">{currencySymbol}{grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="view-order-bill-card">
                    <span className="view-order-bill-label">Advance Paid</span>
                    <span className="view-order-bill-val">{currencySymbol}{advancePaid.toFixed(2)}</span>
                  </div>

                  <div className={`view-order-bill-card ${balanceDue > 0 ? 'due' : 'paid-zero'}`} style={{ gridColumn: 'span 3' }}>
                    <span className="view-order-bill-label">
                      {balanceDue > 0 ? '⚠️ Balance Due (Pending Collection)' : '✓ Fully Settled (Zero Balance)'}
                    </span>
                    <span className="view-order-bill-val">
                      {currencySymbol}{balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Photo Lightbox Modal ── */}
        {enlargedPhoto && (
          <div className="view-order-lightbox-overlay" onClick={() => setEnlargedPhoto(null)}>
            <img
              src={enlargedPhoto}
              alt="Enlarged garment inspection view"
              className="view-order-lightbox-img"
            />
          </div>
        )}
      </div>
    </div>
  );
}
