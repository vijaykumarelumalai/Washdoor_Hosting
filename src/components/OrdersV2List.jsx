// src/components/OrdersV2List.jsx - Orders Table with Full Horizontal Stepper Tabs & Parity with Reference Design
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Collapse, Chip, Avatar, IconButton, Typography, Grid, Stack,
  Tooltip, TextField, MenuItem, Button, Divider, InputAdornment, Dialog,
  DialogTitle, DialogContent, DialogActions, Select, Alert, CircularProgress,
  Popover, ButtonBase, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  KeyboardArrowRight, KeyboardArrowLeft, KeyboardArrowDown, FirstPage, LastPage, EditOutlined, VisibilityOutlined,
  ReceiptLongOutlined, DeleteOutlined, Save, Close, Add, Remove, Search,
  PersonOutlined, PhoneOutlined, LocationOnOutlined, DirectionsWalkOutlined,
  CallOutlined, BadgeOutlined, LocalShippingOutlined, LayersOutlined,
  AssignmentOutlined, FactoryOutlined, CreditCardOutlined, CheckCircleOutlined,
  CheckCircle, Check, ArrowForward, ArrowBack, FlagOutlined,
  CalendarTodayOutlined, WhatsApp, ChatOutlined, SendOutlined,
  Inventory2Outlined, ShoppingBagOutlined, CheckroomOutlined,
  AccountBalanceWalletOutlined, PaymentOutlined, LocalOfferOutlined,
   HistoryOutlined, InfoOutlined, AttachFileOutlined, SentimentSatisfiedAltOutlined,
   DoneAllOutlined, StorefrontOutlined, EmailOutlined, FactCheckOutlined,
   DescriptionOutlined, NotificationsActiveOutlined, MonetizationOnOutlined,
   LocalLaundryServiceOutlined, DryCleaningOutlined, WaterDropOutlined, IronOutlined,
   CategoryOutlined, LabelOutlined, ShoppingCartOutlined, PrintOutlined,
   PhotoCameraOutlined, DownloadOutlined, QrCode2, QrCodeScanner,
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { normalizeOrder, sanitizeAddress } from '../utils/normalizeOrder';
import { formatServiceBreakdown } from '../config/businessRules';
import ClothIllustration from './ClothIllustration';
import ServiceTypeSelect from './ServiceTypeSelect';
import GarmentInspectionSection from './GarmentInspectionSection';
import UPIPaymentQRDialog from './UPIPaymentQRDialog';
import {
  createServiceType,
  updateServiceType,
  deleteServiceType,
} from '../services/serviceTypeService';
import {
  updateOrderInSupabase,
  fetchActiveStaffMaster,
  fetchActivePickupDeliveryMaster,
  getOrderById,
  getGarmentBarcodeDetails,
  fetchOrderGarmentBarcodes,
  DEFAULT_PRODUCTS,
} from '../services/customerService';
import {
  isOnCallOrderType,
  resolveOptionalDelivery,
  splitIsoToLocalDateAndTime,
  validateOnCallSchedule,
  formatDeliveryDateTimeForDisplay,
  formatDeliveryInputsForDisplay,
} from '../utils/onCallScheduling';
import {
  PROCESSING_PRIORITIES,
  FACTORY_PLANTS,
  PACKAGING_TYPES,
  ASSIGNED_MACHINES,
  PROCESSING_STAGES,
  withCurrentOption,
  getProcessingFieldValues,
  getProcessingTimeline,
  formatLogisticsDeliveryInfo,
  buildProcessingPayload,
} from '../utils/laundryProcessing';
import {
  BARCODE_RENDER_OPTIONS,
  getOrderIdFromBarcode,
  assignGarmentBarcodes,
  getGarmentBarcodeEntries,
  mergeGarmentBarcodePatch,
} from '../utils/garmentBarcodes';

const normalizePaymentStatusOption = (status, balance = 0, advance = 0, total = 0) => {
  const adv = Number(advance) || 0;
  const tot = Number(total) || 0;
  const bal = Number(balance) || 0;

  // If advance is 0 or less, it is strictly Unpaid
  if (adv <= 0) {
    return 'Unpaid / Pay on Delivery';
  }

  // If fully paid
  if ((tot > 0 && adv >= tot) || (bal <= 0 && adv > 0)) {
    return 'Paid in Full';
  }

  // If partial
  if (adv > 0) {
    return 'Partially Paid';
  }

  return 'Unpaid / Pay on Delivery';
};

const MONEY = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const toFiniteNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const INLINE_PROCESSING_INPUT_SX = {
  height: 40,
  borderRadius: '8px',
  bgcolor: '#ffffff',
  fontSize: '14px',
  '& .MuiOutlinedInput-notchedOutline': { borderRadius: '8px', borderColor: '#cbd5e1' },
  '& .MuiInputBase-input, & .MuiSelect-select': {
    py: 0,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
};

const INLINE_PROCESSING_MENU_PROPS = {
  PaperProps: {
    sx: {
      maxHeight: 320,
      '& .MuiMenuItem-root': { whiteSpace: 'normal', fontSize: '14px', lineHeight: 1.3, py: 1 },
    },
  },
};

const TIMELINE_STAGE_ICONS = [
  LocalLaundryServiceOutlined,
  WaterDropOutlined,
  IronOutlined,
  CheckroomOutlined,
  LocalShippingOutlined,
  CheckCircle,
];

const CODE_128_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]],
]);

const CompactProcessingField = ({ label, required, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
    <Typography variant="caption" fontWeight={700} color="#334155" sx={{ fontSize: '13px', minHeight: 18, lineHeight: '18px' }}>
      {label}{required ? ' *' : ''}
    </Typography>
    {children}
  </Box>
);

export const GarmentBarcodeSvg = ({ value, label, svgRef }) => {
  const localRef = useRef(null);
  const targetRef = svgRef || localRef;

  useEffect(() => {
    const element = targetRef.current;
    if (!element || !value) return;
    try {
      JsBarcode(element, value, BARCODE_RENDER_OPTIONS);
    } catch {}
  }, [targetRef, value]);

  return (
    <Box sx={{ bgcolor: '#ffffff', p: 1, borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
      <svg ref={targetRef} height={80} role="img" aria-label={`${label || value} Code 128 barcode`} />
    </Box>
  );
};

const normalizeScanCode = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');

const getOrderScanCodes = (order) => [
  order?.order_number,
  order?.work_number,
  order?.id,
  order?.bag_barcode,
  order?.dispatch_bag_tag,
  order?.barcode,
  order?.qr_code,
].filter(Boolean).map(normalizeScanCode);

const getGarmentScanEntries = (cart, inspectionsMap) => {
  const entries = [];
  Object.entries(inspectionsMap || {}).forEach(([key, detail]) => {
    const cartItem = (cart || []).find((item) => String(item.id) === String(detail?.cartItemId || detail?.productId || key));
    entries.push({
      key,
      detail,
      cartItem,
      codes: [detail?.tagNumber, detail?.barcode, detail?.garment_barcode, detail?.qr_code, detail?.garmentTag, key, detail?.id]
        .filter(Boolean)
        .map(normalizeScanCode),
    });
  });
  (cart || []).forEach((cartItem) => {
    if (entries.some((entry) => String(entry.cartItem?.id) === String(cartItem.id))) return;
    entries.push({
      key: `cart-${cartItem.id}`,
      detail: null,
      cartItem,
      codes: [cartItem.barcode, cartItem.tagNumber, cartItem.qr_code, cartItem.id]
        .filter(Boolean)
        .map(normalizeScanCode),
    });
  });
  return entries;
};

const getRawOrderItems = (raw) => {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.services_allocated)) return raw.services_allocated;
  if (Array.isArray(raw.services)) return raw.services;
  if (Array.isArray(raw.customer_history?.items)) return raw.customer_history.items;
  return [];
};

export const restoreOrderPricing = (normalized, raw) => {
  if (!normalized) return normalized;
  const source = raw && typeof raw === 'object' ? raw : {};
  const rawItems = getRawOrderItems(source);
  const normalizedItems = Array.isArray(normalized.items) ? normalized.items : [];
  const sourceItems = rawItems.length ? rawItems : normalizedItems;

  const items = normalizedItems.map((item, idx) => {
    const rawItem = sourceItems.find((candidate, candidateIdx) => {
      const sameId = candidate?.id && item?.id && String(candidate.id) === String(item.id);
      const candidateName = String(candidate?.name || candidate?.service || candidate?.serviceType || '').toLowerCase();
      const itemName = String(item?.name || '').toLowerCase();
      return sameId || (candidateName && candidateName === itemName && candidateIdx === idx);
    }) || sourceItems[idx] || item;

    const qty = toFiniteNumber(item.qty ?? rawItem.qty ?? rawItem.quantity, 1);
    const rate = toFiniteNumber(
      item.rate ?? item.price ?? item.unit_price ?? rawItem.rate ?? rawItem.price ?? rawItem.unit_price,
      0
    );

    return {
      ...item,
      ...rawItem,
      id: item.id || rawItem.id || `${item.name || 'item'}_${idx}`,
      itemId: item.itemId || rawItem.itemId || rawItem.product_id || rawItem.item_id || item.name,
      qty,
      rate,
      price: rate,
      serviceType: item.serviceType || rawItem.serviceType || rawItem.service || '',
    };
  });

  const rawTotal = toFiniteNumber(source.total_amount ?? source.totalAmount ?? normalized.total_amount, 0);
  const normalizedSubtotal = toFiniteNumber(normalized.subtotal, 0);
  const sourceSubtotal = toFiniteNumber(
    source.subtotal ?? source.subtotal_amount ?? source.subtotalAmount,
    0
  );
  const savedSubtotal = normalizedSubtotal > 0 ? normalizedSubtotal : (sourceSubtotal > 0 ? sourceSubtotal : (rawTotal ? rawTotal / 1.05 : 0));

  const rawHistory = Array.isArray(source.activity_history) && source.activity_history.length > 0
    ? source.activity_history
    : (Array.isArray(source.audit_logs) && source.audit_logs.length > 0
      ? source.audit_logs
      : (Array.isArray(source.logs) && source.logs.length > 0
        ? source.logs
        : (normalized.activity_history || [])));

  const rawPaymentHistory = Array.isArray(source.payment_history) && source.payment_history.length > 0
    ? source.payment_history
    : (Array.isArray(source.paymentHistory) && source.paymentHistory.length > 0
      ? source.paymentHistory
      : (Array.isArray(source.payments) && source.payments.length > 0
        ? source.payments
        : (normalized.payment_history || [])));

  return {
    ...source,
    ...normalized,
    items,
    subtotal: savedSubtotal,
    discount_amount: toFiniteNumber(
      source.discount_amount ?? source.discountAmount ?? normalized.discount_amount,
      0
    ),
    gst_percentage: toFiniteNumber(source.gst_percentage ?? source.gstPercentage, 5),
    activity_history: rawHistory,
    audit_logs: rawHistory,
    payment_history: rawPaymentHistory,
  };
};

const formatDateTime = (v) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
  } catch {
    return String(v);
  }
};

const formatDateOnly = (v) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(v);
  }
};

const normKey = (v) => String(v || '').trim().toLowerCase();

export const getServiceFilterKeys = (svc) => !svc
  ? []
  : [...new Set((svc.names || [svc.name]).map(normKey).filter(Boolean))];

export const getOrderServiceFilterValues = (raw) => {
  const vals = String(raw?.service_category || raw?.serviceCategory || '')
    .split(',')
    .map(normKey);
  vals.push(normKey(raw?.service_type || raw?.serviceType));
  [raw?.items, raw?.services_allocated, raw?.services].forEach((items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      vals.push(normKey(item?.serviceType || item?.service_type || item?.service || item?.category));
    });
  });
  return [...new Set(vals.filter(Boolean))];
};

export function normalizeOrdersV2Status(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return 'Order Received';

  if (value === 'other' || value.includes('cancel')) return 'Cancelled';
  if (value === 'ready for delvier' || value === 'ready for delivery' || value.includes('ready') || value.includes('billing')) return 'Ready';
  if (value === 'dfa' || value === 'dfa -card' || value.includes('dfa') || value.includes('deliver') || value.includes('complete')) return 'Delivered';
  if (value === 'order recived' || value.includes('receive') || value.includes('intake') || value === 'new' || value.includes('overdue')) return 'Order Received';
  if (
    value === 'landry in progress' ||
    value === 'laundry in progress' ||
    value.includes('progress') ||
    value.includes('wash') ||
    value.includes('iron') ||
    value.includes('process') ||
    value.includes('emer') ||
    value.includes('urgent') ||
    value === 'not cleared'
  ) return 'In Progress';

  return 'Order Received';
}

const STATUS_CONFIG = {
  'Order Received': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#2563eb' },
  'In Progress': { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
  'Ready': { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#16a34a' },
  'Delivered': { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', dot: '#059669' },
  'Cancelled': { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#dc2626' },
};

// 7 Horizontal Stepper Tabs as requested by user and matching reference screenshots
const HORIZONTAL_TABS = [
  { id: 'customer', label: 'Customer Details', icon: <PersonOutlined sx={{ fontSize: 16 }} /> },
  { id: 'order', label: 'Order Details', icon: <Inventory2Outlined sx={{ fontSize: 16 }} /> },
  { id: 'inspection', label: 'Garment Inspection', icon: <LayersOutlined sx={{ fontSize: 16 }} /> },
  { id: 'processing', label: 'Laundry Processing', icon: <FactoryOutlined sx={{ fontSize: 16 }} /> },
  { id: 'payment', label: 'Payments & Billing', icon: <CreditCardOutlined sx={{ fontSize: 16 }} /> },
  { id: 'messages', label: 'Customer Messages', icon: <ChatOutlined sx={{ fontSize: 16 }} /> },
  { id: 'review', label: 'Review & Messages', icon: <FactCheckOutlined sx={{ fontSize: 16 }} /> },
];

const CLOTH_CATEGORIES = ['All', 'Men', 'Women', 'Home Linen', 'Accessories'];

// Blue theme tokens used by the Orders v2 "Order Details" tab only.
const ORDER_BLUE = {
  main: '#2563eb',
  dark: '#1d4ed8',
  deeper: '#1e40af',
  soft: '#eff6ff',
  softer: '#dbeafe',
  border: '#bfdbfe',
  text: '#1e40af',
};

const ORDER_SCROLLBAR_SX = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#94a3b8 #f1f5f9',
  '&::-webkit-scrollbar': { width: 10, height: 10 },
  '&::-webkit-scrollbar-track': { bgcolor: '#f1f5f9', borderRadius: 5 },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#94a3b8', borderRadius: 5, border: '2px solid #f1f5f9' },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#64748b' },
};

const ORDERS_TABLE_SCROLLBAR_SX = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#cbd5e1 transparent',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 6, border: '1px solid #ffffff' },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#94a3b8' },
};

const INLINE_EDIT_TABLE_SCROLLBAR_SX = {
  '&::-webkit-scrollbar:vertical': { display: 'none', width: 0 },
};

const SERVICES_POPUP_MAX_HEIGHT = 'min(300px, calc(100vh - 48px))';

const SERVICES_POPUP_SCROLLBAR_SX = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#cbd5e1 transparent',
  '&::-webkit-scrollbar': { display: 'block', width: 6 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 6, border: '1px solid #ffffff' },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#94a3b8' },
};

const ORDERS_TABLE_VISIBLE_ROWS = 5;
const ORDERS_TABLE_HEADER_HEIGHT = 40;
const ORDERS_TABLE_ROW_HEIGHT = 56;
const ORDERS_TABLE_VIEWPORT_HEIGHT = ORDERS_TABLE_HEADER_HEIGHT + (ORDERS_TABLE_VISIBLE_ROWS * ORDERS_TABLE_ROW_HEIGHT);

const ORDERS_PAGINATION_ICON_SX = {
  p: 0.5,
  color: '#2563eb',
  bgcolor: 'transparent',
  borderRadius: '8px',
  '&:hover': { bgcolor: '#eff6ff' },
  '&.Mui-disabled': { color: '#cbd5e1', bgcolor: 'transparent' },
};

const TABLE_COLUMN_CONFIG = {
  orderId: { default: 200, min: 150, max: 320 },
  customer: { default: 170, min: 130, max: 300 },
  services: { default: 190, min: 150, max: 280 },
  total: { default: 140, min: 110, max: 220 },
  status: { default: 140, min: 110, max: 220 },
  date: { default: 160, min: 130, max: 260 },
  actions: { default: 130, min: 110, max: 200 },
};

const SERVICE_ICON_OPTIONS = [
  { value: 'laundry', label: 'Laundry' },
  { value: 'dry_cleaning', label: 'Dry Cleaning' },
  { value: 'washing', label: 'Washing' },
  { value: 'shoe', label: 'Shoe' },
  { value: 'iron', label: 'Iron' },
  { value: 'category', label: 'Category' },
  { value: 'custom', label: 'Custom' },
];

const columnText = (value) => String(value ?? '').trim();
const columnKey = (value) => columnText(value).toLocaleLowerCase();

const resolveServiceColumnIconType = (serviceName, serviceTypes = []) => {
  const target = columnKey(serviceName);
  if (!target) return 'custom';
  const matched = serviceTypes.find((svc) => {
    if (!svc || typeof svc !== 'object') return false;
    const history = Array.isArray(svc.names) ? svc.names : svc.names ? [svc.names] : [];
    return [svc.name, ...history].some((name) => columnKey(name) === target);
  });
  return matched?.iconType || 'custom';
};

const getOrderServiceColumnGroups = (order, serviceTypes = []) => {
  const groups = new Map();
  const items = Array.isArray(order?.items) ? order.items : [];
  const rawServiceKeys = Array.isArray(order?.__serviceFilterValues)
    ? order.__serviceFilterValues.map(columnKey)
    : [];
  const fallbackServiceNames = columnText(order?.service_category || order?.service_type)
    .split(',')
    .map(columnText)
    .filter((name) => rawServiceKeys.includes(columnKey(name)));

  const ensureGroup = (serviceName) => {
    const key = columnKey(serviceName);
    if (!key) return null;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: columnText(serviceName),
        iconType: resolveServiceColumnIconType(serviceName, serviceTypes),
        garmentCount: 0,
        garments: [],
        garmentMap: new Map(),
      });
    }
    return groups.get(key);
  };

  items.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const serviceName = columnText(
      item.serviceType || item.service_type || item.service || item.category || fallbackServiceNames[0]
    );
    const group = ensureGroup(serviceName);
    if (!group) return;

    const garmentName = columnText(
      item.name || item.garment_name || item.product_name || item.itemName
        || item.itemId || item.product_id || item.item_id
    ) || '—';
    const qty = toFiniteNumber(item.qty ?? item.quantity ?? item.count, 1);
    const garmentKey = columnKey(garmentName) || `${group.key}_garment_${idx}`;
    const existingGarment = group.garmentMap.get(garmentKey);

    if (existingGarment) {
      existingGarment.qty += qty;
    } else {
      const garment = {
        key: garmentKey,
        name: garmentName,
        iconId: item.itemId || item.product_id || item.item_id || garmentName,
        qty,
      };
      group.garmentMap.set(garmentKey, garment);
      group.garments.push(garment);
    }
    group.garmentCount += qty;
  });

  if (!groups.size) fallbackServiceNames.forEach((serviceName) => ensureGroup(serviceName));

  return Array.from(groups.values()).map(({ garmentMap, ...group }) => group);
};

