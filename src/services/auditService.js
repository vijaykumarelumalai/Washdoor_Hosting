// src/services/auditService.js
// Washdoor Immutable Audit Logging Service for Report Downloads & System Operations
// Tracks download timestamp, tenant name, module name, operator, export format, and record metadata

const AUDIT_STORAGE_KEY = 'washdoor_audit_trail_v1';
const DEFAULT_TENANT = 'Ranipet Store #1';
const DEFAULT_ACTOR = 'Store Staff (Live Counter Active)';

/**
 * Retrieves all stored audit events from persistent localStorage
 * @returns {Array} Array of audit event objects
 */
export function getStoredAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load audit logs from localStorage:', err);
    return [];
  }
}

/**
 * Records an audit log entry for report downloads or sensitive operations
 * @param {Object} entry Audit parameters
 * @param {string} entry.action Action performed (e.g., 'Report Exported (Excel)')
 * @param {string} entry.module UI Module where download occurred (e.g., 'Smart Business Dashboard')
 * @param {string} [entry.tenant] Tenant name (defaults to 'Ranipet Store #1')
 * @param {string} [entry.format] Export format ('EXCEL' | 'PDF' | 'CSV' | 'SYSTEM')
 * @param {string} [entry.actor] Operator or staff member triggering download
 * @param {string} [entry.details] Detailed description of the event
 * @param {number} [entry.recordCount] Number of records contained in the exported report
 * @param {string} [entry.severity] 'info' | 'success' | 'warning' | 'danger'
 * @param {Object} [entry.meta] Any additional metadata (filename, filters, timeframes)
 * @returns {Object} The saved audit record
 */
export function logAuditEvent({
  action = 'Report Exported',
  module = 'Smart Business Dashboard',
  tenant = DEFAULT_TENANT,
  format = 'CSV',
  actor = DEFAULT_ACTOR,
  details = '',
  recordCount = 0,
  severity = 'success',
  meta = {},
} = {}) {
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
    action,
    format: String(format).toUpperCase(),
    actor: actor || DEFAULT_ACTOR,
    details: details || `Exported ${recordCount} record(s) via ${format}`,
    recordCount: Number(recordCount) || 0,
    severity,
    meta,
  };

  try {
    const existing = getStoredAuditLogs();
    // Keep most recent 500 audit log entries
    const updated = [record, ...existing].slice(0, 500);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch global event for live UI reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('washdoor_audit_logged', { detail: record })
      );
    }
  } catch (err) {
    console.error('Failed to persist audit log entry:', err);
  }

  return record;
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
