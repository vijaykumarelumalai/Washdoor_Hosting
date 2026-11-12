// src/components/StaffMasterManager.jsx
// UI management panel for Staff Master & Pickup/Delivery Person Master (Settings -> Staff & Delivery Master)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchAllStaffMaster,
  saveStaffMasterRecord,
  fetchAllPickupDeliveryMaster,
  savePickupDeliveryMasterRecord,
  toggleMasterPersonStatus,
} from '../services/customerService';

function getNextCode(records, prefix) {
  let maxNum = 0;
  for (const r of records || []) {
    const match = String(r.uniqueId || '').match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

export default function StaffMasterManager({ showToast }) {
  const [masterType, setMasterType] = useState('staff'); // 'staff' | 'pickup'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [uniqueId, setUniqueId] = useState('');
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [extraField, setExtraField] = useState('');
  const [status, setStatus] = useState('Active');

  const isPickup = masterType === 'pickup';
  const idPrefix = isPickup ? 'PUD' : 'STF';

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = isPickup
      ? await fetchAllPickupDeliveryMaster()
      : await fetchAllStaffMaster();
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setRecords([]);
      return;
    }
    const list = res.data || [];
    setRecords(list);
    if (!editingId) {
      setUniqueId(getNextCode(list, idPrefix));
    }
  }, [isPickup, idPrefix, editingId]);

  useEffect(() => {
    setEditingId(null);
    setName('');
    setZone('');
    setCity('');
    setPhone('');
    setExtraField(isPickup ? '' : 'Counter Staff');
    setStatus('Active');
    setSearchTerm('');
  }, [masterType, isPickup]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const resetForm = (nextList = records) => {
    setEditingId(null);
    setUniqueId(getNextCode(nextList, idPrefix));
    setName('');
    setZone('');
    setCity('');
    setPhone('');
    setExtraField(isPickup ? '' : 'Counter Staff');
    setStatus('Active');
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setUniqueId(rec.uniqueId || '');
    setName(rec.name || '');
    setZone(rec.zone || '');
    setCity(rec.city || '');
    setPhone(rec.phone || '');
    setExtraField(isPickup ? (rec.vehicleInfo || '') : (rec.role || 'Counter Staff'));
    setStatus(rec.status || 'Active');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uniqueId.trim() || !name.trim() || !zone.trim()) {
      showToast?.(`⚠️ Please enter ${isPickup ? 'Employee ID' : 'Staff ID'}, Name, and Zone.`);
      return;
    }

    setSaving(true);
    const payload = {
      id: editingId || undefined,
      uniqueId: uniqueId.trim().toUpperCase(),
      name: name.trim(),
      zone: zone.trim(),
      city: city.trim(),
      phone: phone.trim(),
      status,
      ...(isPickup ? { vehicleInfo: extraField.trim() } : { role: extraField.trim() || 'Counter Staff' }),
    };

    const res = isPickup
      ? await savePickupDeliveryMasterRecord(payload)
      : await saveStaffMasterRecord(payload);
    setSaving(false);

    if (res.error) {
      showToast?.(`⚠️ ${res.error}`);
      return;
    }

    showToast?.(
      editingId
        ? `✅ Updated ${payload.name} (${payload.uniqueId})`
        : `✅ Added ${payload.name} (${payload.uniqueId}) to ${isPickup ? 'Pickup & Delivery Master' : 'Staff Master'}`
    );

    const refreshed = isPickup
      ? await fetchAllPickupDeliveryMaster()
      : await fetchAllStaffMaster();
    const nextList = refreshed.data || [];
    setRecords(nextList);
    resetForm(nextList);
  };

  const handleToggleStatus = async (rec) => {
    const res = await toggleMasterPersonStatus(masterType, rec.id, rec.status);
    if (res.error) {
      showToast?.(`⚠️ ${res.error}`);
      return;
    }
    const nextStatus = rec.status === 'Active' ? 'Inactive' : 'Active';
    setRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: nextStatus } : r)));
    showToast?.(`✅ ${rec.name} (${rec.uniqueId}) marked ${nextStatus}`);
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.uniqueId || '').toLowerCase().includes(q) ||
        String(r.zone || '').toLowerCase().includes(q)
    );
  }, [records, searchTerm]);

  return (
    <div className="settings-card-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="settings-section-title">Staff &amp; Pickup/Delivery Master</h2>
          <p className="settings-section-subtitle" style={{ marginBottom: '12px' }}>
            Create and manage active staff and pickup/delivery employees shown in the Create Order modal dropdowns.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Master type"
          style={{
            display: 'inline-flex',
            background: 'rgba(148, 163, 184, 0.14)',
            padding: '4px',
            borderRadius: '10px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={masterType === 'staff'}
            onClick={() => setMasterType('staff')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 650,
              cursor: 'pointer',
              background: masterType === 'staff' ? '#2563eb' : 'transparent',
              color: masterType === 'staff' ? '#ffffff' : 'inherit',
            }}
          >
            👤 Staff Master (STF)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={masterType === 'pickup'}
            onClick={() => setMasterType('pickup')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 650,
              cursor: 'pointer',
              background: masterType === 'pickup' ? '#2563eb' : 'transparent',
              color: masterType === 'pickup' ? '#ffffff' : 'inherit',
            }}
          >
            🚚 Pickup &amp; Delivery Master (PUD)
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: '12px',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.28)',
          background: 'rgba(37, 99, 235, 0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong style={{ fontSize: '14px' }}>
            {editingId
              ? `Edit ${isPickup ? 'Pickup & Delivery Person' : 'Staff Member'}`
              : `Add New ${isPickup ? 'Pickup & Delivery Person' : 'Staff Member'}`}
          </strong>
          {editingId && (
            <button
              type="button"
              onClick={() => resetForm()}
              style={{
                border: '1px solid #cbd5e1',
                background: 'transparent',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
          }}
        >
          <div className="form-field">
            <label className="form-label">{isPickup ? 'Employee ID *' : 'Staff ID *'}</label>
            <input
              type="text"
              className="form-control"
              placeholder={isPickup ? 'e.g. PUD003' : 'e.g. STF004'}
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">{isPickup ? 'Employee Name *' : 'Staff Name *'}</label>
            <input
              type="text"
              className="form-control"
              placeholder={isPickup ? 'e.g. Manikandan' : 'e.g. Ravi Kumar'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Zone *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Zone A"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">City (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chennai"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Phone (Optional)</label>
            <input
              type="tel"
              className="form-control"
              placeholder="10-digit mobile"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">{isPickup ? 'Vehicle Info (Optional)' : 'Role'}</label>
            <input
              type="text"
              className="form-control"
              placeholder={isPickup ? 'e.g. Bike TN-01' : 'Counter Staff'}
              value={extraField}
              onChange={(e) => setExtraField(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
            type="submit"
            className="settings-save-btn"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : editingId
              ? 'Update Record'
              : `+ Save ${isPickup ? 'Pickup Person' : 'Staff Member'}`}
          </button>
        </div>
      </form>

      {/* Existing Records List */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '14px' }}>
            {isPickup ? 'Pickup & Delivery Master Records' : 'Staff Master Records'} ({filteredRecords.length})
          </strong>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              style={{ width: '220px' }}
              placeholder="Search by name, ID, or zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className="settings-refresh-btn"
              onClick={loadRecords}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px' }}>
            ⚠️ {error} — Make sure you ran <code>supabase/staff_and_pickup_master.sql</code> in Supabase SQL Editor.
          </div>
        ) : loading ? (
          <div style={{ padding: '18px', textAlign: 'center', fontSize: '13px', opacity: 0.75 }}>
            Loading records from database...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', fontSize: '13px', opacity: 0.75 }}>
            No records found. Use the form above to add one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(148, 163, 184, 0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>{isPickup ? 'Employee ID' : 'Staff ID'}</th>
                  <th style={{ padding: '10px 12px' }}>Name</th>
                  <th style={{ padding: '10px 12px' }}>Zone</th>
                  <th style={{ padding: '10px 12px' }}>{isPickup ? 'Vehicle / City' : 'Role / City'}</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const isActive = rec.status === 'Active';
                  const meta = [isPickup ? rec.vehicleInfo : rec.role, rec.city].filter(Boolean).join(' • ') || '—';
                  return (
                    <tr key={rec.id || rec.uniqueId} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{rec.uniqueId}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{rec.name}</td>
                      <td style={{ padding: '10px 12px' }}>{rec.zone}</td>
                      <td style={{ padding: '10px 12px', opacity: 0.8 }}>{meta}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 9px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: isActive ? 'rgba(22, 163, 74, 0.14)' : 'rgba(148, 163, 184, 0.2)',
                            color: isActive ? '#16a34a' : '#64748b',
                          }}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(rec)}
                          style={{
                            border: '1px solid rgba(148, 163, 184, 0.35)',
                            background: 'transparent',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            marginRight: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(rec)}
                          style={{
                            border: '1px solid rgba(37, 99, 235, 0.35)',
                            background: 'rgba(37, 99, 235, 0.08)',
                            color: '#2563eb',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isActive ? 'Set Inactive' : 'Set Active'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
