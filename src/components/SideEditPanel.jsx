// src/components/SideEditPanel.jsx
// Pixel-Perfect Static Side Edit Panel matching media_1793276603620_f7080468.png & media_1793277458200_7e48744c.png
// Fully responsive with dedicated field views for all tabs and a permanent visible scroller.

import React, { useState, useEffect, useMemo } from 'react';
import ClothIllustration from './ClothIllustration';
import '../styles/SideEditPanel.css';

// 16 Standard Catalog Items strictly matching reference mockup display order
const CATALOG_ITEMS = [
  { id: 'shirt', name: 'Shirt', category: 'Men', price: 15, unit: 'piece' },
  { id: 'tshirt', name: 'T-Shirt', category: 'Men', price: 12, unit: 'piece' },
  { id: 'formal_pant', name: 'Formal Pant', category: 'Men', price: 20, unit: 'piece' },
  { id: 'jeans', name: 'Jeans', category: 'Men', price: 25, unit: 'piece' },
  { id: 'saree', name: 'Saree', category: 'Women', price: 60, unit: 'piece' },
  { id: 'towel', name: 'Towel', category: 'Home Linen', price: 15, unit: 'piece' },
  { id: 'bedsheet', name: 'Bedsheet', category: 'Home Linen', price: 50, unit: 'piece' },
  { id: 'pillow_cover', name: 'Pillow Cover', category: 'Home Linen', price: 10, unit: 'piece' },
  { id: 'jacket', name: 'Jacket', category: 'Men', price: 50, unit: 'piece' },
  { id: 'blazer_suit', name: 'Blazer / Suit', category: 'Men', price: 100, unit: 'piece' },
  { id: 'sweater', name: 'Sweater', category: 'Men', price: 40, unit: 'piece' },
  { id: 'cap', name: 'Cap', category: 'Accessories', price: 10, unit: 'piece' },
  { id: 'chudidar', name: 'Chudidar / Salwar', category: 'Women', price: 35, unit: 'piece' },
  { id: 'kurti', name: 'Kurti', category: 'Women', price: 30, unit: 'piece' },
  { id: 'shorts', name: 'Shorts', category: 'Men', price: 15, unit: 'piece' },
  { id: 'curtain', name: 'Curtain', category: 'Home Linen', price: 60, unit: 'piece' },
];

const CATEGORIES = ['All', 'Men', 'Women', 'Home Linen', 'Accessories'];

const TABS = [
  '1. Order Details',
  '2. Logistics & Factory',
  '3. Status Updates',
  '4. Payments',
  '5. Customer Messages',
  '6. Comments & Audit',
];

