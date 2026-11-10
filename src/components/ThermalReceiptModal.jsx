// src/components/ThermalReceiptModal.jsx
// Professional POS Thermal Receipt & Invoice Print Dialog (80mm & 58mm supported)

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BUSINESS_CONFIG } from '../config/businessRules';
import { formatPhoneDisplay } from '../utils/validation';

export default function ThermalReceiptModal({ order, isOpen, onClose }) {
  const [receiptSize, setReceiptSize] = useState('80mm'); // '80mm' or '58mm'

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scope print rules cleanly while the Thermal Receipt modal is open
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const active = Boolean(isOpen && order);
    document.documentElement.classList.toggle('pos-thermal-receipt-open', active);
    document.body.classList.toggle('pos-thermal-receipt-open', active);
    return () => {
      document.documentElement.classList.remove('pos-thermal-receipt-open');
      document.body.classList.remove('pos-thermal-receipt-open');
    };
  }, [isOpen, order]);

  if (!isOpen || !order || typeof document === 'undefined') return null;

  const orderNum = order.order_number || order.order_id || order.work_number || (order.id ? String(order.id) : 'ORD-—');
  const custName = order.customer_name || order.customer?.customer_name || 'Walk-in Customer';
  const custPhone = order.formatted_mobile || formatPhoneDisplay(order.mobile_number || order.customer?.mobile_number) || '—';
  const custAddress = order.address || order.delivery_address || order.customer?.address || 'Counter Walk-In';
  const dateStr = order.captured_date || new Date().toISOString().split('T')[0];
  const timeStr = order.captured_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const deliveryStr = order.expected_delivery || 'Standard (48 hrs)';

  const items = order.items || order.customer_history?.items || [];
  const subtotal = Number(order.subtotal || order.total_amount || 0);
  const taxAmount = Number(order.tax_amount || subtotal * BUSINESS_CONFIG.DEFAULT_GST_RATE);
  const grandTotal = Number(order.total_amount || order.grand_total || (subtotal + taxAmount));
  const advancePaid = Number(order.advance_paid || 0);
  const balanceDue = Number(order.balance_due !== undefined ? order.balance_due : Math.max(0, grandTotal - advancePaid));
  const paymentStatus = order.payment_status || (balanceDue <= 0 ? 'Paid' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid');
  const paymentMode = order.payment_mode || order.payment_method || 'Cash / UPI';

  const handlePrint = () => {
    document.documentElement.classList.add('pos-thermal-receipt-open');
    document.body.classList.add('pos-thermal-receipt-open');
    window.print();
  };

  const qtyColWidth = receiptSize === '80mm' ? '32px' : '26px';
  const amtColMinWidth = receiptSize === '80mm' ? '58px' : '50px';

  const modalContent = (
    <div
      className="pos-receipt-modal-backdrop"
      data-receipt-size={receiptSize}
      onClick={onClose}
    >
      <div
        className="pos-receipt-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Screen only) */}
        <div className="pos-receipt-header">
          <div className="pos-receipt-title-group">
            <span>🧾</span>
            <span className="pos-receipt-title-text">Thermal Invoice &amp; Receipt</span>
          </div>

          {/* Paper Size Selector */}
          <div className="pos-receipt-size-selector">
            <button
              type="button"
              onClick={() => setReceiptSize('80mm')}
              className={`pos-receipt-size-btn ${receiptSize === '80mm' ? 'active' : ''}`}
            >
              80mm (Counter)
            </button>
            <button
              type="button"
              onClick={() => setReceiptSize('58mm')}
              className={`pos-receipt-size-btn ${receiptSize === '58mm' ? 'active' : ''}`}
            >
              58mm (Mobile)
            </button>
          </div>

          <button
            type="button"
            className="pos-dialog-close-btn pos-receipt-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="pos-receipt-preview-wrap">
          {/* Printable Receipt Paper */}
          <div
            id="washdoor-thermal-receipt"
            className={`pos-receipt-paper pos-receipt-paper--${receiptSize}`}
            data-receipt-size={receiptSize}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: receiptSize === '80mm' ? '18px' : '15px', fontWeight: 900, letterSpacing: '1px' }}>
                {BUSINESS_CONFIG.BRAND_NAME.toUpperCase()}
              </div>
              <div style={{ fontSize: '10px', color: '#333' }}>
                {BUSINESS_CONFIG.BRAND_TAGLINE}
              </div>
              <div style={{ fontSize: '10px', marginTop: '2px' }}>
                {BUSINESS_CONFIG.STORE_BRANCH}
              </div>
              <div style={{ fontSize: '9.5px', marginTop: '2px' }}>
                GSTIN: {BUSINESS_CONFIG.STORE_GSTIN}
              </div>
              <div style={{ fontSize: '9.5px' }}>
                Tel: {BUSINESS_CONFIG.STORE_PHONE}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Meta Info */}
            <div style={{ fontSize: '10.5px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 700 }}>
                <span style={{ flexShrink: 0 }}>ORDER:</span>
                <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{orderNum}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ flexShrink: 0 }}>DATE:</span>
                <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{dateStr} {timeStr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ flexShrink: 0 }}>CUSTOMER:</span>
                <span style={{ fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{custName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ flexShrink: 0 }}>MOBILE:</span>
                <span dir="ltr" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{custPhone}</span>
              </div>
              {custAddress && (
                <div style={{ fontSize: '9.5px', color: '#444', marginTop: '2px', wordBreak: 'break-word' }}>
                  {custAddress}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Items Table */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontWeight: 700, fontSize: '10.5px', marginBottom: '4px' }}>
                <span style={{ flex: 1, minWidth: 0 }}>ITEM / SERVICE</span>
                <span style={{ width: qtyColWidth, flexShrink: 0, textAlign: 'center' }}>QTY</span>
                <span style={{ minWidth: amtColMinWidth, flexShrink: 0, textAlign: 'right' }}>AMT</span>
              </div>
              <div style={{ borderTop: '0.5px solid #ccc', marginBottom: '6px' }} />

              {items.length === 0 ? (
                <div className="pos-receipt-item-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', padding: '3px 0' }}>
                  <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{order.service_category || 'Laundry Service'}</span>
                  <span style={{ width: qtyColWidth, flexShrink: 0, textAlign: 'center' }}>{order.item_count || 1}</span>
                  <span style={{ minWidth: amtColMinWidth, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              ) : (
                items.map((it, idx) => {
                  const qty = it.qty || it.count || 1;
                  const rate = it.rate || it.price || 0;
                  const amt = Number(qty) * Number(rate);
                  return (
                    <div key={idx} className="pos-receipt-item-row" style={{ padding: '2px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 600, wordBreak: 'break-word' }}>{it.name || it.item_name}</span>
                        <span style={{ width: qtyColWidth, flexShrink: 0, textAlign: 'center' }}>{qty}</span>
                        <span style={{ minWidth: amtColMinWidth, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{amt.toFixed(2)}</span>
                      </div>
                      {it.serviceType && (
                        <div style={{ fontSize: '9px', color: '#555', paddingLeft: '4px', wordBreak: 'break-word' }}>
                          [{it.serviceType}]
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Financial Breakdown */}
            <div className="pos-receipt-totals" style={{ fontSize: receiptSize === '80mm' ? '11px' : '10px', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>Subtotal:</span>
                <span style={{ whiteSpace: 'nowrap' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>{BUSINESS_CONFIG.DEFAULT_GST_LABEL}:</span>
                <span style={{ whiteSpace: 'nowrap' }}>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 800, fontSize: receiptSize === '80mm' ? '13px' : '11.5px', marginTop: '4px' }}>
                <span>GRAND TOTAL:</span>
                <span style={{ whiteSpace: 'nowrap' }}>₹{grandTotal.toFixed(2)}</span>
              </div>

              {advancePaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#15803d', fontWeight: 600 }}>
                  <span>Advance Paid:</span>
                  <span style={{ whiteSpace: 'nowrap' }}>-₹{advancePaid.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 700, color: balanceDue > 0 ? '#b91c1c' : '#15803d' }}>
                <span>BALANCE DUE:</span>
                <span style={{ whiteSpace: 'nowrap' }}>₹{balanceDue.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', marginTop: '4px' }}>
                <span style={{ flexShrink: 0 }}>Payment:</span>
                <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{paymentStatus} ({paymentMode})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px' }}>
                <span style={{ flexShrink: 0 }}>Target Delivery:</span>
                <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{deliveryStr}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '12px 0 8px 0' }} />

            {/* Footer */}
            <div className="pos-receipt-brand-footer" style={{ textAlign: 'center', fontSize: '9.5px', color: '#444' }}>
              <div>* Garments checked at intake *</div>
              <div>Claims within 24 hrs of delivery</div>
              <div style={{ marginTop: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>
                THANK YOU FOR YOUR VISIT!
              </div>
              <div style={{ fontSize: '8.5px', marginTop: '2px' }}>
                www.washdoor.in
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pos-receipt-footer">
          <span className="pos-receipt-footer-text">
            Ready to print on {receiptSize} thermal printer
          </span>

          <div className="pos-receipt-footer-actions">
            <button
              type="button"
              className="pos-dialog-cancel-btn pos-receipt-btn-close"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="pos-dialog-confirm-btn pos-receipt-btn-print"
              onClick={handlePrint}
            >
              <span>🖨️</span>
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
