// src/components/EditOrderModal.jsx
// Complete POS Order & Product Selection Modal matching media_1793089841568_9cd4605b.png

import React, { useState, useEffect, useMemo } from 'react';
import ClothIllustration from './ClothIllustration';
import { updateOrder, searchCustomers } from '../services/customerService';
import { normalizeMobileNumber, formatPhoneDisplay } from '../utils/validation';
import '../styles/EditOrderModal.css';

// 16 Standard Catalog Items exactly from mockup
export const PRODUCT_CATALOG = [
  { id: 'shirt', name: 'Shirt', category: 'Men', price: 15, unit: 'piece' },
  { id: 'tshirt', name: 'T-Shirt', category: 'Men', price: 12, unit: 'piece' },
  { id: 'formal_pant', name: 'Formal Pant', category: 'Men', price: 20, unit: 'piece' },
  { id: 'jeans', name: 'Jeans', category: 'Men', price: 25, unit: 'piece' },
  { id: 'saree', name: 'Saree', category: 'Women', price: 60, unit: 'piece' },
  { id: 'chudidar', name: 'Chudidar / Salwar', category: 'Women', price: 35, unit: 'piece' },
  { id: 'kurti', name: 'Kurti', category: 'Women', price: 30, unit: 'piece' },
  { id: 'shorts', name: 'Shorts', category: 'Kids', secondaryCategory: 'Men', price: 15, unit: 'piece' },
  { id: 'bedsheet', name: 'Bedsheet', category: 'Home Linen', price: 50, unit: 'piece' },
  { id: 'pillow_cover', name: 'Pillow Cover', category: 'Home Linen', price: 10, unit: 'piece' },
  { id: 'towel', name: 'Towel', category: 'Home Linen', price: 15, unit: 'piece' },
  { id: 'jacket', name: 'Jacket', category: 'Men', secondaryCategory: 'Women', price: 50, unit: 'piece' },
  { id: 'blazer_suit', name: 'Blazer / Suit', category: 'Men', price: 100, unit: 'piece' },
  { id: 'sweater', name: 'Sweater', category: 'Men', secondaryCategory: 'Women', price: 40, unit: 'piece' },
  { id: 'cap', name: 'Cap', category: 'Accessories', secondaryCategory: 'Kids', price: 10, unit: 'piece' },
  { id: 'curtain', name: 'Curtain', category: 'Home Linen', price: 60, unit: 'piece' },
];

const CATEGORIES = ['All Items', 'Men', 'Women', 'Kids', 'Home Linen', 'Accessories'];

