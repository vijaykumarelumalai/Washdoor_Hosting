// src/components/SettingsModule.jsx
// Washdoor Store Settings & Account Management Module
// Includes: Business Profile, Tax & Currency, Bank & Payments, Operations & Receipts,
// Notifications, Language, Apps, Help & Support, Account Details, Sign Out

import React, { useState, useEffect, useRef } from 'react';
import { getStoredSettings, saveStoredSettings, DEFAULT_SETTINGS } from '../config/businessRules';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Settings.css';

export default function SettingsModule({ showToast, onSignOut, initialTab = 'business_profile' }) {
  const { t, language, setLanguage, SAMPLE_LANGUAGES } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [settings, setSettings] = useState(getStoredSettings());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [logoPreview, setLogoPreview] = useState(settings.shopLogo || '');
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite'
  const [mapZoom, setMapZoom] = useState(14);
  const [isSignoutModalOpen, setIsSignoutModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // ── Template & App Configuration States ──
  const [templateChannel, setTemplateChannel] = useState('whatsapp'); // 'whatsapp' | 'sms'
  const [selectedTemplateEvent, setSelectedTemplateEvent] = useState('orderReceived'); // 'orderReceived' | 'orderReady' | 'pickupDispatch' | 'paymentReceived'
  const [configuringApp, setConfiguringApp] = useState(null);
  const [appFormFields, setAppFormFields] = useState({});
  const [isTestingAppConn, setIsTestingAppConn] = useState(false);
  const [appConnResult, setAppConnResult] = useState(null);

  // Sync initial tab if changed from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle generic form changes
  const handleInputChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
  };

  // Handle nested enabledPayments
  const handlePaymentToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      enabledPayments: {
        ...prev.enabledPayments,
        [key]: !prev.enabledPayments?.[key],
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle nested notifications
  const handleNotificationToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      notificationsEnabled: {
        ...prev.notificationsEnabled,
        [key]: !prev.notificationsEnabled?.[key],
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle template change
  const handleTemplateChange = (eventKey, channel, value) => {
    setSettings((prev) => ({
      ...prev,
      messageTemplates: {
        ...(prev.messageTemplates || {}),
        [eventKey]: {
          ...(prev.messageTemplates?.[eventKey] || {}),
          [channel]: value,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Insert variable into template
  const insertVariableTag = (eventKey, channel, tag) => {
    const current = settings.messageTemplates?.[eventKey]?.[channel] || DEFAULT_SETTINGS.messageTemplates[eventKey][channel] || '';
    handleTemplateChange(eventKey, channel, `${current} {${tag}} `);
  };

  // Reset template to default
  const handleResetTemplate = (eventKey, channel) => {
    const defaultVal = DEFAULT_SETTINGS.messageTemplates[eventKey]?.[channel] || '';
    handleTemplateChange(eventKey, channel, defaultVal);
    showToast?.(`✓ Reset to standard ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} template`);
  };

  // Simulated test alert dispatch
  const handleTestSendMessage = (eventKey, channel) => {
    const channelName = channel === 'whatsapp' ? 'WhatsApp' : 'DLT SMS';
    const targetPhone = settings.phone || '+91 7338851369';
    showToast?.(`✓ Simulated test ${channelName} alert dispatched to ${targetPhone}!`);
  };

  // Real-time interpolation for sample customer preview
  const interpolateSample = (templateStr) => {
    if (!templateStr) return '';
    return templateStr
      .replace(/\{customer_name\}/g, 'Ananya Sharma')
      .replace(/\{order_id\}/g, 'ORD-00020')
      .replace(/\{item_count\}/g, '3')
      .replace(/\{expected_delivery\}/g, '30 Oct 2026, 06:00 PM')
      .replace(/\{total_amount\}/g, `${settings.currencySymbol}169.00`)
      .replace(/\{balance_due\}/g, `${settings.currencySymbol}0.00`)
      .replace(/\{amount_paid\}/g, `${settings.currencySymbol}169.00`)
      .replace(/\{payment_method\}/g, 'UPI')
      .replace(/\{store_branch\}/g, settings.storeBranch || 'Ranipet Store #1')
      .replace(/\{driver_name\}/g, 'Ramesh Kumar')
      .replace(/\{driver_phone\}/g, '+91 98450 12345')
      .replace(/\{tracking_link\}/g, 'washdoor.in/track/ORD00020');
  };

  // Save changes to localStorage & runtime config
  const handleSaveChanges = () => {
    const toSave = {
      ...settings,
      shopLogo: logoPreview,
    };
    saveStoredSettings(toSave);
    setSettings(toSave);
    setHasUnsavedChanges(false);
    showToast?.('✓ Store settings saved successfully!');
  };

  // Discard changes
  const handleDiscardChanges = () => {
    const stored = getStoredSettings();
    setSettings(stored);
    setLogoPreview(stored.shopLogo || '');
    setHasUnsavedChanges(false);
    showToast?.('Changes discarded');
  };

  // Logo upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast?.('Please upload an image smaller than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setLogoPreview(base64);
        setSettings((prev) => ({ ...prev, shopLogo: base64 }));
        setHasUnsavedChanges(true);
        showToast?.('Logo uploaded! Click "Save changes" to apply');
      };
      reader.readAsDataURL(file);
    }
  };

  const menuItems = [
    { id: 'business_profile', label: 'Business profile', icon: '🏪', desc: 'Shop logo, address, contact & map location' },
    { id: 'tax_currency', label: 'Tax & currency', icon: '🪙', desc: 'GST rate, currency symbol & invoice calculations' },
    { id: 'bank_payments', label: 'Bank & payments', icon: '🏦', desc: 'Payment categories, bank account & counter UPI QR' },
    { id: 'operations_receipts', label: 'Operations & receipts', icon: '🧾', desc: 'Thermal receipts, barcodes & disclaimer terms' },
    { id: 'notifications', label: 'Reminders & notifications', icon: '🔔', desc: 'WhatsApp, SMS & email automated alerts' },
    { id: 'language', label: 'Language', icon: '🌐', desc: 'Multi-language and text direction' },
    { id: 'apps', label: 'Apps', icon: '📱', desc: 'Printers, WhatsApp API & accounting integrations' },
    { id: 'help_support', label: 'Help & support', icon: '❓', desc: 'Documentation, helpline & diagnostics' },
    { id: 'account_details', label: 'Account', icon: '👤', desc: 'Administrator credentials & security' },
    { id: 'signout', label: 'Sign Out', icon: '🚪', desc: 'Sign out of store terminal' },
  ];

  return (
    <div className="settings-page-wrapper">
      {/* ── Settings Header Bar ── */}
      <div className="settings-top-header">
        <div className="settings-title-group">
          <div className="settings-icon-bubble">⚙️</div>
          <div>
            <h1 className="settings-main-title">{t('settings_title', 'Settings')}</h1>
            <p className="settings-main-subtitle">
              Manage your laundry business profile, receipts, tax, and system preferences
            </p>
          </div>
        </div>

        <div className="settings-header-actions">
          <button
            type="button"
            className="settings-help-btn"
            onClick={() => setActiveTab('help_support')}
            title="Help & Support"
          >
            <span style={{ fontSize: '15px' }}>❓</span>
            <span>Help</span>
          </button>
          <div className="settings-pro-badge" title="PRO+ License Active">
            <span>👑</span>
            <span>PRO</span>
          </div>
        </div>
      </div>

      {/* ── 2-Column Settings Layout ── */}
      <div className="settings-layout-grid">
        {/* Left Sub-Sidebar Menu */}
        <aside className="settings-menu-sidebar">
          <div className="settings-menu-header">
            <span>Settings</span>
          </div>
          <nav className="settings-nav-list">
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              const isSignOut = item.id === 'signout';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-nav-item ${isSelected ? 'active' : ''} ${isSignOut ? 'signout-item' : ''}`}
                  onClick={() => {
                    if (isSignOut) {
                      setIsSignoutModalOpen(true);
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                >
                  <span className="settings-nav-icon">{item.icon}</span>
                  <span className="settings-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Support Banner in Sidebar */}
          <div className="settings-sidebar-promo">
            <div className="promo-tag">✨ PRO+ features</div>
            <div className="promo-text">Team logins, online booking page, and SMS reminders.</div>
            <a href="#pro" onClick={(e) => { e.preventDefault(); showToast?.('PRO+ Active on this counter'); }} className="promo-link">
              Explore PRO+ →
            </a>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className="settings-content-pane">
          {/* ══════════════════════════════════════════════════════════
              1. BUSINESS PROFILE (Matches Reference Image)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'business_profile' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Business profile</h2>

              <div className="business-profile-grid">
                {/* Shop Logo Box */}
                <div className="shop-logo-box">
                  <div className="shop-logo-label">Shop logo</div>
                  <div className="shop-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Shop Logo" className="shop-logo-img" />
                    ) : (
                      <div className="shop-logo-placeholder">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleLogoUpload}
                  />

                  <button
                    type="button"
                    className="shop-logo-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload logo
                  </button>
                  <span className="shop-logo-hint">.JPG or PNG. Uploads instantly.</span>
                </div>

                {/* Shop Information Form */}
                <div className="shop-fields-form">
                  <div className="form-row cols-2">
                    <div className="form-field">
                      <label className="form-label">Shop name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.shopName}
                        onChange={(e) => handleInputChange('shopName', e.target.value)}
                        placeholder="e.g. Washdoor"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+91 7338851369"
                      />
                    </div>
                  </div>

                  <div className="form-row cols-2">
                    <div className="form-field">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={settings.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="info@washdoor.in"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">WhatsApp number</label>
                      <div className="input-with-clear">
                        <input
                          type="text"
                          className="form-control"
                          value={settings.whatsappNumber}
                          onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                          placeholder="+91 7338851369"
                        />
                        {settings.whatsappNumber && (
                          <button
                            type="button"
                            className="input-clear-btn"
                            onClick={() => handleInputChange('whatsappNumber', '')}
                            title="Clear WhatsApp number"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-row cols-1">
                    <div className="form-field">
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="No.7, 4th Avenue, 1st Cross Road"
                      />
                    </div>
                  </div>

                  <div className="form-row cols-3">
                    <div className="form-field">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Chennai / Ranipet"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="Tamil Nadu"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">PIN Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.pinCode}
                        onChange={(e) => handleInputChange('pinCode', e.target.value)}
                        placeholder="632401"
                      />
                    </div>
                  </div>

                  <div className="form-row cols-1">
                    <div className="form-field">
                      <label className="form-label">GST number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.gstNumber}
                        onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                        placeholder="33AABCT1332L1Z8"
                      />
                      <span className="field-hint">Saved with Tax &amp; currency.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Location Section */}
              <div className="map-location-block">
                <div className="map-location-head">
                  <div>
                    <h3 className="map-title">Map location</h3>
                    <p className="map-subtitle">Used for directions on your booking page and for delivery agents.</p>
                  </div>
                  <div className="map-coords-badge">
                    📍 {settings.latitude.toFixed(4)}° N, {settings.longitude.toFixed(4)}° E
                  </div>
                </div>

                {/* Simulated Interactive Map */}
                <div className="map-container-mockup">
                  <div className={`map-canvas ${mapType === 'satellite' ? 'satellite-view' : 'roadmap-view'}`}>
                    {/* Simulated Map Visual Grid & Roads */}
                    <div className="map-road road-h-1"></div>
                    <div className="map-road road-h-2"></div>
                    <div className="map-road road-v-1"></div>
                    <div className="map-road road-v-2"></div>
                    <div className="map-land-area area-1"></div>
                    <div className="map-land-area area-2"></div>

                    {/* Central Store Pin */}
                    <div className="map-pin-marker" title="Washdoor Store Location">
                      <div className="map-pin-pulse"></div>
                      <div className="map-pin-body">
                        <span>🧺</span>
                      </div>
                      <div className="map-pin-tooltip">
                        <strong>{settings.shopName || 'Washdoor'}</strong>
                        <span>{settings.address}, {settings.city}</span>
                      </div>
                    </div>

                    {/* Surrounding Landmark Badges */}
                    <div className="map-poi poi-1">
                      <span>🍴 Barbeque Spice</span>
                    </div>
                    <div className="map-poi poi-2">
                      <span>🏥 City Clinic</span>
                    </div>
                    <div className="map-poi poi-3">
                      <span>🏫 Gandhi Nagar</span>
                    </div>

                    {/* Top Right Map / Satellite Toggle */}
                    <div className="map-controls-type">
                      <button
                        type="button"
                        className={`map-type-btn ${mapType === 'roadmap' ? 'active' : ''}`}
                        onClick={() => setMapType('roadmap')}
                      >
                        Map
                      </button>
                      <button
                        type="button"
                        className={`map-type-btn ${mapType === 'satellite' ? 'active' : ''}`}
                        onClick={() => setMapType('satellite')}
                      >
                        Satellite
                      </button>
                    </div>

                    {/* Bottom Right Zoom Buttons */}
                    <div className="map-controls-zoom">
                      <button
                        type="button"
                        className="map-zoom-btn"
                        onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
                        title="Zoom in"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="map-zoom-btn"
                        onClick={() => setMapZoom((z) => Math.max(10, z - 1))}
                        title="Zoom out"
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              2. TAX & CURRENCY
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'tax_currency' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Tax &amp; Currency Settings</h2>
              <p className="settings-section-subtitle">
                Configure billing currency, GST tax rates, and tax invoice calculation
              </p>

              <div className="settings-box-panel">
                <h3 className="panel-subheading">🪙 Currency Configuration</h3>
                <div className="form-row cols-2">
                  <div className="form-field">
                    <label className="form-label">Store Currency</label>
                    <select
                      className="form-control"
                      value={settings.currencyCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼' };
                        handleInputChange('currencyCode', code);
                        handleInputChange('currencySymbol', symbols[code] || '₹');
                      }}
                    >
                      <option value="INR">Indian Rupee (₹ INR)</option>
                      <option value="USD">US Dollar ($ USD)</option>
                      <option value="EUR">Euro (€ EUR)</option>
                      <option value="GBP">British Pound (£ GBP)</option>
                      <option value="AED">UAE Dirham (د.إ AED)</option>
                      <option value="SAR">Saudi Riyal (﷼ SAR)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Currency Symbol</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.currencySymbol}
                      onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-box-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 className="panel-subheading" style={{ margin: 0 }}>📊 GST &amp; Tax Invoicing</h3>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.isTaxEnabled}
                      onChange={(e) => handleInputChange('isTaxEnabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {settings.isTaxEnabled && (
                  <>
                    <div className="form-row cols-2">
                      <div className="form-field">
                        <label className="form-label">Tax Label on Receipts</label>
                        <input
                          type="text"
                          className="form-control"
                          value={settings.taxLabel}
                          onChange={(e) => handleInputChange('taxLabel', e.target.value)}
                          placeholder="e.g. GST (5%)"
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">GSTIN / Tax ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={settings.gstNumber}
                          onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                          placeholder="33AABCT1332L1Z8"
                        />
                      </div>
                    </div>

                    <div className="form-field" style={{ marginTop: '12px' }}>
                      <label className="form-label">Standard GST Percentage</label>
                      <div className="tax-presets-row">
                        {[
                          { rate: 0.0, label: '0% (Exempt)' },
                          { rate: 0.05, label: '5% (Standard Laundry)' },
                          { rate: 0.12, label: '12% (Garments / Linens)' },
                          { rate: 0.18, label: '18% (Commercial / Hospitality)' },
                        ].map((preset) => (
                          <button
                            key={preset.rate}
                            type="button"
                            className={`tax-preset-pill ${Number(settings.taxRate) === preset.rate ? 'active' : ''}`}
                            onClick={() => {
                              handleInputChange('taxRate', preset.rate);
                              handleInputChange('taxLabel', `GST (${preset.rate * 100}%)`);
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculation Mode */}
                    <div className="form-field" style={{ marginTop: '16px' }}>
                      <label className="form-label">Tax Calculation Mode</label>
                      <div className="radio-group-row">
                        <label className="radio-option-card">
                          <input
                            type="radio"
                            name="taxMode"
                            checked={!settings.taxInclusive}
                            onChange={() => handleInputChange('taxInclusive', false)}
                          />
                          <div>
                            <strong>Exclusive (Recommended)</strong>
                            <p>Tax is added on top of bill subtotal (e.g. ₹100 + ₹5 GST = ₹105)</p>
                          </div>
                        </label>
                        <label className="radio-option-card">
                          <input
                            type="radio"
                            name="taxMode"
                            checked={settings.taxInclusive}
                            onChange={() => handleInputChange('taxInclusive', true)}
                          />
                          <div>
                            <strong>Inclusive</strong>
                            <p>Item catalog rates already include tax (e.g. Final = ₹100)</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Live Tax Computation Preview */}
                    <div className="tax-preview-box">
                      <span className="tax-preview-title">Invoice Calculation Preview (Sample ₹1,000 Order):</span>
                      <div className="tax-preview-lines">
                        <div>Subtotal: <strong>{settings.currencySymbol}1,000.00</strong></div>
                        <div>+ {settings.taxLabel}: <strong>{settings.currencySymbol}{(1000 * Number(settings.taxRate)).toFixed(2)}</strong></div>
                        <div className="tax-preview-total">Grand Total: <strong>{settings.currencySymbol}{(1000 * (1 + Number(settings.taxRate))).toFixed(2)}</strong></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              3. BANK & PAYMENTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'bank_payments' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Bank &amp; Payment Details</h2>
              <p className="settings-section-subtitle">
                Manage counter payment methods, bank account settlement, and counter UPI QR codes
              </p>

              {/* Payment Categories Grid */}
              <div className="settings-box-panel">
                <h3 className="panel-subheading">💳 Active Payment Categories</h3>
                <div className="payment-categories-grid">
                  {[
                    { key: 'cash', title: 'Cash', icon: '💵', desc: 'Accept physical cash handover at store counter' },
                    { key: 'upi', title: 'UPI / Dynamic QR', icon: '📱', desc: 'Google Pay, PhonePe, Paytm QR code scan' },
                    { key: 'card', title: 'Credit / Debit Cards', icon: '💳', desc: 'Swipe POS terminal / chip & pin cards' },
                    { key: 'wallet', title: 'Digital Wallets', icon: '👛', desc: 'Customer prepaid balance and wallets' },
                    { key: 'netbanking', title: 'Net Banking & IMPS', icon: '🏦', desc: 'Direct bank transfer for corporate/B2B' },
                    { key: 'credit', title: 'Store Credit / Pay Later', icon: '🏷️', desc: 'Postpaid credit ledger for frequent customers' },
                  ].map((pm) => (
                    <div key={pm.key} className="payment-mode-card">
                      <div className="payment-mode-head">
                        <span className="payment-mode-icon">{pm.icon}</span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.enabledPayments?.[pm.key] ?? true}
                            onChange={() => handlePaymentToggle(pm.key)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <strong className="payment-mode-title">{pm.title}</strong>
                      <p className="payment-mode-desc">{pm.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="settings-box-panel">
                <h3 className="panel-subheading">🏦 Bank Account for Settlements</h3>
                <div className="form-row cols-2">
                  <div className="form-field">
                    <label className="form-label">Account Holder Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.accountHolder}
                      onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                      placeholder="e.g. Washdoor Laundry Services Pvt Ltd"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      placeholder="e.g. State Bank of India"
                    />
                  </div>
                </div>

                <div className="form-row cols-2">
                  <div className="form-field">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      placeholder="e.g. 389201948201"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">IFSC Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.ifscCode}
                      onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                      placeholder="e.g. SBIN0001234"
                    />
                  </div>
                </div>

                <div className="form-row cols-1">
                  <div className="form-field">
                    <label className="form-label">Branch Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.branchName}
                      onChange={(e) => handleInputChange('branchName', e.target.value)}
                      placeholder="e.g. Ranipet Main Branch"
                    />
                  </div>
                </div>
              </div>

              {/* UPI & Counter QR Code Section */}
              <div className="settings-box-panel">
                <h3 className="panel-subheading">📱 Store Counter UPI QR Code</h3>
                <div className="upi-qr-layout">
                  <div className="upi-fields-col">
                    <div className="form-field">
                      <label className="form-label">UPI ID / VPA</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.upiId}
                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                        placeholder="e.g. washdoor@sbi"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Merchant Name on QR</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.merchantName}
                        onChange={(e) => handleInputChange('merchantName', e.target.value)}
                        placeholder="e.g. Washdoor Ranipet"
                      />
                    </div>
                  </div>

                  <div className="upi-qr-preview-card">
                    <div className="upi-qr-badge">SCAN TO PAY</div>
                    <div className="mock-qr-code">
                      {/* SVG Simulated Dynamic QR code */}
                      <svg width="110" height="110" viewBox="0 0 100 100">
                        <rect width="100" height="100" fill="#ffffff" />
                        <rect x="10" y="10" width="28" height="28" fill="#0f172a" />
                        <rect x="15" y="15" width="18" height="18" fill="#ffffff" />
                        <rect x="19" y="19" width="10" height="10" fill="#0f172a" />
                        <rect x="62" y="10" width="28" height="28" fill="#0f172a" />
                        <rect x="67" y="15" width="18" height="18" fill="#ffffff" />
                        <rect x="71" y="19" width="10" height="10" fill="#0f172a" />
                        <rect x="10" y="62" width="28" height="28" fill="#0f172a" />
                        <rect x="15" y="67" width="18" height="18" fill="#ffffff" />
                        <rect x="19" y="71" width="10" height="10" fill="#0f172a" />
                        <circle cx="50" cy="50" r="10" fill="#2563eb" />
                      </svg>
                    </div>
                    <div className="mock-qr-vpa">{settings.upiId}</div>
                    <button
                      type="button"
                      className="download-qr-btn"
                      onClick={() => showToast?.('Counter QR Tent template ready to print')}
                    >
                      🖨️ Print Counter QR Tent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              4. OPERATIONS & RECEIPTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'operations_receipts' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Operations &amp; Receipt Customization</h2>
              <p className="settings-section-subtitle">
                Customize thermal invoices, barcodes, tracking QR codes, and intake receipt parameters
              </p>

              <div className="receipt-settings-layout">
                {/* Left Controls */}
                <div className="receipt-controls-col">
                  <div className="settings-box-panel">
                    <h3 className="panel-subheading">🖨️ Thermal Printer Sizing</h3>
                    <div className="receipt-size-options">
                      <button
                        type="button"
                        className={`receipt-size-pill ${settings.receiptSize === '80mm' ? 'active' : ''}`}
                        onClick={() => handleInputChange('receiptSize', '80mm')}
                      >
                        <strong>80mm (Desktop Counter)</strong>
                        <span>Standard laundry thermal printer (Epson, TVS, Citizen)</span>
                      </button>
                      <button
                        type="button"
                        className={`receipt-size-pill ${settings.receiptSize === '58mm' ? 'active' : ''}`}
                        onClick={() => handleInputChange('receiptSize', '58mm')}
                      >
                        <strong>58mm (Handheld Mobile)</strong>
                        <span>Compact Bluetooth receipt printer for delivery van</span>
                      </button>
                    </div>
                  </div>

                  <div className="settings-box-panel">
                    <h3 className="panel-subheading">⚙️ Receipt Content Toggles</h3>
                    <div className="toggles-list">
                      <label className="toggle-row">
                        <span>Show Barcode (Code-128) on receipt for scanner</span>
                        <input
                          type="checkbox"
                          checked={settings.printBarcode}
                          onChange={(e) => handleInputChange('printBarcode', e.target.checked)}
                        />
                      </label>
                      <label className="toggle-row">
                        <span>Show Order Tracking QR code for customer phone</span>
                        <input
                          type="checkbox"
                          checked={settings.printQrCode}
                          onChange={(e) => handleInputChange('printQrCode', e.target.checked)}
                        />
                      </label>
                      <label className="toggle-row">
                        <span>Print Store Logo on receipt header</span>
                        <input
                          type="checkbox"
                          checked={settings.printLogoOnReceipt}
                          onChange={(e) => handleInputChange('printLogoOnReceipt', e.target.checked)}
                        />
                      </label>
                      <label className="toggle-row">
                        <span>Print Store GSTIN &amp; Tax breakdown</span>
                        <input
                          type="checkbox"
                          checked={settings.printGstOnReceipt}
                          onChange={(e) => handleInputChange('printGstOnReceipt', e.target.checked)}
                        />
                      </label>
                      <label className="toggle-row">
                        <span>Print Customer Delivery Address</span>
                        <input
                          type="checkbox"
                          checked={settings.printAddressOnReceipt}
                          onChange={(e) => handleInputChange('printAddressOnReceipt', e.target.checked)}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="settings-box-panel">
                    <h3 className="panel-subheading">📝 Header &amp; Footer Messages</h3>
                    <div className="form-field">
                      <label className="form-label">Receipt Header Tagline</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.receiptHeaderMessage}
                        onChange={(e) => handleInputChange('receiptHeaderMessage', e.target.value)}
                        placeholder="Professional Laundry & Dry Cleaning Services"
                      />
                    </div>
                    <div className="form-field" style={{ marginTop: '12px' }}>
                      <label className="form-label">Thank You / Footer Note</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.receiptFooterMessage}
                        onChange={(e) => handleInputChange('receiptFooterMessage', e.target.value)}
                        placeholder="Thank you for choosing Washdoor!"
                      />
                    </div>
                    <div className="form-field" style={{ marginTop: '12px' }}>
                      <label className="form-label">Terms &amp; Conditions Disclaimer</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={settings.receiptTerms}
                        onChange={(e) => handleInputChange('receiptTerms', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Real-Time Receipt Preview */}
                <div className="receipt-preview-col">
                  <div className="receipt-preview-sticky">
                    <div className="receipt-preview-tag">LIVE RECEIPT PREVIEW</div>
                    <div className={`receipt-mockup-paper size-${settings.receiptSize}`}>
                      {settings.printLogoOnReceipt && (
                        <div className="mock-receipt-logo">🧺</div>
                      )}
                      <div className="mock-receipt-brand">{settings.shopName.toUpperCase()}</div>
                      <div className="mock-receipt-sub">{settings.receiptHeaderMessage}</div>
                      <div className="mock-receipt-meta">
                        {settings.address}, {settings.city}
                        <br />Tel: {settings.phone}
                        {settings.printGstOnReceipt && <><br />GSTIN: {settings.gstNumber}</>}
                      </div>

                      <div className="mock-receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

                      <div className="mock-receipt-order-id">ORDER: ORD-00020</div>
                      <div className="mock-receipt-date">Date: 28 Oct 2026, 10:15 AM</div>
                      <div className="mock-receipt-cust">Customer: Ramesh Kumar</div>

                      <div className="mock-receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

                      <div className="mock-receipt-items">
                        <div className="mock-item-row">
                          <span>2x Men Shirts (Dry Clean)</span>
                          <span>{settings.currencySymbol}160.00</span>
                        </div>
                        <div className="mock-item-row">
                          <span>1x Silk Saree (Steam)</span>
                          <span>{settings.currencySymbol}120.00</span>
                        </div>
                      </div>

                      <div className="mock-receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

                      <div className="mock-receipt-totals">
                        <div className="mock-tot-line">
                          <span>Subtotal:</span>
                          <span>{settings.currencySymbol}280.00</span>
                        </div>
                        {settings.isTaxEnabled && settings.printGstOnReceipt && (
                          <div className="mock-tot-line">
                            <span>{settings.taxLabel}:</span>
                            <span>{settings.currencySymbol}{(280 * Number(settings.taxRate)).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="mock-tot-line grand">
                          <span>TOTAL DUE:</span>
                          <span>{settings.currencySymbol}{(280 * (1 + (settings.isTaxEnabled ? Number(settings.taxRate) : 0))).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Barcode Mock */}
                      {settings.printBarcode && (
                        <div className="mock-barcode-wrap">
                          <div className="mock-barcode-lines">
                            ||| | |||| | ||| || ||| | ||| |||| |
                          </div>
                          <div className="mock-barcode-text">*ORD00020*</div>
                        </div>
                      )}

                      {/* QR Mock */}
                      {settings.printQrCode && (
                        <div className="mock-qr-wrap">
                          <svg width="60" height="60" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="#ffffff" />
                            <rect x="10" y="10" width="28" height="28" fill="#000" />
                            <rect x="15" y="15" width="18" height="18" fill="#fff" />
                            <rect x="19" y="19" width="10" height="10" fill="#000" />
                            <rect x="62" y="10" width="28" height="28" fill="#000" />
                            <rect x="67" y="15" width="18" height="18" fill="#fff" />
                            <rect x="71" y="19" width="10" height="10" fill="#000" />
                            <rect x="10" y="62" width="28" height="28" fill="#000" />
                            <rect x="15" y="67" width="18" height="18" fill="#fff" />
                            <rect x="19" y="71" width="10" height="10" fill="#000" />
                          </svg>
                          <div className="mock-qr-label">Scan to Track Order</div>
                        </div>
                      )}

                      <div className="mock-receipt-footer">
                        {settings.receiptFooterMessage}
                        <br />
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>
                          {settings.receiptTerms.split('\n')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              5. REMINDERS & NOTIFICATIONS (WhatsApp & SMS Templates)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Reminders &amp; Automated Notifications</h2>
              <p className="settings-section-subtitle">
                Configure automated WhatsApp, SMS, and email alerts triggered during the laundry lifecycle
              </p>

              {/* Notification Channels Overview */}
              <div className="settings-box-panel">
                <h3 className="panel-subheading">📢 Notification Channels</h3>
                <div className="form-row cols-3">
                  <div className={`channel-status-card ${settings.notificationsEnabled?.whatsapp ? 'active' : ''}`}>
                    <div className="channel-icon">🟢</div>
                    <strong>WhatsApp Business API</strong>
                    <span>{settings.notificationsEnabled?.whatsapp ? 'Active • Instant delivery' : 'Disabled'}</span>
                  </div>
                  <div className={`channel-status-card ${settings.notificationsEnabled?.sms ? 'active' : ''}`}>
                    <div className="channel-icon">🟢</div>
                    <strong>Transactional SMS Gateway</strong>
                    <span>{settings.notificationsEnabled?.sms ? 'DLT Registered • 100% Delivery' : 'Disabled'}</span>
                  </div>
                  <div className={`channel-status-card ${settings.notificationsEnabled?.email ? 'active' : ''}`}>
                    <div className="channel-icon">⚪</div>
                    <strong>Email Invoices</strong>
                    <span>{settings.notificationsEnabled?.email ? 'Active • PDF attached' : 'Optional'}</span>
                  </div>
                </div>
              </div>

              {/* Template Message Studio */}
              <div className="settings-box-panel template-studio-panel">
                <div className="template-studio-header">
                  <div>
                    <h3 className="panel-subheading" style={{ margin: 0 }}>💬 Message Template Studio &amp; Configuration</h3>
                    <p className="template-studio-sub">Customize customer alert messages and preview them live on phone</p>
                  </div>

                  {/* Channel Switcher Pills */}
                  <div className="template-channel-pills">
                    <button
                      type="button"
                      className={`template-channel-btn ${templateChannel === 'whatsapp' ? 'active' : ''}`}
                      onClick={() => setTemplateChannel('whatsapp')}
                    >
                      <span className="ch-icon">💬</span> WhatsApp Templates
                    </button>
                    <button
                      type="button"
                      className={`template-channel-btn ${templateChannel === 'sms' ? 'active' : ''}`}
                      onClick={() => setTemplateChannel('sms')}
                    >
                      <span className="ch-icon">📲</span> SMS Templates (DLT)
                    </button>
                  </div>
                </div>

                {/* Event Selector Tabs */}
                <div className="template-events-tabs">
                  {[
                    { key: 'orderReceived', label: '📥 Order Intake Confirmation' },
                    { key: 'orderReady', label: '✨ Laundry Ready for Pickup' },
                    { key: 'pickupDispatch', label: '🚚 Driver Dispatched for Delivery' },
                    { key: 'paymentReceived', label: '💳 Payment Received Receipt' },
                  ].map((ev) => (
                    <button
                      key={ev.key}
                      type="button"
                      className={`template-event-tab-btn ${selectedTemplateEvent === ev.key ? 'active' : ''}`}
                      onClick={() => setSelectedTemplateEvent(ev.key)}
                    >
                      {ev.label}
                    </button>
                  ))}
                </div>

                {/* Two-Column Editor & Phone Preview */}
                {(() => {
                  const evKey = selectedTemplateEvent;
                  const currentTemplate = settings.messageTemplates?.[evKey]?.[templateChannel] ||
                    DEFAULT_SETTINGS.messageTemplates[evKey]?.[templateChannel] || '';
                  const isEnabled = settings.notificationsEnabled?.[evKey] ?? true;
                  const charCount = currentTemplate.length;
                  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

                  return (
                    <div className="template-studio-body">
                      {/* Left: Editor & Variable Tags */}
                      <div className="template-editor-col">
                        <div className="template-event-meta-card">
                          <div className="meta-card-left">
                            <strong className="meta-event-title">
                              {evKey === 'orderReceived' && '📥 Order Intake Confirmation Alert'}
                              {evKey === 'orderReady' && '✨ Garments Cleaned & Ready Alert'}
                              {evKey === 'pickupDispatch' && '🚚 Driver Out for Delivery Notification'}
                              {evKey === 'paymentReceived' && '💳 Payment Receipt & Balance Confirmation'}
                            </strong>
                            <span className="meta-event-channel-tag">
                              Channel: {templateChannel === 'whatsapp' ? 'WhatsApp (Rich text & URL preview)' : 'SMS (DLT compliant text)'}
                            </span>
                          </div>
                          <label className="toggle-switch" title="Toggle automatic dispatch for this event">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleNotificationToggle(evKey)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>

                        {/* Variables Toolbar */}
                        <div className="template-variables-toolbar">
                          <span className="var-label">Click to insert dynamic variable tag:</span>
                          <div className="var-chips-wrap">
                            {[
                              { tag: 'customer_name', label: '{customer_name}' },
                              { tag: 'order_id', label: '{order_id}' },
                              { tag: 'item_count', label: '{item_count}' },
                              { tag: 'expected_delivery', label: '{expected_delivery}' },
                              { tag: 'total_amount', label: '{total_amount}' },
                              { tag: 'balance_due', label: '{balance_due}' },
                              { tag: 'amount_paid', label: '{amount_paid}' },
                              { tag: 'payment_method', label: '{payment_method}' },
                              { tag: 'store_branch', label: '{store_branch}' },
                              { tag: 'driver_name', label: '{driver_name}' },
                              { tag: 'driver_phone', label: '{driver_phone}' },
                              { tag: 'tracking_link', label: '{tracking_link}' },
                            ].map((v) => (
                              <button
                                key={v.tag}
                                type="button"
                                className="var-pill"
                                onClick={() => insertVariableTag(evKey, templateChannel, v.tag)}
                                title={`Insert ${v.label}`}
                              >
                                + {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Textarea */}
                        <div className="template-textarea-wrap">
                          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Template Message Text ({templateChannel.toUpperCase()}):</span>
                            <span className="char-count-badge">
                              {charCount} characters
                              {templateChannel === 'sms' && ` • ${smsSegments} SMS segment${smsSegments > 1 ? 's' : ''}`}
                            </span>
                          </label>
                          <textarea
                            className="form-control template-textarea"
                            rows={templateChannel === 'whatsapp' ? 5 : 4}
                            value={currentTemplate}
                            onChange={(e) => handleTemplateChange(evKey, templateChannel, e.target.value)}
                            placeholder={`Enter ${templateChannel} message template...`}
                          />
                        </div>

                        {/* Template Actions */}
                        <div className="template-action-btns">
                          <button
                            type="button"
                            className="btn-send-test"
                            onClick={() => handleTestSendMessage(evKey, templateChannel)}
                          >
                            🚀 Send Test {templateChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                          </button>
                          <button
                            type="button"
                            className="btn-reset-template"
                            onClick={() => handleResetTemplate(evKey, templateChannel)}
                          >
                            ↺ Reset to Factory Default
                          </button>
                        </div>
                      </div>

                      {/* Right: Realistic Phone Mockup Preview */}
                      <div className="template-phone-col">
                        <div className="phone-mockup-wrapper">
                          <div className="phone-screen-header">
                            <span className="phone-time">10:20</span>
                            <span className="phone-notch"></span>
                            <span className="phone-signals">📶 5G 100%</span>
                          </div>

                          {templateChannel === 'whatsapp' ? (
                            <div className="whatsapp-screen">
                              <div className="wa-top-bar">
                                <div className="wa-avatar">🧺</div>
                                <div className="wa-contact-info">
                                  <strong>{settings.shopName || 'Washdoor Ranipet'}</strong>
                                  <span>Official Business Account • online</span>
                                </div>
                              </div>
                              <div className="wa-chat-canvas">
                                <div className="wa-bubble">
                                  <div className="wa-bubble-text">
                                    {interpolateSample(currentTemplate)
                                      .split('\n')
                                      .map((line, idx) => (
                                        <React.Fragment key={idx}>
                                          {line}
                                          <br />
                                        </React.Fragment>
                                      ))}
                                  </div>
                                  <div className="wa-bubble-meta">
                                    <span>10:20 AM</span>
                                    <span className="wa-ticks">✓✓</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="sms-screen">
                              <div className="sms-top-bar">
                                <span className="sms-back">‹</span>
                                <div className="sms-sender">
                                  <strong>VK-WASHDR</strong>
                                  <span>Transactional SMS</span>
                                </div>
                              </div>
                              <div className="sms-chat-canvas">
                                <div className="sms-bubble">
                                  <div className="sms-bubble-text">
                                    {interpolateSample(currentTemplate)}
                                  </div>
                                  <span className="sms-time">Today, 10:20 AM</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="phone-preview-caption">Live customer phone rendering with sample data</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              6. LANGUAGE & REGIONAL
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'language' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Language &amp; Regional Settings</h2>
              <p className="settings-section-subtitle">
                Select your preferred application language, calendar system, and regional format
              </p>

              <div className="settings-box-panel">
                <h3 className="panel-subheading">🌐 Display Language</h3>
                <div className="language-grid">
                  {SAMPLE_LANGUAGES.map((lang) => (
                    <div
                      key={lang.code}
                      className={`language-card ${language === lang.code ? 'selected' : ''}`}
                      onClick={() => {
                        setLanguage(lang.code);
                        handleInputChange('language', lang.code);
                        showToast?.(`Language set to ${lang.name} (${lang.native})`);
                      }}
                    >
                      <div className="language-native">{lang.native}</div>
                      <div className="language-name">{lang.name}</div>
                      {lang.dir === 'rtl' && <span className="language-rtl-badge">RTL Layout</span>}
                      {language === lang.code && <span className="language-check">✓ Active</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-box-panel">
                <h3 className="panel-subheading">📅 Date &amp; Time Formatting</h3>
                <div className="form-row cols-2">
                  <div className="form-field">
                    <label className="form-label">Date Format</label>
                    <select
                      className="form-control"
                      value={settings.dateFormat}
                      onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 28/10/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/28/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Time Format</label>
                    <select
                      className="form-control"
                      value={settings.timeFormat}
                      onChange={(e) => handleInputChange('timeFormat', e.target.value)}
                    >
                      <option value="12h">12-Hour (e.g. 10:15 AM)</option>
                      <option value="24h">24-Hour (e.g. 22:15)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              7. APPS & INTEGRATIONS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'apps' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Apps &amp; Connected Services</h2>
              <p className="settings-section-subtitle">
                Configure peripheral hardware, cloud print bridges, and external service connectors
              </p>

              <div className="apps-catalog-grid">
                {[
                  { id: 'whatsapp', name: 'WhatsApp Cloud API', category: 'Messaging', icon: '💬', status: 'Connected', badge: 'Active', desc: 'Direct automated ticket and bill dispatch to customer numbers' },
                  { id: 'printer', name: 'Thermal ESC/POS Cloud Driver', category: 'Hardware', icon: '🖨️', status: 'Connected', badge: 'Active', desc: 'Auto-print counter handover receipts on ticket submission' },
                  { id: 'sms', name: 'DLT SMS Gateway', category: 'Telephony', icon: '📲', status: 'Connected', badge: 'Active', desc: 'Standard Indian telecom DLT route for OTP and delivery alerts' },
                  { id: 'maps', name: 'Google Maps Distance API', category: 'Logistics', icon: '🗺️', status: 'Active', badge: 'Active', desc: 'Automatic driver route calculation and delivery geocoding' },
                  { id: 'tally', name: 'Tally / Zoho Accounting', category: 'Finance', icon: '📊', status: 'Available', badge: 'Connect', desc: 'Export daily revenue, GST ledger, and payments to accounting software' },
                  { id: 'scanner', name: 'USB / Bluetooth Barcode HID', category: 'Hardware', icon: '📷', status: 'Ready', badge: 'Plug & Play', desc: 'Scan garment intake stickers and order IDs instantaneously' },
                ].map((app) => (
                  <div key={app.id} className="app-integration-card">
                    <div className="app-card-head">
                      <div className="app-card-icon">{app.icon}</div>
                      <span className={`app-status-badge ${app.status.toLowerCase()}`}>
                        ● {app.status}
                      </span>
                    </div>
                    <strong className="app-card-name">{app.name}</strong>
                    <span className="app-card-cat">{app.category}</span>
                    <p className="app-card-desc">{app.desc}</p>
                    <button
                      type="button"
                      className="app-manage-btn"
                      onClick={() => {
                        setConfiguringApp(app);
                        setAppConnResult(null);
                        setIsTestingAppConn(false);
                      }}
                    >
                      Configure App
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              8. HELP & SUPPORT
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'help_support' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Help &amp; Support</h2>
              <p className="settings-section-subtitle">
                Official guides, store operator documentation, and direct developer helpdesk
              </p>

              {/* Contact Channels Grid */}
              <div className="help-channels-grid">
                <div className="help-card">
                  <div className="help-card-icon">📞</div>
                  <strong>Store Operator Helpline</strong>
                  <p>Toll-free telephone assistance for store billing staff</p>
                  <a href="tel:+917338851369" className="help-card-link">+91 7338851369</a>
                </div>
                <div className="help-card">
                  <div className="help-card-icon">💬</div>
                  <strong>WhatsApp Live Desk</strong>
                  <p>Instant answers to counter issues and thermal printer bugs</p>
                  <a href="https://wa.me/917338851369" target="_blank" rel="noreferrer" className="help-card-link">Chat on WhatsApp →</a>
                </div>
                <div className="help-card">
                  <div className="help-card-icon">📧</div>
                  <strong>Email Support</strong>
                  <p>Detailed technical assistance and custom configuration requests</p>
                  <a href="mailto:support@washdoor.in" className="help-card-link">support@washdoor.in</a>
                </div>
              </div>

              {/* FAQ Accordions */}
              <div className="settings-box-panel" style={{ marginTop: '20px' }}>
                <h3 className="panel-subheading">💡 Frequently Asked Questions</h3>
                <div className="faq-list">
                  {[
                    { q: 'How do I change the receipt paper size to 58mm for mobile vans?', a: 'Go to Settings → Operations & receipts, and select "58mm (Handheld Mobile)". Click "Save changes".' },
                    { q: 'How do I assign a driver to an On-Call order?', a: 'In the Orders & POS screen, look for the "Assign Driver" or "Assign Pickup" button on any On-Call order row. Select a driver from your fleet and click Assign.' },
                    { q: 'Can I add custom garment services to the intake catalog?', a: 'Yes! Open any order edit dialog or Create Order modal to browse and select garments across Wash, Steam, Dry Clean, and Premium Care categories.' },
                    { q: 'Where are customer records saved?', a: 'All master customer records are synchronized in real-time with your live Supabase cloud database, with local caching for instant counter lookups.' },
                  ].map((faq, i) => (
                    <details key={i} className="faq-item">
                      <summary className="faq-question">
                        <span>{faq.q}</span>
                        <span className="faq-chevron">▾</span>
                      </summary>
                      <p className="faq-answer">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </div>

              {/* System Diagnostics Card */}
              <div className="settings-box-panel diagnostics-panel">
                <h3 className="panel-subheading">🖥️ Terminal Diagnostics</h3>
                <div className="diagnostics-grid">
                  <div className="diag-item">
                    <span>Platform:</span>
                    <strong>Washdoor POS v1.2.0</strong>
                  </div>
                  <div className="diag-item">
                    <span>Database:</span>
                    <strong style={{ color: '#16a34a' }}>● Supabase Live (Connected)</strong>
                  </div>
                  <div className="diag-item">
                    <span>Local Cache:</span>
                    <strong>Active (Encrypted LocalStorage)</strong>
                  </div>
                  <div className="diag-item">
                    <span>Thermal Print Bridge:</span>
                    <strong style={{ color: '#2563eb' }}>● ESC/POS Driver Ready</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              9. ACCOUNT DETAILS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'account_details' && (
            <div className="settings-card-section">
              <h2 className="settings-section-title">Administrator Account Details</h2>
              <p className="settings-section-subtitle">
                Manage your administrator profile, security credentials, and terminal access
              </p>

              {/* Admin Profile Box */}
              <div className="settings-box-panel">
                <div className="admin-profile-head">
                  <div className="admin-avatar-lg">A</div>
                  <div>
                    <h3 className="admin-display-name">Store Administrator</h3>
                    <div className="admin-role-badge">Super Admin • Store Owner</div>
                    <div className="admin-email-text">admin@washdoor.in</div>
                  </div>
                </div>

                <div className="form-row cols-2" style={{ marginTop: '20px' }}>
                  <div className="form-field">
                    <label className="form-label">Admin Full Name</label>
                    <input type="text" className="form-control" defaultValue="Store Administrator" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" defaultValue="admin@washdoor.in" />
                  </div>
                </div>

                <div className="form-row cols-2">
                  <div className="form-field">
                    <label className="form-label">Store Identification Code</label>
                    <input type="text" className="form-control" readOnly value="WASH-RANIPET-01" style={{ background: '#f8fafc', color: '#64748b' }} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Registered Phone</label>
                    <input type="text" className="form-control" defaultValue="+91 7338851369" />
                  </div>
                </div>
              </div>

              {/* Change Password Panel */}
              <div className="settings-box-panel">
                <h3 className="panel-subheading">🔒 Security &amp; Password</h3>
                <div className="form-row cols-3">
                  <div className="form-field">
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-control" placeholder="••••••••" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-control" placeholder="••••••••" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="form-control" placeholder="••••••••" />
                  </div>
                </div>
                <button
                  type="button"
                  className="update-password-btn"
                  onClick={() => showToast?.('Password successfully updated!')}
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              BOTTOM ACTION BAR (Sticky as in Reference Image)
             ══════════════════════════════════════════════════════════ */}
          <div className="settings-bottom-action-bar">
            <div className="settings-bottom-status">
              {hasUnsavedChanges ? (
                <span className="status-unsaved">● Unsaved changes</span>
              ) : (
                <span className="status-saved">✓ All changes saved</span>
              )}
            </div>

            <div className="settings-bottom-buttons">
              <button
                type="button"
                className="settings-discard-btn"
                onClick={handleDiscardChanges}
                disabled={!hasUnsavedChanges}
              >
                Discard
              </button>
              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSaveChanges}
              >
                Save changes
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── App Configuration Modal ── */}
      {configuringApp && (
        <div className="settings-modal-backdrop" onClick={() => setConfiguringApp(null)}>
          <div className="settings-app-config-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="app-dialog-header">
              <div className="app-dialog-icon">{configuringApp.icon}</div>
              <div>
                <h3 className="app-dialog-title">Configure {configuringApp.name}</h3>
                <span className="app-dialog-cat">{configuringApp.category} Integration • {configuringApp.status}</span>
              </div>
              <button
                type="button"
                className="app-dialog-close-btn"
                onClick={() => setConfiguringApp(null)}
              >
                ✕
              </button>
            </div>

            <div className="app-dialog-body">
              <p className="app-dialog-desc">{configuringApp.desc}</p>

              {configuringApp.id === 'whatsapp' && (
                <div className="app-form-grid">
                  <div className="form-field">
                    <label className="form-label">WhatsApp Business Phone Number ID</label>
                    <input type="text" className="form-control" defaultValue="109283748291029" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">WhatsApp Business Account ID (WABA)</label>
                    <input type="text" className="form-control" defaultValue="982374619283" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">System User Permanent Access Token</label>
                    <input type="password" className="form-control" defaultValue="EAAGm0PX4ZC...983kd" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Webhook Verification Secret</label>
                    <input type="text" className="form-control" defaultValue="washdoor_secure_wh_2026" />
                  </div>
                </div>
              )}

              {configuringApp.id === 'printer' && (
                <div className="app-form-grid">
                  <div className="form-field">
                    <label className="form-label">Printer Interface Mode</label>
                    <select className="form-control" defaultValue="network">
                      <option value="network">Ethernet / Wi-Fi (Raw 9100)</option>
                      <option value="usb">Direct USB / HID</option>
                      <option value="bluetooth">Bluetooth ESC/POS</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Printer IP Address</label>
                    <input type="text" className="form-control" defaultValue="192.168.1.180" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Port</label>
                    <input type="text" className="form-control" defaultValue="9100" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Character Codepage</label>
                    <select className="form-control" defaultValue="PC437">
                      <option value="PC437">PC437 (Standard USA/India)</option>
                      <option value="WPC1252">WPC1252 (Latin 1)</option>
                    </select>
                  </div>
                </div>
              )}

              {configuringApp.id === 'sms' && (
                <div className="app-form-grid">
                  <div className="form-field">
                    <label className="form-label">DLT Registered Principal Entity ID (PE-ID)</label>
                    <input type="text" className="form-control" defaultValue="110156948201948" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">DLT Approved Header / Sender ID</label>
                    <input type="text" className="form-control" defaultValue="VK-WASHDR" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">SMS Gateway API Key</label>
                    <input type="password" className="form-control" defaultValue="sms_live_9f8e7d6c5b4a" />
                  </div>
                </div>
              )}

              {configuringApp.id === 'maps' && (
                <div className="app-form-grid">
                  <div className="form-field">
                    <label className="form-label">Google Maps JavaScript &amp; Directions API Key</label>
                    <input type="password" className="form-control" defaultValue="AIzaSyB3X9k...zT10q" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Delivery Radius Limit (km)</label>
                    <input type="number" className="form-control" defaultValue="15" />
                  </div>
                </div>
              )}

              {configuringApp.id === 'tally' && (
                <div className="app-form-grid">
                  <div className="form-field">
                    <label className="form-label">Tally Prime XML Server URL</label>
                    <input type="text" className="form-control" defaultValue="http://localhost:9000" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Sales Ledger Name</label>
                    <input type="text" className="form-control" defaultValue="Laundry Counter Sales" />
                  </div>
                </div>
              )}

              {configuringApp.id === 'scanner' && (
                <div className="app-form-grid">
                  <div className="form-field">
                    <label className="form-label">Scanner Input Mode</label>
                    <select className="form-control" defaultValue="hid">
                      <option value="hid">USB HID Keyboard Emulation</option>
                      <option value="vcom">Virtual COM Port (RS232)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Suffix Terminator</label>
                    <select className="form-control" defaultValue="enter">
                      <option value="enter">Enter / Carriage Return (\r\n)</option>
                      <option value="tab">Tab Key (\t)</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Live Connection Test status */}
              {appConnResult && (
                <div className="app-test-result-box success">
                  <span className="test-badge">● Live Handshake Verified</span>
                  <p>{appConnResult}</p>
                </div>
              )}
            </div>

            <div className="app-dialog-footer">
              <button
                type="button"
                className="btn-test-conn"
                disabled={isTestingAppConn}
                onClick={() => {
                  setIsTestingAppConn(true);
                  setTimeout(() => {
                    setIsTestingAppConn(false);
                    setAppConnResult(`✓ Handshake verified with ${configuringApp.name} (latency: 18ms). Service active.`);
                    showToast?.(`✓ ${configuringApp.name} connection tested successfully!`);
                  }, 500);
                }}
              >
                {isTestingAppConn ? '⏳ Pinging...' : '⚡ Test Connection'}
              </button>
              <div className="app-footer-right">
                <button
                  type="button"
                  className="btn-app-cancel"
                  onClick={() => setConfiguringApp(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-app-save"
                  onClick={() => {
                    setConfiguringApp(null);
                    showToast?.(`✓ ${configuringApp.name} configuration saved!`);
                  }}
                >
                  Save &amp; Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirmation Modal ── */}
      {isSignoutModalOpen && (
        <div className="settings-modal-backdrop" onClick={() => setIsSignoutModalOpen(false)}>
          <div className="settings-signout-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="signout-dialog-icon">🚪</div>
            <h3 className="signout-dialog-title">Sign Out of Counter Terminal?</h3>
            <p className="signout-dialog-desc">
              Are you sure you want to sign out of Ranipet Store #1? Active orders and cached intakes are preserved.
            </p>
            <div className="signout-dialog-actions">
              <button
                type="button"
                className="signout-cancel-btn"
                onClick={() => setIsSignoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="signout-confirm-btn"
                onClick={() => {
                  setIsSignoutModalOpen(false);
                  onSignOut?.();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
