// src/components/ScheduleDeliveryModal.jsx
// Modal Dialog for Scheduling Pickup or Delivery

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function ScheduleDeliveryModal({ order, isOpen, onClose, onConfirmSchedule }) {
  const { t } = useLanguage();
  const [scheduleType, setScheduleType] = useState('Pickup'); // 'Pickup' | 'Delivery'
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleSlot, setScheduleSlot] = useState('Morning (09:00 AM - 12:00 PM)');

  if (!isOpen || !order) return null;

  const orderNum = order.order_number || order.order_id || 'ORDER';
  const custName = order.customer_name || order.customer?.customer_name || 'Customer';
  const custPhone = order.mobile_number || order.customer?.mobile_number || '';

  const handleConfirm = () => {
    onConfirmSchedule?.({
      order,
      scheduleType,
      scheduleDate,
      scheduleSlot,
    });
    onClose();
  };

  return (
    <div className="pos-held-modal-backdrop" onClick={onClose}>
      <div
        className="pos-dialog-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-dialog-header">
          <div className="pos-dialog-title">
            <span style={{ fontSize: '18px' }}>📅</span>
            <span>{t('modal_schedule_title', 'Schedule Pickup / Delivery')}</span>
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

        <div className="pos-dialog-order-card">
          <div className="pos-dialog-order-num">
            {orderNum}
          </div>
          <div className="pos-dialog-order-cust">
            {custName} {custPhone ? `• ${custPhone}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="pos-dialog-label">
              SCHEDULE TYPE
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Pickup', 'Delivery'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScheduleType(type)}
                  className={`pos-dialog-type-btn ${scheduleType === type ? 'active' : ''}`}
                >
                  {type === 'Pickup' ? '📦 Pickup' : '🚚 Delivery'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="pos-dialog-label">
              SCHEDULED DATE
            </label>
            <input
              type="date"
              value={scheduleDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="pos-dialog-input"
            />
          </div>

          <div>
            <label className="pos-dialog-label">
              TIME SLOT
            </label>
            <select
              value={scheduleSlot}
              onChange={(e) => setScheduleSlot(e.target.value)}
              className="pos-dialog-select"
            >
              <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
              <option value="Afternoon (01:00 PM - 04:00 PM)">Afternoon (01:00 PM - 04:00 PM)</option>
              <option value="Evening (04:00 PM - 07:00 PM)">Evening (04:00 PM - 07:00 PM)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="pos-dialog-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pos-dialog-confirm-btn"
              onClick={handleConfirm}
            >
              {t('btn_confirm_schedule', 'Confirm Schedule')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
