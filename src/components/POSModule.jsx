// src/components/POSModule.jsx
// Washdoor Orders & POS Counter Intake & Management Module
// Matches the exact Orders & POS design with Orders List Table and Counter Intake Register

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import ClothIllustration from './ClothIllustration';
import OrderReviewCard from './OrderReviewCard';
import SideEditPanel from './SideEditPanel';
import GarmentInspectionSection from './GarmentInspectionSection';
import ViewOrderModal from './ViewOrderModal';
import ThermalReceiptModal from './ThermalReceiptModal';
import ScheduleDeliveryModal from './ScheduleDeliveryModal';
import DriverAssignModal from './DriverAssignModal';
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
import { useLanguage } from '../context/LanguageContext';
import { exportToExcel, exportToPdf, exportToCsv } from '../services/exportService';
import {
  ORDER_COLUMNS,
  DEFAULT_COLUMN_IDS,
  ALL_COLUMN_IDS,
  REQUIRED_COLUMN_IDS,
  FIXED_COLUMN_IDS,
  sanitizeAndOrderColumns,
  enforceRequiredColumns,
} from '../config/orderColumnsConfig';
import {
  loadColumnPreferences,
  saveColumnPreferences,
} from '../services/columnPreferenceService';
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

export function groupServicesByType(services = [], ord = {}) {
  const groups = {};
  const orderDefaultService = ord.service_category || ord.service_type || ord.preference || 'Standard Services';

  services.forEach((item) => {
    let group = item.serviceType || item.service || item.category;
    if (!group) {
      const lower = (item.name || '').toLowerCase();
      if (lower.includes('dry clean') || lower.includes('drycleaning')) {
        group = 'Dry Cleaning';
      } else if (lower.includes('steam press') || lower.includes('iron') || lower.includes('press')) {
        group = 'Steam Press & Ironing';
      } else if (lower.includes('wash') || lower.includes('laundry')) {
        group = 'Laundry / Normal Wash';
      } else if (lower.includes('starch') || lower.includes('softener') || lower.includes('finish') || lower.includes('perfume') || lower.includes('addon')) {
        group = 'Finishes & Add-ons';
      } else if (lower.includes('curtain') || lower.includes('bedsheet') || lower.includes('towel') || lower.includes('linen') || lower.includes('blanket')) {
        group = 'Home Linen & Bedding';
      } else if (lower.includes('shoe') || lower.includes('bag') || lower.includes('leather')) {
        group = 'Shoe & Special Care';
      } else {
        group = orderDefaultService || 'Standard Services';
      }
    }
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  });

  return groups;
}

export function getServiceItemIcon(item = {}) {
  if (item.icon) return item.icon;
  const lower = (item.name || '').toLowerCase();
  if (lower.includes('steam press') || lower.includes('iron') || lower.includes('press')) return '♨️';
  if (lower.includes('dry clean') || lower.includes('drycleaning')) return '✨';
  if (lower.includes('wash') || lower.includes('laundry')) return '🧺';
  if (lower.includes('starch') || lower.includes('finish')) return '👔';
  if (lower.includes('softener') || lower.includes('fragrance') || lower.includes('perfume')) return '🌸';
  if (lower.includes('saree')) return '🥻';
  if (lower.includes('curtain')) return '🪟';
  if (lower.includes('bed') || lower.includes('pillow')) return '🛏️';
  if (lower.includes('shoe')) return '👟';
  if (lower.includes('towel')) return '🧼';
  if (lower.includes('pant') || lower.includes('jeans')) return '👖';
  return '👕';
}

