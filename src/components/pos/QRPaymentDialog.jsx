import React, { useState } from 'react';
import { Dialog as MUIDialog, DialogTitle as MUIDialogTitle, DialogContent as MUIDialogContent, DialogActions as MUIDialogActions } from '@mui/material';
import { Button as MUIButton } from '@mui/material';

function QRPaymentDialog({ showEditQRModal, editFormData, setEditFormData, editCartGrandTotal, setShowEditQRModal, setEditFormData: setForm, showToast }) {
  if (typeof document === 'undefined') return null;

  return (
    <MUIDialog
      open={showEditQRModal}
      onClose={() => setShowEditQRModal(false)}
      maxWidth="sm"
    >
      <MUIDialogTitle>Payment via QR Code</MUIDialogTitle>
      <MUIDialogContent>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <svg width="80" height="80" style={{ margin: '0 auto 20px', color: '#10b981' }}>
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <path d="M7 7h.01"></path>
            <path d="M17 7h.01"></path>
            <path d="M7 17h.01"></path>
          </svg>
          <h3>Scan QR Code to Pay</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '10px 0' }}>
            Amount: <strong>₹{(Number(editCartGrandTotal) || 0).toFixed(2)}</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Select UPI / QR Code as payment method to complete the payment.
          </p>
        </div>
      </MUIDialogContent>
      <MUIDialogActions>
        <MUIButton onClick={() => setShowEditQRModal(false)}>Close</MUIButton>
        <MUIButton variant="contained" onClick={() => {
          setForm({
            ...editFormData,
            advance_paid: editCartGrandTotal,
            payment_status: 'Paid',
            payment_method: 'UPI / QR Code',
          });
          setShowEditQRModal(false);
          showToast?.('✓ Payment received via QR & marked as Fully Paid!');
        }}>
          Mark as Fully Paid
        </MUIButton>
      </MUIDialogActions>
    </MUIDialog>
  );
}

export default QRPaymentDialog;