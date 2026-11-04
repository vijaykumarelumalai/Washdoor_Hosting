// src/components/TemplateManagementSection.jsx
// Washdoor Laundry POS — Notification Template Studio Component
// Full implementation under Settings → Language → Template

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  NOTIFICATION_CATEGORIES,
  SUPPORTED_VARIABLES,
  DEFAULT_TEMPLATES,
  getTemplates,
  saveTemplate,
  duplicateTemplate,
  toggleTemplateActive,
  archiveTemplate,
  resetDefaultTemplate,
  resetAllDefaults,
  renderTemplateVariables,
  getNotificationLogs,
  retryNotification,
} from '../services/notificationTemplateService.js';
import '../styles/TemplateManagement.css';

export default function TemplateManagementSection({ showToast, orders = [], onNavigateSettingsTab }) {
  // ── States ──────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [currentView, setCurrentView] = useState('studio'); // 'studio' | 'history'

  // Selection state in Studio
  const [selectedCategory, setSelectedCategory] = useState('order_created');
  const [selectedChannel, setSelectedChannel] = useState('whatsapp'); // 'whatsapp' | 'sms' | 'email'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  // Active Template Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add Template Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('order_created');
  const [newTplChannel, setNewTplChannel] = useState('whatsapp');
  const [newTplSubject, setNewTplSubject] = useState('');
  const [newTplBody, setNewTplBody] = useState('');

  const bodyTextareaRef = useRef(null);

  // ── Load Templates and Logs ─────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const tpls = await getTemplates();
      setTemplates(tpls);
      const notifLogs = await getNotificationLogs();
      setLogs(notifLogs);
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Active Selected Template ────────────────────────────────────────
  const activeTemplate = useMemo(() => {
    return (
      templates.find((t) => t.category === selectedCategory && t.channel === selectedChannel) ||
      templates.find((t) => t.category === selectedCategory) ||
      templates[0] ||
      DEFAULT_TEMPLATES[0]
    );
  }, [templates, selectedCategory, selectedChannel]);

  // Sync form when active template changes
  useEffect(() => {
    if (activeTemplate) {
      setFormName(activeTemplate.template_name || '');
      setFormSubject(activeTemplate.subject || '');
      setFormBody(activeTemplate.message_body || '');
      setFormIsActive(activeTemplate.is_active !== false);
      setHasUnsavedChanges(false);
    }
  }, [activeTemplate]);

  // ── Filtered Templates ──────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (filterChannel !== 'all' && t.channel !== filterChannel) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterActive === 'active' && !t.is_active) return false;
      if (filterActive === 'inactive' && t.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (t.template_name || '').toLowerCase().includes(q);
        const matchBody = (t.message_body || '').toLowerCase().includes(q);
        const matchSubject = (t.subject || '').toLowerCase().includes(q);
        if (!matchName && !matchBody && !matchSubject) return false;
      }
      return true;
    });
  }, [templates, filterChannel, filterCategory, filterActive, searchQuery]);

  // ── KPI Counts ──────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const wa = templates.filter((t) => t.channel === 'whatsapp');
    const sms = templates.filter((t) => t.channel === 'sms');
    const email = templates.filter((t) => t.channel === 'email');
    return {
      whatsappTotal: wa.length,
      whatsappActive: wa.filter((t) => t.is_active).length,
      smsTotal: sms.length,
      smsActive: sms.filter((t) => t.is_active).length,
      emailTotal: email.length,
      emailActive: email.filter((t) => t.is_active).length,
      totalTemplates: templates.length,
    };
  }, [templates]);

  // ── Variable Injection at Cursor Position ───────────────────────────
  const handleInsertVariable = (token) => {
    if (!token) return;
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setFormBody((prev) => `${prev} ${token} `);
      setHasUnsavedChanges(true);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formBody;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const updated = `${before}${token}${after}`;
    setFormBody(updated);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  // ── Save Form Modifications ─────────────────────────────────────────
  const handleSaveCurrentTemplate = async () => {
    if (!activeTemplate) return;
    const payload = {
      ...activeTemplate,
      template_name: formName,
      subject: formSubject,
      message_body: formBody,
      is_active: formIsActive,
    };

    const updated = await saveTemplate(payload);
    setTemplates(updated);
    setHasUnsavedChanges(false);
    showToast?.(`✓ Template "${formName}" saved successfully`);
  };

  // ── Duplicate Template ──────────────────────────────────────────────
  const handleDuplicate = async () => {
    if (!activeTemplate) return;
    const updated = await duplicateTemplate(activeTemplate.id);
    setTemplates(updated);
    showToast?.(`✓ Duplicated template copy created`);
  };

  // ── Reset to Default ────────────────────────────────────────────────
  const handleResetCurrent = async () => {
    if (!window.confirm('Reset this template to factory default wording?')) return;
    const updated = await resetDefaultTemplate(selectedCategory, selectedChannel);
    setTemplates(updated);
    showToast?.('✓ Template restored to default');
  };

  const handleResetAll = async () => {
    if (!window.confirm('Reset ALL 18 notification templates to factory defaults? Custom templates will be overwritten.')) return;
    const updated = await resetAllDefaults();
    setTemplates(updated);
    showToast?.('✓ All 18 templates restored to factory defaults');
  };

  // ── Archive/Delete Template ─────────────────────────────────────────
  const handleArchive = async () => {
    if (!activeTemplate) return;
    if (activeTemplate.is_default) {
      showToast?.('Default factory templates cannot be deleted, but can be deactivated or reset.');
      return;
    }
    if (!window.confirm(`Permanently archive template "${activeTemplate.template_name}"?`)) return;
    const updated = await archiveTemplate(activeTemplate.id);
    setTemplates(updated);
    showToast?.('✓ Template archived');
  };

  // ── Create New Template Modal Submit ────────────────────────────────
  const handleCreateNewTemplate = async (e) => {
    e.preventDefault();
    if (!newTplName.trim() || !newTplBody.trim()) {
      showToast?.('Template name and message body are required.');
      return;
    }

    const newTpl = {
      id: `tpl_custom_${Date.now()}`,
      template_name: newTplName,
      category: newTplCategory,
      channel: newTplChannel,
      subject: newTplChannel === 'email' ? newTplSubject : '',
      message_body: newTplBody,
      is_active: true,
      is_default: false,
    };

    const updated = await saveTemplate(newTpl);
    setTemplates(updated);
    setSelectedCategory(newTplCategory);
    setSelectedChannel(newTplChannel);
    setIsAddModalOpen(false);
    setNewTplName('');
    setNewTplSubject('');
    setNewTplBody('');
    showToast?.(`✓ Created new template: "${newTpl.template_name}"`);
  };

  // ── SMS Segment and Character Calculation ───────────────────────────
  const smsMetrics = useMemo(() => {
    const chars = formBody.length;
    // Standard GSM 160 chars = 1 segment; 306 chars = 2 segments
    const segments = chars <= 160 ? 1 : Math.ceil(chars / 153);
    return { chars, segments };
  }, [formBody]);

  return (
    <div className="nts-wrapper">
      {/* ── 1. Breadcrumb Bar (Settings → Language → Template) ── */}
      <div className="nts-breadcrumb">
        <span
          className="nts-breadcrumb-item"
          onClick={() => onNavigateSettingsTab?.('business_profile')}
        >
          ⚙️ Settings
        </span>
        <span className="nts-breadcrumb-sep">›</span>
        <span
          className="nts-breadcrumb-item"
          onClick={() => onNavigateSettingsTab?.('language')}
        >
          🌐 Language
        </span>
        <span className="nts-breadcrumb-sep">›</span>
        <span className="nts-breadcrumb-active">📑 Template</span>
      </div>

      {/* ── 2. Header Bar ── */}
      <div className="nts-header-bar">
        <div className="nts-title-group">
          <div className="nts-icon-badge">📑</div>
          <div>
            <h1 className="nts-main-title">Notification Templates</h1>
            <p className="nts-main-subtitle">
              Manage automated customer notifications across communication channels.
            </p>
          </div>
        </div>

        <div className="nts-header-actions">
          <button
            type="button"
            className="nts-btn-secondary"
            onClick={loadData}
            title="Refresh templates from database"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="nts-btn-secondary"
            onClick={handleResetAll}
            title="Reset all 18 templates to factory defaults"
          >
            <span>↺</span>
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            className="nts-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <span>➕</span>
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {/* ── 3. KPI Summary Cards ── */}
      <div className="nts-kpi-grid">
        <div className="nts-kpi-card">
          <div className="nts-kpi-icon whatsapp">💬</div>
          <div className="nts-kpi-content">
            <span className="nts-kpi-label">WhatsApp Templates</span>
            <div className="nts-kpi-value-row">
              <span className="nts-kpi-count">{kpiStats.whatsappTotal}</span>
              <span className="nts-kpi-badge">{kpiStats.whatsappActive} Active</span>
            </div>
          </div>
        </div>

        <div className="nts-kpi-card">
          <div className="nts-kpi-icon sms">📲</div>
          <div className="nts-kpi-content">
            <span className="nts-kpi-label">SMS Templates</span>
            <div className="nts-kpi-value-row">
              <span className="nts-kpi-count">{kpiStats.smsTotal}</span>
              <span className="nts-kpi-badge">{kpiStats.smsActive} Active</span>
            </div>
          </div>
        </div>

        <div className="nts-kpi-card">
          <div className="nts-kpi-icon email">✉️</div>
          <div className="nts-kpi-content">
            <span className="nts-kpi-label">Email Templates</span>
            <div className="nts-kpi-value-row">
              <span className="nts-kpi-count">{kpiStats.emailTotal}</span>
              <span className="nts-kpi-badge">{kpiStats.emailActive} Active</span>
            </div>
          </div>
        </div>

        <div className="nts-kpi-card">
          <div className="nts-kpi-icon total">📚</div>
          <div className="nts-kpi-content">
            <span className="nts-kpi-label">Total Templates</span>
            <div className="nts-kpi-value-row">
              <span className="nts-kpi-count">{kpiStats.totalTemplates}</span>
              <span className="nts-kpi-badge" style={{ background: '#fef3c7', color: '#b45309' }}>Standard 18</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Toolbar: Sub-Views & Filters ── */}
      <div className="nts-toolbar-card">
        <div className="nts-view-tabs">
          <button
            type="button"
            className={`nts-view-tab-btn ${currentView === 'studio' ? 'active' : ''}`}
            onClick={() => setCurrentView('studio')}
          >
            📑 Templates Studio
          </button>
          <button
            type="button"
            className={`nts-view-tab-btn ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentView('history')}
          >
            📜 Notification History ({logs.length})
          </button>
        </div>

        <div className="nts-filters-group">
          <div className="nts-search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="nts-filter-select"
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="sms">📲 SMS</option>
            <option value="email">✉️ Email</option>
          </select>

          <select
            className="nts-filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {NOTIFICATION_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          <select
            className="nts-filter-select"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ── 5. Main Studio Three-Panel Layout ── */}
      {currentView === 'studio' && (
        <div className="nts-workstation-grid">
          {/* Left Panel: Category List */}
          <div className="nts-panel-card">
            <div className="nts-panel-header">
              <h3 className="nts-panel-title">
                <span>📑</span>
                <span>Categories</span>
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>6 Total</span>
            </div>
            <div className="nts-category-list">
              {NOTIFICATION_CATEGORIES.map((cat) => {
                const count = templates.filter((t) => t.category === cat.key).length;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`nts-category-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.key)}
                  >
                    <div className="nts-cat-left">
                      <span className="nts-cat-icon">{cat.icon}</span>
                      <span className="nts-cat-name">{cat.label}</span>
                    </div>
                    <span className="nts-cat-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Panel: Template Editor */}
          <div className="nts-panel-card">
            <div className="nts-panel-header">
              <h3 className="nts-panel-title">
                <span>✏️</span>
                <span>Template Editor</span>
              </h3>
              {hasUnsavedChanges && (
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
                  ● Unsaved changes
                </span>
              )}
            </div>

            <div className="nts-editor-body">
              {/* Channel Selector Tabs */}
              <div className="nts-channel-tabs">
                <button
                  type="button"
                  className={`nts-channel-btn ${selectedChannel === 'whatsapp' ? 'active' : ''}`}
                  onClick={() => setSelectedChannel('whatsapp')}
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  className={`nts-channel-btn ${selectedChannel === 'sms' ? 'active' : ''}`}
                  onClick={() => setSelectedChannel('sms')}
                >
                  📲 SMS
                </button>
                <button
                  type="button"
                  className={`nts-channel-btn ${selectedChannel === 'email' ? 'active' : ''}`}
                  onClick={() => setSelectedChannel('email')}
                >
                  ✉️ Email
                </button>
              </div>

              {/* Template Name & Status Toggle */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div className="nts-form-field" style={{ flex: 1 }}>
                  <label className="nts-label">Template Name</label>
                  <input
                    type="text"
                    className="nts-input"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter template name..."
                  />
                </div>

                <div className="nts-form-field" style={{ flex: '0 0 auto', alignItems: 'flex-end' }}>
                  <label className="nts-label">Status</label>
                  <div className="nts-toggle-wrap">
                    <label className="nts-toggle-switch">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => {
                          setFormIsActive(e.target.checked);
                          setHasUnsavedChanges(true);
                        }}
                      />
                      <span className="nts-toggle-slider"></span>
                    </label>
                    <span className={`nts-toggle-label ${formIsActive ? 'active' : 'inactive'}`}>
                      {formIsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Subject Line (Only for Email) */}
              {selectedChannel === 'email' && (
                <div className="nts-form-field">
                  <label className="nts-label">Email Subject Line *</label>
                  <input
                    type="text"
                    className="nts-input"
                    value={formSubject}
                    onChange={(e) => {
                      setFormSubject(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. Your Washdoor Order {{order_id}} Is Confirmed"
                  />
                </div>
              )}

              {/* Message Body Textarea */}
              <div className="nts-form-field">
                <div className="nts-field-label-row">
                  <label className="nts-label">Message Body *</label>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                    Supports emoji and {'{{variable}}'} tags
                  </span>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  className="nts-textarea"
                  value={formBody}
                  onChange={(e) => {
                    setFormBody(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter notification message body..."
                  rows={7}
                />
              </div>

              {/* Dynamic Variables Selector */}
              <div className="nts-variable-picker-row">
                <span className="nts-var-hint">⚡ Insert Dynamic Variable:</span>
                <select
                  className="nts-var-select"
                  defaultValue=""
                  onChange={(e) => {
                    handleInsertVariable(e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>Select variable to insert...</option>
                  <optgroup label="Order & Garments">
                    <option value="{{customer_name}}">{'Customer Name ({{customer_name}})'}</option>
                    <option value="{{order_id}}">{'Order ID ({{order_id}})'}</option>
                    <option value="{{order_date}}">{'Order Date ({{order_date}})'}</option>
                    <option value="{{service_name}}">{'Service Name ({{service_name}})'}</option>
                    <option value="{{quantity}}">{'Total Items ({{quantity}})'}</option>
                  </optgroup>
                  <optgroup label="Delivery Schedule">
                    <option value="{{delivery_date}}">{'Delivery Date ({{delivery_date}})'}</option>
                    <option value="{{revised_delivery_date}}">{'Revised Delivery Date ({{revised_delivery_date}})'}</option>
                    <option value="{{delay_reason}}">{'Delay Reason ({{delay_reason}})'}</option>
                  </optgroup>
                  <optgroup label="Billing & Payments">
                    <option value="{{total_amount}}">{'Total Amount ({{total_amount}})'}</option>
                    <option value="{{paid_amount}}">{'Paid Amount ({{paid_amount}})'}</option>
                    <option value="{{pending_amount}}">{'Pending Amount ({{pending_amount}})'}</option>
                    <option value="{{payment_status}}">{'Payment Status ({{payment_status}})'}</option>
                    <option value="{{due_date}}">{'Due Date ({{due_date}})'}</option>
                    <option value="{{days_overdue}}">{'Days Overdue ({{days_overdue}})'}</option>
                  </optgroup>
                </select>
              </div>

              {/* Editor Bottom Actions */}
              <div className="nts-editor-actions">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="nts-btn-secondary"
                    onClick={handleResetCurrent}
                    title="Reset to default wording"
                  >
                    <span>↺</span>
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    className="nts-btn-secondary"
                    onClick={handleDuplicate}
                    title="Duplicate as new template"
                  >
                    <span>📄</span>
                    <span>Duplicate</span>
                  </button>
                  {!activeTemplate?.is_default && (
                    <button
                      type="button"
                      className="nts-btn-secondary"
                      style={{ color: '#ef4444' }}
                      onClick={handleArchive}
                    >
                      <span>🗑️</span>
                      <span>Archive</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="nts-btn-primary"
                  onClick={handleSaveCurrentTemplate}
                >
                  <span>💾</span>
                  <span>Save Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Channel Previews */}
          <div className="nts-panel-card">
            <div className="nts-panel-header">
              <h3 className="nts-panel-title">
                <span>👁️</span>
                <span>Live Preview</span>
              </h3>
              <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                Sample Data
              </span>
            </div>

            <div className="nts-preview-body">
              {/* WhatsApp Preview */}
              {selectedChannel === 'whatsapp' && (
                <div className="nts-phone-frame">
                  <div className="nts-phone-topbar">
                    <div className="nts-phone-avatar">W</div>
                    <div className="nts-phone-contact">
                      <span className="nts-phone-title">Washdoor</span>
                      <span className="nts-phone-sub">Business Account</span>
                    </div>
                  </div>
                  <div className="nts-phone-chat-area">
                    <div className="nts-whatsapp-bubble">
                      {renderTemplateVariables(formBody)}
                      <div className="nts-bubble-meta">
                        <span>10:24 AM</span>
                        <span className="nts-ticks">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Preview */}
              {selectedChannel === 'sms' && (
                <div className="nts-sms-frame">
                  <div className="nts-sms-topbar">Messages • Washdoor</div>
                  <div className="nts-sms-body">
                    <div className="nts-sms-bubble">
                      {renderTemplateVariables(formBody)}
                    </div>
                  </div>
                  <div className="nts-sms-stats">
                    <span>{smsMetrics.chars} characters</span>
                    <span>{smsMetrics.segments} SMS segment(s)</span>
                  </div>
                </div>
              )}

              {/* Email Preview */}
              {selectedChannel === 'email' && (
                <div className="nts-email-frame">
                  <div className="nts-email-topbar">
                    <div className="nts-email-subject">
                      Subject: {renderTemplateVariables(formSubject || 'Washdoor Notification')}
                    </div>
                    <div className="nts-email-meta">
                      From: <strong>Washdoor Laundry</strong> &lt;notifications@washdoor.in&gt;
                    </div>
                    <div className="nts-email-meta">
                      To: <strong>Rahul Sharma</strong> &lt;customer@example.com&gt;
                    </div>
                  </div>
                  <div className="nts-email-content">
                    {renderTemplateVariables(formBody)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Notification History Table View ── */}
      {currentView === 'history' && (
        <div className="nts-history-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Notification Dispatch History &amp; Logs</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Showing most recent {logs.length} attempts</span>
          </div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b' }}>
              <span style={{ fontSize: '32px' }}>📭</span>
              <p style={{ margin: '8px 0 0 0', fontWeight: 600 }}>No notifications recorded yet.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                Automated customer notifications will appear here when orders are created, ready, or completed.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="nts-history-table">
                <thead>
                  <tr>
                    <th>Triggered At</th>
                    <th>Recipient</th>
                    <th>Channel</th>
                    <th>Category</th>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</td>
                      <td><strong>{log.recipient}</strong></td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {log.channel === 'whatsapp' ? '💬 WhatsApp' : log.channel === 'sms' ? '📲 SMS' : '✉️ Email'}
                        </span>
                      </td>
                      <td>{log.event_type}</td>
                      <td>{log.order_id || 'ORD-10024'}</td>
                      <td>
                        <span className={`nts-status-badge ${String(log.status).toLowerCase()}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.provider}</td>
                      <td>
                        {log.status === 'Failed' ? (
                          <button
                            type="button"
                            className="nts-btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={async () => {
                              const res = await retryNotification(log.id);
                              if (res.success) {
                                loadData();
                                showToast?.('✓ Notification retried successfully');
                              }
                            }}
                          >
                            Retry
                          </button>
                        ) : (
                          <span style={{ color: '#15803d', fontSize: '11px', fontWeight: 650 }}>✓ OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 7. Add Template Modal ── */}
      {isAddModalOpen && (
        <div className="nts-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="nts-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nts-modal-header">
              <span className="nts-modal-title">➕ Add Notification Template</span>
              <button
                type="button"
                className="nts-modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate}>
              <div className="nts-modal-body">
                <div className="nts-form-field">
                  <label className="nts-label">Template Name *</label>
                  <input
                    type="text"
                    className="nts-input"
                    placeholder="e.g. Festival Delivery Reminder - WhatsApp"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="nts-form-field">
                    <label className="nts-label">Category *</label>
                    <select
                      className="nts-input"
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

                  <div className="nts-form-field">
                    <label className="nts-label">Channel *</label>
                    <select
                      className="nts-input"
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
                  <div className="nts-form-field">
                    <label className="nts-label">Email Subject *</label>
                    <input
                      type="text"
                      className="nts-input"
                      placeholder="e.g. Your Washdoor Laundry Update {{order_id}}"
                      value={newTplSubject}
                      onChange={(e) => setNewTplSubject(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="nts-form-field">
                  <label className="nts-label">Message Body *</label>
                  <textarea
                    className="nts-textarea"
                    placeholder="Enter template message with {{customer_name}}, {{order_id}}..."
                    value={newTplBody}
                    onChange={(e) => setNewTplBody(e.target.value)}
                    rows={6}
                    required
                  />
                </div>
              </div>

              <div className="nts-modal-footer">
                <button
                  type="button"
                  className="nts-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="nts-btn-primary">
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
