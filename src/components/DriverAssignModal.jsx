// src/components/DriverAssignModal.jsx
// Modal Dialog for Assigning Live Active Pickup & Delivery Person to Orders

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchActivePickupDeliveryMaster } from '../services/customerService';

export default function DriverAssignModal({ order, isOpen, onClose, onAssignDriver }) {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');

  const loadActiveDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchActivePickupDeliveryMaster();
    setLoading(false);
    if (fetchErr) {
      setError(fetchErr);
      setDrivers([]);
      return;
    }
    const activeList = data || [];
    setDrivers(activeList);

    if (order) {
      const existingId = order.assigned_pickup_person_id || '';
      const existingName = String(order.assigned_pickup_delivery_person || order.assigned_driver || '').trim().toLowerCase();
      const matched = activeList.find(
        (d) =>
          (existingId && String(d.uniqueId) === String(existingId)) ||
          (existingName && String(d.name).toLowerCase() === existingName)
      );
      setSelectedId(matched ? matched.uniqueId : (activeList[0]?.uniqueId || ''));
    }
  }, [order]);

  useEffect(() => {
    if (isOpen) {
      loadActiveDrivers();
    }
  }, [isOpen, loadActiveDrivers]);

  if (!isOpen || !order) return null;

  const orderNum = order.order_number || order.order_id || 'ORDER';
  const custName = order.customer_name || order.customer?.customer_name || 'Customer';
  const address = order.address || order.delivery_address || 'Counter Walk-In';

  const selectedRecord = drivers.find((d) => String(d.uniqueId) === String(selectedId)) || null;

  const handleConfirm = () => {
    if (!selectedRecord) return;
    const metaParts = [selectedRecord.uniqueId, selectedRecord.zone, selectedRecord.vehicleInfo].filter(Boolean);
    const formattedFull = `${selectedRecord.name} (${metaParts.join(' • ')})`;
    onAssignDriver?.({
      order,
      selectedDriver: formattedFull,
      selectedDriverRecord: selectedRecord,
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
              ACTIVE PICKUP &amp; DELIVERY PERSONNEL
            </label>

            {loading ? (
              <div style={{ padding: '18px 12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                Loading active pickup &amp; delivery personnel...
              </div>
            ) : error ? (
              <div style={{ padding: '14px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span>⚠️ {error}</span>
                <button
                  type="button"
                  onClick={loadActiveDrivers}
                  style={{ border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
            ) : drivers.length === 0 ? (
              <div style={{ padding: '16px 12px', borderRadius: '8px', background: 'rgba(148, 163, 184, 0.1)', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                No active pickup &amp; delivery personnel found. Add active records in Settings → Staff &amp; Delivery Master.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {drivers.map((drv) => {
                  const isSelected = String(selectedId) === String(drv.uniqueId);
                  const meta = [drv.uniqueId, drv.zone, drv.vehicleInfo, drv.city].filter(Boolean).join(' • ');
                  return (
                    <div
                      key={drv.uniqueId}
                      onClick={() => setSelectedId(drv.uniqueId)}
                      className={`pos-driver-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div>
                        <div className="pos-driver-name">{drv.name} ({drv.uniqueId})</div>
                        <div className="pos-driver-meta">{meta}</div>
                      </div>
                      {isSelected && <span className="pos-driver-check">✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
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
              disabled={loading || !selectedRecord}
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
