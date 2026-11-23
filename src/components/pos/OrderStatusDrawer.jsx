import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatPhoneDisplay } from '../../utils/validation';
import { formatScheduledDateTime, resolveDisplayScheduledDelivery } from '../../utils/onCallScheduling';
import '../../styles/POSModule.css';

function normalizeOrderStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('deliver') || s.includes('complete')) return 'Delivered';
  if (s.includes('ready') || s.includes('billing')) return 'Ready';
  if (s.includes('receive') || s.includes('intake') || s.includes('new') || s.includes('overdue')) return 'Order Received';
  if (s.includes('progress') || s.includes('wash') || s.includes('iron') || s.includes('process')) return 'In Progress';
  return 'Order Received';
}

function formatStatusTimestamp(value) {
  if (!value) return { dateStr: '—', timeStr: '', dateTimeStr: '—' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { dateStr: String(value), timeStr: '', dateTimeStr: String(value) };
  }
  const dateStr = parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
  return {
    dateStr,
    timeStr,
    dateTimeStr: `${dateStr}, ${timeStr}`,
  };
}

function formatServiceBreakdown(activeList, serviceCategory) {
  if (!Array.isArray(activeList) || activeList.length === 0) return '';
  const groups = {};
  activeList.forEach((it) => {
    const svc = it.serviceType || it.service || serviceCategory || 'Laundry';
    if (!groups[svc]) groups[svc] = [];
    groups[svc].push(it);
  });
  const lines = [];
  Object.entries(groups).forEach(([svc, list]) => {
    const total = list.reduce((sum, it) => sum + (Number(it.qty || it.count || 1) || 0), 0);
    lines.push(`${svc}: ${total} pcs`);
  });
  const totalPcs = activeList.reduce((sum, it) => sum + (Number(it.qty || it.count || 1) || 0), 0);
  return `${lines.join(' | ')} (total = ${totalPcs} pcs)`;
}

function getServiceItemIcon(item = {}) {
  if (item.icon) return item.icon;
  const lower = String(item.name || '').toLowerCase();
  if (lower.includes('steam press') || lower.includes('iron') || lower.includes('press')) return '♨️';
  if (lower.includes('dry clean') || lower.includes('drycleaning')) return '✨';
  if (lower.includes('wash') || lower.includes('laundry')) return '👕';
  if (lower.includes('starch') || lower.includes('finish')) return '🧴';
  if (lower.includes('softener') || lower.includes('fragrance') || lower.includes('perfume')) return '🌸';
  if (lower.includes('saree')) return '🥻';
  if (lower.includes('curtain')) return '🪟';
  if (lower.includes('bed') || lower.includes('pillow')) return '🛏️';
  if (lower.includes('shoe')) return '👟';
  if (lower.includes('towel')) return '🧺';
  if (lower.includes('pant') || lower.includes('jeans')) return '👖';
  return '👕';
}

