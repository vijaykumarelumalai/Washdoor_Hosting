// src/components/CreateOrderModal.jsx
// Modal Dialog matching washdoor_create_order_updated.html

import React, { useState, useEffect } from 'react';
import CustomerSearchPanel from './CustomerSearchPanel';
import CustomerForm from './CustomerForm';
import { createOrderWithCustomer, getNextOrderId, getNextCustomerId } from '../services/customerService';
import { friendlySupabaseError } from '../utils/validation';

export default function CreateOrderModal({ isOpen, onClose, onOrderSuccess, showToast }) {
  // Current view: 'LOOKUP' or 'FORM'
  const [view, setView] = useState('LOOKUP');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextOrderNumber, setNextOrderNumber] = useState('ORDER-00001');
  const [nextCustomerId, setNextCustomerId] = useState('CUST-00001');

  useEffect(() => {
    if (isOpen) {
      setView('LOOKUP');
      setSelectedCustomer(null);
      setIsSubmitting(false);
      getNextOrderId().then((num) => {
        if (num) setNextOrderNumber(num);
      });
      getNextCustomerId().then((id) => {
        if (id) setNextCustomerId(id);
      });
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

  const handleNewCustomer = (prefillData = null) => {
    setSelectedCustomer(prefillData && typeof prefillData === 'object' ? prefillData : null);
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
    cartItems = [],
    totalAmount = 0.00,
    itemCount = 1,
    existingCustomerId,
  }) => {
    setIsSubmitting(true);

    const { data, error } = await createOrderWithCustomer({
      existingCustomerId,
      customerData: {
        ...customerData,
        item_count: itemCount,
        total_amount: totalAmount,
      },
      orderType,
      orderPreference,
      orderPreferenceNotes,
      totalAmount: totalAmount,
      items: cartItems,
    });

    setIsSubmitting(false);

    if (error) {
      showToast(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }

    const orderNumber = data?.order_number || (data?.order_id ? `ORDER-${data.order_id}` : 'ORDER-00001');
    showToast(`✅ Order ${orderNumber} created successfully!`);
    
    // Pass newly created order so Order Status Dialog opens automatically
    const createdOrderPayload = {
      id: orderNumber,
      order_id: data?.order_id || orderNumber,
      order_number: orderNumber,
      order_type: orderType || 'walk-in',
      preference: orderPreference || 'Standard',
      preference_notes: orderPreferenceNotes || '',
      status: 'Order in Progress',
      progress: 25,
      total_amount: Number(totalAmount) || 0.00,
      item_count: itemCount,
      items: cartItems,
      customer_history: {
        items: cartItems,
      },
      tax_exemption: Boolean(customerData?.tax_exemption),
      customer: {
        customer_name: customerData?.customer_name || 'Walk-In Customer',
        mobile_number: customerData?.mobile_number || '',
        tax_exemption: Boolean(customerData?.tax_exemption),
        address: customerData?.address || '',
      },
      customer_name: customerData?.customer_name || 'Walk-In Customer',
      mobile_number: customerData?.mobile_number || '',
    };

    onOrderSuccess(createdOrderPayload);
    onClose();
  };

  const activeCustomerId = (selectedCustomer && (selectedCustomer.customerId || selectedCustomer.customer_code || selectedCustomer.id))
    ? (selectedCustomer.customerId || selectedCustomer.customer_code || selectedCustomer.id)
    : nextCustomerId;

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div className="modal-title" id="modalTitle">
              <span>Create New Customer &amp; Order</span>
            </div>
            {view === 'FORM' && activeCustomerId && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="cust-id-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                  {activeCustomerId}
                </span>
              </div>
            )}
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
            orderNumber={nextOrderNumber}
            customerId={activeCustomerId}
            isOrderFlow={true}
            isEditOrder={false}
            onBack={handleBackToLookup}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </section>
    </div>
  );
}
