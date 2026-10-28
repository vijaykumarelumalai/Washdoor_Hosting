// src/components/POSModule.jsx
// Washdoor Orders & POS Counter Intake & Management Module
// Matches the exact Orders & POS design with Orders List Table and Counter Intake Register

import React, { useState, useEffect, useMemo } from 'react';
import ClothIllustration from './ClothIllustration';
import OrderReviewCard from './OrderReviewCard';
import {
  getProducts,
  searchCustomers,
  createOrderWithCustomer,
  getNextOrderId,
} from '../services/customerService';
import {
  normalizeMobileNumber,
  formatPhoneDisplay,
  friendlySupabaseError,
} from '../utils/validation';
import '../styles/POSModule.css';

const DEFAULT_PRODUCTS = [
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
const SERVICE_OPTIONS = ['Wash & Steam Press', 'Wash & Fold', 'Dry Cleaning', 'Steam Press Only', 'Heavy Linens'];

export default function POSModule({
  orders = [],
  loadingOrders = false,
  onRefreshOrders,
  onCreateOrder,
  currencySymbol = '₹',
  showToast,
  onOpenOrderStatus,
  onEditOrder,
  onOrderCreated,
  onNavigateTab,
}) {
  // Top Header, Search Toolbar & Status Tab State (matching reference mockup)
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [activeTopDropdown, setActiveTopDropdown] = useState(null); // 'filters' | 'date' | null
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [posViewMode, setPosViewMode] = useState('orders'); // 'orders' | 'intake'
  const [orderDisplayLayout, setOrderDisplayLayout] = useState('table'); // 'table' | 'cards'
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Catalog State
  const [catalogItems, setCatalogItems] = useState(DEFAULT_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [taxExemption, setTaxExemption] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Customer State
  const [customerMode, setCustomerMode] = useState('search'); // 'search' | 'walk-in'
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinAddress, setWalkinAddress] = useState('');

  // Service Details State
  const [serviceCategory, setServiceCategory] = useState('Wash & Steam Press');
  const [intakeType, setIntakeType] = useState('Walk-In');
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });

  // System sequence & submission state
  const [nextOrderNum, setNextOrderNum] = useState('ORDER-00001');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Held Orders State
  const [heldOrders, setHeldOrders] = useState(() => {
    try {
      const stored = localStorage.getItem('washdoor_pos_held_orders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

  // Sync held orders to localStorage
  const saveHeldOrders = (list) => {
    setHeldOrders(list);
    try {
      localStorage.setItem('washdoor_pos_held_orders', JSON.stringify(list));
    } catch {}
  };

  // Fetch sequence and products on mount
  useEffect(() => {
    getNextOrderId().then((num) => {
      if (num) setNextOrderNum(num);
    });

    getProducts().then((res) => {
      if (res?.data && res.data.length > 0) {
        setCatalogItems(res.data);
      }
    });
  }, []);

  // Debounced search for customers
  useEffect(() => {
    if (!customerSearchQuery.trim() || customerSearchQuery.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCustomers(customerSearchQuery.trim());
      const list = Array.isArray(results) ? results : (results?.data || []);
      setCustomerResults(list.slice(0, 5));
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Close top dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.pos-filter-dropdown-container')) {
        setActiveTopDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Compute live counts for Status Filter Pills (matching user mockup)
  const statusCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      received: 0,
      inProgress: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      const s = String(o.order_status || o.status || '').toLowerCase();
      if (s === 'received') {
        counts.received++;
      } else if (
        s.includes('progress') ||
        s.includes('registered') ||
        s.includes('wash') ||
        s.includes('press') ||
        s.includes('clean')
      ) {
        counts.inProgress++;
      } else if (s.includes('ready')) {
        counts.ready++;
      } else if (s.includes('delivered')) {
        counts.delivered++;
      } else if (s.includes('cancel')) {
        counts.cancelled++;
      } else {
        counts.inProgress++;
      }
    });
    return counts;
  }, [orders]);

  // Quick matches for top search bar
  const matchingTopOrders = useMemo(() => {
    if (!topSearchQuery.trim()) return [];
    const q = topSearchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const num = String(o.order_number || o.id || '').toLowerCase();
      const name = String(o.customer_name || o.customer?.customer_name || '').toLowerCase();
      const phone = String(o.mobile_number || o.customer?.mobile_number || '').replace(/\D/g, '');
      return num.includes(q) || name.includes(q) || phone.includes(q);
    }).slice(0, 5);
  }, [orders, topSearchQuery]);

  // Full filtered list of orders for the Orders List view
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter
      if (activeStatusTab !== 'All') {
        const s = String(o.order_status || o.status || '').toLowerCase();
        if (activeStatusTab === 'Received' && s !== 'received') return false;
        if (
          activeStatusTab === 'In Progress' &&
          !s.includes('progress') &&
          !s.includes('registered') &&
          !s.includes('wash') &&
          !s.includes('press') &&
          !s.includes('clean')
        ) return false;
        if (activeStatusTab === 'Ready' && !s.includes('ready')) return false;
        if (activeStatusTab === 'Delivered' && !s.includes('delivered')) return false;
        if (activeStatusTab === 'Cancelled' && !s.includes('cancel')) return false;
      }

      // 2. Search Filter
      if (topSearchQuery && topSearchQuery.trim()) {
        const q = topSearchQuery.toLowerCase().trim();
        const num = String(o.order_number || o.id || '').toLowerCase();
        const name = String(o.customer_name || o.customer?.customer_name || '').toLowerCase();
        const phone = String(o.mobile_number || o.customer?.mobile_number || '').replace(/\D/g, '');
        if (!num.includes(q) && !name.includes(q) && !phone.includes(q)) return false;
      }

      // 3. Service Filter
      if (serviceFilter && serviceFilter !== 'All Services') {
        const srv = String(o.service_category || o.preference || o.service_type || '').toLowerCase();
        if (!srv.includes(serviceFilter.toLowerCase())) return false;
      }

      // 4. Date Filter
      if (dateFilter && dateFilter !== 'All Time') {
        const orderDateStr = o.intake_date || o.created_at;
        if (orderDateStr) {
          const d = new Date(orderDateStr);
          const today = new Date();
          if (dateFilter === 'Today') {
            if (d.toDateString() !== today.toDateString()) return false;
          } else if (dateFilter === 'Yesterday') {
            const y = new Date();
            y.setDate(today.getDate() - 1);
            if (d.toDateString() !== y.toDateString()) return false;
          } else if (dateFilter === 'Last 7 Days') {
            const diff = (today - d) / (1000 * 60 * 60 * 24);
            if (diff > 7 || diff < 0) return false;
          } else if (dateFilter === 'This Month') {
            if (d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) return false;
          }
        }
      }

      return true;
    });
  }, [orders, activeStatusTab, topSearchQuery, serviceFilter, dateFilter]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchesCategory =
        activeCategory === 'All Items' ||
        item.category === activeCategory ||
        item.secondaryCategory === activeCategory;
      const matchesSearch =
        !catalogSearch.trim() ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(catalogSearch.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [catalogItems, activeCategory, catalogSearch]);

  // Cart operations
  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.id === product.id && i.service === serviceCategory
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const item = updated[existingIndex];
        const nextQty = item.qty + 1;
        updated[existingIndex] = {
          ...item,
          qty: nextQty,
          amount: nextQty * item.rate,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          rate: Number(product.price || product.base_price || 20),
          qty: 1,
          amount: Number(product.price || product.base_price || 20),
          service: serviceCategory,
          unit: product.unit || 'piece',
        },
      ];
    });
    showToast?.(`+ Added ${product.name} to cart`);
  };

  const handleUpdateItemQty = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const nextQty = item.qty + delta;
      if (nextQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...item,
        qty: nextQty,
        amount: nextQty * item.rate,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemServiceChange = (index, newService) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], service: newService };
      return updated;
    });
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from the current cart?')) {
      setCart([]);
      showToast?.('🧹 Cart cleared');
    }
  };

  // Price calculations
  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [cart]);

  const effectiveTaxExempt = taxExemption || Boolean(selectedCustomer?.tax_exemption);
  const gstAmount = effectiveTaxExempt ? 0 : subtotal * 0.05;
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const grandTotal = Math.max(0, subtotal + gstAmount - discountAmount);

  // Customer selection
  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setTaxExemption(Boolean(cust.tax_exemption));
    setCustomerSearchQuery('');
    setCustomerResults([]);
    showToast?.(`👤 Selected: ${cust.customer_name}`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setTaxExemption(false);
  };

  // Hold current order
  const handleHoldOrder = () => {
    if (cart.length === 0) {
      showToast?.('⚠️ Cannot hold an empty cart');
      return;
    }

    const heldItem = {
      id: Date.now().toString(),
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      selectedCustomer,
      walkinName,
      walkinPhone,
      walkinAddress,
      serviceCategory,
      intakeType,
      specialNotes,
      subtotal,
      grandTotal,
      totalItemsCount,
    };

    saveHeldOrders([heldItem, ...heldOrders]);
    setCart([]);
    setSelectedCustomer(null);
    setWalkinName('');
    setWalkinPhone('');
    setWalkinAddress('');
    setSpecialNotes('');
    showToast?.('⏸ Current order parked on hold');
  };

  // Restore held order
  const handleRestoreHeld = (item) => {
    setCart(item.cart || []);
    setSelectedCustomer(item.selectedCustomer || null);
    setWalkinName(item.walkinName || '');
    setWalkinPhone(item.walkinPhone || '');
    setWalkinAddress(item.walkinAddress || '');
    setServiceCategory(item.serviceCategory || 'Wash & Steam Press');
    setIntakeType(item.intakeType || 'Walk-In');
    setSpecialNotes(item.specialNotes || '');

    saveHeldOrders(heldOrders.filter((h) => h.id !== item.id));
    setIsHeldModalOpen(false);
    showToast?.('▶ Resumed held order');
  };

  const handleDeleteHeld = (itemId) => {
    saveHeldOrders(heldOrders.filter((h) => h.id !== itemId));
    showToast?.('🗑 Held order discarded');
  };

  // Reset entire POS register
  const handleResetRegister = () => {
    if (cart.length > 0 && !window.confirm('Reset POS register and discard current cart?')) {
      return;
    }
    setCart([]);
    setSelectedCustomer(null);
    setWalkinName('');
    setWalkinPhone('');
    setWalkinAddress('');
    setSpecialNotes('');
    setDiscountPercent(0);
    setTaxExemption(false);
    getNextOrderId().then((num) => num && setNextOrderNum(num));
    showToast?.('✨ POS register ready for next customer');
  };

  // Submit and create order
  const handleBookOrder = async () => {
    if (cart.length === 0) {
      showToast?.('⚠️ Please add at least one garment item to the cart');
      return;
    }

    const customerName = selectedCustomer?.customer_name || walkinName.trim();
    const rawMobile = selectedCustomer?.mobile_number || walkinPhone.trim();
    const cleanMobile = normalizeMobileNumber(rawMobile);

    if (!customerName) {
      showToast?.('⚠️ Please select or enter a Customer Name');
      return;
    }

    if (!cleanMobile || cleanMobile.length !== 10) {
      showToast?.('⚠️ Please provide a valid 10-digit Mobile Number');
      return;
    }

    setIsSubmitting(true);

    const customerPayload = {
      customer_name: customerName,
      mobile_number: cleanMobile,
      address: selectedCustomer?.address || walkinAddress.trim() || 'Counter Walk-In',
      tax_exemption: effectiveTaxExempt,
      service_category: serviceCategory,
      notes: specialNotes,
      item_count: totalItemsCount,
      total_amount: grandTotal,
    };

    const existingCustId = selectedCustomer?.customer_id || selectedCustomer?.customerId || selectedCustomer?.id;

    const { data, error } = await createOrderWithCustomer({
      existingCustomerId: existingCustId,
      customerData: customerPayload,
      orderType: intakeType.toLowerCase(),
      orderPreference: serviceCategory,
      orderPreferenceNotes: specialNotes,
      totalAmount: grandTotal,
      items: cart,
    });

    setIsSubmitting(false);

    if (error) {
      showToast?.(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }

    const finalOrderNum = data?.order_number || nextOrderNum;
    showToast?.(`✅ Order ${finalOrderNum} placed successfully!`);

    const createdRecord = {
      id: finalOrderNum,
      order_number: finalOrderNum,
      customer_name: customerName,
      mobile_number: cleanMobile,
      total_amount: grandTotal,
      item_count: totalItemsCount,
      order_status: 'Order in Progress',
      created_at: new Date().toISOString(),
      items: cart,
      customer: {
        customer_name: customerName,
        mobile_number: cleanMobile,
        address: customerPayload.address,
        tax_exemption: effectiveTaxExempt,
      },
    };

    onOrderCreated?.(createdRecord);
    if (onOpenOrderStatus) {
      onOpenOrderStatus(createdRecord, true);
    }

    handleResetRegister();
    setPosViewMode('orders');
  };

  return (
    <div className="pos-module-container">
      {/* ── Screen Top Header: Orders & POS (Matching Reference Mockup) ── */}
      <div className="pos-screen-header">
        <div>
          <h1 className="pos-screen-title">Orders &amp; POS</h1>
          <div className="pos-screen-subtitle">Create new order, search and manage orders</div>
        </div>
        <button
          type="button"
          className="pos-create-order-btn"
          id="posCreateOrderBtn"
          onClick={() => {
            if (onCreateOrder) onCreateOrder();
            else {
              handleResetRegister();
              setPosViewMode('intake');
            }
          }}
          title="Create new order (Press N)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create Order</span>
          <span className="pos-key-badge">N</span>
        </button>
      </div>

      {/* ── POS Search Toolbar (Search Bar + Filters + Date Range + Refresh) ── */}
      <div className="pos-toolbar-row">
        <div className="pos-search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#687e9c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="pos-search-input toolbar-search-input"
            placeholder="Search by order ID, customer name or mobile number..."
            value={topSearchQuery}
            onChange={(e) => setTopSearchQuery(e.target.value)}
          />
          {topSearchQuery && (
            <button
              type="button"
              className="pos-search-clear-btn"
              onClick={() => setTopSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Dropdown */}
        <div className="pos-filter-dropdown-container">
          <button
            type="button"
            className={`pos-toolbar-btn ${activeTopDropdown === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTopDropdown((prev) => (prev === 'filters' ? null : 'filters'))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filters</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {activeTopDropdown === 'filters' && (
            <div className="pos-dropdown-menu">
              <div className="pos-dropdown-header" style={{ fontSize: '11px', padding: '4px 10px 6px', fontWeight: 700, textTransform: 'uppercase' }}>
                Service Category
              </div>
              {['All Services', 'Wash & Steam Press', 'Wash & Fold', 'Dry Cleaning', 'Steam Press Only'].map((srv) => (
                <button
                  key={srv}
                  type="button"
                  className={`pos-dropdown-item ${serviceFilter === srv ? 'active' : ''}`}
                  onClick={() => {
                    setServiceFilter(srv);
                    setActiveTopDropdown(null);
                  }}
                >
                  <span>{srv}</span>
                  {serviceFilter === srv && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Dropdown */}
        <div className="pos-filter-dropdown-container">
          <button
            type="button"
            className={`pos-toolbar-btn ${activeTopDropdown === 'date' ? 'active' : ''}`}
            onClick={() => setActiveTopDropdown((prev) => (prev === 'date' ? null : 'date'))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Date Range</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {activeTopDropdown === 'date' && (
            <div className="pos-dropdown-menu">
              <div className="pos-dropdown-header" style={{ fontSize: '11px', padding: '4px 10px 6px', fontWeight: 700, textTransform: 'uppercase' }}>
                Select Range
              </div>
              {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'This Month'].map((rng) => (
                <button
                  key={rng}
                  type="button"
                  className={`pos-dropdown-item ${dateFilter === rng ? 'active' : ''}`}
                  onClick={() => {
                    setDateFilter(rng);
                    setActiveTopDropdown(null);
                  }}
                >
                  <span>{rng}</span>
                  {dateFilter === rng && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          className="pos-toolbar-icon-btn"
          disabled={loadingOrders}
          onClick={() => {
            onRefreshOrders?.();
            showToast?.('↻ Syncing orders with Supabase...');
          }}
          title="Reload records from Supabase"
        >
          <svg
            className={loadingOrders ? 'sync-spinner' : ''}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>

        {/* Floating Top Search Results */}
        {topSearchQuery && matchingTopOrders.length > 0 && (
          <div className="pos-top-search-results">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', padding: '4px 8px 6px', textTransform: 'uppercase' }}>
              Matching Orders ({matchingTopOrders.length})
            </div>
            {matchingTopOrders.map((ord) => (
              <div
                key={ord.id || ord.order_number}
                className="pos-top-result-item"
                onClick={() => {
                  onOpenOrderStatus?.(ord, false);
                  setTopSearchQuery('');
                }}
              >
                <div>
                  <div style={{ fontWeight: 650, fontSize: '13px', color: '#f1f5f9' }}>
                    {ord.order_number || ord.id} • {ord.customer_name || ord.customer?.customer_name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#8899ac' }}>
                    {ord.order_status || 'Order in Progress'} • {currencySymbol}{ord.total_amount || 0}
                  </div>
                </div>
                <button type="button" className="pos-item-add-btn" style={{ fontSize: '11px', padding: '4px 10px' }}>
                  View Bill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Status Filter Pills Bar (Matching Reference Mockup) ── */}
      <div className="pos-status-pills-bar">
        <button
          type="button"
          className={`pos-status-pill ${activeStatusTab === 'All' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatusTab('All');
            setPosViewMode('orders');
          }}
        >
          <span>All</span>
          <span className="pos-status-pill-count">{statusCounts.all}</span>
          {activeStatusTab === 'All' && <span className="pos-pill-active-line" />}
        </button>

        <button
          type="button"
          className={`pos-status-pill ${activeStatusTab === 'Received' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatusTab('Received');
            setPosViewMode('orders');
          }}
        >
          <span className="pos-status-dot dot-received"></span>
          <span>Received</span>
          <span className="pos-status-pill-count">{statusCounts.received}</span>
          {activeStatusTab === 'Received' && <span className="pos-pill-active-line" />}
        </button>

        <button
          type="button"
          className={`pos-status-pill ${activeStatusTab === 'In Progress' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatusTab('In Progress');
            setPosViewMode('orders');
          }}
        >
          <span className="pos-status-dot dot-progress"></span>
          <span>In Progress</span>
          <span className="pos-status-pill-count">{statusCounts.inProgress}</span>
          {activeStatusTab === 'In Progress' && <span className="pos-pill-active-line" />}
        </button>

        <button
          type="button"
          className={`pos-status-pill ${activeStatusTab === 'Ready' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatusTab('Ready');
            setPosViewMode('orders');
          }}
        >
          <span className="pos-status-dot dot-ready"></span>
          <span>Ready</span>
          <span className="pos-status-pill-count">{statusCounts.ready}</span>
          {activeStatusTab === 'Ready' && <span className="pos-pill-active-line" />}
        </button>

        <button
          type="button"
          className={`pos-status-pill ${activeStatusTab === 'Delivered' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatusTab('Delivered');
            setPosViewMode('orders');
          }}
        >
          <span className="pos-status-dot dot-delivered"></span>
          <span>Delivered</span>
          <span className="pos-status-pill-count">{statusCounts.delivered}</span>
          {activeStatusTab === 'Delivered' && <span className="pos-pill-active-line" />}
        </button>

        <button
          type="button"
          className={`pos-status-pill ${activeStatusTab === 'Cancelled' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatusTab('Cancelled');
            setPosViewMode('orders');
          }}
        >
          <span className="pos-status-dot dot-cancelled"></span>
          <span>Cancelled</span>
          <span className="pos-status-pill-count">{statusCounts.cancelled}</span>
          {activeStatusTab === 'Cancelled' && <span className="pos-pill-active-line" />}
        </button>
      </div>

      {/* ── POS View Switcher & Action Bar (Matching Reference Mockup) ── */}
      <div className="pos-workstation-bar">
        <div className="pos-view-switch-tabs">
          <button
            type="button"
            className={`pos-view-switch-btn ${posViewMode === 'orders' ? 'active' : ''}`}
            onClick={() => setPosViewMode('orders')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span>Orders List ({filteredOrders.length})</span>
          </button>

          <button
            type="button"
            className={`pos-view-switch-btn ${posViewMode === 'intake' ? 'active' : ''}`}
            onClick={() => setPosViewMode('intake')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Counter Intake Register</span>
            <span className="pos-next-ticket-tag">{nextOrderNum}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {posViewMode === 'orders' && (
            <div className="pos-layout-toggle-group">
              <button
                type="button"
                className={`pos-layout-btn ${orderDisplayLayout === 'table' ? 'active' : ''}`}
                onClick={() => setOrderDisplayLayout('table')}
                title="Table View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
                <span>Table</span>
              </button>
              <button
                type="button"
                className={`pos-layout-btn ${orderDisplayLayout === 'cards' ? 'active' : ''}`}
                onClick={() => setOrderDisplayLayout('cards')}
                title="Detailed Cards View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Cards</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`pos-action-btn ${heldOrders.length > 0 ? 'active' : ''}`}
            onClick={() => setIsHeldModalOpen(true)}
            title="View Parked / Held Orders"
          >
            <span>⏸</span> Held Orders ({heldOrders.length})
          </button>

          <button
            type="button"
            className="pos-action-btn"
            onClick={() => {
              handleResetRegister();
              setPosViewMode('intake');
            }}
            title="Clear and reset register for next customer"
          >
            <span>🧹</span> New Order / Reset
          </button>
        </div>
      </div>

      {posViewMode === 'orders' ? (
        <div className="pos-orders-view-wrap">
          {loadingOrders && filteredOrders.length === 0 ? (
            <div className="pos-orders-loading-wrap" style={{ width: '100%' }}>
              <div className="pos-orders-loading" style={{ padding: '24px 20px', marginBottom: '14px' }}>
                <div className="sync-spinner" style={{ width: '26px', height: '26px' }}></div>
                <p style={{ margin: 0, fontSize: '13.5px' }}>Connecting to Supabase and fetching live orders…</p>
              </div>
              <div className="pos-orders-cards-list">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-order-card" style={{ padding: '16px 20px', borderRadius: '14px' }}>
                    <div className="skeleton-avatar skeleton-shimmer"></div>
                    <div className="skeleton-info-wrap" style={{ flex: 1 }}>
                      <div className="skeleton-bar skeleton-bar-name skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-pill skeleton-shimmer"></div>
                      <div className="skeleton-bar skeleton-bar-phone skeleton-shimmer"></div>
                    </div>
                    <div className="skeleton-btn skeleton-shimmer" style={{ width: '80px', height: '32px' }}></div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="pos-orders-empty-state">
              <div className="pos-empty-icon-wrap">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7668ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <h3 className="pos-empty-title">
                No {activeStatusTab !== 'All' ? activeStatusTab : ''} orders found
              </h3>
              <p className="pos-empty-sub">
                {topSearchQuery
                  ? `No orders matching "${topSearchQuery}" were found.`
                  : activeStatusTab !== 'All'
                  ? `There are currently 0 orders under the "${activeStatusTab}" status.`
                  : 'Start taking orders to see customer items, bills, and workflow status here.'}
              </p>
              <button
                type="button"
                className="pos-empty-take-order-btn"
                onClick={() => setPosViewMode('intake')}
              >
                <span>＋</span> Take New Order (Press N)
              </button>
            </div>
          ) : (
            <>
              {loadingOrders && (
                <div className="syncing-banner" style={{ margin: '0 0 10px 0', alignSelf: 'flex-start' }}>
                  <span className="sync-spinner"></span>
                  <span>Syncing latest orders with Supabase…</span>
                </div>
              )}
              {orderDisplayLayout === 'cards' ? (
                <div className="pos-orders-cards-list">
                  {filteredOrders.map((ord) => (
                    <OrderReviewCard
                      key={ord.id || ord.order_number}
                      order={ord}
                      isExpanded={expandedOrderId === (ord.id || ord.order_number)}
                      onToggleExpand={() => {
                        const key = ord.id || ord.order_number;
                        setExpandedOrderId((prev) => (prev === key ? null : key));
                      }}
                      onEdit={(orderToEdit) => onEditOrder?.(orderToEdit)}
                      onOpenStatus={(orderStatus) => onOpenOrderStatus?.(orderStatus, false)}
                      onOpenBill={(orderBill) => onOpenOrderStatus?.(orderBill, true)}
                      showToast={showToast}
                      currencySymbol={currencySymbol}
                    />
                  ))}
                </div>
              ) : (
                <div className="pos-orders-table-card">
                  <table className="pos-orders-table">
                    <thead>
                      <tr>
                        <th>ORDER TICKET</th>
                        <th>CUSTOMER</th>
                        <th>GARMENTS &amp; SERVICE</th>
                        <th>DELIVERY TARGET</th>
                        <th>AMOUNT &amp; BALANCE</th>
                        <th>WORKFLOW STATUS</th>
                        <th style={{ textAlign: 'right', paddingRight: '18px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((ord) => {
                        const custName = ord.customer_name || ord.customer?.customer_name || 'Walk-in Customer';
                        const phone = ord.mobile_number || ord.customer?.mobile_number || '';
                        const orderNum = ord.order_number || (ord.id ? `ORDER-${ord.id}` : 'ORDER-00001');
                        const items = ord.customer_history?.items || ord.items || [];
                        const itemCount = Array.isArray(items) && items.length > 0
                          ? items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0)
                          : (ord.item_count || 1);
                        const srv = ord.service_category || ord.service_type || ord.preference || 'Wash & Steam Press';
                        const amt = Number(ord.total_amount || 0);
                        const advance = Number(ord.advance_paid || 0);
                        const balDue = Math.max(0, amt - advance);
                        const payStatus = ord.payment_status || (balDue <= 0 && amt > 0 ? 'PAID' : 'UNPAID');
                        const workStatus = ord.order_status || ord.status || 'Order in Progress';

                        let statusPillClass = 'dot-progress';
                        const sLower = workStatus.toLowerCase();
                        if (sLower === 'received') statusPillClass = 'dot-received';
                        else if (sLower.includes('ready')) statusPillClass = 'dot-ready';
                        else if (sLower.includes('delivered')) statusPillClass = 'dot-delivered';
                        else if (sLower.includes('cancel')) statusPillClass = 'dot-cancelled';

                        return (
                          <tr key={ord.id || ord.order_number} className="pos-order-row">
                            {/* 1. Ticket Number */}
                            <td>
                              <div className="pos-ticket-cell">
                                <span
                                  className="pos-ticket-num"
                                  onClick={() => onOpenOrderStatus?.(ord, true)}
                                  title="Click to view printable bill"
                                  style={{ cursor: 'pointer', fontWeight: 700 }}
                                >
                                  {orderNum}
                                </span>
                                <span className="pos-ticket-date" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                  {ord.created_at ? ord.created_at.replace(/^(\d{4})-(\d{2})-(\d{2})T/, '$3T') : 'Today'}
                                </span>
                              </div>
                            </td>

                            {/* 2. Customer */}
                            <td>
                              <div className="pos-cust-cell">
                                <span className="pos-cust-name" style={{ fontWeight: 700 }}>{custName}</span>
                                <span className="pos-cust-phone">{formatPhoneDisplay(phone) || 'No phone'}</span>
                              </div>
                            </td>

                            {/* 3. Garments & Service */}
                            <td>
                              <div className="pos-service-cell">
                                <span className="pos-service-tag">{srv}</span>
                                <span className="pos-pieces-sub">{itemCount} piece{itemCount !== 1 ? 's' : ''}</span>
                              </div>
                            </td>

                            {/* 4. Delivery Target */}
                            <td>
                              <div className="pos-date-cell">
                                <span className="pos-delivery-date" style={{ fontWeight: 600 }}>Standard 48H</span>
                                <span className="pos-delivery-sub">Target Delivery</span>
                              </div>
                            </td>

                            {/* 5. Amount & Payment */}
                            <td>
                              <div className="pos-amt-cell">
                                <span className="pos-amt-val">{currencySymbol}{amt.toFixed(2)}</span>
                                <span className="pos-pay-badge pay-unpaid" style={{
                                  background: payStatus.toUpperCase() === 'PAID' ? '#dcfce7' : '#fef3c7',
                                  color: payStatus.toUpperCase() === 'PAID' ? '#15803d' : '#d97706',
                                  border: payStatus.toUpperCase() === 'PAID' ? '1px solid #bbf7d0' : '1px solid #fde68a',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  width: 'fit-content'
                                }}>
                                  {payStatus.toUpperCase()}
                                </span>
                              </div>
                            </td>

                            {/* 6. Workflow Status */}
                            <td>
                              <div className="pos-status-badge-wrap" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>
                                <span className={`pos-status-dot ${statusPillClass}`}></span>
                                <span className="pos-status-text">{workStatus}</span>
                              </div>
                            </td>

                            {/* 7. Actions */}
                            <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                              <div className="pos-row-actions">
                                <button
                                  type="button"
                                  className="pos-table-action-btn btn-bill"
                                  onClick={() => onOpenOrderStatus?.(ord, true)}
                                  title="View & Print Bill / Invoice"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                  <span>Bill</span>
                                </button>

                                <button
                                  type="button"
                                  className="pos-table-action-btn btn-status"
                                  onClick={() => onOpenOrderStatus?.(ord, false)}
                                  title="Update Workflow Pipeline Status"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                  </svg>
                                  <span>Status</span>
                                </button>

                                <button
                                  type="button"
                                  className="pos-table-action-btn btn-edit"
                                  onClick={() => onEditOrder?.(ord)}
                                  title="Edit Order"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── 3-Column POS Workstation ── */
        <div className="pos-module-grid">
          {/* ── Column 1: Product & Garment Catalog ── */}
          <div className="pos-card-panel">
            <div className="pos-panel-header">
              <div className="pos-panel-title">
                <span>👕</span> Garments &amp; Catalog
                <span className="pos-pill-count">{filteredProducts.length} items</span>
              </div>
            </div>

            {/* Catalog Search */}
            <div className="pos-catalog-search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="pos-catalog-search-input"
                placeholder="Search garments (shirt, jeans, saree...)"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>

            {/* Category Tabs */}
            <div className="pos-catalog-tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pos-catalog-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="pos-items-grid">
              {filteredProducts.map((prod) => {
                const inCartQty = cart
                  .filter((c) => c.id === prod.id)
                  .reduce((s, c) => s + c.qty, 0);

                return (
                  <div
                    key={prod.id}
                    className={`pos-item-card ${inCartQty > 0 ? 'in-cart' : ''}`}
                    onClick={() => handleAddToCart(prod)}
                    title={`Click to add ${prod.name} (${currencySymbol}${prod.price || prod.base_price})`}
                  >
                    {inCartQty > 0 && (
                      <span className="pos-item-in-cart-badge">{inCartQty}</span>
                    )}
                    <div className="pos-item-img-box">
                      <ClothIllustration itemId={prod.id} size={46} />
                    </div>
                    <div className="pos-item-title">{prod.name}</div>
                    <div className="pos-item-price-tag">
                      {currencySymbol}{prod.price || prod.base_price || 20}
                    </div>
                    <button
                      type="button"
                      className="pos-item-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(prod);
                      }}
                    >
                      ＋ Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Column 2: Order Cart & Billing Summary ── */}
          <div className="pos-card-panel">
            <div className="pos-panel-header">
              <div className="pos-panel-title">
                <span>🧺</span> Active Cart
                <span className="pos-pill-count">{totalItemsCount} pcs</span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Table / Items List */}
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <div className="pos-cart-empty-icon">🧺</div>
                <div style={{ fontWeight: 650, color: '#94a3b8', fontSize: '14px' }}>Cart is Empty</div>
                <div style={{ fontSize: '12.5px' }}>
                  Select garments from the catalog to build an intake order.
                </div>
              </div>
            ) : (
              <div className="pos-cart-list">
                {cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="pos-cart-row">
                    <div className="pos-cart-item-info">
                      <div className="pos-cart-item-thumb">
                        <ClothIllustration itemId={item.id} size={28} />
                      </div>
                      <div className="pos-cart-item-meta">
                        <div className="pos-cart-item-name">{item.name}</div>
                        <select
                          className="pos-cart-service-select"
                          value={item.service}
                          onChange={(e) => handleItemServiceChange(idx, e.target.value)}
                          title="Change service treatment"
                        >
                          {SERVICE_OPTIONS.map((srv) => (
                            <option key={srv} value={srv}>
                              {srv}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="pos-cart-stepper">
                      <button
                        type="button"
                        className="pos-stepper-btn"
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        title="Decrease"
                      >
                        -
                      </button>
                      <span className="pos-stepper-val">{item.qty}</span>
                      <button
                        type="button"
                        className="pos-stepper-btn"
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        title="Increase"
                      >
                        +
                      </button>
                    </div>

                    <div className="pos-cart-amount">
                      {currencySymbol}{item.amount}
                    </div>

                    <button
                      type="button"
                      className="pos-cart-del-btn"
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Care Notes */}
            <div className="pos-field-group">
              <label className="pos-field-label">Special Care &amp; Order Notes</label>
              <textarea
                className="pos-textarea"
                placeholder="e.g. Extra starch on shirts, gentle wash for silk saree..."
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
              />
            </div>

            {/* Financial Breakdown */}
            <div className="pos-summary-box">
              <div className="pos-summary-line">
                <span>Garment Items:</span>
                <strong>{totalItemsCount} pieces</strong>
              </div>
              <div className="pos-summary-line">
                <span>Subtotal:</span>
                <strong>{currencySymbol}{subtotal.toFixed(2)}</strong>
              </div>
              <div className="pos-summary-line">
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={effectiveTaxExempt}
                    onChange={(e) => setTaxExemption(e.target.checked)}
                  />
                  <span>Tax Exempt (0% GST)</span>
                </label>
                <strong>{currencySymbol}{gstAmount.toFixed(2)}</strong>
              </div>
              {discountPercent > 0 && (
                <div className="pos-summary-line" style={{ color: '#4ade80' }}>
                  <span>Discount ({discountPercent}%):</span>
                  <strong>- {currencySymbol}{discountAmount.toFixed(2)}</strong>
                </div>
              )}
              <div className="pos-summary-line grand">
                <span>Grand Total:</span>
                <strong>{currencySymbol}{grandTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* ── Column 3: Customer Lookup & Checkout ── */}
          <div className="pos-card-panel pos-col-customer-wrap">
            <div className="pos-panel-header">
              <div className="pos-panel-title">
                <span>👤</span> Customer &amp; Dispatch
              </div>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Change
                </button>
              )}
            </div>

            {/* Selected Customer Card or Search / Walk-in Toggle */}
            {selectedCustomer ? (
              <div className="pos-selected-cust-card">
                <div className="pos-selected-cust-info">
                  <div className="pos-selected-cust-name">
                    <span>{selectedCustomer.customer_name}</span>
                    <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: '#0284c7', color: '#fff' }}>
                      {selectedCustomer.customer_id || 'REGISTERED'}
                    </span>
                  </div>
                  <div className="pos-selected-cust-phone">
                    📞 {formatPhoneDisplay(selectedCustomer.mobile_number)}
                  </div>
                  {selectedCustomer.address && (
                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      📍 {selectedCustomer.address}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="pos-cart-del-btn"
                  onClick={handleClearCustomer}
                  title="Deselect customer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                {/* Customer Mode Tabs */}
                <div className="pos-cust-mode-tabs">
                  <button
                    type="button"
                    className={`pos-cust-mode-btn ${customerMode === 'search' ? 'active' : ''}`}
                    onClick={() => setCustomerMode('search')}
                  >
                    Lookup Existing
                  </button>
                  <button
                    type="button"
                    className={`pos-cust-mode-btn ${customerMode === 'walk-in' ? 'active' : ''}`}
                    onClick={() => setCustomerMode('walk-in')}
                  >
                    Walk-In / New
                  </button>
                </div>

                {customerMode === 'search' ? (
                  <div className="pos-field-group">
                    <label className="pos-field-label">Search Registered Customers</label>
                    <div className="pos-search-input-wrap">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        className="pos-search-input"
                        placeholder="Search by customer name, phone, or ID..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Search Results Dropdown */}
                    {customerResults.length > 0 && (
                      <div className="pos-search-results-list">
                        {customerResults.map((c) => (
                          <div
                            key={c.id || c.customer_id}
                            className="pos-search-result-item"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <div>
                              <div style={{ fontWeight: '650', color: '#fff', fontSize: '13px' }}>
                                {c.customer_name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#7dd3fc' }}>
                                {formatPhoneDisplay(c.mobile_number)}
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', color: '#a5b4fc', fontFamily: 'monospace' }}>
                              {c.customer_id}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="pos-field-group">
                    <label className="pos-field-label">
                      Customer Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="pos-input"
                      placeholder="e.g. Ramesh Kumar"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                    />
                  </div>

                  <div className="pos-field-group">
                    <label className="pos-field-label">
                      Mobile Number (10 digits) <span className="req">*</span>
                    </label>
                    <input
                      type="tel"
                      className="pos-input"
                      placeholder="9876543210"
                      maxLength={14}
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                    />
                  </div>

                  <div className="pos-field-group">
                    <label className="pos-field-label">Address / Landmark</label>
                    <input
                      type="text"
                      className="pos-input"
                      placeholder="Area, Street or Flat No."
                      value={walkinAddress}
                      onChange={(e) => setWalkinAddress(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Service Settings */}
          <div className="pos-field-group">
            <label className="pos-field-label">Primary Intake Category</label>
            <select
              className="pos-select"
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
            >
              {SERVICE_OPTIONS.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>

          <div className="pos-field-group">
            <label className="pos-field-label">Intake Method</label>
            <select
              className="pos-select"
              value={intakeType}
              onChange={(e) => setIntakeType(e.target.value)}
            >
              <option value="Walk-In">Walk-In (Counter Intake)</option>
              <option value="On-Call">On-Call (Phone Order)</option>
              <option value="Pickup">Doorstep Pickup</option>
            </select>
          </div>

          {/* Delivery Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="pos-field-group">
              <label className="pos-field-label">Intake Date</label>
              <input
                type="date"
                className="pos-input"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>

            <div className="pos-field-group">
              <label className="pos-field-label">Target Delivery</label>
              <input
                type="date"
                className="pos-input"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Checkout & Hold Action Buttons */}
          <div className="pos-checkout-actions">
            <button
              type="button"
              className="pos-btn-primary"
              disabled={isSubmitting || cart.length === 0}
              onClick={handleBookOrder}
              title="Book order and generate invoice"
            >
              {isSubmitting ? (
                <>
                  <span className="sync-spinner" style={{ width: '16px', height: '16px' }} />
                  Processing Order...
                </>
              ) : (
                <>
                  <span>✓</span> Book Order &amp; Print Bill ({currencySymbol}{grandTotal.toFixed(2)})
                </>
              )}
            </button>

            <button
              type="button"
              className="pos-btn-hold"
              onClick={handleHoldOrder}
              title="Park this cart and serve next customer"
            >
              <span>⏸</span> Park / Hold Order
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Held Orders Modal ── */}
      {isHeldModalOpen && (
        <div className="pos-held-modal-backdrop" onClick={() => setIsHeldModalOpen(false)}>
          <div className="pos-held-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: 750, color: '#fff' }}>
                ⏸ Parked / Held Orders ({heldOrders.length})
              </div>
              <button
                type="button"
                className="pos-cart-del-btn"
                onClick={() => setIsHeldModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {heldOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                No held orders at the moment.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {heldOrders.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#040a14',
                      border: '1px solid #172a44',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 650, color: '#f1f5f9', fontSize: '13.5px' }}>
                        {item.selectedCustomer?.customer_name || item.walkinName || 'Walk-In Customer'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#7dd3fc', marginTop: '2px' }}>
                        {item.totalItemsCount} items • Held at {item.heldAt}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: '#38bdf8' }}>
                        {currencySymbol}{item.grandTotal?.toFixed(2)}
                      </strong>
                      <button
                        type="button"
                        className="pos-action-btn active"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handleRestoreHeld(item)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="pos-cart-del-btn"
                        onClick={() => handleDeleteHeld(item.id)}
                        title="Delete held order"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
