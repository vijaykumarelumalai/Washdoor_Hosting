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
        className="pos-dialog-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-dialog-header">
          <div className="pos-dialog-title">
            <span style={{ fontSize: '18px' }}>👤</span>
            <span>{t('modal_assign_driver_title', 'Assign Driver & Route')}</span>
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
            Customer: {custName}
          </div>
          <div className="pos-dialog-order-addr">
            📍 {address}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="pos-dialog-label">
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
                    className={`pos-driver-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div>
                      <div className="pos-driver-name">{drv.name}</div>
                      <div className="pos-driver-meta">{drv.vehicle} • {drv.zone}</div>
                    </div>
                    {isSelected && <span className="pos-driver-check">✓</span>}
                  </div>
                );
              })}
            </div>
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
              Assign &amp; Dispatch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
