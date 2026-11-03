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
        className="pos-held-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '22px', background: '#0b172a', border: '1px solid #1e3a5f', borderRadius: '16px', color: '#f1f5f9' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 750, fontSize: '15px', color: '#f8fafc' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <span>{t('modal_schedule_title', 'Schedule Pickup / Delivery')}</span>
          </div>
          <button
            type="button"
            className="pos-cart-del-btn"
            onClick={onClose}
            style={{ fontSize: '16px', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        <div style={{ background: '#030b15', padding: '10px 14px', borderRadius: '8px', border: '1px solid #17253d', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
            {orderNum}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
            {custName} {custPhone ? `• ${custPhone}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '6px' }}>
              SCHEDULE TYPE
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Pickup', 'Delivery'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScheduleType(type)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: scheduleType === type ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                    background: scheduleType === type ? '#1d4ed8' : '#0f172a',
                    color: '#fff',
                    fontWeight: 650,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {type === 'Pickup' ? '📦 Pickup' : '🚚 Delivery'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '6px' }}>
              SCHEDULED DATE
            </label>
            <input
              type="date"
              value={scheduleDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                background: '#040b17',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '6px' }}>
              TIME SLOT
            </label>
            <select
              value={scheduleSlot}
              onChange={(e) => setScheduleSlot(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                background: '#040b17',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            >
              <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
              <option value="Afternoon (01:00 PM - 04:00 PM)">Afternoon (01:00 PM - 04:00 PM)</option>
              <option value="Evening (04:00 PM - 07:00 PM)">Evening (04:00 PM - 07:00 PM)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t('btn_confirm_schedule', 'Confirm Schedule')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
