// src/components/OrderStatusModal.jsx
// Order Status Dialog matching media_1793093899381_35b99f08.jpg

import React, { useState, useEffect } from 'react';
import { updateOrderStatus } from '../services/customerService';
import { formatPhoneDisplay } from '../utils/validation';
import '../styles/OrderStatusModal.css';

const STAGES = [
  {
    id: 1,
    status: 'Order in Progress',
    percent: 25,
    title: 'Order received',
    shortDesc: 'Clothes counted and tagged.',
    iconType: 'box',
  },
  {
    id: 2,
    status: 'Ready for Billing',
    percent: 50,
    title: 'Ready for billing',
    shortDesc: 'Cleaning and ironing are finished.',
    iconType: 'iron',
  },
  {
    id: 3,
    status: 'Product Status',
    percent: 100,
    title: 'Ready for pickup',
    shortDesc: 'Final bill and collection.',
    iconType: 'bag',
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

  // Sync internal stage with order status
  useEffect(() => {
    if (!order) return;

    const rawStatus = (order.status || '').trim().toLowerCase();
    const storedProgress = Number(order.progress || 0);

    if (rawStatus.includes('product') || rawStatus.includes('completed') || storedProgress >= 90) {
      setCurrentStageId(3);
    } else if (rawStatus.includes('billing') || rawStatus.includes('ready for billing') || storedProgress >= 50) {
      setCurrentStageId(2);
    } else {
      setCurrentStageId(1);
    }
    setViewingBill(Boolean(initialViewBill));
  }, [order, isOpen, initialViewBill]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const orderNumber = order.order_number || order.order_id || 'ORDER-00001';
  const customerName = order.customer?.customer_name || order.customer_name || 'Customer';
  const mobile = order.customer?.mobile_number || order.mobile_number || '';
  const preference = order.preference || order.service_category || 'Ironing';
  const totalAmount = Number(order.total_amount || 0);

  const cust = order.customer || {};
  const address = cust.address || cust.streetArea || order.address || 'Address not registered';
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

  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let finalAmount = 0;

  if (isTaxExempt) {
    subtotal = totalAmount > 0 ? totalAmount : 350.00;
    cgst = 0;
    sgst = 0;
    finalAmount = subtotal;
  } else {
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

  // Handle Stage Advancement
  const handleAdvanceStage = async () => {
    if (updating || currentStageId >= 3) return;

    const nextStageId = currentStageId + 1;
    const nextStage = STAGES.find((s) => s.id === nextStageId);
    if (!nextStage) return;

    setUpdating(true);
    try {
      const { error } = await updateOrderStatus(orderNumber, nextStage.status, nextStage.percent);

      if (error) {
        showToast?.(`⚠️ Failed to update: ${error.message}`);
      } else {
        setCurrentStageId(nextStageId);
        showToast?.(`✓ Order ${orderNumber} moved to "${nextStage.title}"`);
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
      className="order-status-overlay"
      id="statusOverlay"
      onClick={(e) => {
        if (e.target.id === 'statusOverlay') onClose();
      }}
    >
      <div className="status-modal-card" role="dialog" aria-modal="true">
        {/* ── Top Header ── */}
        <div className="status-top-bar">
          <div className="status-top-left">
            <div className="status-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <circle cx="12" cy="13" r="5" />
                <line x1="8" y1="6" x2="8.01" y2="6" strokeWidth="2.5" />
                <line x1="12" y1="6" x2="16" y2="6" />
              </svg>
            </div>
            <div className="status-meta-column">
              <h2 className="status-main-title">Order Status</h2>
              <div className="status-meta-tags-row">
                <span className="status-order-id-pill">{orderNumber}</span>
                <span className="status-meta-divider">|</span>
                <span className="status-meta-text">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: '4px' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {customerName}
                </span>
                {mobile && (
                  <>
                    <span className="status-meta-divider">|</span>
                    <span className="status-meta-text">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: '4px' }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      {formatPhoneDisplay(String(mobile))}
                    </span>
                  </>
                )}
                <span className="status-meta-divider">|</span>
                <span className="status-meta-text">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ marginRight: '4px' }}>
                    <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                  </svg>
                  {preference}
                </span>
                {(order.assigned_driver || order.pickup_status === 'Assigned for Pickup' || order.assigned_for_pickup) && (
                  <>
                    <span className="status-meta-divider">|</span>
                    <span className="status-meta-text" style={{ color: '#22c55e', fontWeight: 650 }}>
                      🚚 Assigned for Pickup: {order.assigned_driver || 'Driver'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="status-close-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Main View (Stepper or Bill) ── */}
        {!viewingBill ? (
          <div className="status-content-body">
            {/* ── Vertical Pipeline & Stage Cards ── */}
            <div className="status-stepper-container">
              {/* Stepper Vertical Track Nodes */}
              <div className="status-nodes-track">
                {/* Node 1 */}
                <div className={`status-node-dot ${currentStageId > 1 ? 'completed' : currentStageId === 1 ? 'active' : ''}`}>
                  {currentStageId > 1 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    '1'
                  )}
                </div>

                {/* Line 1-2 */}
                <div className={`status-track-line ${currentStageId > 1 ? 'completed' : ''}`} />

                {/* Node 2 */}
                <div className={`status-node-dot ${currentStageId > 2 ? 'completed' : currentStageId === 2 ? 'active' : ''}`}>
                  {currentStageId > 2 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    '2'
                  )}
                </div>

                {/* Line 2-3 */}
                <div className={`status-track-line ${currentStageId > 2 ? 'completed' : ''}`} />

                {/* Node 3 */}
                <div className={`status-node-dot ${currentStageId === 3 ? 'active' : ''}`}>
                  3
                </div>
              </div>

              {/* 3 Stage Cards List */}
              <div className="status-cards-col">
                {/* Stage 1: Order received */}
                <div className={`status-stage-item ${currentStageId > 1 ? 'completed' : currentStageId === 1 ? 'active' : 'pending'}`}>
                  <div className="status-item-icon-box box">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <div className="status-item-info">
                    <h4 className="status-item-title">Order received</h4>
                    <p className="status-item-sub">Clothes counted and tagged.</p>
                  </div>
                  <div className={`status-item-badge ${currentStageId > 1 ? 'completed' : currentStageId === 1 ? 'current' : 'pending'}`}>
                    {currentStageId > 1 ? 'Completed' : currentStageId === 1 ? 'Current Stage' : 'Pending'}
                  </div>
                </div>

                {/* Stage 2: Ready for billing */}
                <div className={`status-stage-item ${currentStageId > 2 ? 'completed' : currentStageId === 2 ? 'active' : 'pending'}`}>
                  <div className="status-item-icon-box iron">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 18h16a2 2 0 0 0 2-2V9a3 3 0 0 0-3-3H9a5 5 0 0 0-5 5v5a2 2 0 0 0 2 2z" />
                      <path d="M6 14h12" />
                    </svg>
                  </div>
                  <div className="status-item-info">
                    <h4 className="status-item-title">Ready for billing</h4>
                    <p className="status-item-sub">Cleaning and ironing are finished.</p>
                  </div>
                  <div className={`status-item-badge ${currentStageId > 2 ? 'completed' : currentStageId === 2 ? 'current' : 'pending'}`}>
                    {currentStageId > 2 ? 'Completed' : currentStageId === 2 ? 'Current Stage' : 'Pending'}
                  </div>
                </div>

                {/* Stage 3: Ready for pickup */}
                <div className={`status-stage-item ${currentStageId === 3 ? 'active' : 'pending'}`}>
                  <div className="status-item-icon-box bag">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <div className="status-item-info">
                    <h4 className="status-item-title">Ready for pickup</h4>
                    <p className="status-item-sub">Final bill and collection.</p>
                  </div>
                  <div className={`status-item-badge ${currentStageId === 3 ? 'current' : 'pending'}`}>
                    {currentStageId === 3 ? 'Current Stage' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Notice / Info Box ── */}
            <div className="status-notice-box">
              <div className="status-notice-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2.5" />
                </svg>
              </div>
              <div className="status-notice-text">
                <h5 className="status-notice-title">
                  {currentStageId === 1 && 'Order received and tagged'}
                  {currentStageId === 2 && 'Bill is prepared at pickup'}
                  {currentStageId === 3 && 'Order is ready for pickup'}
                </h5>
                <p className="status-notice-desc">
                  {currentStageId === 1 && 'Clothes have been counted, tagged with barcode, and wash cycle has started.'}
                  {currentStageId === 2 && 'Payment will be collected when you hand over the clothes (at our store or during delivery).'}
                  {currentStageId === 3 && 'Order is poly-wrapped and ready for customer handover and payment collection.'}
                </p>
              </div>
            </div>

            {/* ── Action Buttons Row ── */}
            <div className="status-actions-row">
              <button
                type="button"
                className="status-btn-edit-order"
                onClick={() => {
                  onClose();
                  onEditOrder?.(order);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Order</span>
              </button>

              {currentStageId === 1 && (
                <button
                  type="button"
                  className="status-btn-primary-action"
                  onClick={handleAdvanceStage}
                  disabled={updating}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{updating ? 'Updating…' : 'Mark as Ready for Billing'}</span>
                </button>
              )}

              {currentStageId === 2 && (
                <button
                  type="button"
                  className="status-btn-primary-action"
                  onClick={handleAdvanceStage}
                  disabled={updating}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{updating ? 'Updating…' : 'Mark as Ready for Pickup'}</span>
                </button>
              )}

              {currentStageId === 3 && (
                <button
                  type="button"
                  className="status-btn-primary-action"
                  onClick={() => setViewingBill(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                  </svg>
                  <span>Print / View Bill</span>
                </button>
              )}
            </div>

            {/* ── Bottom Status Strip ── */}
            <div className="status-footer-strip">
              <div className="status-saved-badge">
                <span className="status-live-dot" />
                <span>Saved</span>
              </div>
              <button
                type="button"
                className="status-btn-done"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Bill View ── */
          <div className="status-bill-wrapper">
            <div className="bill-top-back-row">
              <button
                type="button"
                className="bill-back-btn"
                onClick={() => setViewingBill(false)}
              >
                ← Back to Order Status
              </button>
              <div className="bill-badge">Tax Invoice #{orderNumber}</div>
            </div>

            <div className="status-bill-view" id="printable-tax-invoice">
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
                    READY FOR PICKUP
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
                    <strong className="bill-field-val">{address}</strong>
                  </div>
                  <div className="bill-info-item">
                    <span className="bill-field-label">Service &amp; Order Type</span>
                    <strong className="bill-field-val" style={{ textTransform: 'capitalize' }}>
                      {preference} • {orderType}
                      {isTaxExempt && <span style={{ color: '#fbbf24', marginLeft: '4px', fontSize: '10.5px' }}>(Tax Exempt)</span>}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bill-table-wrap">
                <table className="bill-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Service Description</th>
                      <th style={{ width: '22%' }}>Batch / Qty</th>
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
                              {item.serviceType || preference} • Care tagged
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
                            {itemCount} {itemCount === 1 ? 'pc' : 'pcs'}
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
                          Poly-bag seal garment dust &amp; moisture barrier
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
                    <tr className="bill-total-row">
                      <td colSpan="3" className="bill-total-label">
                        TOTAL AMOUNT DUE {isTaxExempt && <span style={{ fontSize: '11px', color: '#fbbf24' }}>(0% GST)</span>}
                      </td>
                      <td className="bill-total-val">
                        {currencySymbol}{finalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bill-bottom-actions">
              <button
                type="button"
                className="status-btn-primary-action"
                onClick={() => window.print()}
              >
                Print Bill
              </button>
              <button
                type="button"
                className="status-btn-done"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
