// src/components/OrderReviewCard.jsx
// Detailed Expandable Order Review Card matching Washdoor dark Apple-grade aesthetic
// Displays: 1. Cloth & Tag Details, 2. Delivery & Rider, 3. Instructions & Log, 4. Workflow Pipeline

import React, { useState, useEffect } from 'react';
import { formatPhoneDisplay } from '../utils/validation';

export default function OrderReviewCard({
  order,
  isExpanded,
  onToggleExpand,
  onEdit,
  onOpenStatus,
  onOpenBill,
  showToast,
  currencySymbol = '₹',
}) {
  const cust = order.customer || {};
  const custName = cust.customer_name || order.customer_name || 'Walk-in Customer';
  const phone = cust.mobile_number || order.mobile_number || '';
  const address = cust.address || cust.streetArea || order.address || 'Address not registered';
  const zone = cust.area_service_zone || cust.areaServiceZone || 'Zone 1';
  const orderNum = order.order_number || (order.id ? `ORDER-${order.id}` : 'ORDER-00001');
  const orderType = order.order_type || 'walk-in';

  // State for Rider assignment & Staff note
  const [assignedRider, setAssignedRider] = useState('-- Unassigned --');
  const [staffNote, setStaffNote] = useState('');
  const [logNotes, setLogNotes] = useState(
    order.preference_notes || order.order_notes || ''
  );

  useEffect(() => {
    setLogNotes(order.preference_notes || order.order_notes || '');
  }, [order.preference_notes, order.order_notes]);

  // Garment breakdown
  const weight = order.product_weight || '0';
  const preference = order.preference || 'Wash & Steam Press';
  const orderItems = order.customer_history?.items || order.items || [];
  const hasItems = Array.isArray(orderItems) && orderItems.length > 0;
  const itemCount = hasItems
    ? orderItems.reduce((acc, item) => acc + (Number(item.qty) || 1), 0)
    : 0;
  const totalAmount = Number(order.total_amount || 0);

  // Workflow pipeline & badge status (Received, In Progress, Ready, Delivered, Cancelled)
  const progress = Number(order.progress || 25);
  const rawStatus = (order.order_status || order.status || '').trim().toLowerCase();

  let activePipelineStage = 1;
  let statusBadgeLabel = 'In Progress';
  let statusBadgeClass = 'in-progress';
  let statusPercentage = 30;

  if (rawStatus.includes('cancel')) {
    statusBadgeLabel = 'Cancelled';
    statusBadgeClass = 'cancelled';
    statusPercentage = 0;
  } else if (rawStatus.includes('deliver') || rawStatus.includes('complete') || progress >= 90) {
    activePipelineStage = 3;
    statusBadgeLabel = 'Delivered';
    statusBadgeClass = 'delivered';
    statusPercentage = 100;
  } else if (rawStatus.includes('ready') || rawStatus.includes('billing') || progress >= 50) {
    activePipelineStage = 2;
    statusBadgeLabel = 'Ready';
    statusBadgeClass = 'ready';
    statusPercentage = 75;
  } else if (rawStatus.includes('receive') || rawStatus.includes('intake')) {
    activePipelineStage = 1;
    statusBadgeLabel = 'Received';
    statusBadgeClass = 'received';
    statusPercentage = 15;
  }

  const handleSaveStaffNote = (e) => {
    e.stopPropagation();
    if (!staffNote.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogNotes((prev) => `${prev}\n[${timestamp} Staff]: ${staffNote.trim()}`);
    setStaffNote('');
    showToast?.(`✓ Staff note saved for order ${orderNum}`);
  };

  const handleAutoDispatch = (e) => {
    e.stopPropagation();
    setAssignedRider('Rider Kumar (Van #02)');
    showToast?.(`🚀 Nearest rider Kumar (Van #02) auto-dispatched for ${orderNum}!`);
  };

  const handleSendRdyAlert = (e) => {
    e.stopPropagation();
    showToast?.(`📱 WhatsApp & SMS RDY Alert sent to ${custName} (${formatPhoneDisplay(phone) || 'Customer'})!`);
  };

  const handleSendNrAlert = (e) => {
    e.stopPropagation();
    showToast?.(`⚠️ Not-Reachable (NR) status logged & reminder queued.`);
  };

  return (
    <div className={`order-review-card-container ${isExpanded ? 'expanded' : ''}`}>
      {/* ── Card Header Row ── */}
      <div
        className="order-review-header-bar"
        onClick={onToggleExpand}
        title={isExpanded ? 'Click to collapse details' : 'Click to review order details'}
      >
        <div className="order-review-header-left">
          {/* Circular Purple Accordion Chevron */}
          <button
            type="button"
            className={`review-chevron-circle ${isExpanded ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {/* Order ID Pill */}
          <span className="review-order-id-pill">{orderNum}</span>

          {/* Source Tag */}
          <span className="review-source-tag">
            {orderType === 'on-call' ? '📞 On-Call' : orderType === 'whatsapp' ? '💬 WhatsApp Bot' : '🚶 Walk-in'}
          </span>

          {/* Customer Name, Phone, and Address */}
          <span className="review-cust-name">{custName}</span>
          {phone && <span className="review-meta-item">• {formatPhoneDisplay(phone)}</span>}
          {address && <span className="review-meta-item review-address-item">• {address}</span>}
        </div>

        {/* Right Header Section: Status, Bill */}
        <div className="order-review-header-right" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`order-status-pill ${statusBadgeClass}`}
            title={`Status: ${statusBadgeLabel} (${statusPercentage}%) - Click to change status`}
            onClick={() => onOpenStatus(order)}
          >
            <span className="status-dot" />
            <span>{statusBadgeLabel}</span>
          </button>

          <button
            type="button"
            className={`order-bill-btn ${isComplete ? 'enabled' : 'disabled'}`}
            disabled={!isComplete}
            title={
              isComplete
                ? 'Washing 100% Completed • Click to view and print Bill'
                : 'Bill disabled: Washing is still in progress (Enabled at 100% completion)'
            }
            onClick={() => {
              if (isComplete) onOpenBill(order);
            }}
            aria-label={isComplete ? 'View Bill' : 'Bill disabled'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Expandable Body with 4 Review Cards ── */}
      {isExpanded && (
        <div className="order-review-expanded-grid">
          {/* Card 1: Cloth & Tag Details */}
          <div className="review-panel-card">
            <div className="review-panel-head">
              <span className="review-panel-title">⚖️ 1. Cloth &amp; Tag Details</span>
              <span className={`review-badge-purple ${!hasItems ? 'review-badge-muted' : ''}`}>
                {itemCount} pcs
              </span>
            </div>

            <div className="review-info-row">
              <span className="review-row-label">Premium Wash:</span>
              <strong className="review-row-val">{weight} kg</strong>
            </div>
            <div className="review-info-row">
              <span className="review-row-label" style={{ color: '#60a5fa' }}>Total Bill:</span>
              <strong className="review-row-val" style={{ color: '#60a5fa' }}>
                {currencySymbol}{totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'}
              </strong>
            </div>

            <div className="review-subhead-label">GARMENT TAGS:</div>

            {hasItems ? (
              <>
                <div className="review-garment-tags-list">
                  {orderItems.map((item, idx) => (
                    <div key={item.id || idx} className="review-garment-tag-item">
                      <span className="review-tag-code">TAG-G{String(idx + 1).padStart(2, '0')}</span>
                      <span className="review-tag-name">
                        {item.name} {item.serviceType ? `(${item.serviceType})` : ''} × {item.qty}
                      </span>
                      <span className="review-tag-price">
                        {currencySymbol}{Number(item.amount || (item.rate * item.qty)).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="review-btn-secondary"
                  onClick={() => onEdit(order)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Edit Clothes &amp; Tags (Pop-up)</span>
                </button>
              </>
            ) : (
              <div className="review-empty-tags-box">
                <div className="review-empty-tags-msg">
                  <span style={{ fontSize: '15px' }}>🏷️</span>
                  <span>No clothes or tags selected yet</span>
                </div>
                <button
                  type="button"
                  className="review-btn-add-tags"
                  onClick={() => onEdit(order)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Add Clothes &amp; Tags (Pop-up)</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Delivery & Rider */}
          <div className="review-panel-card">
            <div className="review-panel-head">
              <span className="review-panel-title">🚚 2. Delivery &amp; Rider</span>
              <span className="review-badge-green">{zone}</span>
            </div>

            <div className="review-address-box">
              <span className="review-pin-icon">📍</span>
              <span className="review-address-text">{address}</span>
            </div>

            <div className="review-rider-section">
              <label className="review-rider-label">ASSIGNED RIDER:</label>
              <select
                className="review-rider-select"
                value={assignedRider}
                onChange={(e) => setAssignedRider(e.target.value)}
              >
                <option value="-- Unassigned --">-- Unassigned --</option>
                <option value="Rider Kumar (Van #02)">Rider Kumar (Van #02)</option>
                <option value="Rider Suresh (Bike #04)">Rider Suresh (Bike #04)</option>
                <option value="Express Dispatch Ranipet">Express Dispatch Ranipet</option>
              </select>
            </div>

            <div className="review-info-row" style={{ marginTop: '10px' }}>
              <span className="review-row-label">Bag Barcode:</span>
              <span className="review-code-val">WD-BAG-{String(order.id || 15).slice(-2).padStart(2, '0')}</span>
            </div>
            <div className="review-schedule-item">
              <span className="review-sched-icon">🕒</span>
              <span className="review-sched-text">
                Expected Pickup: <strong style={{ color: '#34d399' }}>Today 02:30 PM (Afternoon)</strong>
              </span>
            </div>
            <div className="review-schedule-item">
              <span className="review-sched-icon">📅</span>
              <span className="review-sched-text">
                Promised Delivery: <strong style={{ color: '#60a5fa' }}>Tomorrow 06:00 PM (Evening)</strong>
              </span>
            </div>

            <button
              type="button"
              className="review-btn-dispatch"
              onClick={handleAutoDispatch}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Auto-Dispatch Nearest Rider</span>
            </button>
          </div>

          {/* Card 3: Instructions & Log */}
          <div className="review-panel-card">
            <div className="review-panel-head">
              <span className="review-panel-title">📁 3. Instructions &amp; Log</span>
              <span className="review-badge-amber">Audit Trail</span>
            </div>

            <div className="review-log-codebox">
              {logNotes}
            </div>

            <div className="review-staff-note-wrap">
              <input
                className="review-staff-note-input"
                placeholder="Add staff note..."
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveStaffNote(e);
                }}
              />
              <button
                type="button"
                className="review-staff-save-btn"
                onClick={handleSaveStaffNote}
              >
                Save
              </button>
            </div>
          </div>

          {/* Card 4: Workflow Pipeline */}
          <div className="review-panel-card">
            <div className="review-panel-head">
              <span className="review-panel-title">📦 4. Workflow Pipeline</span>
              <span className="review-badge-gray">⭐ Normal</span>
            </div>

            {/* Pipeline Stage Buttons */}
            <div className="review-pipeline-grid">
              <button
                type="button"
                className={`pipeline-step-btn ${activePipelineStage >= 1 ? 'active' : ''}`}
                onClick={() => onOpenStatus(order)}
              >
                <span className="step-icon">🕒</span>
                <span>Received</span>
              </button>
              <button
                type="button"
                className={`pipeline-step-btn ${activePipelineStage >= 2 ? 'active' : ''}`}
                onClick={() => onOpenStatus(order)}
              >
                <span className="step-icon">🔄</span>
                <span>In Plant</span>
              </button>
              <button
                type="button"
                className={`pipeline-step-btn ${activePipelineStage >= 3 ? 'active' : ''}`}
                onClick={() => onOpenStatus(order)}
              >
                <span className="step-icon">✔️</span>
                <span>Ready</span>
              </button>
            </div>

            {/* Quick Filter Tags */}
            <div className="review-quick-tags-row">
              <span className="quick-pill">🚚 DFA (Cash)</span>
              <span className="quick-pill">🚚 DFA (Net)</span>
            </div>

            {/* Action Alert Buttons */}
            <div className="review-alerts-row">
              <button
                type="button"
                className="review-alert-btn rdy"
                onClick={handleSendRdyAlert}
              >
                <span>🚀 RDY Alert</span>
              </button>
              <button
                type="button"
                className="review-alert-btn nr"
                onClick={handleSendNrAlert}
              >
                <span>🔕 NR Alert</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