function ServicesPopoverPortal({ popoverData, onClose, popoverRef }) {
  if (!popoverData || typeof document === 'undefined') return null;

  const [activeTab, setActiveTab] = useState('hidden'); // 'hidden' | 'all'
  const [positionStyle, setPositionStyle] = useState({});

  const {
    orderNum,
    anchorRect,
    services = [],
    totalPieces = 0,
    orderServiceCategory,
  } = popoverData;

  const hiddenServices = services.slice(3);
  const displayedServices = activeTab === 'all' ? services : (hiddenServices.length > 0 ? hiddenServices : services);
  const grouped = groupServicesByType(displayedServices, { service_category: orderServiceCategory });

  useEffect(() => {
    if (!anchorRect) return;
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      setPositionStyle({});
      return;
    }

    const { top, bottom, left } = anchorRect;
    const popoverWidth = 330;
    const estimatedHeight = 360;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - bottom;
    const placeAbove = spaceBelow < estimatedHeight && top > spaceBelow;

    let calculatedTop = placeAbove ? top - estimatedHeight - 8 : bottom + 8;
    if (calculatedTop < 12) calculatedTop = 12;

    let calculatedLeft = left;
    if (calculatedLeft + popoverWidth > viewportWidth - 16) {
      calculatedLeft = viewportWidth - popoverWidth - 16;
    }
    if (calculatedLeft < 16) calculatedLeft = 16;

    setPositionStyle({
      top: `${Math.round(calculatedTop)}px`,
      left: `${Math.round(calculatedLeft)}px`,
      width: `${popoverWidth}px`,
    });
  }, [anchorRect]);

  const displayedPieceCount = displayedServices.reduce(
    (acc, it) => acc + (Number(it.count || it.qty || it.quantity) || 1),
    0
  );

  return createPortal(
    <>
      {/* Backdrop for mobile bottom sheet */}
      <div
        className="pos-services-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover / Bottom Sheet Container */}
      <div
        ref={popoverRef}
        className="pos-services-popover-container"
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Services breakdown for Order ${orderNum}`}
      >
        {/* Mobile Drag Handle */}
        <div className="pos-services-popover-drag-handle" />

        {/* Header */}
        <div className="pos-services-popover-header">
          <div className="pos-services-popover-title-wrap">
            <div className="pos-services-popover-title">
              <span>Services & Garments</span>
            </div>
            <div className="pos-services-popover-order-badge">
              Order #{orderNum}
            </div>
          </div>
          <div className="pos-services-popover-header-actions">
            <span className="pos-services-popover-pcs-badge" title="Total Pieces in Order">
              🏷️ {totalPieces} pcs
            </span>
            <button
              type="button"
              className="pos-services-popover-close-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close popover"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab switcher: Hidden vs All */}
        {services.length > 3 && (
          <div className="pos-services-popover-tabs">
            <button
              type="button"
              className={`pos-services-tab-btn ${activeTab === 'hidden' ? 'active' : ''}`}
              onClick={() => setActiveTab('hidden')}
            >
              <span>Hidden Services (+{hiddenServices.length})</span>
            </button>
            <button
              type="button"
              className={`pos-services-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All Services ({services.length})</span>
            </button>
          </div>
        )}

        {/* Grouped Services Body */}
        <div className="pos-services-popover-body">
          {Object.keys(grouped).length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              No services to display
            </div>
          ) : (
            Object.entries(grouped).map(([groupTitle, itemsList]) => {
              const groupPieces = itemsList.reduce(
                (acc, it) => acc + (Number(it.count || it.qty || it.quantity) || 1),
                0
              );
              return (
                <div key={groupTitle} className="pos-services-group">
                  <div className="pos-services-group-header">
                    <span>{groupTitle}</span>
                    <span className="pos-services-group-count">
                      {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'} • {groupPieces} pcs
                    </span>
                  </div>
                  <div className="pos-services-items-list">
                    {itemsList.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="pos-services-item-row">
                        <div className="pos-services-item-left">
                          <span className="pos-services-item-icon">{getServiceItemIcon(item)}</span>
                          <span className="pos-services-item-name" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="pos-services-item-badge">
                          x{item.count || item.qty || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pos-services-popover-footer">
          <span>{displayedServices.length} {displayedServices.length === 1 ? 'service' : 'services'} ({displayedPieceCount} pcs)</span>
          <span className="pos-services-popover-footer-total">
            Total Order: {totalPieces} pieces
          </span>
        </div>
      </div>
    </>,
    document.body
  );
}

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
  searchQuery = '',
  onSearchChange,
}) {
  const { t } = useLanguage();

  // Top Header, Search Toolbar & Status Tab State (matching reference mockup)
  const [topSearchQuery, setTopSearchQuery] = useState(searchQuery || '');

  // Synchronize with centralized search bar
  useEffect(() => {
    if (searchQuery !== undefined) {
      setTopSearchQuery(searchQuery);
    }
  }, [searchQuery]);
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [activeTopDropdown, setActiveTopDropdown] = useState(null); // 'filters' | 'date' | null
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [posViewMode, setPosViewMode] = useState('orders'); // 'orders' | 'intake'
  const [orderDisplayLayout, setOrderDisplayLayout] = useState('table'); // 'table' | 'cards'
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeServicesPopover, setActiveServicesPopover] = useState(null);
  const servicesPopoverRef = useRef(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const tableScrollRef = useRef(null);

  // Close services popover on outside click, Escape key, window resize or external scroll
  useEffect(() => {
    if (!activeServicesPopover) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveServicesPopover(null);
      }
    };

    const handlePointerDown = (e) => {
      if (
        servicesPopoverRef.current &&
        !servicesPopoverRef.current.contains(e.target) &&
        !e.target.closest('.pos-services-more-btn')
      ) {
        setActiveServicesPopover(null);
      }
    };

    const handleScroll = (e) => {
      if (servicesPopoverRef.current && servicesPopoverRef.current.contains(e.target)) {
        return;
      }
      setActiveServicesPopover(null);
    };

    const handleResize = () => {
      setActiveServicesPopover(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeServicesPopover]);

  const handleToggleServicesPopover = (e, ord, servicesAllocated, totalPieces, orderKey) => {
    e.stopPropagation();
    if (activeServicesPopover?.orderKey === orderKey) {
      setActiveServicesPopover(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveServicesPopover({
        orderKey,
        orderNum: ord.order_number || ord.order_id || ord.work_number || (ord.id ? String(ord.id) : '—'),
        orderServiceCategory: ord.service_category || ord.service_type || ord.preference,
        anchorRect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
        services: servicesAllocated,
        totalPieces,
      });
    }
  };

  // ── Dynamic Column Management System ──
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_COLUMN_IDS);
  const [draftColumns, setDraftColumns] = useState(DEFAULT_COLUMN_IDS);

  useEffect(() => {
    let mounted = true;
    loadColumnPreferences().then((cols) => {
      if (mounted && Array.isArray(cols) && cols.length > 0) {
        const enforced = enforceRequiredColumns(cols);
        setSelectedColumns(enforced);
        setDraftColumns(enforced);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleToggleColumn = (colId) => {
    if (REQUIRED_COLUMN_IDS.includes(colId)) {
      const colObj = ORDER_COLUMNS.find((c) => c.id === colId);
      showToast?.(`ℹ️ ${colObj?.label || 'This'} is a permanent column and cannot be removed`);
      return;
    }
    setDraftColumns((prev) => {
      const exists = prev.includes(colId);
      let updated;
      if (exists) {
        updated = prev.filter((id) => id !== colId);
      } else {
        updated = [...prev, colId];
      }
      const ordered = enforceRequiredColumns(updated);
      setSelectedColumns(ordered);
      saveColumnPreferences(ordered);
      return ordered;
    });
  };

  const handleSelectAllColumns = () => {
    if (selectedColumns.length === ALL_COLUMN_IDS.length) {
      // Keep only fixed required columns (Order ID, Customer, Actions)
      const fixedOnly = [...REQUIRED_COLUMN_IDS];
      setDraftColumns(fixedOnly);
      setSelectedColumns(fixedOnly);
      saveColumnPreferences(fixedOnly);
      showToast?.('✓ Reset to 3 fixed required columns');
    } else {
      const all = [...ALL_COLUMN_IDS];
      setDraftColumns(all);
      setSelectedColumns(all);
      saveColumnPreferences(all);
      showToast?.('✓ All 17 columns selected');
    }
  };

  const handleResetDefaultColumns = () => {
    const defs = [...DEFAULT_COLUMN_IDS];
    setDraftColumns(defs);
    setSelectedColumns(defs);
    saveColumnPreferences(defs);
    showToast?.('✓ Restored 9 default columns');
  };

  const handleOpenWhatsApp = (order) => {
    const rawMobile = order.mobile_number || order.customer?.mobile_number || '';
    const digits = rawMobile.replace(/\D/g, '');
    const tenDigits = digits.length >= 10 ? digits.slice(-10) : digits;
    if (!/^[6-9]\d{9}$/.test(tenDigits)) {
      showToast?.('⚠️ Invalid or missing 10-digit mobile number for WhatsApp');
      return;
    }
    const custName = order.customer_name || order.customer?.customer_name || 'Valued Customer';
    const orderNum = order.order_number || order.order_id || order.id || 'your order';
    const status = normalizeOrderStatus(order.order_status || order.status || 'Received');
    const total = order.total_amount ?? order.total ?? '';
    const msg = `Hello ${custName}! 👋\nRegarding your Washdoor laundry order ${orderNum} (Status: ${status}${total ? `, Total: ₹${total}` : ''}):\nWe are pleased to serve you. Please let us know if you need any assistance!\n— Washdoor Team`;
    const url = `https://wa.me/91${tenDigits}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast?.(`💬 Opened WhatsApp chat for ${custName} (+91 ${tenDigits})`);
  };

  const isColVisible = (colId) => REQUIRED_COLUMN_IDS.includes(colId) || selectedColumns.includes(colId);

  // Inline Order Edit Modal State (List View Fields, Read-Only when Ready)
  const [editingOrderRecord, setEditingOrderRecord] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // Reset Table Scroll When Editing Starts
  useEffect(() => {
    if (editingOrderRecord && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = 0;
    }
  }, [editingOrderRecord]);

  // Static Side Edit Panel Target Order
  const [sideEditTargetOrder, setSideEditTargetOrder] = useState(null);

  // Quick View Order Modal Target Order
  const [viewOrderTarget, setViewOrderTarget] = useState(null);

  // Thermal Receipt / Invoice Modal Target Order
  const [receiptOrderTarget, setReceiptOrderTarget] = useState(null);

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
  const [editInspections, setEditInspections] = useState({});
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
    const expectedDeliveryStr = ord.expected_delivery || ord.delivery_date || (ord.target_delivery_date ? new Date(ord.target_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '') || '30 Oct 2026, 05:00 PM';
    const pickupDeliveryStr = ord.pickup_delivery || '--------';
    const commentsStr = ord.comments || ord.preference_notes || ord.special_instructions || ord.notes || '';
    const totalAmount = Number(ord.total_amount || 0);
    const advancePaid = Number(ord.advance_paid || 0);
    const balanceDue = Number(ord.balance_due !== undefined ? ord.balance_due : Math.max(0, totalAmount - advancePaid));
    const paymentStatus = ord.payment_status || (balanceDue <= 0 ? 'Paid' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid');

    // Parse order items or fallback to empty cart
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
        icon: s.icon || (s.name?.toLowerCase().includes('steam') ? '♨️' : s.name?.toLowerCase().includes('dry') ? '✨' : s.name?.toLowerCase().includes('starch') ? '👔' : s.name?.toLowerCase().includes('fabric') ? '🌸' : s.name?.toLowerCase().includes('hanger') ? '🏷' : '🧺'),
      }));
    } else if (!ord.items && !ord.services_allocated) {
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
      : [];
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

    // Parse existing garment inspection records
    let initialInspections = {};
    if (ord.garment_inspections && typeof ord.garment_inspections === 'object') {
      initialInspections = { ...ord.garment_inspections };
    } else if (ord.inspections && typeof ord.inspections === 'object' && !Array.isArray(ord.inspections)) {
      initialInspections = { ...ord.inspections };
    } else if (ord.items && Array.isArray(ord.items)) {
      ord.items.forEach((it) => {
        if (it.inspections && Array.isArray(it.inspections)) {
          it.inspections.forEach((insp) => {
            if (insp.id) initialInspections[insp.id] = insp;
          });
        }
      });
    }
    setEditInspections(initialInspections);

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
    const advancePaidVal = Number(editFormData.advance_paid || 0);

    if (advancePaidVal > grandTotal) {
      showToast?.(`⚠️ Advance paid (₹${advancePaidVal.toFixed(2)}) cannot exceed grand total (₹${grandTotal.toFixed(2)})`);
      return;
    }

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
      items: editCart.map((it) => ({
        ...it,
        inspections: Object.values(editInspections).filter((p) => p.cartItemId === it.id),
      })),
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
      photos: Object.values(editInspections).flatMap((p) => p.photos || []),
      garment_inspections: editInspections,
      inspections: editInspections,
      inspection: {
        ...editInspection,
        photos: Object.values(editInspections).flatMap((p) => p.photos || []),
        photosCount: Object.values(editInspections).flatMap((p) => p.photos || []).length,
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
        orderStatus: updatedOrder.status,
        customerName: updatedOrder.customer_name,
        mobileNumber: updatedOrder.mobile_number,
        address: updatedOrder.address,
        orderType: updatedOrder.order_type,
        expectedDelivery: updatedOrder.expected_delivery,
        deliveryDate: updatedOrder.expected_delivery,
        serviceCategory: updatedOrder.service_category,
        orderNotes: updatedOrder.comments,
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: grandTotal,
        advancePaid: Number(editFormData.advance_paid || 0),
        paymentStatus: editFormData.payment_status,
        paymentMethod: updatedOrder.payment_method || 'Cash',
        assignedStaff: updatedOrder.assigned_driver,
        items: updatedOrder.items,
        garment_inspections: editInspections,
      }).catch((e) => console.warn('Supabase saveOrder update note:', e));
    }

    showToast?.(`✅ Order ${updatedOrder.order_number || updatedOrder.id} updated successfully!`);
    setEditingOrderRecord(null);
    setEditFormData(null);
  };

  const handleAssignDriverSubmit = ({ order, selectedDriver }) => {
    const driverName = selectedDriver.split(' (')[0] || selectedDriver;
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

    const prevLogs = order.audit_logs || order.logs || [];
    const updatedLogs = [pickupLog, ...prevLogs.filter((l) => l.title !== 'Assigned for Pickup')];

    const updatedOrder = {
      ...order,
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

    if (editingOrderRecord && (editingOrderRecord.id === updatedOrder.id || editingOrderRecord.order_number === updatedOrder.order_number)) {
      setEditingOrderRecord(updatedOrder);
      setEditFormData((prev) => prev ? {
        ...prev,
        assigned_driver: driverName,
        assigned_driver_full: selectedDriver,
        pickup_status: 'Assigned for Pickup',
        assigned_for_pickup: true,
        pickup_delivery: `Assigned: ${driverName}`,
      } : prev);
    }

    showToast?.(`✅ ${driverName} assigned to Order ${updatedOrder.order_number || updatedOrder.order_id}!`);

    const saveKey = updatedOrder.order_number || updatedOrder.id || updatedOrder.work_number;
    if (saveKey) {
      updateOrderInSupabase(saveKey, {
        status: updatedOrder.status,
        orderStatus: updatedOrder.status,
        customerName: updatedOrder.customer_name,
        mobileNumber: updatedOrder.mobile_number,
        assignedStaff: driverName,
        pickupStatus: 'Assigned for Pickup',
        pickupDelivery: `Assigned: ${driverName}`,
        updated_at: new Date().toISOString(),
      }).catch((e) => console.warn('Supabase driver assign note:', e));
    }
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
      if (!e.target.closest('.pos-filter-dropdown-container') && !e.target.closest('.pos-column-dropdown-container')) {
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

      // 2. Search Filter (Centralized search: Order ID, Customer Name, Mobile Number, Address, Services)
      if (topSearchQuery && topSearchQuery.trim()) {
        const rawQ = topSearchQuery.trim().toLowerCase();
        const cleanDigits = rawQ.replace(/\D/g, '');
        const num = String(o.order_number || o.order_id || o.id || '').toLowerCase();
        const numDigits = num.replace(/\D/g, '');
        const name = String(o.customer_name || o.customer?.customer_name || '').toLowerCase();
        const phone = String(o.mobile_number || o.customer?.mobile_number || o.formatted_mobile || '').replace(/\D/g, '');
        const addr = String(o.address || o.delivery_address || o.customer?.address || o.customer?.streetArea || '').toLowerCase();
        const srv = String(o.service_category || o.preference || o.service_type || '').toLowerCase();

        const matchNum = num.includes(rawQ) || (cleanDigits.length > 0 && numDigits.includes(cleanDigits));
        const matchName = name.includes(rawQ);
        const matchPhone = cleanDigits.length > 0 && phone.includes(cleanDigits);
        const matchAddr = addr.includes(rawQ);
        const matchSrv = srv.includes(rawQ);

        if (!matchNum && !matchName && !matchPhone && !matchAddr && !matchSrv) return false;
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

  // ── Orders Pagination ──
  const [ordersPageSizeKey, setOrdersPageSizeKey] = useState('5');
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = ordersPageSizeKey === 'all' ? Math.max(filteredOrders.length, 1) : parseInt(ordersPageSizeKey, 10);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setOrdersPage(1);
  }, [activeStatusTab, topSearchQuery, serviceFilter, dateFilter, ordersPageSizeKey]);

  // Global 'N' keyboard shortcut to quickly initiate new order creation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
        const isEditable = document.activeElement ? document.activeElement.isContentEditable : false;
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) && !isEditable) {
          e.preventDefault();
          if (onCreateOrder) {
            onCreateOrder();
          } else {
            handleResetRegister();
            setActiveRegisterTab?.('counter');
            const walkinInput = document.getElementById('walkinNameInput');
            if (walkinInput) walkinInput.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCreateOrder]);

  const ordersTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    if (ordersPageSizeKey === 'all') return filteredOrders;
    const start = (ordersPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, ordersPage, ordersPageSizeKey, ORDERS_PER_PAGE]);

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

  // ── Export Orders with Live Audit Trail ──
  const handleExportPOSOrders = (format) => {
    if (!orders || orders.length === 0) {
      showToast?.('No orders available to export.');
      return;
    }

    // Build the full data row for every possible column
    const formatted = orders.map((o) => {
      let tot = Number(o.total_amount) || 0;
      if (tot === 0 && Array.isArray(o.items) && o.items.length > 0) {
        tot = o.items.reduce((s, it) => s + (Number(it.amount) || Number(it.rate || 0) * Number(it.qty || 1)), 0);
      }
      const adv = Number(o.advance_paid) || 0;
      const bal = o.balance_due !== undefined ? Number(o.balance_due) : Math.max(0, tot - adv);
      const pieces = Number(o.total_pieces || o.item_count) || (Array.isArray(o.items) ? o.items.reduce((s, it) => s + (Number(it.qty) || 1), 0) : 1);
      const custAddr = [o.address, o.customer?.address, o.customer?.address_line1].filter(Boolean).join(', ') || '-';
      const orderDateVal = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (o.order_date || '-');
      return {
        order_number: o.order_number || (o.id ? `ORD-${o.id}` : 'ORD-00000'),
        customer_name: o.customer_name || o.customer?.customer_name || 'Walk-in Customer',
        mobile_number: o.mobile_number || o.customer?.mobile_number || '-',
        address: custAddr,
        service: o.service_category || o.service_type || 'Wash & Steam Press',
        status: o.order_status || o.status || 'Received',
        pieces,
        total: tot,
        advance: adv,
        balance: bal,
        payment_status: bal <= 0 && tot > 0 ? 'Paid' : adv > 0 ? 'Partial' : tot === 0 ? 'Promo' : 'Unpaid',
        order_date: orderDateVal,
        delivery_date: (o.target_delivery_date || o.delivery_date || '').slice(0, 10) || '-',
        driver: o.assigned_driver || o.assigned_rider || 'Unassigned',
        comments: o.internal_notes || o.comments || o.notes || o.special_instructions || '-',
        pincode: o.pincode || o.customer?.pincode || o.customer?.pin_code || '-',
        email: o.email || o.customer?.email || '-',
        business_name: o.business_name || o.customer?.business_name || '-',
        communication_pref: o.communication_pref || o.customer?.communication_pref || '-',
        dob: o.dob || o.customer?.dob || '-',
        tax_exemption: o.tax_exemption !== undefined ? (o.tax_exemption ? 'Yes' : 'No') : (o.customer?.tax_exemption !== undefined ? (o.customer.tax_exemption ? 'Yes' : 'No') : '-'),
      };
    });

    // Map each visible column ID → export column definition (actions is UI-only, skip)
    const EXPORT_COL_MAP = {
      order_id:          { header: 'Order ID',           key: 'order_number',      width: 28 },
      customer:          { header: 'Customer Name',      key: 'customer_name',     width: 38 },
      address:           { header: 'Address',            key: 'address',           width: 36 },
      services:          { header: 'Service Type',       key: 'service',           width: 32 },
      status:            { header: 'Status',             key: 'status',            width: 22 },
      payment:           { header: `Total (${currencySymbol})`, key: 'total',      width: 22, accessor: (d) => `${currencySymbol}${Number(d.total).toFixed(2)}` },
      order_details:     { header: 'Order Date',         key: 'order_date',        width: 26 },
      pickup_delivery:   { header: 'Delivery Date',      key: 'delivery_date',     width: 26 },
      actions:           null, // UI-only – skip in export
      driver:            { header: 'Driver',             key: 'driver',            width: 28 },
      comments:          { header: 'Comments',           key: 'comments',          width: 36 },
      pincode:           { header: 'PIN Code',           key: 'pincode',           width: 16 },
      email:             { header: 'Email',              key: 'email',             width: 32 },
      business_name:     { header: 'Business Name',      key: 'business_name',     width: 30 },
      communication_pref:{ header: 'Comm. Preference',  key: 'communication_pref',width: 24 },
      dob:               { header: 'Date of Birth',      key: 'dob',               width: 20 },
      tax_exemption:     { header: 'Tax Exemption',      key: 'tax_exemption',     width: 20 },
    };

    // Build columns from currently selected columns (preserves UI order, skips actions)
    const cols = selectedColumns.map((id) => EXPORT_COL_MAP[id]).filter(Boolean);
    // Always include mobile number after customer if customer col is visible (useful context)
    const hasMobile = !cols.find((c) => c.key === 'mobile_number');
    if (hasMobile && selectedColumns.includes('customer')) {
      const custIdx = cols.findIndex((c) => c.key === 'customer_name');
      cols.splice(custIdx + 1, 0, { header: 'Mobile', key: 'mobile_number', width: 26 });
    }

    // PDF uses a width-adjusted subset (max ~8 cols for readability)
    const pdfCols = cols.slice(0, 8);

    const dateStr = new Date().toISOString().slice(0, 10);
    try {
      if (format === 'EXCEL') {
        exportToExcel({
          filename: `Washdoor_POS_Orders_${dateStr}.xlsx`,
          sheetName: 'POS Orders',
          data: formatted,
          columns: cols,
          title: 'POS Orders & Intake Register',
          module: 'POS Orders & Counter',
          tenant: 'Ranipet Store #1',
        });
      } else if (format === 'PDF') {
        exportToPdf({
          filename: `Washdoor_POS_Orders_${dateStr}.pdf`,
          title: 'Washdoor POS Orders Register',
          subtitle: `Counter Intake & Live Order Statuses • Tenant: Ranipet Store #1`,
          data: formatted,
          columns: pdfCols,
          module: 'POS Orders & Counter',
          tenant: 'Ranipet Store #1',
          currencySymbol,
        });
      } else {
        exportToCsv({
          filename: `Washdoor_POS_Orders_${dateStr}.csv`,
          data: formatted,
          columns: cols,
          title: 'POS Orders Register',
          module: 'POS Orders & Counter',
          tenant: 'Ranipet Store #1',
        });
      }
      setIsExportMenuOpen(false);
      showToast?.(`✓ Orders exported (${format}) and audited for Ranipet Store #1!`);
    } catch (e) {
      showToast?.(`❌ Export failed: ${e.message}`);
    }
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

    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      showToast?.('⚠️ Please provide a valid 10-digit Indian Mobile Number (starts with 6, 7, 8, or 9)');
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
      subtotal: subtotal,
      discount_amount: discountAmount,
      tax_amount: gstAmount,
      total_amount: grandTotal,
      intake_type: intakeType,
      payment_method: paymentMode,
      payment_status: paymentMode === 'Cash' || paymentMode === 'UPI / QR Code' ? 'Paid' : 'Unpaid',
      advance_paid: paymentMode === 'Cash' || paymentMode === 'UPI / QR Code' ? grandTotal : 0,
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
          <h1 className="pos-screen-title">{t('pos_orders_pos')}</h1>
          <div className="pos-screen-subtitle">{t('pos_title')}</div>
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
              placeholder={t('pos_search_placeholder')}
              value={topSearchQuery}
              onChange={(e) => {
                setTopSearchQuery(e.target.value);
                onSearchChange?.(e.target.value);
              }}
            />
            {topSearchQuery && (
              <button
                type="button"
                className="pos-search-clear-btn"
                onClick={() => {
                  setTopSearchQuery('');
                  onSearchChange?.('');
                }}
                title={t('clear_search')}
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
              <span className="pos-date-label">{dateFilter === 'All Time' ? t('filter_all_time') : dateFilter}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
                    <span>{rng === 'All Time' ? t('filter_all_time') : rng === 'Today' ? t('filter_today') : rng === 'This Month' ? t('filter_this_month') : rng}</span>
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
            <span style={{ fontSize: '16px', marginBottom: '2px' }}>＋</span>
            <span className="pos-btn-label-full">{t('pos_create_order')}</span>
            <span className="pos-btn-label-short">Order</span>
            <span className="pos-key-badge">N</span>
          </button>

          {/* Export Orders Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="pos-toolbar-btn"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              title="Export Orders (Excel, PDF, CSV) with Audit Trail"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export</span>
            </button>
            {isExportMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: 'var(--panel-bg, #1e293b)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 100,
                  minWidth: '150px',
                }}
              >
                <button
                  type="button"
                  className="dash-export-btn excel"
                  onClick={() => handleExportPOSOrders('EXCEL')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="dash-export-btn pdf"
                  onClick={() => handleExportPOSOrders('PDF')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  PDF (.pdf)
                </button>
                <button
                  type="button"
                  className="dash-export-btn csv"
                  onClick={() => handleExportPOSOrders('CSV')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  CSV (.csv)
                </button>
              </div>
            )}
          </div>
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
            <span>{t('tab_all')}</span>
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
            <span>{t('status_received')}</span>
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
            <span>{t('status_progress')}</span>
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
            <span>{t('status_ready')}</span>
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
            <span>{t('status_delivered')}</span>
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
            <span>{t('status_cancelled')}</span>
            <span className="pos-status-pill-count">{statusCounts.cancelled}</span>
          </button>
        </div>

        <div className="pos-status-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Column Category Dropdown */}
          <div className="pos-column-dropdown-container" style={{ position: 'relative' }}>
            <button
              type="button"
              className={`pos-toolbar-btn ${activeTopDropdown === 'columns' ? 'active' : ''}`}
              onClick={() => setActiveTopDropdown((prev) => (prev === 'columns' ? null : 'columns'))}
              style={{
                background: activeTopDropdown === 'columns' ? '#eff6ff' : '#fff',
                border: `1.5px solid ${activeTopDropdown === 'columns' ? '#93c5fd' : '#cbd5e1'}`,
                borderRadius: '10px',
                padding: '7px 14px',
                color: activeTopDropdown === 'columns' ? '#1d4ed8' : '#334155',
                fontWeight: 600,
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                transition: 'all 0.14s ease',
              }}
              title="Configure visible columns"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <span>Columns</span>
              {selectedColumns.length !== ALL_COLUMN_IDS.length && (
                <span style={{ background: '#2563eb', color: '#fff', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '1px 7px', lineHeight: 1.5 }}>
                  {selectedColumns.length}
                </span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: activeTopDropdown === 'columns' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {activeTopDropdown === 'columns' && (
              <div className="pos-column-popover-menu" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pos-column-popover-header">
                  <div className="pos-column-popover-title">
                    <span className="pos-column-popover-title-main">Manage Columns</span>
                    <span className="pos-column-popover-title-sub">Choose which columns to display</span>
                  </div>
                  <div className="pos-column-header-right">
                    <span className="pos-column-count-pill">{selectedColumns.length}/{ALL_COLUMN_IDS.length}</span>
                    <button
                      type="button"
                      className="pos-column-select-all-btn"
                      onClick={handleSelectAllColumns}
                    >
                      {selectedColumns.length === ALL_COLUMN_IDS.length ? 'Clear' : 'All'}
                    </button>
                  </div>
                </div>

                {/* Default columns section */}
                <div className="pos-column-list-scroll">
                  <div className="pos-column-section-label">Default Columns</div>
                  {ORDER_COLUMNS.filter(col => col.default).map((col) => {
                    const isRequired = col.required || REQUIRED_COLUMN_IDS.includes(col.id);
                    const isChecked = isRequired || selectedColumns.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`pos-column-checkbox-item ${isChecked ? 'is-checked' : ''} ${isRequired ? 'is-fixed-item' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isRequired) {
                            showToast?.(`ℹ️ ${col.label} is a permanent column and cannot be hidden`);
                          } else {
                            handleToggleColumn(col.id);
                          }
                        }}
                        title={isRequired ? `${col.label} is a permanent column (cannot be hidden)` : `Toggle ${col.label}`}
                      >
                        <div className="pos-column-item-left">
                          <div
                            className={`pos-col-custom-check ${isChecked ? 'checked' : ''} ${isRequired ? 'is-fixed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRequired) {
                                showToast?.(`ℹ️ ${col.label} is a permanent column and cannot be hidden`);
                              } else {
                                handleToggleColumn(col.id);
                              }
                            }}
                          >
                            {isChecked && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span className="pos-column-item-label">{col.label}</span>
                        </div>
                        <div className="pos-column-item-right">
                          {isRequired ? (
                            <span className="pos-column-required-badge" title="Permanent required column">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              Required
                            </span>
                          ) : (
                            <span className="pos-column-default-badge">Default</span>
                          )}
                        </div>
                      </label>
                    );
                  })}

                  <div className="pos-column-section-label" style={{ marginTop: '6px' }}>Additional Columns</div>
                  {ORDER_COLUMNS.filter(col => !col.default).map((col) => {
                    const isChecked = selectedColumns.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`pos-column-checkbox-item ${isChecked ? 'is-checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleColumn(col.id);
                        }}
                        title={`Toggle ${col.label}`}
                      >
                        <div className="pos-column-item-left">
                          <div className={`pos-col-custom-check ${isChecked ? 'checked' : ''}`}>
                            {isChecked && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span className="pos-column-item-label">{col.label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="pos-column-popover-footer">
                  <button
                    type="button"
                    className="pos-column-btn-reset"
                    onClick={handleResetDefaultColumns}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Reset
                  </button>
                  <button
                    type="button"
                    className="pos-column-btn-apply"
                    onClick={() => {
                      setActiveTopDropdown(null);
                      showToast?.(`✓ Showing ${selectedColumns.length} columns`);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Apply Columns
                  </button>
                </div>
              </div>
            )}
          </div>

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
                <>
                  <div className="pos-orders-cards-list">
                    {paginatedOrders.map((ord) => (
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
                  {/* ── Cards View Pagination Bar ── */}
                  <div className="pagination-bar pos-cards-pagination-bar">
                    <span className="pagination-info">
                      Showing {filteredOrders.length === 0 ? 0 : ((ordersPage - 1) * ORDERS_PER_PAGE) + 1}–{Math.min(ordersPage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
                    </span>
                    <div className="pagination-right">
                      <div className="pagination-size-wrap">
                        <label className="pagination-size-label">Show:</label>
                        <select
                          className="pagination-size-select"
                          value={ordersPageSizeKey}
                          onChange={(e) => { setOrdersPageSizeKey(e.target.value); setOrdersPage(1); }}
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                      <div className="pagination-controls">
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(1)}
                          disabled={ordersPage === 1}
                          title="First page"
                        >«</button>
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                          disabled={ordersPage === 1}
                          title="Previous page"
                        >‹</button>
                        {Array.from({ length: ordersTotalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === ordersTotalPages || Math.abs(p - ordersPage) <= 1)
                          .reduce((acc, p, idx, arr) => {
                            if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            item === '...' ? (
                              <span key={`ellipsis-c-${idx}`} className="pagination-ellipsis">…</span>
                            ) : (
                              <button
                                key={item}
                                className={`pagination-btn pagination-num ${item === ordersPage ? 'active' : ''}`}
                                onClick={() => setOrdersPage(item)}
                              >{item}</button>
                            )
                          )}
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))}
                          disabled={ordersPage === ordersTotalPages}
                          title="Next page"
                        >›</button>
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(ordersTotalPages)}
                          disabled={ordersPage === ordersTotalPages}
                          title="Last page"
                        >»</button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`pos-orders-table-card ${editingOrderRecord ? 'has-active-edit' : ''}`}>
                  <div className="pos-orders-table-scroll" ref={tableScrollRef}>
                    <table className="pos-orders-table">
                    <thead>
                      <tr>
                        {ORDER_COLUMNS.filter((col) => selectedColumns.includes(col.id)).map((col) => (
                          <th
                            key={col.id}
                            scope="col"
                            className={`col-${col.id}`}
                            style={col.id === 'actions' ? { textAlign: 'right', paddingRight: '20px' } : {}}
                          >
                            {col.id === 'order_id' ? t('th_order_id', col.label) :
                             col.id === 'customer' ? t('th_customer', col.label) :
                             col.id === 'address' ? t('address_label', col.label) :
                             col.id === 'services' ? t('th_services', col.label) :
                             col.id === 'status' ? t('th_status', col.label) :
                             col.id === 'payment' ? t('th_payment', col.label) :
                             col.id === 'order_details' ? t('th_order_details', col.label) :
                             col.id === 'pickup_delivery' ? t('th_pickup_delivery', col.label) :
                             col.id === 'actions' ? t('th_actions', col.label) :
                             col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((ord) => {
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
                            {isColVisible('order_id') && (
                              <td className="col-order_id" style={{ borderLeft: isEditingThisOrder ? '4px solid #2563eb' : `4px solid ${accentColor}`, paddingLeft: '14px', verticalAlign: 'top', paddingTop: '14px' }}>
                                <div className="pos-ticket-cell" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span
                                    className="pos-ticket-num"
                                    onClick={() => setViewOrderTarget(ord)}
                                    title={`Quick View Order ${orderNum}`}
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
                            )}

                            {/* 2. Customer (Avatar Circle, Name & Number) */}
                            {isColVisible('customer') && (
                              <td className="col-customer" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
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
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, whiteSpace: 'nowrap' }}>
                                    <div
                                      className="pos-cust-name"
                                      style={{ fontWeight: 750, color: 'inherit', fontSize: '13.5px', whiteSpace: 'nowrap', lineHeight: 1.3 }}
                                      title={custName}
                                    >
                                      {custName}
                                    </div>
                                    <div
                                      className="pos-cust-phone"
                                      style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', lineHeight: 1.3 }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                      </svg>
                                      <span dir="ltr" style={{ unicodeBidi: 'isolate', whiteSpace: 'nowrap' }}>{phone}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 3. Address (Red Map Pin & Text) */}
                            {isColVisible('address') && (
                              <td className="col-address" style={{ maxWidth: '210px', verticalAlign: 'top', paddingTop: '14px' }}>
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
                            )}

                            {/* 4. Services Allocated (Neat badges or Assign Pickup button for On-Call) */}
                            {isColVisible('services') && (
                              <td className="col-services" style={{ verticalAlign: 'top', paddingTop: '14px', maxWidth: '175px' }}>
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
                                    <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', display: 'inline-block', paddingTop: '4px' }}>
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
                                    {servicesAllocated.length > 3 && (() => {
                                      const orderKey = ord.id ? String(ord.id) : (ord.order_number || String(idx));
                                      const isServicesPopoverOpen = activeServicesPopover?.orderKey === orderKey;
                                      const resolvedTotalPieces = Math.max(
                                        itemCount,
                                        servicesAllocated.reduce((sum, s) => sum + (Number(s.count || s.qty || 1)), 0)
                                      );
                                      return (
                                        <button
                                          type="button"
                                          className={`pos-services-more-btn ${isServicesPopoverOpen ? 'active' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleServicesPopover(e, ord, servicesAllocated, resolvedTotalPieces, orderKey);
                                          }}
                                          aria-expanded={isServicesPopoverOpen}
                                          title={isServicesPopoverOpen ? 'Show less services' : `Show ${servicesAllocated.length - 3} more services`}
                                        >
                                          <span>{isServicesPopoverOpen ? 'Show less' : `+${servicesAllocated.length - 3} more`}</span>
                                          <span className="pos-more-btn-arrow">{isServicesPopoverOpen ? '▴' : '▾'}</span>
                                        </button>
                                      );
                                    })()}
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
                            )}

                            {/* 5. Status (Icon badge & processing subtext) */}
                            {isColVisible('status') && (
                              <td className="col-status" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
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
                                    border: `1px solid ${statusBorder}`,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    <span style={{ fontSize: '13px', lineHeight: 1 }}>
                                      {workStatus === 'In Progress' ? '⏱' : workStatus === 'Cancelled' ? '✕' : workStatus === 'Ready' ? '✓' : workStatus === 'Delivered' ? '✓' : '📥'}
                                    </span>
                                    <span>
                                      {workStatus === 'In Progress' ? t('status_progress') :
                                       workStatus === 'Ready' ? t('status_ready') :
                                       workStatus === 'Delivered' ? t('status_delivered') :
                                       workStatus === 'Cancelled' ? t('status_cancelled') :
                                       t('status_received')}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 6. Payment (Total Bill, Payment Status Pill, and Mode) */}
                            {isColVisible('payment') && (
                              <td className="col-payment" style={{ verticalAlign: 'top', paddingTop: '14px', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  const rawTotal = Number(ord.total_amount || ord.grand_total || ord.bill_amount || ord.amount || 0);
                                  const rawAdvance = Number(ord.advance_paid || ord.payment?.advance || 0);
                                  const rawBalance = Number(ord.balance_due ?? (rawTotal - rawAdvance));
                                  const payStatus = String(
                                    ord.payment_status ||
                                    ord.payment?.status ||
                                    (rawTotal > 0 && rawBalance <= 0 ? 'Paid' : rawAdvance > 0 ? 'Partially Paid' : 'Unpaid')
                                  );
                                  const payMode = ord.payment_method || ord.payment?.mode || 'Cash';

                                  const isPaid = payStatus.toLowerCase().includes('paid') && !payStatus.toLowerCase().includes('partial') && !payStatus.toLowerCase().includes('unpaid');
                                  const isPartial = payStatus.toLowerCase().includes('partial');

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                                        {currencySymbol}{rawTotal.toFixed(2)}
                                      </div>
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: isPaid ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
                                        color: isPaid ? '#15803d' : isPartial ? '#b45309' : '#b91c1c',
                                        border: `1px solid ${isPaid ? '#bbf7d0' : isPartial ? '#fde68a' : '#fecaca'}`
                                      }}>
                                        <span>●</span>
                                        <span>{isPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid'}</span>
                                      </div>
                                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                        via {payMode}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 7. Order Details (Order timestamp and audit log) */}
                            {isColVisible('order_details') && (
                              <td className="col-order_details" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 650, color: '#0f172a' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span>{capturedDateStr}</span>
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#64748b', paddingLeft: '18px', fontWeight: 500 }}>
                                    {capturedTimeStr}
                                  </span>
                                  <div
                                    style={{
                                      marginTop: '2px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      background: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '10.5px',
                                      fontWeight: 650,
                                      color: '#475569',
                                      width: 'fit-content'
                                    }}
                                    title={`Audit Log Trail: Order intake recorded on ${capturedDateStr}. Current status: ${workStatus}`}
                                  >
                                    <span style={{ color: '#16a34a', fontSize: '8px' }}>●</span>
                                    <span>Audit: {workStatus === 'Received' ? 'Intake Logged' : `${workStatus} Logged`}</span>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 8. Pickup & Delivery (Compact Action Buttons & Assigned status) */}
                            {isColVisible('pickup_delivery') && (
                              <td className="col-pickup_delivery" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '120px' }}>
                                  {isPickupAssigned ? (
                                    <>
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1px',
                                        padding: '4px 8px',
                                        background: '#f0fdf4',
                                        border: '1px solid #86efac',
                                        borderRadius: '6px',
                                        boxShadow: '0 1px 2px rgba(34,197,94,0.06)'
                                      }}>
                                        <span style={{ fontSize: '9px', color: '#166534', fontWeight: 750, letterSpacing: '0.2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                          <span>🚚</span> Assigned for Pickup
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#14532d', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                          gap: '4px',
                                          padding: '3px 8px',
                                          height: '25px',
                                          borderRadius: '6px',
                                          border: '1px solid #94a3b8',
                                          background: '#ffffff',
                                          color: '#475569',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                          <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        <span>{t('btn_change_driver', 'Change Driver')}</span>
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
                                          gap: '4px',
                                          padding: '3px 8px',
                                          height: '25px',
                                          borderRadius: '6px',
                                          border: '1px solid #60a5fa',
                                          background: '#ffffff',
                                          color: '#2563eb',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                          <line x1="16" y1="2" x2="16" y2="6" />
                                          <line x1="8" y1="2" x2="8" y2="6" />
                                          <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>{t('btn_schedule', 'Schedule')}</span>
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
                                          gap: '4px',
                                          padding: '3px 8px',
                                          height: '25px',
                                          borderRadius: '6px',
                                          border: '1px solid #60a5fa',
                                          background: '#ffffff',
                                          color: '#2563eb',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                          <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        <span>{t('btn_assign_driver', 'Assign Driver')}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* 9. Actions (2x2 Grid: 1. Bill, 2. WhatsApp / 1. Normal Edit, 2. Side Edit) */}
                            {isColVisible('actions') && (
                              <td className="col-actions" style={{ textAlign: 'right', paddingRight: '14px', verticalAlign: 'top', paddingTop: '14px' }}>
                                <div className="pos-icon-action-group">
                                  {/* Row 1, Col 1: Bill */}
                                  <button
                                    type="button"
                                    className="pos-icon-action-btn pos-btn-bill btn-bill"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReceiptOrderTarget(ord);
                                    }}
                                    title={`1. Bill / Invoice (${orderNum})`}
                                    aria-label="Bill"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                      <polyline points="14 2 14 8 20 8"></polyline>
                                      <line x1="16" y1="13" x2="8" y2="13"></line>
                                      <line x1="16" y1="17" x2="8" y2="17"></line>
                                    </svg>
                                  </button>

                                  {/* Row 1, Col 2: WhatsApp */}
                                  <button
                                    type="button"
                                    className="pos-icon-action-btn pos-btn-whatsapp btn-whatsapp"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenWhatsApp(ord);
                                    }}
                                    title={`2. Chat on WhatsApp (${custName})`}
                                    aria-label="WhatsApp"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                    </svg>
                                  </button>

                                  {/* Row 2, Col 1: Normal Edit */}
                                  <button
                                    type="button"
                                    className={`pos-icon-action-btn pos-btn-edit btn-edit-order ${isEditingThisOrder ? 'active-edit-btn' : ''}`}
                                    aria-expanded={isEditingThisOrder}
                                    aria-controls={`order-edit-accordion-${ord.id || ord.order_number}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(ord);
                                    }}
                                    title={isEditingThisOrder ? `Close Normal Edit (${orderNum})` : `1. Normal Edit (${orderNum})`}
                                    aria-label="Normal Edit"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>

                                  {/* Row 2, Col 2: Side Edit */}
                                  <button
                                    type="button"
                                    className="pos-icon-action-btn pos-btn-side btn-side-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSideEditTargetOrder(ord);
                                    }}
                                    title={`2. Open Side Edit Panel (${orderNum})`}
                                    aria-label="Side Edit"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                      <line x1="9" y1="3" x2="9" y2="21"></line>
                                      <path d="M14 9l3 3-3 3"></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* 10. Driver */}
                            {isColVisible('driver') && (
                              <td className="col-driver" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                {(() => {
                                  const driverName = ord.assigned_driver || ord.assigned_driver_full || ord.assigned_staff || (isOnCall ? 'Karthik S. (Fleet #2)' : 'Ramesh (Store Driver)');
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '13px' }}>🚚</span>
                                      <span style={{ fontSize: '12.5px', fontWeight: 650, color: '#0f172a' }}>
                                        {driverName}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 11. Comments */}
                            {isColVisible('comments') && (
                              <td className="col-comments" style={{ verticalAlign: 'top', paddingTop: '14px', maxWidth: '240px' }}>
                                {(() => {
                                  const commentText = ord.internal_notes || ord.comments || ord.notes || ord.special_instructions || ord.preference_notes || (isOnCall ? 'Gate delivery; call before arrival' : 'Handle with care - steam press');
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                                      <span style={{ fontSize: '12px', marginTop: '1px' }}>💬</span>
                                      <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={commentText}>
                                        {commentText}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 12. PIN Code */}
                            {isColVisible('pincode') && (
                              <td className="col-pincode" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                {(() => {
                                  const pin = ord.pincode || ord.pin_code || ord.customer?.pincode || '632401';
                                  return (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#334155'
                                    }}>
                                      📍 {pin}
                                    </span>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 13. Email */}
                            {isColVisible('email') && (
                              <td className="col-email" style={{ verticalAlign: 'top', paddingTop: '14px', maxWidth: '180px' }}>
                                {(() => {
                                  const emailAddr = ord.email || ord.customer?.email || `${(custName || 'customer').toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@washdoor.in`;
                                  return (
                                    <a
                                      href={`mailto:${emailAddr}`}
                                      style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      title={emailAddr}
                                    >
                                      <span>✉️</span>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emailAddr}</span>
                                    </a>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 14. Business Name */}
                            {isColVisible('business_name') && (
                              <td className="col-business_name" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                {(() => {
                                  const bName = ord.business_name || ord.company_name || ord.customer?.business_name || (custName ? `${custName} Co.` : 'Washdoor Retail');
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <span style={{ fontSize: '12px' }}>🏢</span>
                                      <span style={{ fontSize: '12.5px', fontWeight: 650, color: '#0f172a' }}>
                                        {bName}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 15. Communication Preference */}
                            {isColVisible('communication_pref') && (
                              <td className="col-communication_pref" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                {(() => {
                                  const pref = ord.communication_pref || ord.communicationPreference || ord.communication_preference || 'WhatsApp';
                                  const isWA = pref.toLowerCase().includes('what');
                                  const isSMS = pref.toLowerCase().includes('sms');
                                  return (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: isWA ? '#f0fdf4' : isSMS ? '#fef3c7' : '#eff6ff',
                                      color: isWA ? '#15803d' : isSMS ? '#b45309' : '#1d4ed8',
                                      border: `1px solid ${isWA ? '#bbf7d0' : isSMS ? '#fde68a' : '#bfdbfe'}`
                                    }}>
                                      <span>{isWA ? '💬' : isSMS ? '📱' : '✉️'}</span>
                                      <span>{pref}</span>
                                    </span>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 16. Date of Birth */}
                            {isColVisible('dob') && (
                              <td className="col-dob" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                {(() => {
                                  const dobVal = ord.dob || ord.date_of_birth || ord.customer?.dob || '12 Oct 1994';
                                  return (
                                    <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span>🎂</span>
                                      <span>{dobVal}</span>
                                    </span>
                                  );
                                })()}
                              </td>
                            )}

                            {/* 17. Tax Exemption */}
                            {isColVisible('tax_exemption') && (
                              <td className="col-tax_exemption" style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                {(() => {
                                  const isExempt = Boolean(ord.tax_exemption ?? ord.taxExempt ?? ord.customer?.tax_exemption);
                                  return (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: isExempt ? '#dcfce7' : '#f1f5f9',
                                      color: isExempt ? '#15803d' : '#475569',
                                      border: `1px solid ${isExempt ? '#bbf7d0' : '#e2e8f0'}`
                                    }}>
                                      <span>{isExempt ? '✓ Exempt' : 'Standard 5%'}</span>
                                    </span>
                                  );
                                })()}
                              </td>
                            )}
                          </tr>

                          {/* ── Inline Edit Dropdown Accordion Row ── */}
                          {isEditingThisOrder && editFormData && (
                            <tr key={`${orderNum}_edit_dropdown_card`} className="pos-edit-dropdown-row">
                              <td
                                colSpan={ORDER_COLUMNS.filter((col) => selectedColumns.includes(col.id)).length}
                                className="pos-inline-edit-wrap"
                              >
                                <div className="pos-inline-edit-sticky">
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
                                      <span className="pos-edit-status-pill" style={{ background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }}>
                                        🧺 {editCartTotalPieces} Pieces
                                      </span>
                                      <span className="pos-edit-status-pill" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                                        ₹{editCartGrandTotal.toFixed(2)}
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
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '0 12px', fontSize: '12px' }}
                                    >
                                      <span>▲</span>
                                      <span>Close Form</span>
                                    </button>
                                  </div>

                                  <form onSubmit={handleSaveOrderEdit}>
                                    {/* ══════════════════════════════════════════════════════════════════
                                        SECTION 1: TWO COLUMN TOP GRID
                                        Col 1 (Left): Customer & Order Information (Balanced 2-Column Inputs)
                                        Col 2 (Right): Services Allocated & Garment Selection (Catalog + Cart)
                                       ══════════════════════════════════════════════════════════════════ */}
                                    <div className="pos-inline-edit-top-grid">
                                      {/* Left Column: Customer & Order Information */}
                                      <div className="pos-edit-section-card">
                                        <div className="pos-edit-section-title">
                                          <span style={{ color: '#2563eb' }}>◆</span>
                                          <span>Customer &amp; Order Information</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', flex: 1, alignContent: 'start' }}>
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

                                          {/* Address (Spans 2 columns) */}
                                          <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="pos-edit-label">
                                              Delivery Address <span className="required">*</span>
                                            </label>
                                            <input
                                              type="text"
                                              className="pos-edit-field"
                                              value={editFormData.address || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                              required
                                            />
                                          </div>

                                          {/* Status */}
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

                                          {/* Order Type */}
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

                                          {/* Expected Delivery (Spans 2 columns) */}
                                          <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="pos-edit-label">
                                              Expected Delivery Date &amp; Time <span className="required">*</span>
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

                                          {/* Comments Textarea (Spans 2 columns) */}
                                          <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="pos-edit-label">
                                              Comments / Special Instructions
                                            </label>
                                            <textarea
                                              rows={2}
                                              className="pos-edit-textarea"
                                              value={editFormData.comments || ''}
                                              onChange={(e) => setEditFormData({ ...editFormData, comments: e.target.value })}
                                              placeholder="Customer special notes, delicate fabric instructions, or delivery directions..."
                                            />
                                          </div>

                                          {/* Live Status Quick Action & Pills (Spans 2 columns) */}
                                          <div className="pos-edit-sub-panel" style={{ gridColumn: '1 / -1', marginTop: '2px', gap: '8px' }}>
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
                                                <span>{t('pos_cloth_selection', 'Cloth Selection & Catalog')}</span>
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

                                            {/* 2-Column Spacious Garment Cards Grid */}
                                            <div
                                              id="pos-edit-cloth-grid"
                                              className="pos-cloth-catalog-scroller"
                                              style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                gap: '10px',
                                                flex: 1,
                                                minHeight: '260px',
                                                maxHeight: '340px',
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                                paddingRight: '4px',
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
                                                    <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                                      <ClothIllustration itemId={item.id} size={36} />
                                                    </div>
                                                    <div className="pos-edit-garment-name" title={item.name}>
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
                                                <span>{t('pos_selected_item_details', 'Selected Item Details')}</span>
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
                                                <label className="pos-edit-label">{t('pos_service_type', 'Service Type')}</label>
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
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '8px' }}>
                                                <div>
                                                  <label className="pos-edit-label">{t('pos_quantity', 'Quantity')}</label>
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
                                                  <label className="pos-edit-label">{t('pos_rate_per_piece', 'Rate per piece')} (₹)</label>
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
                                                <span>{t('btn_add_to_cart', 'Add to Cart')}</span>
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
                                        SECTION 2: DYNAMIC GARMENT-BY-GARMENT INSPECTION & CARE
                                       ══════════════════════════════════════════════════════════════════ */}
                                    <div style={{ marginBottom: '16px' }}>
                                      <GarmentInspectionSection
                                        cart={editCart}
                                        inspections={editInspections}
                                        onChangeInspections={setEditInspections}
                                        showToast={showToast}
                                      />
                                    </div>

                                    {/* ══════════════════════════════════════════════════════════════════
                                        SECTION 3: 6 TABS & TAB CONTENT
                                        1. Order Information, 2. Laundry Processing, 3. Order Status,
                                        4. Payments & Billing, 5. Customer Messages, 6. Notes & History
                                       ══════════════════════════════════════════════════════════════════ */}
                                    {(() => {
                                      const orderEditTabs = [
                                        { id: 'details', step: 1, icon: '📋', title: t('tab_order_info', '1. Order Information'), desc: t('tab_order_info_sub', 'Intake & Metadata') },
                                        { id: 'logistics', step: 2, icon: '🏭', title: t('tab_processing', '2. Laundry Processing'), desc: t('tab_processing_sub', 'Factory & Tracking') },
                                        { id: 'status', step: 3, icon: '🔄', title: t('tab_status_pipeline', '3. Order Status'), desc: t('tab_status_pipeline_sub', 'Progress & Milestones') },
                                        { id: 'payments', step: 4, icon: '💳', title: t('tab_payments_billing', '4. Payments & Billing'), desc: t('tab_payments_billing_sub', 'GST, Totals & Balance') },
                                        { id: 'messages', step: 5, icon: '💬', title: t('tab_customer_alerts', '5. Customer Messages'), desc: t('tab_customer_alerts_sub', 'WhatsApp & SMS Alerts') },
                                        { id: 'audit', step: 6, icon: '📜', title: t('tab_notes_history', '6. Notes & History'), desc: t('tab_notes_history_sub', 'Staff Notes & Audit Log') }
                                      ];
                                      const currentEditTabIndex = orderEditTabs.findIndex((tb) => tb.id === editActiveTab);

                                      return (
                                        <div className="pos-edit-section-card" style={{ marginBottom: '18px' }}>
                                          {/* Professional Stepper Tabs Navigation Bar */}
                                          <div className="pos-edit-stepper-bar">
                                            {orderEditTabs.map((tab, idx) => {
                                              const isActive = editActiveTab === tab.id;
                                              const isCompleted = currentEditTabIndex > idx;
                                              return (
                                                <button
                                                  key={tab.id}
                                                  type="button"
                                                  onClick={() => setEditActiveTab(tab.id)}
                                                  className={`pos-edit-stepper-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                                >
                                                  <div className="pos-edit-tab-step-circle">
                                                    {isCompleted ? '✓' : tab.step}
                                                  </div>
                                                  <div className="pos-edit-tab-info">
                                                    <div className="pos-edit-tab-header-row">
                                                      <span style={{ fontSize: '12px' }}>{tab.icon}</span>
                                                      <span className="pos-edit-tab-title">{tab.title}</span>
                                                    </div>
                                                    <span className="pos-edit-tab-desc">{tab.desc}</span>
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>

                                          {/* Tab 1 Content: Order Information */}
                                          {editActiveTab === 'details' && (
                                            <div>
                                              {/* Subcard A: Order Summary */}
                                              <div className="pos-edit-subcard">
                                                <div className="pos-edit-subcard-title">
                                                  <span>📋</span>
                                                  <span>Order Summary &amp; Intake Metadata</span>
                                                </div>
                                                <div className="pos-edit-grid-3" style={{ marginBottom: '14px' }}>
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

                                                <div className="pos-edit-grid-3">
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

                                              {/* Subcard B: Customer Information Snapshot */}
                                              <div className="pos-edit-subcard" style={{ marginBottom: 0 }}>
                                                <div className="pos-edit-subcard-title">
                                                  <span>👤</span>
                                                  <span>Customer Information Snapshot</span>
                                                </div>
                                                <div className="pos-edit-grid-3">
                                                  <div>
                                                    <label className="pos-edit-label">Customer Name</label>
                                                    <div className="pos-edit-field" style={{ fontWeight: 650 }}>
                                                      {editFormData.customer_name || 'Counter Customer'}
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <label className="pos-edit-label">Mobile Number</label>
                                                    <div className="pos-edit-field" style={{ fontWeight: 650 }}>
                                                      <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>+91 {editFormData.mobile_number || '9876543210'}</span>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <label className="pos-edit-label">Delivery Address</label>
                                                    <div className="pos-edit-field" style={{ fontWeight: 650 }}>
                                                      {editFormData.address || 'Counter Walk-In'}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Tab 2: Laundry Processing & Factory */}
                                          {editActiveTab === 'logistics' && (
                                            <div>
                                              {/* Subcard A: Factory Assignment */}
                                              <div className="pos-edit-subcard">
                                                <div className="pos-edit-subcard-title">
                                                  <span>🏭</span>
                                                  <span>Factory Assignment &amp; Routing</span>
                                                </div>
                                                <div className="pos-edit-logistics-grid">
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
                                              </div>

                                              {/* Subcard B: Washing Progress Stepper */}
                                              <div className="pos-edit-subcard">
                                                <div className="pos-edit-subcard-title">
                                                  <span>🧺</span>
                                                  <span>Washing Progress &amp; Factory Stage Tracker</span>
                                                </div>

                                                <div className="pos-laundry-stepper">
                                                  {[
                                                    { label: 'Received at Factory', status: 'completed' },
                                                    { label: 'Washing & Sorting', status: 'active' },
                                                    { label: 'Drying', status: 'pending' },
                                                    { label: 'Ironing & Finishing', status: 'pending' },
                                                    { label: 'Quality Check', status: 'pending' },
                                                    { label: 'Ready for Dispatch', status: 'pending' }
                                                  ].map((step, sIdx) => (
                                                    <div
                                                      key={step.label}
                                                      className={`pos-laundry-step-node ${step.status}`}
                                                    >
                                                      <span>{step.status === 'completed' ? '✓' : sIdx + 1}</span>
                                                      <span>{step.label}</span>
                                                    </div>
                                                  ))}
                                                </div>

                                                <div className="pos-edit-grid-2" style={{ marginTop: '12px' }}>
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

                                              {/* Subcard C: Factory Notes & Special Handling */}
                                              <div className="pos-edit-subcard" style={{ marginBottom: 0 }}>
                                                <div className="pos-edit-subcard-title">
                                                  <span>🏷️</span>
                                                  <span>Factory Handling Remarks</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                  <span className="pos-note-tag-chip" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>🌱 Eco-Friendly Wash</span>
                                                  <span className="pos-note-tag-chip" style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#d97706' }}>⚠️ Color Bleed Alert</span>
                                                  <span className="pos-note-tag-chip" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>👔 Heavy Starch on Collars</span>
                                                  <span className="pos-note-tag-chip" style={{ background: '#fdf2f8', borderColor: '#fbcfe8', color: '#db2777' }}>✨ Silk Delicate Care</span>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Tab 3: Order Status Updates */}
                                          {editActiveTab === 'status' && (
                                            <div>
                                              {/* Subcard A: Current Status & Progression Timeline */}
                                              <div className="pos-edit-subcard">
                                                <div className="pos-edit-subcard-title">
                                                  <span>🔄</span>
                                                  <span>Order Lifecycle &amp; Milestone Timeline</span>
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
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    Update Status:
                                                  </label>
                                                  <select
                                                    className="pos-edit-field"
                                                    style={{ minWidth: '190px', width: 'auto' }}
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
                                            </div>
                                          )}

                                          {/* Tab 4: Payments & Billing */}
                                          {editActiveTab === 'payments' && (
                                            <div>
                                              {/* 4 Summary Cards */}
                                              <div
                                                style={{
                                                  display: 'grid',
                                                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
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

                                              {/* Subcard A: Payment Configuration */}
                                              <div className="pos-edit-subcard" style={{ marginBottom: 0 }}>
                                                <div className="pos-edit-subcard-title">
                                                  <span>💳</span>
                                                  <span>Payment &amp; Gateway Configuration</span>
                                                </div>
                                                <div className="pos-edit-grid-3" style={{ marginBottom: '14px' }}>
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

                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditFormData({
                                                        ...editFormData,
                                                        advance_paid: editCartGrandTotal,
                                                        payment_status: 'Paid'
                                                      });
                                                      showToast?.('✅ Marked order as fully paid!');
                                                    }}
                                                    className="pos-edit-save-btn"
                                                    style={{ height: '34px', fontSize: '12px', background: '#16a34a', borderColor: '#16a34a' }}
                                                  >
                                                    ✓ Mark as Fully Paid
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Tab 5: Customer Messages */}
                                          {editActiveTab === 'messages' && (
                                            <div>
                                              {/* Subcard A: Customer Contact Snapshot */}
                                              <div className="pos-edit-subcard">
                                                <div className="pos-edit-subcard-title">
                                                  <span>💬</span>
                                                  <span>Customer Notification Hub</span>
                                                </div>

                                                <div className="pos-edit-sub-panel" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px 14px' }}>
                                                  <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                      {editFormData.customer_name || 'Customer'}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                      📱 <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>+91 {editFormData.mobile_number || '9876543210'}</span> • {editFormData.address || 'MG Road, Vellore'}
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
                                                  {t('msg_order_status_template', 'Hello {name}, your laundry order #{orderNumber} with Washdoor is now {status} ({pieces} pieces). Total Bill: ₹{total}. Expected delivery: {delivery}.')
                                                    .replace('{name}', editFormData.customer_name || 'Customer')
                                                    .replace('{orderNumber}', editFormData.order_number || '')
                                                    .replace('{status}', normalizeOrderStatus(editFormData.status || editFormData.order_status))
                                                    .replace('{pieces}', editCartTotalPieces)
                                                    .replace('{total}', editCartGrandTotal.toFixed(2))
                                                    .replace('{delivery}', editFormData.expected_delivery || '30 Oct 2026, 05:00 PM')}
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
                                            </div>
                                          )}

                                          {/* Tab 6: Notes & History */}
                                          {editActiveTab === 'audit' && (
                                            <div>
                                              {/* Subcard A: Operator Notes & Quick Chips */}
                                              <div className="pos-edit-subcard">
                                                <div className="pos-edit-subcard-title">
                                                  <span>📝</span>
                                                  <span>Internal Store Instructions &amp; Operator Remarks</span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                  {[
                                                    { label: '📌 Fabric Care', text: '[Fabric Care: Use Gentle Cycle] ' },
                                                    { label: '⚠️ Stain Alert', text: '[Stain Alert: Collar stain requires pre-treatment] ' },
                                                    { label: '🚚 Delivery Direction', text: '[Delivery: Call customer before arrival] ' },
                                                    { label: '⭐ VIP Customer', text: '[VIP Customer: Priority Express Handling] ' }
                                                  ].map((chip) => (
                                                    <button
                                                      key={chip.label}
                                                      type="button"
                                                      className="pos-note-tag-chip"
                                                      onClick={() => {
                                                        const current = editFormData.comments || '';
                                                        setEditFormData({
                                                          ...editFormData,
                                                          comments: current ? `${current} ${chip.text}` : chip.text
                                                        });
                                                      }}
                                                    >
                                                      {chip.label}
                                                    </button>
                                                  ))}
                                                </div>

                                                <textarea
                                                  rows={3}
                                                  className="pos-edit-textarea"
                                                  value={editFormData.comments || ''}
                                                  onChange={(e) => setEditFormData({ ...editFormData, comments: e.target.value })}
                                                  placeholder="Internal notes for laundry wash technician or rider..."
                                                />
                                              </div>

                                              {/* Subcard B: System Audit Trail Timeline */}
                                              <div className="pos-edit-subcard" style={{ marginBottom: 0 }}>
                                                <div className="pos-edit-subcard-title">
                                                  <span>📜</span>
                                                  <span>Immutable System Audit Trail</span>
                                                </div>
                                                <div className="pos-edit-sub-panel" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
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
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

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
                                        FOOTER ACTION BUTTONS (Tab Stepper Navigation + Save)
                                       ══════════════════════════════════════════════════════════════════ */}
                                    {(() => {
                                      const tabSequence = ['details', 'logistics', 'status', 'payments', 'messages', 'audit'];
                                      const currentTabIdx = tabSequence.indexOf(editActiveTab);

                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                              type="button"
                                              className="pos-nav-prev-btn"
                                              disabled={currentTabIdx <= 0}
                                              onClick={() => {
                                                if (currentTabIdx > 0) {
                                                  setEditActiveTab(tabSequence[currentTabIdx - 1]);
                                                }
                                              }}
                                            >
                                              ← Previous Tab
                                            </button>
                                            <button
                                              type="button"
                                              className="pos-nav-next-btn"
                                              disabled={currentTabIdx >= tabSequence.length - 1}
                                              onClick={() => {
                                                if (currentTabIdx < tabSequence.length - 1) {
                                                  setEditActiveTab(tabSequence[currentTabIdx + 1]);
                                                }
                                              }}
                                            >
                                              Next Tab →
                                            </button>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                        </div>
                                      );
                                    })()}
                                  </form>
                                </div>
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
                {/* ── Orders Table Footer Pagination Bar ── */}
                <div className="pagination-bar pos-table-pagination-footer">
                    <span className="pagination-info">
                      Showing {filteredOrders.length === 0 ? 0 : ((ordersPage - 1) * ORDERS_PER_PAGE) + 1}–{Math.min(ordersPage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
                    </span>
                    <div className="pagination-right">
                      <div className="pagination-size-wrap">
                        <label className="pagination-size-label">Show:</label>
                        <select
                          className="pagination-size-select"
                          value={ordersPageSizeKey}
                          onChange={(e) => { setOrdersPageSizeKey(e.target.value); setOrdersPage(1); }}
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                      <div className="pagination-controls">
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(1)}
                          disabled={ordersPage === 1}
                          title="First page"
                        >«</button>
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                          disabled={ordersPage === 1}
                          title="Previous page"
                        >‹</button>
                        {Array.from({ length: ordersTotalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === ordersTotalPages || Math.abs(p - ordersPage) <= 1)
                          .reduce((acc, p, idx, arr) => {
                            if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            item === '...' ? (
                              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                            ) : (
                              <button
                                key={item}
                                className={`pagination-btn pagination-num ${item === ordersPage ? 'active' : ''}`}
                                onClick={() => setOrdersPage(item)}
                              >{item}</button>
                            )
                          )}
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))}
                          disabled={ordersPage === ordersTotalPages}
                          title="Next page"
                        >›</button>
                        <button
                          className="pagination-btn"
                          onClick={() => setOrdersPage(ordersTotalPages)}
                          disabled={ordersPage === ordersTotalPages}
                          title="Last page"
                        >»</button>
                      </div>
                    </div>
                  </div>
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
                <div style={{ fontWeight: 650, color: 'var(--text-secondary, #475569)', fontSize: '14px' }}>Cart is Empty</div>
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
                    📞 <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{formatPhoneDisplay(selectedCustomer.mobile_number)}</span>
                  </div>
                  {selectedCustomer.address && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
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
                              <div className="pos-search-result-name">
                                {c.customer_name}
                              </div>
                              <div className="pos-search-result-phone">
                                {formatPhoneDisplay(c.mobile_number)}
                              </div>
                            </div>
                            <span className="pos-search-result-id">
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '12px', marginBottom: '8px' }}>
              <div className="pos-dialog-title" style={{ fontSize: '16px' }}>
                ⏸ Parked / Held Orders ({heldOrders.length})
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setIsHeldModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {heldOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted, #64748b)' }}>
                No held orders at the moment.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {heldOrders.map((item) => (
                  <div
                    key={item.id}
                    className="pos-held-card"
                  >
                    <div>
                      <div className="pos-held-order-title">
                        {item.selectedCustomer?.customer_name || item.walkinName || 'Walk-In Customer'}
                      </div>
                      <div className="pos-held-order-meta">
                        {item.totalItemsCount} items • Held at {item.heldAt}
                      </div>
                    </div>

                    <div className="pos-status-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong className="pos-held-order-amount">
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
      <ScheduleDeliveryModal
        isOpen={Boolean(scheduleOrderTarget)}
        order={scheduleOrderTarget}
        onClose={() => setScheduleOrderTarget(null)}
        onConfirmSchedule={({ scheduleType, scheduleDate, scheduleSlot }) => {
          showToast?.(`✅ ${scheduleType} scheduled for ${scheduleDate} (${scheduleSlot.split(' ')[0]})`);
        }}
      />

      {/* ── Assign Driver Modal ── */}
      <DriverAssignModal
        isOpen={Boolean(assignDriverTarget)}
        order={assignDriverTarget}
        onClose={() => setAssignDriverTarget(null)}
        onAssignDriver={handleAssignDriverSubmit}
      />

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

          // Bidirectional sync: If inline edit is open for this order, synchronize its state
          if (editingOrderRecord && (editingOrderRecord.id === updated.id || editingOrderRecord.order_number === updated.order_number)) {
            setEditingOrderRecord(updated);
            if (updated.items && Array.isArray(updated.items)) {
              setEditCart(updated.items);
            }
            if (updated.garment_inspections) {
              setEditInspections(updated.garment_inspections);
            }
          }

          // Direct Supabase update
          const saveKey = updated.order_number || updated.id || updated.work_number;
          if (saveKey) {
            updateOrderInSupabase(saveKey, {
              status: updated.status,
              orderStatus: updated.status,
              customerName: updated.customer_name,
              mobileNumber: updated.mobile_number,
              alternatePhone: updated.alternate_phone,
              email: updated.email,
              address: updated.address,
              serviceCategory: updated.service_category,
              orderType: updated.order_type,
              expectedDelivery: updated.expected_delivery,
              deliveryDate: updated.expected_delivery,
              priority: updated.priority || 'Normal',
              orderNotes: updated.comments,
              subtotal: updated.subtotal || updated.payment?.subtotal,
              discountAmount: updated.discount_amount || updated.payment?.discount,
              taxAmount: updated.tax_amount || updated.payment?.tax,
              totalAmount: updated.total_amount || updated.grand_total,
              advancePaid: updated.advance_paid,
              paymentStatus: updated.payment_status,
              paymentMethod: updated.payment_method || updated.payment?.mode || 'Cash',
              assignedStaff: updated.assigned_driver,
              items: updated.items,
              garment_inspections: updated.garment_inspections || updated.inspections,
            }).catch((e) => console.warn('Supabase SideEdit update note:', e));
          }
        }}
      />

      {/* ── Standalone Quick View Order Modal (without opening Edit) ── */}
      <ViewOrderModal
        isOpen={Boolean(viewOrderTarget)}
        order={viewOrderTarget}
        onClose={() => setViewOrderTarget(null)}
        onOpenEdit={(ordToEdit) => {
          setViewOrderTarget(null);
          handleOpenEditModal(ordToEdit);
        }}
        currencySymbol={currencySymbol}
        showToast={showToast}
      />

      {/* ── POS Thermal Receipt & Invoice Print Dialog ── */}
      <ThermalReceiptModal
        isOpen={Boolean(receiptOrderTarget)}
        order={receiptOrderTarget}
        onClose={() => setReceiptOrderTarget(null)}
      />

      {/* ── POS Services Breakdown Popover & Mobile Bottom Sheet Portal ── */}
      <ServicesPopoverPortal
        popoverData={activeServicesPopover}
        popoverRef={servicesPopoverRef}
        onClose={() => setActiveServicesPopover(null)}
      />
    </div>
  );
}
