import React from 'react';
import { createPortal } from 'react-dom';

export default function UPIPaymentQRDialog({
  open,
  onClose,
  orderNumber = 'ORDER',
  customerName = 'Customer',
  amount = 0,
  currencySymbol = '₹',
  onMarkPaid,
}) {
  if (!open) return null;

  const numAmount = Number(amount) || 0;
  const formattedAmount = numAmount.toFixed(2);

  const content = (
    <div
      className="pos-held-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="pos-dialog-modal pos-qr-dialog-modal"
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '20px 22px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25), 0 4px 16px rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pos-dialog-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div
            className="pos-dialog-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              fontWeight: 850,
              color: '#0f172a',
            }}
          >
            <span style={{ fontSize: '18px' }}>📱</span>
            <span>UPI Payment QR Code</span>
          </div>
          <button
            type="button"
            className="pos-dialog-close-btn"
            onClick={onClose}
            title="Close QR"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="pos-qr-order-banner"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '12px',
            padding: '14px 16px',
            textAlign: 'center',
            color: '#ffffff',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
            #{orderNumber}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {customerName}
          </div>
          <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
            {currencySymbol}{formattedAmount}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Scan to Pay via any UPI App
          </div>
        </div>

        {/* QR Code Container */}
        <div
          className="pos-qr-image-wrapper"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1.5px dashed #cbd5e1',
            margin: '0 auto 14px',
            width: '200px',
            height: '200px',
            boxSizing: 'border-box',
          }}
        >
          <img
            src="/sample-qr.png"
            alt="UPI Payment QR Code"
            className="pos-qr-image"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </div>

        <div
          className="pos-qr-apps-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span>Google Pay</span>
          <span>•</span>
          <span>PhonePe</span>
          <span>•</span>
          <span>Paytm</span>
          <span>•</span>
          <span>BHIM UPI</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="pos-btn-secondary"
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            style={{
              flex: 1.2,
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
            }}
            onClick={() => {
              onMarkPaid?.();
              onClose();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Mark Paid via QR</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}
