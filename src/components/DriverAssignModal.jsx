// src/components/DriverAssignModal.jsx
// Modal Dialog for Assigning Driver & Route to Orders

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_FLEET = [
  { name: 'Ramesh Kumar', vehicle: 'Van #1 • Zone 1', zone: 'Katpadi & Vellore North' },
  { name: 'Vignesh S', vehicle: 'Bike #3 • Express', zone: 'Sathuvachari & City Central' },
  { name: 'Murugan P', vehicle: 'Van #2 • Zone 2', zone: 'Ranipet & Arcot Road' },
  { name: 'Suresh K', vehicle: 'Van #4 • Zone 3', zone: 'Officers Line & Gandhi Road' },
];

export default function DriverAssignModal({ order, isOpen, onClose, onAssignDriver }) {
  const { t } = useLanguage();
  const [selectedDriver, setSelectedDriver] = useState(
    order?.assigned_driver_full || `${DEFAULT_FLEET[0].name} (${DEFAULT_FLEET[0].vehicle})`
  );

  if (!isOpen || !order) return null;

  const orderNum = order.order_number || order.order_id || 'ORDER';
  const custName = order.customer_name || order.customer?.customer_name || 'Customer';
  const address = order.address || order.delivery_address || 'Katpadi, Vellore';

  const handleConfirm = () => {
    onAssignDriver?.({
      order,
      selectedDriver,
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
            <span style={{ fontSize: '18px' }}>👤</span>
            <span>{t('modal_assign_driver_title', 'Assign Driver & Route')}</span>
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
            Customer: {custName}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
            📍 {address}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '8px' }}>
              AVAILABLE DRIVERS &amp; FLEET
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEFAULT_FLEET.map((drv) => {
                const val = `${drv.name} (${drv.vehicle})`;
                const isSelected = selectedDriver.includes(drv.name);
                return (
                  <div
                    key={drv.name}
                    onClick={() => setSelectedDriver(val)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                      background: isSelected ? '#1e293b' : '#040b17',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 650, fontSize: '13px', color: '#f8fafc' }}>{drv.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{drv.vehicle} • {drv.zone}</div>
                    </div>
                    {isSelected && <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>}
                  </div>
                );
              })}
            </div>
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
              Assign &amp; Dispatch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
