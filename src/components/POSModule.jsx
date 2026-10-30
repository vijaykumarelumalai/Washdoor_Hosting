// src/components/POSModule.jsx
// Washdoor Orders & POS Counter Intake & Management Module
// Matches the exact Orders & POS design with Orders List Table and Counter Intake Register

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ClothIllustration from './ClothIllustration';
import OrderReviewCard from './OrderReviewCard';
import SideEditPanel from './SideEditPanel';
import {
  getProducts,
  searchCustomers,
  createOrderWithCustomer,
  getNextOrderId,
  updateOrderInSupabase,
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

export function normalizeOrderStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('deliver') || s.includes('complete')) return 'Delivered';
  if (s.includes('ready') || s.includes('billing')) return 'Ready';
  if (s.includes('receive') || s.includes('intake') || s.includes('new') || s.includes('overdue')) return 'Order Received';
  if (s.includes('progress') || s.includes('wash') || s.includes('iron') || s.includes('process')) return 'In Progress';
  return 'Order Received';
}

const EDIT_CATALOG_ITEMS = [
  { id: 'shirt', name: 'Shirt', category: 'Men', price: 15, unit: 'piece', icon: '👕' },
  { id: 'tshirt', name: 'T-Shirt', category: 'Men', price: 12, unit: 'piece', icon: '👕' },
  { id: 'formal_pant', name: 'Formal Pant', category: 'Men', price: 20, unit: 'piece', icon: '👖' },
  { id: 'jeans', name: 'Jeans', category: 'Men', price: 25, unit: 'piece', icon: '👖' },
  { id: 'saree', name: 'Saree', category: 'Women', price: 60, unit: 'piece', icon: '🥻' },
  { id: 'towel', name: 'Towel', category: 'Home Linen', price: 15, unit: 'piece', icon: '🧼' },
  { id: 'kurta', name: 'Kurta', category: 'Men', secondaryCategory: 'Women', price: 25, unit: 'piece', icon: '👘' },
  { id: 'frock', name: 'Frock', category: 'Women', secondaryCategory: 'Kids', price: 30, unit: 'piece', icon: '👗' },
  { id: 'shorts', name: 'Shorts', category: 'Kids', secondaryCategory: 'Men', price: 15, unit: 'piece', icon: '🩳' },
  { id: 'bedsheet', name: 'Bedsheet', category: 'Home Linen', price: 40, unit: 'piece', icon: '🛏️' },
  { id: 'shoes', name: 'Shoes', category: 'Accessories', price: 80, unit: 'pair', icon: '👟' },
  { id: 'jacket', name: 'Jacket', category: 'Men', secondaryCategory: 'Women', price: 45, unit: 'piece', icon: '🧥' },
];

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
  onUpdateOrder,
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
  const [expandedServicesOrderId, setExpandedServicesOrderId] = useState(null);
  const tableScrollRef = useRef(null);

  // Inline Order Edit Modal State (List View Fields, Read-Only when Ready)
  const [editingOrderRecord, setEditingOrderRecord] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // Static Side Edit Panel Target Order
  const [sideEditTargetOrder, setSideEditTargetOrder] = useState(null);

  // Expanded Inline Edit Order States (Matching 3-panel UI)
  const [editCatalogCategory, setEditCatalogCategory] = useState('All');
  const [editCatalogSearch, setEditCatalogSearch] = useState('');
  const [editSelectedItem, setEditSelectedItem] = useState(EDIT_CATALOG_ITEMS[0]);
  const [editSelectedService, setEditSelectedService] = useState('Laundry + Iron');
  const [editSelectedQty, setEditSelectedQty] = useState(1);
  const [editSelectedRate, setEditSelectedRate] = useState(15);
  const [editCart, setEditCart] = useState([]);
  const [editInspection, setEditInspection] = useState({
    garment: 'Shirt',
    color: '',
    stains: '',
    make: '',
    brand: '',
    fabric: 'Select fabric',
    notes: '',
    photosCount: 0,
  });
  const [editInspectionPhotos, setEditInspectionPhotos] = useState([]);
  const [photoPreviewModal, setPhotoPreviewModal] = useState(null);
  const editPhotoInputRef = useRef(null);
  const [editActiveTab, setEditActiveTab] = useState('details');

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 6 - editInspectionPhotos.length;
    const toProcess = files.slice(0, Math.max(0, remaining));

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditInspectionPhotos((prev) => [
          ...prev,
          {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            tag: 'Stain / Defect',
            url: ev.target.result,
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (photoId) => {
    setEditInspectionPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const editCartSubtotal = useMemo(() => {
    return editCart.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0), 0);
  }, [editCart]);

  const editCartTax = useMemo(() => {
    return editCartSubtotal * 0.05;
  }, [editCartSubtotal]);

  const editCartGrandTotal = useMemo(() => {
    return editCartSubtotal + editCartTax;
  }, [editCartSubtotal, editCartTax]);

  const editCartTotalPieces = useMemo(() => {
    return editCart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [editCart]);

  const handleAddEditItemToCart = () => {
    if (!editSelectedItem) return;
    const rateToUse = Number(editSelectedRate) || Number(editSelectedItem.price) || 20;
    const qtyToUse = Math.max(1, Number(editSelectedQty) || 1);
    const serviceToUse = editSelectedService || 'Laundry + Iron';

    setEditCart((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.id === editSelectedItem.id && it.serviceType === serviceToUse
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: next[existingIdx].qty + qtyToUse,
          rate: rateToUse,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: editSelectedItem.id,
          name: editSelectedItem.name,
          qty: qtyToUse,
          rate: rateToUse,
          serviceType: serviceToUse,
          icon: editSelectedItem.icon || '👕',
        },
      ];
    });
    showToast?.(`Added ${qtyToUse}x ${editSelectedItem.name} to order cart`);
  };

  const handleRemoveEditCartItem = (idx) => {
    setEditCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOpenEditModal = (ord) => {
    // If clicking on already open order, toggle close
    if (editingOrderRecord && (editingOrderRecord.id === ord.id || editingOrderRecord.order_number === ord.order_number)) {
      setEditingOrderRecord(null);
      setEditFormData(null);
      return;
    }

    const custName = ord.customer_name || ord.customer?.customer_name || '';
    const phone = ord.formatted_mobile || formatPhoneDisplay(ord.mobile_number || ord.customer?.mobile_number) || ord.mobile_number || '';
    const custAddress = ord.address || ord.delivery_address || ord.customer?.address || '';
    const currentStatus = normalizeOrderStatus(ord.order_status || ord.status || 'Received');
    const srv = ord.service_category || ord.service_type || ord.preference || 'Wash & Steam Press';
    const capturedDateStr = ord.captured_date || (ord.created_at ? new Date(ord.created_at).toISOString().slice(0, 10) : '2026-10-28');
    const capturedTimeStr = ord.captured_time || '10:15 AM';
    const orderTypeStr = ord.order_type || 'Walk-in';
    const expectedDeliveryStr = ord.expected_delivery || '30 Oct 2026, 05:00 PM';
    const pickupDeliveryStr = ord.pickup_delivery || '--------';
    const commentsStr = ord.comments || ord.preference_notes || ord.special_instructions || ord.notes || '';
    const totalAmount = Number(ord.total_amount || 0);
    const advancePaid = Number(ord.advance_paid || 0);
    const balanceDue = Number(ord.balance_due !== undefined ? ord.balance_due : Math.max(0, totalAmount - advancePaid));
    const paymentStatus = ord.payment_status || (balanceDue <= 0 ? 'Paid' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid');

    // Parse order items or fallback to initial items matching the screenshot
    let initialCart = [];
    if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
      initialCart = ord.items.map((it) => ({
        id: it.id || it.product_id || (it.name ? it.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'item'),
        name: it.name || it.item_name || 'Garment',
        qty: Number(it.qty || it.count || 1),
        rate: Number(it.rate || it.unit_price || it.price || 20),
        serviceType: it.serviceType || it.service || 'Laundry + Iron',
        icon: it.icon || (it.name?.toLowerCase().includes('steam') ? '♨️' : it.name?.toLowerCase().includes('dry') ? '✨' : it.name?.toLowerCase().includes('starch') ? '👔' : it.name?.toLowerCase().includes('fabric') ? '🌸' : it.name?.toLowerCase().includes('hanger') ? '🏷' : '🧺'),
      }));
    } else if (ord.services_allocated && Array.isArray(ord.services_allocated) && ord.services_allocated.length > 0) {
      initialCart = ord.services_allocated.map((s) => ({
        id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: s.name,
        qty: Number(s.count || 1),
        rate: 20,
        serviceType: 'Laundry + Iron',
        icon: s.icon || (s.name.toLowerCase().includes('steam') ? '♨️' : s.name.toLowerCase().includes('dry') ? '✨' : s.name.toLowerCase().includes('starch') ? '👔' : s.name.toLowerCase().includes('fabric') ? '🌸' : s.name.toLowerCase().includes('hanger') ? '🏷' : '🧺'),
      }));
    } else {
      // 6 standard lines matching the user's screenshot (total 9 pieces)
      initialCart = [
        { id: 'normal_wash', name: 'Normal Wash', qty: 3, rate: 20, serviceType: 'Laundry + Iron', icon: '🧺' },
        { id: 'steam_press', name: 'Steam Press', qty: 2, rate: 20, serviceType: 'Laundry + Iron', icon: '♨️' },
        { id: 'dry_clean', name: 'Dry Clean', qty: 1, rate: 20, serviceType: 'Laundry + Iron', icon: '✨' },
        { id: 'starch_finish', name: 'Starch Finish', qty: 1, rate: 20, serviceType: 'Laundry + Iron', icon: '👔' },
        { id: 'fabric_softener', name: 'Fabric Softener', qty: 1, rate: 20, serviceType: 'Laundry + Iron', icon: '🌸' },
        { id: 'hanger_packaging', name: 'Hanger Packaging', qty: 1, rate: 20, serviceType: 'Laundry + Iron', icon: '🏷' },
      ];
    }
    setEditCart(initialCart);
    const initialPhotos = (ord.photos && ord.photos.length > 0)
      ? ord.photos
      : (ord.inspection?.photos && ord.inspection.photos.length > 0)
      ? ord.inspection.photos
      : [
          { id: 'p1', name: 'Collar_Stain.jpg', tag: 'Stain / Defect', url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=300&auto=format&fit=crop&q=80' },
          { id: 'p2', name: 'Brand_Tag.jpg', tag: 'Brand Tag', url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=300&auto=format&fit=crop&q=80' },
          { id: 'p3', name: 'Prewash_Overview.jpg', tag: 'Pre-wash Condition', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80' }
        ];
    setEditInspectionPhotos(initialPhotos);
    setEditInspection(ord.inspection || {
      garment: 'Shirt',
      color: '',
      stains: '',
      make: '',
      brand: '',
      fabric: 'Select fabric',
      notes: '',
      photosCount: initialPhotos.length,
    });
    setEditActiveTab('details');

    setEditingOrderRecord(ord);
    setEditFormData({
      id: ord.id || ord.order_number,
      order_number: ord.order_number || ord.order_id || ord.id,
      customer_name: custName,
      mobile_number: phone,
      address: custAddress,
      service_category: srv,
      status: currentStatus,
      order_status: currentStatus,
      captured_date: capturedDateStr,
      captured_time: capturedTimeStr,
      order_type: orderTypeStr,
      expected_delivery: expectedDeliveryStr,
      pickup_delivery: pickupDeliveryStr,
      comments: commentsStr,
      total_amount: totalAmount,
      advance_paid: advancePaid,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      assigned_driver: ord.assigned_driver || '',
      assigned_driver_full: ord.assigned_driver_full || '',
      pickup_status: ord.pickup_status || '',
      assigned_for_pickup: Boolean(ord.assigned_for_pickup),
      audit_logs: ord.audit_logs || ord.logs || [],
      logs: ord.logs || ord.audit_logs || [],
      rawOrder: ord,
    });
  };

  // Quick status update that instantly updates the order in the list page
  const handleQuickStatusUpdate = (newStatus) => {
    if (!editingOrderRecord || !newStatus) return;
    const normalized = normalizeOrderStatus(newStatus);
    const updatedOrder = {
      ...editingOrderRecord,
      status: normalized,
      order_status: normalized,
      ...(editFormData ? {
        customer_name: editFormData.customer_name,
        mobile_number: editFormData.mobile_number,
        address: editFormData.address,
        order_type: editFormData.order_type,
        expected_delivery: editFormData.expected_delivery,
        comments: editFormData.comments,
      } : {}),
    };

    setEditFormData((prev) => (prev ? { ...prev, status: normalized, order_status: normalized } : null));
    setEditingOrderRecord(updatedOrder);

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    } else {
      try {
        const cached = localStorage.getItem('washdoor_orders_cache');
        if (cached) {
          const list = JSON.parse(cached);
          const nextList = list.map((o) => (o.id === updatedOrder.id || o.order_number === updatedOrder.order_number) ? updatedOrder : o);
          localStorage.setItem('washdoor_orders_cache', JSON.stringify(nextList));
        }
      } catch {}
      onOrderCreated?.(updatedOrder);
    }

    // Direct Supabase persistence
    const ordKey = updatedOrder.order_number || updatedOrder.id || updatedOrder.work_number;
    if (ordKey) {
      updateOrderInSupabase(ordKey, {
        status: normalized,
        customerName: updatedOrder.customer_name,
        mobileNumber: updatedOrder.mobile_number,
        address: updatedOrder.address,
        orderNotes: updatedOrder.comments,
      }).catch((e) => console.warn('Supabase status update note:', e));
    }

    showToast?.(`✅ Order ${updatedOrder.order_number || updatedOrder.id} status updated to "${normalized}"!`);
  };

  const handleSaveOrderEdit = (e) => {
    e?.preventDefault();
    if (!editFormData || !editingOrderRecord) return;

    const totalPieces = editCart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    const subtotal = editCart.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
    const taxAmount = subtotal * 0.05;
    const grandTotal = subtotal + taxAmount;

    const updatedOrder = {
      ...editingOrderRecord,
      customer_name: editFormData.customer_name,
      mobile_number: editFormData.mobile_number,
      address: editFormData.address,
      service_category: editFormData.service_category,
      status: editFormData.status,
      order_status: editFormData.status,
      captured_date: editFormData.captured_date,
      captured_time: editFormData.captured_time,
      order_type: editFormData.order_type,
      expected_delivery: editFormData.expected_delivery,
      pickup_delivery: editFormData.pickup_delivery,
      comments: editFormData.comments,
      special_instructions: editFormData.comments,
      notes: editFormData.comments,
      items: editCart,
      services_allocated: editCart.map((it) => ({
        name: it.name,
        count: it.qty,
        icon: it.icon,
      })),
      item_count: totalPieces,
      total_pieces: totalPieces,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      advance_paid: Number(editFormData.advance_paid || 0),
      balance_due: Math.max(0, grandTotal - Number(editFormData.advance_paid || 0)),
      payment_status: editFormData.payment_status,
      customer: {
        ...(editingOrderRecord.customer || {}),
        customer_name: editFormData.customer_name,
        mobile_number: editFormData.mobile_number,
        address: editFormData.address,
      },
      photos: editInspectionPhotos,
      inspection: {
        ...editInspection,
        photos: editInspectionPhotos,
        photosCount: editInspectionPhotos.length,
      },
      assigned_driver: editFormData.assigned_driver || editingOrderRecord.assigned_driver,
      assigned_driver_full: editFormData.assigned_driver_full || editingOrderRecord.assigned_driver_full,
      pickup_status: editFormData.pickup_status || editingOrderRecord.pickup_status,
      assigned_for_pickup: editFormData.assigned_for_pickup || editingOrderRecord.assigned_for_pickup,
      audit_logs: editFormData.audit_logs || editingOrderRecord.audit_logs || [],
      logs: editFormData.logs || editingOrderRecord.logs || [],
    };

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    } else {
      try {
        const cached = localStorage.getItem('washdoor_orders_cache');
        if (cached) {
          const list = JSON.parse(cached);
          const nextList = list.map((o) => (o.id === updatedOrder.id || o.order_number === updatedOrder.order_number) ? updatedOrder : o);
          localStorage.setItem('washdoor_orders_cache', JSON.stringify(nextList));
        }
      } catch {}
      onOrderCreated?.(updatedOrder);
    }

    // Direct Supabase update
    const saveKey = updatedOrder.order_number || updatedOrder.id || updatedOrder.work_number;
    if (saveKey) {
      updateOrderInSupabase(saveKey, {
        status: updatedOrder.status,
        customerName: updatedOrder.customer_name,
        mobileNumber: updatedOrder.mobile_number,
        address: updatedOrder.address,
        serviceCategory: updatedOrder.service_category,
        orderNotes: updatedOrder.comments,
        totalAmount: updatedOrder.total_amount,
        advancePaid: updatedOrder.advance_paid,
        paymentStatus: updatedOrder.payment_status,
        items: updatedOrder.items,
      }).catch((e) => console.warn('Supabase saveOrder update note:', e));
    }

    showToast?.(`✅ Order ${updatedOrder.order_number || updatedOrder.id} updated successfully!`);
    setEditingOrderRecord(null);
    setEditFormData(null);
  };

  // Graphical Action Modal States
  const [scheduleOrderTarget, setScheduleOrderTarget] = useState(null);
  const [assignDriverTarget, setAssignDriverTarget] = useState(null);
  const [scheduleType, setScheduleType] = useState('Delivery');
  const [scheduleDate, setScheduleDate] = useState('2026-10-30');
  const [scheduleSlot, setScheduleSlot] = useState('Evening (04:00 PM - 07:00 PM)');
  const [selectedDriver, setSelectedDriver] = useState('Ramesh Kumar (Van #1 • Zone 1)');

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

  // Close top dropdowns on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.pos-filter-dropdown-container')) {
        setActiveTopDropdown(null);
      }
    };
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        setActiveTopDropdown(null);
        if (scheduleOrderTarget) setScheduleOrderTarget(null);
        if (assignDriverTarget) setAssignDriverTarget(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [scheduleOrderTarget, assignDriverTarget]);

  // Compute live counts for Status Filter Pills (Order Received, In Progress, Ready, Delivered, Cancelled)
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
      const norm = normalizeOrderStatus(o.order_status || o.status);
      if (norm === 'Order Received') counts.received++;
      else if (norm === 'In Progress') counts.inProgress++;
      else if (norm === 'Ready') counts.ready++;
      else if (norm === 'Delivered') counts.delivered++;
      else if (norm === 'Cancelled') counts.cancelled++;
    });
    return counts;
  }, [orders]);

  // Full filtered list of orders for the Orders List view
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter (Only All Orders, Received, In Progress, Ready, Delivered, Cancelled)
      if (activeStatusTab !== 'All' && activeStatusTab !== 'All Orders') {
        const norm = normalizeOrderStatus(o.order_status || o.status);
        if (norm !== activeStatusTab) return false;
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

    const initialStatus = 'Received';

    const createdRecord = {
      id: finalOrderNum,
      order_number: finalOrderNum,
      customer_name: customerName,
      mobile_number: cleanMobile,
      total_amount: grandTotal,
      item_count: totalItemsCount,
      status: initialStatus,
      order_status: initialStatus,
      created_at: data?.created_at || new Date().toISOString(),
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
        <div className="pos-screen-title-wrap">
          <h1 className="pos-screen-title">Orders &amp; POS</h1>
          <div className="pos-screen-subtitle">Create new order, search and manage all laundry orders.</div>
        </div>

        <div className="pos-screen-actions">
          {/* Top Search Bar */}
          <div className="pos-search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="pos-search-input toolbar-search-input"
              placeholder="Search by Order ID, customer name or mobile number..."
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

          {/* Date Range Dropdown */}
          <div className="pos-filter-dropdown-container">
            <button
              type="button"
              className={`pos-toolbar-btn ${activeTopDropdown === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTopDropdown((prev) => (prev === 'date' ? null : 'date'))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="pos-date-label">{dateFilter === 'All Time' ? '28 Oct 2026 - 28 Oct 2026' : dateFilter}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {activeTopDropdown === 'date' && (
              <div className="pos-dropdown-menu">
                <div className="pos-dropdown-header" style={{ fontSize: '11px', padding: '4px 10px 6px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Select Range
                </div>
                {['All Time', '28 Oct 2026 - 28 Oct 2026', 'Today', 'Yesterday', 'Last 7 Days', 'This Month'].map((rng) => (
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

          {/* Create Order Button */}
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
            <span style={{ fontSize: '16px', lineHeight: 1 }}>＋</span>
            <span className="pos-btn-label-full">Create Order</span>
            <span className="pos-btn-label-short">Order</span>
            <span className="pos-key-badge">N</span>
          </button>
        </div>

      </div>

      {/* ── Status Filter Pills Row (with Filters & Refresh on right) ── */}
      <div className="pos-status-toolbar-row">
        <div className="pos-status-pills-bar">
          <button
            type="button"
            className={`pos-status-pill ${activeStatusTab === 'All' || activeStatusTab === 'All Orders' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatusTab('All');
              setPosViewMode('orders');
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block' }}></span>
            <span>All Orders</span>
            <span className="pos-status-pill-count">{statusCounts.all}</span>
          </button>

          <button
            type="button"
            className={`pos-status-pill ${activeStatusTab === 'Order Received' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatusTab('Order Received');
              setPosViewMode('orders');
            }}
          >
            <span className="pos-status-dot dot-received" style={{ background: '#2563eb' }}></span>
            <span>Order Received</span>
            <span className="pos-status-pill-count">{statusCounts.received}</span>
          </button>

          <button
            type="button"
            className={`pos-status-pill ${activeStatusTab === 'In Progress' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatusTab('In Progress');
              setPosViewMode('orders');
            }}
          >
            <span className="pos-status-dot dot-progress" style={{ background: '#f59e0b' }}></span>
            <span>In Progress</span>
            <span className="pos-status-pill-count">{statusCounts.inProgress}</span>
          </button>

          <button
            type="button"
            className={`pos-status-pill ${activeStatusTab === 'Ready' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatusTab('Ready');
              setPosViewMode('orders');
            }}
          >
            <span className="pos-status-dot dot-ready" style={{ background: '#10b981' }}></span>
            <span>Ready</span>
            <span className="pos-status-pill-count">{statusCounts.ready}</span>
          </button>

          <button
            type="button"
            className={`pos-status-pill ${activeStatusTab === 'Delivered' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatusTab('Delivered');
              setPosViewMode('orders');
            }}
          >
            <span className="pos-status-dot dot-delivered" style={{ background: '#0284c7' }}></span>
            <span>Delivered</span>
            <span className="pos-status-pill-count">{statusCounts.delivered}</span>
          </button>

          <button
            type="button"
            className={`pos-status-pill ${activeStatusTab === 'Cancelled' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatusTab('Cancelled');
              setPosViewMode('orders');
            }}
          >
            <span className="pos-status-dot dot-cancelled" style={{ background: '#ef4444' }}></span>
            <span>Cancelled</span>
            <span className="pos-status-pill-count">{statusCounts.cancelled}</span>
          </button>
        </div>

        <div className="pos-status-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filters Dropdown */}
          <div className="pos-filter-dropdown-container">
            <button
              type="button"
              className={`pos-toolbar-btn ${activeTopDropdown === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveTopDropdown((prev) => (prev === 'filters' ? null : 'filters'))}
              style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px', color: '#334155', fontWeight: 600, fontSize: '12.5px' }}
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
                {['All Services', 'Normal Wash', 'Wash & Steam Press', 'Wash & Fold', 'Dry Cleaning', 'Heavy Linens & Quilts', 'Express 24H Service'].map((srv) => (
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

          {/* Refresh Button */}
          <button
            type="button"
            className="pos-toolbar-icon-btn"
            disabled={loadingOrders}
            onClick={() => {
              onRefreshOrders?.();
              showToast?.('↻ Syncing orders...');
            }}
            title="Reload records"
            style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px' }}
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
        </div>
      </div>

      {/* Hidden / Commented Out as requested:
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

        <div className="pos-status-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      */}

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
                      onOpenBill={() => showToast?.('bill viewed!')}
                      showToast={showToast}
                      currencySymbol={currencySymbol}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="pos-orders-table-card" ref={tableScrollRef}>
                    <table className="pos-orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer (Name &amp; Number)</th>
                        <th>Address</th>
                        <th>Services Allocated</th>
                        <th>Status</th>
                        <th>Order Details (Captured Time)</th>
                        <th>Pickup &amp; Delivery</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((ord) => {
                        const custName = ord.customer_name || ord.customer?.customer_name || 'Walk-in Customer';
                        const phone = ord.formatted_mobile || formatPhoneDisplay(ord.mobile_number || ord.customer?.mobile_number) || '—';
                        const orderNum = ord.order_number || ord.order_id || ord.work_number || (ord.id ? String(ord.id) : '—');
                        const custAddress = ord.address || ord.delivery_address || ord.customer?.address || ord.customer?.streetArea || 'Counter Walk-In';
                        const items = ord.customer_history?.items || ord.items || [];
                        const itemCount = Array.isArray(items) && items.length > 0
                          ? items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0)
                          : (ord.item_count || 1);
                        const srv = ord.service_category || ord.service_type || ord.preference || 'Normal Wash';
                        const workStatus = normalizeOrderStatus(ord.order_status || ord.status || 'Received');

                        // Determine if order is On-Call or Walk-In
                        const orderTypeLower = (ord.order_type || '').toLowerCase();
                        const isOnCall = orderTypeLower.includes('call') || orderTypeLower.includes('phone') || orderTypeLower.includes('pickup') || orderTypeLower.includes('delivery');
                        const orderTypeBadgeText = isOnCall ? 'On-Call' : 'Walk-In';
                        const isPickupAssigned = Boolean(
                          ord.assigned_for_pickup ||
                          ord.pickup_status === 'Assigned for Pickup' ||
                          ord.assigned_driver
                        );

                        // Services Allocated list: empty when no items or services allocated
                        const servicesAllocated = (Array.isArray(ord.services_allocated) && ord.services_allocated.length > 0)
                          ? ord.services_allocated
                          : (Array.isArray(items) && items.length > 0
                              ? items.map((it) => ({
                                  name: it.service || it.name || it.item_name || srv,
                                  count: Number(it.qty || it.quantity) || 1,
                                  icon: '👕',
                                }))
                              : []);

                        // Status colors & style (Only Received, In Progress, Ready, Delivered, Cancelled)
                        let statusBg = '#eff6ff';
                        let statusColor = '#1d4ed8';
                        let statusBorder = '#bfdbfe';
                        let statusDotColor = '#2563eb';
                        let accentColor = ord.accent_color || '#2563eb';

                        if (workStatus === 'In Progress') {
                          statusBg = '#fef3c7';
                          statusColor = '#b45309';
                          statusBorder = '#fde68a';
                          statusDotColor = '#f59e0b';
                          accentColor = ord.accent_color || '#f59e0b';
                        } else if (workStatus === 'Ready') {
                          statusBg = '#dcfce7';
                          statusColor = '#15803d';
                          statusBorder = '#bbf7d0';
                          statusDotColor = '#10b981';
                          accentColor = ord.accent_color || '#10b981';
                        } else if (workStatus === 'Delivered') {
                          statusBg = '#e0f2fe';
                          statusColor = '#0369a1';
                          statusBorder = '#bae6fd';
                          statusDotColor = '#0284c7';
                          accentColor = ord.accent_color || '#0284c7';
                        } else if (workStatus === 'Cancelled') {
                          statusBg = '#fee2e2';
                          statusColor = '#b91c1c';
                          statusBorder = '#fecaca';
                          statusDotColor = '#ef4444';
                          accentColor = ord.accent_color || '#ef4444';
                        }

                        // Order capture date & details
                        const capturedDateStr = ord.captured_date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '28 Oct 2026');
                        const capturedTimeStr = ord.captured_time || (ord.created_at ? new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:15 AM');
                        const orderCapturedStr = ord.order_captured || `${capturedDateStr}, ${capturedTimeStr}`;
                        const orderTypeStr = ord.order_type || 'Walk-in';
                        const expectedDeliveryStr = ord.expected_delivery || (ord.target_delivery_date ? new Date(ord.target_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '30 Oct 2026, 05:00 PM');
                        const pickupDeliveryStr = ord.pickup_delivery || '--------';

                        // Avatar palette for customer graphical badges
                        const avatarPalette = [
                          { bg: '#dbeafe', color: '#1d4ed8' }, // Blue
                          { bg: '#ffedd5', color: '#ea580c' }, // Orange
                          { bg: '#f3e8ff', color: '#9333ea' }, // Purple
                          { bg: '#dcfce7', color: '#16a34a' }, // Green
                          { bg: '#e0f2fe', color: '#0284c7' }, // Sky
                          { bg: '#fce7f3', color: '#db2777' }, // Pink
                        ];
                        const charCodeSum = (ord.id || ord.order_number || custName).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                        const avatarTheme = avatarPalette[Math.abs(charCodeSum) % avatarPalette.length];

                        const isDeliveryType = orderTypeStr.toLowerCase().includes('home') || orderTypeStr.toLowerCase().includes('delivery');
                        const isEditingThisOrder = Boolean(
                          editingOrderRecord &&
                          (editingOrderRecord.id === ord.id || editingOrderRecord.order_number === ord.order_number)
                        );
                        const isOrderReady = normalizeOrderStatus(ord.order_status || ord.status) === 'Ready';

                        return (
                          <React.Fragment key={ord.id || ord.order_number}>
                            <tr
                              className={`pos-order-row ${isEditingThisOrder ? 'pos-order-row-editing' : ''}`}
                              style={isEditingThisOrder ? { background: '#f8fafc' } : {}}
                            >
                            {/* 1. Order ID Column (Prominent ID, Walk-In/On-Call Badge directly below, date & time removed) */}
                            <td style={{ borderLeft: isEditingThisOrder ? '4px solid #2563eb' : `4px solid ${accentColor}`, paddingLeft: '14px', verticalAlign: 'top', paddingTop: '14px' }}>
                              <div className="pos-ticket-cell" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span
                                  className="pos-ticket-num"
                                  onClick={() => onOpenOrderStatus?.(ord, false)}
                                  title={`View details for ${orderNum}`}
                                  style={{ cursor: 'pointer', fontWeight: 800, fontSize: '15px', color: '#1d4ed8' }}
                                >
                                  {orderNum}
                                </span>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 650,
                                  width: 'fit-content',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #dbeafe'
                                }}>
                                  {isOnCall ? (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                  ) : (
                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>＋</span>
                                  )}
                                  <span>{orderTypeBadgeText}</span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Customer (Avatar Circle, Name & Number) */}
                            <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '50%',
                                  background: avatarTheme.bg,
                                  color: avatarTheme.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '13.5px',
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}>
                                  {custName.charAt(0).toUpperCase() || 'C'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ fontWeight: 750, color: '#0f172a', fontSize: '13.5px' }}>
                                    {custName}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#475569' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <span>{phone}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. Address (Red Map Pin & Text) */}
                            <td style={{ maxWidth: '210px', verticalAlign: 'top', paddingTop: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.35 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                  <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
                                </svg>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 650, color: '#1e293b', fontSize: '13px' }}>
                                    {custAddress.split(',')[0]?.trim() || custAddress}
                                  </span>
                                  {custAddress.includes(',') && (
                                    <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                                      {custAddress.split(',').slice(1).join(',').trim()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 4. Services Allocated (Neat badges or Assign Pickup button for On-Call) */}
                            <td style={{ verticalAlign: 'top', paddingTop: '14px', maxWidth: '175px' }}>
                              {servicesAllocated.length === 0 ? (
                                isOnCall ? (
                                  isPickupAssigned ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignDriverTarget(ord);
                                      }}
                                      title={`Assigned to ${ord.assigned_driver || 'Driver'}. Click to re-assign`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #22c55e',
                                        background: '#f0fdf4',
                                        color: '#15803d',
                                        fontSize: '12px',
                                        fontWeight: 650,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(34,197,94,0.1)',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      <span>Assigned for Pickup</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignDriverTarget(ord);
                                      }}
                                      title={`Assign Pickup for ${orderNum}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '7px 16px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #60a5fa',
                                        background: '#ffffff',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="3" width="15" height="13"></rect>
                                        <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                      </svg>
                                      <span>Assign Pickup</span>
                                    </button>
                                  )
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'inline-block', paddingTop: '4px' }}>
                                    No services allocated
                                  </span>
                                )
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: 'fit-content' }}>
                                  {servicesAllocated.slice(0, 3).map((srvItem, sIdx) => (
                                    <div key={sIdx} style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '12px',
                                      color: '#1e293b',
                                      width: 'fit-content',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <span>{srvItem.icon || '👕'}</span>
                                        <span>{srvItem.name}</span>
                                      </span>
                                      <span style={{ fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                        x{srvItem.count}
                                      </span>
                                    </div>
                                  ))}
                                  {servicesAllocated.length > 3 && (
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#2563eb',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      width: 'fit-content'
                                    }}>
                                      +{servicesAllocated.length - 3} more
                                    </span>
                                  )}
                                  {isOnCall && (
                                    isPickupAssigned ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssignDriverTarget(ord);
                                        }}
                                        title={`Assigned to ${ord.assigned_driver || 'Driver'}. Click to re-assign`}
                                        style={{
                                          marginTop: '3px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          padding: '5px 12px',
                                          borderRadius: '6px',
                                          background: '#f0fdf4',
                                          border: '1.5px solid #22c55e',
                                          color: '#15803d',
                                          fontSize: '11.5px',
                                          fontWeight: 650,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 2px rgba(34,197,94,0.1)',
                                          width: 'fit-content',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Assigned for Pickup</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssignDriverTarget(ord);
                                        }}
                                        title={`Assign Pickup for ${orderNum}`}
                                        style={{
                                          marginTop: '3px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          padding: '5px 12px',
                                          borderRadius: '6px',
                                          background: '#ffffff',
                                          border: '1.5px solid #60a5fa',
                                          color: '#2563eb',
                                          fontSize: '11.5px',
                                          fontWeight: 650,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                                          width: 'fit-content',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="1" y="3" width="15" height="13"></rect>
                                          <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                                          <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                          <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                        </svg>
                                        <span>Assign Pickup</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 5. Status (Icon badge & processing subtext) */}
                            <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '7px',
                                  padding: '5px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12.5px',
                                  fontWeight: 650,
                                  background: statusBg,
                                  color: statusColor,
                                  border: `1px solid ${statusBorder}`
                                }}>
                                  <span style={{ fontSize: '13px', lineHeight: 1 }}>
                                    {workStatus === 'In Progress' ? '⏱' : workStatus === 'Cancelled' ? '✕' : workStatus === 'Ready' ? '✓' : workStatus === 'Delivered' ? '✓' : '📥'}
                                  </span>
                                  <span>{workStatus}</span>
                                </div>
                              </div>
                            </td>

                            {/* 6. Order Details (Captured Time) */}
                            <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#475569' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Order Captured:</span>
                                  <span style={{ fontSize: '12.5px', color: '#1e293b', fontWeight: 650 }}>{orderCapturedStr}</span>
                                </div>
                              </div>
                            </td>

                            {/* 7. Pickup & Delivery (Stacked Action Buttons or Assigned status) */}
                            <td style={{ verticalAlign: 'middle', padding: '10px 14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
                                {isPickupAssigned ? (
                                  <>
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                      padding: '6px 10px',
                                      background: '#f0fdf4',
                                      border: '1.5px solid #86efac',
                                      borderRadius: '8px',
                                      boxShadow: '0 1px 2px rgba(34,197,94,0.08)'
                                    }}>
                                      <span style={{ fontSize: '10px', color: '#166534', fontWeight: 750, letterSpacing: '0.3px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>🚚</span> Assigned for Pickup
                                      </span>
                                      <span style={{ fontSize: '12px', color: '#14532d', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ord.assigned_driver || 'Driver Assigned'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="pos-pickup-btn pos-driver-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignDriverTarget(ord);
                                      }}
                                      title={`Re-assign Driver for ${orderNum}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '5px 12px',
                                        borderRadius: '7px',
                                        border: '1.5px solid #94a3b8',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                      </svg>
                                      <span>Change Driver</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="pos-pickup-btn pos-schedule-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setScheduleOrderTarget(ord);
                                      }}
                                      title={`Schedule Pickup/Delivery for ${orderNum}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #60a5fa',
                                        background: '#ffffff',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                      </svg>
                                      <span>Schedule</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="pos-pickup-btn pos-driver-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignDriverTarget(ord);
                                      }}
                                      title={`Assign Driver for ${orderNum}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #60a5fa',
                                        background: '#ffffff',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                      </svg>
                                      <span>Assign Driver</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 8. Bill / Actions (Bill + Edit stacked + More icon) */}
                            <td style={{ textAlign: 'right', paddingRight: '16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="pos-table-action-btn btn-bill"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      showToast?.('bill viewed!');
                                    }}
                                    title="bill viewed!"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      padding: '5px 12px',
                                      width: '82px',
                                      borderRadius: '6px',
                                      border: '1.5px solid #7c3aed',
                                      background: '#f5f3ff',
                                      color: '#6d28d9',
                                      fontWeight: 650,
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 2px rgba(124, 58, 237, 0.08)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                      <polyline points="14 2 14 8 20 8"></polyline>
                                      <line x1="16" y1="13" x2="8" y2="13"></line>
                                      <line x1="16" y1="17" x2="8" y2="17"></line>
                                    </svg>
                                    <span>Bill</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`pos-table-action-btn btn-edit-order ${isEditingThisOrder ? 'active-edit-btn' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(ord);
                                    }}
                                    title={isEditingThisOrder ? `Close Edit for ${orderNum}` : `Edit Order ${orderNum}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      padding: '5px 12px',
                                      width: '82px',
                                      borderRadius: '6px',
                                      border: isEditingThisOrder ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                                      background: isEditingThisOrder ? '#eff6ff' : '#ffffff',
                                      color: isEditingThisOrder ? '#2563eb' : '#334155',
                                      fontWeight: 650,
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      boxShadow: isEditingThisOrder ? '0 1px 3px rgba(37, 99, 235, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    <span>{isEditingThisOrder ? 'Close' : 'Edit'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="pos-table-action-btn btn-side-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSideEditTargetOrder(ord);
                                    }}
                                    title={`Open Side Edit Panel for ${orderNum}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 8px',
                                      width: '108px',
                                      borderRadius: '6px',
                                      border: '1.5px solid #3b82f6',
                                      background: '#eff6ff',
                                      color: '#2563eb',
                                      fontWeight: 650,
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                      <line x1="9" y1="3" x2="9" y2="21"></line>
                                      <path d="M14 9l3 3-3 3"></path>
                                    </svg>
                                    <span>Side Edit Panel</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* ── Inline Edit Dropdown Accordion Row ── */}
                          {isEditingThisOrder && editFormData && (
                            <tr key={`${orderNum}_edit_dropdown_card`} className="pos-edit-dropdown-row">
                              <td colSpan={8} className="pos-inline-edit-wrap">
                                <div className="pos-inline-edit-card">
                                  {/* ── Header ── */}
                                  <div className="pos-edit-header-bar">
                                    <div className="pos-edit-header-title">
                                      <span style={{ color: '#2563eb', fontSize: '15px', fontWeight: 800 }}>◆</span>
                                      <span>
                                        Edit Order — {editFormData.order_number}
                                      </span>
                                      <span className="pos-edit-status-pill">
                                        ● Status: {normalizeOrderStatus(editFormData.status || editFormData.order_status)}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOrderRecord(null);
                                        setEditFormData(null);
                                      }}
                                      title="Collapse Edit Form"
                                      className="pos-edit-collapse-btn"
                                    >
                                      ▲
                                    </button>
                                  </div>

                                  <form onSubmit={handleSaveOrderEdit}>
                                    {/* ══════════════════════════════════════════════════════════════════
                                        SECTION 1: TWO COLUMN TOP GRID
                                        Col 1 (Left): Customer & Order Information (~360px)
                                        Col 2 (Right): Services Allocated & Garment Selection (Catalog + Cart)
                                       ══════════════════════════════════════════════════════════════════ */}
                                    <div className="pos-inline-edit-top-grid">
                                      {/* Left Column: Customer & Order Information */}
                                      <div className="pos-edit-section-card">
                                        <div className="pos-edit-section-title">
                                          <span style={{ color: '#2563eb' }}>◆</span>
                                          <span>Customer &amp; Order Information</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1 }}>
                                          {/* Customer Name */}
                                          <div>
                                            <label className="pos-edit-label">
                                              Customer Name <span className="required">*</span>
                                            </label>
                                            <input
                                              type="text"
                                              className="pos-edit-field"
                                              value={editFormData.customer_name || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                                              required
                                            />
                                          </div>

                                          {/* Mobile Number */}
                                          <div>
                                            <label className="pos-edit-label">
                                              Mobile Number <span className="required">*</span>
                                            </label>
                                            <input
                                              type="text"
                                              className="pos-edit-field"
                                              value={editFormData.mobile_number || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, mobile_number: e.target.value })}
                                              required
                                            />
                                          </div>

                                          {/* Address */}
                                          <div>
                                            <label className="pos-edit-label">
                                              Address <span className="required">*</span>
                                            </label>
                                            <input
                                              type="text"
                                              className="pos-edit-field"
                                              value={editFormData.address || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                              required
                                            />
                                          </div>

                                          {/* Row with Status * and Order Type * side-by-side (matching user screenshot) */}
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                              <label className="pos-edit-label">
                                                Status <span className="required">*</span>
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                value={normalizeOrderStatus(editFormData.status || editFormData.order_status)}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setEditFormData({ ...editFormData, status: val, order_status: val });
                                                  handleQuickStatusUpdate(val);
                                                }}
                                              >
                                                <option value="Order Received">Order Received</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Ready">Ready</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                              </select>
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Order Type <span className="required">*</span>
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                value={editFormData.order_type || 'Walk-in'}
                                                onChange={(e) => setEditFormData({ ...editFormData, order_type: e.target.value })}
                                              >
                                                <option value="Walk-in">Walk-in</option>
                                                <option value="Home Delivery">Home Delivery</option>
                                                <option value="Express 24H">Express 24H</option>
                                              </select>
                                            </div>
                                          </div>

                                          {/* Expected Delivery with Calendar icon */}
                                          <div>
                                            <label className="pos-edit-label">
                                              Expected Delivery <span className="required">*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                              <input
                                                type="text"
                                                className="pos-edit-field"
                                                style={{ paddingLeft: '34px' }}
                                                value={editFormData.expected_delivery || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, expected_delivery: e.target.value })}
                                                placeholder="e.g. 30 Oct 2026, 05:00 PM"
                                                required
                                              />
                                              <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.2"
                                                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, pointerEvents: 'none' }}
                                              >
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                              </svg>
                                            </div>
                                          </div>

                                          {/* Comments Textarea */}
                                          <div>
                                            <label className="pos-edit-label">
                                              Comments
                                            </label>
                                            <textarea
                                              rows={2}
                                              className="pos-edit-textarea"
                                              value={editFormData.comments || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, comments: e.target.value })}
                                              placeholder="Customer special notes, delicate fabric instructions, or delivery directions..."
                                            />
                                          </div>

                                          {/* Live Status Quick Action & Pills */}
                                          <div className="pos-edit-sub-panel" style={{ marginTop: '4px', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Live Status Actions</span>
                                              <button
                                                type="button"
                                                onClick={() => handleQuickStatusUpdate(editFormData.status || editFormData.order_status)}
                                                style={{
                                                  height: '28px',
                                                  padding: '0 10px',
                                                  background: '#2563eb',
                                                  color: '#ffffff',
                                                  border: 'none',
                                                  borderRadius: '5px',
                                                  fontSize: '11px',
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px'
                                                }}
                                              >
                                                <span>⚡</span>
                                                <span>Apply Status</span>
                                              </button>
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                              {[
                                                { label: 'Order Received', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                                                { label: 'In Progress', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
                                                { label: 'Ready', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
                                                { label: 'Delivered', color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
                                                { label: 'Cancelled', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
                                              ].map((st) => {
                                                const isCur = normalizeOrderStatus(editFormData.status || editFormData.order_status) === st.label;
                                                return (
                                                  <button
                                                    key={st.label}
                                                    type="button"
                                                    onClick={() => {
                                                      setEditFormData({ ...editFormData, status: st.label, order_status: st.label });
                                                      handleQuickStatusUpdate(st.label);
                                                    }}
                                                    style={{
                                                      padding: '3px 9px',
                                                      borderRadius: '12px',
                                                      fontSize: '11px',
                                                      fontWeight: 700,
                                                      cursor: 'pointer',
                                                      border: isCur ? `2px solid ${st.color}` : `1px solid ${st.border}`,
                                                      background: isCur ? st.color : st.bg,
                                                      color: isCur ? '#ffffff' : st.color,
                                                      transition: 'all 0.15s ease',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '3px'
                                                    }}
                                                  >
                                                    <span>{isCur ? '✓' : '●'}</span>
                                                    <span>{st.label}</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right Column: Services Allocated & Garment Selection */}
                                      <div className="pos-edit-section-card">
                                        <div className="pos-edit-section-title">
                                          <span style={{ color: '#2563eb' }}>◆</span>
                                          <span>Services Allocated &amp; Garment Selection</span>
                                        </div>

                                        <div className="pos-inline-edit-services-grid">
                                          {/* Sub-col 1: Cloth Selection & Catalog */}
                                          <div className="pos-edit-sub-panel" style={{ height: '100%', boxSizing: 'border-box' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                              <div style={{ fontSize: '13px', fontWeight: 750, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ color: '#2563eb' }}>◆</span>
                                                <span>Cloth Selection &amp; Catalog</span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <button
                                                  type="button"
                                                  className="pos-edit-collapse-btn"
                                                  style={{ width: '26px', height: '26px', fontSize: '11px' }}
                                                  onClick={() => {
                                                    const el = document.getElementById('pos-edit-cloth-grid');
                                                    if (el) el.scrollBy({ top: -140, behavior: 'smooth' });
                                                  }}
                                                  title="Scroll Up"
                                                >
                                                  ▲
                                                </button>
                                                <button
                                                  type="button"
                                                  className="pos-edit-collapse-btn"
                                                  style={{ width: '26px', height: '26px', fontSize: '11px' }}
                                                  onClick={() => {
                                                    const el = document.getElementById('pos-edit-cloth-grid');
                                                    if (el) el.scrollBy({ top: 140, behavior: 'smooth' });
                                                  }}
                                                  title="Scroll Down"
                                                >
                                                  ▼
                                                </button>
                                              </div>
                                            </div>

                                            {/* Search box with flex layout */}
                                            <div
                                              className="pos-edit-field"
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                height: '38px',
                                                padding: '0 12px',
                                                gap: '10px',
                                                marginBottom: '10px'
                                              }}
                                            >
                                              <svg
                                                width="15"
                                                height="15"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.2"
                                                style={{ flexShrink: 0, opacity: 0.6 }}
                                              >
                                                <circle cx="11" cy="11" r="8"></circle>
                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                              </svg>
                                              <input
                                                type="text"
                                                value={editCatalogSearch}
                                                onChange={(e) => setEditCatalogSearch(e.target.value)}
                                                placeholder="Search clothes (e.g. shirt, saree)..."
                                                style={{
                                                  flex: 1,
                                                  border: 'none',
                                                  background: 'transparent',
                                                  outline: 'none',
                                                  fontSize: '12.5px',
                                                  color: 'inherit',
                                                  padding: 0
                                                }}
                                              />
                                              {editCatalogSearch && (
                                                <button
                                                  type="button"
                                                  onClick={() => setEditCatalogSearch('')}
                                                  style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--text-muted, #94a3b8)',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    padding: '0 4px',
                                                    lineHeight: 1
                                                  }}
                                                >
                                                  ✕
                                                </button>
                                              )}
                                            </div>

                                            {/* Category filter pills */}
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                              {['All', 'Men', 'Women', 'Home Linen', 'Accessories'].map((cat) => {
                                                const isActive = editCatalogCategory === cat;
                                                return (
                                                  <button
                                                    key={cat}
                                                    type="button"
                                                    className={`pos-edit-cat-pill ${isActive ? 'active' : ''}`}
                                                    onClick={() => setEditCatalogCategory(cat)}
                                                  >
                                                    {cat}
                                                  </button>
                                                );
                                              })}
                                            </div>

                                            {/* 3-Column Garment Cards Grid with Scroller */}
                                            <div
                                              id="pos-edit-cloth-grid"
                                              className="pos-cloth-catalog-scroller"
                                              style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, 1fr)',
                                                gap: '10px',
                                                flex: 1,
                                                minHeight: '340px',
                                                maxHeight: '430px',
                                                overflowY: 'auto',
                                                paddingRight: '6px',
                                                scrollbarGutter: 'stable'
                                              }}
                                            >
                                              {EDIT_CATALOG_ITEMS.filter((item) => {
                                                const matchesCat =
                                                  editCatalogCategory === 'All' ||
                                                  item.category === editCatalogCategory ||
                                                  item.secondaryCategory === editCatalogCategory;
                                                const matchesSearch =
                                                  !editCatalogSearch.trim() ||
                                                  item.name.toLowerCase().includes(editCatalogSearch.toLowerCase());
                                                return matchesCat && matchesSearch;
                                              }).map((item) => {
                                                const isSelected = editSelectedItem?.id === item.id;
                                                return (
                                                  <div
                                                    key={item.id}
                                                    className={`pos-edit-garment-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => {
                                                      setEditSelectedItem(item);
                                                      setEditSelectedRate(item.price);
                                                    }}
                                                  >
                                                    <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                                      <ClothIllustration itemId={item.id} size={40} />
                                                    </div>
                                                    <div className="pos-edit-garment-name">
                                                      {item.name}
                                                    </div>
                                                    <div className="pos-edit-garment-rate">
                                                      ₹{item.price} / {item.unit || 'piece'}
                                                    </div>
                                                    <button
                                                      type="button"
                                                      className="pos-edit-garment-btn"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditSelectedItem(item);
                                                        setEditSelectedRate(item.price);
                                                        handleAddEditItemToCart();
                                                      }}
                                                    >
                                                      + Add
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Scroller bottom indicator */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: 'auto', paddingTop: '8px' }}>
                                              <span>↕</span>
                                              <span>Scroll up / down to view all 12 garments</span>
                                            </div>
                                          </div>

                                          {/* Sub-col 2: Selected Item Details & Cart Items */}
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                                            {/* Selected Item Details */}
                                            <div className="pos-edit-section-card">
                                              <div className="pos-edit-section-title" style={{ fontSize: '12.5px', marginBottom: '10px' }}>
                                                <span style={{ color: '#2563eb' }}>◆</span>
                                                <span>Selected Item Details</span>
                                              </div>

                                              {/* Active Item Banner */}
                                              <div className="pos-edit-active-banner">
                                                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <ClothIllustration itemId={editSelectedItem?.id || 'shirt'} size={28} />
                                                </div>
                                                <div>
                                                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'inherit' }}>
                                                    {editSelectedItem?.name || 'Shirt'}
                                                  </div>
                                                  <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>
                                                    ₹{editSelectedItem?.price || 15} / {editSelectedItem?.unit || 'piece'}
                                                  </div>
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 650, background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', padding: '3px 8px', borderRadius: '4px', marginLeft: 'auto' }}>
                                                  {editSelectedItem?.category || 'Men'}
                                                </span>
                                              </div>

                                              {/* Service Type Dropdown */}
                                              <div style={{ marginBottom: '8px' }}>
                                                <label className="pos-edit-label">Service Type</label>
                                                <select
                                                  className="pos-edit-field"
                                                  value={editSelectedService}
                                                  onChange={(e) => setEditSelectedService(e.target.value)}
                                                >
                                                  <option value="Laundry + Iron">Laundry + Iron</option>
                                                  <option value="Normal Wash">Normal Wash</option>
                                                  <option value="Dry Clean">Dry Clean</option>
                                                  <option value="Steam Press">Steam Press</option>
                                                  <option value="Wash &amp; Fold">Wash &amp; Fold</option>
                                                  <option value="Shoe Spa / Leather Care">Shoe Spa / Leather Care</option>
                                                </select>
                                              </div>

                                              {/* Quantity & Rate Row */}
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                <div>
                                                  <label className="pos-edit-label">Quantity</label>
                                                  <div className="pos-edit-qty-group">
                                                    <button
                                                      type="button"
                                                      className="pos-edit-qty-btn"
                                                      onClick={() => setEditSelectedQty((q) => Math.max(1, q - 1))}
                                                    >
                                                      -
                                                    </button>
                                                    <span className="pos-edit-qty-val">
                                                      {editSelectedQty}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      className="pos-edit-qty-btn"
                                                      onClick={() => setEditSelectedQty((q) => q + 1)}
                                                    >
                                                      +
                                                    </button>
                                                  </div>
                                                </div>

                                                <div>
                                                  <label className="pos-edit-label">Rate per piece (₹)</label>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="pos-edit-field"
                                                    value={editSelectedRate}
                                                    onChange={(e) => setEditSelectedRate(e.target.value)}
                                                  />
                                                </div>
                                              </div>

                                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)', marginBottom: '10px' }}>
                                                Standard laundry rate applied. Change if custom fabric.
                                              </div>

                                              <button
                                                type="button"
                                                className="pos-edit-save-btn"
                                                style={{ width: '100%', justifyContent: 'center' }}
                                                onClick={handleAddEditItemToCart}
                                              >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                                  <circle cx="9" cy="21" r="1"></circle>
                                                  <circle cx="20" cy="21" r="1"></circle>
                                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                                </svg>
                                                <span>Add to Cart</span>
                                              </button>
                                            </div>

                                            {/* Cart Items List & Totals */}
                                            <div className="pos-edit-section-card">
                                              <div className="pos-edit-section-title" style={{ fontSize: '12.5px', marginBottom: '8px' }}>
                                                <span style={{ color: '#2563eb' }}>◆</span>
                                                <span>Cart Items ({editCart.length})</span>
                                              </div>

                                              <div style={{ maxHeight: '145px', overflowY: 'auto', marginBottom: '10px', paddingRight: '2px' }}>
                                                {editCart.map((it, idx) => (
                                                  <div
                                                    key={`${it.id}_${it.serviceType}_${idx}`}
                                                    style={{
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'space-between',
                                                      padding: '6px 0',
                                                      borderBottom: '1px solid var(--border, #f1f5f9)',
                                                      fontSize: '12px'
                                                    }}
                                                  >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                      <div style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <ClothIllustration itemId={it.id} size={20} />
                                                      </div>
                                                      <div>
                                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{it.name}</div>
                                                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                                          {it.serviceType} x {it.qty}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="pos-status-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <span style={{ fontWeight: 750, color: 'var(--text-primary)' }}>
                                                        ₹{(Number(it.rate || 0) * Number(it.qty || 1)).toFixed(2)}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveEditCartItem(idx)}
                                                        title="Remove item"
                                                        style={{
                                                          border: 'none',
                                                          background: 'transparent',
                                                          color: '#ef4444',
                                                          cursor: 'pointer',
                                                          fontSize: '12px',
                                                          fontWeight: 700,
                                                          padding: '0 3px'
                                                        }}
                                                      >
                                                        ✕
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))}
                                                {editCart.length === 0 && (
                                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                                                    No garments added yet.
                                                  </div>
                                                )}
                                              </div>

                                              {/* Subtotal & Taxes */}
                                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                <span>Subtotal:</span>
                                                <span style={{ fontWeight: 650, color: 'var(--text-primary)' }}>₹{editCartSubtotal.toFixed(2)}</span>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                <span>GST / Tax (5%):</span>
                                                <span style={{ fontWeight: 650, color: 'var(--text-primary)' }}>₹{editCartTax.toFixed(2)}</span>
                                              </div>

                                              {/* Grand Total Bar */}
                                              <div
                                                style={{
                                                  background: '#2563eb',
                                                  color: '#ffffff',
                                                  borderRadius: '6px',
                                                  padding: '8px 12px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  fontWeight: 750,
                                                  fontSize: '12.5px'
                                                }}
                                              >
                                                <span>Grand Total: ₹{editCartGrandTotal.toFixed(2)}</span>
                                                <span style={{ fontSize: '11px', opacity: 0.95 }}>
                                                  ({editCartTotalPieces} pieces)
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* ══════════════════════════════════════════════════════════════════
                                        SECTION 2: GARMENT-BY-GARMENT INSPECTION & CARE
                                       ══════════════════════════════════════════════════════════════════ */}
                                    <div className="pos-edit-section-card" style={{ marginBottom: '16px' }}>
                                      <div className="pos-edit-section-title">
                                        <span style={{ color: '#2563eb' }}>🔍</span>
                                        <span>Garment-by-Garment Inspection &amp; Care</span>
                                      </div>

                                      {/* Row 1: 4 Columns (Garment *, Color, Stains / Marks, Make) */}
                                      <div className="pos-edit-inspection-row-4col">
                                        <div>
                                          <label className="pos-edit-label">
                                            Garment <span className="required">*</span>
                                          </label>
                                          <select
                                            className="pos-edit-field"
                                            value={editInspection.garment || 'Shirt'}
                                            onChange={(e) => setEditInspection({ ...editInspection, garment: e.target.value })}
                                          >
                                            {editCart.length > 0
                                              ? editCart.map((it, i) => (
                                                  <option key={`${it.id}_${i}`} value={it.name}>
                                                    {it.name}
                                                  </option>
                                                ))
                                              : ['Shirt', 'Formal Pant', 'T-Shirt', 'Jeans', 'Saree', 'Kurta'].map((g) => (
                                                  <option key={g} value={g}>
                                                    {g}
                                                  </option>
                                                ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="pos-edit-label">Color</label>
                                          <input
                                            type="text"
                                            className="pos-edit-field"
                                            value={editInspection.color || ''}
                                            onChange={(e) => setEditInspection({ ...editInspection, color: e.target.value })}
                                            placeholder="e.g. Navy blue"
                                          />
                                        </div>

                                        <div>
                                          <label className="pos-edit-label">Stains / Marks</label>
                                          <input
                                            type="text"
                                            className="pos-edit-field"
                                            value={editInspection.stains || ''}
                                            onChange={(e) => setEditInspection({ ...editInspection, stains: e.target.value })}
                                            placeholder="e.g. Oil stain on sleeve"
                                          />
                                        </div>

                                        <div>
                                          <label className="pos-edit-label">Make</label>
                                          <select
                                            className="pos-edit-field"
                                            value={editInspection.make || 'Manufacturer / make'}
                                            onChange={(e) => setEditInspection({ ...editInspection, make: e.target.value })}
                                          >
                                            <option value="Manufacturer / make">Manufacturer / make</option>
                                            <option value="Readymade">Readymade</option>
                                            <option value="Tailored / Custom">Tailored / Custom</option>
                                            <option value="Designer / Boutique">Designer / Boutique</option>
                                            <option value="Imported">Imported</option>
                                          </select>
                                        </div>
                                      </div>

                                      {/* Row 2: 3 Columns (Brand, Fabric Type, Garment Notes) */}
                                      <div className="pos-edit-inspection-row-3col" style={{ marginBottom: '14px' }}>
                                        <div>
                                          <label className="pos-edit-label">Brand</label>
                                          <input
                                            type="text"
                                            className="pos-edit-field"
                                            value={editInspection.brand || ''}
                                            onChange={(e) => setEditInspection({ ...editInspection, brand: e.target.value })}
                                            placeholder="e.g. Van Heusen / Raymond"
                                          />
                                        </div>

                                        <div>
                                          <label className="pos-edit-label">Fabric Type</label>
                                          <select
                                            className="pos-edit-field"
                                            value={editInspection.fabric || 'Select fabric'}
                                            onChange={(e) => setEditInspection({ ...editInspection, fabric: e.target.value })}
                                          >
                                            <option value="Select fabric">Select fabric</option>
                                            <option value="100% Cotton">100% Cotton</option>
                                            <option value="Pure Silk">Pure Silk</option>
                                            <option value="Linen">Linen</option>
                                            <option value="Wool / Cashmere">Wool / Cashmere</option>
                                            <option value="Polyester blend">Polyester blend</option>
                                            <option value="Denim">Denim</option>
                                            <option value="Rayon / Viscose">Rayon / Viscose</option>
                                          </select>
                                        </div>

                                        <div>
                                          <label className="pos-edit-label">Garment Notes</label>
                                          <input
                                            type="text"
                                            className="pos-edit-field"
                                            value={editInspection.notes || ''}
                                            onChange={(e) => setEditInspection({ ...editInspection, notes: e.target.value })}
                                            placeholder="Damage, special handling, customer instructions..."
                                          />
                                        </div>
                                      </div>

                                      {/* Row 3: Dedicated Garment Photos Section */}
                                      <div className="pos-edit-photos-panel">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                          <div>
                                            <label style={{ fontSize: '12.5px', fontWeight: 750, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span>📸 Garment Photos &amp; Visual Evidence</span>
                                              <span style={{ fontSize: '11px', fontWeight: 650, color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                                                {editInspectionPhotos.length} / 6 Attached
                                              </span>
                                            </label>
                                            <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                              Upload visual condition photos to verify pre-existing stains, torn seams, or brand labels before processing.
                                            </p>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => editPhotoInputRef.current?.click()}
                                            style={{
                                              padding: '7px 14px',
                                              borderRadius: '6px',
                                              border: '1.5px solid #2563eb',
                                              background: 'rgba(37, 99, 235, 0.1)',
                                              color: '#2563eb',
                                              fontSize: '12px',
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            <span>+ Add Photo</span>
                                          </button>
                                        </div>

                                        <input
                                          ref={editPhotoInputRef}
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          onChange={handlePhotoUpload}
                                          style={{ display: 'none' }}
                                        />

                                        {/* Photo Gallery Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
                                          {editInspectionPhotos.map((photo) => (
                                            <div
                                              key={photo.id}
                                              className="pos-edit-photo-thumb-card"
                                            >
                                              <img
                                                src={photo.url}
                                                alt={photo.name}
                                                onClick={() => setPhotoPreviewModal(photo)}
                                                style={{
                                                  width: '100%',
                                                  height: '84px',
                                                  objectFit: 'cover',
                                                  cursor: 'pointer',
                                                  display: 'block'
                                                }}
                                                title="Click to zoom photo"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(photo.id)}
                                                style={{
                                                  position: 'absolute',
                                                  top: '4px',
                                                  right: '4px',
                                                  width: '20px',
                                                  height: '20px',
                                                  borderRadius: '50%',
                                                  background: 'rgba(239, 68, 68, 0.9)',
                                                  color: '#ffffff',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '11px',
                                                  fontWeight: 700,
                                                  lineHeight: 1
                                                }}
                                                title="Remove photo"
                                              >
                                                ✕
                                              </button>
                                              <div className="pos-edit-photo-tag-bar">
                                                <span style={{ fontSize: '10px', fontWeight: 650, color: '#2563eb', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                  {photo.tag || 'Defect Note'}
                                                </span>
                                              </div>
                                            </div>
                                          ))}

                                          {/* Upload Placeholder if under limit */}
                                          {editInspectionPhotos.length < 6 && (
                                            <div
                                              onClick={() => editPhotoInputRef.current?.click()}
                                              style={{
                                                height: '108px',
                                                borderRadius: '6px',
                                                border: '1.5px dashed var(--border, #93c5fd)',
                                                background: 'var(--bg-hover, #f0f7ff)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                              }}
                                            >
                                              <span style={{ fontSize: '20px', color: '#2563eb' }}>📷</span>
                                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>Upload More</span>
                                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Up to 6</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* ══════════════════════════════════════════════════════════════════
                                        SECTION 3: 6 TABS & TAB CONTENT
                                        1. Order Details, 2. Logistics & Factory, 3. Status Updates,
                                        4. Payments, 5. Customer Messages, 6. Comments & Audit
                                       ══════════════════════════════════════════════════════════════════ */}
                                    <div className="pos-edit-section-card" style={{ marginBottom: '18px' }}>
                                      {/* Tabs Navigation Bar */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          borderBottom: '1.5px solid var(--border, #f1f5f9)',
                                          paddingBottom: '10px',
                                          marginBottom: '14px',
                                          overflowX: 'auto'
                                        }}
                                      >
                                        {[
                                          { id: 'details', label: '1. Order Details' },
                                          { id: 'logistics', label: '2. Logistics & Factory' },
                                          { id: 'status', label: '3. Status Updates' },
                                          { id: 'payments', label: '4. Payments' },
                                          { id: 'messages', label: '5. Customer Messages' },
                                          { id: 'audit', label: '6. Comments & Audit' }
                                        ].map((tab) => {
                                          const isActive = editActiveTab === tab.id;
                                          return (
                                            <button
                                              key={tab.id}
                                              type="button"
                                              onClick={() => setEditActiveTab(tab.id)}
                                              className={`pos-edit-tab-btn ${isActive ? 'active' : ''}`}
                                            >
                                              {tab.label}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Tab 1 Content: Order Details */}
                                      {editActiveTab === 'details' && (
                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                            Order Details Update &amp; Intake Metadata
                                          </div>
                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(3, 1fr)',
                                              gap: '16px',
                                              marginBottom: '14px'
                                            }}
                                          >
                                            <div>
                                              <label className="pos-edit-label">
                                                Order ID (Database Generated)
                                              </label>
                                              <div className="pos-edit-field" style={{ display: 'flex', alignItems: 'center', fontWeight: 750, color: '#2563eb', gap: '6px' }}>
                                                <span>🔒</span>
                                                <span>{editFormData.order_number || ''}</span>
                                              </div>
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Created Timestamp (Captured)
                                              </label>
                                              <div className="pos-edit-field" style={{ display: 'flex', alignItems: 'center', fontWeight: 650, gap: '6px' }}>
                                                <span>🕒</span>
                                                <span>{editFormData.captured_date || '2026-10-28'} {editFormData.captured_time || '10:15 AM'}</span>
                                              </div>
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Current Status
                                              </label>
                                              <div className="pos-edit-field" style={{ display: 'flex', alignItems: 'center', fontWeight: 750, color: '#2563eb', gap: '6px' }}>
                                                <span>●</span>
                                                <span>{normalizeOrderStatus(editFormData.status || editFormData.order_status)}</span>
                                              </div>
                                            </div>
                                          </div>

                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(3, 1fr)',
                                              gap: '16px'
                                            }}
                                          >
                                            <div>
                                              <label className="pos-edit-label">
                                                Garment Pieces Count
                                              </label>
                                              <input
                                                type="text"
                                                disabled
                                                className="pos-edit-field"
                                                style={{ fontWeight: 750 }}
                                                value={`${editCartTotalPieces} Pieces in Order`}
                                              />
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Order Intake Type
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                value={editFormData.order_type || 'Walk-in'}
                                                onChange={(e) => setEditFormData({ ...editFormData, order_type: e.target.value })}
                                              >
                                                <option value="Walk-in">Walk-in</option>
                                                <option value="Pickup &amp; Delivery">Pickup &amp; Delivery</option>
                                                <option value="On-Call">On-Call</option>
                                                <option value="Express 24H">Express 24H</option>
                                              </select>
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Expected Delivery Date &amp; Time
                                              </label>
                                              <input
                                                type="text"
                                                className="pos-edit-field"
                                                value={editFormData.expected_delivery || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, expected_delivery: e.target.value })}
                                                placeholder="30 Oct 2026, 05:00 PM"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tab 2: Logistics & Factory */}
                                      {editActiveTab === 'logistics' && (
                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                            Logistics &amp; Factory Routing Details
                                          </div>
                                          <div className="pos-edit-logistics-grid" style={{ marginBottom: '14px' }}>
                                            <div>
                                              <label className="pos-edit-label">
                                                Factory Plant / Processing Hub
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                defaultValue="Main Plant (Unit 1)"
                                              >
                                                <option value="Main Plant (Unit 1)">Main Plant (Unit 1) - Washer &amp; Pressing</option>
                                                <option value="Express Plant (Unit 2)">Express Plant (Unit 2) - 24H Quick Turnaround</option>
                                                <option value="Central Dry Clean Hub">Central Dry Clean Hub - Delicate &amp; Silk</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="pos-edit-label">
                                                Bag Tag / Barcode Identifier
                                              </label>
                                              <div className="pos-edit-field" style={{ display: 'flex', alignItems: 'center', fontWeight: 700, gap: '6px' }}>
                                                <span>🏷</span>
                                                <span>BAG-{editFormData.order_number?.replace(/D/g, '') || '00108'}</span>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="pos-edit-label">
                                                Assigned Delivery Rider / Van
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                defaultValue="Ramesh Kumar (Route 4)"
                                              >
                                                <option value="Ramesh Kumar (Route 4)">Ramesh Kumar (Route 4 - Downtown)</option>
                                                <option value="Suresh Babu (Route 2)">Suresh Babu (Route 2 - Residential)</option>
                                                <option value="Self Pickup">Counter Self-Pickup</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                              <label className="pos-edit-label">
                                                Plant Transit &amp; Packaging Status
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                defaultValue="Washing in Progress"
                                              >
                                                <option value="Intake Complete">Intake Complete - Bagged</option>
                                                <option value="In Transit to Factory">In Transit to Factory</option>
                                                <option value="Washing in Progress">Washing in Progress</option>
                                                <option value="Pressed &amp; Quality Checked">Pressed &amp; Quality Checked</option>
                                                <option value="Ready for Dispatch to Store">Ready for Dispatch to Store</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="pos-edit-label">
                                                Factory Bin / Storage Shelf
                                              </label>
                                              <input
                                                type="text"
                                                className="pos-edit-field"
                                                defaultValue="Bin B-14 (Hanger Rail 2)"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tab 3: Status Updates */}
                                      {editActiveTab === 'status' && (
                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                            Live Order Status Pipeline &amp; Milestone Controls
                                          </div>

                                          {/* Visual Milestone Progression Bar */}
                                          <div className="pos-edit-sub-panel" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '12.5px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px' }}>
                                            {['Order Received', 'In Progress', 'Ready', 'Delivered'].map((step, idx) => {
                                              const currentNorm = normalizeOrderStatus(editFormData.status || editFormData.order_status);
                                              const isDone = ['Order Received', 'In Progress', 'Ready', 'Delivered'].indexOf(currentNorm) >= idx;
                                              return (
                                                <React.Fragment key={step}>
                                                  {idx > 0 && <span style={{ color: 'var(--text-muted)' }}>➔</span>}
                                                  <span
                                                    style={{
                                                      padding: '6px 12px',
                                                      borderRadius: '6px',
                                                      background: isDone ? (step === 'Ready' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(37, 99, 235, 0.15)') : 'var(--bg-surface)',
                                                      color: isDone ? (step === 'Ready' ? '#16a34a' : '#2563eb') : 'var(--text-muted)',
                                                      fontWeight: isDone ? 750 : 500,
                                                      border: isDone ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border)'
                                                    }}
                                                  >
                                                    {isDone ? '✓ ' : '○ '}{step}
                                                  </span>
                                                </React.Fragment>
                                              );
                                            })}
                                          </div>

                                          {/* Interactive Status Selector Row */}
                                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                              Change Status:
                                            </label>
                                            <select
                                              className="pos-edit-field"
                                              style={{ minWidth: '180px', width: 'auto' }}
                                              value={normalizeOrderStatus(editFormData.status || editFormData.order_status)}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setEditFormData({ ...editFormData, status: val, order_status: val });
                                                handleQuickStatusUpdate(val);
                                              }}
                                            >
                                              <option value="Order Received">🔵 Order Received</option>
                                              <option value="In Progress">🟡 In Progress</option>
                                              <option value="Ready">🟢 Ready for Pickup</option>
                                              <option value="Delivered">🔷 Delivered</option>
                                              <option value="Cancelled">🔴 Cancelled</option>
                                            </select>

                                            <button
                                              type="button"
                                              className="pos-edit-save-btn"
                                              style={{ height: '36px', padding: '0 16px', fontSize: '12px' }}
                                              onClick={() => handleQuickStatusUpdate(editFormData.status || editFormData.order_status)}
                                            >
                                              <span>⚡</span>
                                              <span>Apply &amp; Save Status</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tab 4: Payments */}
                                      {editActiveTab === 'payments' && (
                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                            Payment Breakdown &amp; Transaction Details
                                          </div>

                                          {/* 4 Summary Cards */}
                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(4, 1fr)',
                                              gap: '12px',
                                              marginBottom: '16px'
                                            }}
                                          >
                                            <div className="pos-edit-metric-card">
                                              <span className="metric-label">Subtotal</span>
                                              <span className="metric-val">₹{editCartSubtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="pos-edit-metric-card">
                                              <span className="metric-label">Tax (5% GST)</span>
                                              <span className="metric-val">₹{editCartTax.toFixed(2)}</span>
                                            </div>
                                            <div className="pos-edit-metric-card" style={{ borderColor: 'rgba(37, 99, 235, 0.4)', background: 'rgba(37, 99, 235, 0.08)' }}>
                                              <span className="metric-label" style={{ color: '#2563eb' }}>Grand Total</span>
                                              <span className="metric-val" style={{ color: '#2563eb' }}>₹{editCartGrandTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="pos-edit-metric-card" style={{ borderColor: 'rgba(234, 179, 8, 0.4)', background: 'rgba(234, 179, 8, 0.08)' }}>
                                              <span className="metric-label" style={{ color: '#d97706' }}>Balance Due</span>
                                              <span className="metric-val" style={{ color: '#d97706' }}>
                                                ₹{Math.max(0, editCartGrandTotal - Number(editFormData.advance_paid || 0)).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Payment Fields */}
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                                            <div>
                                              <label className="pos-edit-label">
                                                Payment Status
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                value={editFormData.payment_status || 'Unpaid'}
                                                onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                                              >
                                                <option value="Paid">🟢 Fully Paid</option>
                                                <option value="Partially Paid">🟡 Partially Paid</option>
                                                <option value="Unpaid">🔴 Unpaid</option>
                                              </select>
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Payment Mode / Gateway
                                              </label>
                                              <select
                                                className="pos-edit-field"
                                                defaultValue="UPI / QR Code"
                                              >
                                                <option value="Cash">Cash at Counter</option>
                                                <option value="UPI / QR Code">UPI (GPay / PhonePe / Paytm)</option>
                                                <option value="Credit / Debit Card">Credit / Debit Card</option>
                                                <option value="Net Banking">Net Banking</option>
                                                <option value="Store Credit">Store Credit / Wallet</option>
                                              </select>
                                            </div>

                                            <div>
                                              <label className="pos-edit-label">
                                                Advance Paid (₹)
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                className="pos-edit-field"
                                                value={editFormData.advance_paid || 0}
                                                onChange={(e) => setEditFormData({ ...editFormData, advance_paid: e.target.value })}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tab 5: Customer Messages */}
                                      {editActiveTab === 'messages' && (
                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                                            Customer Messaging &amp; Automated Notifications
                                          </div>

                                          {/* Customer Contact Snapshot */}
                                          <div className="pos-edit-sub-panel" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px 14px' }}>
                                            <div>
                                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {editFormData.customer_name || 'Customer'}
                                              </div>
                                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                📱 +91 {editFormData.mobile_number || '9876543210'} • {editFormData.address || 'MG Road, Vellore'}
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => showToast?.(`💬 WhatsApp opened for +91 ${editFormData.mobile_number || '9876543210'}`)}
                                              style={{
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                border: '1px solid #22c55e',
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                color: '#16a34a',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                              }}
                                            >
                                              <span>💬</span>
                                              <span>WhatsApp Customer</span>
                                            </button>
                                          </div>

                                          {/* Notification Template Preview */}
                                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(34, 197, 94, 0.08)', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.25)', lineHeight: 1.5, marginBottom: '12px' }}>
                                            <span style={{ fontWeight: 700, color: '#16a34a', display: 'block', marginBottom: '4px' }}>
                                              Automated WhatsApp &amp; SMS Template:
                                            </span>
                                            "Hello <strong>{editFormData.customer_name || 'Customer'}</strong>, your laundry order <strong>#{editFormData.order_number}</strong> with Washdoor is now <strong>{normalizeOrderStatus(editFormData.status || editFormData.order_status)}</strong> ({editCartTotalPieces} pieces). Total Bill: ₹{editCartGrandTotal.toFixed(2)}. Expected delivery: {editFormData.expected_delivery || '30 Oct 2026, 05:00 PM'}."
                                          </div>

                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                              type="button"
                                              onClick={() => showToast?.(`✅ WhatsApp notification sent to ${editFormData.customer_name}!`)}
                                              style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                              Send WhatsApp Alert
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => showToast?.(`✅ SMS alert dispatched to +91 ${editFormData.mobile_number}!`)}
                                              className="pos-edit-cancel-btn"
                                              style={{ padding: '7px 14px', fontSize: '12px' }}
                                            >
                                              Send SMS Alert
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tab 6: Comments & Audit */}
                                      {editActiveTab === 'audit' && (
                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                            Internal Staff Comments &amp; Immutable System Audit Trail
                                          </div>

                                          {/* Operator Notes Field */}
                                          <div style={{ marginBottom: '14px' }}>
                                            <label className="pos-edit-label">
                                              Internal Staff Instructions / Store Comments
                                            </label>
                                            <textarea
                                              rows={2}
                                              className="pos-edit-textarea"
                                              value={editFormData.comments || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, comments: e.target.value })}
                                              placeholder="Internal notes for laundry wash technician or rider..."
                                            />
                                          </div>

                                          {/* Audit Trail Timeline */}
                                          <div className="pos-edit-sub-panel" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                            <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                              📋 Order Audit Trail &amp; Activity Log:
                                            </div>
                                            <div>• <strong>Order Created:</strong> {editFormData.captured_date || '2026-10-28'} at {editFormData.captured_time || '10:15 AM'} by Counter Operator</div>
                                            {editFormData.assigned_driver && (
                                              <div style={{ color: '#16a34a', fontWeight: 650 }}>
                                                • <strong>Assigned for Pickup:</strong> {editFormData.assigned_driver} {editFormData.assigned_driver_full ? `(${editFormData.assigned_driver_full})` : ''}
                                              </div>
                                            )}
                                            {(editFormData.audit_logs || editFormData.logs || []).map((l, idx) => (
                                              <div key={l.id || idx} style={{ color: l.type === 'pickup' ? '#16a34a' : 'inherit' }}>
                                                • <strong>{l.title}:</strong> {l.detail} <span style={{ fontSize: '11px', color: '#64748b' }}>({l.time})</span>
                                              </div>
                                            ))}
                                            <div>• <strong>Current Work Status:</strong> {normalizeOrderStatus(editFormData.status || editFormData.order_status)}</div>
                                            <div>• <strong>Items Logged:</strong> {editCartTotalPieces} pieces allocated across {editCart.length} service line(s)</div>
                                            <div>• <strong>Garment Inspection:</strong> {editInspection.garment} ({editInspection.color || 'Standard'}) — {editInspectionPhotos.length} photo evidence image(s) attached</div>
                                            <div>• <strong>Financial Status:</strong> {editFormData.payment_status || 'Unpaid'} — Total ₹{editCartGrandTotal.toFixed(2)}</div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Lightbox Modal for Photo Preview */}
                                    {photoPreviewModal && (
                                      <div
                                        onClick={() => setPhotoPreviewModal(null)}
                                        style={{
                                          position: 'fixed',
                                          inset: 0,
                                          background: 'rgba(0, 0, 0, 0.75)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 9999,
                                          padding: '20px'
                                        }}
                                      >
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="pos-edit-section-card"
                                          style={{
                                            maxWidth: '540px',
                                            width: '100%',
                                            padding: 0,
                                            overflow: 'hidden',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                            <div>
                                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{photoPreviewModal.name}</div>
                                              <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>{photoPreviewModal.tag}</div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setPhotoPreviewModal(null)}
                                              style={{ border: 'none', background: 'transparent', fontSize: '16px', cursor: 'pointer', color: 'var(--text-muted)' }}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: '#0a101d' }}>
                                            <img
                                              src={photoPreviewModal.url}
                                              alt={photoPreviewModal.name}
                                              style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '4px' }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* ══════════════════════════════════════════════════════════════════
                                        FOOTER ACTION BUTTONS (Bottom Right)
                                       ══════════════════════════════════════════════════════════════════ */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                                      <button
                                        type="button"
                                        className="pos-edit-cancel-btn"
                                        onClick={() => {
                                          setEditingOrderRecord(null);
                                          setEditFormData(null);
                                        }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        className="pos-edit-save-btn"
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Save Changes</span>
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
                </>
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

                    <div className="pos-status-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* ── Schedule Pickup / Delivery Modal ── */}
      {scheduleOrderTarget && (
        <div className="pos-held-modal-backdrop" onClick={() => setScheduleOrderTarget(null)}>
          <div
            className="pos-held-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '22px', background: '#0b172a', border: '1px solid #1e3a5f', borderRadius: '16px', color: '#f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 750, fontSize: '15px', color: '#f8fafc' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <span>Schedule Pickup / Delivery</span>
              </div>
              <button
                type="button"
                className="pos-cart-del-btn"
                onClick={() => setScheduleOrderTarget(null)}
                style={{ fontSize: '16px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#030b15', padding: '10px 14px', borderRadius: '8px', border: '1px solid #17253d', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
                {scheduleOrderTarget.order_number || scheduleOrderTarget.order_id || 'ORDER'}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                {scheduleOrderTarget.customer_name || scheduleOrderTarget.customer?.customer_name} • {scheduleOrderTarget.mobile_number || scheduleOrderTarget.customer?.mobile_number}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '6px' }}>
                  SCHEDULE TYPE
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Pickup', 'Delivery'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScheduleType(type)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: scheduleType === type ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                        background: scheduleType === type ? '#1d4ed8' : '#0f172a',
                        color: '#fff',
                        fontWeight: 650,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {type === 'Pickup' ? '📦 Pickup' : '🚚 Delivery'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '6px' }}>
                  SCHEDULED DATE
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    background: '#040b17',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '6px' }}>
                  TIME SLOT
                </label>
                <select
                  value={scheduleSlot}
                  onChange={(e) => setScheduleSlot(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    background: '#040b17',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                >
                  <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (01:00 PM - 04:00 PM)">Afternoon (01:00 PM - 04:00 PM)</option>
                  <option value="Evening (04:00 PM - 07:00 PM)">Evening (04:00 PM - 07:00 PM)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setScheduleOrderTarget(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 650,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast?.(`✅ ${scheduleType} scheduled for ${scheduleDate} (${scheduleSlot.split(' ')[0]})`);
                    setScheduleOrderTarget(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Driver Modal ── */}
      {assignDriverTarget && (
        <div className="pos-held-modal-backdrop" onClick={() => setAssignDriverTarget(null)}>
          <div
            className="pos-held-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '22px', background: '#0b172a', border: '1px solid #1e3a5f', borderRadius: '16px', color: '#f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 750, fontSize: '15px', color: '#f8fafc' }}>
                <span style={{ fontSize: '18px' }}>👤</span>
                <span>Assign Driver &amp; Route</span>
              </div>
              <button
                type="button"
                className="pos-cart-del-btn"
                onClick={() => setAssignDriverTarget(null)}
                style={{ fontSize: '16px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#030b15', padding: '10px 14px', borderRadius: '8px', border: '1px solid #17253d', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
                {assignDriverTarget.order_number || assignDriverTarget.order_id || 'ORDER'}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                Customer: {assignDriverTarget.customer_name || assignDriverTarget.customer?.customer_name}
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                📍 {assignDriverTarget.address || 'Katpadi, Vellore'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: '#94a3b8', marginBottom: '8px' }}>
                  AVAILABLE DRIVERS &amp; FLEET
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'Ramesh Kumar', vehicle: 'Van #1 • Zone 1', zone: 'Katpadi & Vellore North' },
                    { name: 'Vignesh S', vehicle: 'Bike #3 • Express', zone: 'Sathuvachari & City Central' },
                    { name: 'Murugan P', vehicle: 'Van #2 • Zone 2', zone: 'Ranipet & Arcot Road' },
                    { name: 'Suresh K', vehicle: 'Van #4 • Zone 3', zone: 'Officers Line & Gandhi Road' },
                  ].map((drv) => {
                    const val = `${drv.name} (${drv.vehicle})`;
                    const isSelected = selectedDriver.includes(drv.name);
                    return (
                      <div
                        key={drv.name}
                        onClick={() => setSelectedDriver(val)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                          background: isSelected ? '#1e293b' : '#040b17',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 650, fontSize: '13px', color: '#f8fafc' }}>{drv.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{drv.vehicle} • {drv.zone}</div>
                        </div>
                        {isSelected && <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssignDriverTarget(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 650,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const driverName = selectedDriver.split(' (')[0] || selectedDriver;
                    const orderIdStr = assignDriverTarget.order_number || assignDriverTarget.order_id || assignDriverTarget.id || 'ORDER';
                    const nowFormatted = new Date().toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const pickupLog = {
                      id: `log_pickup_${Date.now()}`,
                      title: 'Assigned for Pickup',
                      detail: `Pickup scheduled with ${selectedDriver}`,
                      author: 'Store Dispatcher',
                      time: nowFormatted,
                      type: 'pickup',
                      status: 'Assigned for Pickup',
                    };

                    const prevLogs = assignDriverTarget.audit_logs || assignDriverTarget.logs || [];
                    const updatedLogs = [pickupLog, ...prevLogs.filter((l) => l.title !== 'Assigned for Pickup')];

                    const updatedOrder = {
                      ...assignDriverTarget,
                      assigned_for_pickup: true,
                      pickup_status: 'Assigned for Pickup',
                      assigned_driver: driverName,
                      assigned_driver_full: selectedDriver,
                      pickup_delivery: `Assigned: ${driverName}`,
                      audit_logs: updatedLogs,
                      logs: updatedLogs,
                      timeline: updatedLogs,
                      updated_at: new Date().toISOString(),
                    };

                    // Notify parent to sync state & persist
                    if (onUpdateOrder) {
                      onUpdateOrder(updatedOrder);
                    } else {
                      try {
                        const cached = localStorage.getItem('washdoor_orders_cache');
                        if (cached) {
                          const list = JSON.parse(cached);
                          const nextList = list.map((o) =>
                            (o.id === updatedOrder.id || o.order_number === updatedOrder.order_number) ? updatedOrder : o
                          );
                          localStorage.setItem('washdoor_orders_cache', JSON.stringify(nextList));
                        }
                      } catch {}
                      onOrderCreated?.(updatedOrder);
                    }

                    // Keep inline edit states in sync if active
                    if (editingOrderRecord && (editingOrderRecord.id === updatedOrder.id || editingOrderRecord.order_number === updatedOrder.order_number)) {
                      setEditingOrderRecord(updatedOrder);
                      setEditFormData((prev) => prev ? {
                        ...prev,
                        assigned_for_pickup: true,
                        pickup_status: 'Assigned for Pickup',
                        assigned_driver: driverName,
                        assigned_driver_full: selectedDriver,
                        pickup_delivery: `Assigned: ${driverName}`,
                        audit_logs: updatedLogs,
                        logs: updatedLogs,
                      } : null);
                    }
                    if (sideEditTargetOrder && (sideEditTargetOrder.id === updatedOrder.id || sideEditTargetOrder.order_number === updatedOrder.order_number)) {
                      setSideEditTargetOrder(updatedOrder);
                    }

                    showToast?.(`🚚 Order ${orderIdStr}: Assigned for pickup to ${driverName}!`);
                    setAssignDriverTarget(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone Static Side Edit Panel (matching reference mockup) ── */}
      <SideEditPanel
        isOpen={Boolean(sideEditTargetOrder)}
        order={sideEditTargetOrder}
        onClose={() => setSideEditTargetOrder(null)}
        showToast={showToast}
        currencySymbol={currencySymbol}
        onUpdateOrder={(updated) => {
          if (onUpdateOrder) {
            onUpdateOrder(updated);
          } else {
            try {
              const cached = localStorage.getItem('washdoor_orders_cache');
              if (cached) {
                const list = JSON.parse(cached);
                const nextList = list.map((o) =>
                  o.id === updated.id || o.order_number === updated.order_number ? updated : o
                );
                localStorage.setItem('washdoor_orders_cache', JSON.stringify(nextList));
              }
            } catch {}
            onOrderCreated?.(updated);
          }
        }}
      />
    </div>
  );
}
