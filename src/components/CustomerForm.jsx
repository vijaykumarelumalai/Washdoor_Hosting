// src/components/CustomerForm.jsx
// Form matching washdoor_create_order_updated.html

import React, { useState } from 'react';
import { validateCustomer } from '../utils/validation';
import ClothSelectionCart from './ClothSelectionCart';

const PRODUCT_SERVICES = [
  { id: 'wp', name: 'Wash & Steam Press', icon: '👔' },
  { id: 'wf', name: 'Wash & Fold', icon: '🧺' },
  { id: 'dc', name: 'Dry Cleaning', icon: '🧥' },
  { id: 'hl', name: 'Heavy Linens & Quilts', icon: '🛏️' },
  { id: 'ex', name: 'Express 24H Service', icon: '⚡' },
];

function getAgeFromDOB(dobStr) {
  if (!dobStr) return null;
  const parts = String(dobStr).split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age <= 120 ? age : null;
}

export default function CustomerForm({
  initialCustomer = null,
  initialOrderType = 'walk-in',
  orderNumber = null,
  customerId = null,
  onBack,
  onSubmit,
  isSubmitting = false,
  isOrderFlow = true,
  isEditOrder = false,
  submitLabel = null,
}) {
  const isExistingCustomer = Boolean(
    (initialCustomer && (initialCustomer.id || initialCustomer.customer_id || initialCustomer.customerId)) ||
    isEditOrder
  );

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

  // Cart & Clothes Selection state
  const [cartData, setCartData] = useState({
    cart: initialCustomer?.customer_history?.items || initialCustomer?.items || [],
    subtotal: 0,
    gstAmount: 0,
    grandTotal: 0,
    totalItemCount: 1,
    careNotes: initialCustomer?.preference_notes || initialCustomer?.order_notes || '',
  });

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
  const calculatedAge = getAgeFromDOB(dob);
  const [mapLink, setMapLink] = useState(initialCustomer?.map_link || '');
  const [customerNotes, setCustomerNotes] = useState(initialCustomer?.notes || '');

  // Address Details & Additional Addresses state
  const [addressLine1, setAddressLine1] = useState(initialCustomer?.address || '');
  const [additionalAddresses, setAdditionalAddresses] = useState(
    Array.isArray(initialCustomer?.additional_addresses) ? initialCustomer.additional_addresses : []
  );
  const [addressDetailsOpen, setAddressDetailsOpen] = useState(true);
  const [businessDetailsOpen, setBusinessDetailsOpen] = useState(true);

  const handleAddAdditionalAddress = () => {
    setAdditionalAddresses((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        addressLine: '',
        city: '',
        pincode: '',
        mapLink: '',
        altPhone: '',
        email: '',
      },
    ]);
  };

  const handleRemoveAdditionalAddress = (id) => {
    setAdditionalAddresses((prev) => prev.filter((addr) => addr.id !== id));
  };

  const handleAdditionalAddressChange = (id, field, value) => {
    setAdditionalAddresses((prev) =>
      prev.map((addr) => (addr.id === id ? { ...addr, [field]: value } : addr))
    );
  };

  // Validation errors
  const [errors, setErrors] = useState({});

  const handleMobileChange = (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    const val = digits.slice(0, 10);
    setMobileNumber(val);
    if (val.length === 10) {
      setErrors((prev) => ({ ...prev, mobile_number: null }));
    }
  };

  const handleAlternatePhoneChange = (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    const val = digits.slice(0, 10);
    setAlternatePhone(val);
  };

  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
  };

  const [addressTag, setAddressTag] = useState(() => {
    const raw = initialCustomer?.address || '';
    if (raw.startsWith('Office:')) return 'Office';
    if (raw.startsWith('Other:')) return 'Other';
    return 'Home';
  });

  const handleSelectAddressTag = (tag) => {
    setAddressTag(tag);
    const clean = (address || '').replace(/^(Home|Office|Other):\s*/i, '');
    setAddress(clean ? `${tag}: ${clean}` : `${tag}: `);
    const addrEl = document.getElementById('addressInput');
    if (addrEl) addrEl.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Conditional Address Requirement: Mandatory when On-Call (Pickup / Delivery) is chosen
    if (intakeMethod === 'on-call' && (!address || !address.trim())) {
      setErrors((prev) => ({ ...prev, address: 'Address is required for Pickup / Home Delivery orders.' }));
      const addrEl = document.getElementById('addressInput');
      if (addrEl) addrEl.focus();
      return;
    }

    const customerData = {
      customer_id: initialCustomer?.customerId || initialCustomer?.customer_id || initialCustomer?.id,
      customer_name: customerName,
      country_code: '+91',
      mobile_number: mobileNumber,
      alternate_phone: alternatePhone,
      address: addressLine1 || address,
      additional_addresses: additionalAddresses,
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

    const cartItems = cartData?.cart || [];
    const calculatedTotal = cartItems.length > 0 ? (cartData?.grandTotal || 0) : 0;
    const calculatedCount = cartItems.length > 0
      ? (cartData?.totalItemCount ?? cartItems.reduce((s, i) => s + (Number(i.qty) || 1), 0))
      : 0;
    const finalCareNotes = cartData?.careNotes || productCareNotes || orderPreferenceNotes;

    const primaryService = cartItems.length > 0
      ? (cartItems[0].serviceType ? `${cartItems[0].serviceType}` : productService)
      : productService;

    onSubmit({
      customerData: {
        ...customerData,
        customer_id: customerId || initialCustomer?.id || null,
        service_category: primaryService,
        item_count: calculatedCount,
        product_weight: productWeight,
        product_garment_type: productGarmentType,
        order_notes: finalCareNotes || internalComments,
        total_amount: calculatedTotal,
      },
      orderType: intakeMethod,
      orderPreference: primaryService,
      orderPreferenceNotes: finalCareNotes,
      cartItems: cartItems,
      totalAmount: calculatedTotal,
      itemCount: calculatedCount,
      existingCustomerId: initialCustomer?.id || null,
    });
  };

  return (
    <form className="new-form show" id="newCustomerForm" onSubmit={handleSubmit}>
      {/* ── Financial Summary Strip (Ledger-Backed, Read-Only) ── */}
      {isExistingCustomer && (
        <div className="financial-summary-strip" aria-label="Customer Financial Summary">
          <div className="financial-card due">
            <span className="financial-label">Outstanding Due</span>
            <strong className="financial-val due">
              ₹{Number(initialCustomer?.outstanding_balance || initialCustomer?.outstandingBalance || 0).toFixed(2)}
            </strong>
            <span className="financial-sub">From unpaid orders</span>
          </div>
          <div className="financial-card advance">
            <span className="financial-label">Available Advance</span>
            <strong className="financial-val advance">
              ₹{Number(initialCustomer?.available_advance || initialCustomer?.availableAdvance || 0).toFixed(2)}
            </strong>
            <span className="financial-sub">Active prepayments</span>
          </div>
          <div className="financial-card wallet">
            <span className="financial-label">Wallet Credit</span>
            <strong className="financial-val wallet">
              ₹{Number(initialCustomer?.wallet_balance || initialCustomer?.walletBalance || 0).toFixed(2)}
            </strong>
            <span className="financial-sub">Store loyalty balance</span>
          </div>
          <div className="financial-card credit-limit">
            <span className="financial-label">Credit Limit</span>
            <strong className="financial-val credit">
              ₹{Number(initialCustomer?.credit_limit || initialCustomer?.creditLimit || 0).toFixed(2)}
            </strong>
            <span className="financial-sub">Max allowed postpaid</span>
          </div>
        </div>
      )}

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
          <div className="phone-input-wrap">
            <span className="phone-country-code">+91</span>
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
          </div>
          <span className="field-error" id="phoneError">
            {errors.mobile_number || 'Enter a valid 10-digit mobile number.'}
          </span>
        </div>

        <div className={`field address-field ${errors.address ? 'invalid' : ''}`} id="addressField">
          <div className="address-label-row">
            <label htmlFor="addressInput">
              Address {intakeMethod === 'on-call' ? (
                <span className="required-flag" style={{ color: '#f87171', fontWeight: '700' }}>* (Required for Pickup / Delivery)</span>
              ) : (
                '(optional)'
              )}
            </label>
            <div className="address-tag-chips">
              <button
                type="button"
                className={`address-tag-chip ${addressTag === 'Home' ? 'active' : ''}`}
                onClick={() => handleSelectAddressTag('Home')}
              >
                🏠 Home
              </button>
              <button
                type="button"
                className={`address-tag-chip ${addressTag === 'Office' ? 'active' : ''}`}
                onClick={() => handleSelectAddressTag('Office')}
              >
                🏢 Office
              </button>
              <button
                type="button"
                className={`address-tag-chip ${addressTag === 'Other' ? 'active' : ''}`}
                onClick={() => handleSelectAddressTag('Other')}
              >
                📍 Other
              </button>
            </div>
          </div>
          <input
            id="addressInput"
            autoComplete="street-address"
            placeholder={
              intakeMethod === 'on-call'
                ? 'Enter complete doorstep pickup / delivery address'
                : 'Enter address, street, area, city (optional for walk-ins)'
            }
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, address: null }));
              }
            }}
          />
          {errors.address && (
            <span className="field-error" id="addressError">
              {errors.address}
            </span>
          )}
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
            {isOrderFlow ? 'Clothes Selection, Services & Additional Details' : 'Additional Customer Details'}
          </span>
          <span className="expand-label" id="expandLabel">
            {detailsOpen ? 'Hide' : 'Expand'}
          </span>
          <span className="chevron" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {detailsOpen && (
          <div className="details-content" id="detailsContent">
            <div className="details-fields">
              {/* ── Cloth Selection & Cart Section (Inside Expanding Panel) ── */}
              {isOrderFlow && (
                <div style={{ gridColumn: '1 / -1', width: '100%' }}>
                  <ClothSelectionCart
                    initialCart={initialCustomer?.customer_history?.items || initialCustomer?.items || []}
                    initialCareNotes={orderPreferenceNotes}
                    isTaxExempt={Boolean(taxExemption)}
                    onChange={(cData) => setCartData(cData)}
                  />
                </div>
              )}

              {/* ── 1. Address Details Card (Collapsible) ── */}
              <div className="addr-section-card">
                <div className="addr-card-header">
                  <div className="addr-card-title">
                    <span className="addr-card-title-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </span>
                    <span>Address Details</span>
                  </div>
                  <button
                    type="button"
                    className="addr-card-toggle"
                    onClick={() => setAddressDetailsOpen(!addressDetailsOpen)}
                    aria-label="Toggle Address Details"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: addressDetailsOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                </div>

                {addressDetailsOpen && (
                  <>
                    <div className="addr-fields-grid">
                      {/* Address Line */}
                      <div className="addr-field-group">
                        <label className="addr-field-label" htmlFor="addrLine1">
                          Address Line
                        </label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                              <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                          </span>
                          <input
                            id="addrLine1"
                            className="addr-input"
                            placeholder="Enter address line"
                            value={addressLine1}
                            onChange={(e) => {
                              setAddressLine1(e.target.value);
                              setAddress(e.target.value);
                            }}
                          />
                        </div>
                      </div>

                      {/* City */}
                      <div className="addr-field-group">
                        <label className="addr-field-label" htmlFor="addrCity1">
                          City
                        </label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                              <line x1="9" y1="6" x2="9" y2="6.01"></line>
                              <line x1="15" y1="6" x2="15" y2="6.01"></line>
                              <line x1="9" y1="10" x2="9" y2="10.01"></line>
                              <line x1="15" y1="10" x2="15" y2="10.01"></line>
                              <line x1="9" y1="14" x2="9" y2="14.01"></line>
                              <line x1="15" y1="14" x2="15" y2="14.01"></line>
                              <line x1="9" y1="18" x2="15" y2="18"></line>
                            </svg>
                          </span>
                          <input
                            id="addrCity1"
                            className="addr-input"
                            placeholder="Enter city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Pincode */}
                      <div className="addr-field-group">
                        <label className="addr-field-label" htmlFor="addrPincode1">
                          Pincode
                        </label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                          </span>
                          <input
                            id="addrPincode1"
                            className="addr-input"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit pincode"
                            value={pincode}
                            onChange={handlePincodeChange}
                          />
                        </div>
                        {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                      </div>

                      {/* Map Link */}
                      <div className="addr-field-group">
                        <label className="addr-field-label" htmlFor="addrMapLink1">
                          Map Link
                        </label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                          </span>
                          <input
                            id="addrMapLink1"
                            className="addr-input"
                            type="url"
                            placeholder="https://maps.google.com/..."
                            value={mapLink}
                            onChange={(e) => setMapLink(e.target.value)}
                          />
                        </div>
                        {errors.map_link && <span className="field-error">{errors.map_link}</span>}
                      </div>

                      {/* Alternative Phone No. */}
                      <div className="addr-field-group">
                        <label className="addr-field-label" htmlFor="addrAltPhone1">
                          Alternative Phone No.
                        </label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                          </span>
                          <input
                            id="addrAltPhone1"
                            className="addr-input"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Enter 10-digit number"
                            value={alternatePhone}
                            onChange={handleAlternatePhoneChange}
                          />
                        </div>
                        {errors.alternate_phone && <span className="field-error">{errors.alternate_phone}</span>}
                      </div>

                      {/* Email */}
                      <div className="addr-field-group">
                        <label className="addr-field-label" htmlFor="addrEmail1">
                          Email
                        </label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                          </span>
                          <input
                            id="addrEmail1"
                            className="addr-input"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        {errors.email && <span className="field-error">{errors.email}</span>}
                      </div>

                      {/* Date of Birth */}
                      <div className="addr-field-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label className="addr-field-label" htmlFor="dob">Date of Birth</label>
                          {calculatedAge !== null && (
                            <span className="dob-age-pill" style={{ fontSize: '11px', padding: '1px 6px' }} title="Calculated Customer Age">
                              🎂 {calculatedAge} yrs old
                            </span>
                          )}
                        </div>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                          </span>
                          <input
                            type="date"
                            className="addr-input"
                            id="dob"
                            max={new Date().toISOString().split('T')[0]}
                            min="1920-01-01"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* + Add Additional Address Button */}
                    <div className="addr-add-btn-wrap">
                      <button
                        type="button"
                        className="addr-add-btn"
                        onClick={handleAddAdditionalAddress}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Add Additional Address</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ── 2. Additional Address Card(s) (Dynamic 1, 2, 3, 5+) ── */}
              {additionalAddresses.map((addr, idx) => {
                const num = idx + 2;
                return (
                  <div key={addr.id} className="addr-section-card additional-addr">
                    <div className="addr-card-header">
                      <div className="addr-card-title">
                        <span className="addr-card-title-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                        </span>
                        <span>Additional Address</span>
                      </div>
                      <button
                        type="button"
                        className="addr-card-remove-btn"
                        onClick={() => handleRemoveAdditionalAddress(addr.id)}
                        title="Remove this additional address"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="addr-fields-grid">
                      {/* Address Line N */}
                      <div className="addr-field-group">
                        <label className="addr-field-label">Address Line {num}</label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                              <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                          </span>
                          <input
                            className="addr-input"
                            placeholder={`Enter address line ${num}`}
                            value={addr.addressLine || ''}
                            onChange={(e) => handleAdditionalAddressChange(addr.id, 'addressLine', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* City N */}
                      <div className="addr-field-group">
                        <label className="addr-field-label">City {num}</label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                              <line x1="9" y1="6" x2="9" y2="6.01"></line>
                              <line x1="15" y1="6" x2="15" y2="6.01"></line>
                              <line x1="9" y1="10" x2="9" y2="10.01"></line>
                              <line x1="15" y1="10" x2="15" y2="10.01"></line>
                              <line x1="9" y1="14" x2="9" y2="14.01"></line>
                              <line x1="15" y1="14" x2="15" y2="14.01"></line>
                              <line x1="9" y1="18" x2="15" y2="18"></line>
                            </svg>
                          </span>
                          <input
                            className="addr-input"
                            placeholder={`Enter city ${num}`}
                            value={addr.city || ''}
                            onChange={(e) => handleAdditionalAddressChange(addr.id, 'city', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Pincode N */}
                      <div className="addr-field-group">
                        <label className="addr-field-label">Pincode {num}</label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                          </span>
                          <input
                            className="addr-input"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder={`Enter 6-digit pincode ${num}`}
                            value={addr.pincode || ''}
                            onChange={(e) => handleAdditionalAddressChange(addr.id, 'pincode', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Map Link N */}
                      <div className="addr-field-group">
                        <label className="addr-field-label">Map Link {num}</label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                          </span>
                          <input
                            className="addr-input"
                            type="url"
                            placeholder="https://maps.google.com/..."
                            value={addr.mapLink || ''}
                            onChange={(e) => handleAdditionalAddressChange(addr.id, 'mapLink', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Alternative Phone No. N */}
                      <div className="addr-field-group">
                        <label className="addr-field-label">Alternative Phone No. {num}</label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                          </span>
                          <input
                            className="addr-input"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Enter 10-digit number"
                            value={addr.altPhone || ''}
                            onChange={(e) => handleAdditionalAddressChange(addr.id, 'altPhone', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Additional Email N */}
                      <div className="addr-field-group">
                        <label className="addr-field-label">Additional Email {num}</label>
                        <div className="addr-input-wrap">
                          <span className="addr-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                          </span>
                          <input
                            className="addr-input"
                            type="email"
                            placeholder="name@example.com"
                            value={addr.email || ''}
                            onChange={(e) => handleAdditionalAddressChange(addr.id, 'email', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── 3. Business Details Card ── */}
              <div className="addr-section-card">
                <div className="addr-card-header">
                  <div className="addr-card-title">
                    <span className="addr-card-title-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                        <line x1="9" y1="6" x2="9" y2="6.01"></line>
                        <line x1="15" y1="6" x2="15" y2="6.01"></line>
                        <line x1="9" y1="10" x2="9" y2="10.01"></line>
                        <line x1="15" y1="10" x2="15" y2="10.01"></line>
                        <line x1="9" y1="14" x2="9" y2="14.01"></line>
                        <line x1="15" y1="14" x2="15" y2="14.01"></line>
                        <line x1="9" y1="18" x2="15" y2="18"></line>
                      </svg>
                    </span>
                    <span>Business Details</span>
                  </div>
                  <button
                    type="button"
                    className="addr-card-toggle"
                    onClick={() => setBusinessDetailsOpen(!businessDetailsOpen)}
                    aria-label="Toggle Business Details"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: businessDetailsOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                </div>

                {businessDetailsOpen && (
                  <div className="addr-fields-grid">
                    {/* Company Name */}
                    <div className="addr-field-group">
                      <label className="addr-field-label" htmlFor="businessCompanyName">Company Name</label>
                      <div className="addr-input-wrap">
                        <span className="addr-input-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                            <line x1="9" y1="6" x2="9" y2="6.01"></line>
                            <line x1="15" y1="6" x2="15" y2="6.01"></line>
                            <line x1="9" y1="10" x2="9" y2="10.01"></line>
                            <line x1="15" y1="10" x2="15" y2="10.01"></line>
                            <line x1="9" y1="14" x2="9" y2="14.01"></line>
                            <line x1="15" y1="14" x2="15" y2="14.01"></line>
                            <line x1="9" y1="18" x2="15" y2="18"></line>
                          </svg>
                        </span>
                        <input
                          id="businessCompanyName"
                          className="addr-input"
                          placeholder="Enter company name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* GST Number */}
                    <div className="addr-field-group">
                      <label className="addr-field-label" htmlFor="businessGstNumber">GST Number</label>
                      <div className="addr-input-wrap">
                        <span className="addr-input-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                            <line x1="2" y1="10" x2="22" y2="10"></line>
                          </svg>
                        </span>
                        <input
                          id="businessGstNumber"
                          className="addr-input"
                          placeholder="Enter GST number"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="internalComments">Internal Comments (staff only)</label>
                <input
                  id="internalComments"
                  placeholder="VIP customer, fraud alert, handling notes…"
                  value={internalComments}
                  onChange={(e) => setInternalComments(e.target.value)}
                />
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
                <label htmlFor="creditLimit">Credit Limit (₹)</label>
                <input
                  id="creditLimit"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0.00"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
                <small>Approved credit limit for postpaid customer orders.</small>
              </div>

              {/* 5. Customer Insights & 6. Customer History (only shown for existing customers) */}
              {isExistingCustomer && (
                <>
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
                </>
              )}
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
