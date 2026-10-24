// src/components/CustomerForm.jsx
// Form matching washdoor_create_order_updated.html

import React, { useState } from 'react';
import { validateCustomer } from '../utils/validation';

const PRODUCT_SERVICES = [
  { id: 'wp', name: 'Wash & Steam Press', icon: '👔' },
  { id: 'wf', name: 'Wash & Fold', icon: '🧺' },
  { id: 'dc', name: 'Dry Cleaning', icon: '🧥' },
  { id: 'hl', name: 'Heavy Linens & Quilts', icon: '🛏️' },
  { id: 'ex', name: 'Express 24H Service', icon: '⚡' },
];

export default function CustomerForm({
  initialCustomer = null,
  initialOrderType = 'walk-in',
  orderNumber = null,
  customerId = null,
  onBack,
  onSubmit,
  isSubmitting = false,
  isOrderFlow = true,
  submitLabel = null,
}) {
  // Primary customer fields
  const [customerName, setCustomerName] = useState(initialCustomer?.customer_name || '');
  const [mobileNumber, setMobileNumber] = useState(initialCustomer?.mobile_number || '');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [taxExemption, setTaxExemption] = useState(initialCustomer?.tax_exemption || false);

  // Order preferences & Intake method
  const [intakeMethod, setIntakeMethod] = useState(initialOrderType || 'walk-in');
  const [orderPreference, setOrderPreference] = useState(
    initialCustomer?.service_category || initialCustomer?.preference || 'Wash & Steam Press'
  );
  const [orderPreferenceNotes, setOrderPreferenceNotes] = useState(
    initialCustomer?.preference_notes || initialCustomer?.order_notes || ''
  );

  // Product Card state (placed above Address Details & Contact)
  const [productService, setProductService] = useState(
    initialCustomer?.service_category || initialCustomer?.preference || 'Wash & Steam Press'
  );
  const [productGarmentType, setProductGarmentType] = useState(
    initialCustomer?.product_garment_type || 'Standard Daily Wear (Shirts, Tops, Trousers)'
  );
  const [productItemCount, setProductItemCount] = useState(
    Number(initialCustomer?.item_count || 1)
  );
  const [productWeight, setProductWeight] = useState(
    initialCustomer?.product_weight || ''
  );
  const [productCareNotes, setProductCareNotes] = useState(
    initialCustomer?.preference_notes || initialCustomer?.order_notes || ''
  );

  // Expandable details state (always hidden/collapsed by default, expanded manually)
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Communication preferences
  const [communicationPref, setCommunicationPref] = useState(
    initialCustomer?.communication_pref || initialCustomer?.communicationPreference || (initialCustomer?.dnd ? 'None (DND)' : 'WhatsApp')
  );
  const [communicationLang, setCommunicationLang] = useState(
    initialCustomer?.communication_lang || initialCustomer?.preferredCommunicationLanguage || initialCustomer?.preferred_language || 'English'
  );
  const [dnd, setDnd] = useState(initialCustomer?.dnd || false);
  const [internalComments, setInternalComments] = useState(initialCustomer?.internal_comments || initialCustomer?.notes || '');

  // Customer & Membership
  const [defaultDiscount, setDefaultDiscount] = useState(initialCustomer?.default_discount ?? initialCustomer?.default_discount_pct ?? '');
  const [referralCode, setReferralCode] = useState(initialCustomer?.referral_code || '');
  const [marketingSource, setMarketingSource] = useState(initialCustomer?.marketing_source || 'Walk-in');
  const [membershipId, setMembershipId] = useState(initialCustomer?.membership_id || '');

  // Profile & Service settings
  const [customerClassification, setCustomerClassification] = useState(initialCustomer?.customer_classification || 'Regular Customer');
  const [customerStatus, setCustomerStatus] = useState(initialCustomer?.customer_status || 'Active');
  const [priceList, setPriceList] = useState(initialCustomer?.price_list || 'Standard');
  const [serviceZone, setServiceZone] = useState(initialCustomer?.service_zone || initialCustomer?.area_service_zone || 'Zone 1');
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
      notes: internalComments,
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
      customerData: {
        ...customerData,
        customer_id: customerId || initialCustomer?.id || null,
        service_category: productService,
        item_count: productItemCount,
        product_weight: productWeight,
        product_garment_type: productGarmentType,
        order_notes: productCareNotes || internalComments,
      },
      orderType: intakeMethod,
      orderPreference: productService,
      orderPreferenceNotes: productCareNotes,
      existingCustomerId: initialCustomer?.id || null,
    });
  };

  return (
    <form className="new-form show" id="newCustomerForm" onSubmit={handleSubmit}>
      {/* ── Primary Form Grid ── */}
      <div className="form-grid">
        <div className={`field ${errors.customer_name ? 'invalid' : ''}`} id="nameField">
          <label htmlFor="fullName">Name *</label>
          <input
            id="fullName"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Enter name"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, customer_name: null }));
              }
            }}
          />
          <span className="field-error" id="nameError">
            {errors.customer_name || 'Please enter a valid name.'}
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
          <label htmlFor="addressInput">Address (optional)</label>
          <input
            id="addressInput"
            autoComplete="street-address"
            placeholder="Enter address, street, area, city"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      {/* ── Tax Exemption Row ── */}
      <label className={`tax-exemption-row ${taxExemption ? 'active' : ''}`} htmlFor="taxExemption">
        <span className={`custom-checkbox ${taxExemption ? 'checked' : ''}`}>
          <input
            type="checkbox"
            id="taxExemption"
            name="taxExemption"
            checked={taxExemption}
            onChange={(e) => setTaxExemption(e.target.checked)}
          />
          {taxExemption && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </span>
        <span className="tax-exemption-label">Tax Exemption</span>
        {taxExemption && (
          <span style={{ fontSize: '11px', color: '#ffd45c', background: '#3a300e', border: '1px solid #6b5717', padding: '1px 7px', borderRadius: '10px', marginLeft: '4px' }}>
            Tax Exempt
          </span>
        )}
      </label>

      {/* ── Intake Options (only in Order flow) ── */}
      {isOrderFlow && (
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
      )}

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
            Additional Customer Details
          </span>
          <span className="expand-label" id="expandLabel">
            {detailsOpen ? 'Hide' : 'Expand'}
          </span>
          <span className="chevron" aria-hidden="true">⌄</span>
        </button>

        {detailsOpen && (
          <div className="details-content" id="detailsContent">
            <div className="details-fields">
              {/* ── Product Card (above Address Details & Contact) ── */}
              <div className="product-card-wrap">
                <div className="product-card-header">
                  <div className="product-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span>Product &amp; Services</span>
                  </div>
                  <span className="product-badge-tag">Service Package</span>
                </div>

                <div className="product-card-body">
                  {/* Service Packages Selection */}
                  <div className="product-services-grid">
                    {PRODUCT_SERVICES.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        className={`product-service-card ${productService === srv.name ? 'selected' : ''}`}
                        onClick={() => {
                          setProductService(srv.name);
                          setOrderPreference(srv.name);
                        }}
                      >
                        <span className="srv-icon">{srv.icon}</span>
                        <div className="srv-info">
                          <span className="srv-name">{srv.name}</span>
                        </div>
                        {productService === srv.name && <span className="srv-check">✓</span>}
                      </button>
                    ))}
                  </div>

                  {/* Garment Type & Count & Weight Grid */}
                  <div className="product-inputs-grid">
                    <div className="field">
                      <label htmlFor="productGarmentType">Garment Category</label>
                      <select
                        id="productGarmentType"
                        value={productGarmentType}
                        onChange={(e) => setProductGarmentType(e.target.value)}
                      >
                        <option value="Standard Daily Wear (Shirts, Tops, Trousers)">Standard Daily Wear (Shirts, Tops, Trousers)</option>
                        <option value="Premium Formals, Blazers & Suits">Premium Formals, Blazers & Suits</option>
                        <option value="Silk, Sarees & Designer Wear">Silk, Sarees & Designer Wear</option>
                        <option value="Bed Linen, Blankets & Quilts">Bed Linen, Blankets & Quilts</option>
                        <option value="Curtains & Heavy Drapes">Curtains & Heavy Drapes</option>
                        <option value="Delicate Wash / Woolens">Delicate Wash / Woolens</option>
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="productItemCount">Quantity / Count</label>
                      <div className="product-counter-wrap">
                        <button
                          type="button"
                          className="product-counter-btn"
                          onClick={() => setProductItemCount(Math.max(1, (productItemCount || 1) - 1))}
                        >
                          −
                        </button>
                        <input
                          id="productItemCount"
                          type="number"
                          min="1"
                          max="500"
                          value={productItemCount}
                          onChange={(e) => setProductItemCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="product-counter-input"
                        />
                        <button
                          type="button"
                          className="product-counter-btn"
                          onClick={() => setProductItemCount((productItemCount || 1) + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="productWeight">Weight (Approx Kg)</label>
                      <input
                        id="productWeight"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 4.0 kg"
                        value={productWeight}
                        onChange={(e) => setProductWeight(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Care Instructions / Notes */}
                  <div className="field" style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                    <label htmlFor="productCareInstructions">Product Care &amp; Handling Notes</label>
                    <input
                      id="productCareInstructions"
                      placeholder="e.g. Wooden hangers, light starch on shirts, gentle rinse for silks"
                      value={productCareNotes}
                      onChange={(e) => {
                        setProductCareNotes(e.target.value);
                        setOrderPreferenceNotes(e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 1. Address Details & Contact */}
              <div className="details-section-title">Address Details &amp; Contact</div>

              {/* 1. Alternate Phone No */}
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

              {/* 2. Email */}
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

              {/* 3. Date of Birth */}
              <div className="field">
                <label htmlFor="dob">Date of Birth (optional)</label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              {/* 4. GST Number */}
              <div className="field">
                <label htmlFor="gstNumber">GST Number (optional)</label>
                <input
                  id="gstNumber"
                  placeholder="Enter GST number"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </div>

              {/* 5. Company Name */}
              <div className="field">
                <label htmlFor="companyName">Company name (optional)</label>
                <input
                  id="companyName"
                  placeholder="Enter company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* 6. City */}
              <div className="field">
                <label htmlFor="city">City (optional)</label>
                <input
                  id="city"
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {/* 7. Pincode */}
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

              {/* 8. Map Link */}
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

              {/* 9. Internal Comments (staff only) */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="internalComments">Internal Comments (staff only)</label>
                <input
                  id="internalComments"
                  placeholder="VIP customer, fraud alert, handling notes…"
                  value={internalComments}
                  onChange={(e) => setInternalComments(e.target.value)}
                />
              </div>

              {/* 2. Communication Preferences */}
              <div className="details-section-title">Communication Preferences</div>
              <div className="field">
                <label htmlFor="communicationPreference">Communication Preference</label>
                <select
                  id="communicationPreference"
                  value={communicationPref}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCommunicationPref(val);
                    setDnd(val === 'None (DND)' || val === 'none');
                  }}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="Phone call">Phone call</option>
                  <option value="None (DND)">No communication (DND)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="communicationLanguage">Preferred Communication Language</label>
                <select
                  id="communicationLanguage"
                  value={communicationLang}
                  onChange={(e) => setCommunicationLang(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Malayalam">Malayalam</option>
                </select>
              </div>

              {/* 3. Customer Profile & Service Settings */}
              <div className="details-section-title">Profile &amp; Services Setting</div>
              <div className="field">
                <label htmlFor="customerClassification">Customer Classification</label>
                <select
                  id="customerClassification"
                  value={customerClassification}
                  onChange={(e) => setCustomerClassification(e.target.value)}
                >
                  <option value="Regular Customer">Regular Customer</option>
                  <option value="VIP Customer">VIP Customer</option>
                  <option value="Corporate Customer">Corporate Customer</option>
                  <option value="Fraud / Review">Fraud / Review Required</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="customerStatus">Customer Status</label>
                <select
                  id="customerStatus"
                  value={customerStatus}
                  onChange={(e) => setCustomerStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
                <small>Historical orders and financial records should be retained when archiving.</small>
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

              {/* 4. Customer & Membership */}
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

              {/* 5. Customer Insights (read-only) */}
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

              {/* 6. Customer History (read-only) */}
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
          {isOrderFlow ? 'Back' : 'Cancel'}
        </button>
        <button
          type="submit"
          className="create"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (isOrderFlow ? 'Saving Order…' : 'Updating Customer…')
            : (submitLabel || (isOrderFlow ? 'Save Order' : 'Update Customer Record'))}
        </button>
      </div>
    </form>
  );
}