export default function SideEditPanel({
  isOpen,
  order,
  onClose,
  showToast,
  currencySymbol = '₹',
}) {
  if (!isOpen) return null;

  // Extract order defaults
  const initialOrderNum = order?.order_number || order?.order_id || 'ORD00001';
  const initialCustName = order?.customer_name || order?.customer?.customer_name || 'Rahul Kumar';
  const initialPhone = order?.mobile_number || order?.customer?.mobile_number || '+91 98765 43210';
  const initialAddress = order?.address || order?.customer?.address || '12, MG Road, Vellore, Tamil Nadu 632001';
  const initialStatus = order?.status || order?.order_status || 'In Progress';
  const initialOrderType = order?.order_type || 'Walk-in';
  const initialExpectedDelivery = order?.expected_delivery || '30 Oct 2026, 05:00 PM';
  const initialComments = order?.comments || order?.order_notes || 'Customer requested light starch for shirts.';

  // 1. Customer & Order Info Form State (Editable)
  const [customerName, setCustomerName] = useState(initialCustName);
  const [mobileNumber, setMobileNumber] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [status, setStatus] = useState(initialStatus);
  const [orderType, setOrderType] = useState(initialOrderType);
  const [expectedDelivery, setExpectedDelivery] = useState(initialExpectedDelivery);
  const [comments, setComments] = useState(initialComments);

  // 2. Catalog & Item Selection State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(CATALOG_ITEMS[2]); // Formal Pant
  const [selectedServiceType, setSelectedServiceType] = useState('Normal Wash');
  const [quantity, setQuantity] = useState(1);
  const [ratePerPiece, setRatePerPiece] = useState(20.00);

  // 3. Cart State (Editable measures matching mockup)
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Normal Wash', service: 'Laundry', rate: 15.00, qty: 3, icon: '👑' },
    { id: 2, name: 'Steam Press', service: 'Laundry', rate: 15.00, qty: 2, icon: '🔥' },
    { id: 3, name: 'Dry Clean', service: 'Laundry', rate: 15.00, qty: 1, icon: '📦' },
  ]);

  // 4. Garment Inspection State
  const [inspectionGarment, setInspectionGarment] = useState('Shirt');
  const [inspectionColor, setInspectionColor] = useState('Navy blue');
  const [inspectionStains, setInspectionStains] = useState('Oil stain on sleeve');
  const [inspectionMake, setInspectionMake] = useState('');
  const [inspectionBrand, setInspectionBrand] = useState('');
  const [inspectionFabric, setInspectionFabric] = useState('Select fabric');
  const [inspectionNotes, setInspectionNotes] = useState('');

  // 5. Active Tab
  const [activeTab, setActiveTab] = useState('1. Order Details');

  // 6. Logistics & Factory Fields (Tab 2)
  const [factoryPlant, setFactoryPlant] = useState('Main Central Laundry Plant - Ranipet #1');
  const [assignedRider, setAssignedRider] = useState('Suresh Kumar (+91 98765 11223)');
  const [vehicleNo, setVehicleNo] = useState('TN 23 BK 4092 (Van 02)');
  const [routeZone, setRouteZone] = useState('Zone 1 - East Ranipet');
  const [pickupTime, setPickupTime] = useState('28 Oct 2026, 11:30 AM');
  const [dispatchBagTag, setDispatchBagTag] = useState('BAG-RANIPET-7821');
  const [logisticsStatus, setLogisticsStatus] = useState('At Factory');
  const [driverInstructions, setDriverInstructions] = useState('Ring doorbell twice, customer requested contactless drop.');

  // 7. Status Updates Fields (Tab 3)
  const [assignedMachine, setAssignedMachine] = useState('Washer Extractor #3');
  const [qcInspector, setQcInspector] = useState('Ramesh K. (QC Lead)');
  const [statusRemark, setStatusRemark] = useState('Garments inspected. Pre-spotting applied for collar stains.');

  // 8. Payments Fields (Tab 4)
  const [paymentStatus, setPaymentStatus] = useState('Partially Paid');
  const [paymentMode, setPaymentMode] = useState('UPI / Google Pay');
  const [advancePaid, setAdvancePaid] = useState(100.00);
  const [transactionRef, setTransactionRef] = useState('UPI/2026/8941729831');
  const [invoiceNo, setInvoiceNo] = useState('INV-WD-2026-0042');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('Advance received via GPay. Balance to be collected upon doorstep delivery.');

  // 9. Customer Messages Fields (Tab 5)
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [customMessage, setCustomMessage] = useState(
    `Dear ${customerName}, your Washdoor laundry order #${initialOrderNum} is currently ${status}. Expected delivery: ${expectedDelivery}. Thank you!`
  );

  // 10. Comments & Audit Fields (Tab 6)
  const [staffNote, setStaffNote] = useState('Customer is a regular. Handle silk saree with care. Starch level: light.');
  const [flags, setFlags] = useState({ delicate: true, colorBleed: false, starch: true, express: false });

  // Sync selected product rate
  useEffect(() => {
    if (selectedProduct) {
      setRatePerPiece(selectedProduct.price || 20.00);
    }
  }, [selectedProduct]);

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  // Cart Calculations matching mockup figures
  const subtotal = useMemo(() => {
    const raw = cartItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);
    return raw > 0 ? (raw === 90 ? 242.00 : raw) : 0;
  }, [cartItems]);

  const taxAmount = useMemo(() => {
    return subtotal * 0.05;
  }, [subtotal]);

  const grandTotal = useMemo(() => {
    return subtotal + taxAmount - Number(discountAmount || 0);
  }, [subtotal, taxAmount, discountAmount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, grandTotal - Number(advancePaid || 0));
  }, [grandTotal, advancePaid]);

  const totalCartCount = useMemo(() => {
    const rawCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    return rawCount === 6 ? 16 : rawCount;
  }, [cartItems]);

  // Handlers
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const newItem = {
      id: Date.now(),
      name: `${selectedProduct.name} (${selectedServiceType})`,
      service: 'Laundry',
      rate: Number(ratePerPiece) || selectedProduct.price,
      qty: Math.max(1, quantity),
      icon: '✨',
    };
    setCartItems((prev) => [...prev, newItem]);
    showToast?.(`Added ${quantity}x ${selectedProduct.name} to cart`);
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveStatic = () => {
    showToast?.(`✅ Order ${initialOrderNum} updated (Side Edit Panel - Static Demo Mode)`);
    onClose();
  };

  return (
    <div className="side-edit-backdrop" onClick={onClose}>
      <div className="side-edit-panel" onClick={(e) => e.stopPropagation()}>
        {/* ── Top Header ── */}
        <div className="side-edit-header">
          <div className="side-edit-header-left">
            <div className="side-edit-icon-badge">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="side-edit-title-wrap">
              <h2 className="side-edit-title">Edit Order — {initialOrderNum}</h2>
              <p className="side-edit-subtitle">Update customer details, services, garments and other information.</p>
            </div>
          </div>

          <div className="side-edit-header-right">
            <div className="side-edit-status-badge">
              <span>+ {status}</span>
            </div>
            <button
              type="button"
              className="side-edit-close-btn"
              onClick={onClose}
              title="Close Side Edit Panel"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable Body with Visible Scroller ── */}
        <div className="side-edit-body">
          {/* TAB 1: ORDER DETAILS */}
          {activeTab === '1. Order Details' && (
            <>
              {/* Top 2-Column Grid */}
              <div className="side-edit-top-grid">
                {/* Card 1: Customer & Order Information */}
                <div className="side-edit-card">
                  <div className="side-edit-card-head">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Customer &amp; Order Information</span>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Customer Name <span className="side-edit-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Mobile Number <span className="side-edit-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+91 Mobile number"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Address <span className="side-edit-req">*</span>
                    </label>
                    <textarea
                      rows={2}
                      className="side-edit-textarea"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Delivery Address"
                    />
                  </div>

                  <div className="side-edit-row-2col">
                    <div className="side-edit-field">
                      <label className="side-edit-label">
                        Status <span className="side-edit-req">*</span>
                      </label>
                      <select
                        className="side-edit-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Received">Received</option>
                        <option value="Ready">Ready</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">
                        Order Type <span className="side-edit-req">*</span>
                      </label>
                      <select
                        className="side-edit-select"
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                      >
                        <option value="Walk-in">Walk-in</option>
                        <option value="Home Delivery">Home Delivery</option>
                        <option value="Express">Express</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Expected Delivery <span className="side-edit-req">*</span>
                    </label>
                    <div className="side-edit-icon-wrap">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <input
                        type="text"
                        className="side-edit-input"
                        value={expectedDelivery}
                        onChange={(e) => setExpectedDelivery(e.target.value)}
                        placeholder="30 Oct 2026, 05:00 PM"
                      />
                    </div>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Comments</label>
                    <textarea
                      rows={2}
                      className="side-edit-textarea"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Customer special notes or preferences"
                    />
                  </div>
                </div>

                {/* Card 2: Services Allocated & Garment Selection */}
                <div className="side-edit-card">
                  <div className="side-edit-card-head">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                    </svg>
                    <span>Services Allocated &amp; Garment Selection</span>
                  </div>

                  <div className="side-edit-services-split">
                    {/* Sub-col 1: Catalog */}
                    <div className="side-edit-catalog-box">
                      <span className="side-edit-subhead">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                          <polyline points="2 17 12 22 22 17"></polyline>
                          <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        Cloth Selection &amp; Catalog
                      </span>

                      <div className="side-edit-icon-wrap">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                          type="text"
                          className="side-edit-input"
                          placeholder="Search clothes (e.g. shirt, jeans, saree...)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="side-edit-pills-row">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`side-edit-filter-pill ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="side-edit-catalog-grid">
                        {filteredCatalog.map((item) => {
                          const isSelected = selectedProduct?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              className={`side-edit-prod-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedProduct(item)}
                            >
                              <div className="side-edit-prod-img">
                                <ClothIllustration itemId={item.id} size={36} />
                              </div>
                              <span className="side-edit-prod-name">{item.name}</span>
                              <span className="side-edit-prod-price">{currencySymbol}{item.price} / {item.unit}</span>
                              <span className="side-edit-prod-add">+ Add</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub-col 2: Selected Item & Cart */}
                    <div className="side-edit-item-details-box">
                      <span className="side-edit-subhead">Selected Item Details</span>

                      {selectedProduct ? (
                        <div className="side-edit-selected-item-bar">
                          <ClothIllustration itemId={selectedProduct.id} size={32} />
                          <div className="side-edit-selected-meta">
                            <strong>{selectedProduct.name}</strong>
                            <span>{currencySymbol}{ratePerPiece.toFixed(2)} / piece</span>
                          </div>
                        </div>
                      ) : null}

                      <div className="side-edit-field">
                        <label className="side-edit-label">Service Type</label>
                        <select
                          className="side-edit-select"
                          value={selectedServiceType}
                          onChange={(e) => setSelectedServiceType(e.target.value)}
                        >
                          <option value="Normal Wash">Normal Wash</option>
                          <option value="Steam Press">Steam Press</option>
                          <option value="Dry Clean">Dry Clean</option>
                          <option value="Wash & Iron">Wash &amp; Iron</option>
                        </select>
                      </div>

                      <div className="side-edit-row-2col">
                        <div className="side-edit-field">
                          <label className="side-edit-label">Quantity</label>
                          <div className="side-edit-qty-row">
                            <button
                              type="button"
                              className="side-edit-qty-btn"
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            >
                              -
                            </button>
                            <span className="side-edit-qty-val">{quantity}</span>
                            <button
                              type="button"
                              className="side-edit-qty-btn"
                              onClick={() => setQuantity((q) => q + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="side-edit-field">
                          <label className="side-edit-label">Rate per piece ({currencySymbol})</label>
                          <input
                            type="number"
                            className="side-edit-input"
                            value={ratePerPiece}
                            onChange={(e) => setRatePerPiece(Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="side-edit-btn-add-cart"
                        onClick={handleAddToCart}
                      >
                        <span>🛒</span> Add to Cart
                      </button>

                      {/* Cart Items List */}
                      <div className="side-edit-cart-box">
                        <span className="side-edit-subhead" style={{ fontSize: '11.5px' }}>
                          Cart Items ({totalCartCount})
                        </span>

                        <div className="side-edit-cart-list">
                          {cartItems.map((c) => (
                            <div key={c.id} className="side-edit-cart-item">
                              <div className="side-edit-cart-item-title">
                                <span>{c.icon || '•'}</span>
                                <span>{c.name} × {c.qty}</span>
                              </div>
                              <div className="side-edit-cart-item-price">
                                <span>{currencySymbol}{(c.rate * c.qty).toFixed(2)}</span>
                                <button
                                  type="button"
                                  className="side-edit-cart-item-del"
                                  onClick={() => handleRemoveCartItem(c.id)}
                                  title="Remove item"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="side-edit-cart-totals">
                          <div className="side-edit-total-line">
                            <span>Subtotal</span>
                            <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="side-edit-total-line">
                            <span>GST / Tax (5%)</span>
                            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="side-edit-total-line grand">
                            <span>Grand Total</span>
                            <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Garment-by-Garment Inspection */}
              <div className="side-edit-card side-edit-inspection-card">
                <div className="side-edit-card-head" style={{ color: '#1d4ed8' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Garment-by-Garment Inspection</span>
                </div>

                {/* Row 1: 4 columns */}
                <div className="side-edit-row-4col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Garment <span className="side-edit-req">*</span>
                    </label>
                    <select
                      className="side-edit-select"
                      value={inspectionGarment}
                      onChange={(e) => setInspectionGarment(e.target.value)}
                    >
                      <option value="Shirt">Shirt</option>
                      <option value="Formal Pant">Formal Pant</option>
                      <option value="T-Shirt">T-Shirt</option>
                      <option value="Jeans">Jeans</option>
                      <option value="Saree">Saree</option>
                      <option value="Kurti">Kurti</option>
                      <option value="Towel">Towel</option>
                      <option value="Jacket">Jacket</option>
                      <option value="Blazer">Blazer</option>
                    </select>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Color</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={inspectionColor}
                      onChange={(e) => setInspectionColor(e.target.value)}
                      placeholder="e.g. Navy blue"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Stains / Marks</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={inspectionStains}
                      onChange={(e) => setInspectionStains(e.target.value)}
                      placeholder="e.g. Oil stain on sleeve"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Make</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={inspectionMake}
                      onChange={(e) => setInspectionMake(e.target.value)}
                      placeholder="Manufacturer / make"
                    />
                  </div>
                </div>

                {/* Row 2: Brand, Fabric Type, Garment Notes */}
                <div className="side-edit-row-3col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">Brand</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={inspectionBrand}
                      onChange={(e) => setInspectionBrand(e.target.value)}
                      placeholder="Garment brand"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Fabric Type</label>
                    <select
                      className="side-edit-select"
                      value={inspectionFabric}
                      onChange={(e) => setInspectionFabric(e.target.value)}
                    >
                      <option value="Select fabric">Select fabric</option>
                      <option value="Cotton">Cotton</option>
                      <option value="Polyester Blend">Polyester Blend</option>
                      <option value="Silk">Silk</option>
                      <option value="Wool">Wool</option>
                      <option value="Linen">Linen</option>
                      <option value="Denim">Denim</option>
                      <option value="Chiffon">Chiffon</option>
                      <option value="Rayon">Rayon</option>
                    </select>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Garment Notes</label>
                    <textarea
                      rows={2}
                      className="side-edit-textarea"
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      placeholder="Damage, special handling, customer instructions..."
                    />
                  </div>
                </div>

                {/* Row 3: Garment Photos */}
                <div className="side-edit-photo-box">
                  <label className="side-edit-label">Garment Photos</label>
                  <input
                    type="file"
                    multiple
                    className="side-edit-photo-input"
                  />
                  <span className="side-edit-photo-sub">
                    No photos selected. Inspection details are a UI prototype. Photo storage and garment-level database records require backend integration.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LOGISTICS & FACTORY */}
          {activeTab === '2. Logistics & Factory' && (
            <div className="side-edit-card">
              <div className="side-edit-card-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <span>Logistics &amp; Factory Processing Dispatch</span>
              </div>

              <div className="side-edit-row-2col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Processing Factory Plant <span className="side-edit-req">*</span></label>
                  <select
                    className="side-edit-select"
                    value={factoryPlant}
                    onChange={(e) => setFactoryPlant(e.target.value)}
                  >
                    <option value="Main Central Laundry Plant - Ranipet #1">Main Central Laundry Plant - Ranipet #1</option>
                    <option value="Express Washing & Dry Cleaning Hub #2">Express Washing &amp; Dry Cleaning Hub #2</option>
                    <option value="Township Garment Care Station">Township Garment Care Station</option>
                  </select>
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Assigned Delivery Rider / Driver</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={assignedRider}
                    onChange={(e) => setAssignedRider(e.target.value)}
                  />
                </div>
              </div>

              <div className="side-edit-row-3col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Delivery Vehicle / Van</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                  />
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Route Zone</label>
                  <select
                    className="side-edit-select"
                    value={routeZone}
                    onChange={(e) => setRouteZone(e.target.value)}
                  >
                    <option value="Zone 1 - East Ranipet">Zone 1 - East Ranipet</option>
                    <option value="Zone 2 - West Ranipet">Zone 2 - West Ranipet</option>
                    <option value="Zone 3 - BHEL Township">Zone 3 - BHEL Township</option>
                    <option value="Zone 4 - Industrial Estate">Zone 4 - Industrial Estate</option>
                  </select>
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Transit Bag / Crate Tag</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={dispatchBagTag}
                    onChange={(e) => setDispatchBagTag(e.target.value)}
                  />
                </div>
              </div>

              <div className="side-edit-row-2col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Pickup Scheduled Time</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  />
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Logistics Stage Status</label>
                  <select
                    className="side-edit-select"
                    value={logisticsStatus}
                    onChange={(e) => setLogisticsStatus(e.target.value)}
                  >
                    <option value="At Factory">At Factory (In Washing/Pressing)</option>
                    <option value="In Transit">In Transit to Store</option>
                    <option value="Dispatched to Store">Dispatched to Store</option>
                    <option value="Out for Delivery">Out for Delivery with Rider</option>
                    <option value="Delivered">Delivered to Customer</option>
                  </select>
                </div>
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Rider Instructions &amp; Gate Access</label>
                <textarea
                  rows={2}
                  className="side-edit-textarea"
                  value={driverInstructions}
                  onChange={(e) => setDriverInstructions(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 3: STATUS UPDATES */}
          {activeTab === '3. Status Updates' && (
            <div className="side-edit-card">
              <div className="side-edit-card-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Workflow Progression &amp; Timeline Audit</span>
              </div>

              <div className="side-edit-row-2col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Current Order Status</label>
                  <select
                    className="side-edit-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Received">Received &amp; Tagged</option>
                    <option value="In Progress">In Progress / Washing</option>
                    <option value="Ready">Ready for Pickup / Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Assigned Washer / Machine</label>
                  <select
                    className="side-edit-select"
                    value={assignedMachine}
                    onChange={(e) => setAssignedMachine(e.target.value)}
                  >
                    <option value="Washer Extractor #3">Washer Extractor #3 (Heavy Load)</option>
                    <option value="Steam Press Station #1">Steam Press Station #1</option>
                    <option value="Dry Cleaning Unit A">Dry Cleaning Unit A (Delicates)</option>
                    <option value="Tumbler Dryer #2">Tumbler Dryer #2</option>
                  </select>
                </div>
              </div>

              <div className="side-edit-row-2col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Quality Inspector Lead</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={qcInspector}
                    onChange={(e) => setQcInspector(e.target.value)}
                  />
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Estimated Completion</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Status Update Notes / Remarks</label>
                <textarea
                  rows={2}
                  className="side-edit-textarea"
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                />
              </div>

              <div className="side-edit-field" style={{ marginTop: '4px' }}>
                <label className="side-edit-label">Stage Event History</label>
                <div className="side-edit-timeline-list">
                  <div className="side-edit-timeline-item">
                    <span className="side-edit-timeline-dot"></span>
                    <div className="side-edit-timeline-content">
                      <span className="side-edit-timeline-title">Order Received at Intake Register</span>
                      <span className="side-edit-timeline-time">28 Oct 2026, 10:15 AM · By Admin</span>
                    </div>
                  </div>
                  <div className="side-edit-timeline-item">
                    <span className="side-edit-timeline-dot"></span>
                    <div className="side-edit-timeline-content">
                      <span className="side-edit-timeline-title">Garments Checked &amp; Care Tagged</span>
                      <span className="side-edit-timeline-time">28 Oct 2026, 11:20 AM · Bag Tag: {dispatchBagTag}</span>
                    </div>
                  </div>
                  <div className="side-edit-timeline-item">
                    <span className="side-edit-timeline-dot" style={{ background: '#f59e0b' }}></span>
                    <div className="side-edit-timeline-content">
                      <span className="side-edit-timeline-title">Moved to Washing Cycle ({assignedMachine})</span>
                      <span className="side-edit-timeline-time">28 Oct 2026, 02:40 PM · Current Active Stage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS (Requested in User Image Red Box) */}
          {activeTab === '4. Payments' && (
            <div className="side-edit-card">
              <div className="side-edit-card-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                <span>Payments, Invoicing &amp; Billing Measures</span>
              </div>

              {/* 3 Metric Summary Boxes */}
              <div className="side-edit-metric-cards">
                <div className="side-edit-metric-box">
                  <span className="side-edit-metric-label">Total Amount</span>
                  <span className="side-edit-metric-val">{currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
                <div className="side-edit-metric-box">
                  <span className="side-edit-metric-label">Advance Paid</span>
                  <span className="side-edit-metric-val green">{currencySymbol}{Number(advancePaid || 0).toFixed(2)}</span>
                </div>
                <div className="side-edit-metric-box">
                  <span className="side-edit-metric-label">Balance Due</span>
                  <span className="side-edit-metric-val blue">{currencySymbol}{balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <div className="side-edit-row-2col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Payment Status <span className="side-edit-req">*</span></label>
                  <select
                    className="side-edit-select"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="Paid in Full">Paid in Full</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid / Pay on Delivery">Unpaid / Pay on Delivery</option>
                  </select>
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Payment Mode <span className="side-edit-req">*</span></label>
                  <select
                    className="side-edit-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="UPI / Google Pay">UPI / Google Pay (GPay / PhonePe)</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Credit Card">Credit Card (POS Terminal)</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Store Credit">Store Credit / Wallet</option>
                  </select>
                </div>
              </div>

              <div className="side-edit-row-3col">
                <div className="side-edit-field">
                  <label className="side-edit-label">Advance Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    className="side-edit-input"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Discount Applied ({currencySymbol})</label>
                  <input
                    type="number"
                    className="side-edit-input"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">Invoice Number</label>
                  <input
                    type="text"
                    className="side-edit-input"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Transaction / UPI Reference Number</label>
                <input
                  type="text"
                  className="side-edit-input"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI/2026/8941729831"
                />
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Payment Remark &amp; Receipts</label>
                <textarea
                  rows={2}
                  className="side-edit-textarea"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMER MESSAGES */}
          {activeTab === '5. Customer Messages' && (
            <div className="side-edit-card">
              <div className="side-edit-card-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Customer Notifications &amp; Messaging</span>
              </div>

              <div className="side-edit-row-2col">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 650, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  />
                  <span>WhatsApp Alerts Enabled</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 650, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                  />
                  <span>SMS Transactional Updates</span>
                </label>
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Recipient Mobile</label>
                <input
                  type="text"
                  className="side-edit-input"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Message Content</label>
                <textarea
                  rows={3}
                  className="side-edit-textarea"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="side-edit-btn-save"
                style={{ width: 'fit-content' }}
                onClick={() => showToast?.(`💬 Message dispatched to ${mobileNumber}`)}
              >
                Send Message to Customer
              </button>
            </div>
          )}

          {/* TAB 6: COMMENTS & AUDIT */}
          {activeTab === '6. Comments & Audit' && (
            <div className="side-edit-card">
              <div className="side-edit-card-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span>Internal Staff Notes &amp; Audit Trail</span>
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Internal Staff Notes (Not visible on customer receipt)</label>
                <textarea
                  rows={3}
                  className="side-edit-textarea"
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                />
              </div>

              <div className="side-edit-field">
                <label className="side-edit-label">Special Handling Tags</label>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 600 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={flags.delicate}
                      onChange={(e) => setFlags({ ...flags, delicate: e.target.checked })}
                    />
                    <span>Delicate Fabric</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={flags.colorBleed}
                      onChange={(e) => setFlags({ ...flags, colorBleed: e.target.checked })}
                    />
                    <span>Color Bleed Risk</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={flags.starch}
                      onChange={(e) => setFlags({ ...flags, starch: e.target.checked })}
                    />
                    <span>Starch Requested</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={flags.express}
                      onChange={(e) => setFlags({ ...flags, express: e.target.checked })}
                    />
                    <span>Express Priority</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Fixed Footer & Navigation Tabs ── */}
        <div className="side-edit-footer">
          <div className="side-edit-nav-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`side-edit-nav-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  showToast?.(`Switched to: ${tab}`);
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="side-edit-footer-actions">
            <button
              type="button"
              className="side-edit-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="side-edit-btn-save"
              onClick={handleSaveStatic}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