function buildOrderActivityTimeline(ord, currencySymbol = '₹') {
  if (!ord) return [];
  const rawStored = Array.isArray(ord.activity_history) && ord.activity_history.length > 0
    ? ord.activity_history
    : (Array.isArray(ord.audit_logs) && ord.audit_logs.length > 0 ? ord.audit_logs : (Array.isArray(ord.logs) ? ord.logs : []));

  const normalizedStored = rawStored.map((ev, idx) => ({
    id: ev.id || `act_${idx}`,
    type: ev.type || (String(ev.title || '').toLowerCase().includes('deliver') ? 'collection' : String(ev.title || '').toLowerCase().includes('pay') ? 'payment' : String(ev.title || '').toLowerCase().includes('service') ? 'service' : String(ev.title || '').toLowerCase().includes('receiv') && !String(ev.title || '').toLowerCase().includes('payment') ? 'received' : 'status'),
    title: ev.title || 'Order Update',
    detail: ev.detail || ev.remarks || '',
    staff: ev.staff || ev.author || ord.attend_staff_name || ord.assigned_staff || 'Counter Staff',
    timestamp: ev.timestamp || ev.time || ord.updated_at || ord.created_at,
  }));

  const staffName = ord.attend_staff_name || ord.status_updated_by || ord.assigned_staff || 'Counter Staff';
  const workStatus = normalizeOrderStatus(ord.order_status || ord.status || 'Order Received');
  const totalAmount = Number(ord.total_amount || ord.grand_total || 0);
  const advancePaid = Number(ord.advance_paid || 0);
  const payStatus = String(ord.payment_status || '');
  const payMode = ord.payment_method || ord.payment?.mode || 'Cash';
  const items = Array.isArray(ord.items) ? ord.items : [];
  const servicesList = Array.isArray(ord.services_allocated) ? ord.services_allocated : [];
  const hasType = (tp) => normalizedStored.some((e) => e.type === tp);

  const synthesized = [...normalizedStored];

  if (workStatus === 'Delivered' && !hasType('collection')) {
    synthesized.push({
      id: 'act_synth_delivered',
      type: 'collection',
      title: 'Order Delivered',
      detail: `Garments delivered to ${ord.collected_by_person || ord.customer_name || 'customer'}`,
      staff: ord.assigned_pickup_delivery_person || staffName,
      timestamp: ord.collection_at || ord.delivered_at || ord.status_updated_at || ord.created_at,
    });
  }

  if (advancePaid > 0 && !hasType('payment')) {
    const paidAmt = advancePaid;
    synthesized.push({
      id: 'act_synth_payment',
      type: 'payment',
      title: 'Payment Received',
      detail: `${currencySymbol}${(Number(paidAmt) || 0).toFixed(2)} received via ${payMode}`,
      staff: ord.payment_received_by || staffName,
      timestamp: ord.payment_received_at || ord.updated_at || ord.created_at,
    });
  }

  if ((items.length > 0 || servicesList.length > 0) && !hasType('service')) {
    const activeList = items.length > 0 ? items : servicesList;
    const breakdownText = formatServiceBreakdown(activeList, ord.service_category || ord.service_type || 'Laundry');
    synthesized.push({
      id: 'act_synth_service',
      type: 'service',
      title: 'Service Allocated',
      detail: breakdownText || `${ord.service_category || 'Laundry'} (${activeList.length} item${activeList.length === 1 ? '' : 's'})`,
      staff: staffName,
      timestamp: ord.updated_at || ord.created_at,
    });
  }

  if (workStatus !== 'Order Received' && workStatus !== 'Delivered' && !hasType('status')) {
    synthesized.push({
      id: 'act_synth_status',
      type: 'status',
      title: 'Status Updated',
      detail: workStatus,
      staff: staffName,
      timestamp: ord.status_updated_at || ord.updated_at || ord.created_at,
    });
  }

  if (!hasType('received')) {
    synthesized.push({
      id: 'act_synth_received',
      type: 'received',
      title: 'Order Received',
      detail: 'New order placed',
      staff: ord.attend_staff_name || ord.assigned_staff || 'Counter Staff',
      timestamp: ord.intake_date || ord.created_at,
    });
  }

  const sorted = synthesized.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return tb - ta;
  });

  const activeList = items.length > 0 ? items : servicesList;
  if (activeList.length > 0) {
    const latestServiceIdx = sorted.findIndex((ev) => ev.type === 'service');
    if (latestServiceIdx >= 0 && !String(sorted[latestServiceIdx].detail || '').includes('total =')) {
      const upgradedDetail = formatServiceBreakdown(activeList, ord.service_category || ord.service_type || 'Laundry');
      if (upgradedDetail) {
        sorted[latestServiceIdx] = { ...sorted[latestServiceIdx], detail: upgradedDetail };
      }
    }
  }

  return sorted;
}

