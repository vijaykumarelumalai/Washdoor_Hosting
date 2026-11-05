// src/components/ThermalReceiptModal.jsx
// Professional POS Thermal Receipt & Invoice Print Dialog (80mm & 58mm supported)

import React, { useState, useEffect } from 'react';
import { BUSINESS_CONFIG, formatCurrency, roundCurrency } from '../config/businessRules';
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

  if (!isOpen || !order) return null;

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
    window.print();
  };

  return (
    <div
      className="pos-receipt-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
      }}
    >
      <div
        className="pos-receipt-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Screen only) */}
        <div className="pos-receipt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
            <span>🧾</span>
            <span>Thermal Invoice &amp; Receipt</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              className="pos-dialog-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="pos-receipt-preview-wrap">
          {/* Printable Receipt Paper */}
          <div
            id="washdoor-thermal-receipt"
            style={{
              width: receiptSize === '80mm' ? '300px' : '230px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: "'Inter', sans-serif",
              padding: '16px 14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: receiptSize === '80mm' ? '12px' : '10.5px',
              lineHeight: 1.4,
              boxSizing: 'border-box',
            }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>ORDER:</span>
                <span>{orderNum}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>DATE:</span>
                <span>{dateStr} {timeStr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CUSTOMER:</span>
                <span style={{ fontWeight: 700 }}>{custName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>MOBILE:</span>
                <span dir="ltr">{custPhone}</span>
              </div>
              {custAddress && (
                <div style={{ fontSize: '9.5px', color: '#444', marginTop: '2px' }}>
                  {custAddress}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Items Table */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '10.5px', marginBottom: '4px' }}>
                <span style={{ flex: 1 }}>ITEM / SERVICE</span>
                <span style={{ width: '32px', textAlign: 'center' }}>QTY</span>
                <span style={{ width: '48px', textAlign: 'right' }}>AMT</span>
              </div>
              <div style={{ borderTop: '0.5px solid #ccc', marginBottom: '6px' }} />

              {items.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ flex: 1 }}>{order.service_category || 'Laundry Service'}</span>
                  <span style={{ width: '32px', textAlign: 'center' }}>{order.item_count || 1}</span>
                  <span style={{ width: '48px', textAlign: 'right' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              ) : (
                items.map((it, idx) => {
                  const qty = it.qty || it.count || 1;
                  const rate = it.rate || it.price || 0;
                  const amt = Number(qty) * Number(rate);
                  return (
                    <div key={idx} style={{ padding: '2px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ flex: 1, fontWeight: 600 }}>{it.name || it.item_name}</span>
                        <span style={{ width: '32px', textAlign: 'center' }}>{qty}</span>
                        <span style={{ width: '48px', textAlign: 'right' }}>₹{amt.toFixed(2)}</span>
                      </div>
                      {it.serviceType && (
                        <div style={{ fontSize: '9px', color: '#555', paddingLeft: '4px' }}>
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
            <div style={{ fontSize: '11px', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{BUSINESS_CONFIG.DEFAULT_GST_LABEL}:</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px', marginTop: '4px' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              {advancePaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600 }}>
                  <span>Advance Paid:</span>
                  <span>-₹{advancePaid.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: balanceDue > 0 ? '#b91c1c' : '#15803d' }}>
                <span>BALANCE DUE:</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '4px' }}>
                <span>Payment:</span>
                <span>{paymentStatus} ({paymentMode})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Target Delivery:</span>
                <span>{deliveryStr}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '12px 0 8px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#444' }}>
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="pos-dialog-cancel-btn"
              onClick={onClose}
              style={{ flex: 'initial', padding: '9px 16px' }}
            >
              Close
            </button>
            <button
              type="button"
              className="pos-dialog-confirm-btn"
              onClick={handlePrint}
              style={{ flex: 'initial', padding: '9px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>🖨️</span>
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
