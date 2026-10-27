// src/components/OrderStatusModal.jsx
// Dynamic Laundry Order Status Dialog with 3-stage progression (25% -> 50% -> 90%)
// Matching Washdoor dark Apple-grade aesthetic and Supabase persistence

import React, { useState, useEffect, useCallback } from 'react';
import { updateOrderStatus } from '../services/customerService';
import { formatPhoneDisplay } from '../utils/validation';

const STAGES = [
  {
    id: 1,
    status: 'Order in Progress',
    percent: 25,
    title: 'Order in Progress',
    badge: '25% Completed',
    shortDesc: 'Garments tagged, sorted, and solvent wash / stain spotting in progress.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    details: [
      'Garments tagged with thermal barcode',
      'Intake counter weighment verified',
      'Solvent cleaning & delicate wash initiated',
    ],
  },
  {
    id: 2,
    status: 'Ready for Billing',
    percent: 50,
    title: 'Ready for Billing',
    badge: '50% Completed',
    shortDesc: 'Cleaning complete, steam pressed, weight and piece count verified for billing.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="7" y1="15" x2="7.01" y2="15" strokeWidth="3" />
        <line x1="11" y1="15" x2="13" y2="15" />
      </svg>
    ),
    details: [
      'Steam doll tensioning & crease pressing done',
      'Quality assurance & stain inspection passed',
      'Final count and rate tiers calculated for invoice',
    ],
  },
  {
    id: 3,
    status: 'Product Status',
    percent: 100,
    title: 'Washing Completed (Product Status)',
    badge: '100% Completed',
    shortDesc: 'Washing completed, garments poly-wrapped, racked, and assembled. Bill ready for review.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    details: [
      'Garments washed, cleaned, and steam pressed',
      'Quality inspection passed & 100% washing verified',
      'Stored in clean dispatch staging rack & bill ready',
    ],
  },
];

