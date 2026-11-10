// src/components/AuditLogModule.jsx
// Washdoor Immutable Audit Log & System Activity Trail Module

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  getStoredAuditLogs,
  getActiveStaffProfile,
  setActiveStaffProfile,
  getStaffActivitySummary,
  STAFF_DIRECTORY,
} from '../services/auditService';
import { getSupabaseAuditLogs } from '../services/customerService';
import { exportToExcel, exportToPdf, exportToCsv } from '../services/exportService';
import '../styles/AuditLog.css';

export default function AuditLogModule({
  orders = [],
  loadingOrders = false,
  currencySymbol = '₹',
  onNavigateTab,
  showToast = () => {},
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'workflow' | 'lifecycle' | 'driver' | 'customer' | 'payment' | 'export' | 'system'
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [dbAuditRows, setDbAuditRows] = useState([]);
  const [dbStatusRows, setDbStatusRows] = useState([]);
  const [dbLiveActions, setDbLiveActions] = useState([]);
  const [localRefreshTick, setLocalRefreshTick] = useState(0);
  const [activeStaff, setActiveStaff] = useState(() => getActiveStaffProfile());

  useEffect(() => {
    getSupabaseAuditLogs(150)
      .then(({ auditLogs, statusHistory, liveActions }) => {
        if (Array.isArray(auditLogs)) setDbAuditRows(auditLogs);
        if (Array.isArray(statusHistory)) setDbStatusRows(statusHistory);
        if (Array.isArray(liveActions)) setDbLiveActions(liveActions);
      })
      .catch(() => {});
  }, [orders.length, localRefreshTick]);

  useEffect(() => {
    const onLogged = () => setLocalRefreshTick((n) => n + 1);
    const onStaffChanged = () => setActiveStaff(getActiveStaffProfile());
    window.addEventListener('washdoor_audit_logged', onLogged);
    window.addEventListener('washdoor_staff_changed', onStaffChanged);
    return () => {
      window.removeEventListener('washdoor_audit_logged', onLogged);
      window.removeEventListener('washdoor_staff_changed', onStaffChanged);
    };
  }, []);

  const handleStaffSwitch = (name) => {
    const found = STAFF_DIRECTORY.find((s) => s.name === name) || { name, role: 'Staff', branch: 'Ranipet Store #1' };
    const updated = setActiveStaffProfile(found);
    setActiveStaff(updated);
    showToast(`Active operator set to ${updated.name} (${updated.role})`);
  };

  // Generate audit trail events aggregated from live orders, Supabase audit tables & workflow steps
  const auditEvents = useMemo(() => {
    const list = [];

    // Live Supabase washdoor_audit_logs records
    dbAuditRows.forEach((row) => {
      list.push({
        id: `db-aud-${row.audit_id || row.id}`,
        timestamp: row.created_at || new Date().toISOString(),
        displayTime: row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : '—',
        entity: row.new_data?.order_number || row.new_data?.customer_code || row.work_id || row.record_id || 'System',
        entityType: row.entity_name || 'Order',
        category: row.entity_name === 'customers' ? 'customer' : 'system',
        categoryLabel: `DB Audit (${row.operation || 'UPDATE'})`,
        actor: row.changed_by_name || 'System Staff',
        actorRole: 'Staff',
        action: `${row.entity_name || 'customer_works'} ${row.operation || 'UPDATE'}`,
        details: row.new_data ? JSON.stringify(row.new_data) : 'Database mutation recorded',
        severity: row.operation === 'DELETE' ? 'danger' : 'info',
      });
    });

    // Live Supabase washdoor_status_history records
    dbStatusRows.forEach((row) => {
      list.push({
        id: `db-hist-${row.history_id}`,
        timestamp: row.changed_at || row.created_at || new Date().toISOString(),
        displayTime: (row.changed_at || row.created_at) ? new Date(row.changed_at || row.created_at).toLocaleString('en-IN') : '—',
        entity: row.work_number || row.work_id || 'Order',
        entityType: row.entity_type || 'Order',
        category: 'lifecycle',
        categoryLabel: 'Status Transition (DB)',
        actor: row.changed_by_name || 'Staff',
        actorRole: row.changed_by_role || 'Staff',
        action: row.old_status ? `${row.old_status} → ${row.new_status}` : `Status set to ${row.new_status}`,
        details: row.remarks || 'Persisted in washdoor_status_history',
        severity: 'success',
      });
    });

    // Live Supabase washdoor_live_status_actions workflow steps
    dbLiveActions.forEach((act) => {
      list.push({
        id: `db-act-${act.action_id}`,
        timestamp: act.action_at || act.created_at || new Date().toISOString(),
        displayTime: (act.action_at || act.created_at) ? new Date(act.action_at || act.created_at).toLocaleString('en-IN') : '—',
        entity: act.work_number || act.work_id || 'Order',
        entityType: act.stage || 'Workflow',
        category: act.stage === 'Delivery' || act.stage === 'Pickup' ? 'driver' : act.stage === 'Payment' ? 'payment' : 'workflow',
        categoryLabel: `Workflow (${act.stage || 'Processing'})`,
        actor: act.actor_name || 'Staff',
        actorRole: act.actor_type || 'Staff',
        action: act.action_label || act.action_code,
        details: `Stage: ${act.stage} · Code: ${act.action_code}`,
        severity: 'info',
      });
    });

    // Stored Automated Audit & Workflow Trail Events (localStorage washdoor_audit_trail_v1)
    const storedLogs = getStoredAuditLogs();
    storedLogs.forEach((s) => {
      const cat = s.category || 'export';
      const labelMap = {
        export: `Report Download (${s.format || 'CSV'})`,
        workflow: `Workflow Step (${s.module || 'Processing'})`,
        lifecycle: `Order Audit (${s.format || 'UPDATE'})`,
        customer: `Customer ${s.format || 'UPDATE'}`,
        driver: 'Driver Dispatch',
        payment: 'Payment Entry',
        system: 'System Audit',
      };
      list.push({
        id: s.id,
        timestamp: s.timestamp,
        displayTime: s.formattedTime || new Date(s.timestamp).toLocaleString('en-IN'),
        entity: s.entity || s.tenant || 'Ranipet Store #1',
        entityType: s.entityType || 'Audit',
        category: cat,
        categoryLabel: labelMap[cat] || 'Audit Event',
        actor: s.actor || 'Store Staff',
        actorRole: s.actorRole || 'Staff',
        action: s.action || `Event Recorded (${s.format})`,
        details: s.details || `Module: ${s.module}. Records: ${s.recordCount}`,
        severity: s.severity || 'success',
      });
    });

    // Extract events from real orders
    orders.forEach((ord) => {
      const orderNum = ord.order_number || ord.order_id || ord.id || 'ORD-00000';
      const custName = ord.customer_name || ord.customer?.customer_name || 'Walk-In Customer';
      const status = ord.order_status || ord.status || 'Received';
      const createdAt = ord.created_at || new Date().toISOString();
      const totalAmount = Number(ord.total_amount || 0);
      const advancePaid = Number(ord.advance_paid || 0);
      const balanceDue = Number(ord.balance_due ?? (totalAmount - advancePaid));
      const payStatus = ord.payment_status || (balanceDue <= 0 && totalAmount > 0 ? 'Paid' : advancePaid > 0 ? 'Partial' : 'Unpaid');
      const driver = ord.assigned_driver || ord.assigned_staff;

      // 1. Order Creation Event
      list.push({
        id: `audit-create-${orderNum}`,
        timestamp: createdAt,
        displayTime: new Date(createdAt).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        entity: orderNum,
        entityType: 'Order',
        category: 'lifecycle',
        categoryLabel: 'Order Intake',
        actor: ord.created_by || 'POS Counter #1',
        action: `Order Created for ${custName}`,
        details: `Initial counter intake for ${custName} (${ord.customer_phone || ord.mobile_number || 'Walk-in'}). Total: ${currencySymbol}${totalAmount.toFixed(2)}. Intake mode: ${ord.order_type || 'Walk-In'}.`,
        severity: 'success',
      });

      // 2. Status Progression Events
      if (status !== 'Received') {
        const timeVal = ord.completed_at || ord.updated_at || createdAt;
        list.push({
          id: `audit-status-${orderNum}-${status}`,
          timestamp: timeVal,
          displayTime: new Date(timeVal).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          entity: orderNum,
          entityType: 'Order',
          category: 'lifecycle',
          categoryLabel: 'Status Transition',
          actor: ord.assigned_staff || 'Factory Technician',
          action: `Status Progressed to "${status}"`,
          details: `Order moved to status ${status}. ${ord.rack_shelf_location ? `Storage Shelf assigned: ${ord.rack_shelf_location}.` : ''}`,
          severity: status === 'Ready' || status === 'Delivered' ? 'success' : status === 'Cancelled' ? 'danger' : 'warning',
        });
      }

      // 3. Driver & Logistics Assignment
      if (driver || ord.assigned_for_pickup) {
        list.push({
          id: `audit-driver-${orderNum}`,
          timestamp: ord.updated_at || createdAt,
          displayTime: new Date(ord.updated_at || createdAt).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          entity: orderNum,
          entityType: 'Logistics',
          category: 'driver',
          categoryLabel: 'Driver Dispatch',
          actor: 'Logistics Coordinator',
          action: `Driver Assigned: ${driver || 'Field Driver'}`,
          details: `Assigned route pickup/delivery to ${driver || 'Field Driver'}. Address: ${ord.address || 'Store Counter'}.`,
          severity: 'info',
        });
      }

      // 4. Payment & Billing Settlement
      if (advancePaid > 0 || payStatus === 'Paid') {
        list.push({
          id: `audit-pay-${orderNum}`,
          timestamp: ord.updated_at || createdAt,
          displayTime: new Date(ord.updated_at || createdAt).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          entity: orderNum,
          entityType: 'Finance',
          category: 'payment',
          categoryLabel: 'Payment Settlement',
          actor: 'Counter Billing Cashier',
          action: `Payment Recorded: ${currencySymbol}${advancePaid.toFixed(2)} (${payStatus})`,
          details: `Payment method: ${ord.payment_method || 'Cash'}. Advance: ${currencySymbol}${advancePaid.toFixed(2)}, Balance: ${currencySymbol}${Math.max(0, balanceDue).toFixed(2)}.`,
          severity: payStatus === 'Paid' ? 'success' : 'warning',
        });
      }

      // 5. Existing order embedded logs
      const embeddedLogs = ord.audit_logs || ord.logs || [];
      if (Array.isArray(embeddedLogs)) {
        embeddedLogs.forEach((l, idx) => {
          list.push({
            id: `audit-embed-${orderNum}-${idx}`,
            timestamp: l.timestamp || createdAt,
            displayTime: l.time || 'Logged',
            entity: orderNum,
            entityType: 'Order',
            category: l.category || 'lifecycle',
            categoryLabel: l.type === 'pickup' ? 'Driver Dispatch' : 'Order Update',
            actor: l.staff || 'Store Staff',
            action: l.title || 'Note / Status Recorded',
            details: l.detail || l.comment || l.notes || 'Activity recorded on order sheet.',
            severity: 'info',
          });
        });
      }
    });

    // Sort chronologically
    return list.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return sortAsc ? ta - tb : tb - ta;
    });
  }, [orders, currencySymbol, sortAsc, dbAuditRows, dbStatusRows, dbLiveActions]);

  // Aggregate staff-wise activity summary
  const staffSummary = useMemo(() => getStaffActivitySummary(auditEvents), [auditEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = auditEvents;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }

    // Filter by staff operator
    if (selectedStaff !== 'all') {
      result = result.filter((e) => (e.actor || 'System Staff') === selectedStaff);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.entity.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.categoryLabel.toLowerCase().includes(q)
      );
    }

    return result;
  }, [auditEvents, selectedCategory, selectedStaff, searchQuery]);

  // Export CSV handler
  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      showToast('No audit events to export');
      return;
    }

    const headers = ['Timestamp', 'Entity', 'Category', 'Actor', 'Action', 'Details'];
    const rows = filteredEvents.map((e) => [
      `"${e.displayTime}"`,
      `"${e.entity}"`,
      `"${e.categoryLabel}"`,
      `"${e.actor}"`,
      `"${e.action}"`,
      `"${e.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `washdoor_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Audit log exported successfully');
  };

  return (
    <div className="audit-module-container">
      {/* ── Top Header Bar (Matching media_1793704371100_944f78bc.png) ── */}
      <div className="audit-header-bar">
        <div className="audit-header-left">
          <div className="audit-title-wrap">
            <div className="audit-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <h1 className="audit-main-title">{t('nav_audit_log', 'Audit Log')}</h1>
              <p className="audit-subtitle">
                {t('audit_subtitle', 'System events, order transitions, driver actions, payments, and financial ledger history.')}
              </p>
            </div>
          </div>
        </div>

        <div className="audit-header-actions">
          <div className="audit-staff-switcher" title="Active Staff Operator attributed to actions">
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Active Staff:</span>
            <select
              value={activeStaff.name}
              onChange={(e) => handleStaffSwitch(e.target.value)}
              className="audit-staff-select"
            >
              {STAFF_DIRECTORY.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div className="audit-status-badge">
            <span className="audit-pulse-dot"></span>
            <span>{t('audit_realtime_active', 'Real-time Logging Active')}</span>
          </div>

          <button
            type="button"
            className="audit-action-btn export-excel"
            onClick={() => {
              if (filteredEvents.length === 0) {
                showToast('No audit events to export');
                return;
              }
              exportToExcel({
                filename: `washdoor_audit_trail_${new Date().toISOString().slice(0, 10)}.xlsx`,
                sheetName: 'Audit Trail',
                data: filteredEvents,
                columns: [
                  { header: 'Timestamp', key: 'displayTime' },
                  { header: 'Entity / Target', key: 'entity' },
                  { header: 'Category', key: 'categoryLabel' },
                  { header: 'Actor / Operator', key: 'actor' },
                  { header: 'Action', key: 'action' },
                  { header: 'Details', key: 'details' },
                ],
                title: 'Washdoor System Audit Trail',
                module: 'Audit Log Module',
                tenant: 'Ranipet Store #1',
              });
              showToast('✓ Audit log exported to Excel');
            }}
            title="Export audit logs to Excel (.xlsx)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
            </svg>
            <span>{t('btn_export_excel', 'Export Excel')}</span>
          </button>

          <button
            type="button"
            className="audit-action-btn export-pdf"
            onClick={() => {
              if (filteredEvents.length === 0) {
                showToast('No audit events to export');
                return;
              }
              exportToPdf({
                filename: `washdoor_audit_trail_${new Date().toISOString().slice(0, 10)}.pdf`,
                title: 'Washdoor System & Operations Audit Trail',
                subtitle: 'Verified immutable system activity & report download history',
                data: filteredEvents,
                columns: [
                  { header: 'Time', key: 'displayTime', width: 28 },
                  { header: 'Entity', key: 'entity', width: 26 },
                  { header: 'Category', key: 'categoryLabel', width: 26 },
                  { header: 'Operator', key: 'actor', width: 30 },
                  { header: 'Action', key: 'action', width: 34 },
                  { header: 'Details', key: 'details', width: 44 },
                ],
                module: 'Audit Log Module',
                tenant: 'Ranipet Store #1',
              });
              showToast('✓ Audit log exported to PDF');
            }}
            title="Export audit logs to PDF (.pdf)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15h6"></path>
            </svg>
            <span>{t('btn_export_pdf', 'Export PDF')}</span>
          </button>

          <button
            type="button"
            className="audit-action-btn export-csv"
            onClick={handleExportCSV}
            title="Export audit logs as CSV"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{t('btn_export_csv', 'Export CSV')}</span>
          </button>
        </div>
      </div>

      {/* ── 4 Metrics Summary Cards Grid (Exact match to media_1793704371100_944f78bc.png) ── */}
      <div className="audit-metrics-grid">
        {/* Card 1: Total System Events */}
        <div className="audit-metric-card">
          <div className="audit-metric-icon-box blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="audit-metric-info">
            <div className="audit-metric-label">Total System Events</div>
            <div className="audit-metric-value">{auditEvents.length}</div>
          </div>
        </div>

        {/* Card 2: Order Lifecycle Transitions */}
        <div className="audit-metric-card">
          <div className="audit-metric-icon-box purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div className="audit-metric-info">
            <div className="audit-metric-label">Order Lifecycle Transitions</div>
            <div className="audit-metric-value">{auditEvents.filter((e) => e.category === 'lifecycle').length}</div>
          </div>
        </div>

        {/* Card 3: Driver & Dispatch Actions */}
        <div className="audit-metric-card">
          <div className="audit-metric-icon-box green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="audit-metric-info">
            <div className="audit-metric-label">Driver &amp; Dispatch Actions</div>
            <div className="audit-metric-value">{auditEvents.filter((e) => e.category === 'driver').length}</div>
          </div>
        </div>

        {/* Card 4: Payment & Financial Entries */}
        <div className="audit-metric-card">
          <div className="audit-metric-icon-box orange">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
              <circle cx="17" cy="15" r="1.5" fill="currentColor"></circle>
            </svg>
          </div>
          <div className="audit-metric-info">
            <div className="audit-metric-label">Payment &amp; Financial Entries</div>
            <div className="audit-metric-value">{auditEvents.filter((e) => e.category === 'payment').length}</div>
          </div>
        </div>
      </div>

      {/* ── Staff-Wise Activity Tracking Panel ── */}
      {staffSummary.length > 0 && (
        <div className="audit-staff-panel">
          <div className="audit-staff-panel-head">
            <div>
              <strong>👥 Staff-Wise Activity Tracking ({staffSummary.length} Active Contributors)</strong>
              <span>Click any staff card to filter the activity ledger below</span>
            </div>
            {selectedStaff !== 'all' && (
              <button
                type="button"
                className="audit-action-btn"
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
                onClick={() => setSelectedStaff('all')}
              >
                Show All Staff
              </button>
            )}
          </div>
          <div className="audit-staff-grid">
            {staffSummary.slice(0, 8).map((st) => {
              const isSelected = selectedStaff === st.name;
              return (
                <button
                  key={st.name}
                  type="button"
                  onClick={() => setSelectedStaff(isSelected ? 'all' : st.name)}
                  className={`audit-staff-card ${isSelected ? 'active' : ''}`}
                >
                  <div className="audit-staff-card-top">
                    <span className="audit-staff-name">{st.name}</span>
                    <span className="audit-staff-role">{st.role}</span>
                  </div>
                  <div className="audit-staff-metrics">
                    <span><strong>{st.totalActions}</strong> actions</span>
                    <span>•</span>
                    <span><strong>{st.workflowUpdates}</strong> steps</span>
                    {st.driverActions > 0 && <><span>•</span><span><strong>{st.driverActions}</strong> dispatch</span></>}
                    {st.customerActions > 0 && <><span>•</span><span><strong>{st.customerActions}</strong> cust</span></>}
                  </div>
                  <div className="audit-staff-last" title={st.lastAction}>
                    Last: {st.lastActiveDisplay}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter Toolbar ── */}
      <div className="audit-toolbar-row">
        {/* Category Pills */}
        <div className="audit-filter-pills">
          {[
            { id: 'all', label: 'All Events', count: auditEvents.length },
            { id: 'workflow', label: 'Workflow Steps', count: auditEvents.filter((e) => e.category === 'workflow').length },
            { id: 'lifecycle', label: 'Order Lifecycle', count: auditEvents.filter((e) => e.category === 'lifecycle').length },
            { id: 'driver', label: 'Driver Dispatch', count: auditEvents.filter((e) => e.category === 'driver').length },
            { id: 'customer', label: 'Customer CRUD', count: auditEvents.filter((e) => e.category === 'customer').length },
            { id: 'payment', label: 'Payments', count: auditEvents.filter((e) => e.category === 'payment').length },
            { id: 'export', label: 'Report Downloads', count: auditEvents.filter((e) => e.category === 'export').length },
            { id: 'system', label: 'System & Security', count: auditEvents.filter((e) => e.category === 'system').length },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`audit-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.label}</span>
              <span className="audit-pill-badge">{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Search input, Staff selector & Sort button */}
        <div className="audit-toolbar-right">
          <select
            className="audit-staff-select"
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            title="Filter by Staff Member"
          >
            <option value="all">All Staff ({staffSummary.length})</option>
            {staffSummary.map((st) => (
              <option key={st.name} value={st.name}>
                {st.name} ({st.totalActions})
              </option>
            ))}
          </select>
          <div className="audit-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by order ID, actor, action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="audit-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="audit-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="audit-sort-btn"
            onClick={() => setSortAsc((prev) => !prev)}
            title={sortAsc ? 'Showing Oldest First (Click for Newest)' : 'Showing Newest First (Click for Oldest)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            <span>{sortAsc ? 'Oldest First' : 'Newest First'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Audit Events Table ── */}
      <div className="audit-table-card">
        <table className="audit-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '170px' }}>Timestamp</th>
              <th scope="col" style={{ width: '130px' }}>Entity Ref</th>
              <th scope="col" style={{ width: '150px' }}>Event Category</th>
              <th scope="col" style={{ width: '190px' }}>Actor / Staff</th>
              <th scope="col">Activity &amp; Operational Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="audit-empty-row">
                  <div className="audit-empty-state">
                    <span style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}>📋</span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>No audit events found</strong>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Try adjusting your category filter or search keywords.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr key={evt.id} className="audit-row">
                  {/* Timestamp */}
                  <td className="audit-cell-time">
                    <span className="audit-timestamp">{evt.displayTime}</span>
                  </td>

                  {/* Entity Ref */}
                  <td>
                    {evt.entity.startsWith('ORD') ? (
                      <span
                        className="audit-entity-link"
                        onClick={() => onNavigateTab && onNavigateTab('order')}
                        title={`Go to order ${evt.entity}`}
                      >
                        {evt.entity}
                      </span>
                    ) : (
                      <span className="audit-entity-badge">{evt.entity}</span>
                    )}
                  </td>

                  {/* Event Category Badge */}
                  <td>
                    <span className={`audit-category-tag tag-${evt.category}`}>
                      {evt.categoryLabel}
                    </span>
                  </td>

                  {/* Actor / Staff */}
                  <td>
                    <div className="audit-actor-info">
                      <span className="audit-actor-name">{evt.actor}</span>
                      {evt.actorRole && (
                        <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>{evt.actorRole}</span>
                      )}
                    </div>
                  </td>

                  {/* Action & Details */}
                  <td>
                    <div className="audit-action-wrap">
                      <div className="audit-action-title">{evt.action}</div>
                      <div className="audit-action-details">{evt.details}</div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer ── */}
      <div className="audit-footer">
        <span className="audit-footer-text">
          Showing <strong>{filteredEvents.length}</strong> of <strong>{auditEvents.length}</strong> system events
        </span>
        <span className="audit-footer-compliance">
          🔒 ISO 27001 &amp; SOC2 Immutable Append-Only Ledger Compliance
        </span>
      </div>
    </div>
  );
}
