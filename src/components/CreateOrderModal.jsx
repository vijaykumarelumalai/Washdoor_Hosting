// src/components/CreateOrderModal.jsx
// Modal Dialog matching washdoor_create_order_updated.html

import React, { useState, useEffect } from 'react';
import CustomerSearchPanel from './CustomerSearchPanel';
import CustomerForm from './CustomerForm';
import { createOrderWithCustomer } from '../services/customerService';
import { friendlySupabaseError } from '../utils/validation';

export default function CreateOrderModal({ isOpen, onClose, onOrderSuccess, showToast }) {
  // Current view: 'LOOKUP' or 'FORM'
  const [view, setView] = useState('LOOKUP');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView('LOOKUP');
      setSelectedCustomer(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setView('FORM');
    showToast(`Customer selected: ${customer.customer_name}. Select intake method to proceed.`);
  };

  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setView('FORM');
  };

  const handleBackToLookup = () => {
    setView('LOOKUP');
    setSelectedCustomer(null);
  };

  const handleFormSubmit = async ({
    customerData,
    orderType,
    orderPreference,
    orderPreferenceNotes,
    existingCustomerId,
  }) => {
    setIsSubmitting(true);

    const { data, error } = await createOrderWithCustomer({
      existingCustomerId,
      customerData,
      orderType,
      orderPreference,
      orderPreferenceNotes,
      totalAmount: 0.00,
    });

    setIsSubmitting(false);

    if (error) {
      showToast(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }

    const orderNumber = data?.order_number || `WD-${data?.order_id || 'NEW'}`;
    showToast(`✅ Order ${orderNumber} created successfully!`);
    onOrderSuccess();
    onClose();
  };

  return (
    <div
      className="overlay"
      id="overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target.id === 'overlay') onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        {/* ── Modal Head ── */}
        <div className="modal-head">
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M9 12h6"></path>
              <path d="M9 16h6"></path>
            </svg>
          </div>
          <div className="modal-title" id="modalTitle">
            Create New Order
          </div>
          <button
            type="button"
            className="close"
            id="closeModal"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* ── Step 1: Customer Lookup Panel ── */}
        {view === 'LOOKUP' && (
          <CustomerSearchPanel
            onSelect={handleSelectCustomer}
            onNewCustomer={handleNewCustomer}
          />
        )}

        {/* ── Step 2: Customer / Order Form ── */}
        {view === 'FORM' && (
          <CustomerForm
            initialCustomer={selectedCustomer}
            initialOrderType="walk-in"
            onBack={handleBackToLookup}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </section>
    </div>
  );
}
