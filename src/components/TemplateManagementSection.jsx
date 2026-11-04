// src/components/TemplateManagementSection.jsx
// Washdoor Dynamic Notification Template Management & Dispatch Audit Component
// Direct 1:1 Implementation matching media_1793771263189_5eab5efb.png

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  NOTIFICATION_CATEGORIES,
  COMMUNICATION_CHANNELS,
  DYNAMIC_VARIABLES,
  DEFAULT_TEMPLATES,
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
  // Top View: 'studio' (3-column layout matching screenshot) | 'history' | 'simulation'
  const [activeView, setActiveView] = useState('studio');

  // Channel Selection: 'whatsapp' | 'sms' | 'email'
  const [selectedChannel, setSelectedChannel] = useState('whatsapp');

  // Category Selection: 'order_created' | 'ready_for_pickup' | 'thank_you' | 'late_delivery' | 'payment_pending' | 'late_payment'
  const [selectedCategory, setSelectedCategory] = useState('order_created');

  // Initial default template for immediate synchronous render
  const initialDefault = DEFAULT_TEMPLATES.find(
    (t) => t.event_type === 'order_created' && t.channel === 'whatsapp'
  ) || DEFAULT_TEMPLATES[0];

  // All templates from database / localStorage (defaults immediately to DEFAULT_TEMPLATES)
  const [templates, setTemplates] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('washdoor_notification_templates');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return DEFAULT_TEMPLATES;
  });
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Form State for the currently selected template
  const [formName, setFormName] = useState(initialDefault?.template_name || 'Order Created - WhatsApp');
  const [formSubject, setFormSubject] = useState(initialDefault?.email_subject || '');
  const [formBody, setFormBody] = useState(initialDefault?.message_body || '');
  const [formIsActive, setFormIsActive] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const bodyTextareaRef = useRef(null);

  // Logs State
  const [logs, setLogs] = useState([]);
  const [logFilterCategory, setLogFilterCategory] = useState('all');
  const [logFilterChannel, setLogFilterChannel] = useState('all');
  const [logFilterStatus, setLogFilterStatus] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Add Template Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('order_created');
  const [newTplChannel, setNewTplChannel] = useState('whatsapp');
  const [newTplSubject, setNewTplSubject] = useState('');
  const [newTplBody, setNewTplBody] = useState('');

  // Simulation State
  const [simSelectedOrderId, setSimSelectedOrderId] = useState(orders[0]?.order_number || orders[0]?.id || 'ORD00024');
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
    const data = await getNotificationLogs();
    setLogs(data);
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

  // Find the current active template matching selectedCategory & selectedChannel
  const currentTemplate = useMemo(() => {
    const list = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;
    return (
      list.find((t) => t.event_type === selectedCategory && t.channel === selectedChannel) ||
      DEFAULT_TEMPLATES.find((t) => t.event_type === selectedCategory && t.channel === selectedChannel) || {
        id: `tpl-${selectedChannel}-${selectedCategory}`,
        template_name: `${selectedCategory.replace(/_/g, ' ')} - ${selectedChannel}`,
        event_type: selectedCategory,
        channel: selectedChannel,
        email_subject: selectedChannel === 'email' ? 'Laundry Notification from Washdoor' : '',
        message_body: 'Hello {{customer_name}}! Welcome to Washdoor Laundry Services.',
        is_active: true,
      }
    );
  }, [templates, selectedCategory, selectedChannel]);

  // Sync form inputs when current template changes
  useEffect(() => {
    if (currentTemplate) {
      setFormName(currentTemplate.template_name || '');
      setFormSubject(currentTemplate.email_subject || '');
      setFormBody(currentTemplate.message_body || '');
      setFormIsActive(currentTemplate.is_active !== undefined ? Boolean(currentTemplate.is_active) : true);
      setHasUnsavedChanges(false);
    }
  }, [currentTemplate]);

  // Insert Variable at cursor position
  const handleInsertVariableSelect = (e) => {
    const tag = e.target.value;
    if (!tag) return;

    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setFormBody((prev) => prev + tag);
    } else {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const current = formBody;
      const updated = current.substring(0, start) + tag + current.substring(end);
      setFormBody(updated);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    }
    setHasUnsavedChanges(true);
    e.target.value = '';
  };

  // Save current template changes
  const handleSaveChanges = async () => {
    if (!formName.trim()) {
      showToast('⚠️ Template name is required');
      return;
    }
    if (!formBody.trim()) {
      showToast('⚠️ Message content cannot be empty');
      return;
    }
    if (selectedChannel === 'email' && !formSubject.trim()) {
      showToast('⚠️ Email subject line is required');
      return;
    }

    const recordToSave = {
      ...currentTemplate,
      template_name: formName.trim(),
      event_type: selectedCategory,
      channel: selectedChannel,
      email_subject: selectedChannel === 'email' ? formSubject.trim() : null,
      message_body: formBody.trim(),
      is_active: formIsActive,
    };

    await saveNotificationTemplate(recordToSave);
    setHasUnsavedChanges(false);
    showToast(`✅ Saved changes to "${recordToSave.template_name}"!`);
    loadTemplatesData();
  };

  // Reset to original factory template
  const handleResetToDefault = () => {
    resetTemplatesToDefault();
    loadTemplatesData();
    showToast('↺ Template reset to factory default message');
  };

  // Toggle active state for current template
  const handleToggleCurrentStatus = async () => {
    const nextStatus = !formIsActive;
    setFormIsActive(nextStatus);
    setHasUnsavedChanges(true);

    if (currentTemplate?.id) {
      await toggleTemplateActive(currentTemplate.id);
      showToast(`Template ${nextStatus ? 'Activated' : 'Deactivated'}`);
      loadTemplatesData();
    }
  };

  // Add New Template Submit
  const handleCreateNewTemplateSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!newTplName.trim() || !newTplBody.trim()) {
      showToast('⚠️ Please fill in all required fields');
      return;
    }

    await saveNotificationTemplate({
      template_name: newTplName.trim(),
      event_type: newTplCategory,
      channel: newTplChannel,
      email_subject: newTplChannel === 'email' ? newTplSubject.trim() : null,
      message_body: newTplBody.trim(),
      is_active: true,
    });

    setIsAddModalOpen(false);
    setSelectedChannel(newTplChannel);
    setSelectedCategory(newTplCategory);
    showToast(`✅ New template "${newTplName.trim()}" created!`);
    loadTemplatesData();
  };

  // Render Sample Dynamic Preview Data
  const sampleContext = useMemo(() => {
    return {
      customer_name: 'Rahul Sharma',
      order_id: 'WD-10056',
      order_date: '25 Jan 2025',
      service_name: 'Wash & Fold',
      quantity: '8',
      delivery_date: '28 Jan 2025',
      revised_delivery_date: '29 Jan 2025',
      total_amount: '450.00',
      paid_amount: '200.00',
      pending_amount: '250.00',
      payment_status: 'Partially Paid',
      due_date: '28 Jan 2025',
      delay_reason: 'Fabric air-drying turnaround & stain inspection',
      days_overdue: '2 days',
    };
  }, []);

  const renderedPreviewBody = useMemo(() => {
    return renderTemplate(formBody || 'Hello {{customer_name}}!', sampleContext);
  }, [formBody, sampleContext]);

  const renderedPreviewSubject = useMemo(() => {
    return renderTemplate(formSubject || 'Your Laundry Order Has Been Confirmed', sampleContext);
  }, [formSubject, sampleContext]);

  // Filtered Logs for History
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

  // Export History
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

  // Quick Dispatch Test
  const handleQuickDispatchTest = async () => {
    setSimIsDispatching(true);
    const selectedOrder = orders.find((o) => (o.order_number || o.id) === simSelectedOrderId) || {
      order_number: simSelectedOrderId,
      customer_name: 'Rahul Sharma',
      mobile_number: '9840123456',
      total_amount: 450,
      advance_paid: 200,
      service_category: 'Wash & Fold',
    };

    const res = await sendNotification({
      eventType: selectedCategory,
      channel: selectedChannel,
      order: selectedOrder,
    });

    setSimIsDispatching(false);

    if (res.success) {
      showToast(`🚀 ${selectedChannel.toUpperCase()} notification sent successfully for ${selectedOrder.order_number || simSelectedOrderId}!`);
      loadLogsData();
    } else if (res.duplicate) {
      showToast(`⚠️ ${res.reason}`);
    } else {
      showToast(`❌ Failed to send: ${res.reason}`);
    }
  };

  return (
    <div className="template-mgmt-wrapper">
      {/* ── Top Header Matching Reference Screenshot media_1793771263189_5eab5efb.png ── */}
      <div className="template-mgmt-header-v2">
        <div className="template-header-left">
          <div className="template-header-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <h2 className="template-header-title">Notification Templates</h2>
            <p className="template-header-subtitle">
              Manage WhatsApp, SMS and Email templates for customer communications.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick Subnav toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className={`template-subnav-btn ${activeView === 'studio' ? 'active' : ''}`}
              onClick={() => setActiveView('studio')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Template Studio
            </button>
            <button
              type="button"
              className={`template-subnav-btn ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Notification History &amp; Audit Trail
            </button>
            <button
              type="button"
              className={`template-subnav-btn ${activeView === 'simulation' ? 'active' : ''}`}
              onClick={() => setActiveView('simulation')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Live Dispatch Test
            </button>
          </div>

          <button
            type="button"
            className="btn-add-template"
            onClick={() => setIsAddModalOpen(true)}
          >
            <span>+</span>
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {/* ── Channel Navigation Tabs Matching Screenshot ── */}
      <div className="template-channel-tabs">
        <button
          type="button"
          className={`template-channel-tab ${selectedChannel === 'whatsapp' ? 'active' : ''}`}
          onClick={() => setSelectedChannel('whatsapp')}
        >
          <span style={{ fontSize: '18px', color: '#25D366' }}>💬</span>
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          className={`template-channel-tab ${selectedChannel === 'sms' ? 'active' : ''}`}
          onClick={() => setSelectedChannel('sms')}
        >
          <span style={{ fontSize: '18px', color: '#3b82f6' }}>💬</span>
          <span>SMS</span>
        </button>

        <button
          type="button"
          className={`template-channel-tab ${selectedChannel === 'email' ? 'active' : ''}`}
          onClick={() => setSelectedChannel('email')}
        >
          <span style={{ fontSize: '18px', color: '#8b5cf6' }}>✉️</span>
          <span>Email</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 1: 3-COLUMN STUDIO LAYOUT MATCHING SCREENSHOT EXACTLY
         ══════════════════════════════════════════════════════════════════ */}
      {activeView === 'studio' && (
        <div className="template-three-col-layout">
          {/* ── COLUMN 1: Notification Category ── */}
          <div className="category-col-card">
            <h3 className="category-col-heading">Notification Category</h3>

            <div className="category-items-list">
              {[
                { key: 'order_created', label: 'Order Created', desc: 'Order confirmation message', icon: '🛒' },
                { key: 'ready_for_pickup', label: 'Ready for Pickup', desc: 'Notify when order is ready', icon: '📦' },
                { key: 'thank_you', label: 'Thank You Message', desc: 'Customer appreciation', icon: '❤️' },
                { key: 'late_delivery', label: 'Late Delivery', desc: 'Delivery delay notification', icon: '⚠️' },
                { key: 'payment_pending', label: 'Payment Pending', desc: 'Pending payment reminder', icon: '💳' },
                { key: 'late_payment', label: 'Late Payment', desc: 'Overdue payment reminder', icon: '⌛' },
              ].map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const matchTpl = templates.find((t) => t.event_type === cat.key && t.channel === selectedChannel);
                const isActive = matchTpl ? matchTpl.is_active : true;

                return (
                  <div
                    key={cat.key}
                    className={`category-nav-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(cat.key)}
                  >
                    <div className="category-nav-left">
                      <span className="category-nav-icon">{cat.icon}</span>
                      <div className="category-nav-info">
                        <div className="category-nav-title">{cat.label}</div>
                        <div className="category-nav-subtitle">{cat.desc}</div>
                      </div>
                    </div>

                    <span className={isActive ? 'category-active-badge' : 'category-inactive-badge'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COLUMN 2: Edit Template – [Channel] ── */}
          <div className="edit-col-card">
            <h3 className="edit-col-header">
              Edit Template – {selectedChannel === 'whatsapp' ? 'WhatsApp' : selectedChannel === 'sms' ? 'SMS' : 'Email'}
            </h3>

            {/* Template Name & Status Switch */}
            <div className="edit-name-status-row">
              <div className="edit-form-group edit-name-field">
                <label className="edit-label">
                  Template Name <span className="edit-req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Order Created - WhatsApp"
                />
              </div>

              <div className="edit-status-box">
                <span className="edit-label">Status</span>
                <label className="toggle-switch-wrap" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    className="toggle-switch-input"
                    checked={formIsActive}
                    onChange={handleToggleCurrentStatus}
                  />
                  <span className="toggle-slider"></span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {formIsActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>

            {/* Email Subject Line (if channel is Email) */}
            {selectedChannel === 'email' && (
              <div className="edit-form-group">
                <label className="edit-label">
                  Email Subject Line <span className="edit-req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formSubject}
                  onChange={(e) => {
                    setFormSubject(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Your Laundry Order {{order_id}} Has Been Confirmed"
                />
              </div>
            )}

            {/* Message Content */}
            <div className="edit-form-group">
              <div className="edit-label-row">
                <label className="edit-label">
                  Message Content <span className="edit-req-star">*</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formBody.length} characters
                </span>
              </div>
              <textarea
                ref={bodyTextareaRef}
                className="edit-textarea-v2"
                rows={11}
                value={formBody}
                onChange={(e) => {
                  setFormBody(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Type template message content..."
              />
            </div>

            {/* Dynamic Variable Dropdown Selector */}
            <div className="edit-variable-row">
              <span className="edit-variable-label" title="Dynamic Variables selector">Insert Variable:</span>
              <select
                className="edit-variable-select"
                onChange={handleInsertVariableSelect}
                defaultValue=""
                aria-label="Dynamic Variables"
              >
                <option value="" disabled>
                  Select variable...
                </option>
                {DYNAMIC_VARIABLES.map((v) => (
                  <option key={v.tag} value={v.tag}>
                    {v.label} ({v.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* Bottom Actions Row: Reset, Preview, Save Changes */}
            <div className="edit-actions-bottom-row">
              <button
                type="button"
                className="btn-v2-reset"
                onClick={handleResetToDefault}
                title="Reset to default factory message"
              >
                <span>↺</span>
                <span>Reset</span>
              </button>

              <button
                type="button"
                className="btn-v2-preview"
                onClick={() => {
                  showToast('Live preview updated in right panel!');
                  bodyTextareaRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Refresh preview rendering"
              >
                <span>👁️</span>
                <span>Preview</span>
              </button>

              <button
                type="button"
                className="btn-v2-save"
                onClick={handleSaveChanges}
                title="Save changes to database"
              >
                <span>💾</span>
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* ── COLUMN 3: Message Preview Card ── */}
          <div className="preview-col-card">
            <div className="preview-col-top">
              <h3 className="preview-col-heading">Message Preview</h3>
              <span className={`preview-channel-pill preview-pill-${selectedChannel}`}>
                {selectedChannel === 'whatsapp' ? '💬 WhatsApp' : selectedChannel === 'sms' ? '📲 SMS' : '✉️ Email'}
              </span>
            </div>

            {/* WhatsApp Smartphone Mockup matching Reference Image */}
            {selectedChannel === 'whatsapp' && (
              <div className="phone-outer-frame">
                <div className="phone-speaker-cutout"></div>

                {/* WhatsApp Chat Header */}
                <div className="phone-wa-top-bar">
                  <div className="phone-wa-left">
                    <span style={{ fontSize: '15px' }}>‹</span>
                    <div className="phone-wa-avatar">🧺</div>
                    <div className="phone-wa-name-group">
                      <div className="phone-wa-name">Washdoor</div>
                      <div className="phone-wa-sub">Business Account</div>
                    </div>
                  </div>
                  <div className="phone-wa-actions">
                    <span>📹</span>
                    <span>📞</span>
                    <span>⋮</span>
                  </div>
                </div>

                {/* WhatsApp Chat Canvas */}
                <div className="phone-wa-chat-area">
                  <div className="phone-wa-bubble">
                    {renderedPreviewBody}
                    <div className="phone-wa-meta-row">
                      <span>10:24 AM</span>
                      <span className="phone-wa-checkmarks">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SMS Smartphone Mockup */}
            {selectedChannel === 'sms' && (
              <div className="phone-outer-frame">
                <div className="phone-speaker-cutout"></div>
                <div className="phone-sms-top-bar">
                  <span style={{ fontSize: '16px' }}>‹</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>VK-WASHDR</div>
                    <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Transactional SMS</div>
                  </div>
                </div>
                <div className="phone-sms-chat-area">
                  <div className="phone-sms-bubble">
                    {renderedPreviewBody}
                  </div>
                </div>
              </div>
            )}

            {/* Email Preview Card */}
            {selectedChannel === 'email' && (
              <div className="email-preview-card-v2">
                <div className="email-preview-header-v2">
                  <div className="email-preview-sub-v2">{renderedPreviewSubject}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    From: Washdoor Laundry &lt;notifications@washdoor.in&gt;
                    <br />
                    To: Rahul Sharma &lt;rahul.sharma@example.com&gt;
                  </div>
                </div>
                <div className="email-preview-body-v2">
                  {renderedPreviewBody}
                </div>
              </div>
            )}

            {/* Quick Dispatch Simulation Action */}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Test Real Dispatch:
                </span>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px' }}
                  value={simSelectedOrderId}
                  onChange={(e) => setSimSelectedOrderId(e.target.value)}
                >
                  {orders.map((o) => (
                    <option key={o.order_number || o.id} value={o.order_number || o.id}>
                      {o.order_number || o.id}
                    </option>
                  ))}
                  {orders.length === 0 && <option value="ORD00024">ORD00024</option>}
                </select>
              </div>

              <button
                type="button"
                className="btn-card-action"
                style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' }}
                onClick={handleQuickDispatchTest}
                disabled={simIsDispatching}
              >
                <span>🚀</span>
                <span>{simIsDispatching ? 'Dispatching...' : `Send Test ${selectedChannel.toUpperCase()}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 2: NOTIFICATION HISTORY & AUDIT TRAIL
         ══════════════════════════════════════════════════════════════════ */}
      {activeView === 'history' && (
        <div className="notif-history-wrapper">
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
              <option value="all">All Categories</option>
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

            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
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
          </div>

          <div className="notif-history-table-container">
            <table className="notif-history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Message Preview</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No notification logs found.
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
                        <td>{log.customer_name || 'Customer'}</td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {NOTIFICATION_CATEGORIES.find((c) => c.key === log.event_type)?.label || log.event_type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>
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

      {/* ── Add Template Modal ── */}
      {isAddModalOpen && (
        <div className="template-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="template-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div className="template-modal-title">
                <span>➕ Add Notification Template</span>
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplateSubmit}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Template Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Special Festival Offer - WhatsApp"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row cols-2">
                  <div>
                    <label className="form-label">Notification Category *</label>
                    <select
                      className="form-control"
                      value={newTplCategory}
                      onChange={(e) => setNewTplCategory(e.target.value)}
                    >
                      {NOTIFICATION_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Channel *</label>
                    <select
                      className="form-control"
                      value={newTplChannel}
                      onChange={(e) => setNewTplChannel(e.target.value)}
                    >
                      <option value="whatsapp">💬 WhatsApp</option>
                      <option value="sms">📲 SMS</option>
                      <option value="email">✉️ Email</option>
                    </select>
                  </div>
                </div>

                {newTplChannel === 'email' && (
                  <div>
                    <label className="form-label">Email Subject Line *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Your Washdoor Laundry Update"
                      value={newTplSubject}
                      onChange={(e) => setNewTplSubject(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="form-label">Message Content *</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Enter template message with {{customer_name}}, {{order_id}}..."
                    value={newTplBody}
                    onChange={(e) => setNewTplBody(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="template-modal-footer">
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-add-template"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
