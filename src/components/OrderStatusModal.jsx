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
    percent: 90,
    title: 'Product Status',
    badge: '90% Completed',
    shortDesc: 'Garments poly-wrapped, racked, and assembled. Bill ready for customer review.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    details: [
      'Garments packaged on premium wooden hangers / folded',
      'Stored in clean dispatch staging rack #04',
      'Estimate slip & GST bill generated successfully',
    ],
  },
];

export default function OrderStatusModal({
  isOpen,
  order,
  onClose,
  onOrderUpdated,
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

    if (rawStatus.includes('product') || storedProgress >= 90) {
      setCurrentStageId(3);
    } else if (rawStatus.includes('billing') || rawStatus.includes('ready for billing') || storedProgress >= 50) {
      setCurrentStageId(2);
    } else {
      // Default: 25% Order in Progress
      setCurrentStageId(1);
    }
    setViewingBill(false);
  }, [order, isOpen]);

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
  const preference = order.preference || order.service_category || 'Standard';
  const totalAmount = Number(order.total_amount || 0);

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
              {currentStage.icon}
            </div>
          </div>

          <div className="status-header-text">
            <div className="status-header-title-row">
              <h2 className="status-dynamic-title">
                {currentStage.title} – {currentStage.percent}% Completed
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

        {/* ── Progress Bar & Percentage Bar ── */}
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

        {/* ── Modal Body: Stepper or Bill View ── */}
        <div className="status-modal-body">
          {viewingBill ? (
            /* ── View Bill / Estimate Slip View (90% Stage) ── */
            <div className="status-bill-view">
              <div className="bill-header-row">
                <div>
                  <span className="bill-kicker">WASHDOOR THERMAL BILL & ESTIMATE</span>
                  <h3 className="bill-title">Tax Invoice #{orderNumber}</h3>
                  <p className="bill-date">
                    Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bill-badge-status">
                  <span className="bill-status-pill">90% Product Status</span>
                </div>
              </div>

              <div className="bill-customer-card">
                <div className="bill-info-grid">
                  <div>
                    <span className="bill-field-label">Customer Name</span>
                    <strong className="bill-field-val">{customerName}</strong>
                  </div>
                  <div>
                    <span className="bill-field-label">Phone</span>
                    <strong className="bill-field-val">{mobile ? formatPhoneDisplay(String(mobile)) : '—'}</strong>
                  </div>
                  <div>
                    <span className="bill-field-label">Order Type</span>
                    <strong className="bill-field-val" style={{ textTransform: 'capitalize' }}>
                      {order.order_type || 'Walk-in'}
                    </strong>
                  </div>
                  <div>
                    <span className="bill-field-label">Service Tier</span>
                    <strong className="bill-field-val">{preference}</strong>
                  </div>
                </div>
              </div>

              {/* Itemized charges table */}
              <div className="bill-table-wrap">
                <table className="bill-table">
                  <thead>
                    <tr>
                      <th>Service Description</th>
                      <th>Qty / Weight</th>
                      <th>Rate</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Premium Laundry & Steam Press</strong>
                        <span className="bill-item-sub">Wash, anti-bacterial hygiene rinse, steam doll finish</span>
                      </td>
                      <td>1 Batch</td>
                      <td>{currencySymbol}{totalAmount > 0 ? (totalAmount * 0.95).toFixed(2) : '350.00'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {currencySymbol}{totalAmount > 0 ? (totalAmount * 0.95).toFixed(2) : '350.00'}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Packaging & Quality Seal</strong>
                        <span className="bill-item-sub">Poly-bag garment preservation hanger packaging</span>
                      </td>
                      <td>1</td>
                      <td>{currencySymbol}0.00 (Included)</td>
                      <td style={{ textAlign: 'right' }}>{currencySymbol}0.00</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="bill-calc-label">Subtotal</td>
                      <td className="bill-calc-val">
                        {currencySymbol}{totalAmount > 0 ? (totalAmount * 0.95).toFixed(2) : '350.00'}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="bill-calc-label">GST / Tax (5%)</td>
                      <td className="bill-calc-val">
                        {currencySymbol}{totalAmount > 0 ? (totalAmount * 0.05).toFixed(2) : '17.50'}
                      </td>
                    </tr>
                    <tr className="bill-grand-total-row">
                      <td colSpan="3">Grand Total Payable</td>
                      <td style={{ textAlign: 'right' }}>
                        {currencySymbol}{totalAmount > 0 ? totalAmount.toFixed(2) : '367.50'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="bill-actions-row">
                <button
                  type="button"
                  className="status-btn-secondary"
                  onClick={() => setViewingBill(false)}
                >
                  ← Back to Order Stages
                </button>
                <button
                  type="button"
                  className="status-btn-print"
                  onClick={() => window.print()}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Bill
                </button>
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
                              <span>Weighment & packaging verified. Advance to Product Status?</span>
                              <button
                                type="button"
                                className="status-action-btn primary"
                                onClick={handleAdvanceStage}
                                disabled={updating}
                              >
                                {updating ? 'Saving to Supabase…' : 'Update to Product Status (90%) →'}
                              </button>
                            </div>
                          )}

                          {s.id === 3 && (
                            <div className="action-hint">
                              <span style={{ color: '#10b981' }}>✓ 90% Stage Reached. Product is packaged & ready for pickup/delivery.</span>
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
                                View Bill (90% Stage)
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
            {currentStageId === 3 && !viewingBill && (
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

            <button
              type="button"
              className="status-footer-btn close-action"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
