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
  triggerNotification,
  recordNotificationLog,
} from '../services/notificationTemplateService.js';
import '../styles/TemplateManagement.css';

// ── Realistic Smartphone Mockup Component ─────────────────────────────
function SmartphoneMockup({
  channel = 'whatsapp',
  body = '',
  subject = '',
  smsMetrics = { chars: 0, segments: 1 },
  previewData = {},
}) {
  const renderedBody = renderTemplateVariables(body, previewData);
  const renderedSubject = renderTemplateVariables(subject || 'Washdoor Order Notification', previewData);

  return (
    <div className="nts-smartphone-mockup">
      {/* Physical hardware buttons on side of device */}
      <div className="nts-phone-hw-btn nts-phone-hw-vol-up" title="Volume Up" />
      <div className="nts-phone-hw-btn nts-phone-hw-vol-down" title="Volume Down" />
      <div className="nts-phone-hw-btn nts-phone-hw-power" title="Power / Lock" />

      {/* Main phone chassis with realistic curved bezel and metallic frame */}
      <div className="nts-phone-chassis">
        {/* Inner screen glass */}
        <div className="nts-phone-screen">
          {/* Top Dynamic Island / Camera & Sensor pill */}
          <div className="nts-phone-notch-container">
            <div className="nts-phone-dynamic-island">
              <div className="nts-phone-camera-lens" />
              <div className="nts-phone-sensor" />
            </div>
          </div>

          {/* Status Bar */}
          <div className={`nts-phone-status-bar ${channel === 'whatsapp' ? 'light-text' : 'dark-text'}`}>
            <span className="nts-status-time">9:41</span>
            <div className="nts-status-icons">
              <div className="nts-status-signal">
                <span className="nts-bar b1" />
                <span className="nts-bar b2" />
                <span className="nts-bar b3" />
                <span className="nts-bar b4" />
              </div>
              <span className="nts-status-wifi">5G</span>
              <div className="nts-battery-body">
                <div className="nts-battery-level" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          {/* ── Channel View: WhatsApp ── */}
          {channel === 'whatsapp' && (
            <div className="nts-phone-app-container whatsapp-theme">
              <div className="nts-phone-app-header whatsapp">
                <div className="nts-app-header-left">
                  <span className="nts-app-back-btn">‹</span>
                  <div className="nts-app-avatar whatsapp">
                    <span>W</span>
                    <span className="nts-avatar-online-dot" />
                  </div>
                  <div className="nts-app-contact-info">
                    <div className="nts-contact-name-row">
                      <span className="nts-contact-name">Washdoor</span>
                      <span className="nts-verified-badge" title="Verified Business">✓</span>
                    </div>
                    <span className="nts-contact-status">Business Account • Online</span>
                  </div>
                </div>
                <div className="nts-app-header-actions">
                  <span className="nts-app-action-icon" title="Video Call">📹</span>
                  <span className="nts-app-action-icon" title="Voice Call">📞</span>
                  <span className="nts-app-action-icon" title="Options">⋮</span>
                </div>
              </div>

              <div className="nts-phone-chat-viewport whatsapp-bg">
                <div className="nts-chat-encryption-notice">
                  🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
                </div>
                <div className="nts-chat-date-chip">TODAY</div>
                <div className="nts-phone-bubble-wrapper incoming">
                  <div className="nts-whatsapp-card">
                    <div className="nts-bubble-message-text">{renderedBody}</div>
                    <div className="nts-bubble-meta-footer">
                      <span className="nts-bubble-time">10:24 AM</span>
                      <span className="nts-whatsapp-double-check">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="nts-phone-bottom-dock whatsapp">
                <span className="nts-dock-icon">😊</span>
                <div className="nts-dock-input-sim">Type a message...</div>
                <span className="nts-dock-icon">📎</span>
                <span className="nts-dock-icon">📷</span>
                <div className="nts-dock-mic-btn">🎙️</div>
              </div>
            </div>
          )}

          {/* ── Channel View: SMS ── */}
          {channel === 'sms' && (
            <div className="nts-phone-app-container sms-theme">
              <div className="nts-phone-app-header sms">
                <div className="nts-app-header-left">
                  <span className="nts-app-back-btn">‹ Messages</span>
                </div>
                <div className="nts-sms-contact-center">
                  <div className="nts-sms-avatar">WL</div>
                  <span className="nts-contact-name">Washdoor</span>
                </div>
                <div className="nts-app-header-actions">
                  <span className="nts-app-action-icon">ℹ️</span>
                </div>
              </div>

              <div className="nts-sms-type-badge">Text Message • SMS</div>

              <div className="nts-phone-chat-viewport sms-bg">
                <div className="nts-chat-date-chip">Today 10:24 AM</div>
                <div className="nts-phone-bubble-wrapper incoming">
                  <div className="nts-sms-card">
                    <div className="nts-bubble-message-text">{renderedBody}</div>
                  </div>
                </div>
              </div>

              <div className="nts-phone-bottom-dock sms">
                <span className="nts-dock-icon app-store">A</span>
                <span className="nts-dock-icon">📷</span>
                <div className="nts-dock-input-sim sms">Text Message</div>
                <div className="nts-dock-mic-btn sms">↑</div>
              </div>

              <div className="nts-sms-counter-bar">
                <span>{smsMetrics?.chars || 0} characters</span>
                <span>•</span>
                <span>{smsMetrics?.segments || 1} SMS segment(s)</span>
              </div>
            </div>
          )}

          {/* ── Channel View: Mobile Email ── */}
          {channel === 'email' && (
            <div className="nts-phone-app-container email-theme">
              <div className="nts-phone-app-header email">
                <span className="nts-app-back-btn">‹ Inbox</span>
                <div className="nts-email-folder-name">Mail</div>
                <div className="nts-app-header-actions">
                  <span>⭐️</span>
                  <span>🗑️</span>
                </div>
              </div>

              <div className="nts-phone-chat-viewport email-bg">
                <div className="nts-mobile-email-card">
                  <div className="nts-mobile-email-subject">{renderedSubject}</div>

                  <div className="nts-mobile-email-sender-row">
                    <div className="nts-mobile-email-avatar">W</div>
                    <div className="nts-mobile-sender-details">
                      <div className="nts-sender-line">
                        <strong>Washdoor Laundry</strong>
                        <span className="nts-mobile-email-time">10:24 AM</span>
                      </div>
                      <div className="nts-sender-sub">to {previewData.email || 'customer@example.com'}</div>
                    </div>
                  </div>

                  <div className="nts-mobile-email-divider" />

                  <div className="nts-mobile-email-body-content">
                    <div className="nts-branded-email-banner">
                      <span className="nts-brand-title">🧺 WASHDOR LAUNDRY</span>
                    </div>
                    <div className="nts-bubble-message-text email">{renderedBody}</div>
                    <div className="nts-email-action-box">
                      <button type="button" className="nts-email-cta-btn">View Order in Portal →</button>
                    </div>
                    <div className="nts-mobile-email-footer">
                      Washdoor Premium Care • 100% Satisfaction Guaranteed
                    </div>
                  </div>
                </div>
              </div>

              <div className="nts-phone-bottom-dock email">
                <span className="nts-dock-email-action">↩️ Reply</span>
                <span className="nts-dock-email-action">↪️ Forward</span>
              </div>
            </div>
          )}

          {/* Bottom Home Indicator */}
          <div className="nts-phone-home-indicator-wrap">
            <div className="nts-phone-home-indicator" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Desktop Webmail Preview Component ─────────────────────────────────
function DesktopWebmailPreview({ subject = '', body = '', recipient = 'customer@example.com', previewData = {} }) {
  const renderedBody = renderTemplateVariables(body, previewData);
  const renderedSubject = renderTemplateVariables(subject || 'Washdoor Notification', previewData);

  return (
    <div className="nts-desktop-webmail-window">
      {/* Browser Tab Header */}
      <div className="nts-webmail-browser-header">
        <div className="nts-webmail-window-dots">
          <span className="dot close" />
          <span className="dot min" />
          <span className="dot max" />
        </div>
        <div className="nts-webmail-browser-tab">
          <span>✉️ Mail — {renderedSubject}</span>
        </div>
      </div>

      {/* Webmail Actions Bar */}
      <div className="nts-webmail-actions-bar">
        <button type="button" className="nts-webmail-action-btn">‹ Back</button>
        <button type="button" className="nts-webmail-action-btn">📁 Archive</button>
        <button type="button" className="nts-webmail-action-btn">⚠️ Spam</button>
        <button type="button" className="nts-webmail-action-btn">🗑️ Delete</button>
        <button type="button" className="nts-webmail-action-btn">🏷️ Label</button>
      </div>

      {/* Email Container */}
      <div className="nts-webmail-body-container">
        <div className="nts-webmail-header-info">
          <h2 className="nts-webmail-subject-title">{renderedSubject}</h2>
          <div className="nts-webmail-participants">
            <div className="nts-webmail-sender-avatar">W</div>
            <div className="nts-webmail-sender-text">
              <div className="nts-sender-line">
                <span className="name">Washdoor Laundry</span>
                <span className="email">&lt;notifications@washdoor.in&gt;</span>
                <span className="time">10:24 AM (Just now)</span>
              </div>
              <div className="recipient-line">To: {recipient}</div>
            </div>
          </div>
        </div>

        {/* Branded Email Letterhead */}
        <div className="nts-webmail-card-content">
          <div className="nts-webmail-letterhead">
            <div className="nts-letterhead-logo">🧺 WASHDOR</div>
            <div className="nts-letterhead-tagline">Professional Fabric Care &amp; Premium Laundry</div>
          </div>

          <div className="nts-webmail-letter-body">
            <div className="nts-letter-greeting">Dear {previewData.customer_name || 'Valued Customer'},</div>
            <div className="nts-letter-text">{renderedBody}</div>

            <div className="nts-webmail-cta-section">
              <button type="button" className="nts-webmail-primary-cta">
                Track Order Status Live →
              </button>
            </div>
          </div>

          <div className="nts-webmail-footer">
            <p>© 2026 Washdoor Laundry Solutions. All rights reserved.</p>
            <p>Washdoor Express Hub • 100% Eco-Friendly Detergents &amp; Automated Steam Presses</p>
            <p style={{ fontSize: '10px', color: '#94a3b8' }}>You received this service email because of your recent laundry order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // Email Simulation state
  const [emailDeviceView, setEmailDeviceView] = useState('phone'); // 'phone' | 'desktop'
  const [simRecipientEmail, setSimRecipientEmail] = useState('rahul.sharma@example.com');
  const [simCustomerName, setSimCustomerName] = useState('Rahul Sharma');
  const [simOrderId, setSimOrderId] = useState('ORD-10024');
  const [simTotalAmount, setSimTotalAmount] = useState('₹450');
  const [simService, setSimService] = useState('Wash & Steam Press');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSendSimulationEmail = async () => {
    setIsSimulating(true);
    try {
      const logRecord = await recordNotificationLog({
        order_id: simOrderId,
        event_type: selectedCategory,
        channel: 'email',
        recipient: simRecipientEmail,
        rendered_subject: renderTemplateVariables(formSubject || 'Washdoor Notification', {
          customer_name: simCustomerName,
          order_id: simOrderId,
          total_amount: simTotalAmount,
          service_name: simService,
        }),
        rendered_message: renderTemplateVariables(formBody, {
          customer_name: simCustomerName,
          order_id: simOrderId,
          total_amount: simTotalAmount,
          service_name: simService,
        }),
        provider: 'Washdoor Mail Gateway (Simulated)',
        status: 'Delivered',
      });
      setLogs((prev) => [logRecord, ...prev]);
      showToast?.(`✉️ Simulation email successfully delivered to ${simRecipientEmail}`);
    } catch (e) {
      showToast?.('Simulation failed to dispatch.');
    } finally {
      setIsSimulating(false);
    }
  };

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
            className={`nts-view-tab-btn ${currentView === 'email' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('email');
              setSelectedChannel('email');
            }}
          >
            ✉️ Email Simulation
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 className="nts-panel-title">
                  <span>📱</span>
                  <span>Live Phone Preview</span>
                </h3>
              </div>
              <div className="nts-preview-channel-pill-group">
                <button
                  type="button"
                  className={`nts-preview-pill ${selectedChannel === 'whatsapp' ? 'active' : ''}`}
                  onClick={() => setSelectedChannel('whatsapp')}
                  title="Preview WhatsApp on Phone Screen"
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  className={`nts-preview-pill ${selectedChannel === 'sms' ? 'active' : ''}`}
                  onClick={() => setSelectedChannel('sms')}
                  title="Preview SMS on Phone Screen"
                >
                  📲 SMS
                </button>
                <button
                  type="button"
                  className={`nts-preview-pill ${selectedChannel === 'email' ? 'active' : ''}`}
                  onClick={() => setSelectedChannel('email')}
                  title="Preview Email on Phone Screen"
                >
                  ✉️ Email
                </button>
              </div>
            </div>

            <div className="nts-preview-body">
              <SmartphoneMockup
                channel={selectedChannel}
                body={formBody}
                subject={formSubject}
                smsMetrics={smsMetrics}
                previewData={{
                  customer_name: 'Rahul Sharma',
                  order_id: 'ORD-10024',
                  total_amount: '₹450',
                  service_name: 'Wash & Steam Press',
                  delivery_date: '28 Oct 2026',
                  email: 'rahul.sharma@example.com',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 5B. Email Simulation & Dedicated Studio View ── */}
      {currentView === 'email' && (
        <div className="nts-email-sim-container">
          {/* Email Simulator Hero Bar */}
          <div className="nts-email-hero-card">
            <div className="nts-email-hero-left">
              <div className="nts-email-hero-icon">✉️</div>
              <div>
                <h2 className="nts-email-hero-title">Email Notification Studio &amp; Simulator</h2>
                <p className="nts-email-hero-sub">
                  Customize branded HTML customer emails, test dynamic variable interpolation, and simulate real-time deliveries across mobile phone and desktop clients.
                </p>
              </div>
            </div>
            <div className="nts-email-view-toggles">
              <button
                type="button"
                className={`nts-view-toggle-btn ${emailDeviceView === 'phone' ? 'active' : ''}`}
                onClick={() => setEmailDeviceView('phone')}
              >
                📱 Phone Screen
              </button>
              <button
                type="button"
                className={`nts-view-toggle-btn ${emailDeviceView === 'desktop' ? 'active' : ''}`}
                onClick={() => setEmailDeviceView('desktop')}
              >
                💻 Desktop Mail
              </button>
            </div>
          </div>

          {/* Email 2-Column Workstation */}
          <div className="nts-email-grid">
            {/* Left Column: Email Configuration & Test Dispatcher */}
            <div className="nts-email-left-col">
              {/* Template Category Selector */}
              <div className="nts-panel-card">
                <div className="nts-panel-header">
                  <h3 className="nts-panel-title">
                    <span>📑</span>
                    <span>Email Templates</span>
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 650 }}>6 Standard Categories</span>
                </div>

                <div className="nts-email-category-pills">
                  {NOTIFICATION_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        className={`nts-email-category-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(cat.key);
                          setSelectedChannel('email');
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                      placeholder="e.g. Washdoor Order {{order_id}} Confirmed"
                    />
                  </div>

                  <div className="nts-form-field">
                    <div className="nts-field-label-row">
                      <label className="nts-label">Email Message Body *</label>
                      <span style={{ fontSize: '10.5px', color: '#64748b' }}>Supports {'{{variable}}'} tokens</span>
                    </div>
                    <textarea
                      className="nts-textarea"
                      rows={8}
                      value={formBody}
                      onChange={(e) => {
                        setFormBody(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Enter email content..."
                    />
                  </div>

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
                        <option value="{{customer_name}}">Customer Name</option>
                        <option value="{{order_id}}">Order ID</option>
                        <option value="{{order_date}}">Order Date</option>
                        <option value="{{service_name}}">Service Name</option>
                        <option value="{{quantity}}">Total Items</option>
                      </optgroup>
                      <optgroup label="Delivery Schedule">
                        <option value="{{delivery_date}}">Delivery Date</option>
                        <option value="{{revised_delivery_date}}">Revised Delivery Date</option>
                        <option value="{{delay_reason}}">Delay Reason</option>
                      </optgroup>
                      <optgroup label="Billing & Payments">
                        <option value="{{total_amount}}">Total Amount</option>
                        <option value="{{paid_amount}}">Paid Amount</option>
                        <option value="{{pending_amount}}">Pending Amount</option>
                        <option value="{{payment_status}}">Payment Status</option>
                        <option value="{{due_date}}">Due Date</option>
                        <option value="{{days_overdue}}">Days Overdue</option>
                      </optgroup>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className="nts-btn-secondary"
                      onClick={handleResetCurrent}
                    >
                      ↺ Reset Default
                    </button>
                    <button
                      type="button"
                      className="nts-btn-primary"
                      onClick={handleSaveCurrentTemplate}
                    >
                      💾 Save Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulation Dispatch Sandbox */}
              <div className="nts-panel-card" style={{ marginTop: '16px' }}>
                <div className="nts-panel-header">
                  <h3 className="nts-panel-title">
                    <span>🧪</span>
                    <span>Simulate Real-Time Dispatch</span>
                  </h3>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 650, background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                    Interactive Simulator
                  </span>
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="nts-form-field">
                      <label className="nts-label">Recipient Email Address</label>
                      <input
                        type="email"
                        className="nts-input"
                        value={simRecipientEmail}
                        onChange={(e) => setSimRecipientEmail(e.target.value)}
                        placeholder="customer@example.com"
                      />
                    </div>

                    <div className="nts-form-field">
                      <label className="nts-label">Simulated Customer Name</label>
                      <input
                        type="text"
                        className="nts-input"
                        value={simCustomerName}
                        onChange={(e) => setSimCustomerName(e.target.value)}
                        placeholder="Rahul Sharma"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="nts-form-field">
                      <label className="nts-label">Order ID</label>
                      <input
                        type="text"
                        className="nts-input"
                        value={simOrderId}
                        onChange={(e) => setSimOrderId(e.target.value)}
                        placeholder="ORD-10024"
                      />
                    </div>

                    <div className="nts-form-field">
                      <label className="nts-label">Total Amount</label>
                      <input
                        type="text"
                        className="nts-input"
                        value={simTotalAmount}
                        onChange={(e) => setSimTotalAmount(e.target.value)}
                        placeholder="₹450"
                      />
                    </div>

                    <div className="nts-form-field">
                      <label className="nts-label">Service Name</label>
                      <input
                        type="text"
                        className="nts-input"
                        value={simService}
                        onChange={(e) => setSimService(e.target.value)}
                        placeholder="Wash & Steam Press"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="nts-btn-primary"
                    style={{ background: '#0284c7', borderColor: '#0284c7', padding: '10px 16px', fontSize: '13px', justifyContent: 'center' }}
                    onClick={handleSendSimulationEmail}
                    disabled={isSimulating}
                  >
                    <span>{isSimulating ? '⏳' : '✉️'}</span>
                    <span>{isSimulating ? 'Sending Simulation...' : 'Send Test Simulation Email'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Responsive Preview (Phone Mockup OR Desktop Webmail) */}
            <div className="nts-email-right-col">
              <div className="nts-panel-card">
                <div className="nts-panel-header">
                  <h3 className="nts-panel-title">
                    <span>👁️</span>
                    <span>{emailDeviceView === 'phone' ? 'Smartphone Screen' : 'Desktop Webmail Client'}</span>
                  </h3>
                  <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                    Live Interpolation
                  </span>
                </div>

                <div className="nts-preview-body" style={{ minHeight: '620px' }}>
                  {emailDeviceView === 'phone' ? (
                    <SmartphoneMockup
                      channel="email"
                      body={formBody}
                      subject={formSubject}
                      smsMetrics={smsMetrics}
                      previewData={{
                        customer_name: simCustomerName,
                        order_id: simOrderId,
                        total_amount: simTotalAmount,
                        service_name: simService,
                        email: simRecipientEmail,
                      }}
                    />
                  ) : (
                    <DesktopWebmailPreview
                      subject={formSubject}
                      body={formBody}
                      recipient={simRecipientEmail}
                      previewData={{
                        customer_name: simCustomerName,
                        order_id: simOrderId,
                        total_amount: simTotalAmount,
                        service_name: simService,
                        email: simRecipientEmail,
                      }}
                    />
                  )}
                </div>
              </div>
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