export function OrdersV2List({
  orders = [],
  page = 1,
  pageSize = '10',
  statusFilter = 'All',
  serviceFilter = 'All Services',
  serviceFilterKeys = [],
  serviceTypes = [],
  isLoadingServiceTypes = false,
  dateFilter = 'All Time',
  topSearch = '',
  currencySymbol = '₹',
  onEditInDrawer,
  onOpenSideEdit,
  onOpenViewOrder,
  onOpenReceipt,
  onDelete,
  onUpdateOrder,
  onPageChange,
  onPageSizeChange,
  t,
  language,
  formatDateFn,
  showToast,
}) {
  // Master lists for Staff and Drivers
  const [staffList, setStaffList] = useState([]);
  const [driverList, setDriverList] = useState([]);

  // Inline Edit State
  const [inlineEditingOrderId, setInlineEditingOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState('customer');
  const tabHeaderRef = useRef(null);
  const activeTabRef = useRef(null);
  useEffect(() => {
    const container = tabHeaderRef.current;
    const tab = activeTabRef.current;
    if (!container || !tab) return;
    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const tabLeft = tabRect.left - containerRect.left + container.scrollLeft;
    const targetLeft = Math.max(0, tabLeft - (container.clientWidth - tabRect.width) / 2);
    if (Math.abs(container.scrollLeft - targetLeft) > 1) {
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [activeTab]);
  const [inlineDraft, setInlineDraft] = useState(null);
  const [inlineCart, setInlineCart] = useState([]);
  const [inspections, setInspections] = useState({});
  const [inlineScheduleErrors, setInlineScheduleErrors] = useState({});
  const [inlineAddressError, setInlineAddressError] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [scanMode, setScanMode] = useState('order');
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanNotice, setScanNotice] = useState({ severity: 'info', text: '' });
  const [scannedGarmentKeys, setScannedGarmentKeys] = useState([]);
  const [barcodePreviewEntry, setBarcodePreviewEntry] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [barcodesLoading, setBarcodesLoading] = useState(false);
  const [barcodesError, setBarcodesError] = useState('');
  const barcodeLoadTokenRef = useRef(0);
  const barcodeSvgRef = useRef(null);
  const barcodeVideoRef = useRef(null);
  const cameraControlsRef = useRef(null);
  const barcodeReaderRef = useRef(null);
  const barcodeImageInputRef = useRef(null);

  const inlineSelectedPickup = driverList.find(
    (option) => String(option.uniqueId) === String(inlineDraft?.assigned_pickup_person_id)
  ) || driverList.find(
    (option) => String(option.name).toLowerCase() === String(inlineDraft?.assigned_driver || inlineDraft?.assigned_pickup_delivery_person || '').trim().toLowerCase()
  ) || null;
  const inlineLogisticsDisplay = inlineDraft
    ? formatLogisticsDeliveryInfo(inlineDraft, inlineSelectedPickup)
    : 'Not Assigned';
  const inlineProcessingTimeline = inlineDraft
    ? getProcessingTimeline(inlineDraft, inlineDraft.order_status || inlineDraft.status)
    : [];
  const garmentScanEntries = useMemo(
    () => getGarmentScanEntries(inlineCart, inspections),
    [inlineCart, inspections]
  );
  const garmentBarcodeEntries = useMemo(
    () => getGarmentBarcodeEntries({ cart: inlineCart, inspections }),
    [inlineCart, inspections]
  );
  const scanTotalGarments = inlineCart.reduce(
    (sum, item) => sum + Math.max(1, parseInt(item.qty ?? item.quantity ?? item.count, 10) || 1),
    0
  );
  const scanScannedGarments = Math.min(scannedGarmentKeys.length, scanTotalGarments);
  const scanRemainingGarments = Math.max(0, scanTotalGarments - scanScannedGarments);

  const handleScanModeChange = (event, nextMode) => {
    if (!nextMode) return;
    setScanMode(nextMode);
    setScanInput('');
    setScanResult(null);
    setScanNotice({ severity: 'info', text: '' });
  };

  const hydrateScanResultFromSupabase = async (result, orderIdentifier) => {
    try {
      if (result.kind === 'garment') {
        const { data: details } = await getGarmentBarcodeDetails(result.code);
        if (!details) return;
        const currentKeys = [inlineDraft?.order_number, inlineDraft?.work_number, inlineDraft?.id]
          .filter(Boolean)
          .map(normalizeScanCode);
        const detailOrderId = normalizeScanCode(details.orderId || details.workId || details.order?.order_number);
        if (detailOrderId && currentKeys.length > 0 && !currentKeys.includes(detailOrderId)) {
          setScanResult(null);
          setScanNotice({
            severity: 'warning',
            text: `This barcode belongs to order ${details.orderId || details.workId || detailOrderId}, not ${inlineDraft?.order_number || inlineDraft?.id || 'this order'}.`,
          });
          return;
        }
        setScanResult((prev) => {
          if (!prev || prev.code !== result.code) return prev;
          return {
            ...prev,
            order: details.order || prev.order,
            entry: {
              ...(prev.entry || {}),
              key: details.barcode || prev.entry?.key,
              detail: {
                ...(prev.entry?.detail || {}),
                name: details.garmentName || prev.entry?.detail?.name,
                barcode: details.barcode || prev.entry?.detail?.barcode,
                garment_barcode: details.barcode || prev.entry?.detail?.garment_barcode,
                barcodeFormat: details.barcodeFormat || prev.entry?.detail?.barcodeFormat,
                barcodeOrderId: details.barcodeOrderId || prev.entry?.detail?.barcodeOrderId,
                barcodeGeneratedAt: details.barcodeGeneratedAt || prev.entry?.detail?.barcodeGeneratedAt,
                unitIndex: details.unitIndex || prev.entry?.detail?.unitIndex,
                tagNumber: details.garmentTagNumber || prev.entry?.detail?.tagNumber,
                service: details.service || prev.entry?.detail?.service,
                serviceType: details.service || prev.entry?.detail?.serviceType,
                quantity: details.quantity || prev.entry?.detail?.quantity,
                color: details.color || prev.entry?.detail?.color,
                fabric: details.fabric || prev.entry?.detail?.fabric,
                brand: details.brand || prev.entry?.detail?.brand,
                condition: details.condition || prev.entry?.detail?.condition,
                defectLocation: details.defectLocation || prev.entry?.detail?.defectLocation,
                severity: details.severity || prev.entry?.detail?.severity,
                actionPlan: details.treatmentAction || prev.entry?.detail?.actionPlan,
                notes: details.inspectionNotes || prev.entry?.detail?.notes,
                inspectedBy: details.inspectedBy || prev.entry?.detail?.inspectedBy,
                inspectedAt: details.inspectedAt || prev.entry?.detail?.inspectedAt,
                processingStage: details.processingStage || prev.entry?.detail?.processingStage,
                assignedStaff: details.assignedStaff || prev.entry?.detail?.assignedStaff,
                processingInstructions: details.processingInstructions || prev.entry?.detail?.processingInstructions,
              },
              cartItem: {
                ...(prev.entry?.cartItem || {}),
                id: details.orderItemId || details.garmentId || prev.entry?.cartItem?.id,
                name: details.garmentName || prev.entry?.cartItem?.name,
                qty: details.quantity || prev.entry?.cartItem?.qty,
                serviceType: details.service || prev.entry?.cartItem?.serviceType,
              },
            },
            barcodeDetails: details,
            source: 'Supabase',
          };
        });
        return;
      }

      const { data } = await getOrderById(orderIdentifier);
      if (!data) return;
      const dbInspections = data.garment_inspections || data.inspections || {};
      const dbEntry = Object.entries(dbInspections).find(([key, detail]) => [
        detail?.barcode,
        detail?.garment_barcode,
        detail?.tagNumber,
        key,
      ].filter(Boolean).some((value) => normalizeScanCode(value) === result.code));
      setScanResult((prev) => {
        if (!prev || prev.code !== result.code) return prev;
        return {
          ...prev,
          order: data,
          entry: dbEntry ? { ...prev.entry, key: dbEntry[0], detail: dbEntry[1], cartItem: prev.entry?.cartItem } : prev.entry,
          source: 'Supabase',
        };
      });
    } catch {}
  };

  const processBarcodeValue = async (rawCode, source = 'manual') => {
    const code = normalizeScanCode(rawCode);
    if (!code || !inlineDraft) {
      setScanResult(null);
      setScanNotice({ severity: 'warning', text: 'Enter or scan a barcode/QR code before pressing Scan.' });
      return;
    }

    const allOrders = Array.isArray(orders) ? orders : [];
    const currentOrder = allOrders.find(
      (order) => String(order.order_number || order.id) === String(inlineDraft.order_number || inlineDraft.id)
    ) || inlineDraft;
    const currentKeys = [currentOrder.order_number, currentOrder.work_number, currentOrder.id]
      .filter(Boolean)
      .map((value) => normalizeScanCode(value));
    const currentOrderLabel = currentOrder.order_number || currentOrder.id || 'this order';
    const barcodeOrderId = normalizeScanCode(getOrderIdFromBarcode(code));
    const looksLikeGarmentBarcode = scanMode === 'garment' || /-G\d+$/.test(code);
    let dbGarment = null;

    if (looksLikeGarmentBarcode) {
      try {
        const { data } = await getGarmentBarcodeDetails(code);
        dbGarment = data || null;
      } catch {}
    }

    if (dbGarment) {
      const dbOrderKeys = [
        dbGarment.workId,
        dbGarment.workNumber,
        dbGarment.orderId,
        dbGarment.order?.order_number,
        dbGarment.order?.id,
        dbGarment.barcodeOrderId,
      ].filter(Boolean).map((value) => normalizeScanCode(value));
      const orderMismatch = currentKeys.length > 0 && dbOrderKeys.length > 0
        && !dbOrderKeys.some((key) => currentKeys.includes(key));

      if (orderMismatch) {
        setScanResult(null);
        setScanNotice({
          severity: 'warning',
          text: `This barcode belongs to order ${dbGarment.orderId || dbGarment.workNumber || dbOrderKeys[0]}, not ${currentOrderLabel}.`,
        });
        return;
      }

      if (scanMode === 'order') {
        setScanResult(null);
        setScanNotice({ severity: 'info', text: 'This is a garment barcode. Select Scan Garment to count it.' });
        return;
      }

      const duplicateKey = dbGarment.barcode || code;
      const duplicate = scannedGarmentKeys.includes(duplicateKey);
      if (!duplicate) {
        setScannedGarmentKeys((prev) => [...prev, duplicateKey]);
      }
      const detail = {
        name: dbGarment.garmentName || 'Garment',
        barcode: dbGarment.barcode || code,
        garment_barcode: dbGarment.barcode || code,
        barcodeFormat: dbGarment.barcodeFormat || '',
        barcodeOrderId: dbGarment.barcodeOrderId || '',
        barcodeGeneratedAt: dbGarment.barcodeGeneratedAt || '',
        unitIndex: dbGarment.unitIndex || 1,
        tagNumber: dbGarment.garmentTagNumber || '',
        service: dbGarment.service || '',
        serviceType: dbGarment.service || '',
        quantity: dbGarment.quantity || 1,
        color: dbGarment.color || '',
        fabric: dbGarment.fabric || '',
        brand: dbGarment.brand || '',
        condition: dbGarment.condition || '',
        defectLocation: dbGarment.defectLocation || '',
        severity: dbGarment.severity || '',
        actionPlan: dbGarment.treatmentAction || '',
        notes: dbGarment.inspectionNotes || '',
        inspectedBy: dbGarment.inspectedBy || '',
        inspectedAt: dbGarment.inspectedAt || '',
        processingStage: dbGarment.processingStage || '',
        assignedStaff: dbGarment.assignedStaff || '',
        processingInstructions: dbGarment.processingInstructions || '',
      };
      const result = {
        kind: 'garment',
        code,
        order: dbGarment.order || currentOrder,
        entry: {
          key: duplicateKey,
          detail,
          cartItem: {
            id: dbGarment.orderItemId || dbGarment.garmentId || '',
            name: detail.name,
            qty: dbGarment.quantity || 1,
            quantity: dbGarment.quantity || 1,
            serviceType: detail.serviceType,
          },
        },
        barcodeDetails: dbGarment,
        duplicate,
        source: 'Supabase',
      };
      setScanNotice({
        severity: duplicate ? 'warning' : 'success',
        text: duplicate
          ? `Barcode ${duplicateKey} was already scanned and was not counted again.`
          : `Garment ${detail.name} verified from Supabase and counted.`,
      });
      setScanResult(result);
      setScanInput('');
      return;
    }

    const belongsToCurrentOrder = !barcodeOrderId || currentKeys.includes(barcodeOrderId);
    let scannedOrder = currentOrder;
    if (!belongsToCurrentOrder) {
      try {
        const { data } = await getOrderById(barcodeOrderId);
        if (data) scannedOrder = data;
      } catch {}
      setScanResult(null);
      setScanNotice({
        severity: 'warning',
        text: `This barcode belongs to order ${scannedOrder.order_number || scannedOrder.id || barcodeOrderId}, not ${currentOrderLabel}.`,
      });
      return;
    }

    const scannedItems = scannedOrder.items || inlineCart;
    const scannedInspections = scannedOrder.garment_inspections || scannedOrder.inspections || inspections;
    const orderMatch = getOrderScanCodes(scannedOrder).includes(code);
    const garmentMatch = getGarmentScanEntries(scannedItems, scannedInspections).find((entry) => entry.codes.includes(code));
    const otherOrder = allOrders.find((order) => {
      if (!order) return false;
      const keys = [order.order_number, order.work_number, order.id].filter(Boolean).map((value) => normalizeScanCode(value));
      if (keys.some((key) => currentKeys.includes(key))) return false;
      if (getOrderScanCodes(order).includes(code)) return true;
      const orderInspections = order.garment_inspections || order.inspections || {};
      return Object.values(orderInspections).some((detail) => [
        detail?.tagNumber,
        detail?.barcode,
        detail?.garment_barcode,
        detail?.qr_code,
        detail?.garmentTag,
        detail?.id,
      ].filter(Boolean).some((value) => normalizeScanCode(value) === code));
    });

    if (orderMatch) {
      if (scanMode === 'garment') {
        setScanResult(null);
        setScanNotice({ severity: 'info', text: 'This is an order barcode. Select Scan Order to verify it.' });
        return;
      }
      const result = { kind: 'order', code, order: scannedOrder, source };
      setScanNotice({ severity: 'success', text: `Order ${currentOrderLabel} verified from ${source === 'manual' ? 'manual entry' : source}.` });
      setScanResult(result);
      setScanInput('');
      void hydrateScanResultFromSupabase(result, currentOrder.order_number || currentOrder.id);
      return;
    }

    if (garmentMatch) {
      if (scanMode === 'order') {
        setScanResult(null);
        setScanNotice({ severity: 'info', text: 'This is a garment barcode. Select Scan Garment to count it.' });
        return;
      }
      const duplicateKey = code;
      const duplicate = scannedGarmentKeys.includes(duplicateKey);
      if (!duplicate) {
        setScannedGarmentKeys((prev) => [...prev, duplicateKey]);
      }
      const result = { kind: 'garment', code, order: scannedOrder, entry: garmentMatch, duplicate, source };
      setScanNotice({
        severity: duplicate ? 'warning' : 'success',
        text: duplicate ? 'This garment was already scanned and was not counted again.' : `Garment ${garmentMatch.detail?.name || garmentMatch.key} matched and counted.`,
      });
      setScanResult(result);
      setScanInput('');
      void hydrateScanResultFromSupabase(result, currentOrder.order_number || currentOrder.id);
      return;
    }

    setScanResult(null);
    setScanNotice({
      severity: 'warning',
      text: otherOrder
        ? `This code belongs to order ${otherOrder.order_number || otherOrder.id}, not ${currentOrderLabel}.`
        : looksLikeGarmentBarcode
          ? `No garment record found for barcode ${code}. Print the latest tag or save this order again.`
          : 'No matching order or garment barcode was found for the selected order.',
    });
  };

  const handleScannerScan = () => processBarcodeValue(scanInput, 'manual');

  const scanResultDetails = scanResult ? (() => {
    const detail = scanResult.entry?.detail || {};
    const db = scanResult.barcodeDetails || {};
    const sourceOrder = db.order || scanResult.order || inlineDraft || {};
    const sourceItems = Array.isArray(sourceOrder.items) && sourceOrder.items.length > 0 ? sourceOrder.items : inlineCart;
    const isOrderScan = scanResult.kind === 'order';
    const orderServices = [...new Set(sourceItems.map((item) => item.serviceType || item.service).filter(Boolean))].join(', ');
    const inspectionDetails = [
      (db.color || detail.color) && `Color: ${db.color || detail.color}`,
      (db.fabric || detail.fabric) && `Fabric: ${db.fabric || detail.fabric}`,
      (db.brand || detail.brand) && `Brand: ${db.brand || detail.brand}`,
      (db.condition || detail.condition) && `Condition: ${db.condition || detail.condition}`,
      (db.treatmentAction || detail.actionPlan) && `Treatment: ${db.treatmentAction || detail.actionPlan}`,
      (db.inspectionNotes || detail.notes) && `Notes: ${db.inspectionNotes || detail.notes}`,
      (db.defectLocation || detail.defectLocation) && `Defect: ${db.defectLocation || detail.defectLocation}`,
      (db.severity || detail.severity) && `Severity: ${db.severity || detail.severity}`,
      detail.stains && `Stains: ${detail.stains}`,
      detail.damage && `Damage: ${detail.damage}`,
      (db.inspectedBy || detail.inspectedBy) && `Inspected By: ${db.inspectedBy || detail.inspectedBy}`,
      (db.inspectedAt || detail.inspectedAt) && `Inspected At: ${formatDeliveryDateTimeForDisplay({ target_delivery_date: db.inspectedAt || detail.inspectedAt })}`,
      detail.qcPassed ? 'QC Passed' : '',
    ].filter(Boolean).join(' • ');
    const totalGarments = Number(db.totalGarments) || Number(sourceOrder.total_pieces) || scanTotalGarments;
    return {
      orderId: db.orderId || db.workNumber || sourceOrder.order_number || sourceOrder.id || inlineDraft?.order_number || '-',
      customer: db.customerName || sourceOrder.customer_name || '-',
      customerPhone: db.mobileNumber || sourceOrder.mobile_number || '-',
      customerAddress: sanitizeAddress(db.deliveryAddress || sourceOrder.address || sourceOrder.delivery_address) || '-',
      garment: isOrderScan ? 'Order-level (all garments)' : (db.garmentName || detail.name || scanResult.entry?.cartItem?.name || 'Garment'),
      garmentTag: isOrderScan
        ? (sourceOrder.bag_barcode || sourceOrder.dispatch_bag_tag || 'Not Assigned')
        : (db.barcode || detail.barcode || detail.garment_barcode || detail.tagNumber || scanResult.entry?.key || 'Not Assigned'),
      garmentQuantity: Number(db.quantity) || Number(scanResult.entry?.cartItem?.qty ?? scanResult.entry?.cartItem?.quantity) || 1,
      service: isOrderScan
        ? (orderServices || sourceOrder.service_category || '-')
        : (db.service || detail.service || detail.serviceType || scanResult.entry?.cartItem?.serviceType || scanResult.entry?.cartItem?.service || '-'),
      inspection: inspectionDetails || (isOrderScan ? sourceOrder.comments || '-' : 'No additional inspection notes'),
      orderStatus: db.orderStatus || sourceOrder.order_status || sourceOrder.status || '-',
      processingStage: db.processingStage || detail.processingStage || sourceOrder.processing_stage || '-',
      expectedDelivery: db.expectedDeliveryDate
        ? formatDeliveryDateTimeForDisplay({ target_delivery_date: db.expectedDeliveryDate, expected_delivery: db.expectedDeliveryDate })
        : formatDeliveryDateTimeForDisplay(sourceOrder),
      assignedStaff: db.assignedStaff || sourceOrder.assigned_staff || sourceOrder.attend_staff_name || 'Not Assigned',
      processingInstructions: db.processingInstructions || sourceOrder.processing_instructions || '-',
      totalGarments,
      scannedGarments: Math.min(scanScannedGarments, totalGarments),
      remainingGarments: Math.max(0, totalGarments - Math.min(scanScannedGarments, totalGarments)),
    };
  })() : null;

  const createBarcodeSvgElement = (value) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, BARCODE_RENDER_OPTIONS);
    return svg;
  };

  const downloadBarcodeFile = (href, filename, revoke = false) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  const handleExportBarcode = async (entry, exportFormat) => {
    if (!entry?.barcode) return;
    try {
      const svg = createBarcodeSvgElement(entry.barcode);
      const filename = `${entry.barcode}.${exportFormat}`;
      if (exportFormat === 'svg') {
        const markup = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
        downloadBarcodeFile(URL.createObjectURL(blob), filename, true);
        return;
      }
      const width = Number(svg.getAttribute('width')) || 600;
      const height = Number(svg.getAttribute('height')) || 120;
      const markup = new XMLSerializer().serializeToString(svg);
      const imageUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageUrl;
      });
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(imageUrl);
      downloadBarcodeFile(canvas.toDataURL('image/png'), filename);
    } catch {
      alert('Unable to export this barcode. Save the order to regenerate it.');
    }
  };

  const handlePrintBarcode = (entry) => {
    if (!entry?.barcode) return;
    let svg;
    try {
      svg = createBarcodeSvgElement(entry.barcode);
    } catch {
      alert('This barcode cannot be encoded as Code 128. Save the order to regenerate it.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=720,height=420');
    if (!printWindow) {
      alert('Allow pop-ups to print garment barcodes.');
      return;
    }
    printWindow.document.write('<!doctype html><html><head><meta charset="utf-8" /><title>Garment Barcode</title></head><body></body></html>');
    printWindow.document.close();

    const orderLine = printWindow.document.createElement('div');
    orderLine.style.cssText = 'font:600 14px Arial,sans-serif;margin-bottom:4px;';
    orderLine.textContent = `Order: ${inlineDraft?.order_number || inlineDraft?.id || '-'}`;

    const garmentLine = printWindow.document.createElement('div');
    garmentLine.style.cssText = 'font:600 13px Arial,sans-serif;margin-bottom:12px;';
    garmentLine.textContent = `${entry.garmentName} • Piece ${entry.piece}`;

    const barcodeHolder = printWindow.document.createElement('div');
    barcodeHolder.appendChild(printWindow.document.importNode(svg, true));

    const instructionLine = printWindow.document.createElement('div');
    instructionLine.style.cssText = 'font:11px Arial,sans-serif;margin-top:10px;color:#475569;';
    instructionLine.textContent = 'Print at 100% scale and attach securely to the individual garment.';

    printWindow.document.body.style.cssText = 'margin:24px;text-align:center;';
    printWindow.document.body.append(orderLine, garmentLine, barcodeHolder, instructionLine);
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
  };

  const stopCameraScanner = useCallback(() => {
    cameraControlsRef.current?.stop?.();
    cameraControlsRef.current = null;
    barcodeReaderRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => {
    cameraControlsRef.current?.stop?.();
  }, []);

  const startCameraScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanNotice({ severity: 'warning', text: 'Camera scanning is not available in this browser. Use USB, image upload or manual entry.' });
      return;
    }
    stopCameraScanner();
    try {
      const reader = new BrowserMultiFormatReader(CODE_128_HINTS, { delayBetweenScanAttempts: 120 });
      barcodeReaderRef.current = reader;
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        barcodeVideoRef.current,
        (result) => {
          if (!result) return;
          const code = result.getText();
          setScanInput(code);
          processBarcodeValue(code, 'camera');
          stopCameraScanner();
        }
      );
      cameraControlsRef.current = controls;
      setCameraActive(true);
      setScanNotice({ severity: 'info', text: 'Camera scanner active. Point it at a garment barcode.' });
    } catch {
      stopCameraScanner();
      setScanNotice({ severity: 'warning', text: 'Camera could not be started. Check browser permission or use image upload/manual entry.' });
    }
  };

  const handleBarcodeImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader(CODE_128_HINTS);
      const result = await reader.decodeFromImageUrl(imageUrl);
      const code = result.getText();
      setScanInput(code);
      processBarcodeValue(code, 'image upload');
    } catch {
      setScanNotice({ severity: 'warning', text: 'No barcode detected in the uploaded image. Use a sharp, straight-on Code 128 image.' });
    } finally {
      URL.revokeObjectURL(imageUrl);
      event.target.value = '';
    }
  };

  const [servicesPopup, setServicesPopup] = useState({
    anchorEl: null,
    orderId: null,
    fallbackOrder: null,
    expanded: {},
  });

  const [tableColumnWidths, setTableColumnWidths] = useState(() =>
    Object.keys(TABLE_COLUMN_CONFIG).reduce((acc, key) => {
      acc[key] = TABLE_COLUMN_CONFIG[key].default;
      return acc;
    }, {})
  );
  const resizeCleanupRef = useRef(null);

  useEffect(() => () => {
    if (resizeCleanupRef.current) resizeCleanupRef.current();
  }, []);

  const servicesPopupOrder = useMemo(() => {
    if (servicesPopup.orderId == null) return null;
    return orders.find((order) => String(order.order_number || order.id) === String(servicesPopup.orderId))
      || servicesPopup.fallbackOrder;
  }, [orders, servicesPopup.fallbackOrder, servicesPopup.orderId]);

  const servicesPopupGroups = useMemo(
    () => (servicesPopupOrder ? getOrderServiceColumnGroups(servicesPopupOrder, serviceTypes) : []),
    [servicesPopupOrder, serviceTypes]
  );

  const isServicesPopupNearBottom = useMemo(() => {
    if (!servicesPopup.anchorEl || typeof window === 'undefined') return false;
    try {
      const rect = servicesPopup.anchorEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      return spaceBelow < 320;
    } catch {
      return false;
    }
  }, [servicesPopup.anchorEl]);

  const beginResize = useCallback((event, key, min, max) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const setWidths = setTableColumnWidths;
    const startWidth = tableColumnWidths[key];

    const onMove = (moveEvent) => {
      const nextWidth = Math.min(max, Math.max(min, startWidth + moveEvent.clientX - startX));
      setWidths((current) => (current[key] === nextWidth ? current : { ...current, [key]: nextWidth }));
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizeCleanupRef.current = null;
    };

    resizeCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [tableColumnWidths]);

  const getColumnWidthSx = useCallback((key) => {
    const width = tableColumnWidths[key];
    return { boxSizing: 'border-box', width, minWidth: width, maxWidth: width, whiteSpace: 'nowrap', overflow: 'hidden' };
  }, [tableColumnWidths]);

  const renderResizeHandle = useCallback((onPointerDown) => (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 3,
        width: 10,
        height: '100%',
        cursor: 'col-resize',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::after': {
          content: '""',
          width: 2,
          height: '45%',
          borderRadius: 2,
          bgcolor: '#cbd5e1',
          transition: 'background-color 0.15s ease, height 0.15s ease, width 0.15s ease',
        },
        '&:hover::after': {
          width: 3,
          height: '70%',
          bgcolor: ORDER_BLUE.main,
        },
      }}
    />
  ), []);

  const tableWidth = useMemo(
    () => Object.keys(TABLE_COLUMN_CONFIG).reduce((total, key) => total + tableColumnWidths[key], 0),
    [tableColumnWidths]
  );

  const renderTableHeader = useCallback((key, label, extraSx = {}) => {
    const config = TABLE_COLUMN_CONFIG[key];
    return (
      <TableCell
        className="orders-v2-header-cell"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          bgcolor: '#f8fafc',
          fontWeight: 700,
          color: '#475569',
          fontSize: '0.82rem',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #e2e8f0',
          py: 1.25,
          ...getColumnWidthSx(key),
          ...extraSx,
        }}
      >
        {label}
        {renderResizeHandle((event) => beginResize(event, key, config.min, config.max))}
      </TableCell>
    );
  }, [beginResize, getColumnWidthSx, renderResizeHandle]);

  // Tab 2 (Catalog & Selection) state
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(DEFAULT_PRODUCTS[0]);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemRate, setItemRate] = useState(DEFAULT_PRODUCTS[0]?.price || 20);
  const [selectedServiceType, setSelectedServiceType] = useState('Laundry');

  const [serviceTypeNotice, setServiceTypeNotice] = useState(null);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [serviceTypeModalMode, setServiceTypeModalMode] = useState('add');
  const [editingServiceType, setEditingServiceType] = useState(null);
  const [newServiceTypeName, setNewServiceTypeName] = useState('');
  const [newServiceTypeIcon, setNewServiceTypeIcon] = useState('custom');
  const [isSavingServiceType, setIsSavingServiceType] = useState(false);
  const [serviceTypeToDelete, setServiceTypeToDelete] = useState(null);

  const openAddServiceTypeModal = () => {
    setServiceTypeModalMode('add');
    setEditingServiceType(null);
    setNewServiceTypeName('');
    setNewServiceTypeIcon('custom');
    setServiceTypeNotice(null);
    setIsAddServiceModalOpen(true);
  };

  const openEditServiceTypeModal = (service) => {
    setServiceTypeModalMode('edit');
    setEditingServiceType(service);
    setNewServiceTypeName(service.name);
    setNewServiceTypeIcon(service.iconType || 'custom');
    setServiceTypeNotice(null);
    setIsAddServiceModalOpen(true);
  };

  const closeServiceTypeModal = () => {
    setIsAddServiceModalOpen(false);
    setEditingServiceType(null);
    setNewServiceTypeName('');
    setNewServiceTypeIcon('custom');
    setIsSavingServiceType(false);
  };

  const handleSaveServiceType = async () => {
    const name = newServiceTypeName.trim();
    if (!name) return;
    const duplicate = serviceTypes.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
        && !(serviceTypeModalMode === 'edit' && s.id === editingServiceType?.id)
    );
    if (duplicate) {
      setServiceTypeNotice({ severity: 'error', text: 'A service type with this name already exists.' });
      return;
    }

    setIsSavingServiceType(true);
    const result = serviceTypeModalMode === 'edit'
      ? await updateServiceType(editingServiceType, { name, iconType: newServiceTypeIcon })
      : await createServiceType({ name, iconType: newServiceTypeIcon });
    setIsSavingServiceType(false);

    if (!result.data) {
      setServiceTypeNotice({ severity: 'error', text: result.error || 'Unable to save service type.' });
      return;
    }

    if (result.source === 'supabase') {
      if (serviceTypeModalMode === 'edit' && selectedServiceType === editingServiceType?.name) {
        setSelectedServiceType(result.data.name);
      }
      if (serviceTypeModalMode === 'add') {
        setSelectedServiceType(result.data.name);
      }
    }
    setServiceTypeNotice(result.error
      ? { severity: 'warning', text: `Saved "${result.data.name}" locally; database sync failed: ${result.error}` }
      : { severity: 'success', text: `Service type "${result.data.name}" saved.` });
    closeServiceTypeModal();
  };

  const handleConfirmDeleteServiceType = async () => {
    if (!serviceTypeToDelete) return;
    const service = serviceTypeToDelete;
    setServiceTypeToDelete(null);

    const result = await deleteServiceType(service);
    if (!result.data) {
      setServiceTypeNotice({ severity: 'error', text: result.error || 'Unable to delete service type.' });
      return;
    }

    if (result.source === 'supabase' && selectedServiceType === service.name) {
      setSelectedServiceType('Laundry');
    }
    setServiceTypeNotice(result.error
      ? { severity: 'warning', text: `Removed "${service.name}" locally; database sync failed: ${result.error}` }
      : { severity: 'success', text: `Service type "${service.name}" deleted.` });
  };

  const handleAddGarmentToCart = (prod) => {
    setSelectedProduct(prod);
    setItemRate(prod.price || 15);
    setInlineCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => (item.itemId === prod.id || item.name === prod.name) && item.serviceType === selectedServiceType
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          qty: (next[existingIndex].qty || 1) + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `${prod.id}_${Date.now()}`,
          itemId: prod.id,
          name: prod.name,
          qty: 1,
          rate: Number(prod.price || 15),
          serviceType: selectedServiceType,
        },
      ];
    });
  };

  // Tab 5 (Payments & Billing) state
  const [discountType, setDiscountType] = useState('%');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Tab 6 (Customer Messages live chat thread) state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'customer',
      name: 'Tested23 (Customer)',
      time: '17 Nov 2026, 04:20 PM',
      text: 'Please take extra care for the white shirt. Thanks!',
    },
    {
      id: 2,
      sender: 'staff',
      name: 'Washdoor – Ranipet',
      time: '17 Nov 2026, 04:32 PM',
      text: 'Noted. We will take care of it.',
    },
    {
      id: 3,
      sender: 'customer',
      name: 'Tested23 (Customer)',
      time: '17 Nov 2026, 05:10 PM',
      text: 'Can you confirm the expected delivery time?',
    },
    {
      id: 4,
      sender: 'staff',
      name: 'Washdoor – Ranipet',
      time: '17 Nov 2026, 05:22 PM',
      text: 'Sure! Your order will be ready for delivery by 20 Nov 2026, 06:00 PM.',
    },
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatFilter, setChatFilter] = useState('all');

  // Tab 7 (WhatsApp & SMS alerts) state
  const [selectedMessageTemplate, setSelectedMessageTemplate] = useState('order_received');
  const [messageSentToast, setMessageSentToast] = useState('');

  useEffect(() => {
    let active = true;
    fetchActiveStaffMaster().then((res) => {
      if (active && res?.data) setStaffList(res.data);
    });
    fetchActivePickupDeliveryMaster().then((res) => {
      if (active && res?.data) setDriverList(res.data);
    });
    return () => { active = false; };
  }, []);

  // Filtered orders list
  const filtered = useMemo(() => {
    let list = (orders || []).map((raw) => {
      const normalized = normalizeOrder(raw);
      const status = normalizeOrdersV2Status(normalized.order_status || normalized.status || raw?.order_status || raw?.status);
      return restoreOrderPricing({ ...normalized, order_status: status, status }, raw);
    });
    if (statusFilter !== 'All') {
      list = list.filter((o) => normalizeOrdersV2Status(o.order_status || o.status) === statusFilter);
    }
    return list;
  }, [orders, statusFilter]);

  const showAllRows = pageSize === 'All';
  const pageNum = showAllRows ? Math.max(filtered.length, 1) : Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageNum));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageNum;
  const end = showAllRows ? filtered.length : safePage * pageNum;
  const paginated = filtered.slice(start, end);
  const showingStart = filtered.length ? start + 1 : 0;
  const showingEnd = Math.min(filtered.length, end);

  // Open / Close Inline Edit Panel
  const handleToggleInlineEdit = (order) => {
    const oid = order.order_number || order.id;
    if (inlineEditingOrderId === oid) {
      barcodeLoadTokenRef.current += 1;
      setBarcodesLoading(false);
      setBarcodesError('');
      stopCameraScanner();
      setInlineEditingOrderId(null);
      setInlineDraft(null);
      setInlineCart([]);
      setInspections({});
      setPaymentHistory([]);
      setActiveTab('customer');
      return;
    }

    barcodeLoadTokenRef.current += 1;
    const barcodeToken = barcodeLoadTokenRef.current;
    setBarcodesLoading(true);
    setBarcodesError('');

    const pickupSplit = splitIsoToLocalDateAndTime(order.scheduled_pickup_at);
    const deliverySplit = splitIsoToLocalDateAndTime(order.scheduled_delivery_at);
    const normalizedStatus = normalizeOrdersV2Status(order.order_status || order.status);

    const rawInitialDriver = (order.assigned_pickup_delivery_person || order.assigned_driver || '').trim();
    const safeInitialDriver = (rawInitialDriver === 'Counter Staff' || rawInitialDriver === 'Not assigned' || (order.assigned_staff && rawInitialDriver === order.assigned_staff && !order.assigned_pickup_delivery_person)) ? '' : rawInitialDriver;
    const initialAttendStaff = (order.attend_staff_name || order.assigned_staff || 'Counter Staff').trim();
    const processingValues = getProcessingFieldValues(order);
    const draft = {
      ...order,
      order_number: order.order_number || order.id,
      customer_name: order.customer_name || '',
      mobile_number: order.mobile_number || '',
      address: order.address || '',
      order_type: order.order_type || 'Walk-In',
      service_category: order.service_category || '',
      status: normalizedStatus,
      order_status: normalizedStatus,
      expected_delivery: order.expected_delivery || '',
      scheduled_pickup_at: order.scheduled_pickup_at || null,
      scheduled_delivery_at: order.scheduled_delivery_at || null,
      scheduled_pickup_date: pickupSplit.date || '',
      scheduled_pickup_time: pickupSplit.time || '',
      scheduled_delivery_date: deliverySplit.date || '',
      scheduled_delivery_time: deliverySplit.time || '',
      assigned_staff: initialAttendStaff,
      attend_staff_name: initialAttendStaff,
      attend_staff_id: order.attend_staff_id || null,
      assigned_driver: safeInitialDriver,
      assigned_pickup_delivery_person: safeInitialDriver,
      assigned_pickup_person_id: order.assigned_pickup_person_id || null,
      advance_paid: Number(order.advance_paid || 0),
      payment_method: order.payment_method || '',
      payment_status: order.payment_status || '',
      comments: order.comments || order.order_notes || order.special_instructions || '',
      priority: processingValues.processingPriority,
      factory_plant: processingValues.factoryPlant,
      factory_hub: processingValues.factoryPlant,
      bag_barcode: processingValues.bagTag,
      dispatch_bag_tag: processingValues.bagTag,
      packaging_preference: processingValues.packagingType,
      packaging_type: processingValues.packagingType,
      assigned_machine: processingValues.assignedMachine,
      processing_stage: processingValues.processingStage,
      processing_instructions: processingValues.processingInstructions,
    };

    const rawItems = Array.isArray(order.items) ? order.items : [];

    const items = rawItems.map((it, i) => ({
      ...it,
      id: it.id || `${it.itemId || it.name}_${i}`,
      itemId: it.itemId || it.product_id || it.item_id || it.name,
      qty: toFiniteNumber(it.qty ?? it.quantity, 0),
      rate: toFiniteNumber(it.rate ?? it.price ?? it.unit_price, 0),
      serviceType: it.serviceType || it.service_type || '',
    }));

    const savedSubtotal = toFiniteNumber(
      order.subtotal ?? order.subtotal_amount ?? (order.total_amount ? Number(order.total_amount) / 1.05 : 0),
      0
    );
    const knownTotal = items.reduce((sum, it) => sum + it.qty * it.rate, 0);
    const missingQty = items.reduce((sum, it) => sum + (it.rate > 0 ? 0 : it.qty), 0);
    if (missingQty > 0 && savedSubtotal > 0) {
      const inferredRate = Math.round(((Math.max(0, savedSubtotal - knownTotal) / missingQty) + Number.EPSILON) * 100) / 100;
      if (inferredRate > 0) {
        items.forEach((it) => { if (it.rate <= 0) it.rate = inferredRate; });
      }
    }

    const savedDiscount = toFiniteNumber(order.discount_amount ?? order.discountAmount, 0);
    setDiscountType(savedDiscount > 0 ? '₹' : '%');
    setDiscountValue(savedDiscount > 0 ? savedDiscount : 0);
    setInlineDraft(draft);
    setInlineCart(items);
    setInspections(order.garment_inspections || order.inspections || {});
    setScanMode('order');
    setScanInput('');
    setScanResult(null);
    setScanNotice({ severity: 'info', text: '' });
    setScannedGarmentKeys([]);
    setBarcodePreviewEntry(null);
    stopCameraScanner();
    setInlineScheduleErrors({});
    setInlineAddressError('');

    void fetchOrderGarmentBarcodes(oid, items)
      .then(({ data, error }) => {
        if (barcodeLoadTokenRef.current !== barcodeToken) return;
        if (data?.inspections) {
          setInspections((prev) => mergeGarmentBarcodePatch(prev, data.inspections));
        }
        setBarcodesError(error || '');
        setBarcodesLoading(false);
      })
      .catch((err) => {
        if (barcodeLoadTokenRef.current !== barcodeToken) return;
        setBarcodesError(err?.message || 'Unable to load garment barcodes.');
        setBarcodesLoading(false);
      });

    // Helper to format date and time together (e.g., "20 Nov 2026, 12:32 PM")
    const formatPaymentDateTime = (ts) => {
      if (!ts) {
        const now = new Date();
        return now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
          ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr}, ${timeStr}`;
      } catch {
        return String(ts);
      }
    };

    // Load payment history specifically for THIS order only
    const ordTotal = Number(order.total_amount || order.grand_total || 0);
    const ordAdv = Number(order.advance_paid || 0);
    const ordBal = Number(order.balance_due !== undefined ? order.balance_due : Math.max(0, ordTotal - ordAdv));
    const ordIsFullyPaid = (ordTotal > 0 && ordAdv >= ordTotal) || (ordBal <= 0 && ordAdv > 0);
    const ordComputedStatus = ordIsFullyPaid ? 'Paid in Full' : (ordAdv > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery');

    let orderPaymentHistory = [];
    const rawHistory = Array.isArray(order.payment_history) && order.payment_history.length > 0
      ? order.payment_history
      : (Array.isArray(order.paymentHistory) && order.paymentHistory.length > 0
        ? order.paymentHistory
        : (Array.isArray(order.payments) && order.payments.length > 0 ? order.payments : null));

    if (rawHistory && rawHistory.length > 0) {
      orderPaymentHistory = rawHistory
        .filter((p) => {
          const amt = Number(p.amount || 0);
          const belongsToOrder = !p.order_id || String(p.order_id) === String(oid) || String(p.order_number) === String(oid);
          return amt > 0 && belongsToOrder;
        })
        .map((p) => ({
          ...p,
          date: p.date && p.date.includes(',') ? p.date : formatPaymentDateTime(p.date || p.payment_date || p.created_at || order.payment_received_at || order.created_at),
          status: (Number(p.amount) >= ordTotal || ordIsFullyPaid) ? 'Paid in Full' : (p.status || 'Paid'),
        }));
    } else if (ordAdv > 0) {
      // ONLY create an entry if money was actually paid (advance_paid > 0)!
      const paymentDate = order.payment_received_at || order.created_at || order.order_date;
      const formattedDate = formatPaymentDateTime(paymentDate);
      orderPaymentHistory = [
        {
          id: `${oid}_p1`,
          order_id: oid,
          date: formattedDate,
          method: order.payment_method || 'Cash',
          amount: ordAdv,
          status: ordComputedStatus,
        }
      ];
    } else {
      // 0 paid -> completely empty payment history!
      orderPaymentHistory = [];
    }
    setPaymentHistory(orderPaymentHistory);

    setActiveTab('customer');
    setInlineEditingOrderId(oid);
  };

  // Cart financial calculations
  const inlineSubtotal = useMemo(() => {
    return inlineCart.reduce(
      (acc, it) => acc + (toFiniteNumber(it.qty ?? it.quantity, 0) * toFiniteNumber(it.rate ?? it.price, 0)),
      0,
    );
  }, [inlineCart]);

  const inlineTotalCount = useMemo(() => {
    return inlineCart.reduce((acc, it) => acc + toFiniteNumber(it.qty ?? it.quantity, 0), 0);
  }, [inlineCart]);

  const discountAmount = useMemo(() => {
    if (discountType === '%') {
      return Math.round(((inlineSubtotal * Number(discountValue || 0)) / 100 + Number.EPSILON) * 100) / 100;
    }
    return Math.min(inlineSubtotal, Number(discountValue || 0));
  }, [inlineSubtotal, discountType, discountValue]);

  const inlineGstRate = useMemo(() => {
    const percentage = toFiniteNumber(inlineDraft?.gst_percentage ?? inlineDraft?.gstPercentage, 5);
    return percentage > 0 ? percentage / 100 : 0;
  }, [inlineDraft]);

  const inlineTax = useMemo(() => {
    const taxable = Math.max(0, inlineSubtotal - discountAmount);
    return Math.round((taxable * inlineGstRate + Number.EPSILON) * 100) / 100;
  }, [inlineSubtotal, discountAmount, inlineGstRate]);

  const inlineGrandTotal = useMemo(() => {
    const taxable = Math.max(0, inlineSubtotal - discountAmount);
    return Math.round((taxable + inlineTax + Number.EPSILON) * 100) / 100;
  }, [inlineSubtotal, discountAmount, inlineTax]);

  const inlineAdvance = Number(inlineDraft?.advance_paid) || 0;
  const inlineBalance = Math.max(0, inlineGrandTotal - inlineAdvance);

  const filteredChatMessages = useMemo(() => {
    if (chatFilter === 'customer') return chatMessages.filter((m) => m.sender === 'customer');
    if (chatFilter === 'staff') return chatMessages.filter((m) => m.sender === 'staff');
    return chatMessages;
  }, [chatMessages, chatFilter]);

  const handleSendChatMessage = () => {
    if (!newChatMessage.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'staff',
        name: 'Washdoor – Ranipet',
        time: timeStr,
        text: newChatMessage.trim(),
      },
    ]);
    setNewChatMessage('');
  };

  const handleAddPaymentRecord = () => {
    const amtStr = prompt('Enter payment amount (₹):', String(inlineBalance > 0 ? inlineBalance : 100));
    if (!amtStr || isNaN(Number(amtStr))) return;
    const amt = Number(amtStr);
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const newEntry = {
      id: Date.now(),
      date: timeStr,
      method: inlineDraft?.payment_method || 'Cash',
      amount: amt,
      status: 'Paid',
    };
    setPaymentHistory((prev) => [...prev, newEntry]);
    const nextAdvance = (Number(inlineDraft?.advance_paid) || 0) + amt;
    setInlineDraft((prev) => ({
      ...prev,
      advance_paid: nextAdvance,
      payment_status: nextAdvance >= inlineGrandTotal ? 'Paid' : 'Partial Payment',
    }));
  };

  const handleDeletePayment = (id) => {
    setPaymentHistory((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      const newAdvance = filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      setInlineDraft((prevDraft) => ({
        ...prevDraft,
        advance_paid: newAdvance,
        payment_status: newAdvance >= inlineGrandTotal && inlineGrandTotal > 0 ? 'Paid in Full' : (newAdvance > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery'),
      }));
      return filtered;
    });
  };

  // Cart operations
  const handleUpdateItemQty = (idx, delta) => {
    setInlineCart((prev) => {
      const next = [...prev];
      const cur = Number(next[idx].qty) || 1;
      const nq = cur + delta;
      if (nq <= 0) return next.filter((_, i) => i !== idx);
      next[idx] = { ...next[idx], qty: nq };
      return next;
    });
  };

  const handleRemoveCartItem = (idx) => {
    setInlineCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSelectedToCart = () => {
    if (!selectedProduct) return;
    setInlineCart((prev) => {
      const existing = prev.findIndex((i) => i.itemId === selectedProduct.id || i.name === selectedProduct.name);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = {
          ...next[existing],
          qty: Number(next[existing].qty || 1) + Number(itemQuantity || 1),
          rate: Number(itemRate) || next[existing].rate,
          serviceType: selectedServiceType,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `${selectedProduct.id}_${Date.now()}`,
          itemId: selectedProduct.id,
          name: selectedProduct.name,
          qty: Number(itemQuantity || 1),
          rate: Number(itemRate || selectedProduct.price || 20),
          serviceType: selectedServiceType,
        },
      ];
    });
  };

  // Pipeline Status Change Click
  const handleInlineStatusChange = (status) => {
    setInlineDraft((prev) => ({
      ...prev,
      order_status: status,
      status: status,
    }));
  };

  // Save Inline Edit
  const handleSaveInlineEdit = async () => {
    if (!inlineDraft) return;

    if (isOnCallOrderType(inlineDraft.order_type) && !sanitizeAddress(inlineDraft.address)) {
      setInlineAddressError('Address is required for On-Call orders.');
      alert('Address is required for On-Call orders.');
      return;
    }
    setInlineAddressError('');

    let resolvedPickup = inlineDraft.scheduled_pickup_at || null;
    let resolvedDelivery = inlineDraft.scheduled_delivery_at || null;

    if (isOnCallOrderType(inlineDraft.order_type)) {
      const sched = validateOnCallSchedule({
        pickupDate: inlineDraft.scheduled_pickup_date,
        pickupTime: inlineDraft.scheduled_pickup_time,
        deliveryDate: inlineDraft.scheduled_delivery_date,
        deliveryTime: inlineDraft.scheduled_delivery_time,
        isNewOrder: false,
        initialPickupIso: inlineDraft.scheduled_pickup_at || null,
      });
      if (!sched.isValid) {
        setInlineScheduleErrors(sched.errors);
        alert(Object.values(sched.errors)[0]);
        return;
      }
      setInlineScheduleErrors({});
      resolvedPickup = sched.scheduled_pickup_at;
      resolvedDelivery = sched.scheduled_delivery_at;
    } else {
      const deliveryResult = resolveOptionalDelivery({
        deliveryDate: inlineDraft.scheduled_delivery_date,
        deliveryTime: inlineDraft.scheduled_delivery_time,
      });
      if (!deliveryResult.isValid) {
        setInlineScheduleErrors(deliveryResult.errors);
        alert(Object.values(deliveryResult.errors)[0]);
        return;
      }
      setInlineScheduleErrors({});
      resolvedDelivery = deliveryResult.scheduled_delivery_at;
    }

    setIsSavingInline(true);
    try {
      const cartServices = [...new Set(inlineCart.map((i) => i.serviceType).filter(Boolean))];
      const resolvedServiceCategory = cartServices.length
        ? cartServices.join(', ')
        : inlineDraft.service_category;

      const originalOrder = orders.find(
        (o) => (o.order_number || o.id) === (inlineDraft.order_number || inlineDraft.id)
      ) || inlineDraft;

      const nowIso = new Date().toISOString();
      const staffActor = (inlineDraft.assigned_staff || originalOrder.assigned_staff || 'Counter Staff').trim();
      const pickupPerson = (inlineDraft.assigned_driver || originalOrder.assigned_driver || '').trim();

      const prevHistory = Array.isArray(originalOrder.activity_history) && originalOrder.activity_history.length > 0
        ? [...originalOrder.activity_history]
        : (Array.isArray(originalOrder.audit_logs) && originalOrder.audit_logs.length > 0
          ? [...originalOrder.audit_logs]
          : (Array.isArray(originalOrder.logs) ? [...originalOrder.logs] : []));

      const addedEvents = [];
      const newStatus = normalizeOrdersV2Status(inlineDraft.order_status || inlineDraft.status);
      const oldStatus = normalizeOrdersV2Status(originalOrder.order_status || originalOrder.status);

      if (newStatus !== oldStatus) {
        addedEvents.push({
          id: `act_status_${Date.now()}`,
          type: newStatus === 'Delivered' ? 'collection' : 'status',
          title: newStatus === 'Delivered' ? 'Order Delivered' : 'Status Updated',
          detail: newStatus === 'Delivered'
            ? `Garments delivered (${pickupPerson || inlineDraft.customer_name || 'Customer'})`
            : `${newStatus}`,
          staff: staffActor,
          timestamp: nowIso,
        });
      }

      const prevCartSig = (originalOrder.items || []).map((i) => `${i.name || i.item_name || ''}:${i.qty || i.quantity || 1}:${i.serviceType || i.service || ''}`).join('|');
      const nextCartSig = inlineCart.map((i) => `${i.name || i.item_name || ''}:${i.qty || i.quantity || 1}:${i.serviceType || i.service || ''}`).join('|');
      if (prevCartSig !== nextCartSig || (originalOrder.items || []).length !== inlineCart.length) {
        const breakdownText = formatServiceBreakdown(inlineCart, resolvedServiceCategory || originalOrder.service_category || 'Laundry', true);
        addedEvents.push({
          id: `act_svc_${Date.now() + 1}`,
          type: 'service',
          title: 'Service Updated',
          detail: breakdownText || `Garments updated (${inlineTotalCount} pcs)`,
          staff: staffActor,
          timestamp: nowIso,
        });
      }

      const prevAdv = Number(originalOrder.advance_paid || 0);
      const nextAdv = Number(inlineAdvance || 0);
      const effectivePaymentStatus = (inlineBalance <= 0 && (inlineAdvance > 0 || inlineGrandTotal > 0)) || inlineDraft.payment_status === 'Paid in Full'
        ? 'Paid in Full'
        : (inlineDraft.payment_status || (inlineAdvance > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery'));

      if (nextAdv > 0 && (nextAdv !== prevAdv || effectivePaymentStatus !== originalOrder.payment_status)) {
        addedEvents.push({
          id: `act_pay_${Date.now() + 2}`,
          type: 'payment',
          title: 'Payment Received',
          detail: `${currencySymbol}${nextAdv.toFixed(2)} received via ${inlineDraft.payment_method || 'Cash'}`,
          staff: staffActor,
          timestamp: nowIso,
        });
      }

      const initialHistory = [];
      const origItems = Array.isArray(originalOrder.items) && originalOrder.items.length > 0 ? originalOrder.items : inlineCart;
      if (origItems.length > 0) {
        const initialBreakdown = formatServiceBreakdown(origItems, originalOrder.service_category || 'Laundry', true);
        initialHistory.push({
          id: 'act_svc_init',
          type: 'service',
          title: 'Service Allocated',
          detail: initialBreakdown || `${originalOrder.service_category || 'Laundry'} (${origItems.length} items)`,
          staff: originalOrder.attend_staff_name || originalOrder.assigned_staff || 'Counter Staff',
          timestamp: originalOrder.created_at || nowIso,
        });
      }
      initialHistory.push({
        id: 'act_recv_init',
        type: 'received',
        title: 'Order Received',
        detail: 'New order placed',
        staff: originalOrder.attend_staff_name || originalOrder.assigned_staff || 'Counter Staff',
        timestamp: originalOrder.created_at || nowIso,
      });

      const baseHistory = prevHistory.length > 0 ? prevHistory : initialHistory;
      const combinedHistory = [...addedEvents, ...baseHistory];
      const cleanAddress = sanitizeAddress(inlineDraft.address);
      const processingPayload = buildProcessingPayload(inlineDraft);
      const barcodeResult = assignGarmentBarcodes({
        orderId: inlineDraft.order_number || inlineDraft.id,
        inspections,
      });
      const inspectionsWithBarcodes = barcodeResult.inspections;

      const updatedRecord = {
        ...inlineDraft,
        order_number: inlineDraft.order_number,
        customer_name: inlineDraft.customer_name,
        mobile_number: inlineDraft.mobile_number,
        address: cleanAddress,
        order_type: inlineDraft.order_type,
        service_category: resolvedServiceCategory,
        order_status: newStatus,
        status: newStatus,
        expected_delivery: resolvedDelivery
          ? formatDeliveryDateTimeForDisplay(resolvedDelivery)
          : (inlineDraft.expected_delivery || ''),
        scheduled_pickup_at: resolvedPickup,
        scheduled_delivery_at: resolvedDelivery,
        assigned_staff: inlineDraft.assigned_staff || 'Counter Staff',
        attend_staff_name: inlineDraft.assigned_staff || 'Counter Staff',
        attend_staff_id: inlineDraft.attend_staff_id || null,
        assigned_driver: inlineDraft.assigned_driver || '',
        assigned_pickup_delivery_person: inlineDraft.assigned_driver || '',
        assigned_pickup_person_id: inlineDraft.assigned_pickup_person_id || null,
        items: inlineCart,
        garment_inspections: inspectionsWithBarcodes,
        inspections: inspectionsWithBarcodes,
        garment_barcodes: barcodeResult.barcodes,
        subtotal: inlineSubtotal,
        discount_amount: discountAmount,
        gst_percentage: Math.round(inlineGstRate * 100),
        tax_amount: inlineTax,
        total_amount: inlineGrandTotal,
        advance_paid: inlineAdvance,
        balance_due: inlineBalance,
        payment_status: effectivePaymentStatus,
        payment_method: inlineDraft.payment_method,
        payment_history: paymentHistory,
        comments: inlineDraft.comments,
        special_instructions: inlineDraft.comments,
        ...processingPayload,
        factory_plant: processingPayload.factory_hub,
        bag_barcode: processingPayload.dispatch_bag_tag,
        packaging_preference: processingPayload.packaging_type,
        activity_history: combinedHistory,
        audit_logs: combinedHistory,
        logs: combinedHistory,
        status_updated_at: nowIso,
        status_updated_by: staffActor,
      };

      await updateOrderInSupabase(updatedRecord.order_number, {
        customerName: updatedRecord.customer_name,
        mobileNumber: updatedRecord.mobile_number,
        address: cleanAddress,
        serviceCategory: resolvedServiceCategory,
        orderType: updatedRecord.order_type,
        status: newStatus,
        orderStatus: newStatus,
        expectedDelivery: updatedRecord.expected_delivery,
        scheduledPickupAt: resolvedPickup,
        scheduledDeliveryAt: resolvedDelivery,
        assignedStaff: updatedRecord.assigned_staff,
        attend_staff_name: updatedRecord.attend_staff_name,
        attend_staff_id: updatedRecord.attend_staff_id,
        assignedDriver: updatedRecord.assigned_driver,
        assigned_driver: updatedRecord.assigned_driver,
        assigned_pickup_delivery_person: updatedRecord.assigned_pickup_delivery_person,
        assigned_pickup_person_id: updatedRecord.assigned_pickup_person_id,
        assigned_pickup_person_city: updatedRecord.assigned_pickup_person_city,
        assigned_pickup_person_zone: updatedRecord.assigned_pickup_person_zone,
        items: inlineCart,
        garment_inspections: inspectionsWithBarcodes,
        inspections: inspectionsWithBarcodes,
        garment_barcodes: barcodeResult.barcodes,
        subtotal: inlineSubtotal,
        discountAmount: discountAmount,
        taxAmount: inlineTax,
        totalAmount: inlineGrandTotal,
        advancePaid: inlineAdvance,
        balanceDue: inlineBalance,
        paymentStatus: updatedRecord.payment_status,
        paymentMethod: updatedRecord.payment_method,
        orderNotes: updatedRecord.comments,
        ...processingPayload,
        activity_history: combinedHistory,
        audit_logs: combinedHistory,
        status_updated_at: nowIso,
        status_updated_by: staffActor,
      });

      onUpdateOrder?.(updatedRecord);
      stopCameraScanner();
      setInlineEditingOrderId(null);
      setInlineDraft(null);
      setInlineCart([]);
      setInspections({});
      setPaymentHistory([]);
      setIsSavingInline(false);
    } catch (err) {
      setIsSavingInline(false);
      alert(err.message || 'Error updating order');
    }
  };

  const openServicesPopup = (event, order, selectedServiceKey) => {
    event.stopPropagation();
    const groups = getOrderServiceColumnGroups(order, serviceTypes);
    const hasSelectedService = selectedServiceKey && groups.some((group) => group.key === selectedServiceKey);
    const expanded = groups.reduce((acc, group, idx) => {
      acc[group.key] = hasSelectedService ? group.key === selectedServiceKey : idx === 0;
      return acc;
    }, {});
    setServicesPopup({
      anchorEl: event.currentTarget,
      orderId: String(order.order_number || order.id),
      fallbackOrder: order,
      expanded,
    });
  };

  const closeServicesPopup = () => {
    setServicesPopup({ anchorEl: null, orderId: null, fallbackOrder: null, expanded: {} });
  };

  const toggleServiceGroup = (key) => {
    setServicesPopup((current) => ({
      ...current,
      expanded: { ...current.expanded, [key]: !current.expanded[key] },
    }));
  };

  const renderServiceIcon = (iconType) => {
    switch (iconType) {
      case 'laundry':
        return <LocalLaundryServiceOutlined fontSize="small" sx={{ color: '#2563eb' }} />;
      case 'dry_cleaning':
        return <DryCleaningOutlined fontSize="small" sx={{ color: '#2563eb' }} />;
      case 'washing':
        return <WaterDropOutlined fontSize="small" sx={{ color: '#0284c7' }} />;
      case 'shoe':
        return <CheckroomOutlined fontSize="small" sx={{ color: '#2563eb' }} />;
      case 'iron':
        return <IronOutlined fontSize="small" sx={{ color: '#2563eb' }} />;
      case 'category':
        return <CategoryOutlined fontSize="small" sx={{ color: '#2563eb' }} />;
      case 'custom':
      default:
        return <LabelOutlined fontSize="small" sx={{ color: '#2563eb' }} />;
    }
  };

  // Filter Catalog items for Tab 2
  const filteredCatalog = useMemo(() => {
    return DEFAULT_PRODUCTS.filter((prod) => {
      const matchCat = catalogCategory === 'All' || prod.category === catalogCategory || prod.secondaryCategory === catalogCategory;
      const matchSearch = !catalogSearch || prod.name.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogCategory, catalogSearch]);

  // Tab Navigation helpers
  const handleNextTab = () => {
    const idx = HORIZONTAL_TABS.findIndex((t) => t.id === activeTab);
    if (idx < HORIZONTAL_TABS.length - 1) {
      setActiveTab(HORIZONTAL_TABS[idx + 1].id);
    }
  };

  const handlePrevTab = () => {
    const idx = HORIZONTAL_TABS.findIndex((t) => t.id === activeTab);
    if (idx > 0) {
      setActiveTab(HORIZONTAL_TABS[idx - 1].id);
    }
  };

  // WhatsApp / SMS templates
  const messagePreviewText = useMemo(() => {
    const name = inlineDraft?.customer_name || 'Customer';
    const oid = inlineDraft?.order_number || 'ORD000045';
    const total = currencySymbol + MONEY(inlineGrandTotal);
    const bal = currencySymbol + MONEY(inlineBalance);

    if (selectedMessageTemplate === 'order_received') {
      return `Dear ${name}, your laundry order #${oid} has been received. Garments: ${inlineTotalCount} pcs, Total: ${total}. Balance due: ${bal}. Thank you for choosing Washdoor!`;
    }
    if (selectedMessageTemplate === 'in_progress') {
      return `Hi ${name}, your order #${oid} is currently being washed & processed in our factory plant. Expected completion: ${inlineDraft?.scheduled_delivery_date || 'soon'}.`;
    }
    if (selectedMessageTemplate === 'ready') {
      return `Good news ${name}! Your order #${oid} is ready for pickup/delivery! Total amount: ${total}, Balance: ${bal}. We look forward to serving you!`;
    }
    return `Hello ${name}, your order #${oid} has been delivered. We hope you love the crisp & clean garments! Thank you for your business.`;
  }, [inlineDraft, selectedMessageTemplate, inlineGrandTotal, inlineBalance, inlineTotalCount, currencySymbol]);

  if (filtered.length === 0) {
    return (
      <Box sx={{ width: '100%', maxWidth: 'none', minWidth: 0, boxSizing: 'border-box', py: 6, textAlign: 'center', bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <Typography variant="body1" color="#64748b" fontWeight={600}>
          {t?.('no_orders_found', 'No Orders Found matching your filters') || 'No Orders Found matching your filters'}
        </Typography>
      </Box>
    );
  }

  const isInlineEditing = Boolean(inlineEditingOrderId);

  return (
    <>
      <Paper
        elevation={0}
        className={`orders-v2-table-card ${isInlineEditing ? 'is-inline-editing' : ''}`}
        sx={{
          width: '100%',
          maxWidth: 'none',
          minWidth: 0,
          boxSizing: 'border-box',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          mb: '15px',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <TableContainer
          className={`orders-v2-table-container ${isInlineEditing ? 'is-inline-editing' : ''}`}
          sx={{
            width: '100%',
            height: ORDERS_TABLE_VIEWPORT_HEIGHT,
            minHeight: ORDERS_TABLE_VIEWPORT_HEIGHT,
            maxHeight: ORDERS_TABLE_VIEWPORT_HEIGHT,
            overflowX: 'auto',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            flex: '1 1 auto',
            ...ORDER_SCROLLBAR_SX,
            ...ORDERS_TABLE_SCROLLBAR_SX,
            ...(isInlineEditing
              ? {
                  height: 'auto',
                  minHeight: 0,
                  maxHeight: 'none',
                  overflowY: 'hidden',
                  overscrollBehavior: 'auto',
                  ...INLINE_EDIT_TABLE_SCROLLBAR_SX,
                }
              : {}),
          }}
        >
          <Table
            sx={{
              width: `max(100%, ${tableWidth}px)`,
              minWidth: `${tableWidth}px`,
              tableLayout: 'fixed',
              '& .orders-v2-header-cell': {
                height: ORDERS_TABLE_HEADER_HEIGHT,
                py: 0,
                boxSizing: 'border-box',
              },
              '& .orders-v2-data-row': {
                height: ORDERS_TABLE_ROW_HEIGHT,
              },
              '& .orders-v2-data-row > td': {
                height: ORDERS_TABLE_ROW_HEIGHT,
                py: 0,
                boxSizing: 'border-box',
                verticalAlign: 'middle',
              },
            }}
          >
          {/* Table Head */}
          <TableHead sx={{ bgcolor: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
            <TableRow>
              {renderTableHeader('orderId', 'Order ID')}
              {renderTableHeader('customer', 'Customer')}
              {renderTableHeader('services', 'Services')}
              {renderTableHeader('total', 'Total Amount')}
              {renderTableHeader('status', 'Status')}
              {renderTableHeader('date', 'Order Date')}
              {renderTableHeader('actions', 'Actions', { textAlign: 'center' })}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.map((order) => {
              const orderId = order.order_number || order.id;
              const isInlineOpen = inlineEditingOrderId === orderId;
              const serviceGroups = getOrderServiceColumnGroups(order, serviceTypes);
              const firstService = serviceGroups[0];
              const status = normalizeOrdersV2Status(order.order_status || order.status);
              const stStyle = STATUS_CONFIG[status] || STATUS_CONFIG['Order Received'];
              const initialLetter = String(order.customer_name || '—')[0].toUpperCase();

              return (
                <React.Fragment key={orderId}>
                  <TableRow
                    hover
                    className="orders-v2-data-row"
                    sx={{
                      bgcolor: isInlineOpen ? '#eff6ff' : 'inherit',
                      transition: 'background-color 0.15s ease',
                      '&.MuiTableRow-hover:hover': { bgcolor: isInlineOpen ? '#eff6ff' : '#f8fbff' },
                      '& td': { borderBottom: isInlineOpen ? 'none' : '1px solid #f1f5f9' },
                    }}
                  >
                    {/* Order ID & Avatar */}
                    <TableCell sx={{ py: 1.2, ...getColumnWidthSx('orderId') }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleInlineEdit(order)}
                          sx={{
                            color: isInlineOpen ? '#2563eb' : '#64748b',
                            p: 0.5,
                          }}
                        >
                          {isInlineOpen ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
                        </IconButton>
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            fontSize: 14,
                            bgcolor: '#2563eb',
                            color: '#ffffff',
                            fontWeight: 700,
                          }}
                        >
                          {initialLetter}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap variant="body2" fontWeight={700} color="#0f172a">
                            {orderId}
                          </Typography>
                          <Typography variant="caption" color="#64748b" display="block">
                            {formatDateOnly(order.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Customer */}
                    <TableCell sx={{ py: 1.2, ...getColumnWidthSx('customer') }}>
                      <Typography noWrap variant="body2" fontWeight={600} color="#0f172a">
                        {order.customer_name || '—'}
                      </Typography>
                      <Typography variant="caption" color="#64748b" display="block">
                        {order.mobile_number || '—'}
                      </Typography>
                    </TableCell>

                    {/* Services */}
                    <TableCell sx={{ py: 1.2, ...getColumnWidthSx('services') }}>
                      {!firstService ? (
                        <Typography variant="body2" color="#94a3b8">—</Typography>
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            flexWrap: 'nowrap',
                            minWidth: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <Chip
                            icon={renderServiceIcon(firstService.iconType)}
                            label={firstService.name}
                            size="small"
                            aria-label={`View garments for ${firstService.name}`}
                            onClick={(event) => openServicesPopup(event, order, firstService.key)}
                            sx={{
                              height: 24,
                              maxWidth: 'calc(100% - 76px)',
                              bgcolor: ORDER_BLUE.soft,
                              color: ORDER_BLUE.text,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRadius: '12px',
                              border: `1px solid ${ORDER_BLUE.border}`,
                              '& .MuiChip-icon': { ml: 0.75 },
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                pr: 1,
                              },
                            }}
                          />
                          {serviceGroups.length > 1 && (
                            <Button
                              size="small"
                              onClick={(event) => openServicesPopup(event, order)}
                              sx={{
                                flexShrink: 0,
                                minWidth: 0,
                                px: 0.75,
                                py: 0.25,
                                textTransform: 'none',
                                whiteSpace: 'nowrap',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: ORDER_BLUE.main,
                                borderRadius: '8px',
                                '&:hover': { bgcolor: ORDER_BLUE.soft },
                              }}
                            >
                              +{serviceGroups.length - 1} More
                            </Button>
                          )}
                        </Box>
                      )}
                    </TableCell>

                    {/* Total Amount & Balance */}
                    <TableCell sx={{ py: 1.2, ...getColumnWidthSx('total') }}>
                      <Typography noWrap variant="body2" fontWeight={800} color="#0f172a">
                        {currencySymbol}{MONEY(order.total_amount ?? 0)}
                      </Typography>
                      <Typography variant="caption" color="#64748b" display="block">
                        Bal: {currencySymbol}{MONEY(order.balance_due ?? 0)}
                      </Typography>
                    </TableCell>

                    {/* Status Pill Badge with Dot */}
                    <TableCell sx={{ py: 1.2, ...getColumnWidthSx('status') }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.8,
                          px: 1.5,
                          py: 0.4,
                          borderRadius: '20px',
                          bgcolor: stStyle.bg,
                          border: `1px solid ${stStyle.border}`,
                          color: stStyle.text,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: stStyle.dot,
                          }}
                        />
                        {status}
                      </Box>
                    </TableCell>

                    {/* Order Date */}
                    <TableCell sx={{ py: 1.2, ...getColumnWidthSx('date') }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155' }}>
                        <CalendarTodayOutlined sx={{ fontSize: 15, color: '#64748b' }} />
                        <Typography noWrap variant="body2" color="#334155" fontSize="0.82rem">
                          {formatDateTime(order.created_at)}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Actions */}
                    <TableCell sx={{ py: 1.2, textAlign: 'center', ...getColumnWidthSx('actions') }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        {/* Edit Action */}
                        <Tooltip title="Inline Edit Order">
                          <IconButton
                            size="small"
                            onClick={() => handleToggleInlineEdit(order)}
                            sx={{ color: '#2563eb', p: 0.7 }}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* View Action */}
                        {onOpenViewOrder && (
                          <Tooltip title="View Order Details">
                            <IconButton
                              size="small"
                              onClick={() => onOpenViewOrder(order)}
                              sx={{ color: '#475569', p: 0.7 }}
                            >
                              <VisibilityOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Thermal Receipt Action */}
                        {onOpenReceipt && (
                          <Tooltip title="Print Receipt">
                            <IconButton
                              size="small"
                              onClick={() => onOpenReceipt(order)}
                              sx={{ color: '#2563eb', p: 0.7 }}
                            >
                              <ReceiptLongOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Delete Action in Red */}
                        {onDelete && (
                          <Tooltip title="Delete Order">
                            <IconButton
                              size="small"
                              onClick={() => onDelete(orderId)}
                              sx={{ color: '#dc2626', p: 0.7 }}
                            >
                              <DeleteOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* ── EXPANDED INLINE EDIT PANEL (WITH HORIZONTAL STEPPER TABS) ── */}
                  {isInlineOpen && inlineDraft && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0, bgcolor: '#eff6ff', borderBottom: '2px solid #2563eb' }}>
                        <Collapse in timeout="auto" unmountOnExit>
                          <Box sx={{ borderTop: '1px solid #bfdbfe', overflow: 'visible', minWidth: 0 }}>
                            {/* 1. Header Bar: Edit Order Title + Pipeline Status Pills + Buttons */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid #bfdbfe',
                                bgcolor: '#eff6ff',
                                flexWrap: 'wrap',
                                gap: 1,
                              }}
                            >
                              {/* Left: Edit Icon + Title + Pipeline Status Pills */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleInlineEdit(order)}
                                    sx={{ p: 0.5, color: '#0f172a', mr: 0.5 }}
                                    title="Close edit"
                                  >
                                    <ArrowBack fontSize="small" />
                                  </IconButton>
                                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                    Edit Order – {orderId}
                                  </Typography>
                                </Box>

                                {/* Pipeline Status Pills */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap', ml: { xs: 0, sm: 1 } }}>
                                  {[
                                    'Order Received',
                                    'In Progress',
                                    'Ready',
                                    'Delivered',
                                    'Cancelled',
                                  ].map((st) => {
                                    const conf = STATUS_CONFIG[st] || STATUS_CONFIG['Order Received'];
                                    const isActive = normalizeOrdersV2Status(inlineDraft.order_status || inlineDraft.status) === st;
                                    return (
                                      <Chip
                                        key={st}
                                        label={`• ${st}`}
                                        size="small"
                                        onClick={() => handleInlineStatusChange(st)}
                                        clickable
                                        sx={{
                                          fontSize: '0.78rem',
                                          fontWeight: 700,
                                          height: 26,
                                          px: 0.5,
                                          borderRadius: '20px',
                                          bgcolor: isActive ? conf.bg : '#ffffff',
                                          color: conf.text,
                                          border: `1.5px solid ${isActive ? conf.dot : conf.border}`,
                                          boxShadow: isActive ? `0 1px 4px ${conf.border}` : 'none',
                                          '&:hover': {
                                            bgcolor: conf.bg,
                                          },
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                              </Box>

                              {/* Right: Cancel & Confirm Changes buttons */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleToggleInlineEdit(order)}
                                  startIcon={<Close />}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    color: '#334155',
                                    bgcolor: '#ffffff',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '8px',
                                    px: 1.8,
                                    py: 0.6,
                                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={handleSaveInlineEdit}
                                  disabled={isSavingInline}
                                  startIcon={<Check />}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    bgcolor: '#2563eb',
                                    color: '#ffffff',
                                    borderRadius: '8px',
                                    px: 2,
                                    py: 0.6,
                                    boxShadow: 'none',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                  }}
                                >
                                  {isSavingInline ? 'Saving...' : 'Confirm Changes'}
                                </Button>
                              </Box>
                            </Box>

                            {/* 2. Horizontal Stepper Tabs Navigation Bar */}
                            <Box ref={tabHeaderRef} className="orders-v2-inline-tabs">
                              <Box className="orders-v2-inline-tabs-track">
                                {HORIZONTAL_TABS.map((tab) => {
                                  const isSelected = activeTab === tab.id;
                                  return (
                                    <Box
                                      key={tab.id}
                                      ref={isSelected ? activeTabRef : null}
                                      role="tab"
                                      aria-selected={isSelected}
                                      className={`orders-v2-inline-tab${isSelected ? ' orders-v2-inline-tab-active' : ''}`}
                                      onClick={() => setActiveTab(tab.id)}
                                    >
                                      <Box className="orders-v2-inline-tab-icon">{tab.icon}</Box>
                                      <span className="orders-v2-inline-tab-label" data-label={tab.label}>
                                        <span>{tab.label}</span>
                                      </span>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>

                            {/* 3. Main Tab Contents Area */}
                            <Box
                              className={activeTab === 'review' ? 'orders-v2-review-content' : undefined}
                              sx={{ p: { xs: 1.5, md: 2 }, bgcolor: '#f8fafc', minWidth: 0 }}
                            >
                              {/* ══════════════════════════════════════════════════════════
                                  TAB 1: CUSTOMER DETAILS
                                  (Customer name*, Phone no*, Address (optional),
                                   Walk-in / On-call customer toggle,
                                   On-call pickup datetime* & delivery datetime,
                                   Attending staff name, Driver/Pickup person)
                                 ══════════════════════════════════════════════════════════ */}
                              {activeTab === 'customer' && (
                                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                                    <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <PersonOutlined fontSize="small" />
                                    </Box>
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Customer & Intake Details
                                      </Typography>
                                      <Typography variant="caption" color="#64748b">
                                        Enter or update customer information, intake method, and assignment.
                                      </Typography>
                                    </Box>
                                  </Box>

                                  {/* Walk-in vs On-Call Customer Selection */}
                                  <Box sx={{ mb: 2.5 }}>
                                    <Typography variant="caption" fontWeight={700} color="#475569" display="block" mb={1}>
                                      Customer Intake Method
                                    </Typography>
                                    <Grid container spacing={2}>
                                      <Grid item xs={12} sm={6}>
                                        <Box
                                          onClick={() => {
                                            setInlineDraft({ ...inlineDraft, order_type: 'Walk-In' });
                                            setInlineAddressError('');
                                          }}
                                          sx={{
                                            p: 1.8,
                                            border: '2px solid',
                                            borderColor: inlineDraft.order_type === 'Walk-In' ? '#2563eb' : '#e2e8f0',
                                            bgcolor: inlineDraft.order_type === 'Walk-In' ? '#eff6ff' : '#ffffff',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            transition: 'all 0.15s ease',
                                          }}
                                        >
                                          <DirectionsWalkOutlined sx={{ color: inlineDraft.order_type === 'Walk-In' ? '#2563eb' : '#64748b', fontSize: 26 }} />
                                          <Box>
                                            <Typography variant="body2" fontWeight={800} color={inlineDraft.order_type === 'Walk-In' ? '#1d4ed8' : '#0f172a'}>
                                              Walk-In Customer
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                              Direct counter drop & store pickup
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Grid>

                                      <Grid item xs={12} sm={6}>
                                        <Box
                                          onClick={() => {
                                            setInlineDraft({ ...inlineDraft, order_type: 'On-Call (Pickup)' });
                                            setInlineAddressError('');
                                          }}
                                          sx={{
                                            p: 1.8,
                                            border: '2px solid',
                                            borderColor: isOnCallOrderType(inlineDraft.order_type) ? '#2563eb' : '#e2e8f0',
                                            bgcolor: isOnCallOrderType(inlineDraft.order_type) ? '#eff6ff' : '#ffffff',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            transition: 'all 0.15s ease',
                                          }}
                                        >
                                          <CallOutlined sx={{ color: isOnCallOrderType(inlineDraft.order_type) ? '#2563eb' : '#64748b', fontSize: 26 }} />
                                          <Box>
                                            <Typography variant="body2" fontWeight={800} color={isOnCallOrderType(inlineDraft.order_type) ? '#1d4ed8' : '#0f172a'}>
                                              On-Call Customer
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                              Requires scheduled pickup & doorstep delivery
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  </Box>

                                  <Grid container spacing={2}>
                                    {/* Customer Name* */}
                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                        Customer Name *
                                      </Typography>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.customer_name || ''}
                                        onChange={(e) => setInlineDraft({ ...inlineDraft, customer_name: e.target.value })}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <PersonOutlined fontSize="small" sx={{ color: '#64748b' }} />
                                            </InputAdornment>
                                          ),
                                          endAdornment: inlineDraft.customer_name?.trim() ? (
                                            <InputAdornment position="end">
                                              <CheckCircle fontSize="small" sx={{ color: '#2563eb' }} />
                                            </InputAdornment>
                                          ) : null,
                                          sx: { borderRadius: '8px', fontSize: '0.88rem' },
                                        }}
                                      />
                                    </Grid>

                                    {/* Phone No* */}
                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                        Phone No *
                                      </Typography>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.mobile_number || ''}
                                        onChange={(e) => setInlineDraft({ ...inlineDraft, mobile_number: e.target.value })}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <PhoneOutlined fontSize="small" sx={{ color: '#64748b' }} />
                                            </InputAdornment>
                                          ),
                                          endAdornment: inlineDraft.mobile_number?.trim() ? (
                                            <InputAdornment position="end">
                                              <CheckCircle fontSize="small" sx={{ color: '#2563eb' }} />
                                            </InputAdornment>
                                          ) : null,
                                          sx: { borderRadius: '8px', fontSize: '0.88rem' },
                                        }}
                                      />
                                    </Grid>

                                    {/* Address (required for On-Call, optional for Walk-In) */}
                                    <Grid item xs={12}>
                                      <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                        Address {isOnCallOrderType(inlineDraft.order_type) ? '* required' : '(optional)'}
                                      </Typography>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Enter customer address or landmark..."
                                        value={inlineDraft.address || ''}
                                        onChange={(e) => {
                                          setInlineDraft({ ...inlineDraft, address: e.target.value });
                                          if (e.target.value.trim()) setInlineAddressError('');
                                        }}
                                        error={Boolean(inlineAddressError)}
                                        helperText={inlineAddressError}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <LocationOnOutlined fontSize="small" sx={{ color: '#64748b' }} />
                                            </InputAdornment>
                                          ),
                                          endAdornment: inlineDraft.address?.trim() ? (
                                            <InputAdornment position="end">
                                              <CheckCircle fontSize="small" sx={{ color: '#2563eb' }} />
                                            </InputAdornment>
                                          ) : null,
                                          sx: { borderRadius: '8px', fontSize: '0.88rem' },
                                        }}
                                      />
                                    </Grid>

                                    {/* Pickup (On-Call) and delivery scheduling fields */}
                                    <Grid item xs={12}>
                                      <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: '10px', border: '1.5px solid #bfdbfe' }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="#1d4ed8" mb={1.5} display="flex" alignItems="center" gap={1}>
                                          {isOnCallOrderType(inlineDraft.order_type) ? <CallOutlined fontSize="small" /> : <LocalShippingOutlined fontSize="small" />}
                                          {isOnCallOrderType(inlineDraft.order_type) ? 'On-Call Scheduling Requirements' : 'Delivery Date & Time (optional)'}
                                        </Typography>
                                        <Grid container spacing={2}>
                                          {isOnCallOrderType(inlineDraft.order_type) && (
                                            <Grid item xs={12} sm={6}>
                                              <Typography variant="caption" fontWeight={700} color="#1d4ed8" display="block" mb={0.5}>
                                                Schedule Pickup Date &amp; Time *
                                              </Typography>
                                              <Grid container spacing={1}>
                                                <Grid item xs={6}>
                                                  <TextField
                                                    fullWidth
                                                    type="date"
                                                    size="small"
                                                    value={inlineDraft.scheduled_pickup_date || ''}
                                                    onChange={(e) => setInlineDraft({ ...inlineDraft, scheduled_pickup_date: e.target.value })}
                                                    InputProps={{ sx: { bgcolor: '#ffffff', borderRadius: '8px' } }}
                                                  />
                                                </Grid>
                                                <Grid item xs={6}>
                                                  <TextField
                                                    fullWidth
                                                    type="time"
                                                    size="small"
                                                    value={inlineDraft.scheduled_pickup_time || ''}
                                                    onChange={(e) => setInlineDraft({ ...inlineDraft, scheduled_pickup_time: e.target.value })}
                                                    InputProps={{ sx: { bgcolor: '#ffffff', borderRadius: '8px' } }}
                                                  />
                                                </Grid>
                                              </Grid>
                                            </Grid>
                                          )}

                                          <Grid item xs={12} sm={isOnCallOrderType(inlineDraft.order_type) ? 6 : 12}>
                                            <Typography variant="caption" fontWeight={700} color="#1d4ed8" display="block" mb={0.5}>
                                              Schedule Delivery Date &amp; Time (optional)
                                            </Typography>
                                            <Grid container spacing={1}>
                                              <Grid item xs={6}>
                                                <TextField
                                                  fullWidth
                                                  type="date"
                                                  size="small"
                                                  value={inlineDraft.scheduled_delivery_date || ''}
                                                  onChange={(e) => {
                                                    setInlineDraft({ ...inlineDraft, scheduled_delivery_date: e.target.value });
                                                    if (inlineScheduleErrors.scheduled_delivery_at) {
                                                      setInlineScheduleErrors((prev) => ({ ...prev, scheduled_delivery_at: '' }));
                                                    }
                                                  }}
                                                  error={Boolean(inlineScheduleErrors.scheduled_delivery_at)}
                                                  helperText={inlineScheduleErrors.scheduled_delivery_at}
                                                  InputProps={{ sx: { bgcolor: '#ffffff', borderRadius: '8px' } }}
                                                />
                                              </Grid>
                                              <Grid item xs={6}>
                                                <TextField
                                                  fullWidth
                                                  type="time"
                                                  size="small"
                                                  value={inlineDraft.scheduled_delivery_time || ''}
                                                  onChange={(e) => {
                                                    setInlineDraft({ ...inlineDraft, scheduled_delivery_time: e.target.value });
                                                    if (inlineScheduleErrors.scheduled_delivery_at) {
                                                      setInlineScheduleErrors((prev) => ({ ...prev, scheduled_delivery_at: '' }));
                                                    }
                                                  }}
                                                  error={Boolean(inlineScheduleErrors.scheduled_delivery_at)}
                                                  helperText={inlineScheduleErrors.scheduled_delivery_at}
                                                  InputProps={{ sx: { bgcolor: '#ffffff', borderRadius: '8px' } }}
                                                />
                                              </Grid>
                                            </Grid>
                                          </Grid>
                                        </Grid>
                                      </Box>
                                    </Grid>

                                    {/* Attending Staff Name */}
                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                        Attend Staff Name
                                      </Typography>
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.assigned_staff || inlineDraft.attend_staff_name || 'Counter Staff'}
                                        onChange={(e) => {
                                          const chosenStaff = e.target.value;
                                          const matched = staffList.find((s) => s.name === chosenStaff);
                                          setInlineDraft({
                                            ...inlineDraft,
                                            assigned_staff: chosenStaff,
                                            attend_staff_name: chosenStaff,
                                            attend_staff_id: matched?.uniqueId || matched?.id || null,
                                          });
                                        }}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <BadgeOutlined fontSize="small" sx={{ color: '#64748b' }} />
                                            </InputAdornment>
                                          ),
                                          sx: { borderRadius: '8px' },
                                        }}
                                      >
                                        <MenuItem value="Counter Staff">
                                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                              Counter Staff
                                            </Typography>
                                            <Chip
                                              label="Default"
                                              size="small"
                                              sx={{
                                                height: 20,
                                                fontSize: '0.68rem',
                                                fontWeight: 600,
                                                bgcolor: '#f8fafc',
                                                color: '#64748b',
                                                border: '1px solid #e2e8f0',
                                              }}
                                            />
                                          </Box>
                                        </MenuItem>
                                        {staffList.map((s) => (
                                          <MenuItem key={s.id || s.uniqueId || s.name} value={s.name}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                                {s.name}
                                              </Typography>
                                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                                                {(s.uniqueId || s.id) && (
                                                  <Chip
                                                    label={`ID: ${s.uniqueId || s.id}`}
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: '0.68rem',
                                                      fontWeight: 700,
                                                      bgcolor: '#eff6ff',
                                                      color: '#1d4ed8',
                                                      border: '1px solid #bfdbfe',
                                                    }}
                                                  />
                                                )}
                                                {s.zone && (
                                                  <Chip
                                                    label={`Zone: ${s.zone}`}
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: '0.68rem',
                                                      fontWeight: 600,
                                                      bgcolor: '#f1f5f9',
                                                      color: '#475569',
                                                      border: '1px solid #e2e8f0',
                                                    }}
                                                  />
                                                )}
                                                {s.city && (
                                                  <Chip
                                                    label={`City: ${s.city}`}
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: '0.68rem',
                                                      fontWeight: 600,
                                                      bgcolor: '#fef3c7',
                                                      color: '#92400e',
                                                      border: '1px solid #fde68a',
                                                    }}
                                                  />
                                                )}
                                              </Box>
                                            </Box>
                                          </MenuItem>
                                        ))}
                                        {inlineDraft.assigned_staff && inlineDraft.assigned_staff !== 'Counter Staff' && !staffList.some((s) => s.name === inlineDraft.assigned_staff) && (
                                          <MenuItem value={inlineDraft.assigned_staff}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                                {inlineDraft.assigned_staff}
                                              </Typography>
                                              <Chip
                                                label="Assigned"
                                                size="small"
                                                sx={{
                                                  height: 20,
                                                  fontSize: '0.68rem',
                                                  fontWeight: 600,
                                                  bgcolor: '#f1f5f9',
                                                  color: '#475569',
                                                  border: '1px solid #e2e8f0',
                                                }}
                                              />
                                            </Box>
                                          </MenuItem>
                                        )}
                                      </TextField>
                                    </Grid>

                                    {/* Order Pickup & Delivery Person Name */}
                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                        Order Pickup &amp; Delivery Person Name
                                      </Typography>
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.assigned_driver || inlineDraft.assigned_pickup_delivery_person || ''}
                                        onChange={(e) => {
                                          const chosenDriver = e.target.value;
                                          const matched = driverList.find((d) => d.name === chosenDriver);
                                          setInlineDraft({
                                            ...inlineDraft,
                                            assigned_driver: chosenDriver,
                                            assigned_pickup_delivery_person: chosenDriver,
                                            assigned_pickup_person_id: matched?.uniqueId || matched?.id || null,
                                            assigned_pickup_person_city: matched?.city || '',
                                            assigned_pickup_person_zone: matched?.zone || '',
                                          });
                                        }}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <LocalShippingOutlined fontSize="small" sx={{ color: '#64748b' }} />
                                            </InputAdornment>
                                          ),
                                          sx: { borderRadius: '8px' },
                                        }}
                                      >
                                        <MenuItem value="">
                                          <em>Not Assigned</em>
                                        </MenuItem>
                                        {driverList.map((d) => (
                                          <MenuItem key={d.id || d.uniqueId || d.name} value={d.name}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                                {d.name}
                                              </Typography>
                                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                                                {(d.uniqueId || d.id) && (
                                                  <Chip
                                                    label={`ID: ${d.uniqueId || d.id}`}
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: '0.68rem',
                                                      fontWeight: 700,
                                                      bgcolor: '#ecfdf5',
                                                      color: '#047857',
                                                      border: '1px solid #a7f3d0',
                                                    }}
                                                  />
                                                )}
                                                {d.zone && (
                                                  <Chip
                                                    label={`Zone: ${d.zone}`}
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: '0.68rem',
                                                      fontWeight: 600,
                                                      bgcolor: '#f1f5f9',
                                                      color: '#475569',
                                                      border: '1px solid #e2e8f0',
                                                    }}
                                                  />
                                                )}
                                                {d.city && (
                                                  <Chip
                                                    label={`City: ${d.city}`}
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: '0.68rem',
                                                      fontWeight: 600,
                                                      bgcolor: '#fef3c7',
                                                      color: '#92400e',
                                                      border: '1px solid #fde68a',
                                                    }}
                                                  />
                                                )}
                                              </Box>
                                            </Box>
                                          </MenuItem>
                                        ))}
                                        {inlineDraft.assigned_driver && inlineDraft.assigned_driver !== 'Counter Staff' && !driverList.some((d) => d.name === inlineDraft.assigned_driver) && (
                                          <MenuItem value={inlineDraft.assigned_driver}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                                {inlineDraft.assigned_driver}
                                              </Typography>
                                              <Chip
                                                label="Assigned"
                                                size="small"
                                                sx={{
                                                  height: 20,
                                                  fontSize: '0.68rem',
                                                  fontWeight: 600,
                                                  bgcolor: '#f1f5f9',
                                                  color: '#475569',
                                                  border: '1px solid #e2e8f0',
                                                }}
                                              />
                                            </Box>
                                          </MenuItem>
                                        )}
                                      </TextField>
                                    </Grid>
                                  </Grid>

                                  {/* Tab 1 Footer Actions */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3, mt: 3, borderTop: '1px solid #f1f5f9' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                      {inlineDraft.customer_name?.trim() && inlineDraft.mobile_number?.trim() ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#2563eb' }}>
                                          <CheckCircle sx={{ fontSize: 18 }} />
                                          <Typography variant="caption" fontWeight={700} color="#2563eb">
                                            Customer details are valid.
                                          </Typography>
                                        </Box>
                                      ) : (
                                        <Typography variant="caption" color="#dc2626">
                                          Please enter Customer Name and Phone Number.
                                        </Typography>
                                      )}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleNextTab}
                                        endIcon={<ArrowForward />}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px', px: 2 }}
                                      >
                                        Next: Order Details
                                      </Button>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSaveInlineEdit}
                                        disabled={isSavingInline}
                                        startIcon={<Check />}
                                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', color: '#ffffff', borderRadius: '8px', px: 2 }}
                                      >
                                        Confirm Changes
                                      </Button>
                                    </Box>
                                  </Box>
                                </Paper>
                              )}

                              {/* ══════════════════════════════════════════════════════════
                                  TAB 2: ORDER DETAILS
                                  (Exact single-row two-grid columns layout matching reference image 2)
                                 ══════════════════════════════════════════════════════════ */}
                          {activeTab === 'order' && (
  <Box>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
        gap: { xs: 1.5, md: 2 },
        width: '100%',
        minWidth: 0,
        height: { xs: 'auto', md: 540 },
        minHeight: 0,
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      {/* ───────── LEFT: Cloth Selection & Catalog ───────── */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          minWidth: 0,
          minHeight: 0,
          height: { xs: 520, md: '100%' },
          p: 2,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: ORDER_BLUE.soft, color: ORDER_BLUE.main, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckroomOutlined />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a" noWrap>Cloth Selection &amp; Catalog</Typography>
              <Typography variant="caption" color="#64748b" display="block" noWrap>Select garments, set service, quantity and add to order</Typography>
            </Box>
          </Box>
          <Chip label={`${filteredCatalog.length} Items`} size="small" sx={{ bgcolor: ORDER_BLUE.soft, color: ORDER_BLUE.text, fontWeight: 700, flexShrink: 0 }} />
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="Search garments (e.g., shirt, saree, jeans, towel...)"
          value={catalogSearch}
          onChange={(e) => setCatalogSearch(e.target.value)}
          InputProps={{
            startAdornment: (<InputAdornment position="start"><Search fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment>),
            sx: {
              borderRadius: '8px',
              fontSize: '0.85rem',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ORDER_BLUE.main, borderWidth: 1 },
            },
          }}
          sx={{ mb: 1, flexShrink: 0 }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0, mb: 1, flexShrink: 0 }}>
          {CLOTH_CATEGORIES.map((cat) => {
            const active = catalogCategory === cat;
            return (
              <Chip
                key={cat}
                label={cat}
                size="small"
                clickable
                onClick={() => setCatalogCategory(cat)}
                sx={{
                  fontWeight: active ? 700 : 500,
                  flexShrink: 0,
                  bgcolor: active ? ORDER_BLUE.main : '#fff',
                  color: active ? '#fff' : '#475569',
                  border: '1px solid',
                  borderColor: active ? ORDER_BLUE.main : '#e2e8f0',
                  '&:hover': { bgcolor: active ? ORDER_BLUE.dark : ORDER_BLUE.soft },
                }}
              />
            );
          })}
        </Box>

        <Box
          sx={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            pr: 1,
            ...ORDER_SCROLLBAR_SX,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
              gap: 1,
              alignItems: 'stretch',
            }}
          >
            {filteredCatalog.map((prod) => {
              const isSelected = selectedProduct?.id === prod.id;
              return (
                <Box
                  key={prod.id}
                  onClick={() => { setSelectedProduct(prod); setItemRate(prod.price || 15); }}
                  sx={{
                    position: 'relative',
                    p: 1,
                    borderRadius: '10px',
                    border: '1.5px solid',
                    borderColor: isSelected ? ORDER_BLUE.main : '#e2e8f0',
                    bgcolor: isSelected ? ORDER_BLUE.soft : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.35,
                    minWidth: 0,
                    height: '100%',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    '&:hover': { borderColor: isSelected ? ORDER_BLUE.main : ORDER_BLUE.border },
                  }}
                >
                  {isSelected && (
                    <CheckCircle sx={{ position: 'absolute', top: 6, right: 6, fontSize: 18, color: ORDER_BLUE.main }} />
                  )}
                  <ClothIllustration itemId={prod.id} size={38} />
                  <Typography variant="body2" fontWeight={700} fontSize="0.84rem" noWrap sx={{ maxWidth: '100%' }}>
                    {prod.name}
                  </Typography>
                  <Typography variant="caption" color="#475569" noWrap>
                    {currencySymbol}{prod.price} / {prod.unit || 'piece'}
                  </Typography>
                  <Button
                    fullWidth
                    size="small"
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={(e) => { e.stopPropagation(); handleAddGarmentToCart(prod); }}
                    sx={{
                      mt: 'auto', py: 0.3, fontSize: '0.76rem', fontWeight: 700, textTransform: 'none', borderRadius: '6px',
                      boxShadow: 'none',
                      ...(isSelected
                        ? { bgcolor: ORDER_BLUE.main, color: '#fff', '&:hover': { bgcolor: ORDER_BLUE.dark } }
                        : { color: ORDER_BLUE.main, borderColor: '#cbd5e1', '&:hover': { borderColor: ORDER_BLUE.main, bgcolor: ORDER_BLUE.soft } }),
                    }}
                  >
                    + Add
                  </Button>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* ───────── RIGHT: Selected Item Details + Cart ───────── */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          minWidth: 0,
          minHeight: 0,
          height: { xs: 520, md: '100%' },
          p: 2,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2, flexShrink: 0 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: ORDER_BLUE.soft, color: ORDER_BLUE.main, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingCartOutlined />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" noWrap>Selected Item Details</Typography>
            <Typography variant="caption" color="#64748b" display="block" noWrap>Choose a service, review items and adjust quantities</Typography>
          </Box>
        </Box>

        {selectedProduct && (
          <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1, mb: 1.2, flexShrink: 0 }}>
            <ClothIllustration itemId={selectedProduct.id} size={34} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={800} noWrap>{selectedProduct.name}</Typography>
                <Chip label={selectedProduct.category} size="small" sx={{ bgcolor: ORDER_BLUE.soft, color: ORDER_BLUE.text, fontWeight: 600, fontSize: '0.7rem', height: 20 }} />
              </Box>
              <Typography variant="caption" color="#64748b" display="block" noWrap>
                Base Rate: {currencySymbol}{selectedProduct.price} / {selectedProduct.unit || 'piece'}
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 1.2, flexShrink: 0 }}>
          <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.4}>
            Service Type <span style={{ color: '#dc2626' }}>*</span>
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              select
              fullWidth
              size="small"
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              disabled={isLoadingServiceTypes}
              SelectProps={{
                MenuProps: { PaperProps: { sx: { maxHeight: 280, borderRadius: '10px', ...ORDER_SCROLLBAR_SX } } },
                renderValue: (val) => {
                  const svc = serviceTypes.find((s) => s.name === val || s.id === val);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {renderServiceIcon(svc?.iconType || 'custom')}
                      <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc?.name || val}</Box>
                    </Box>
                  );
                },
              }}
              sx={{
                minWidth: 0,
                '& .MuiOutlinedInput-root': { height: 38, borderRadius: '8px', fontSize: '0.85rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: ORDER_BLUE.border },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ORDER_BLUE.main, borderWidth: 1 },
                '& .MuiSelect-select': {
                  py: 0,
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 'unset !important',
                  height: '38px',
                },
              }}
            >
              {serviceTypes.map((svc) => (
                <MenuItem
                  key={svc.id}
                  value={svc.name}
                  dense
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontSize: '0.85rem' }}
                >
                  {renderServiceIcon(svc.iconType)}
                  <Box sx={{ flex: 1, minWidth: 0, color: svc.isCustom ? ORDER_BLUE.main : 'inherit', fontWeight: svc.isCustom ? 600 : 400 }} noWrap>
                    {svc.name}
                  </Box>
                  {svc.isCustom && (
                    <>
                      <Tooltip title={`Edit ${svc.name}`}>
                        <IconButton
                          size="small"
                          aria-label={`Edit ${svc.name}`}
                          onClick={(e) => { e.stopPropagation(); openEditServiceTypeModal(svc); }}
                          sx={{ color: ORDER_BLUE.main, p: 0.4, '&:hover': { bgcolor: ORDER_BLUE.soft } }}
                        >
                          <EditOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={`Delete ${svc.name}`}>
                        <IconButton
                          size="small"
                          aria-label={`Delete ${svc.name}`}
                          onClick={(e) => { e.stopPropagation(); setServiceTypeToDelete(svc); }}
                          sx={{ color: '#ef4444', p: 0.4, '&:hover': { bgcolor: '#fef2f2' } }}
                        >
                          <DeleteOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {selectedServiceType === svc.name && <Check sx={{ fontSize: 16, color: ORDER_BLUE.main }} />}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={openAddServiceTypeModal}
              sx={{
                height: 38,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                px: 1.4,
                borderRadius: '8px',
                borderColor: ORDER_BLUE.main,
                color: ORDER_BLUE.main,
                '&:hover': { borderColor: ORDER_BLUE.dark, bgcolor: ORDER_BLUE.soft },
              }}
            >
              Add Service Type
            </Button>
          </Box>

          {serviceTypeNotice && (
            <Alert
              severity={serviceTypeNotice.severity}
              onClose={() => setServiceTypeNotice(null)}
              sx={{ mt: 1, borderRadius: '8px', fontSize: '0.76rem', py: 0, '& .MuiAlert-message': { py: 0.75 } }}
            >
              {serviceTypeNotice.text}
            </Alert>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1, flexShrink: 0 }}>
          <Typography variant="subtitle2" fontWeight={800} display="flex" alignItems="center" gap={0.8} noWrap>
            <ShoppingCartOutlined sx={{ fontSize: 18, color: ORDER_BLUE.main }} />
            Current Cart Items ({inlineCart.length})
          </Typography>
          <Chip label={`${inlineTotalCount} pcs total`} size="small" sx={{ bgcolor: ORDER_BLUE.soft, color: ORDER_BLUE.text, fontWeight: 700, fontSize: '0.72rem', height: 22, flexShrink: 0 }} />
        </Box>

        <Box
          sx={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            ...ORDER_SCROLLBAR_SX,
          }}
        >
          {inlineCart.map((c, idx) => (
            <Box
              key={c.id || idx}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                p: 0.8, borderBottom: idx === inlineCart.length - 1 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                <ClothIllustration itemId={c.itemId || 'shirt'} size={28} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} fontSize="0.84rem" noWrap>
                    {c.name} × {c.qty}
                  </Typography>
                  <Typography variant="caption" color="#64748b" display="block" noWrap>{c.serviceType || '—'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}>
                <Tooltip title="Decrease quantity">
                  <IconButton size="small" aria-label="Decrease quantity" onClick={() => handleUpdateItemQty(idx, -1)} sx={{ border: '1px solid #e2e8f0', width: 24, height: 24, '&:hover': { borderColor: ORDER_BLUE.main, bgcolor: ORDER_BLUE.soft } }}>
                    <Remove sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Increase quantity">
                  <IconButton size="small" aria-label="Increase quantity" onClick={() => handleUpdateItemQty(idx, 1)} sx={{ border: '1px solid #e2e8f0', width: 24, height: 24, '&:hover': { borderColor: ORDER_BLUE.main, bgcolor: ORDER_BLUE.soft } }}>
                    <Add sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                  <Typography variant="body2" fontWeight={800} sx={{ minWidth: 64, textAlign: 'right', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {currencySymbol}{MONEY(toFiniteNumber(c.rate ?? c.price, 0) * toFiniteNumber(c.qty ?? c.quantity, 0))}
                </Typography>
                <Tooltip title="Remove item">
                  <IconButton size="small" aria-label="Remove item" onClick={() => handleRemoveCartItem(idx)} sx={{ color: '#ef4444', p: 0.4, '&:hover': { bgcolor: '#fef2f2' } }}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
          {inlineCart.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
              <Typography variant="caption">No garments added yet.</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 1, flexShrink: 0, bgcolor: ORDER_BLUE.soft, border: '1px solid', borderColor: ORDER_BLUE.border, borderRadius: '8px', p: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={800} color={ORDER_BLUE.text}>Estimated Subtotal</Typography>
          <Typography variant="h6" fontWeight={800} color={ORDER_BLUE.text}>{currencySymbol}{MONEY(inlineSubtotal)}</Typography>
        </Box>
      </Paper>
    </Box>

    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        mt: 2,
        py: 1.5,
        px: { xs: 1.5, md: 2 },
        bgcolor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -2px 8px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Button variant="outlined" size="small" onClick={handlePrevTab} startIcon={<ArrowBack />} sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, color: '#334155', borderColor: '#cbd5e1', bgcolor: '#fff' }}>
        Back
      </Button>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={handleNextTab} endIcon={<ArrowForward />} sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, borderColor: '#cbd5e1', color: '#0f172a', bgcolor: '#fff' }}>
          Next: Garment Inspection
        </Button>
        <Button variant="contained" size="small" onClick={handleSaveInlineEdit} disabled={isSavingInline} startIcon={<Check />} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ORDER_BLUE.main, borderRadius: '8px', px: 2.5, '&:hover': { bgcolor: ORDER_BLUE.dark } }}>
          Confirm Changes
        </Button>
      </Box>
    </Box>

    <Dialog
      open={isAddServiceModalOpen}
      onClose={closeServiceTypeModal}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              {serviceTypeModalMode === 'edit' ? 'Edit Service Type' : 'Add Service Type'}
            </Typography>
            <Typography variant="caption" color="#64748b">
              {serviceTypeModalMode === 'edit' ? 'Changes are saved to the service type master' : 'Create a service type for garment selection'}
            </Typography>
          </Box>
          <IconButton size="small" aria-label="Close" onClick={closeServiceTypeModal}><Close fontSize="small" /></IconButton>
        </Box>

        <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
          Service Type Name <span style={{ color: '#dc2626' }}>*</span>
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="e.g. Curtain Cleaning"
          value={newServiceTypeName}
          onChange={(e) => setNewServiceTypeName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveServiceType(); }}
          InputProps={{
            sx: {
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ORDER_BLUE.main },
            },
          }}
        />

        <Typography variant="caption" fontWeight={700} color="#334155" display="block" mt={2} mb={0.75}>
          Icon
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {SERVICE_ICON_OPTIONS.map((option) => {
            const active = newServiceTypeIcon === option.value;
            return (
              <Chip
                key={option.value}
                label={option.label}
                size="small"
                clickable
                icon={renderServiceIcon(option.value)}
                onClick={() => setNewServiceTypeIcon(option.value)}
                sx={{
                  bgcolor: active ? ORDER_BLUE.soft : '#fff',
                  color: active ? ORDER_BLUE.text : '#475569',
                  border: '1px solid',
                  borderColor: active ? ORDER_BLUE.main : '#e2e8f0',
                  fontWeight: active ? 700 : 500,
                  '& .MuiChip-icon': { color: active ? ORDER_BLUE.main : '#94a3b8' },
                }}
              />
            );
          })}
        </Box>

        {serviceTypeNotice?.severity === 'error' && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: '8px', fontSize: '0.78rem' }}>
            {serviceTypeNotice.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2.5 }}>
          <Button variant="outlined" size="small" onClick={closeServiceTypeModal} sx={{ textTransform: 'none', borderRadius: '8px', color: '#334155', borderColor: '#cbd5e1' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!newServiceTypeName.trim() || isSavingServiceType}
            onClick={handleSaveServiceType}
            startIcon={isSavingServiceType ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', bgcolor: ORDER_BLUE.main, px: 3, '&:hover': { bgcolor: ORDER_BLUE.dark } }}
          >
            {serviceTypeModalMode === 'edit' ? 'Save Changes' : 'Add'}
          </Button>
        </Box>
      </Box>
    </Dialog>

    <Dialog
      open={Boolean(serviceTypeToDelete)}
      onClose={() => setServiceTypeToDelete(null)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ fontSize: '1.05rem', fontWeight: 800, pb: 1 }}>Delete Service Type?</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" color="#475569">
          “{serviceTypeToDelete?.name}” will be removed from the service type master. Garments already added to this order keep their assigned service.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button size="small" onClick={() => setServiceTypeToDelete(null)} sx={{ textTransform: 'none', color: '#334155' }}>Cancel</Button>
        <Button size="small" variant="contained" color="error" onClick={handleConfirmDeleteServiceType} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>Delete</Button>
      </DialogActions>
    </Dialog>
  </Box>
)}
                              {/* ══════════════════════════════════════════════════════════
                                  TAB 3: GARMENT-BY-GARMENT INSPECTION & CARE
                                 ══════════════════════════════════════════════════════════ */}
                              {activeTab === 'inspection' && (
                                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                                    <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <LayersOutlined fontSize="small" />
                                    </Box>
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Garment-by-Garment Inspection &amp; Care
                                      </Typography>
                                      <Typography variant="caption" color="#64748b">
                                        Document stains, defects, brand, fabric, and special care instructions for each garment.
                                      </Typography>
                                    </Box>
                                  </Box>

                                  {/* Dynamic Garment Inspection Component */}
                                  <GarmentInspectionSection
                                    cart={inlineCart}
                                    inspections={inspections}
                                    onChangeInspections={setInspections}
                                    showToast={null}
                                  />

                                  {/* Tab 3 Navigation */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3, mt: 3, borderTop: '1px solid #f1f5f9' }}>
                                    <Button variant="outlined" size="small" onClick={handlePrevTab} startIcon={<ArrowBack />} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                                      Back
                                    </Button>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button variant="outlined" size="small" onClick={handleNextTab} endIcon={<ArrowForward />} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                                        Next: Laundry Processing
                                      </Button>
                                      <Button variant="contained" size="small" onClick={handleSaveInlineEdit} disabled={isSavingInline} startIcon={<Check />} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', color: '#ffffff', borderRadius: '8px' }}>
                                        Confirm Changes
                                      </Button>
                                    </Box>
                                  </Box>
                                </Paper>
                              )}

                              {/* ══════════════════════════════════════════════════════════
                                  TAB 4: ORDER INFORMATION AND LAUNDRY PROCESSING
                                 ══════════════════════════════════════════════════════════ */}
                               {activeTab === 'processing' && (
                                 <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.25 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <FactoryOutlined fontSize="small" />
                                    </Box>
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Order Information &amp; Laundry Processing
                                      </Typography>
                                      <Typography variant="caption" color="#64748b">
                                        Configure intake metadata, factory plant dispatch, bag tags, and packaging.
                                      </Typography>
                                    </Box>
                                  </Box>

                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, minmax(0, 1fr))',
                                        md: 'repeat(4, minmax(0, 1fr))',
                                      },
                                      gap: 1.5,
                                    }}
                                  >
                                    <CompactProcessingField label="Processing Priority">
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.priority || ''}
                                        onChange={(e) => setInlineDraft({ ...inlineDraft, priority: e.target.value })}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <FlagOutlined fontSize="small" sx={{ color: '#64748b' }} />
                                            </InputAdornment>
                                          ),
                                          sx: INLINE_PROCESSING_INPUT_SX,
                                        }}
                                        MenuProps={INLINE_PROCESSING_MENU_PROPS}
                                      >
                                        {withCurrentOption(PROCESSING_PRIORITIES, inlineDraft.priority).map((option) => (
                                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                      </TextField>
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Required Factory / Plant" required>
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.factory_plant || ''}
                                        onChange={(e) => setInlineDraft({
                                          ...inlineDraft,
                                          factory_plant: e.target.value,
                                          factory_hub: e.target.value,
                                        })}
                                        InputProps={{ sx: INLINE_PROCESSING_INPUT_SX }}
                                        MenuProps={INLINE_PROCESSING_MENU_PROPS}
                                      >
                                        {withCurrentOption(FACTORY_PLANTS, inlineDraft.factory_plant).map((option) => (
                                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                      </TextField>
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Bag Tag / Crate No.">
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.bag_barcode || ''}
                                        onChange={(e) => setInlineDraft({
                                          ...inlineDraft,
                                          bag_barcode: e.target.value,
                                          dispatch_bag_tag: e.target.value,
                                        })}
                                        placeholder="Not Assigned"
                                        InputProps={{ sx: INLINE_PROCESSING_INPUT_SX }}
                                      />
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Packaging Type">
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.packaging_preference || ''}
                                        onChange={(e) => setInlineDraft({
                                          ...inlineDraft,
                                          packaging_preference: e.target.value,
                                          packaging_type: e.target.value,
                                        })}
                                        InputProps={{ sx: INLINE_PROCESSING_INPUT_SX }}
                                        MenuProps={INLINE_PROCESSING_MENU_PROPS}
                                      >
                                        {withCurrentOption(PACKAGING_TYPES, inlineDraft.packaging_preference).map((option) => (
                                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                      </TextField>
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Expected Delivery Date & Time">
                                      <TextField
                                        type="text"
                                        fullWidth
                                        size="small"
                                        value={
                                          (inlineDraft.scheduled_delivery_date || inlineDraft.scheduled_delivery_time)
                                            ? formatDeliveryInputsForDisplay(inlineDraft.scheduled_delivery_date, inlineDraft.scheduled_delivery_time)
                                            : formatDeliveryDateTimeForDisplay({
                                              target_delivery_date: inlineDraft.target_delivery_date,
                                              expected_delivery: inlineDraft.expected_delivery,
                                              delivery_date: inlineDraft.delivery_date,
                                            })
                                        }
                                        placeholder="Not Scheduled"
                                        InputProps={{ readOnly: true, sx: INLINE_PROCESSING_INPUT_SX }}
                                      />
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Assigned Machine">
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.assigned_machine || ''}
                                        onChange={(e) => setInlineDraft({ ...inlineDraft, assigned_machine: e.target.value })}
                                        InputProps={{ sx: INLINE_PROCESSING_INPUT_SX }}
                                        MenuProps={INLINE_PROCESSING_MENU_PROPS}
                                      >
                                        {withCurrentOption(ASSIGNED_MACHINES, inlineDraft.assigned_machine).map((option) => (
                                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                      </TextField>
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Current Processing Stage">
                                      <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={inlineDraft.processing_stage || ''}
                                        onChange={(e) => setInlineDraft({ ...inlineDraft, processing_stage: e.target.value })}
                                        InputProps={{ sx: INLINE_PROCESSING_INPUT_SX }}
                                        MenuProps={INLINE_PROCESSING_MENU_PROPS}
                                      >
                                        {withCurrentOption(PROCESSING_STAGES, inlineDraft.processing_stage).map((option) => (
                                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                      </TextField>
                                    </CompactProcessingField>

                                    <CompactProcessingField label="Logistics & Delivery Information">
                                      <Tooltip title={inlineLogisticsDisplay} placement="top-start">
                                        <TextField
                                          type="text"
                                          fullWidth
                                          size="small"
                                          value={inlineLogisticsDisplay}
                                          placeholder="Not Assigned"
                                          inputProps={{ title: inlineLogisticsDisplay }}
                                          InputProps={{
                                            readOnly: true,
                                            sx: {
                                              ...INLINE_PROCESSING_INPUT_SX,
                                              '& .MuiInputBase-input': {
                                                fontSize: '13px',
                                                textOverflow: 'ellipsis',
                                              },
                                            },
                                          }}
                                        />
                                      </Tooltip>
                                    </CompactProcessingField>

                                    <Box sx={{ gridColumn: '1 / -1', width: '100%', minWidth: 0 }}>
                                      <CompactProcessingField label="Processing Instructions">
                                        <TextField
                                          type="text"
                                          fullWidth
                                          size="small"
                                          value={inlineDraft.processing_instructions || ''}
                                          onChange={(e) => setInlineDraft({ ...inlineDraft, processing_instructions: e.target.value })}
                                          placeholder="Special care directions, stain notes, or customer delivery requests..."
                                          sx={{
                                            width: '100%',
                                            '& .MuiOutlinedInput-root': {
                                              height: '50px !important',
                                              minHeight: '50px !important',
                                              maxHeight: '50px !important',
                                              boxSizing: 'border-box',
                                            },
                                            '& .MuiOutlinedInput-input': {
                                              height: '100% !important',
                                              boxSizing: 'border-box',
                                              padding: '0 12px !important',
                                              border: '0 !important',
                                              outline: 'none !important',
                                              boxShadow: 'none !important',
                                              backgroundColor: 'transparent !important',
                                              '&:hover, &:focus': {
                                                border: '0 !important',
                                                outline: 'none !important',
                                                boxShadow: 'none !important',
                                                backgroundColor: 'transparent !important',
                                              },
                                            },
                                          }}
                                          InputProps={{ sx: INLINE_PROCESSING_INPUT_SX }}
                                        />
                                      </CompactProcessingField>
                                    </Box>
                                  </Box>

                                  <Box sx={{ mt: 1.25, p: 1.25, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                                      <HistoryOutlined sx={{ fontSize: 18, color: '#2563eb' }} />
                                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Processing Progress Timeline
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', pb: 0.5 }}>
                                      {inlineProcessingTimeline.map((step, idx) => {
                                        const StageIcon = TIMELINE_STAGE_ICONS[idx] || FactCheckOutlined;
                                        return (
                                          <Box
                                            key={step.name}
                                            sx={{ flex: '1 1 0', minWidth: 130, position: 'relative', textAlign: 'center', px: 0.5 }}
                                          >
                                            {idx < inlineProcessingTimeline.length - 1 && (
                                              <Box
                                                sx={{
                                                  position: 'absolute',
                                                  top: 16,
                                                  left: 'calc(50% + 18px)',
                                                  right: 'calc(-50% + 18px)',
                                                  height: 2,
                                                  bgcolor: step.isCompleted ? '#16a34a' : '#e2e8f0',
                                                  zIndex: 0,
                                                }}
                                              />
                                            )}
                                            <Box
                                              sx={{
                                                position: 'relative',
                                                zIndex: 1,
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                mx: 'auto',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: step.isActive ? '#2563eb' : step.isCompleted ? '#16a34a' : '#e2e8f0',
                                                color: step.isActive || step.isCompleted ? '#ffffff' : '#64748b',
                                                boxShadow: step.isActive ? '0 0 0 4px rgba(37, 99, 235, 0.16)' : 'none',
                                              }}
                                            >
                                              <StageIcon sx={{ fontSize: 17 }} />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5, minHeight: 18 }}>
                                              <Typography
                                                variant="caption"
                                                fontWeight={700}
                                                color={step.isActive ? '#2563eb' : step.isCompleted ? '#15803d' : '#64748b'}
                                                sx={{ fontSize: '12px', lineHeight: 1.2 }}
                                              >
                                                {step.name}
                                              </Typography>
                                              {step.isActive && (
                                                <Chip label="Current" size="small" sx={{ height: 16, fontSize: '0.625rem', bgcolor: '#2563eb', color: '#ffffff' }} />
                                              )}
                                            </Box>
                                            <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: '0.6875rem', lineHeight: 1.25 }}>
                                              {step.time}
                                            </Typography>
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </Box>

                                  <Paper elevation={0} sx={{ mt: 1.25, p: 1.5, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                                      <QrCodeScanner sx={{ fontSize: 18, color: '#2563eb' }} />
                                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Order &amp; Garment Scanner
                                      </Typography>
                                    </Box>
                                    <ToggleButtonGroup
                                      exclusive
                                      fullWidth
                                      size="small"
                                      value={scanMode}
                                      onChange={handleScanModeChange}
                                      sx={{
                                        mb: 1.25,
                                        '& .MuiToggleButton-root': {
                                          textTransform: 'none',
                                          fontWeight: 700,
                                          fontSize: '13px',
                                          py: 0.75,
                                          borderColor: '#cbd5e1',
                                          color: '#475569',
                                          '&.Mui-selected': {
                                            bgcolor: '#eff6ff',
                                            color: '#2563eb',
                                            borderColor: '#2563eb',
                                          },
                                        },
                                      }}
                                    >
                                      <ToggleButton value="order">Scan Order</ToggleButton>
                                      <ToggleButton value="garment">Scan Garment</ToggleButton>
                                    </ToggleButtonGroup>
                                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'stretch' }}>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={scanInput}
                                        onChange={(e) => {
                                          setScanInput(e.target.value);
                                          setScanNotice({ severity: 'info', text: '' });
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleScannerScan();
                                          }
                                        }}
                                        placeholder={
                                          scanMode === 'order'
                                            ? 'Scan or enter order barcode / ID'
                                            : 'Scan or enter garment tag / barcode'
                                        }
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <QrCode2 fontSize="small" sx={{ color: '#2563eb' }} />
                                            </InputAdornment>
                                          ),
                                          sx: INLINE_PROCESSING_INPUT_SX,
                                        }}
                                      />
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleScannerScan}
                                        startIcon={<QrCodeScanner />}
                                        sx={{
                                          textTransform: 'none',
                                          fontWeight: 700,
                                          bgcolor: '#2563eb',
                                          borderRadius: '8px',
                                          whiteSpace: 'nowrap',
                                          px: 2,
                                          minWidth: 110,
                                          height: 40,
                                          boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)',
                                          '&:hover': { bgcolor: '#1d4ed8' },
                                        }}
                                      >
                                        Scan
                                      </Button>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<PhotoCameraOutlined />}
                                        onClick={cameraActive ? stopCameraScanner : startCameraScanner}
                                        sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px' }}
                                      >
                                        {cameraActive ? 'Stop Camera' : 'Scan with Camera'}
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AttachFileOutlined />}
                                        onClick={() => barcodeImageInputRef.current?.click()}
                                        sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px' }}
                                      >
                                        Upload Barcode Image
                                      </Button>
                                      <input
                                        ref={barcodeImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handleBarcodeImageUpload}
                                      />
                                    </Box>
                                    <Box
                                      component="video"
                                      ref={barcodeVideoRef}
                                      playsInline
                                      muted
                                      sx={{
                                        display: cameraActive ? 'block' : 'none',
                                        width: '100%',
                                        maxHeight: 220,
                                        mt: 1,
                                        borderRadius: '8px',
                                        bgcolor: '#0f172a',
                                        objectFit: 'cover',
                                      }}
                                    />
                                    <Alert
                                      severity={scanNotice.severity || 'info'}
                                      sx={{ mt: 1.25, py: 0.25, fontSize: '0.8125rem', alignItems: 'center' }}
                                    >
                                      {scanNotice.text || 'Use camera, uploaded image, USB scanner or manual entry. Codes are verified against live Supabase order and garment records.'}
                                    </Alert>
                                    {scanMode === 'garment' && (
                                      <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                                        <Chip size="small" label={`Total: ${scanTotalGarments}`} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }} />
                                        <Chip size="small" label={`Scanned: ${scanScannedGarments}`} sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }} />
                                        <Chip size="small" label={`Remaining: ${scanRemainingGarments}`} sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />
                                      </Box>
                                    )}
                                    {scanResultDetails && (
                                      <Alert severity="success" sx={{ mt: 1.25, py: 0.75, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                                          <CheckCircle sx={{ fontSize: 18, color: '#16a34a' }} />
                                          <Typography variant="subtitle2" fontWeight={800} color="#166534">
                                            Barcode matched successfully
                                          </Typography>
                                        </Box>
                                        <Grid container spacing={1}>
                                          <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Order ID:</strong> {scanResultDetails.orderId}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Customer:</strong> {scanResultDetails.customer}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Phone:</strong> {scanResultDetails.customerPhone}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Expected Delivery:</strong> {scanResultDetails.expectedDelivery}</Typography>
                                          </Grid>
                                          <Grid item xs={12}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Customer Address:</strong> {scanResultDetails.customerAddress}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                              <CheckroomOutlined sx={{ fontSize: 18, color: '#2563eb' }} />
                                              <Typography variant="caption" component="div" color="#334155"><strong>Garment:</strong> {scanResultDetails.garment} • Qty: {scanResultDetails.garmentQuantity}</Typography>
                                            </Box>
                                          </Grid>
                                          <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Unique Barcode:</strong> {scanResultDetails.garmentTag}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Service:</strong> {scanResultDetails.service}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Order Status:</strong> {scanResultDetails.orderStatus}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Processing Stage:</strong> {scanResultDetails.processingStage}</Typography>
                                          </Grid>
                                          <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Assigned Staff:</strong> {scanResultDetails.assignedStaff}</Typography>
                                          </Grid>
                                          <Grid item xs={12}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Inspection Details:</strong> {scanResultDetails.inspection}</Typography>
                                          </Grid>
                                          <Grid item xs={12}>
                                            <Typography variant="caption" component="div" color="#334155"><strong>Processing Instructions:</strong> {scanResultDetails.processingInstructions}</Typography>
                                          </Grid>
                                          <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                                              <Chip size="small" label={`Total: ${scanResultDetails.totalGarments}`} sx={{ bgcolor: '#ffffff', color: '#1d4ed8', fontWeight: 700 }} />
                                              <Chip size="small" label={`Scanned: ${scanResultDetails.scannedGarments}`} sx={{ bgcolor: '#ffffff', color: '#15803d', fontWeight: 700 }} />
                                              <Chip size="small" label={`Remaining: ${scanResultDetails.remainingGarments}`} sx={{ bgcolor: '#ffffff', color: '#475569', fontWeight: 700 }} />
                                            </Box>
                                          </Grid>
                                        </Grid>
                                      </Alert>
                                    )}
                                  </Paper>

                                  <Paper elevation={0} sx={{ mt: 1.25, p: 1.5, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                      <QrCode2 sx={{ fontSize: 18, color: '#2563eb' }} />
                                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Individual Garment Barcodes
                                      </Typography>
                                    </Box>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mb: 1.25 }}>
                                      Save order → generate unique Code 128 garment tags → print &amp; attach → scan garment → view live order details.
                                    </Typography>
                                    {barcodesLoading && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                                        <CircularProgress size={14} />
                                        <Typography variant="caption" color="#64748b">Loading garment barcodes…</Typography>
                                      </Box>
                                    )}
                                    {!barcodesLoading && barcodesError && (
                                      <Alert severity="warning" sx={{ mb: 1.25, py: 0.25, fontSize: '0.75rem' }}>
                                        {barcodesError}
                                      </Alert>
                                    )}
                                    <Box
                                      sx={{
                                        maxHeight: 360,
                                        pr: 1,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#94a3b8 #e2e8f0',
                                        '&::-webkit-scrollbar': { width: 8 },
                                        '&::-webkit-scrollbar-track': { bgcolor: '#e2e8f0', borderRadius: '8px' },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: '#94a3b8', borderRadius: '8px' },
                                      }}
                                    >
                                    <Grid container spacing={1.25} alignItems="stretch">
                                      {garmentBarcodeEntries.map((entry) => (
                                        <Grid item xs={12} sm={6} md={4} key={entry.key}>
                                          <Box sx={{ height: '100%', p: 1, borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                                              <CheckroomOutlined sx={{ fontSize: 18, color: '#2563eb', flexShrink: 0 }} />
                                              <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" fontWeight={700} color="#0f172a" noWrap sx={{ display: 'block' }}>
                                                  {entry.garmentName} – Piece {entry.piece}
                                                </Typography>
                                                <Typography variant="caption" color="#64748b" noWrap sx={{ display: 'block' }}>
                                                  {entry.cartItem?.serviceType || entry.cartItem?.service || 'Laundry service'}
                                                </Typography>
                                              </Box>
                                            </Box>
                                            {entry.barcode
                                              ? <GarmentBarcodeSvg value={entry.barcode} label={entry.barcode} />
                                              : (
                                                <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
                                                  <Typography variant="caption" color="#64748b">Generated when order is saved</Typography>
                                                </Box>
                                              )}
                                            <Typography variant="caption" color="#0f172a" fontFamily="monospace" noWrap>
                                              {entry.barcode || 'Pending generation'}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 0.75, mt: 'auto' }}>
                                              <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<VisibilityOutlined />}
                                                disabled={!entry.barcode}
                                                onClick={() => setBarcodePreviewEntry(entry)}
                                                sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px', flex: 1 }}
                                              >
                                                View Barcode
                                              </Button>
                                              <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<PrintOutlined />}
                                                disabled={!entry.barcode}
                                                onClick={() => handlePrintBarcode(entry)}
                                                sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px', bgcolor: '#2563eb', flex: 1 }}
                                              >
                                                Print Barcode
                                              </Button>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      ))}
                                    </Grid>
                                    </Box>
                                  </Paper>

                                  <Dialog open={Boolean(barcodePreviewEntry)} onClose={() => setBarcodePreviewEntry(null)} maxWidth="sm" fullWidth>
                                    <DialogTitle sx={{ pb: 1 }}>
                                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Garment Barcode
                                      </Typography>
                                    </DialogTitle>
                                    <DialogContent dividers>
                                      {barcodePreviewEntry && (
                                        <Stack spacing={1.25}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CheckroomOutlined sx={{ color: '#2563eb' }} />
                                            <Box>
                                              <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                {barcodePreviewEntry.garmentName} – Piece {barcodePreviewEntry.piece}
                                              </Typography>
                                              <Typography variant="caption" color="#64748b">
                                                Order {inlineDraft?.order_number || inlineDraft?.id || '-'} • Code 128
                                              </Typography>
                                            </Box>
                                          </Box>
                                          <GarmentBarcodeSvg value={barcodePreviewEntry.barcode} label={barcodePreviewEntry.barcode} svgRef={barcodeSvgRef} />
                                          <Typography variant="caption" color="#334155" fontFamily="monospace" textAlign="center">
                                            {barcodePreviewEntry.barcode}
                                          </Typography>
                                        </Stack>
                                      )}
                                    </DialogContent>
                                    <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                      <Button onClick={() => setBarcodePreviewEntry(null)} sx={{ textTransform: 'none' }}>Close</Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<DownloadOutlined />}
                                        disabled={!barcodePreviewEntry?.barcode}
                                        onClick={() => handleExportBarcode(barcodePreviewEntry, 'svg')}
                                        sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px' }}
                                      >
                                        SVG
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<DownloadOutlined />}
                                        disabled={!barcodePreviewEntry?.barcode}
                                        onClick={() => handleExportBarcode(barcodePreviewEntry, 'png')}
                                        sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px' }}
                                      >
                                        PNG
                                      </Button>
                                      <Button
                                        variant="contained"
                                        startIcon={<PrintOutlined />}
                                        disabled={!barcodePreviewEntry?.barcode}
                                        onClick={() => handlePrintBarcode(barcodePreviewEntry)}
                                        sx={{ textTransform: 'none', bgcolor: '#2563eb', borderRadius: '8px' }}
                                      >
                                        Print Barcode
                                      </Button>
                                    </DialogActions>
                                  </Dialog>

                                  {/* Tab 4 Navigation */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, mt: 2, borderTop: '1px solid #f1f5f9' }}>
                                    <Button variant="outlined" size="small" onClick={handlePrevTab} startIcon={<ArrowBack />} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                                      Back
                                    </Button>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button variant="outlined" size="small" onClick={handleNextTab} endIcon={<ArrowForward />} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                                        Next: Payment &amp; Status
                                      </Button>
                                      <Button variant="contained" size="small" onClick={handleSaveInlineEdit} disabled={isSavingInline} startIcon={<Check />} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', color: '#ffffff', borderRadius: '8px' }}>
                                        Confirm Changes
                                      </Button>
                                    </Box>
                                  </Box>
                                </Paper>
                              )}

                              {/* ══════════════════════════════════════════════════════════
                                  TAB 5: PAYMENTS & BILLING (Matching Image 1)
                                 ══════════════════════════════════════════════════════════ */}
                              {activeTab === 'payment' && (
                                <Box>
                                  {/* Main Top Header: Blue icon box + Title + Subtitle */}
                                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', mb: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Box
                                        sx={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: '10px',
                                          bgcolor: '#eff6ff',
                                          color: '#2563eb',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <CreditCardOutlined sx={{ fontSize: 24 }} />
                                      </Box>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                          Payments &amp; Billing
                                        </Typography>
                                        <Typography variant="caption" color="#64748b">
                                          Manage pricing, taxes, discounts, and payment details for this order.
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Paper>

                                  {/* Side-by-Side Two Columns */}
                                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5, alignItems: 'stretch' }}>
                                    {/* ── LEFT COLUMN: BILLING & AMOUNT DETAILS ── */}
                                    <Paper
                                      elevation={0}
                                      sx={{
                                        flex: { xs: '1 1 100%', md: '1 1 0' },
                                        p: 2.5,
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        bgcolor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Box>
                                        {/* Header */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                          <AccountBalanceWalletOutlined sx={{ color: '#2563eb', fontSize: 20 }} />
                                          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            Billing &amp; Amount Details
                                          </Typography>
                                        </Box>

                                        {/* Line Items */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          {/* Items Total */}
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <CheckroomOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                              <Typography variant="body2" color="#334155" fontWeight={600}>
                                                Items Total ({inlineTotalCount} Items)
                                              </Typography>
                                            </Box>
                                            <Typography variant="body1" fontWeight={700} color="#0f172a">
                                              {currencySymbol}{MONEY(inlineSubtotal)}
                                            </Typography>
                                          </Box>

                                          {/* GST / Tax (5%) */}
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #2563eb', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                                                %
                                              </Box>
                                              <Typography variant="body2" color="#334155" fontWeight={600}>
                                                GST / Tax (5%)
                                              </Typography>
                                            </Box>
                                            <Typography variant="body1" fontWeight={700} color="#0f172a">
                                              {currencySymbol}{MONEY(inlineTax)}
                                            </Typography>
                                          </Box>

                                          {/* Discount */}
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <LocalOfferOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                              <Typography variant="body2" color="#334155" fontWeight={600}>
                                                Discount
                                              </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                                <TextField
                                                  select
                                                  size="small"
                                                  value={discountType}
                                                  onChange={(e) => setDiscountType(e.target.value)}
                                                  sx={{ width: 55, '& .MuiSelect-select': { py: 0.4, px: 0.8, fontSize: '0.78rem' }, borderRight: '1px solid #cbd5e1' }}
                                                >
                                                  <MenuItem value="%">%</MenuItem>
                                                  <MenuItem value="₹">₹</MenuItem>
                                                </TextField>
                                                <TextField
                                                  type="number"
                                                  size="small"
                                                  value={discountValue}
                                                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                                                  sx={{ width: 75, '& .MuiInputBase-input': { py: 0.4, px: 1, fontSize: '0.78rem', textAlign: 'right' } }}
                                                />
                                              </Box>
                                              <Typography variant="body1" fontWeight={700} color="#2563eb" sx={{ minWidth: 65, textAlign: 'right' }}>
                                                - {currencySymbol}{MONEY(discountAmount)}
                                              </Typography>
                                            </Box>
                                          </Box>

                                          <Divider sx={{ my: 0.5 }} />

                                          {/* Grand Total Row */}
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#eff6ff', p: 1.5, borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <MonetizationOnOutlined sx={{ color: '#2563eb', fontSize: 22 }} />
                                              <Typography variant="subtitle1" fontWeight={800} color="#1e40af">
                                                Grand Total
                                              </Typography>
                                            </Box>
                                            <Typography variant="h5" fontWeight={800} color="#1d4ed8">
                                              {currencySymbol}{MONEY(inlineGrandTotal)}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>

                                      {/* Balance Due Info Box */}
                                      <Box sx={{ p: 1.6, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                          <InfoOutlined sx={{ color: '#2563eb', fontSize: 22 }} />
                                          <Box>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                              Balance Due: {currencySymbol}{MONEY(inlineBalance)}
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                              Total {currencySymbol}{MONEY(inlineGrandTotal)} | Paid {currencySymbol}{MONEY(inlineAdvance)}
                                            </Typography>
                                          </Box>
                                        </Box>
                                        <AccountBalanceWalletOutlined sx={{ color: '#64748b', fontSize: 26 }} />
                                      </Box>
                                    </Paper>

                                    {/* ── RIGHT COLUMN: PAYMENT INFORMATION ── */}
                                    <Paper
                                      elevation={0}
                                      sx={{
                                        flex: { xs: '1 1 100%', md: '1.25 1 0' },
                                        p: 2.5,
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        bgcolor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Box>
                                        {/* Header */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                          <PaymentOutlined sx={{ color: '#2563eb', fontSize: 20 }} />
                                          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            Payment Information
                                          </Typography>
                                        </Box>

                                        <Grid container spacing={2} mb={2}>
                                           {/* Payment Method * */}
                                           <Grid item xs={12} sm={4}>
                                             <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                               Payment Method *
                                             </Typography>
                                             <TextField
                                               select
                                               fullWidth
                                               size="small"
                                               value={inlineDraft.payment_method || ''}
                                               onChange={(e) => setInlineDraft({ ...inlineDraft, payment_method: e.target.value })}
                                               InputProps={{
                                                 startAdornment: (
                                                   <InputAdornment position="start">
                                                     <CreditCardOutlined fontSize="small" sx={{ color: '#2563eb' }} />
                                                   </InputAdornment>
                                                 ),
                                                 sx: { borderRadius: '8px' },
                                               }}
                                             >
                                               <MenuItem value="Cash">Cash</MenuItem>
                                               <MenuItem value="UPI / QR Code">UPI / QR Code</MenuItem>
                                               <MenuItem value="Card">Credit / Debit Card</MenuItem>
                                               <MenuItem value="Net Banking">Net Banking</MenuItem>
                                               <MenuItem value="Store Credit">Store Credit / Wallet</MenuItem>
                                             </TextField>
                                           </Grid>

                                           {/* Payment Status * */}
                                           <Grid item xs={12} sm={4}>
                                             <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                               Payment Status *
                                             </Typography>
                                             <TextField
                                               select
                                               fullWidth
                                               size="small"
                                               value={normalizePaymentStatusOption(inlineDraft.payment_status, inlineBalance, inlineAdvance, inlineGrandTotal)}
                                               onChange={(e) => {
                                                 const newStatus = e.target.value;
                                                 const nextAdvance = newStatus === 'Paid in Full' ? inlineGrandTotal : (newStatus === 'Unpaid / Pay on Delivery' ? 0 : inlineDraft.advance_paid);
                                                 setInlineDraft((prev) => ({
                                                   ...prev,
                                                   payment_status: newStatus,
                                                   advance_paid: nextAdvance !== undefined ? nextAdvance : prev.advance_paid,
                                                 }));
                                                 if (newStatus === 'Paid in Full') {
                                                    const now = new Date();
                                                    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                                                      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                                    setPaymentHistory([
                                                      {
                                                        id: `${inlineDraft?.order_number || inlineEditingOrderId || Date.now()}_full`,
                                                        order_id: inlineDraft?.order_number || inlineEditingOrderId,
                                                        date: timeStr,
                                                        method: inlineDraft?.payment_method || 'Cash',
                                                        amount: inlineGrandTotal,
                                                        status: 'Paid in Full',
                                                      }
                                                    ]);
                                                  } else if (newStatus === 'Unpaid / Pay on Delivery') {
                                                    setPaymentHistory([]);
                                                  } else if (newStatus === 'Partially Paid') {
                                                    const partialAmt = (nextAdvance > 0 && nextAdvance < inlineGrandTotal) ? nextAdvance : Math.round((inlineGrandTotal / 2) * 100) / 100;
                                                    const now = new Date();
                                                    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                                                      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                                    setInlineDraft((prev) => ({
                                                      ...prev,
                                                      payment_status: 'Partially Paid',
                                                      advance_paid: partialAmt,
                                                    }));
                                                    setPaymentHistory([
                                                      {
                                                        id: `${inlineDraft?.order_number || inlineEditingOrderId || Date.now()}_partial`,
                                                        order_id: inlineDraft?.order_number || inlineEditingOrderId,
                                                        date: timeStr,
                                                        method: inlineDraft?.payment_method || 'Cash',
                                                        amount: partialAmt,
                                                        status: 'Partially Paid',
                                                      }
                                                    ]);
                                                  }
                                               }}
                                               InputProps={{ sx: { borderRadius: '8px' } }}
                                             >
                                               <MenuItem value="Paid in Full">Paid in Full</MenuItem>
                                               <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                                               <MenuItem value="Unpaid / Pay on Delivery">Unpaid / Pay on Delivery</MenuItem>
                                             </TextField>
                                           </Grid>

                                           {/* Advance Paid (₹) */}
                                           <Grid item xs={12} sm={4}>
                                             <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                               Advance Paid ({currencySymbol})
                                             </Typography>
                                             <TextField
                                               type="number"
                                               fullWidth
                                               size="small"
                                               value={inlineDraft.advance_paid ?? ''}
                                               onChange={(e) => {
                                                  const val = e.target.value;
                                                  const numVal = Number(val) || 0;
                                                  const isFull = numVal >= inlineGrandTotal && inlineGrandTotal > 0;
                                                  const isPartial = numVal > 0 && numVal < inlineGrandTotal;
                                                  const nextStatus = isFull ? 'Paid in Full' : (isPartial ? 'Partially Paid' : 'Unpaid / Pay on Delivery');
                                                  setInlineDraft({
                                                    ...inlineDraft,
                                                    advance_paid: val,
                                                    payment_status: nextStatus,
                                                  });
                                                  setPaymentHistory((prev) => {
                                                    const now = new Date();
                                                    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                                                      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                                    if (prev.length > 0) {
                                                      return prev.map((p, idx) => idx === 0 ? { ...p, amount: numVal, status: nextStatus } : p);
                                                    }
                                                    return [
                                                      {
                                                        id: `${inlineDraft?.order_number || inlineEditingOrderId || Date.now()}_p1`,
                                                        date: timeStr,
                                                        method: inlineDraft?.payment_method || 'Cash',
                                                        amount: numVal,
                                                        status: nextStatus,
                                                      }
                                                    ];
                                                  });
                                                }}
                                               InputProps={{
                                                 startAdornment: (
                                                   <InputAdornment position="start">
                                                     <MonetizationOnOutlined fontSize="small" sx={{ color: '#2563eb' }} />
                                                   </InputAdornment>
                                                 ),
                                                 sx: { borderRadius: '8px' },
                                               }}
                                             />
                                           </Grid>

                                           {/* Balance Due (₹) Container */}
                                           <Grid item xs={12} sm={4}>
                                             <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                               Balance Due ({currencySymbol})
                                             </Typography>
                                             <Box
                                               sx={{
                                                 bgcolor: '#eff6ff',
                                                 border: '1.5px solid #bfdbfe',
                                                 borderRadius: '8px',
                                                 p: '6px 14px',
                                                 height: 38,
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 justifyContent: 'space-between',
                                               }}
                                             >
                                               <AccountBalanceWalletOutlined sx={{ color: '#2563eb', fontSize: 20 }} />
                                               <Typography variant="h6" fontWeight={800} color="#1d4ed8">
                                                 {currencySymbol}{MONEY(inlineBalance)}
                                               </Typography>
                                             </Box>
                                           </Grid>

                                           {/* UPI Instant Pay (SHOW QR) & Mark as Fully Paid Buttons */}
                                           <Grid item xs={12} sm={8}>
                                             <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, height: '100%', flexWrap: 'wrap' }}>
                                               <Box sx={{ minWidth: 160, flex: '0 1 200px' }}>
                                                 <Typography variant="caption" fontWeight={700} color="#334155" display="block" mb={0.5}>
                                                   UPI Instant Pay
                                                 </Typography>
                                                 <button
                                                   type="button"
                                                   className="btn-show-qr"
                                                   onClick={() => setShowQRModal(true)}
                                                   title="Display UPI QR code to scan and pay"
                                                 >
                                                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                     <rect x="3" y="3" width="7" height="7"></rect>
                                                     <rect x="14" y="3" width="7" height="7"></rect>
                                                     <rect x="14" y="14" width="7" height="7"></rect>
                                                     <rect x="3" y="14" width="7" height="7"></rect>
                                                     <path d="M7 7h.01"></path>
                                                     <path d="M17 7h.01"></path>
                                                     <path d="M7 17h.01"></path>
                                                   </svg>
                                                   <span>SHOW QR</span>
                                                 </button>
                                               </Box>

                                               <button
                                                 type="button"
                                                 onClick={() => {
                                                   setInlineDraft({
                                                     ...inlineDraft,
                                                     advance_paid: inlineGrandTotal,
                                                     payment_status: 'Paid in Full',
                                                   });
                                                   if (typeof showToast === 'function') {
                                                     showToast('✅ Marked order as fully paid!');
                                                   }
                                                 }}
                                                 style={{
                                                   height: '38px',
                                                   fontSize: '12px',
                                                   fontWeight: 700,
                                                   background: '#16a34a',
                                                   borderColor: '#16a34a',
                                                   color: '#ffffff',
                                                   borderRadius: '7px',
                                                   padding: '0 16px',
                                                   cursor: 'pointer',
                                                   display: 'inline-flex',
                                                   alignItems: 'center',
                                                   gap: '6px',
                                                   border: 'none',
                                                   boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                                                   whiteSpace: 'nowrap',
                                                 }}
                                               >
                                                 ✓ Mark as Fully Paid
                                               </button>
                                             </Box>
                                           </Grid>
                                         </Grid>

                                        {/* Payment History Section */}
                                        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" display="flex" alignItems="center" gap={0.8}>
                                              <HistoryOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                              Payment History ({paymentHistory.length})
                                            </Typography>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              startIcon={<Add />}
                                              onClick={handleAddPaymentRecord}
                                              sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, borderColor: '#bfdbfe', color: '#2563eb' }}
                                            >
                                              + Add Payment
                                            </Button>
                                          </Box>

                                          {/* Table */}
                                          <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                              <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                                  <th style={{ padding: '8px 10px' }}>#</th>
                                                  <th style={{ padding: '8px 10px' }}>Date &amp; Time</th>
                                                  <th style={{ padding: '8px 10px' }}>Method</th>
                                                  <th style={{ padding: '8px 10px' }}>Amount</th>
                                                  <th style={{ padding: '8px 10px' }}>Status</th>
                                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {paymentHistory.map((p, idx) => (
                                                  <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{p.date}</td>
                                                    <td style={{ padding: '8px 10px' }}>{p.method}</td>
                                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                                                      {currencySymbol}{MONEY(p.amount)}
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                      <Chip label={p.status || 'Paid'} size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                      <IconButton size="small" onClick={() => handleDeletePayment(p.id)} sx={{ color: '#ef4444', p: 0.3 }}>
                                                        <DeleteOutlined fontSize="small" />
                                                      </IconButton>
                                                    </td>
                                                  </tr>
                                                ))}
                                                {paymentHistory.length === 0 && (
                                                  <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                                                      No payments recorded yet. Click &quot;+ Add Payment&quot; above.
                                                    </td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          </Box>
                                        </Box>
                                      </Box>

                                      {/* Footer Actions */}
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 2.5, mt: 3, borderTop: '1px solid #f1f5f9' }}>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          onClick={() => handleToggleInlineEdit(order)}
                                          sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, color: '#475569', borderColor: '#cbd5e1' }}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          variant="contained"
                                          size="small"
                                          onClick={handleSaveInlineEdit}
                                          disabled={isSavingInline}
                                          startIcon={<Check />}
                                          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', color: '#ffffff', borderRadius: '8px', px: 2.5, '&:hover': { bgcolor: '#1d4ed8' } }}
                                        >
                                          Save Changes
                                        </Button>
                                      </Box>
                                    </Paper>
                                  </Box>
                                </Box>
                              )}

                              {/* ══════════════════════════════════════════════════════════
                                  TAB 6: CUSTOMER MESSAGES (Matching Image 3)
                                 ══════════════════════════════════════════════════════════ */}
                              {activeTab === 'messages' && (
                                <Box>
                                  {/* Side-by-Side Two Columns */}
                                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5, alignItems: 'stretch' }}>
                                    {/* ── LEFT COLUMN: LIVE CHAT MESSAGES THREAD (~60%) ── */}
                                    <Paper
                                      elevation={0}
                                      sx={{
                                        flex: { xs: '1 1 100%', lg: '1.5 1 0' },
                                        p: 2.5,
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        bgcolor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: 520,
                                      }}
                                    >
                                      {/* Header: Chat icon box + Title + Filter */}
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                          <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ChatOutlined sx={{ fontSize: 20 }} />
                                          </Box>
                                          <Box>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                              Customer Messages
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                              All conversations with the customer for this order.
                                            </Typography>
                                          </Box>
                                        </Box>

                                        <TextField
                                          select
                                          size="small"
                                          value={chatFilter}
                                          onChange={(e) => setChatFilter(e.target.value)}
                                          sx={{ width: 140, '& .MuiSelect-select': { py: 0.5, fontSize: '0.78rem' } }}
                                        >
                                          <MenuItem value="all">All Messages</MenuItem>
                                          <MenuItem value="customer">Customer Only</MenuItem>
                                          <MenuItem value="staff">Staff Only</MenuItem>
                                        </TextField>
                                      </Box>

                                      {/* Chat Thread Area */}
                                      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                                        {filteredChatMessages.map((msg) => {
                                          const isStaff = msg.sender === 'staff';
                                          return (
                                            <Box
                                              key={msg.id}
                                              sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isStaff ? 'flex-end' : 'flex-start',
                                                maxWidth: '85%',
                                                alignSelf: isStaff ? 'flex-end' : 'flex-start',
                                              }}
                                            >
                                              {/* Sender Info & Timestamp */}
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                                                {!isStaff && (
                                                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#3b82f6', fontSize: '0.72rem', fontWeight: 700 }}>
                                                    {inlineDraft.customer_name?.[0] || 'T'}
                                                  </Avatar>
                                                )}
                                                <Typography variant="caption" fontWeight={700} color="#0f172a" fontSize="0.75rem">
                                                  {msg.name}
                                                </Typography>
                                                <Typography variant="caption" color="#94a3b8" fontSize="0.7rem">
                                                  {msg.time}
                                                </Typography>
                                                {isStaff && (
                                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <StorefrontOutlined sx={{ fontSize: 14 }} />
                                                  </Box>
                                                )}
                                              </Box>

                                              {/* Message Bubble */}
                                              <Box
                                                sx={{
                                                  p: 1.5,
                                                  borderRadius: '12px',
                                                  bgcolor: isStaff ? '#eff6ff' : '#f8fafc',
                                                  border: '1px solid',
                                                  borderColor: isStaff ? '#bfdbfe' : '#e2e8f0',
                                                  color: '#0f172a',
                                                  fontSize: '0.84rem',
                                                  position: 'relative',
                                                }}
                                              >
                                                <Typography variant="body2" fontSize="0.84rem" color="#0f172a">
                                                  {msg.text}
                                                </Typography>
                                                {isStaff && (
                                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.4, color: '#2563eb' }}>
                                                    <DoneAllOutlined sx={{ fontSize: 16 }} />
                                                  </Box>
                                                )}
                                              </Box>
                                            </Box>
                                          );
                                        })}
                                      </Box>

                                      {/* Input Bar */}
                                      <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', p: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                          <IconButton size="small" sx={{ color: '#64748b' }}>
                                            <AttachFileOutlined fontSize="small" />
                                          </IconButton>
                                          <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Type a message to the customer..."
                                            value={newChatMessage}
                                            onChange={(e) => setNewChatMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendChatMessage();
                                              }
                                            }}
                                            variant="standard"
                                            InputProps={{ disableUnderline: true, sx: { fontSize: '0.85rem' } }}
                                          />
                                          <IconButton size="small" sx={{ color: '#64748b' }}>
                                            <SentimentSatisfiedAltOutlined fontSize="small" />
                                          </IconButton>
                                          <Typography variant="caption" color="#94a3b8" sx={{ minWidth: 46 }}>
                                            {newChatMessage.length} / 500
                                          </Typography>
                                          <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<SendOutlined />}
                                            onClick={handleSendChatMessage}
                                            disabled={!newChatMessage.trim()}
                                            sx={{ bgcolor: '#2563eb', color: '#ffffff', textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 2, '&:hover': { bgcolor: '#1d4ed8' } }}
                                          >
                                            Send
                                          </Button>
                                        </Box>
                                      </Box>
                                    </Paper>

                                    {/* ── RIGHT COLUMN: COMMUNICATION STATUS & CUSTOMER CONTACT (~40%) ── */}
                                    <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 0' }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                      {/* Card 1: Communication Status */}
                                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                          <Typography variant="subtitle2" fontWeight={800} color="#0f172a" display="flex" alignItems="center" gap={0.8}>
                                            <NotificationsActiveOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                            Communication Status
                                          </Typography>
                                          <Chip label="✓ Active" size="small" sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.72rem', height: 22 }} />
                                        </Box>

                                        {/* 4 Stat Boxes (2x2 Grid) */}
                                        <Grid container spacing={1.5}>
                                          <Grid item xs={6}>
                                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#2563eb', mb: 0.4 }}>
                                                <ChatOutlined fontSize="small" />
                                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                                  {chatMessages.length}
                                                </Typography>
                                              </Box>
                                              <Typography variant="caption" color="#64748b" display="block">
                                                Total Messages
                                              </Typography>
                                            </Box>
                                          </Grid>

                                          <Grid item xs={6}>
                                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#2563eb', mb: 0.4 }}>
                                                <SendOutlined fontSize="small" />
                                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                                  {chatMessages.filter((m) => m.sender === 'staff').length}
                                                </Typography>
                                              </Box>
                                              <Typography variant="caption" color="#64748b" display="block">
                                                Sent (Washdoor)
                                              </Typography>
                                            </Box>
                                          </Grid>

                                          <Grid item xs={6}>
                                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#2563eb', mb: 0.4 }}>
                                                <ArrowForward sx={{ transform: 'rotate(135deg)', fontSize: 18 }} />
                                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                                  {chatMessages.filter((m) => m.sender === 'customer').length}
                                                </Typography>
                                              </Box>
                                              <Typography variant="caption" color="#64748b" display="block">
                                                Received (Customer)
                                              </Typography>
                                            </Box>
                                          </Grid>

                                          <Grid item xs={6}>
                                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#8b5cf6', mb: 0.4 }}>
                                                <HistoryOutlined fontSize="small" />
                                                <Typography variant="caption" fontWeight={700} color="#0f172a">
                                                  {chatMessages[chatMessages.length - 1]?.time?.split(', ')?.[1] || '05:22 PM'}
                                                </Typography>
                                              </Box>
                                              <Typography variant="caption" color="#64748b" display="block">
                                                Last Message
                                              </Typography>
                                            </Box>
                                          </Grid>
                                        </Grid>
                                      </Paper>

                                      {/* Card 2: Customer Contact Details */}
                                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={2} display="flex" alignItems="center" gap={0.8}>
                                          <PersonOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Customer Contact Details
                                        </Typography>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, fontSize: '0.82rem' }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" color="#64748b">Customer Name</Typography>
                                            <Typography variant="body2" fontWeight={700} color="#0f172a">{inlineDraft.customer_name || '—'}</Typography>
                                          </Box>

                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" color="#64748b">Mobile Number</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                              <Typography variant="body2" fontWeight={700} color="#0f172a">{inlineDraft.mobile_number ? `+91 ${inlineDraft.mobile_number}` : '—'}</Typography>
                                              <IconButton size="small" sx={{ p: 0.4, bgcolor: '#eff6ff', color: '#2563eb', '&:hover': { bgcolor: '#dbeafe' } }}>
                                                <CallOutlined sx={{ fontSize: 15 }} />
                                              </IconButton>
                                              <IconButton size="small" sx={{ p: 0.4, bgcolor: '#eff6ff', color: '#2563eb', '&:hover': { bgcolor: '#dbeafe' } }}>
                                                <WhatsApp sx={{ fontSize: 15 }} />
                                              </IconButton>
                                            </Box>
                                          </Box>

                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" color="#64748b">Email</Typography>
                                            <Typography variant="caption" color="#0f172a">{inlineDraft.customer_email || '—'}</Typography>
                                          </Box>

                                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="caption" color="#64748b">Address</Typography>
                                            <Typography variant="caption" color="#0f172a" sx={{ textAlign: 'right', maxWidth: 180 }}>
                                              {inlineDraft.address || '—'}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Paper>

                                      {/* Info Box */}
                                      <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <InfoOutlined sx={{ color: '#0284c7', fontSize: 18, flexShrink: 0 }} />
                                        <Typography variant="caption" color="#0369a1">
                                          Messages are linked to this order ({orderId}) and will be saved in the order history.
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>

                                  {/* Footer Navigation Bar */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2.5, mt: 2.5 }}>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={handlePrevTab}
                                      startIcon={<ArrowBack />}
                                      sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, color: '#334155', borderColor: '#cbd5e1', bgcolor: '#ffffff' }}
                                    >
                                      Back
                                    </Button>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleNextTab}
                                        endIcon={<ArrowForward />}
                                        sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, borderColor: '#cbd5e1', color: '#0f172a', bgcolor: '#ffffff' }}
                                      >
                                        Next: Review &amp; Messages
                                      </Button>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSaveInlineEdit}
                                        disabled={isSavingInline}
                                        startIcon={<Check />}
                                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', color: '#ffffff', borderRadius: '8px', px: 2.5, '&:hover': { bgcolor: '#1d4ed8' } }}
                                      >
                                        Confirm Changes
                                      </Button>
                                    </Box>
                                  </Box>
                                </Box>
                              )}

                              {/* ══════════════════════════════════════════════════════════
                                  TAB 7: REVIEW & CONFIRM CHANGES (Matching Image 4)
                                 ══════════════════════════════════════════════════════════ */}
                              {activeTab === 'review' && (
                                <Box className="orders-v2-review">
                                  {/* Section Header: Blue icon box + Title + Subtitle */}
                                  <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #D8E2EF', bgcolor: '#ffffff', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Box
                                        sx={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: '10px',
                                          bgcolor: '#eff6ff',
                                          color: '#2563eb',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <FactCheckOutlined sx={{ fontSize: 24 }} />
                                      </Box>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                          Review &amp; Confirm Changes
                                        </Typography>
                                        <Typography variant="caption" color="#64748b">
                                          Review the complete order details, communicate with the customer, and confirm your changes.
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Paper>

                                  <Box className="orders-v2-review-grid-three orders-v2-review-row-one">
                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-one-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <PersonOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Customer Information
                                        </Typography>
                                        <IconButton size="small" onClick={() => setActiveTab('customer')} sx={{ p: 0.3, color: '#64748b' }}>
                                          <EditOutlined sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Box className="orders-v2-review-rows">
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Name</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value">{inlineDraft.customer_name || '—'}</Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Mobile Number</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value">{inlineDraft.mobile_number ? `+91 ${inlineDraft.mobile_number}` : '—'}</Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Address</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value">{inlineDraft.address || '—'}</Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Order Type</Typography>
                                            <Chip label={inlineDraft.order_type || '—'} size="small" className="orders-v2-review-row-value" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.68rem', height: 20, maxWidth: '100%' }} />
                                          </Box>
                                        </Box>
                                      </Box>
                                    </Paper>

                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-one-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <CheckroomOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Garments ({inlineCart.length} Items)
                                        </Typography>
                                        <IconButton size="small" onClick={() => setActiveTab('order')} sx={{ p: 0.3, color: '#64748b' }}>
                                          <EditOutlined sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <table className="orders-v2-review-table">
                                          <thead>
                                            <tr>
                                              <th>#</th>
                                              <th>Garment</th>
                                              <th>Qty</th>
                                              <th>Rate</th>
                                              <th>Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {inlineCart.length === 0 ? (
                                              <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                  No garments added yet.
                                                </td>
                                              </tr>
                                            ) : (
                                              inlineCart.map((item, idx) => (
                                                <tr key={idx}>
                                                  <td style={{ color: '#64748b' }}>{idx + 1}</td>
                                                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                                                  <td>{item.qty ?? item.quantity ?? 0}</td>
                                                  <td>{currencySymbol}{toFiniteNumber(item.rate ?? item.price, 0).toFixed(2)}</td>
                                                  <td style={{ fontWeight: 700 }}>
                                                    {currencySymbol}{(toFiniteNumber(item.qty ?? item.quantity, 0) * toFiniteNumber(item.rate ?? item.price, 0)).toFixed(2)}
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </Box>
                                    </Paper>

                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-one-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <LayersOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Services
                                        </Typography>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Box className="orders-v2-review-service-box">
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                                            <Box className="orders-v2-review-service-icon">
                                              <LocalShippingOutlined sx={{ fontSize: 18 }} />
                                            </Box>
                                            <Box className="orders-v2-review-service-copy">
                                              <Typography variant="body2" fontWeight={700} color="#1d4ed8" fontSize="0.8rem" sx={{ overflowWrap: 'anywhere' }}>
                                                {inlineCart.length > 0 && inlineDraft.service_category ? inlineDraft.service_category : '—'}
                                              </Typography>
                                              <Typography variant="caption" color="#64748b" fontSize="0.7rem">
                                                {inlineCart.length > 0 && inlineDraft.service_category ? 'Wash, Dry & Fold' : 'No service selected'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                          <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ whiteSpace: 'nowrap' }}>
                                            {currencySymbol}{MONEY(inlineSubtotal)}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Paper>
                                  </Box>

                                  <Box className="orders-v2-review-grid-three orders-v2-review-row-two">
                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-two-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <CalendarTodayOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Scheduling
                                        </Typography>
                                        <IconButton size="small" onClick={() => setActiveTab('customer')} sx={{ p: 0.3, color: '#64748b' }}>
                                          <EditOutlined sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Box className="orders-v2-review-rows">
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Pickup / Delivery</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value" style={{ color: '#1d4ed8' }}>
                                              {inlineDraft.order_type === 'Walk-In' ? 'In-Store (Walk-In)' : 'On-Call (Pickup)'}
                                            </Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Received Date &amp; Time</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value">
                                              📅 {formatDateTime(inlineDraft.created_at)}
                                            </Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Expected Delivery</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value">
                                              📅 {inlineDraft.scheduled_delivery_date ? `${formatDateOnly(inlineDraft.scheduled_delivery_date)}${inlineDraft.scheduled_delivery_time ? `, ${inlineDraft.scheduled_delivery_time}` : ''}` : '—'}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                    </Paper>

                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-two-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <CreditCardOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Payment Status
                                        </Typography>
                                        <IconButton size="small" onClick={() => setActiveTab('payment')} sx={{ p: 0.3, color: '#64748b' }}>
                                          <EditOutlined sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Box className="orders-v2-review-rows">
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Status</Typography>
                                            <Chip label={inlineDraft.payment_status || '—'} size="small" className="orders-v2-review-row-value" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Advance Paid</Typography>
                                            <Typography variant="caption" className="orders-v2-review-row-value">{currencySymbol}{MONEY(inlineAdvance)}</Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Balance Due</Typography>
                                            <Typography
                                              variant="caption"
                                              className="orders-v2-review-row-value"
                                              style={{ color: inlineBalance > 0 ? '#b45309' : '#1d4ed8' }}
                                              sx={{ bgcolor: '#fef9c3', px: 1, py: 0.25, borderRadius: '6px', whiteSpace: 'nowrap' }}
                                            >
                                              {currencySymbol}{MONEY(inlineBalance)}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                    </Paper>

                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-two-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <DescriptionOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Notes &amp; Instructions
                                        </Typography>
                                        <IconButton size="small" onClick={() => setActiveTab('customer')} sx={{ p: 0.3, color: '#64748b' }}>
                                          <EditOutlined sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Typography variant="caption" color="#475569" sx={{ display: 'block', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                                          {inlineDraft.comments || '—'}
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  </Box>

                                  <Box className="orders-v2-review-grid-two orders-v2-review-row-three">
                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-three-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <ChatOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Customer Messages
                                        </Typography>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Typography variant="caption" color="#64748b" sx={{ display: 'block', mb: 2 }}>
                                          Send WhatsApp or SMS updates to the customer.
                                        </Typography>
                                        <Box className="orders-v2-review-templates">
                                          {[
                                            ['order_received', '✓ 1. Order Received'],
                                            ['in_progress', '2. Processing Update'],
                                            ['ready', '3. Ready for Pickup'],
                                            ['delivered', '4. Order Delivered'],
                                          ].map(([key, lbl]) => {
                                            const isActive = selectedMessageTemplate === key;
                                            return (
                                              <Chip
                                                key={key}
                                                label={lbl}
                                                size="small"
                                                clickable
                                                onClick={() => setSelectedMessageTemplate(key)}
                                                sx={{
                                                  fontWeight: isActive ? 700 : 500,
                                                  bgcolor: isActive ? '#2563eb' : '#ffffff',
                                                  color: isActive ? '#ffffff' : '#334155',
                                                  border: '1px solid',
                                                  borderColor: isActive ? '#2563eb' : '#cbd5e1',
                                                  borderRadius: '20px',
                                                  fontSize: '0.78rem',
                                                  px: 0.5,
                                                  '&:hover': { bgcolor: isActive ? '#1d4ed8' : '#f8fafc' },
                                                }}
                                              />
                                            );
                                          })}
                                        </Box>
                                        <Box className="orders-v2-review-message-box">
                                          <TextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            value={messagePreviewText}
                                            variant="outlined"
                                            inputProps={{ maxLength: 500 }}
                                            InputProps={{ sx: { borderRadius: '8px', fontSize: '0.84rem', bgcolor: '#f8fafc' } }}
                                            sx={{
                                              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D8E2EF' },
                                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
                                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb', borderWidth: 1 },
                                            }}
                                          />
                                          <Typography variant="caption" color="#94a3b8" className="orders-v2-review-char-count">
                                            {messagePreviewText.length} / 500
                                          </Typography>
                                        </Box>
                                      </Box>
                                      <Box className="orders-v2-review-actions">
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<WhatsApp />}
                                          onClick={() => {
                                            setMessageSentToast('WhatsApp alert prepared and dispatched!');
                                            setTimeout(() => setMessageSentToast(''), 3000);
                                          }}
                                          sx={{ bgcolor: '#2563eb', color: '#ffffff', textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 2, '&:hover': { bgcolor: '#1d4ed8' } }}
                                        >
                                          Send WhatsApp Alert
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          startIcon={<ChatOutlined />}
                                          onClick={() => {
                                            setMessageSentToast('SMS alert queued successfully!');
                                            setTimeout(() => setMessageSentToast(''), 3000);
                                          }}
                                          sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#334155', borderRadius: '8px', px: 1.8 }}
                                        >
                                          Send SMS
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          startIcon={<DescriptionOutlined />}
                                          sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#334155', borderRadius: '8px' }}
                                        >
                                          Use Template
                                        </Button>
                                        {messageSentToast && (
                                          <Typography variant="caption" fontWeight={700} color="#2563eb" width="100%">
                                            ✓ {messageSentToast}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Paper>

                                    <Paper elevation={0} className="orders-v2-review-card orders-v2-review-row-three-card">
                                      <Box className="orders-v2-review-card-header">
                                        <Typography variant="subtitle2" className="orders-v2-review-card-title">
                                          <ReceiptLongOutlined sx={{ color: '#2563eb', fontSize: 18 }} />
                                          Order Summary
                                        </Typography>
                                      </Box>
                                      <Box className="orders-v2-review-card-body">
                                        <Box className="orders-v2-review-rows">
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Subtotal</Typography>
                                            <Typography variant="body2" className="orders-v2-review-row-value">{currencySymbol}{MONEY(inlineSubtotal)}</Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">GST / Tax (5%)</Typography>
                                            <Typography variant="body2" className="orders-v2-review-row-value">{currencySymbol}{MONEY(inlineTax)}</Typography>
                                          </Box>
                                          {discountAmount > 0 && (
                                            <Box className="orders-v2-review-row">
                                              <Typography variant="caption" className="orders-v2-review-row-label" style={{ color: '#2563eb' }}>Discount</Typography>
                                              <Typography variant="body2" className="orders-v2-review-row-value" style={{ color: '#2563eb' }}>- {currencySymbol}{MONEY(discountAmount)}</Typography>
                                            </Box>
                                          )}
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Advance Paid</Typography>
                                            <Typography variant="body2" className="orders-v2-review-row-value">{currencySymbol}{MONEY(inlineAdvance)}</Typography>
                                          </Box>
                                          <Box className="orders-v2-review-row">
                                            <Typography variant="caption" className="orders-v2-review-row-label">Payment Method</Typography>
                                            <Chip label={inlineDraft.payment_method || '—'} size="small" className="orders-v2-review-row-value" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }} sx={{ height: 20, fontSize: '0.7rem' }} />
                                          </Box>
                                        </Box>
                                      </Box>
                                      <Box className="orders-v2-review-summary-footer">
                                        <Box className="orders-v2-review-total-row orders-v2-review-grand-total">
                                          <Typography variant="body2" fontWeight={800} color="#1e40af">Grand Total</Typography>
                                          <Typography variant="body1" fontWeight={800} color="#1d4ed8">{currencySymbol}{MONEY(inlineGrandTotal)}</Typography>
                                        </Box>
                                        <Box className="orders-v2-review-total-row orders-v2-review-balance-due">
                                          <Typography variant="body2" fontWeight={800} color="#0f172a">Balance Due</Typography>
                                          <Typography variant="body1" fontWeight={800} color="#0f172a" fontSize="0.95rem">
                                            {currencySymbol}{MONEY(inlineBalance)}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Paper>
                                  </Box>

                                  {/* Final Confirm Changes Bar */}
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 3, mt: 3, borderTop: '1px solid #e2e8f0' }}>
                                    <Button
                                      variant="outlined"
                                      size="medium"
                                      onClick={() => handleToggleInlineEdit(order)}
                                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', color: '#475569', borderColor: '#cbd5e1' }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="contained"
                                      size="medium"
                                      onClick={handleSaveInlineEdit}
                                      disabled={isSavingInline}
                                      startIcon={<Check />}
                                      sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#2563eb', color: '#ffffff', borderRadius: '8px', px: 3, '&:hover': { bgcolor: '#1d4ed8' } }}
                                    >
                                      {isSavingInline ? 'Confirming...' : 'Confirm Changes'}
                                    </Button>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
          </Table>
        </TableContainer>

        <Box
          component="footer"
          className="orders-v2-pagination-footer"
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'flex-end',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 0.75, sm: 1 },
            px: { xs: 1.25, sm: 1.75 },
            pt: 1,
            pb: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 7,
            borderTop: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
          }}
        >
          <Box
            className="orders-v2-pagination-size"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, order: { xs: 1, sm: 0 } }}
          >
            <Typography variant="caption" color="#64748b" sx={{ whiteSpace: 'nowrap' }}>
              Rows per page:
            </Typography>
            <Select
              value={showAllRows ? 'All' : String(pageNum)}
              size="small"
              onChange={(event) => {
                onPageSizeChange(event.target.value);
                onPageChange(1);
              }}
              sx={{
                height: 28,
                fontSize: '0.75rem',
                '& .MuiSelect-select': { py: 0.4, pl: 1, pr: 2 },
              }}
            >
              {[10, 20, 50, 100].map((rows) => (
                <MenuItem key={rows} value={String(rows)}>{rows}</MenuItem>
              ))}
            </Select>
          </Box>

          <Typography
            className="orders-v2-pagination-range"
            variant="caption"
            color="#475569"
            fontWeight={700}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0, order: { xs: 2, sm: 0 }, ml: { xs: 'auto', sm: 0 } }}
          >
            {showingStart}–{showingEnd} of {filtered.length}
          </Typography>

          <Box
            className="orders-v2-pagination-nav"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.75,
              flexWrap: 'nowrap',
              flexShrink: 0,
              width: { xs: '100%', sm: 'auto' },
              order: { xs: 3, sm: 0 },
            }}
          >
            <Tooltip title="First page">
              <span>
                <IconButton
                  size="small"
                  aria-label="First page"
                  disabled={safePage === 1}
                  onClick={() => onPageChange(1)}
                  sx={ORDERS_PAGINATION_ICON_SX}
                >
                  <FirstPage fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Previous page">
              <span>
                <IconButton
                  size="small"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => onPageChange(safePage - 1)}
                  sx={ORDERS_PAGINATION_ICON_SX}
                >
                  <KeyboardArrowLeft fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Next page">
              <span>
                <IconButton
                  size="small"
                  aria-label="Next page"
                  disabled={safePage === totalPages}
                  onClick={() => onPageChange(safePage + 1)}
                  sx={ORDERS_PAGINATION_ICON_SX}
                >
                  <KeyboardArrowRight fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Last page">
              <span>
                <IconButton
                  size="small"
                  aria-label="Last page"
                  disabled={safePage === totalPages}
                  onClick={() => onPageChange(totalPages)}
                  sx={ORDERS_PAGINATION_ICON_SX}
                >
                  <LastPage fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Popover
        open={Boolean(servicesPopup.anchorEl)}
        anchorEl={servicesPopup.anchorEl}
        onClose={closeServicesPopup}
        marginThreshold={12}
        anchorOrigin={{
          vertical: isServicesPopupNearBottom ? 'top' : 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: isServicesPopupNearBottom ? 'bottom' : 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: 'min(92vw, 380px)',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: SERVICES_POPUP_MAX_HEIGHT,
            borderRadius: '12px',
            border: `1px solid ${ORDER_BLUE.border}`,
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: SERVICES_POPUP_MAX_HEIGHT, minHeight: 0, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              flexShrink: 0,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              py: 1.5,
              bgcolor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                Services &amp; Garments
              </Typography>
              <Typography variant="caption" color="#64748b" display="block" noWrap>
                Order ID: {servicesPopupOrder?.order_number || servicesPopupOrder?.id || '—'}
              </Typography>
            </Box>
            <IconButton size="small" aria-label="Close services and garments" onClick={closeServicesPopup} sx={{ color: '#64748b' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, p: 1.5, overflowY: 'auto', ...SERVICES_POPUP_SCROLLBAR_SX }}>
            {servicesPopupGroups.length ? (
              <Stack spacing={1.25}>
                {servicesPopupGroups.map((group) => {
                  const expanded = Boolean(servicesPopup.expanded[group.key]);
                  return (
                    <Box
                      key={group.key}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        bgcolor: '#ffffff',
                      }}
                    >
                      <ButtonBase
                        onClick={() => toggleServiceGroup(group.key)}
                        aria-expanded={expanded}
                        sx={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          gap: 0.75,
                          px: 1.25,
                          py: 1,
                          bgcolor: expanded ? ORDER_BLUE.soft : '#f8fafc',
                          borderBottom: expanded ? '1px solid #e2e8f0' : 'none',
                          textAlign: 'left',
                        }}
                      >
                        {expanded
                          ? <KeyboardArrowDown fontSize="small" sx={{ color: ORDER_BLUE.main }} />
                          : <KeyboardArrowRight fontSize="small" sx={{ color: '#64748b' }} />}
                        <Chip
                          icon={renderServiceIcon(group.iconType)}
                          label={group.name}
                          size="small"
                          sx={{
                            height: 24,
                            maxWidth: '60%',
                            bgcolor: '#ffffff',
                            color: ORDER_BLUE.text,
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            border: `1px solid ${ORDER_BLUE.border}`,
                            '& .MuiChip-icon': { ml: 0.75 },
                            '& .MuiChip-label': {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              pr: 1,
                            },
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }} />
                        <Typography
                          variant="caption"
                          color="#64748b"
                          fontWeight={700}
                          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {group.garmentCount} garments
                        </Typography>
                      </ButtonBase>

                      <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {group.garments.length ? group.garments.map((garment) => (
                            <Box key={garment.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.15, minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 30,
                                  height: 30,
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                  bgcolor: '#f8fafc',
                                }}
                              >
                                <ClothIllustration itemId={garment.iconId} size={22} />
                              </Box>
                              <Typography
                                variant="body2"
                                color="#334155"
                                fontWeight={600}
                                noWrap
                                sx={{ flex: 1, minWidth: 0 }}
                              >
                                {garment.name}
                              </Typography>
                              <Chip
                                label={`×${garment.qty}`}
                                size="small"
                                sx={{
                                  height: 22,
                                  bgcolor: ORDER_BLUE.soft,
                                  color: ORDER_BLUE.text,
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                }}
                              />
                            </Box>
                          )) : (
                            <Typography variant="caption" color="#94a3b8" sx={{ fontStyle: 'italic' }}>
                              No garments assigned.
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="#94a3b8">No services assigned.</Typography>
            )}
          </Box>
        </Box>
      </Popover>

      {/* ── UPI Payment QR Code Modal in Orders v2 Inline Edit ── */}
      <UPIPaymentQRDialog
        open={showQRModal}
        onClose={() => setShowQRModal(false)}
        orderNumber={inlineDraft?.order_number || inlineDraft?.order_id || inlineEditingOrderId || 'ORDER'}
        customerName={inlineDraft?.customer_name || 'Customer'}
        amount={inlineBalance > 0 ? inlineBalance : inlineGrandTotal}
        currencySymbol={currencySymbol}
        onMarkPaid={() => {
          const now = new Date();
          const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          setPaymentHistory([
            {
              id: `${inlineDraft?.order_number || inlineEditingOrderId || Date.now()}_qr`,
              date: timeStr,
              method: 'UPI / QR Code',
              amount: inlineGrandTotal,
              status: 'Paid',
            }
          ]);
          setInlineDraft((prev) => ({
            ...prev,
            payment_status: 'Paid in Full',
            payment_method: 'UPI / QR Code',
            advance_paid: inlineGrandTotal,
          }));
          if (typeof showToast === 'function') {
            showToast('✓ Payment received via QR & marked as Fully Paid!');
          }
        }}
      />
    </>
  );
}

export default OrdersV2List;