export default function EditOrderModal({
  isOpen,
  order,
  onClose,
  onOrderUpdated,
  showToast,
  currencySymbol = '₹',
}) {
  // Filter state
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Customer Form state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');

  // Service Details state
  const [serviceType, setServiceType] = useState('Wash & Steam Press');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or re-populate when modal opens or order changes
  useEffect(() => {
    if (!isOpen || !order) return;

    // Load initial cart items:
    // If order has saved items in customer_history.items, restore them
    if (order.customer_history?.items && Array.isArray(order.customer_history.items) && order.customer_history.items.length > 0) {
      setCart(order.customer_history.items);
    } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      setCart(order.items);
    } else {
      // Default sample items matching mockup: Shirt(2), Jeans(1), Towel(1), Bedsheet(1)
      setCart([
        { id: 'shirt', name: 'Shirt', rate: 15, qty: 2, amount: 30 },
        { id: 'jeans', name: 'Jeans', rate: 25, qty: 1, amount: 25 },
        { id: 'towel', name: 'Towel', rate: 15, qty: 1, amount: 15 },
        { id: 'bedsheet', name: 'Bedsheet', rate: 50, qty: 1, amount: 50 },
      ]);
    }

    // Special instructions
    setSpecialInstructions(order.preference_notes || order.order_notes || '');

    // Customer details
    const cust = order.customer || {};
    setCustomerName(cust.customer_name || cust.customerName || order.customer_name || '');
    const rawMobile = cust.mobile_number || cust.mobileNumber || order.mobile_number || '';
    setMobileNumber(normalizeMobileNumber(rawMobile));
    const rawAlt = cust.alternate_phone || cust.alternatePhoneNumber || order.alternate_phone || '';
    setAlternatePhone(rawAlt ? normalizeMobileNumber(rawAlt) : '');
    setEmail(cust.email || order.email || '');

    // Service & Dates
    setServiceType(order.preference || order.service_category || 'Wash & Steam Press');

    const todayStr = new Date().toISOString().slice(0, 10);
    setPickupDate(todayStr);

    // Expected delivery +2 days
    const next2Days = new Date();
    next2Days.setDate(next2Days.getDate() + 2);
    setDeliveryDate(next2Days.toISOString().slice(0, 10));

    // Reset customer search
    setCustomerSearch('');
    setCustomerResults([]);
  }, [isOpen, order]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live customer search
  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCustomers(customerSearch.trim());
      setCustomerResults(results.slice(0, 5));
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    return PRODUCT_CATALOG.filter((item) => {
      const matchesCategory =
        activeCategory === 'All Items' ||
        item.category === activeCategory ||
        item.secondaryCategory === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id || item.name.toLowerCase() === product.name.toLowerCase());
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, qty: item.qty + 1, amount: (item.qty + 1) * item.rate }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          rate: product.price,
          qty: 1,
          amount: product.price,
        },
      ];
    });
    showToast?.(`+ Added ${product.name} to cart`);
  };

  const handleIncrementQty = (itemId) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, qty: item.qty + 1, amount: (item.qty + 1) * item.rate }
          : item
      )
    );
  };

  const handleDecrementQty = (itemId) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.qty - 1;
            return nextQty > 0
              ? { ...item, qty: nextQty, amount: nextQty * item.rate }
              : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveItem = (itemId) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Price calculations
  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.amount, 0);
  }, [cart]);

  // Check Tax Exemption (Customer level or Order level)
  const isTaxExempt = Boolean(
    order?.tax_exemption ||
    order?.customer?.tax_exemption ||
    order?.taxExemption ||
    order?.customer?.taxExemption
  );

  const gstAmount = isTaxExempt ? 0 : subtotal * 0.05;
  const grandTotal = subtotal + gstAmount;

  // Active status / progress stage
  const currentProgress = order?.progress || 25;
  const isReady = currentProgress >= 50;
  const isCompleted = currentProgress >= 100;

  // Select customer from search results
  const handleSelectCustomer = (cust) => {
    setCustomerName(cust.customerName || cust.customer_name || '');
    setMobileNumber(normalizeMobileNumber(cust.mobileNumber || cust.mobile_number || ''));
    if (cust.alternatePhoneNumber || cust.alternate_phone) {
      setAlternatePhone(normalizeMobileNumber(cust.alternatePhoneNumber || cust.alternate_phone));
    }
    if (cust.email) setEmail(cust.email);
    setCustomerSearch('');
    setCustomerResults([]);
    showToast?.(`✓ Customer profile linked: ${cust.customerName || cust.customer_name}`);
  };

  // Form submission / Update Order
  const handleSaveOrder = async (isHold = false) => {
    if (!customerName.trim()) {
      showToast?.('⚠️ Customer Name is required.');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.length < 10) {
      showToast?.('⚠️ Valid 10-digit Mobile Number is required.');
      return;
    }

    setIsSubmitting(true);
    const orderIdentifier = order?.order_number || order?.order_id || order?.id;

    const payload = {
      totalAmount: grandTotal,
      itemCount: totalItemCount,
      serviceCategory: serviceType,
      orderNotes: specialInstructions,
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
      alternatePhone: alternatePhone.trim() || null,
      email: email.trim() || null,
      taxExemption: isTaxExempt,
      status: isHold ? 'Order in Progress' : (order?.status || 'Laundry In Progress'),
      items: cart,
    };

    const { error } = await updateOrder(orderIdentifier, payload);
    setIsSubmitting(false);

    if (error) {
      showToast?.(`⚠️ Failed to update order: ${error.message}`);
    } else {
      showToast?.(
        isHold
          ? `💾 Order ${orderIdentifier} saved and put on hold!`
          : `✓ Order ${orderIdentifier} updated with ${totalItemCount} items (${currencySymbol}${grandTotal.toFixed(2)})!`
      );
      onOrderUpdated?.();
      onClose();
    }
  };

  if (!isOpen || !order) return null;

  const orderNum = order.order_number || order.order_id || 'ORDER-00001';

  return (
    <div
      className="edit-order-overlay"
      id="editOrderOverlay"
      onClick={(e) => {
        if (e.target.id === 'editOrderOverlay') onClose();
      }}
    >
      <div className="edit-order-modal" role="dialog" aria-modal="true" aria-labelledby="posModalTitle">
        {/* ── Top Header Bar ── */}
        <div className="pos-header-bar">
          <div className="pos-header-left">
            <div className="pos-header-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <div className="pos-title-block">
              <div className="pos-breadcrumbs">
                <span>Orders</span>
                <span>›</span>
                <span className="active">Edit Order ({orderNum})</span>
              </div>
              <div className="pos-main-title" id="posModalTitle">
                Edit Laundry Order
              </div>
              <div className="pos-subtitle">
                Select clothes and services to update order record &amp; billing
              </div>
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className="pos-stepper-wrap">
            {/* Step 1: Laundry In Progress */}
            <div className="pos-step-item">
              <div className={`pos-step-circle ${currentProgress >= 25 ? 'active' : ''}`}>1</div>
              <div className="pos-step-text">
                <span className="pos-step-title">Laundry In Progress</span>
                <span className="pos-step-sub">
                  <span className="pos-step-percent">25%</span> (In Progress)
                </span>
              </div>
              <div className="pos-step-bar-wrap">
                <div
                  className="pos-step-bar-fill"
                  style={{ width: currentProgress >= 50 ? '100%' : '50%' }}
                />
              </div>
            </div>

            {/* Step 2: Laundry Ready */}
            <div className="pos-step-item">
              <div className={`pos-step-circle ${isReady ? 'active' : ''}`}>2</div>
              <div className="pos-step-text">
                <span className="pos-step-title">Laundry Ready</span>
                <span className="pos-step-sub">
                  <span className="pos-step-percent">50%</span> (Ready for Billing)
                </span>
              </div>
              <div className="pos-step-bar-wrap">
                <div
                  className="pos-step-bar-fill"
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            </div>

            {/* Step 3: Laundry Completed */}
            <div className="pos-step-item">
              <div className={`pos-step-circle ${isCompleted ? 'completed' : ''}`}>3</div>
              <div className="pos-step-text">
                <span className="pos-step-title">Laundry Completed</span>
                <span className="pos-step-sub">
                  <span className="pos-step-percent">100%</span> (Laundry Complete)
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            className="pos-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* ── Main 3-Column POS Body ── */}
        <div className="pos-body-grid">
          {/* Column 1: Product Selection Grid */}
          <div className="pos-col-products">
            <div className="pos-filter-toolbar">
              {/* Category Pills */}
              <div className="pos-category-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pos-cat-pill ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Clothes Search */}
              <div className="pos-search-box">
                <svg className="pos-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="pos-search-input"
                  placeholder="Search clothes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable Catalog Grid */}
            <div className="pos-catalog-scroll">
              <div className="pos-products-grid">
                {filteredProducts.map((item) => (
                  <div key={item.id} className="pos-item-card">
                    <div className="pos-item-img-wrap">
                      <ClothIllustration itemId={item.id} size={54} />
                    </div>
                    <div className="pos-item-name" title={item.name}>
                      {item.name}
                    </div>
                    <div className="pos-item-price-row">
                      <span className="pos-item-price">{currencySymbol} {item.price}</span>
                      <span className="pos-item-unit">/ {item.unit}</span>
                    </div>
                    <button
                      type="button"
                      className="pos-add-btn"
                      onClick={() => handleAddToCart(item)}
                    >
                      <span>+</span>
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Selected Items (Cart) */}
          <div className="pos-col-cart">
            <div className="pos-cart-header">
              <span className="pos-cart-title">
                <span>Selected Items ({cart.length})</span>
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="pos-cart-clear-btn"
                  onClick={handleClearCart}
                  title="Remove all items from cart"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="pos-cart-table-wrap">
              {cart.length === 0 ? (
                <div className="pos-cart-empty-box">
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: '550' }}>No items in cart</span>
                  <span style={{ fontSize: '11.5px' }}>Click "+ Add" on any clothes from catalog</span>
                </div>
              ) : (
                <table className="pos-cart-table">
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>Item</th>
                      <th style={{ width: '18%' }}>Rate ({currencySymbol})</th>
                      <th style={{ width: '22%' }}>Qty</th>
                      <th style={{ width: '16%' }}>Amount ({currencySymbol})</th>
                      <th style={{ width: '6%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="pos-cart-item-col">
                            <div className="pos-cart-item-thumb">
                              <ClothIllustration itemId={item.id} size={28} />
                            </div>
                            <span className="pos-cart-item-name">{item.name}</span>
                          </div>
                        </td>
                        <td>{currencySymbol} {item.rate}</td>
                        <td>
                          <div className="pos-qty-stepper">
                            <button
                              type="button"
                              className="pos-qty-btn"
                              onClick={() => handleDecrementQty(item.id)}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="pos-qty-val">{item.qty}</span>
                            <button
                              type="button"
                              className="pos-qty-btn"
                              onClick={() => handleIncrementQty(item.id)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ fontWeight: '700', color: '#0f172a' }}>
                          {currencySymbol} {item.amount}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="pos-cart-del-btn"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove item"
                            aria-label={`Remove ${item.name}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Special Instructions */}
            <div className="pos-special-notes-box">
              <label className="pos-notes-label">Special Instructions (Optional)</label>
              <textarea
                className="pos-notes-textarea"
                rows="2"
                placeholder="e.g., Handle with care, Remove ink stains, etc."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </div>

            {/* Price Summary */}
            <div className="pos-summary-card">
              <div className="pos-summary-row">
                <span>Subtotal</span>
                <strong>{currencySymbol} {subtotal.toFixed(2)}</strong>
              </div>
              <div className="pos-summary-row">
                <span>
                  GST (5%) {isTaxExempt && <span style={{ color: '#d97706', fontSize: '11px' }}>(Tax Exempted)</span>}
                </span>
                <span>{currencySymbol} {gstAmount.toFixed(2)}</span>
              </div>
              <div className="pos-summary-row grand-total">
                <span>Grand Total</span>
                <span>{currencySymbol} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Column 3: Customer Details & Service Details */}
          <div className="pos-col-details">
            {/* Customer Details Card */}
            <div className="pos-panel-card">
              <div className="pos-panel-title">Customer Details</div>

              {/* Customer Search */}
              <div className="pos-field-group" style={{ position: 'relative' }}>
                <div className="pos-search-box">
                  <svg className="pos-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    className="pos-search-input"
                    placeholder="Search customer by name or mobile..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>

                {customerResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    marginTop: '4px',
                    maxHeight: '160px',
                    overflowY: 'auto'
                  }}>
                    {customerResults.map((c, i) => (
                      <div
                        key={c.customerId || c.id || i}
                        onClick={() => handleSelectCustomer(c)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <strong>{c.customerName || c.customer_name}</strong>
                        <span style={{ color: '#64748b' }}>{formatPhoneDisplay(c.mobileNumber || c.mobile_number)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pos-or-divider">OR</div>

              <div className="pos-field-group">
                <label className="pos-field-label">
                  Customer Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="pos-field-input"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="pos-field-group">
                <label className="pos-field-label">
                  Mobile Number <span className="req">*</span>
                </label>
                <div className="pos-phone-input-wrap">
                  <span className="pos-phone-badge">+91</span>
                  <input
                    type="tel"
                    className="pos-phone-input"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(normalizeMobileNumber(e.target.value))}
                  />
                </div>
              </div>

              <div className="pos-field-group">
                <label className="pos-field-label">Alternate Phone</label>
                <input
                  type="tel"
                  className="pos-field-input"
                  placeholder="Enter alternate number"
                  maxLength={10}
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(normalizeMobileNumber(e.target.value))}
                />
              </div>

              <div className="pos-field-group" style={{ marginBottom: 0 }}>
                <label className="pos-field-label">Email (Optional)</label>
                <input
                  type="email"
                  className="pos-field-input"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Service Details Card */}
            <div className="pos-panel-card">
              <div className="pos-panel-title">Service Details</div>

              <div className="pos-field-group">
                <label className="pos-field-label">
                  Service Type <span className="req">*</span>
                </label>
                <select
                  className="pos-field-select"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  <option value="Wash & Steam Press">Wash & Steam Press</option>
                  <option value="Wash & Fold">Wash & Fold</option>
                  <option value="Dry Cleaning">Dry Cleaning</option>
                  <option value="Steam Press Only">Steam Press Only</option>
                  <option value="Premium Care">Premium Care</option>
                </select>
              </div>

              <div className="pos-field-group">
                <label className="pos-field-label">Pickup Date</label>
                <input
                  type="date"
                  className="pos-field-input"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>

              <div className="pos-field-group" style={{ marginBottom: 0 }}>
                <label className="pos-field-label">Expected Delivery</label>
                <input
                  type="date"
                  className="pos-field-input"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Bar ── */}
        <div className="pos-footer-bar">
          <button
            type="button"
            className="pos-btn-back"
            onClick={onClose}
          >
            ← Back
          </button>

          <div className="pos-footer-actions">
            <button
              type="button"
              className="pos-btn-hold"
              onClick={() => handleSaveOrder(true)}
              disabled={isSubmitting}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span>Save &amp; Hold</span>
            </button>

            <button
              type="button"
              className="pos-btn-primary"
              onClick={() => handleSaveOrder(false)}
              disabled={isSubmitting}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{isSubmitting ? 'Updating Order…' : 'Update Order'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
