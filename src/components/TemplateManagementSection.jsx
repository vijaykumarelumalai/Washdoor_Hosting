// src/components/TemplateManagementSection.jsx
// Washdoor Executive Notification Template Management & Dispatch Audit Component
// Pixel-perfect match to reference UI media_1793779019702_5325a8a7.png

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
  onNavigateSettingsTab = () => {},
}) {
  // Navigation / View: 'templates' | 'history' | 'simulation'
  const [subView, setSubView] = useState('templates');

  // Channel Selection: 'whatsapp' | 'sms' | 'email'
  const [selectedChannel, setSelectedChannel] = useState('whatsapp');

  // Selected Category: defaults to 'order_created'
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('order_created');

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Active Template Form State (in middle column)
  const [formName, setFormName] = useState('Order Created - WhatsApp');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [currentTemplateId, setCurrentTemplateId] = useState('');
  const textareaRef = useRef(null);

  // Add Template Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('order_created');
  const [newTplChannel, setNewTplChannel] = useState('whatsapp');
  const [newTplSubject, setNewTplSubject] = useState('');
  const [newTplBody, setNewTplBody] = useState('');

  // Notification Logs State
  const [logs, setLogs] = useState([]);
  const [logFilterCategory, setLogFilterCategory] = useState('all');
  const [logFilterChannel, setLogFilterChannel] = useState('all');
  const [logFilterStatus, setLogFilterStatus] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Dispatch Simulation State
  const [simSelectedOrderId, setSimSelectedOrderId] = useState(orders[0]?.order_number || orders[0]?.id || 'WD-10056');
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

  // Sync Form when channel or category selection changes
  useEffect(() => {
    if (templates.length === 0) return;

    const matched = templates.find(
      (t) => t.channel === selectedChannel && t.event_type === selectedCategoryKey
    );

    if (matched) {
      setCurrentTemplateId(matched.id);
      setFormName(matched.template_name || `${getCategoryLabel(selectedCategoryKey)} - ${getChannelName(selectedChannel)}`);
      setFormSubject(matched.email_subject || '');
      setFormBody(matched.message_body || '');
      setFormIsActive(matched.is_active !== undefined ? matched.is_active : true);
    } else {
      setCurrentTemplateId('');
      setFormName(`${getCategoryLabel(selectedCategoryKey)} - ${getChannelName(selectedChannel)}`);
      setFormSubject('');
      setFormBody('');
      setFormIsActive(true);
    }
  }, [templates, selectedChannel, selectedCategoryKey]);

  function getCategoryLabel(key) {
    const match = NOTIFICATION_CATEGORIES.find((c) => c.key === key);
    return match ? match.label : 'Order Created';
  }

  function getChannelName(key) {
    if (key === 'whatsapp') return 'WhatsApp';
    if (key === 'sms') return 'SMS';
    return 'Email';
  }

  // Insert Variable at Cursor Position
  const handleInsertVariable = (tag) => {
    if (!tag) return;
    const textarea = textareaRef.current;
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
    }, 40);
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

    const idToSave = currentTemplateId || `tpl-${selectedChannel}-${selectedCategoryKey}-${Date.now().toString(36)}`;
    const record = {
      id: idToSave,
      template_name: formName.trim(),
      event_type: selectedCategoryKey,
      channel: selectedChannel,
      email_subject: selectedChannel === 'email' ? formSubject.trim() : null,
      message_body: formBody.trim(),
      is_active: formIsActive,
    };

    await saveNotificationTemplate(record);
    showToast(`✅ Saved changes for "${record.template_name}"`);
    loadTemplatesData();
  };

  // Reset current template to initial factory message
  const handleResetCurrentTemplate = () => {
    const defaultMatch = templates.find(
      (t) => t.channel === selectedChannel && t.event_type === selectedCategoryKey
    );
    if (defaultMatch) {
      setFormName(defaultMatch.template_name);
      setFormSubject(defaultMatch.email_subject || '');
      setFormBody(defaultMatch.message_body);
      setFormIsActive(defaultMatch.is_active);
      showToast('↺ Form reset to saved template');
    }
  };

  // Reset all templates to default factory settings
  const handleResetAllDefaults = () => {
    if (window.confirm('Reset all WhatsApp, SMS, and Email templates to factory default predefined messages?')) {
      resetTemplatesToDefault();
      loadTemplatesData();
      showToast('↺ Factory default templates restored');
    }
  };

  // Add new template submission
  const handleCreateNewTemplate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTplName.trim() || !newTplBody.trim()) {
      showToast('⚠️ Please provide a template name and message body');
      return;
    }

    const newRecord = {
      template_name: newTplName.trim(),
      event_type: newTplCategory,
      channel: newTplChannel,
      email_subject: newTplChannel === 'email' ? newTplSubject.trim() : null,
      message_body: newTplBody.trim(),
      is_active: true,
    };

    await saveNotificationTemplate(newRecord);
    setIsAddModalOpen(false);
    setSelectedChannel(newTplChannel);
    setSelectedCategoryKey(newTplCategory);
    showToast(`➕ Added template: "${newRecord.template_name}"`);
    loadTemplatesData();
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

  // Counts for Metric Cards
  const waCount = templates.filter((t) => t.channel === 'whatsapp').length || 6;
  const smsCount = templates.filter((t) => t.channel === 'sms').length || 6;
  const emailCount = templates.filter((t) => t.channel === 'email').length || 6;
  const totalCount = templates.length || 18;

  // Realistic Sample Context for Live Rendering (Matching reference screenshot: Rahul Sharma, WD-10056)
  const sampleRenderingContext = useMemo(() => {
    const selectedRealOrder = orders.find((o) => (o.order_number || o.id) === simSelectedOrderId);
    return {
      customer_name: selectedRealOrder?.customer_name || 'Rahul Sharma',
      order_id: selectedRealOrder?.order_number || selectedRealOrder?.id || 'WD-10056',
      order_date: '25 Jan 2025',
      service_name: selectedRealOrder?.service_category || 'Wash & Fold',
      quantity: selectedRealOrder?.total_pieces || selectedRealOrder?.item_count || '8',
      delivery_date: '28 Jan 2025',
      revised_delivery_date: '29 Jan 2025, 12:00 PM',
      total_amount: selectedRealOrder?.total_amount ? Number(selectedRealOrder.total_amount).toFixed(2) : '450.00',
      paid_amount: selectedRealOrder?.advance_paid ? Number(selectedRealOrder.advance_paid).toFixed(2) : '200.00',
      pending_amount: selectedRealOrder?.balance_due !== undefined ? Number(selectedRealOrder.balance_due).toFixed(2) : '250.00',
      payment_status: selectedRealOrder?.payment_status || 'Partially Paid',
      due_date: '28 Jan 2025',
      delay_reason: 'Monsoon fabric air-drying turnaround & stain inspection',
      days_overdue: '3',
    };
  }, [orders, simSelectedOrderId]);

  // Live Rendered Message for Preview Panel
  const renderedPreviewBody = useMemo(() => {
    return renderTemplate(formBody || 'Your template message will appear here...', sampleRenderingContext);
  }, [formBody, sampleRenderingContext]);

  const renderedPreviewSubject = useMemo(() => {
    return renderTemplate(formSubject || 'Your Laundry Order {{order_id}} Has Been Confirmed', sampleRenderingContext);
  }, [formSubject, sampleRenderingContext]);

  // Dispatch Simulation Handler
  const handleExecuteDispatchSimulation = async () => {
    setSimIsDispatching(true);
    const selectedOrder = orders.find((o) => (o.order_number || o.id) === simSelectedOrderId) || {
      order_number: 'WD-10056',
      customer_name: 'Rahul Sharma',
      mobile_number: '9840123456',
      total_amount: 450,
      advance_paid: 200,
      service_category: 'Wash & Fold',
    };

    const res = await sendNotification({
      eventType: selectedCategoryKey,
      channel: selectedChannel,
      order: selectedOrder,
    });

    setSimIsDispatching(false);

    if (res.success) {
      showToast(`🚀 Dispatched ${selectedChannel.toUpperCase()} message for ${selectedOrder.order_number || 'WD-10056'}!`);
      loadLogsData();
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
    <div className="template-executive-wrapper">
      {/* ── 1. Breadcrumb Bar ── */}
      <div className="template-breadcrumb">
        <span
          className="template-breadcrumb-home"
          onClick={() => onNavigateSettingsTab('business_profile')}
          title="Back to Settings Overview"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="template-breadcrumb-sep">›</span>
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateSettingsTab('business_profile')}
          title="Go to Settings"
        >
          Settings
        </span>
        <span className="template-breadcrumb-sep">›</span>
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateSettingsTab('language')}
          title="Go to Language Settings"
        >
          Language
        </span>
        <span className="template-breadcrumb-sep">›</span>
        <span className="template-breadcrumb-current">Template</span>
      </div>

      {/* ── 2. Executive Header ── */}
      <div className="template-executive-header">
        <div className="template-header-title-box">
          <div className="template-header-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h1 className="template-header-title">Notification Templates</h1>
            <p className="template-header-subtitle">
              Manage WhatsApp, SMS and Email templates for customer communications.
            </p>
          </div>
        </div>

        <div className="template-header-actions">
          <button
            type="button"
            className="btn-template-reset"
            onClick={handleResetAllDefaults}
            title="Restore original Washdoor predefined messages"
          >
            <span>↺</span>
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            className="btn-template-primary"
            onClick={() => setIsAddModalOpen(true)}
            title="Create a new notification template"
          >
            <span style={{ fontSize: '15px' }}>+</span>
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {/* ── 3. Four Top Metric Summary Cards ── */}
      <div className="template-metric-cards-grid">
        {/* WhatsApp Card */}
        <div className="template-kpi-card" onClick={() => setSelectedChannel('whatsapp')} style={{ cursor: 'pointer' }}>
          <div className="template-kpi-left">
            <div className="template-kpi-icon-circle whatsapp">
              💬
            </div>
            <div className="template-kpi-content">
              <span className="template-kpi-label">WhatsApp Templates</span>
              <div className="template-kpi-stat-row">
                <span className="template-kpi-value">{waCount}</span>
                <span className="template-status-pill-green">Active</span>
              </div>
            </div>
          </div>
          <svg className="template-kpi-wave" viewBox="0 0 100 50" fill="none">
            <path d="M0 25 C30 10, 70 40, 100 20 L100 50 L0 50 Z" fill="#22c55e" />
          </svg>
        </div>

        {/* SMS Card */}
        <div className="template-kpi-card" onClick={() => setSelectedChannel('sms')} style={{ cursor: 'pointer' }}>
          <div className="template-kpi-left">
            <div className="template-kpi-icon-circle sms">
              📲
            </div>
            <div className="template-kpi-content">
              <span className="template-kpi-label">SMS Templates</span>
              <div className="template-kpi-stat-row">
                <span className="template-kpi-value">{smsCount}</span>
                <span className="template-status-pill-green">Active</span>
              </div>
            </div>
          </div>
          <svg className="template-kpi-wave" viewBox="0 0 100 50" fill="none">
            <path d="M0 30 C35 15, 65 45, 100 25 L100 50 L0 50 Z" fill="#38bdf8" />
          </svg>
        </div>

        {/* Email Card */}
        <div className="template-kpi-card" onClick={() => setSelectedChannel('email')} style={{ cursor: 'pointer' }}>
          <div className="template-kpi-left">
            <div className="template-kpi-icon-circle email">
              ✉️
            </div>
            <div className="template-kpi-content">
              <span className="template-kpi-label">Email Templates</span>
              <div className="template-kpi-stat-row">
                <span className="template-kpi-value">{emailCount}</span>
                <span className="template-status-pill-green">Active</span>
              </div>
            </div>
          </div>
          <svg className="template-kpi-wave" viewBox="0 0 100 50" fill="none">
            <path d="M0 20 C40 40, 60 10, 100 30 L100 50 L0 50 Z" fill="#a855f7" />
          </svg>
        </div>

        {/* Total Card */}
        <div className="template-kpi-card">
          <div className="template-kpi-left">
            <div className="template-kpi-icon-circle total">
              📑
            </div>
            <div className="template-kpi-content">
              <span className="template-kpi-label">Total Templates</span>
              <div className="template-kpi-stat-row">
                <span className="template-kpi-value">{totalCount}</span>
              </div>
            </div>
          </div>
          <svg className="template-kpi-wave" viewBox="0 0 100 50" fill="none">
            <path d="M0 25 C30 35, 70 15, 100 25 L100 50 L0 50 Z" fill="#f59e0b" />
          </svg>
        </div>
      </div>

      {/* ── 4. Channel Tabs Row ── */}
      <div className="template-channel-tabs-row">
        <div className="channel-pill-tabs">
          <button
            type="button"
            data-channel="whatsapp"
            className={`channel-pill-tab ${selectedChannel === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setSelectedChannel('whatsapp')}
          >
            <span>💬</span>
            <span>WhatsApp</span>
            <span className="channel-count-badge">{waCount}</span>
          </button>

          <button
            type="button"
            data-channel="sms"
            className={`channel-pill-tab ${selectedChannel === 'sms' ? 'active' : ''}`}
            onClick={() => setSelectedChannel('sms')}
          >
            <span>📲</span>
            <span>SMS</span>
            <span className="channel-count-badge">{smsCount}</span>
          </button>

          <button
            type="button"
            data-channel="email"
            className={`channel-pill-tab ${selectedChannel === 'email' ? 'active' : ''}`}
            onClick={() => setSelectedChannel('email')}
          >
            <span>✉️</span>
            <span>Email</span>
            <span className="channel-count-badge">{emailCount}</span>
          </button>
        </div>

        {/* Sub-view switcher */}
        <div className="channel-subview-toggle">
          <button
            type="button"
            className={`btn-subview-toggle ${subView === 'templates' ? 'active' : ''}`}
            onClick={() => setSubView('templates')}
          >
            Template Studio
          </button>
          <button
            type="button"
            className={`btn-subview-toggle ${subView === 'history' ? 'active' : ''}`}
            onClick={() => setSubView('history')}
          >
            Notification History ({logs.length})
          </button>
          <button
            type="button"
            className={`btn-subview-toggle ${subView === 'simulation' ? 'active' : ''}`}
            onClick={() => setSubView('simulation')}
          >
            Live Dispatch Test
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          5. THREE-COLUMN WORKSTATION GRID (The Executive Layout)
         ══════════════════════════════════════════════════════════════════ */}
      {subView === 'templates' && (
        <div className="template-workstation-grid">
          {/* ── COLUMN 1: Notification Category ── */}
          <div className="template-column-card">
            <div className="template-column-card-header">
              <h3 className="template-column-title">
                <span>📑</span>
                <span>Notification Category</span>
              </h3>
            </div>

            <div className="category-selection-list">
              {/* Category 1: Order Created */}
              <div
                className={`category-selection-item ${selectedCategoryKey === 'order_created' ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryKey('order_created')}
              >
                <div className="cat-item-left">
                  <div className="cat-icon-badge order_created">🛒</div>
                  <div className="cat-text-wrap">
                    <span className="cat-title-row">Order Created</span>
                    <span className="cat-subtitle-row">Order confirmation message</span>
                  </div>
                </div>
                <div className="cat-item-right">
                  <span className="template-status-pill-green">Active</span>
                  <span className="cat-chevron">›</span>
                </div>
              </div>

              {/* Category 2: Ready for Pickup */}
              <div
                className={`category-selection-item ${selectedCategoryKey === 'ready_for_pickup' ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryKey('ready_for_pickup')}
              >
                <div className="cat-item-left">
                  <div className="cat-icon-badge ready_for_pickup">📦</div>
                  <div className="cat-text-wrap">
                    <span className="cat-title-row">Ready for Pickup</span>
                    <span className="cat-subtitle-row">Notify when order is ready</span>
                  </div>
                </div>
                <div className="cat-item-right">
                  <span className="template-status-pill-green">Active</span>
                  <span className="cat-chevron">›</span>
                </div>
              </div>

              {/* Category 3: Thank You Message */}
              <div
                className={`category-selection-item ${selectedCategoryKey === 'thank_you' ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryKey('thank_you')}
              >
                <div className="cat-item-left">
                  <div className="cat-icon-badge thank_you">🤍</div>
                  <div className="cat-text-wrap">
                    <span className="cat-title-row">Thank You Message</span>
                    <span className="cat-subtitle-row">Customer appreciation</span>
                  </div>
                </div>
                <div className="cat-item-right">
                  <span className="template-status-pill-green">Active</span>
                  <span className="cat-chevron">›</span>
                </div>
              </div>

              {/* Category 4: Late Delivery */}
              <div
                className={`category-selection-item ${selectedCategoryKey === 'late_delivery' ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryKey('late_delivery')}
              >
                <div className="cat-item-left">
                  <div className="cat-icon-badge late_delivery">⚠️</div>
                  <div className="cat-text-wrap">
                    <span className="cat-title-row">Late Delivery</span>
                    <span className="cat-subtitle-row">Delivery delay notification</span>
                  </div>
                </div>
                <div className="cat-item-right">
                  <span className="template-status-pill-green">Active</span>
                  <span className="cat-chevron">›</span>
                </div>
              </div>

              {/* Category 5: Payment Pending */}
              <div
                className={`category-selection-item ${selectedCategoryKey === 'payment_pending' ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryKey('payment_pending')}
              >
                <div className="cat-item-left">
                  <div className="cat-icon-badge payment_pending">💳</div>
                  <div className="cat-text-wrap">
                    <span className="cat-title-row">Payment Pending</span>
                    <span className="cat-subtitle-row">Pending payment reminder</span>
                  </div>
                </div>
                <div className="cat-item-right">
                  <span className="template-status-pill-green">Active</span>
                  <span className="cat-chevron">›</span>
                </div>
              </div>

              {/* Category 6: Late Payment */}
              <div
                className={`category-selection-item ${selectedCategoryKey === 'late_payment' ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryKey('late_payment')}
              >
                <div className="cat-item-left">
                  <div className="cat-icon-badge late_payment">⌛</div>
                  <div className="cat-text-wrap">
                    <span className="cat-title-row">Late Payment</span>
                    <span className="cat-subtitle-row">Overdue payment reminder</span>
                  </div>
                </div>
                <div className="cat-item-right">
                  <span className="template-status-pill-green">Active</span>
                  <span className="cat-chevron">›</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: Edit Template – [Channel] ── */}
          <div className="template-column-card">
            <div className="template-column-card-header">
              <h3 className="template-column-title">
                <span>✏️</span>
                <span>Edit Template – {getChannelName(selectedChannel)}</span>
              </h3>
            </div>

            <div className="edit-template-form">
              {/* Template Name & Status Switch Row */}
              <div className="edit-header-row">
                <div className="template-name-field">
                  <label className="field-label">
                    Template Name <span className="field-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="template-input-text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter template name..."
                  />
                </div>

                <div className="template-status-field">
                  <label className="field-label">Status</label>
                  <label className="toggle-switch-wrap" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: formIsActive ? '#15803d' : '#64748b' }}>
                      {formIsActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Email Subject Line (When Channel is Email) */}
              {selectedChannel === 'email' && (
                <div>
                  <label className="field-label">
                    Email Subject Line <span className="field-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="template-input-text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="e.g. Your Laundry Order {{order_id}} Has Been Confirmed"
                  />
                </div>
              )}

              {/* Message Content Textarea */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="field-label" style={{ margin: 0 }}>
                    Message Content <span className="field-required">*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                    {formBody.length} chars {selectedChannel === 'sms' && ` • ${Math.ceil(formBody.length / 160)} SMS`}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  className="template-textarea-editor"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Enter message template text with {{variable}} tags..."
                />
              </div>

              {/* Dynamic Variable Selector Dropdown & Chips */}
              <div className="variable-selector-row">
                <span className="variable-selector-label" title="Insert Dynamic Variables">
                  <span>📌</span>
                  <span>Insert Variable:</span>
                </span>

                <select
                  className="variable-dropdown-control"
                  defaultValue=""
                  title="Dynamic Variables Selector"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleInsertVariable(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>{"{ }"} Select Dynamic Variable...</option>
                  <optgroup label="Dynamic Variables">
                    {DYNAMIC_VARIABLES.map((v) => (
                      <option key={v.tag} value={v.tag}>
                        {v.tag} — {v.label}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px', width: '100%' }}>
                  {DYNAMIC_VARIABLES.slice(0, 6).map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      className="variable-chip-btn"
                      onClick={() => handleInsertVariable(v.tag)}
                      title={`Insert ${v.label}`}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="template-form-actions-bar">
                <button
                  type="button"
                  className="btn-form-reset"
                  onClick={handleResetCurrentTemplate}
                  title="Reset edits to saved version"
                >
                  <span>↺</span>
                  <span>Reset</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-form-preview"
                    onClick={() => showToast('👁️ Live preview updated on phone screen')}
                    title="Live preview active on right panel"
                  >
                    <span>👁️</span>
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    className="btn-form-save"
                    onClick={handleSaveChanges}
                    title="Save changes to database"
                  >
                    <span>💾</span>
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUMN 3: Message Preview Panel (Smartphone Frame) ── */}
          <div className="template-column-card template-preview-column">
            <div className="template-column-card-header">
              <h3 className="template-column-title">
                <span>👁️</span>
                <span>Message Preview</span>
              </h3>
              <span className={`channel-preview-badge-pill ${selectedChannel}`}>
                {selectedChannel === 'whatsapp' ? '💬 WhatsApp' : selectedChannel === 'sms' ? '📲 SMS' : '✉️ Email'}
              </span>
            </div>

            {/* Smartphone Mockup */}
            <div className="smartphone-bezel-frame">
              {/* Phone Status Bar */}
              <div className={`smartphone-status-bar ${selectedChannel}`}>
                <span>10:24</span>
                <span style={{ letterSpacing: '2px' }}>📶 5G 🔋</span>
              </div>

              {/* WhatsApp App Mockup View */}
              {selectedChannel === 'whatsapp' && (
                <>
                  <div className="wa-app-bar">
                    <div className="wa-app-bar-left">
                      <span style={{ fontSize: '14px', cursor: 'pointer' }}>‹</span>
                      <div className="wa-app-avatar">🧺</div>
                      <div className="wa-app-name-box">
                        <span className="wa-app-title">Washdoor</span>
                        <span className="wa-app-subtitle">Business Account</span>
                      </div>
                    </div>
                    <div className="wa-app-icons">
                      <span>📹</span>
                      <span>📞</span>
                      <span>⋮</span>
                    </div>
                  </div>

                  <div className="wa-chat-container">
                    <div className="wa-chat-bubble-card">
                      {renderedPreviewBody}
                      <div className="wa-bubble-time-stamp">
                        <span>10:24 AM</span>
                        <span className="wa-blue-ticks">✓✓</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SMS Mockup View */}
              {selectedChannel === 'sms' && (
                <>
                  <div className="sms-app-bar">
                    <span style={{ fontSize: '16px' }}>‹</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>VK-WASHDR</div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>Transactional SMS Route</div>
                    </div>
                  </div>

                  <div className="sms-chat-container">
                    <div className="sms-chat-bubble-card">
                      {renderedPreviewBody}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
                      Today, 10:24 AM
                    </div>
                  </div>
                </>
              )}

              {/* Email Mockup View */}
              {selectedChannel === 'email' && (
                <div style={{ padding: '8px', background: '#0f172a' }}>
                  <div className="email-mockup-inbox-card">
                    <div className="email-mockup-header">
                      <div className="email-mockup-subject">{renderedPreviewSubject}</div>
                      <div className="email-mockup-meta">
                        From: <strong>Washdoor Laundry &lt;notifications@washdoor.in&gt;</strong>
                        <br />
                        To: <strong>Rahul Sharma &lt;rahul.sharma@example.com&gt;</strong>
                      </div>
                    </div>
                    <div className="email-mockup-body">
                      {renderedPreviewBody}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Live customer phone rendering with sample order data
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUB-VIEW 2: NOTIFICATION HISTORY & AUDIT TRAIL
         ══════════════════════════════════════════════════════════════════ */}
      {subView === 'history' && (
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
          </div>

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
                        <td>{log.customer_name || 'Rahul Sharma'}</td>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
          <div className="template-column-card">
            <h3 className="template-column-title">
              <span>🚀</span>
              <span>Live Notification Dispatch Test</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Test automated notification dispatch for any actual order in the database.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div>
                <label className="field-label">Select Order</label>
                <select
                  className="template-input-text"
                  value={simSelectedOrderId}
                  onChange={(e) => setSimSelectedOrderId(e.target.value)}
                >
                  <option value="WD-10056">WD-10056 • Rahul Sharma (₹450.00)</option>
                  {orders.map((o) => (
                    <option key={o.id || o.order_number} value={o.order_number || o.id}>
                      {o.order_number || o.id} • {o.customer_name || 'Customer'} (₹{o.total_amount || '0'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-label">Event</label>
                  <select
                    className="template-input-text"
                    value={selectedCategoryKey}
                    onChange={(e) => setSelectedCategoryKey(e.target.value)}
                  >
                    {NOTIFICATION_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Channel</label>
                  <select
                    className="template-input-text"
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                  >
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="sms">📲 SMS</option>
                    <option value="email">✉️ Email</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="btn-template-primary"
                onClick={handleExecuteDispatchSimulation}
                disabled={simIsDispatching}
                style={{ alignSelf: 'flex-start', marginTop: '8px' }}
              >
                <span>{simIsDispatching ? '⏳ Dispatching...' : '🚀 Send Notification Test'}</span>
              </button>
            </div>
          </div>

          {/* Quick preview card on right */}
          <div className="template-column-card">
            <h4 style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)' }}>
              Resolved Message Payload
            </h4>
            <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '14px', borderRadius: '8px', fontSize: '12.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
              {selectedChannel === 'email' && (
                <div style={{ fontWeight: 700, color: '#6366f1', marginBottom: '8px' }}>
                  Subject: {renderedPreviewSubject}
                </div>
              )}
              {renderedPreviewBody}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for "+ Add Template" ── */}
      {isAddModalOpen && (
        <div className="template-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="template-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div className="template-modal-title">
                <span>➕ Add New Notification Template</span>
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="field-label">Template Name *</label>
                  <input
                    type="text"
                    className="template-input-text"
                    placeholder="e.g. Festival Special Offer - WhatsApp"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="field-label">Category *</label>
                    <select
                      className="template-input-text"
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
                    <label className="field-label">Channel *</label>
                    <select
                      className="template-input-text"
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
                    <label className="field-label">Email Subject *</label>
                    <input
                      type="text"
                      className="template-input-text"
                      placeholder="e.g. Update Regarding Your Laundry Order {{order_id}}"
                      value={newTplSubject}
                      onChange={(e) => setNewTplSubject(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="field-label">Message Body *</label>
                  <textarea
                    className="template-textarea-editor"
                    rows={6}
                    style={{ minHeight: '140px' }}
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
                  className="btn-template-reset"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-template-primary"
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
