// src/components/TemplateManagementSection.jsx
// Washdoor Dynamic Notification Template Management & Dispatch Audit Component
// Embedded under Account / Settings → Language → Template

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  NOTIFICATION_CATEGORIES,
  COMMUNICATION_CHANNELS,
  DYNAMIC_VARIABLES,
  getNotificationTemplates,
  saveNotificationTemplate,
  deleteNotificationTemplate,
  toggleTemplateActive,
  resetTemplatesToDefault,
  renderTemplate,
  getNotificationLogs,
  sendNotification,
} from '../services/notificationTemplateService.js';
import { exportToExcel, exportToPdf, exportToCsv } from '../services/exportService.js';
import '../styles/TemplateManagement.css';

export default function TemplateManagementSection({
  showToast = () => {},
  orders = [],
}) {
  // Top Subnav View: 'templates' | 'history' | 'simulation'
  const [subView, setSubView] = useState('templates');

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('whatsapp'); // 'whatsapp' | 'sms' | 'email'
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState('all');
  const [logFilterChannel, setLogFilterChannel] = useState('all');
  const [logFilterStatus, setLogFilterStatus] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Modal & Editor States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  // Editor Form States
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('order_created');
  const [formChannel, setFormChannel] = useState('whatsapp');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const bodyTextareaRef = useRef(null);

  // Simulation Dispatch State
  const [simSelectedOrderId, setSimSelectedOrderId] = useState(orders[0]?.order_number || orders[0]?.id || 'ORD00024');
  const [simEvent, setSimEvent] = useState('order_created');
  const [simChannel, setSimChannel] = useState('whatsapp');
  const [simCustomRecipient, setSimCustomRecipient] = useState('');
  const [simIsDispatching, setSimIsDispatching] = useState(false);

  // Load Templates
  const loadTemplatesData = async () => {
    setLoadingTemplates(true);
    const data = await getNotificationTemplates();
    setTemplates(data);
    setLoadingTemplates(false);
  };

  // Load Logs
  const loadLogsData = async () => {
    setLoadingLogs(true);
    const data = await getNotificationLogs();
    setLogs(data);
    setLoadingLogs(false);
  };

  useEffect(() => {
    loadTemplatesData();
    loadLogsData();

    const handleUpdate = () => {
      loadTemplatesData();
      loadLogsData();
    };

    window.addEventListener('washdoor_templates_updated', handleUpdate);
    window.addEventListener('washdoor_notification_logged', handleUpdate);
    return () => {
      window.removeEventListener('washdoor_templates_updated', handleUpdate);
      window.removeEventListener('washdoor_notification_logged', handleUpdate);
    };
  }, []);

  // Filtered Templates for active channel and category
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchChannel = tpl.channel === selectedChannel;
      const matchCategory = selectedCategory === 'all' || tpl.event_type === selectedCategory;
      return matchChannel && matchCategory;
    });
  }, [templates, selectedChannel, selectedCategory]);

  // Open Editor for Creating
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormCategory('order_created');
    setFormChannel(selectedChannel);
    setFormSubject('');
    setFormBody('');
    setFormIsActive(true);
    setIsEditorOpen(true);
  };

  // Open Editor for Editing
  const handleOpenEdit = (tpl) => {
    setEditingTemplate(tpl);
    setFormName(tpl.template_name || '');
    setFormCategory(tpl.event_type || 'order_created');
    setFormChannel(tpl.channel || 'whatsapp');
    setFormSubject(tpl.email_subject || '');
    setFormBody(tpl.message_body || '');
    setFormIsActive(tpl.is_active !== undefined ? tpl.is_active : true);
    setIsEditorOpen(true);
  };

  // Insert Variable at cursor position
  const handleInsertVariable = (tag) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setFormBody((prev) => prev + tag);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = formBody;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setFormBody(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Save Template handler
  const handleSaveTemplateSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formName.trim()) {
      showToast('⚠️ Template name is required');
      return;
    }
    if (!formBody.trim()) {
      showToast('⚠️ Message content cannot be empty');
      return;
    }
    if (formChannel === 'email' && !formSubject.trim()) {
      showToast('⚠️ Email subject line is required');
      return;
    }

    const recordToSave = {
      ...(editingTemplate || {}),
      template_name: formName.trim(),
      event_type: formCategory,
      channel: formChannel,
      email_subject: formChannel === 'email' ? formSubject.trim() : null,
      message_body: formBody.trim(),
      is_active: formIsActive,
    };

    await saveNotificationTemplate(recordToSave);
    setIsEditorOpen(false);
    showToast(`✅ Template "${recordToSave.template_name}" saved successfully!`);
    loadTemplatesData();
  };

  // Toggle Active State
  const handleToggleActive = async (tpl, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const updated = await toggleTemplateActive(tpl.id);
    showToast(`Template ${updated.is_active ? 'Activated' : 'Deactivated'}`);
    loadTemplatesData();
  };

  // Delete Template
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    await deleteNotificationTemplate(deleteConfirmTarget.id);
    showToast(`🗑️ Template "${deleteConfirmTarget.template_name}" deleted.`);
    setDeleteConfirmTarget(null);
    loadTemplatesData();
  };

  // Reset to default factory templates
  const handleResetDefaults = () => {
    if (window.confirm('Reset all WhatsApp, SMS, and Email templates to factory default predefined messages?')) {
      resetTemplatesToDefault();
      loadTemplatesData();
      showToast('↺ Factory default templates restored');
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (logFilterCategory !== 'all' && log.event_type !== logFilterCategory) return false;
      if (logFilterChannel !== 'all' && log.channel !== logFilterChannel) return false;
      if (logFilterStatus !== 'all' && log.delivery_status !== logFilterStatus) return false;

      if (q) {
        const text = `${log.customer_name || ''} ${log.order_id || ''} ${log.recipient || ''} ${log.message_content || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [logs, logFilterCategory, logFilterChannel, logFilterStatus, logSearchQuery]);

  // Dispatch Simulation Handler
  const handleExecuteDispatchSimulation = async () => {
    setSimIsDispatching(true);
    const selectedOrder = orders.find((o) => (o.order_number || o.id) === simSelectedOrderId) || {
      order_number: simSelectedOrderId,
      customer_name: 'Aravind Swamy',
      mobile_number: '9840123456',
      total_amount: 450,
      advance_paid: 200,
      service_category: 'Steam Press & Wash',
    };

    const res = await sendNotification({
      eventType: simEvent,
      channel: simChannel,
      order: selectedOrder,
      recipient: simCustomRecipient.trim() || undefined,
    });

    setSimIsDispatching(false);

    if (res.success) {
      showToast(`🚀 ${simChannel.toUpperCase()} notification sent successfully for ${selectedOrder.order_number || simSelectedOrderId}!`);
      loadLogsData();
      setSubView('history');
    } else if (res.duplicate) {
      showToast(`⚠️ ${res.reason}`);
    } else {
      showToast(`❌ Failed to send: ${res.reason}`);
    }
  };

  // Export History Handler
  const handleExportHistory = (format) => {
    const dataToExport = filteredLogs.map((l) => ({
      Timestamp: l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN') : 'N/A',
      Customer: l.customer_name || 'N/A',
      OrderID: l.order_id || 'N/A',
      Event: l.event_type || 'N/A',
      Channel: (l.channel || '').toUpperCase(),
      Recipient: l.recipient || 'N/A',
      Status: l.delivery_status || 'Delivered',
      Message: l.message_content || '',
    }));

    if (format === 'excel') exportToExcel(dataToExport, 'Washdoor_Notification_Audit');
    else if (format === 'pdf') exportToPdf(dataToExport, 'Washdoor_Notification_Audit', 'Notification Dispatch Audit Ledger');
    else exportToCsv(dataToExport, 'Washdoor_Notification_Audit');

    showToast(`📄 Exported notification history (${format.toUpperCase()})`);
  };

  return (
    <div className="template-mgmt-wrapper">
      {/* ── Header ── */}
      <div className="template-mgmt-header">
        <div className="template-mgmt-title-wrap">
          <h2 className="template-mgmt-title">Dynamic Notification Templates</h2>
          <p className="template-mgmt-subtitle">
            Configure automated WhatsApp, SMS, and Email notification templates with real-time dynamic customer and order variables.
          </p>
        </div>

        <div className="template-mgmt-actions">
          {subView === 'templates' && (
            <>
              <button
                type="button"
                className="btn-card-action"
                onClick={handleResetDefaults}
                title="Restore original Washdoor predefined messages"
              >
                <span>↺</span>
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                className="welcome-action-btn primary"
                onClick={handleOpenCreate}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <span>➕</span>
                <span>Create Template</span>
              </button>
            </>
          )}

          {subView === 'history' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn-card-action"
                onClick={() => handleExportHistory('excel')}
              >
                📊 Excel
              </button>
              <button
                type="button"
                className="btn-card-action"
                onClick={() => handleExportHistory('pdf')}
              >
                📄 PDF
              </button>
              <button
                type="button"
                className="btn-card-action"
                onClick={() => handleExportHistory('csv')}
              >
                📑 CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Subnav Tabs ── */}
      <div className="template-subnav">
        <button
          type="button"
          className={`template-subnav-btn ${subView === 'templates' ? 'active' : ''}`}
          onClick={() => setSubView('templates')}
        >
          <span>📑</span>
          <span>Template Studio</span>
          <span className="template-badge-pill">{templates.length}</span>
        </button>

        <button
          type="button"
          className={`template-subnav-btn ${subView === 'history' ? 'active' : ''}`}
          onClick={() => setSubView('history')}
        >
          <span>📋</span>
          <span>Notification History &amp; Audit Trail</span>
          <span className="template-badge-pill">{logs.length}</span>
        </button>

        <button
          type="button"
          className={`template-subnav-btn ${subView === 'simulation' ? 'active' : ''}`}
          onClick={() => setSubView('simulation')}
        >
          <span>🚀</span>
          <span>Live Dispatch Test</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SUB-VIEW 1: TEMPLATE STUDIO
         ══════════════════════════════════════════════════════════════════ */}
      {subView === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Channel Selector Bar */}
          <div className="channel-selector-bar">
            <div className="channel-tabs-group">
              {COMMUNICATION_CHANNELS.map((ch) => {
                const count = templates.filter((t) => t.channel === ch.key).length;
                return (
                  <button
                    key={ch.key}
                    type="button"
                    data-channel={ch.key}
                    className={`channel-tab-pill ${selectedChannel === ch.key ? 'active' : ''}`}
                    onClick={() => setSelectedChannel(ch.key)}
                  >
                    <span>{ch.icon}</span>
                    <span>{ch.label}</span>
                    <span style={{ opacity: 0.7, fontSize: '11px' }}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="category-filter-row">
            <button
              type="button"
              className={`cat-filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span>All Categories</span>
              <span>({templates.filter((t) => t.channel === selectedChannel).length})</span>
            </button>
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const count = templates.filter((t) => t.channel === selectedChannel && t.event_type === cat.key).length;
              return (
                <button
                  key={cat.key}
                  type="button"
                  className={`cat-filter-btn ${selectedCategory === cat.key ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Templates Grid */}
          {loadingTemplates ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading notification templates from database...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '1.5px dashed var(--border)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No templates found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                No {selectedChannel.toUpperCase()} templates for this category filter.
              </p>
              <button
                type="button"
                className="welcome-action-btn primary"
                onClick={handleOpenCreate}
                style={{ marginTop: '12px', display: 'inline-flex' }}
              >
                <span>➕ Create Template</span>
              </button>
            </div>
          ) : (
            <div className="template-cards-grid">
              {filteredTemplates.map((tpl) => {
                const catObj = NOTIFICATION_CATEGORIES.find((c) => c.key === tpl.event_type) || {
                  label: tpl.event_type,
                  icon: '🔔',
                  badgeClass: 'badge-created',
                };
                return (
                  <div key={tpl.id} className={`template-card ${!tpl.is_active ? 'inactive' : ''}`}>
                    <div>
                      <div className="template-card-header">
                        <div className="template-card-title-wrap">
                          <span className={`template-category-badge ${catObj.badgeClass}`}>
                            <span>{catObj.icon}</span>
                            <span>{catObj.label}</span>
                          </span>
                          <h4 className="template-card-name">{tpl.template_name}</h4>
                        </div>

                        {/* Active Toggle Switch */}
                        <label className="toggle-switch-wrap" title={tpl.is_active ? 'Active' : 'Inactive'}>
                          <input
                            type="checkbox"
                            className="toggle-switch-input"
                            checked={Boolean(tpl.is_active)}
                            onChange={(e) => handleToggleActive(tpl, e)}
                          />
                          <span className="toggle-slider"></span>
                          <span style={{ fontSize: '11px' }}>{tpl.is_active ? 'Active' : 'Off'}</span>
                        </label>
                      </div>

                      {/* Email Subject Line if email */}
                      {tpl.channel === 'email' && tpl.email_subject && (
                        <div className="template-email-subject-line">
                          <span>Subject: </span>
                          <span>{tpl.email_subject}</span>
                        </div>
                      )}

                      {/* Message Content Snippet */}
                      <div className="template-card-body-preview">
                        {tpl.message_body}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="template-card-footer">
                      <span className="template-footer-meta">
                        {tpl.channel.toUpperCase()} • {tpl.message_body?.length || 0} chars
                      </span>

                      <div className="template-card-actions">
                        <button
                          type="button"
                          className="btn-card-action"
                          onClick={() => setPreviewTemplate(tpl)}
                          title="Preview resolved message"
                        >
                          <span>👁️</span>
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          className="btn-card-action"
                          onClick={() => handleOpenEdit(tpl)}
                          title="Edit Template"
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="btn-card-action danger"
                          onClick={() => setDeleteConfirmTarget(tpl)}
                          title="Delete Template"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUB-VIEW 2: NOTIFICATION HISTORY & AUDIT TRAIL
         ══════════════════════════════════════════════════════════════════ */}
      {subView === 'history' && (
        <div className="notif-history-wrapper">
          {/* Filters Bar */}
          <div className="notif-history-filters">
            <div className="notif-filter-input">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search customer, Order ID, recipient..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={logFilterChannel}
              onChange={(e) => setLogFilterChannel(e.target.value)}
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={logFilterCategory}
              onChange={(e) => setLogFilterCategory(e.target.value)}
            >
              <option value="all">All Event Types</option>
              {NOTIFICATION_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={logFilterStatus}
              onChange={(e) => setLogFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Sent">Sent</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>

            <button
              type="button"
              className="btn-card-action"
              onClick={loadLogsData}
              title="Refresh logs from database"
            >
              <span>↺</span>
              <span>Refresh</span>
            </button>
          </div>

          {/* History Table */}
          <div className="notif-history-table-container">
            <table className="notif-history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Event Category</th>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Message Preview</th>
                  <th>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No notification logs match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const statusClass = `notif-status-${(log.delivery_status || 'sent').toLowerCase()}`;
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN') : 'Just now'}
                        </td>
                        <td>
                          <strong>{log.order_id || '—'}</strong>
                        </td>
                        <td>{log.customer_name || 'Walk-in Customer'}</td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {NOTIFICATION_CATEGORIES.find((c) => c.key === log.event_type)?.label || log.event_type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                            {log.channel === 'whatsapp' ? '💬 WhatsApp' : log.channel === 'sms' ? '📲 SMS' : '✉️ Email'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                          {log.recipient}
                        </td>
                        <td style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.message_content}>
                          {log.message_content}
                        </td>
                        <td>
                          <span className={`notif-status-badge ${statusClass}`}>
                            {log.delivery_status === 'Delivered' ? '✓ Delivered' : log.delivery_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUB-VIEW 3: LIVE DISPATCH SIMULATION & TEST
         ══════════════════════════════════════════════════════════════════ */}
      {subView === 'simulation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="settings-box-panel">
            <h3 className="panel-subheading">🚀 Real-Time Dispatch Simulation</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Select any live customer order from the database to test dynamic variable replacement and dispatch notification.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Select Customer Order</label>
                <select
                  className="form-control"
                  value={simSelectedOrderId}
                  onChange={(e) => setSimSelectedOrderId(e.target.value)}
                >
                  {orders.length === 0 ? (
                    <option value="ORD00024">ORD00024 • Aravind Swamy (₹450.00)</option>
                  ) : (
                    orders.map((o) => (
                      <option key={o.id || o.order_number} value={o.order_number || o.id}>
                        {o.order_number || o.id} • {o.customer_name || 'Customer'} (₹{o.total_amount || o.grand_total || '0'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-row cols-2">
                <div>
                  <label className="form-label">Notification Event</label>
                  <select
                    className="form-control"
                    value={simEvent}
                    onChange={(e) => setSimEvent(e.target.value)}
                  >
                    {NOTIFICATION_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Communication Channel</label>
                  <select
                    className="form-control"
                    value={simChannel}
                    onChange={(e) => setSimChannel(e.target.value)}
                  >
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="sms">📲 SMS</option>
                    <option value="email">✉️ Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Custom Test Recipient (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={simChannel === 'email' ? 'e.g. test@washdoor.in' : 'e.g. 9840123456'}
                  value={simCustomRecipient}
                  onChange={(e) => setSimCustomRecipient(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Defaults to the selected order's registered mobile or email.
                </span>
              </div>

              <button
                type="button"
                className="welcome-action-btn primary"
                onClick={handleExecuteDispatchSimulation}
                disabled={simIsDispatching}
                style={{ marginTop: '8px', padding: '10px 20px', fontSize: '13.5px' }}
              >
                <span>{simIsDispatching ? '⏳ Dispatching...' : '🚀 Dispatch Notification Now'}</span>
              </button>
            </div>
          </div>

          {/* Right: Dynamic Resolved Message Preview */}
          <div className="template-preview-col">
            <h4 style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 700 }}>
              Live Dynamically Resolved Preview
            </h4>

            {(() => {
              const activeTpl = templates.find((t) => t.event_type === simEvent && t.channel === simChannel && t.is_active) ||
                templates.find((t) => t.event_type === simEvent && t.channel === simChannel) || {
                  message_body: 'No template configured for this channel and event.',
                  email_subject: 'Washdoor Notification',
                };

              const currentOrder = orders.find((o) => (o.order_number || o.id) === simSelectedOrderId) || {
                order_number: simSelectedOrderId,
                customer_name: 'Aravind Swamy',
                mobile_number: '9840123456',
                email: 'aravind.swamy@gmail.com',
                total_amount: 450,
                advance_paid: 200,
                balance_due: 250,
                service_category: 'Steam Press & Normal Wash',
                expected_delivery: 'Tomorrow, 06:00 PM',
              };

              const rendered = renderTemplate(activeTpl.message_body, currentOrder);
              const renderedSubject = activeTpl.email_subject ? renderTemplate(activeTpl.email_subject, currentOrder) : '';

              if (simChannel === 'whatsapp') {
                return (
                  <div className="preview-phone-mockup">
                    <div className="preview-phone-header">
                      <span>10:30</span>
                      <span>📶 5G 100%</span>
                    </div>
                    <div className="preview-wa-header">
                      <div style={{ fontSize: '20px' }}>🧺</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>Washdoor Ranipet</div>
                        <div style={{ fontSize: '11px', opacity: 0.85 }}>Official Business Account</div>
                      </div>
                    </div>
                    <div style={{ background: '#e5ddd5', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                      <div className="preview-wa-bubble">{rendered}</div>
                    </div>
                  </div>
                );
              }

              if (simChannel === 'sms') {
                return (
                  <div className="preview-phone-mockup">
                    <div className="preview-phone-header">
                      <span>10:30</span>
                      <span>📶 5G</span>
                    </div>
                    <div className="preview-sms-header">
                      <span>‹</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>VK-WASHDR</div>
                        <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Transactional SMS Route</div>
                      </div>
                    </div>
                    <div style={{ background: '#f1f5f9', minHeight: '180px', display: 'flex', flexDirection: 'column' }}>
                      <div className="preview-sms-bubble">{rendered}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="preview-email-card">
                  <div className="preview-email-header">
                    <div className="preview-email-subject">{renderedSubject}</div>
                    <div className="preview-email-meta">
                      From: <strong>Washdoor Laundry &lt;notifications@washdoor.in&gt;</strong>
                      <br />
                      To: <strong>{currentOrder.customer_name} &lt;{currentOrder.email || 'customer@washdoor.in'}&gt;</strong>
                    </div>
                  </div>
                  <div className="preview-email-body">{rendered}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          INTERACTIVE TEMPLATE EDITOR MODAL
         ══════════════════════════════════════════════════════════════════ */}
      {isEditorOpen && (
        <div className="template-modal-backdrop" onClick={() => setIsEditorOpen(false)}>
          <div className="template-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div className="template-modal-title">
                <span>{editingTemplate ? '✏️ Edit Template' : '➕ Create New Notification Template'}</span>
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setIsEditorOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit}>
              <div className="template-modal-body">
                {/* Left: Form Fields */}
                <div className="template-editor-col">
                  <div>
                    <label className="form-label">Template Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Order Created Confirmation (WhatsApp)"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row cols-2">
                    <div>
                      <label className="form-label">Notification Category *</label>
                      <select
                        className="form-control"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                      >
                        {NOTIFICATION_CATEGORIES.map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Communication Channel *</label>
                      <select
                        className="form-control"
                        value={formChannel}
                        onChange={(e) => setFormChannel(e.target.value)}
                      >
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="sms">📲 SMS</option>
                        <option value="email">✉️ Email</option>
                      </select>
                    </div>
                  </div>

                  {formChannel === 'email' && (
                    <div>
                      <label className="form-label">Email Subject Line *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Your Laundry Order {{order_id}} Has Been Confirmed"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Variable Chips Inserter */}
                  <div className="variable-chips-container">
                    <div className="variable-chips-label">
                      📌 Dynamic Variables (Click to Insert at Cursor)
                    </div>
                    <div className="variable-chips-list">
                      {DYNAMIC_VARIABLES.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          className="variable-chip-btn"
                          onClick={() => handleInsertVariable(v.tag)}
                          title={`${v.label}: ${v.desc} (e.g. ${v.example})`}
                        >
                          <span>{v.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Message Content *</label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formBody.length} characters
                        {formChannel === 'sms' && ` • ${Math.ceil(formBody.length / 160)} SMS`}
                      </span>
                    </div>
                    <textarea
                      ref={bodyTextareaRef}
                      className="form-control"
                      rows={8}
                      placeholder="Type template message body here with {{variable}} tags..."
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      required
                      style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.45' }}
                    />
                  </div>

                  <label className="toggle-switch-wrap" style={{ marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span>Set this template as active for automated dispatch</span>
                  </label>
                </div>

                {/* Right: Real-Time Preview */}
                <div className="template-preview-col">
                  <h4 style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Live Customer Preview
                  </h4>

                  {(() => {
                    const sampleContext = {
                      customer_name: 'Aravind Swamy',
                      order_id: 'ORD00024',
                      order_date: '04 Nov 2026',
                      service_name: 'Wash & Fold, Steam Press',
                      quantity: '6 pieces',
                      delivery_date: '06 Nov 2026, 06:00 PM',
                      revised_delivery_date: '07 Nov 2026, 12:00 PM',
                      total_amount: '450.00',
                      paid_amount: '200.00',
                      pending_amount: '250.00',
                      payment_status: 'Partially Paid',
                      due_date: '06 Nov 2026',
                      delay_reason: 'Monsoon weather air-drying delay',
                      days_overdue: '3 days',
                    };

                    const renderedBody = renderTemplate(formBody || 'Your template message will appear here...', sampleContext);
                    const renderedSubject = renderTemplate(formSubject || 'Email Subject', sampleContext);

                    if (formChannel === 'whatsapp') {
                      return (
                        <div className="preview-phone-mockup">
                          <div className="preview-phone-header">
                            <span>10:20</span>
                            <span>📶 5G</span>
                          </div>
                          <div className="preview-wa-header">
                            <div style={{ fontSize: '18px' }}>🧺</div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>Washdoor Ranipet</div>
                              <div style={{ fontSize: '10.5px', opacity: 0.85 }}>Verified Official Account</div>
                            </div>
                          </div>
                          <div style={{ background: '#e5ddd5', minHeight: '180px' }}>
                            <div className="preview-wa-bubble">{renderedBody}</div>
                          </div>
                        </div>
                      );
                    }

                    if (formChannel === 'sms') {
                      return (
                        <div className="preview-phone-mockup">
                          <div className="preview-phone-header">
                            <span>10:20</span>
                            <span>📶 5G</span>
                          </div>
                          <div className="preview-sms-header">
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>VK-WASHDR</div>
                              <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Transactional SMS</div>
                            </div>
                          </div>
                          <div style={{ background: '#f1f5f9', minHeight: '160px' }}>
                            <div className="preview-sms-bubble">{renderedBody}</div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="preview-email-card">
                        <div className="preview-email-header">
                          <div className="preview-email-subject">{renderedSubject}</div>
                          <div className="preview-email-meta">To: Aravind Swamy &lt;aravind.swamy@gmail.com&gt;</div>
                        </div>
                        <div className="preview-email-body">{renderedBody}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="template-modal-footer">
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => setIsEditorOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="welcome-action-btn primary"
                  style={{ padding: '8px 20px', fontSize: '13.5px' }}
                >
                  <span>💾 Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Preview Dialog ── */}
      {previewTemplate && (
        <div className="template-modal-backdrop" onClick={() => setPreviewTemplate(null)}>
          <div className="template-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div className="template-modal-title">
                <span>👁️ {previewTemplate.template_name}</span>
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setPreviewTemplate(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {(() => {
                const sampleContext = {
                  customer_name: 'Aravind Swamy',
                  order_id: 'ORD00024',
                  order_date: '04 Nov 2026',
                  service_name: 'Steam Press & Wash',
                  quantity: '5 pieces',
                  delivery_date: 'Tomorrow, 06:00 PM',
                  revised_delivery_date: 'Day after tomorrow, 12:00 PM',
                  total_amount: '380.00',
                  paid_amount: '180.00',
                  pending_amount: '200.00',
                  payment_status: 'Partially Paid',
                  due_date: 'Tomorrow, 06:00 PM',
                  delay_reason: 'Monsoon fabric air-drying delay',
                  days_overdue: '2 days',
                };

                const body = renderTemplate(previewTemplate.message_body, sampleContext);
                const subj = previewTemplate.email_subject ? renderTemplate(previewTemplate.email_subject, sampleContext) : '';

                if (previewTemplate.channel === 'whatsapp') {
                  return (
                    <div className="preview-phone-mockup">
                      <div className="preview-wa-header">
                        <div style={{ fontSize: '20px' }}>🧺</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>Washdoor Ranipet</div>
                          <div style={{ fontSize: '11px', opacity: 0.85 }}>WhatsApp Official</div>
                        </div>
                      </div>
                      <div style={{ background: '#e5ddd5', minHeight: '180px' }}>
                        <div className="preview-wa-bubble">{body}</div>
                      </div>
                    </div>
                  );
                }

                if (previewTemplate.channel === 'sms') {
                  return (
                    <div className="preview-phone-mockup">
                      <div className="preview-sms-header">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>VK-WASHDR</div>
                          <div style={{ fontSize: '10.5px', opacity: 0.8 }}>SMS Gateway</div>
                        </div>
                      </div>
                      <div style={{ background: '#f1f5f9', minHeight: '160px' }}>
                        <div className="preview-sms-bubble">{body}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="preview-email-card">
                    <div className="preview-email-header">
                      <div className="preview-email-subject">{subj}</div>
                      <div className="preview-email-meta">To: Aravind Swamy &lt;aravind.swamy@gmail.com&gt;</div>
                    </div>
                    <div className="preview-email-body">{body}</div>
                  </div>
                );
              })()}
            </div>

            <div className="template-modal-footer">
              <button
                type="button"
                className="btn-card-action"
                onClick={() => setPreviewTemplate(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirmTarget && (
        <div className="template-modal-backdrop" onClick={() => setDeleteConfirmTarget(null)}>
          <div className="template-modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div className="template-modal-title" style={{ color: '#ef4444' }}>
                <span>⚠️ Confirm Delete Template</span>
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setDeleteConfirmTarget(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                Are you sure you want to permanently delete template:
                <br />
                <strong style={{ color: 'var(--accent)' }}>"{deleteConfirmTarget.template_name}"</strong>?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Automated {deleteConfirmTarget.channel.toUpperCase()} alerts for {deleteConfirmTarget.event_type} will be paused until a replacement template is created.
              </p>
            </div>

            <div className="template-modal-footer">
              <button
                type="button"
                className="btn-card-action"
                onClick={() => setDeleteConfirmTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-card-action danger"
                style={{ background: '#ef4444', color: '#ffffff', borderColor: '#ef4444' }}
                onClick={handleConfirmDelete}
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
