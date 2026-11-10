// src/services/auditService.js
// Washdoor Immutable Audit Logging Service for Report Downloads & System Operations
// Tracks download timestamp, tenant name, module name, operator, export format, and record metadata

const AUDIT_STORAGE_KEY = 'washdoor_audit_trail_v1';
const STAFF_STORAGE_KEY = 'washdoor_active_staff_v1';
const DEFAULT_TENANT = 'Ranipet Store #1';
const DEFAULT_STAFF = { name: 'Admin Counter #1', role: 'Admin', branch: DEFAULT_TENANT };
const memoryLogs = [];
let memoryStaff = { ...DEFAULT_STAFF };

export const STAFF_DIRECTORY = [
  { name: 'Admin Counter #1', role: 'Admin', branch: 'Ranipet Store #1' },
  { name: 'Karthik (Store Executive)', role: 'Staff', branch: 'Ranipet Store #1' },
  { name: 'Murugan (QC Lead)', role: 'QC_Inspector', branch: 'Main Plant (Unit 1)' },
  { name: 'Selvi (Silk Specialist)', role: 'QC_Inspector', branch: 'Main Plant (Unit 1)' },
  { name: 'Ramesh Kumar (Driver)', role: 'Driver', branch: 'Route 4' },
  { name: 'Suresh Babu (Driver)', role: 'Driver', branch: 'Route 2' },
];

export function getActiveStaffProfile() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STAFF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name) return parsed;
      }
    }
  } catch {}
  return memoryStaff || { ...DEFAULT_STAFF };
}

export function setActiveStaffProfile(profile = {}) {
  const next = {
    name: String(profile.name || DEFAULT_STAFF.name).trim() || DEFAULT_STAFF.name,
    role: profile.role || 'Staff',
    branch: profile.branch || DEFAULT_TENANT,
  };
  memoryStaff = next;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(next));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('washdoor_staff_changed', { detail: next }));
    }
  } catch {}
  return next;
}

/**
 * Retrieves all stored audit events from persistent localStorage
 * @returns {Array} Array of audit event objects
 */
export function getStoredAuditLogs() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {}
  return [...memoryLogs];
}

/**
 * Records an immutable audit log entry with timestamp, entity, category & staff attribution.
 */
export function logAuditEvent({
  action = 'Report Exported',
  module = 'Smart Business Dashboard',
  tenant = DEFAULT_TENANT,
  entity = '',
  entityType = 'System',
  category = 'export',
  format = 'CSV',
  actor = '',
  actorRole = '',
  details = '',
  oldValue = null,
  newValue = null,
  recordCount = 0,
  severity = 'success',
  meta = {},
} = {}) {
  const activeStaff = getActiveStaffProfile();
  const resolvedActor = (actor && String(actor).trim()) ? String(actor).trim() : activeStaff.name;
  const resolvedRole = (actorRole && String(actorRole).trim()) ? String(actorRole).trim() : (activeStaff.role || 'Staff');
  const now = new Date();
  const timestamp = now.toISOString();
  const formattedTime = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const record = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    formattedTime,
    tenant: tenant || DEFAULT_TENANT,
    module: module || 'Smart Business Dashboard',
    entity: entity || tenant || DEFAULT_TENANT,
    entityType: entityType || 'System',
    category: category || 'export',
    action,
    format: String(format || 'SYSTEM').toUpperCase(),
    actor: resolvedActor,
    actorRole: resolvedRole,
    details: details || `Exported ${recordCount} record(s) via ${format}`,
    oldValue,
    newValue,
    recordCount: Number(recordCount) || 0,
    severity,
    meta,
  };

  try {
    const existing = getStoredAuditLogs();
    const updated = [record, ...existing].slice(0, 500);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } else {
      memoryLogs.length = 0;
      memoryLogs.push(...updated);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('washdoor_audit_logged', { detail: record })
      );
    }
  } catch (err) {}

  return record;
}

/**
 * Records a structured workflow step or status update with timestamp & staff details.
 */
export function logWorkflowStep({
  workId = null,
  orderNumber = '',
  stepName = 'Workflow Update',
  stage = 'Processing',
  oldStatus = null,
  newStatus = '',
  staffName = '',
  staffRole = '',
  details = '',
  remarks = '',
  entityType = 'Order',
} = {}) {
  const activeStaff = getActiveStaffProfile();
  const actor = (staffName && String(staffName).trim()) ? String(staffName).trim() : activeStaff.name;
  const actorRole = (staffRole && String(staffRole).trim()) ? String(staffRole).trim() : activeStaff.role;
  const actionLabel = oldStatus && newStatus && oldStatus !== newStatus
    ? `${stepName}: ${oldStatus} → ${newStatus}`
    : `${stepName}${newStatus ? ` (${newStatus})` : ''}`;

  return logAuditEvent({
    action: actionLabel,
    module: `Workflow • ${stage}`,
    entity: orderNumber || workId || 'Order',
    entityType,
    category: stage === 'Delivery' || stage === 'Pickup' ? 'driver' : stage === 'Payment' ? 'payment' : 'workflow',
    format: 'WORKFLOW',
    actor,
    actorRole,
    details: remarks || details || `Workflow step recorded at ${stage} stage by ${actor} (${actorRole}).`,
    oldValue: oldStatus,
    newValue: newStatus,
    severity: String(newStatus).toLowerCase().includes('cancel') ? 'danger' : 'success',
    meta: { workId, orderNumber, stage, oldStatus, newStatus, stepName },
  });
}

/**
 * Aggregates audit & workflow events per staff member for staff-wise activity tracking.
 */
export function getStaffActivitySummary(events = []) {
  const byStaff = {};
  (events || []).forEach((evt) => {
    const staffName = (evt.actor && String(evt.actor).trim()) || 'System Staff';
    if (!byStaff[staffName]) {
      byStaff[staffName] = {
        name: staffName,
        role: evt.actorRole || 'Staff',
        totalActions: 0,
        workflowUpdates: 0,
        orderIntakes: 0,
        driverActions: 0,
        customerActions: 0,
        paymentActions: 0,
        lastActiveTs: 0,
        lastActiveDisplay: '—',
        lastAction: '',
      };
    }
    const row = byStaff[staffName];
    row.totalActions += 1;
    if (evt.actorRole && row.role === 'Staff') row.role = evt.actorRole;

    if (evt.category === 'workflow' || evt.category === 'lifecycle') {
      row.workflowUpdates += 1;
      if (String(evt.action || '').toLowerCase().includes('created') || String(evt.categoryLabel || '').toLowerCase().includes('intake')) {
        row.orderIntakes += 1;
      }
    } else if (evt.category === 'driver') {
      row.driverActions += 1;
    } else if (evt.category === 'customer') {
      row.customerActions += 1;
    } else if (evt.category === 'payment') {
      row.paymentActions += 1;
    }

    const ts = new Date(evt.timestamp).getTime() || 0;
    if (ts >= row.lastActiveTs) {
      row.lastActiveTs = ts;
      row.lastActiveDisplay = evt.displayTime || evt.formattedTime || 'Just now';
      row.lastAction = evt.action || '';
    }
  });

  return Object.values(byStaff).sort((a, b) => b.totalActions - a.totalActions || b.lastActiveTs - a.lastActiveTs);
}

/**
 * Clears stored audit logs (admin function)
 */
export function clearAuditLogs() {
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('washdoor_audit_logged', { detail: null }));
    }
  } catch (err) {
    console.error('Failed to clear audit logs:', err);
  }
}