export default function OrderStatusModal({
  isOpen,
  order,
  initialViewBill = false,
  onClose,
  onOrderUpdated,
  onEditOrder,
  showToast,
  currencySymbol = '₹',
}) {
  const [currentStageId, setCurrentStageId] = useState(1);
  const [updating, setUpdating] = useState(false);
  const [viewingBill, setViewingBill] = useState(false);

  // Sync internal stage whenever the order prop changes or modal opens
  useEffect(() => {
    if (!order) return;

    const rawStatus = (order.status || '').trim().toLowerCase();
    const storedProgress = Number(order.progress || 0);

    if (rawStatus.includes('product') || rawStatus.includes('completed') || storedProgress >= 90) {
      setCurrentStageId(3);
    } else if (rawStatus.includes('billing') || rawStatus.includes('ready for billing') || storedProgress >= 50) {
      setCurrentStageId(2);
    } else {
      // Default: 25% Order in Progress
      setCurrentStageId(1);
    }
    setViewingBill(Boolean(initialViewBill));
  }, [order, isOpen, initialViewBill]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const currentStage = STAGES.find((s) => s.id === currentStageId) || STAGES[0];
  const orderNumber = order.order_number || order.order_id || 'ORDER-00001';
  const customerName = order.customer?.customer_name || order.customer_name || 'Walk-In Customer';
  const mobile = order.customer?.mobile_number || order.mobile_number || '';
  const preference = order.preference || order.service_category || 'Wash & Steam Press';
  const totalAmount = Number(order.total_amount || 0);

  const cust = order.customer || {};
  const address = cust.address || cust.streetArea || order.address || 'Ranipet Central, Zone 1';
  const weight = order.product_weight || '3.5';
  const orderItems = order.customer_history?.items || order.items || [];
  const itemCount = orderItems.length > 0
    ? orderItems.reduce((acc, item) => acc + (Number(item.qty) || 1), 0)
    : Number(order.item_count || 1);
  const orderType = order.order_type || 'Walk-in';

  // Tax Exemption status
  const isTaxExempt = Boolean(
    order.tax_exemption ||
    order.customer?.tax_exemption ||
    order.taxExemption ||
    order.customer?.taxExemption
  );

  // Indian GST / Tax Invoicing calculation
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let finalAmount = 0;

  if (isTaxExempt) {
    // When tax exemption is enabled: no CGST & SGST. Subtotal equals Grand Total.
    subtotal = totalAmount > 0 ? totalAmount : 350.00;
    cgst = 0;
    sgst = 0;
    finalAmount = subtotal;
  } else {
    // Standard 5% GST (2.5% CGST + 2.5% SGST)
    if (totalAmount > 0) {
      finalAmount = totalAmount;
      subtotal = finalAmount / 1.05;
    } else {
      subtotal = 350.00;
      finalAmount = 367.50;
    }
    const totalGst = finalAmount - subtotal;
    cgst = totalGst / 2;
    sgst = totalGst / 2;
  }

  // Advance stage to the next step (strictly sequential: 1 -> 2 -> 3)
  const handleAdvanceStage = async () => {
    if (updating || currentStageId >= 3) return;

    const nextStageId = currentStageId + 1;
    const nextStage = STAGES.find((s) => s.id === nextStageId);
    if (!nextStage) return;

    setUpdating(true);
    try {
      const { data, error } = await updateOrderStatus(orderNumber, nextStage.status, nextStage.percent);

      if (error) {
        showToast?.(`⚠️ Failed to update order status: ${error.message}`);
      } else {
        setCurrentStageId(nextStageId);
        showToast?.(`✓ Order ${orderNumber} updated to ${nextStage.title} (${nextStage.percent}% Completed)`);
        onOrderUpdated?.();
      }
    } catch (err) {
      showToast?.(`⚠️ Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="order-status-overlay overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ display: 'flex', zIndex: 2000 }}
    >
      <div
        className="order-status-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Dynamic Dialog Header ── */}
        <div className="status-modal-header">
          <div className="status-header-icon-wrap">
            <span className="status-live-pulse-dot" />
            <div className="status-header-icon">
              {viewingBill ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              ) : (
                currentStage.icon
              )}
            </div>
          </div>

          <div className="status-header-text">
            <div className="status-header-title-row">
              <h2 className="status-dynamic-title">
                {viewingBill ? 'Tax Invoice & Thermal Bill' : `${currentStage.title} – ${currentStage.percent}% Completed`}
              </h2>
            </div>
            <div className="status-order-meta-row">
              <span className="status-order-pill">{orderNumber}</span>
              <span className="status-meta-separator">•</span>
              <span className="status-customer-name">{customerName}</span>
              {mobile && (
                <>
                  <span className="status-meta-separator">•</span>
                  <span className="status-phone-tag">{formatPhoneDisplay(String(mobile))}</span>
                </>
              )}
              <span className="status-meta-separator">•</span>
              <span className="status-pref-tag">[{preference}]</span>
            </div>
          </div>

          <button
            type="button"
            className="status-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Progress Bar & Percentage Bar (Streamlined: Hidden during Bill View to avoid redundancy) ── */}
        {!viewingBill ? (
          <div className="status-progress-section">
            <div className="status-progress-meta-row">
              <span className="status-progress-label">Overall Order Fulfillment</span>
              <span className="status-progress-percentage-badge">
                {currentStage.percent}% Complete
              </span>
            </div>

            <div className="status-progress-track">
              <div
                className={`status-progress-fill stage-${currentStageId}`}
                style={{ width: `${currentStage.percent}%` }}
              >
                <div className="status-progress-glow" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bill-breadcrumb-banner">
            <div className="bill-breadcrumb-left">
              <span className="bill-crumb-stage">Washing 100% Completed</span>
              <span className="bill-crumb-arrow">›</span>
              <span className="bill-crumb-active">Official Tax Bill & Thermal Slip</span>
            </div>
          </div>
        )}

        {/* ── Modal Body: Stepper or Bill View ── */}
        <div className="status-modal-body">
          {viewingBill ? (
            /* ── View Bill / Estimate Slip View (Thermal POS Style) ── */
            <div className="status-bill-view" id="printable-tax-invoice">
              {/* Thermal Bill Header */}
              <div className="bill-header-row">
                <div className="bill-brand-col">
                  <div className="bill-brand-badge">WASHDOOR POS RECEIPT</div>
                  <h3 className="bill-brand-name">WASHDOOR LAUNDRY</h3>
                  <p className="bill-store-sub">
                    Ranipet Central • Ph: +91 98765 43210 • GSTIN: 33AAAAW1234D1Z5
                  </p>
                </div>
                <div className="bill-invoice-meta-col">
                  <div className="bill-status-pill">
                    <span className="bill-status-dot" />
                    100% WASH COMPLETED
                  </div>
                  <div className="bill-inv-num">Tax Invoice #{orderNumber}</div>
                  <div className="bill-date">
                    {new Date().toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="bill-customer-card">
                <div className="bill-info-grid">
                  <div className="bill-info-item">
                    <span className="bill-field-label">Customer Name</span>
                    <strong className="bill-field-val">{customerName}</strong>
                  </div>
                  <div className="bill-info-item">
                    <span className="bill-field-label">Phone</span>
                    <strong className="bill-field-val">{mobile ? formatPhoneDisplay(String(mobile)) : '—'}</strong>
                  </div>
                  <div className="bill-info-item">
                    <span className="bill-field-label">Delivery Address / Zone</span>
                    <strong className="bill-field-val" title={address}>
                      {address}
                    </strong>
                  </div>
                  <div className="bill-info-item">
                    <span className="bill-field-label">Service & Order Type</span>
                    <strong className="bill-field-val" style={{ textTransform: 'capitalize' }}>
                      {preference} • {orderType}
                      {isTaxExempt && <span style={{ color: '#fbbf24', marginLeft: '4px', fontSize: '10.5px' }}>(Tax Exempt)</span>}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Itemized charges table */}
              <div className="bill-table-wrap">
                <table className="bill-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Service Description</th>
                      <th style={{ width: '22%' }}>Batch / Wt</th>
                      <th style={{ width: '15%' }}>Rate</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.length > 0 ? (
                      orderItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{item.name}</strong>
                            <span className="bill-item-sub">
                              {item.serviceType || preference} • Care tagged &amp; inspect pass
                            </span>
                          </td>
                          <td>
                            <span className="bill-qty-pill">
                              {item.qty} {item.qty === 1 ? 'pc' : 'pcs'}
                            </span>
                          </td>
                          <td>{currencySymbol}{Number(item.rate || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#ffffff' }}>
                            {currencySymbol}{Number(item.amount || ((item.rate || 0) * (item.qty || 1))).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td>
                          <strong>{preference}</strong>
                          <span className="bill-item-sub">
                            Anti-bacterial hygiene wash, fabric softening, steam doll finish
                          </span>
                        </td>
                        <td>
                          <span className="bill-qty-pill">
                            {weight} kg ({itemCount} {itemCount === 1 ? 'pc' : 'pcs'})
                          </span>
                        </td>
                        <td>{currencySymbol}{subtotal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#ffffff' }}>
                          {currencySymbol}{subtotal.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>
                        <strong>Garment Preservation Packaging</strong>
                        <span className="bill-item-sub">
                          Poly-bag seal garment dust & moisture barrier
                        </span>
                      </td>
                      <td>
                        <span className="bill-qty-pill">1 Lot</span>
                      </td>
                      <td>{currencySymbol}0.00</td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: '600' }}>
                        INCLUDED
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bill-calc-row">
                      <td colSpan="3" className="bill-calc-label">
                        {isTaxExempt ? 'Subtotal' : 'Taxable Subtotal'}
                      </td>
                      <td className="bill-calc-val">
                        {currencySymbol}{subtotal.toFixed(2)}
                      </td>
                    </tr>
                    {!isTaxExempt && (
                      <>
                        <tr className="bill-calc-row">
                          <td colSpan="3" className="bill-calc-label">CGST (2.5%)</td>
                          <td className="bill-calc-val">
                            {currencySymbol}{cgst.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="bill-calc-row">
                          <td colSpan="3" className="bill-calc-label">SGST (2.5%)</td>
                          <td className="bill-calc-val">
                            {currencySymbol}{sgst.toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="bill-grand-total-row">
                      <td colSpan="2">
                        <span className="bill-grand-title">Grand Total Payable</span>
                        <span className="bill-tax-inclusive-tag">
                          {isTaxExempt ? '(Tax Exempted — 0% GST)' : '(Inclusive of 5% GST)'}
                        </span>
                      </td>
                      <td colSpan="2" className="bill-grand-val">
                        {currencySymbol}{finalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* ── Stepper: Completed, Current, and Pending Stages ── */
            <div className="status-stepper-list">
              {STAGES.map((s) => {
                const isCompleted = currentStageId > s.id;
                const isCurrent = currentStageId === s.id;
                const isPending = currentStageId < s.id;

                let stageStateClass = 'pending';
                if (isCompleted) stageStateClass = 'completed';
                if (isCurrent) stageStateClass = 'current';

                return (
                  <div
                    key={s.id}
                    className={`status-stage-card ${stageStateClass}`}
                  >
                    {/* Step Indicator Node */}
                    <div className="stage-node-col">
                      <div className={`stage-node-circle ${stageStateClass}`}>
                        {isCompleted ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span>{s.id}</span>
                        )}
                      </div>
                      {s.id < 3 && (
                        <div
                          className={`stage-connector-line ${isCompleted ? 'active' : ''}`}
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="stage-content-col">
                      <div className="stage-heading-row">
                        <div className="stage-title-wrap">
                          <h4 className="stage-title">{s.title}</h4>
                          <span className={`stage-state-pill ${stageStateClass}`}>
                            {isCompleted && '✓ Completed'}
                            {isCurrent && '◉ Current Stage'}
                            {isPending && 'Pending'}
                          </span>
                        </div>
                        <span className="stage-percentage-tag">{s.badge}</span>
                      </div>

                      <p className="stage-short-desc">{s.shortDesc}</p>

                      <div className="stage-checklist">
                        {s.details.map((item, idx) => (
                          <div key={idx} className="stage-check-item">
                            <span className={`check-icon ${isCompleted ? 'checked' : isCurrent ? 'current' : 'pending'}`}>
                              {isCompleted ? '✓' : isCurrent ? '•' : '○'}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* Current Stage Action Callout */}
                      {isCurrent && (
                        <div className="stage-action-box">
                          {s.id === 1 && (
                            <div className="action-hint">
                              <span>Ready to proceed to quality check & billing?</span>
                              <button
                                type="button"
                                className="status-action-btn primary"
                                onClick={handleAdvanceStage}
                                disabled={updating}
                              >
                                {updating ? 'Saving to Supabase…' : 'Mark as Ready for Billing (50%) →'}
                              </button>
                            </div>
                          )}

                          {s.id === 2 && (
                            <div className="action-hint">
                              <span>Weighment & packaging verified. Mark Washing Completed (100%)?</span>
                              <button
                                type="button"
                                className="status-action-btn primary"
                                onClick={handleAdvanceStage}
                                disabled={updating}
                              >
                                {updating ? 'Saving to Supabase…' : 'Mark Washing Completed (100%) →'}
                              </button>
                            </div>
                          )}

                          {s.id === 3 && (
                            <div className="action-hint">
                              <span style={{ color: '#10b981' }}>✓ 100% Washing Completed. Product is packaged & ready for delivery.</span>
                              <button
                                type="button"
                                className="status-action-btn bill-btn"
                                onClick={() => setViewingBill(true)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <line x1="16" y1="13" x2="8" y2="13" />
                                  <line x1="16" y1="17" x2="8" y2="17" />
                                  <polyline points="10 9 9 9 8 9" />
                                </svg>
                                View Bill (100% Completed)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Dialog Footer ── */}
        <div className="status-modal-footer">
          <div className="status-footer-left">
            <span className="status-saved-pill">
              <span className="saved-indicator" />
              Persisted to Supabase
            </span>
          </div>

          <div className="status-footer-right">
            {viewingBill ? (
              <>
                <button
                  type="button"
                  className="status-footer-btn print-bill-action"
                  onClick={() => window.print()}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Bill
                </button>
                <button
                  type="button"
                  className="status-footer-btn close-action"
                  onClick={onClose}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                {currentStageId === 3 && (
                  <button
                    type="button"
                    className="status-footer-btn view-bill-special"
                    onClick={() => setViewingBill(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                    </svg>
                    View Bill
                  </button>
                )}

                {currentStageId < 3 && (
                  <button
                    type="button"
                    className="status-footer-btn advance"
                    onClick={handleAdvanceStage}
                    disabled={updating}
                  >
                    {updating ? (
                      'Saving…'
                    ) : currentStageId === 1 ? (
                      'Update to Ready for Billing (50%) →'
                    ) : (
                      'Update to Product Status (90%) →'
                    )}
                  </button>
                )}

                {onEditOrder && (
                  <button
                    type="button"
                    className="status-footer-btn"
                    style={{
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => {
                      onClose();
                      onEditOrder(order);
                    }}
                    title="Open Product Selection & Cart Edit Dialog"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Order &amp; Items
                  </button>
                )}

                <button
                  type="button"
                  className="status-footer-btn close-action"
                  onClick={onClose}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
