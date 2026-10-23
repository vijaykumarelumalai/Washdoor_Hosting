// src/components/CustomerForm.jsx
// Form matching washdoor_create_order_updated.html

import React, { useState } from 'react';
import { validateCustomer } from '../utils/validation';

export default function CustomerForm({
  initialCustomer = null,
  initialOrderType = 'walk-in',
  onBack,
  onSubmit,
  isSubmitting = false,
}) {
  // Primary customer fields
  const [customerName, setCustomerName] = useState(initialCustomer?.customer_name || '');
  const [mobileNumber, setMobileNumber] = useState(initialCustomer?.mobile_number || '');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [taxExemption, setTaxExemption] = useState(initialCustomer?.tax_exemption || false);

  // Order preferences & Intake method
  const [intakeMethod, setIntakeMethod] = useState(initialOrderType || 'walk-in');
  const [orderPreference, setOrderPreference] = useState('');
  const [orderPreferenceNotes, setOrderPreferenceNotes] = useState('');

  // Expandable details state
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Communication preferences
  const [communicationPref, setCommunicationPref] = useState(
    initialCustomer?.communication_pref || (initialCustomer?.dnd ? 'none' : '')
  );
  const [communicationLang, setCommunicationLang] = useState(initialCustomer?.communication_lang || '');
  const [dnd, setDnd] = useState(initialCustomer?.dnd || false);
  const [internalComments, setInternalComments] = useState(initialCustomer?.internal_comments || '');

  // Customer & Membership
  const [defaultDiscount, setDefaultDiscount] = useState(initialCustomer?.default_discount || '');
  const [referralCode, setReferralCode] = useState(initialCustomer?.referral_code || '');
  const [marketingSource, setMarketingSource] = useState(initialCustomer?.marketing_source || '');
  const [membershipId, setMembershipId] = useState(initialCustomer?.membership_id || '');

  // Profile & Service settings
  const [customerClassification, setCustomerClassification] = useState(initialCustomer?.customer_classification || 'regular');
  const [customerStatus, setCustomerStatus] = useState(initialCustomer?.customer_status || 'active');
  const [priceList, setPriceList] = useState(initialCustomer?.price_list || '');
  const [serviceZone, setServiceZone] = useState(initialCustomer?.service_zone || '');
  const [creditLimit, setCreditLimit] = useState(initialCustomer?.credit_limit || '');
  const [anniversaryDate, setAnniversaryDate] = useState(initialCustomer?.anniversary_date || '');
  const [specialOccasion, setSpecialOccasion] = useState(initialCustomer?.special_occasion || '');
  const [specialOccasionDate, setSpecialOccasionDate] = useState(initialCustomer?.special_occasion_date || '');

  // Contact & Address Details
  const [alternatePhone, setAlternatePhone] = useState(initialCustomer?.alternate_phone || '');
  const [gstNumber, setGstNumber] = useState(initialCustomer?.gst_number || '');
  const [companyName, setCompanyName] = useState(initialCustomer?.company_name || '');
  const [email, setEmail] = useState(initialCustomer?.email || '');
  const [city, setCity] = useState(initialCustomer?.city || '');
  const [pincode, setPincode] = useState(initialCustomer?.pincode || '');
  const [dob, setDob] = useState(initialCustomer?.date_of_birth || '');
  const [mapLink, setMapLink] = useState(initialCustomer?.map_link || '');
  const [customerNotes, setCustomerNotes] = useState(initialCustomer?.notes || '');

  // Validation errors
  const [errors, setErrors] = useState({});

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(val);
    if (val.length === 10) {
      setErrors((prev) => ({ ...prev, mobile_number: null }));
    }
  };

  const handleAlternatePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setAlternatePhone(val);
  };

  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const customerData = {
      customer_name: customerName,
      mobile_number: mobileNumber,
      alternate_phone: alternatePhone,
      address,
      city,
      pincode,
      date_of_birth: dob,
      map_link: mapLink,
      email,
      gst_number: gstNumber,
      company_name: companyName,
      tax_exemption: taxExemption,
      notes: customerNotes,
      communication_pref: communicationPref,
      communication_lang: communicationLang,
      dnd,
      internal_comments: internalComments,
      default_discount: defaultDiscount,
      referral_code: referralCode,
      marketing_source: marketingSource,
      membership_id: membershipId,
      customer_classification: customerClassification,
      customer_status: customerStatus,
      price_list: priceList,
      service_zone: serviceZone,
      credit_limit: creditLimit,
      anniversary_date: anniversaryDate,
      special_occasion: specialOccasion,
      special_occasion_date: specialOccasionDate,
    };

    const validationErrors = validateCustomer(customerData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    onSubmit({
      customerData,
      orderType: intakeMethod,
      orderPreference,
      orderPreferenceNotes,
      existingCustomerId: initialCustomer?.id || null,
    });
  };

  return (
    <form className="new-form show" id="newCustomerForm" onSubmit={handleSubmit}>
      {/* ── Primary Form Grid ── */}
      <div className="form-grid">
        <div className={`field ${errors.customer_name ? 'invalid' : ''}`} id="nameField">
          <label htmlFor="fullName">Customer name *</label>
          <input
            id="fullName"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Enter full name"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, customer_name: null }));
              }
            }}
          />
          <span className="field-error" id="nameError">
            {errors.customer_name || 'Customer name is required.'}
          </span>
        </div>

        <div className={`field ${errors.mobile_number ? 'invalid' : ''}`} id="phoneField">
          <label htmlFor="phone">Mobile number *</label>
          <input
            id="phone"
            required
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            minLength={10}
            maxLength={10}
            autoComplete="tel-national"
            placeholder="Enter 10-digit mobile number"
            value={mobileNumber}
            onChange={handleMobileChange}
          />
          <span className="field-error" id="phoneError">
            {errors.mobile_number || 'Enter a valid 10-digit mobile number.'}
          </span>
        </div>

        <div className="field address-field">
          <label htmlFor="addressInput">Street, Area (optional)</label>
          <input
            id="addressInput"
            autoComplete="street-address"
            placeholder="Street, area, city"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      {/* ── Tax Exemption Row ── */}
      <label className="tax-exemption-row" htmlFor="taxExemption">
        <input
          type="checkbox"
          id="taxExemption"
          name="taxExemption"
          checked={taxExemption}
          onChange={(e) => setTaxExemption(e.target.checked)}
        />
        <span>Tax Exemption (optional)</span>
      </label>

      {/* ── Intake Options ── */}
      <div className="intake-options" role="group" aria-label="Order intake method">
        <button
          type="button"
          className={`intake-option ${intakeMethod === 'walk-in' ? 'active' : ''}`}
          onClick={() => setIntakeMethod('walk-in')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <circle cx="12" cy="5" r="3"></circle>
            <path d="M12 8v8l-3 4"></path>
            <path d="M12 14l3 4"></path>
            <path d="M9 12l6-2"></path>
          </svg>
          Walk-In (Store Drop)
        </button>
        <button
          type="button"
          className={`intake-option ${intakeMethod === 'on-call' ? 'active' : ''}`}
          onClick={() => setIntakeMethod('on-call')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          On-Call (Pickup)
        </button>
      </div>

      {/* ── Additional Customer Details (Collapsible) ── */}
      <section className={`details-card ${detailsOpen ? 'open' : ''}`} id="additionalDetails">
        <button
          type="button"
          className="details-toggle"
          id="detailsToggle"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(!detailsOpen)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9290ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span className="details-label">
            Additional Customer Details (GST, Company, Email, Notes)
          </span>
          <span className="expand-label" id="expandLabel">
            {detailsOpen ? 'Hide' : 'Expand'}
          </span>
          <span className="chevron" aria-hidden="true">⌄</span>
        </button>

        {detailsOpen && (
          <div className="details-content" id="detailsContent">
            <div className="details-fields">
              {/* Communication Preferences */}
              <div className="details-section-title">Communication Preferences</div>
              <div className="field">
                <label htmlFor="communicationPreference">Communication Preference (optional)</label>
                <select
                  id="communicationPreference"
                  value={communicationPref}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCommunicationPref(val);
                    setDnd(val === 'none');
                  }}
                >
                  <option value="">Select communication method</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone call</option>
                  <option value="none">No communication (DND)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="communicationLanguage">Preferred Communication Language</label>
                <select
                  id="communicationLanguage"
                  value={communicationLang}
                  onChange={(e) => setCommunicationLang(e.target.value)}
                >
                  <option value="">Select language</option>
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                  <option value="ml">Malayalam</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="internalComments">Internal Comments (staff only)</label>
                <textarea
                  id="internalComments"
                  placeholder="VIP customer, fraud alert, handling notes…"
                  value={internalComments}
                  onChange={(e) => setInternalComments(e.target.value)}
                />
              </div>

              {/* Customer & Membership */}
              <div className="details-section-title">Customer &amp; Membership</div>
              <div className="field">
                <label htmlFor="defaultDiscount">Default Discount (%)</label>
                <input
                  id="defaultDiscount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  value={defaultDiscount}
                  onChange={(e) => setDefaultDiscount(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="referralCode">Referral Code (optional)</label>
                <input
                  id="referralCode"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="marketingSource">Marketing Source (optional)</label>
                <select
                  id="marketingSource"
                  value={marketingSource}
                  onChange={(e) => setMarketingSource(e.target.value)}
                >
                  <option value="">Select source</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Referral">Referral</option>
                  <option value="Google">Google</option>
                  <option value="Social media">Social media</option>
                  <option value="Advertisement">Advertisement</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="membershipId">Membership ID (optional)</label>
                <input
                  id="membershipId"
                  placeholder="Assigned membership ID"
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                />
              </div>

              {/* Customer Profile & Service Settings */}
              <div className="details-section-title">Customer Profile &amp; Service Settings</div>
              <div className="field">
                <label htmlFor="customerClassification">Customer Classification</label>
                <select
                  id="customerClassification"
                  value={customerClassification}
                  onChange={(e) => setCustomerClassification(e.target.value)}
                >
                  <option value="regular">Regular Customer</option>
                  <option value="vip">VIP Customer</option>
                  <option value="fraud">Fraud / Review Required</option>
                  <option value="corporate">Corporate Customer</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="customerStatus">Customer Status</label>
                <select
                  id="customerStatus"
                  value={customerStatus}
                  onChange={(e) => setCustomerStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
                <small>Historical orders and financial records should be retained when archiving.</small>
              </div>
              <div className="field">
                <label htmlFor="priceList">Specific Price List</label>
                <select
                  id="priceList"
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                >
                  <option value="">Use default price list</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="corporate">Corporate</option>
                  <option value="custom">Custom (configure in price lists)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="serviceZone">Area Service Zone</label>
                <select
                  id="serviceZone"
                  value={serviceZone}
                  onChange={(e) => setServiceZone(e.target.value)}
                >
                  <option value="">Select service zone</option>
                  <option value="zone-1">Zone 1</option>
                  <option value="zone-2">Zone 2</option>
                  <option value="zone-3">Zone 3</option>
                  <option value="outside-zone">Outside service zone</option>
                </select>
                <small>Replace sample zones with configured delivery zones.</small>
              </div>
              <div className="field">
                <label htmlFor="creditLimit">Credit Limit (₹)</label>
                <input
                  id="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
                <small>Set only by authorized staff when postpaid credit is enabled.</small>
              </div>
              <div className="field">
                <label htmlFor="customerIdDisplay">Customer ID</label>
                <input
                  id="customerIdDisplay"
                  placeholder={initialCustomer?.id ? `ID #${initialCustomer.id}` : 'Assigned automatically by database'}
                  disabled
                />
                <small>Stable ID generated by Supabase PostgreSQL; display-only.</small>
              </div>
              <div className="field">
                <label htmlFor="anniversaryDate">Anniversary Date (optional)</label>
                <input
                  id="anniversaryDate"
                  type="date"
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="specialOccasion">Other Special Occasion (optional)</label>
                <input
                  id="specialOccasion"
                  placeholder="e.g. birthday, occasion name"
                  value={specialOccasion}
                  onChange={(e) => setSpecialOccasion(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="specialOccasionDate">Special Occasion Date (optional)</label>
                <input
                  id="specialOccasionDate"
                  type="date"
                  value={specialOccasionDate}
                  onChange={(e) => setSpecialOccasionDate(e.target.value)}
                />
              </div>

              {/* Customer Insights (read-only) */}
              <div className="details-section-title">Customer Insights (read-only)</div>
              <div className="insights-grid">
                <div className="insight-card">
                  <span className="insight-label">Customer-wise Sales</span>
                  <span className="insight-value" id="customerSales">
                    {initialCustomer ? '₹4,890.00' : '—'}
                  </span>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Customer Due Report</span>
                  <span className="insight-value" id="customerDue">
                    {initialCustomer ? '₹0.00' : '—'}
                  </span>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Customer Wallet</span>
                  <span className="insight-value" id="customerWallet">
                    {initialCustomer ? `₹${Number(initialCustomer.wallet_balance || 0).toFixed(0)}` : '—'}
                  </span>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Last Visits</span>
                  <span className="insight-value" id="customerLastVisit">
                    {initialCustomer ? '3 days ago' : '—'}
                  </span>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Order Frequency</span>
                  <span className="insight-value" id="customerFrequency">
                    {initialCustomer ? '3.2/month' : '—'}
                  </span>
                </div>
              </div>
              <p className="insight-note">
                These values are computed live from customer orders, ledger, and wallet history.
              </p>

              {/* Customer History (read-only) */}
              <div className="details-section-title">Customer History (read-only)</div>
              <div className="field">
                <label htmlFor="orderHistory">Order History</label>
                <textarea
                  id="orderHistory"
                  readOnly
                  placeholder="Customer orders, status, and payment position will appear here."
                  value={initialCustomer ? `${initialCustomer.orders?.[0]?.count || 0} completed counter orders` : ''}
                />
              </div>
              <div className="field">
                <label htmlFor="complaintHistory">Complaint History</label>
                <textarea
                  id="complaintHistory"
                  readOnly
                  placeholder="Linked complaints and manual resolution notes will appear here."
                  value={initialCustomer ? 'No active complaints logged.' : ''}
                />
              </div>
              <div className="field">
                <label htmlFor="activeMembership">Active Customer Plan / Membership</label>
                <textarea
                  id="activeMembership"
                  readOnly
                  placeholder="Plan, validity, and remaining entitlement will appear here."
                  value={initialCustomer ? `Tier: ${initialCustomer.tier || 'PLATINUM ELITE'} (Active)` : ''}
                />
              </div>

              {/* Contact & Address Details */}
              <div className="details-section-title">Contact &amp; Address Details</div>
              <div className={`field ${errors.alternate_phone ? 'invalid' : ''}`} id="alternatePhoneField">
                <label htmlFor="alternatePhone">Alternate Phone No (optional)</label>
                <input
                  id="alternatePhone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="Enter 10-digit alternate number"
                  value={alternatePhone}
                  onChange={handleAlternatePhoneChange}
                />
                {errors.alternate_phone && (
                  <span className="field-error">{errors.alternate_phone}</span>
                )}
              </div>
              <div className="field">
                <label htmlFor="gstNumber">GST Number (optional)</label>
                <input
                  id="gstNumber"
                  placeholder="Enter GST number"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="companyName">Company name (optional)</label>
                <input
                  id="companyName"
                  placeholder="Enter company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className={`field ${errors.email ? 'invalid' : ''}`}>
                <label htmlFor="customerEmail">Email (optional)</label>
                <input
                  id="customerEmail"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="field">
                <label htmlFor="city">City (optional)</label>
                <input
                  id="city"
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className={`field ${errors.pincode ? 'invalid' : ''}`} id="pincodeField">
                <label htmlFor="pincode">Pincode (optional)</label>
                <input
                  id="pincode"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  value={pincode}
                  onChange={handlePincodeChange}
                />
                {errors.pincode && <span className="field-error">{errors.pincode}</span>}
              </div>
              <div className="field">
                <label htmlFor="dob">Date of Birth (optional)</label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className={`field ${errors.map_link ? 'invalid' : ''}`}>
                <label htmlFor="mapLink">Map Link (optional)</label>
                <input
                  id="mapLink"
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                />
                {errors.map_link && <span className="field-error">{errors.map_link}</span>}
              </div>
              <div className="field">
                <label htmlFor="customerNotes">Notes (optional)</label>
                <textarea
                  id="customerNotes"
                  placeholder="Add any customer notes"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Form Actions ── */}
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          id="cancelNew"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </button>
        <button
          type="submit"
          className="create"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving Order…' : 'Save Order'}
        </button>
      </div>
    </form>
  );
}