function OrderStatusSidePanel({
  order,
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  onPrint,
  currencySymbol = '₹',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order || typeof document === 'undefined') return null;

  const orderNum = order.order_number || order.order_id || order.work_number || (order.id ? String(order.id) : '—');
  const custName = order.customer_name || order.customer?.customer_name || 'Walk-in Customer';
  const phone = order.formatted_mobile || formatPhoneDisplay(order.mobile_number || order.customer?.mobile_number) || '—';
  const address = order.address || order.delivery_address || order.customer?.address || 'Counter Walk-In';
  const workStatus = normalizeOrderStatus(order.order_status || order.status || 'Order Received');
  const rawOrderType = String(order.order_type || order.intake_method || 'Walk-In').trim();
  const rawOrderTypeLower = rawOrderType.toLowerCase();
  const isOnCallOrder = rawOrderTypeLower.includes('call') || rawOrderTypeLower.includes('phone');
  const isPickupDeliveryOrder = !isOnCallOrder && (rawOrderTypeLower.includes('pickup') || rawOrderTypeLower.includes('delivery'));
  const orderTypeLabel = isOnCallOrder
    ? 'On-Call (Pickup)'
    : isPickupDeliveryOrder
      ? 'Pickup & Delivery'
      : 'Walk-In (Store Drop)';
  const attendStaff = order.attend_staff_name || order.status_updated_by || order.assigned_staff || 'Counter Staff';
  const rawPickup = (order.assigned_pickup_delivery_person || order.assigned_driver || '').trim();
  const pickupPerson = (rawPickup && rawPickup !== 'Counter Staff') ? rawPickup : 'Not assigned';
  const statusUpdatedMeta = formatStatusTimestamp(order.status_updated_at || order.updated_at || order.created_at);
  const orderCreatedMeta = formatStatusTimestamp(order.intake_date || order.created_at);

  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : (Array.isArray(order.services_allocated) ? order.services_allocated.map((s) => ({ name: s.name, qty: s.count || 1, serviceType: order.service_category || 'Laundry', icon: s.icon })) : []);
  const garmentInspections = order.garment_inspections || order.inspections || {};
  const inspectionList = Object.values(garmentInspections).filter(Boolean);

  const totalAmount = Number(order.total_amount || order.grand_total || order.bill_amount || 0);
  const advancePaid = Number(order.advance_paid || order.payment?.advancePaid || 0);
  const balanceDue = Number(order.balance_due !== undefined ? order.balance_due : Math.max(0, totalAmount - advancePaid));
  const payStatus = (() => {
    if (advancePaid <= 0 && totalAmount > 0) return 'Unpaid / Pay on Delivery';
    if ((totalAmount > 0 && advancePaid >= totalAmount) || balanceDue <= 0) return 'Paid in Full';
    if (advancePaid > 0 && advancePaid < totalAmount) return 'Partially Paid';
    const raw = String(order.payment_status || order.payment?.status || '').trim();
    if (raw.toLowerCase().includes('part')) return advancePaid > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery';
    if (raw.toLowerCase().includes('paid')) return advancePaid > 0 ? 'Paid in Full' : 'Unpaid / Pay on Delivery';
    return raw || 'Unpaid / Pay on Delivery';
  })();
  const payMode = order.payment_method || order.payment?.mode || 'Cash';
  const paymentMeta = formatStatusTimestamp(order.payment_received_at || (advancePaid > 0 ? (order.updated_at || order.created_at) : null));
  const paymentStaff = order.payment_received_by || attendStaff;

  const isDelivered = workStatus === 'Delivered';
  const collectionMeta = formatStatusTimestamp(order.collection_at || order.delivered_at || (isDelivered ? (order.updated_at || order.created_at) : null));
  const collectedBy = order.collected_by_person || (isDelivered ? (pickupPerson !== 'Not assigned' ? pickupPerson : custName) : 'Pending Collection');
  const attendAndCollectedStaff = (() => {
    const a = String(attendStaff || '').trim();
    const c = String(collectedBy || '').trim();
    if (!c || c === 'Pending Collection' || c.toLowerCase() === a.toLowerCase()) {
      return a || c || 'Counter Staff';
    }
    if (!a) return c;
    return `${a} • ${c}`;
  })();

  const timeline = buildOrderActivityTimeline(order, currencySymbol);

  const statusTone =
    workStatus === 'In Progress' ? { bg: '#fef3c7', color: '#b45309', dot: '#f59e0b', border: '#fde68a' } :
      workStatus === 'Ready' ? { bg: '#dcfce7', color: '#15803d', dot: '#10b981', border: '#bbf7d0' } :
        workStatus === 'Delivered' ? { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', border: '#bbf7d0' } :
          workStatus === 'Cancelled' ? { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444', border: '#fecaca' } :
            { bg: '#eff6ff', color: '#1d4ed8', dot: '#2563eb', border: '#bfdbfe' };

  const primaryServiceSummary = order.service_category || order.service_type || (items[0]?.serviceType || items[0]?.service || items[0]?.name) || 'Laundry';
  const updatedBy = order.status_updated_by || order.updated_by_name || attendStaff || 'Counter Staff';

  return createPortal(
    <div className="pos-status-drawer-backdrop" onClick={onClose}>
      <aside
        className="pos-status-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${orderNum} status and activity panel`}
      >
        <div className="pos-status-drawer-header">
          <div className="pos-status-drawer-title-group">
            <div className="pos-status-drawer-check-badge" style={{ background: statusTone.dot }}>
              {workStatus === 'Cancelled' ? '✕' : workStatus === 'In Progress' ? '…' : '✓'}
            </div>
            <div>
              <div className="pos-status-drawer-title-row">
                <h2 className="pos-status-drawer-title">Order {orderNum}</h2>
                <span
                  className="pos-status-drawer-pill"
                  style={{ background: statusTone.bg, color: statusTone.color, borderColor: statusTone.border }}
                >
                  <span className="pos-status-dot" style={{ background: statusTone.dot }} />
                  {workStatus}
                </span>
              </div>
              <div className="pos-status-drawer-sub">
                Order Date: {orderCreatedMeta.dateTimeStr} • Updated By: {updatedBy}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {onPrint && (
              <button type="button" className="pos-status-drawer-tab" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }} onClick={() => onPrint(order)}>Print</button>
            )}
            {onEdit && (
              <button type="button" className="pos-status-drawer-tab" style={{ border: '1px solid #2563eb', borderRadius: 8, padding: '6px 10px', background: '#2563eb', color: '#fff' }} onClick={() => onEdit(order)}>Edit Order</button>
            )}
            <button
              type="button"
              className="pos-status-drawer-close"
              onClick={onClose}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="pos-status-drawer-tabs" role="tablist">
          {[
            { id: 'details', label: 'Order Details' },
            { id: 'history', label: 'Activity History' },
            { id: 'payment', label: 'Payment Info' },
            { id: 'collection', label: 'Collection Info' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`pos-status-drawer-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pos-status-drawer-body">
          {activeTab === 'details' && (
            <div className="pos-status-tab-pane">
              <div className="pos-status-card">
                <h3 className="pos-status-card-title">Order Summary</h3>
                <div className="pos-status-kv-list">
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Order ID</span>
                    <strong className="pos-status-kv-val">{orderNum}</strong>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Order Type</span>
                    <span
                      className="pos-status-drawer-pill"
                      style={
                        isOnCallOrder
                          ? { background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
                          : isPickupDeliveryOrder
                            ? { background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
                            : { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }
                      }
                    >
                      {isOnCallOrder ? '📞 ' : isPickupDeliveryOrder ? '🚚 ' : '🏪 '}
                      {orderTypeLabel}
                    </span>
                  </div>
                  {!isOnCallOrder && (
                    <div className="pos-status-kv-row">
                      <span className="pos-status-kv-label">Scheduled Delivery</span>
                      <span className="pos-status-kv-val">{formatScheduledDateTime(resolveDisplayScheduledDelivery(order), 'Not Scheduled')}</span>
                    </div>
                  )}
                  {isOnCallOrder && (
                    <>
                      <div className="pos-status-kv-row">
                        <span className="pos-status-kv-label">Scheduled Pickup</span>
                        <span className="pos-status-kv-val">{formatScheduledDateTime(order.scheduled_pickup_at, 'Not Scheduled')}</span>
                      </div>
                      <div className="pos-status-kv-row">
                        <span className="pos-status-kv-label">Scheduled Delivery</span>
                        <span className="pos-status-kv-val">{formatScheduledDateTime(resolveDisplayScheduledDelivery(order), 'Not Scheduled')}</span>
                      </div>
                    </>
                  )}
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Customer</span>
                    <span className="pos-status-kv-val">{custName}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Mobile</span>
                    <span className="pos-status-kv-val">{phone}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Address</span>
                    <span className="pos-status-kv-val">{address}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Order Date</span>
                    <span className="pos-status-kv-val">{orderCreatedMeta.dateTimeStr}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Current Status</span>
                    <span className="pos-status-drawer-pill" style={{ background: statusTone.bg, color: statusTone.color, borderColor: statusTone.border }}>
                      <span className="pos-status-dot" style={{ background: statusTone.dot }} />
                      {workStatus}
                    </span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Attend Staff</span>
                    <span className="pos-status-kv-val">{attendStaff}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Assigned Pickup &amp; Delivery</span>
                    <span className="pos-status-kv-val">{pickupPerson}</span>
                  </div>
                </div>
              </div>

              <div className="pos-status-card">
                <h3 className="pos-status-card-title">Services &amp; Garment Details</h3>
                {items.length === 0 ? (
                  <div className="pos-status-empty-note">
                    Primary Service: <strong>{primaryServiceSummary}</strong>
                  </div>
                ) : (
                  <div
                    className="pos-status-garment-list"
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      paddingRight: '6px',
                    }}
                  >
                    {items.map((it, idx) => {
                      const qty = Number(it.qty || it.quantity || it.count || 1);
                      const rate = Number(it.rate || it.unit_price || it.price || 0);
                      const svcLabel = it.serviceType || it.service || primaryServiceSummary;
                      return (
                        <div key={`${it.name || 'item'}-${idx}`} className="pos-status-garment-row">
                          <div className="pos-status-garment-left">
                            <span className="pos-status-garment-icon">{getServiceItemIcon(it)}</span>
                            <div>
                              <div className="pos-status-garment-name">{it.name || it.item_name || 'Garment'}</div>
                              <div className="pos-status-garment-svc">{svcLabel}</div>
                            </div>
                          </div>
                          <div className="pos-status-garment-right">
                            <span className="pos-status-garment-qty">×{qty}</span>
                            {rate > 0 && (
                              <span className="pos-status-garment-amt">{currencySymbol}{(rate * qty).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {inspectionList.length > 0 && (
                  <div className="pos-status-inspection-box">
                    <div className="pos-status-inspection-head">Garment Inspection Notes</div>
                    {inspectionList.map((insp, i) => (
                      <div key={insp.id || i} className="pos-status-inspection-item">
                        <strong>{insp.name || insp.garment || 'Garment'}:</strong>{' '}
                        {[insp.color, insp.fabric, insp.brand, insp.stains, insp.notes].filter(Boolean).join(' • ') || 'Inspected'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="pos-status-tab-pane">
              <div className="pos-status-card">
                <div className="pos-status-timeline">
                  {timeline.map((ev, idx) => {
                    const evMeta = formatStatusTimestamp(ev.timestamp);
                    const dotColor =
                      ev.type === 'collection' ? '#16a34a' :
                        ev.type === 'payment' ? '#2563eb' :
                          ev.type === 'service' ? '#f59e0b' :
                            ev.type === 'status' ? '#0284c7' : '#2563eb';
                    const iconEmoji =
                      ev.type === 'collection' ? '🚚' :
                        ev.type === 'payment' ? '💳' :
                          ev.type === 'service' ? '🔄' :
                            ev.type === 'status' ? '▶' : '✓';

                    return (
                      <div key={ev.id || idx} className="pos-status-timeline-item">
                        <div className="pos-status-timeline-rail">
                          <span className="pos-status-timeline-dot" style={{ background: dotColor }} />
                          {idx < timeline.length - 1 && <span className="pos-status-timeline-line" />}
                        </div>
                        <div className="pos-status-timeline-content">
                          <div className="pos-status-timeline-left">
                            <span className="pos-status-timeline-icon" style={{ color: dotColor }}>{iconEmoji}</span>
                            <div>
                              <div className="pos-status-timeline-title">{ev.title}</div>
                              {ev.detail && <div className="pos-status-timeline-detail">{ev.detail}</div>}
                            </div>
                          </div>
                          <div className="pos-status-timeline-meta">
                            <div className="pos-status-timeline-time">{evMeta.dateTimeStr}</div>
                            <div className="pos-status-timeline-staff">By {ev.staff || attendStaff}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pos-status-summary-footer-grid">
                <div className="pos-status-mini-card">
                  <span className="pos-status-mini-icon">₹</span>
                  <div>
                    <div className="pos-status-mini-label">Payment Status</div>
                    <div className="pos-status-mini-val" style={{ color: balanceDue <= 0 && totalAmount > 0 ? '#15803d' : '#b45309' }}>
                      {payStatus} {currencySymbol}{totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="pos-status-mini-card">
                  <span className="pos-status-mini-icon">👤</span>
                  <div>
                    <div className="pos-status-mini-label">Collected By</div>
                    <div className="pos-status-mini-val">{collectedBy}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="pos-status-tab-pane">
              <div className="pos-status-card">
                <h3 className="pos-status-card-title">Payment Details</h3>
                <div className="pos-status-kv-list">
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Total Order Amount</span>
                    <strong className="pos-status-kv-val">{currencySymbol}{totalAmount.toFixed(2)}</strong>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Payment Amount Received</span>
                    <strong className="pos-status-kv-val" style={{ color: '#15803d' }}>
                      {currencySymbol}{advancePaid.toFixed(2)}
                    </strong>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Balance Due</span>
                    <strong className="pos-status-kv-val" style={{ color: balanceDue > 0 ? '#dc2626' : '#15803d' }}>
                      {currencySymbol}{balanceDue.toFixed(2)}
                    </strong>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Payment Status</span>
                    <span className="pos-status-kv-val">{payStatus}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Payment Method</span>
                    <span className="pos-status-kv-val">{payMode}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Received Date</span>
                    <span className="pos-status-kv-val">{advancePaid > 0 ? paymentMeta.dateStr : '—'}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Received Time</span>
                    <span className="pos-status-kv-val">{paymentMeta.timeStr || 'Pending'}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Responsible Staff Name</span>
                    <strong className="pos-status-kv-val">{paymentStaff}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collection' && (
            <div className="pos-status-tab-pane">
              <div className="pos-status-card">
                <h3 className="pos-status-card-title">Garment Collection &amp; Delivery Details</h3>
                <div className="pos-status-kv-list">
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Collection Status</span>
                    <span
                      className="pos-status-drawer-pill"
                      style={{
                        background: isDelivered ? '#dcfce7' : '#fef3c7',
                        color: isDelivered ? '#15803d' : '#b45309',
                        borderColor: isDelivered ? '#bbf7d0' : '#fde68a',
                      }}
                    >
                      {isDelivered ? 'Collected / Delivered' : 'Pending Collection'}
                    </span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Garment Collection Date</span>
                    <span className="pos-status-kv-val">{isDelivered ? collectionMeta.dateStr : 'Pending'}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Garment Collection Time</span>
                    <span className="pos-status-kv-val">{isDelivered ? (collectionMeta.timeStr || '—') : 'Pending'}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Assigned Pickup &amp; Delivery Person</span>
                    <span className="pos-status-kv-val">{pickupPerson}</span>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Attend Staff / Collected-By Person</span>
                    <strong className="pos-status-kv-val">{attendAndCollectedStaff}</strong>
                  </div>
                  <div className="pos-status-kv-row">
                    <span className="pos-status-kv-label">Delivery / Collection Address</span>
                    <span className="pos-status-kv-val">{address}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}

export default OrderStatusSidePanel;
export { buildOrderActivityTimeline, normalizeOrderStatus, formatStatusTimestamp, formatScheduledDateTime };