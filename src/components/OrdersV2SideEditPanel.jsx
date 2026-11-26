// src/components/OrdersV2SideEditPanel.jsx
// Professional High-Fidelity 6-Section Side Edit Panel for Washdoor Orders V2
// Fully responsive with Customer Details, Garments & Services, Garment Inspection, Laundry Processing, Payments & Billing, Messages & Review

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { GarmentBarcodeSvg, normalizeOrdersV2Status } from './OrdersV2List';
import { sanitizeAddress } from '../utils/normalizeOrder';
import ClothIllustration from './ClothIllustration';
import GarmentInspectionSection from './GarmentInspectionSection';
import ServiceTypeSelect, { useServiceTypes } from './ServiceTypeSelect';
import StaffSearchDropdown from './StaffSearchDropdown';
import OrdersV2AdvancedCustomerDetails, {
  INITIAL_ADVANCED_FIELDS,
  INITIAL_ADVANCED_SECTIONS,
  buildAdvancedReviewLines,
  getAdvancedErrors,
  getAdvancedSectionForField,
  getChangedAdvancedPayload,
  getCustomerPricingDiscount,
  loadAdvancedCustomerProfile,
  normalizeAdvancedFields,
} from './OrdersV2AdvancedCustomerDetails';
import { formatServiceBreakdown } from '../config/businessRules';
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
  updateOrderInSupabase,
  updateCustomer,
  getOrderById,
  getGarmentBarcodeDetails,
  fetchOrderGarmentBarcodes,
  fetchActiveStaffMaster,
  fetchActivePickupDeliveryMaster,
  fetchCustomerAddresses,
} from '../services/customerService';
import {
  BARCODE_RENDER_OPTIONS,
  assignGarmentBarcodes,
  getGarmentBarcodeEntries,
  getOrderIdFromBarcode,
  normalizeBarcodeValue,
  mergeGarmentBarcodePatch,
} from '../utils/garmentBarcodes';
import {
  isOnCallOrderType,
  resolveOptionalDelivery,
  resolveDisplayScheduledDelivery,
  splitIsoToLocalDateAndTime,
  validateOnCallSchedule,
  formatDeliveryDateTimeForDisplay,
  formatDeliveryInputsForDisplay,
  NOT_SCHEDULED_LABEL,
} from '../utils/onCallScheduling';
import '../styles/OrdersV2SideEditPanel.css';
import OrdersV2AddressManager, {
  formatAddressForOrder,
  normalizeAdditionalAddresses,
  toStoredAdditionalAddresses,
  validateAdditionalAddresses,
} from './OrdersV2AddressManager';

// 16 Standard Catalog Items matching reference mockup display order
const CATALOG_ITEMS = [
  { id: 'shirt', name: 'Shirt', category: 'Men', price: 15, unit: 'piece' },
  { id: 'tshirt', name: 'T-Shirt', category: 'Men', price: 12, unit: 'piece' },
  { id: 'formal_pant', name: 'Formal Pant', category: 'Men', price: 20, unit: 'piece' },
  { id: 'jeans', name: 'Jeans', category: 'Men', price: 25, unit: 'piece' },
  { id: 'saree', name: 'Saree', category: 'Women', price: 50, unit: 'piece' },
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

const CATEGORIES = ['All', 'Laundry', 'Dry Cleaning', 'Ironing', 'Others', 'Men', 'Women', 'Home Linen'];

const CODE_128_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]],
]);

const getClothId = (item) => {
  if (item?.itemId) return item.itemId;
  if (item?.item_id) return item.item_id;
  const name = String(item?.name || item?.item_name || '').toLowerCase();
  if (name.includes('t-shirt') || name.includes('tshirt')) return 'tshirt';
  if (name.includes('formal') || name.includes('trouser') || name.includes('pant')) return 'formal_pant';
  if (name.includes('jean')) return 'jeans';
  if (name.includes('shirt')) return 'shirt';
  if (name.includes('saree')) return 'saree';
  if (name.includes('towel')) return 'towel';
  if (name.includes('bedsheet') || name.includes('bed sheet')) return 'bedsheet';
  if (name.includes('pillow')) return 'pillow_cover';
  if (name.includes('blazer') || name.includes('suit')) return 'blazer_suit';
  if (name.includes('sweater')) return 'sweater';
  if (name.includes('jacket')) return 'jacket';
  if (name.includes('cap')) return 'cap';
  if (name.includes('chudidar') || name.includes('salwar')) return 'chudidar';
  if (name.includes('kurti')) return 'kurti';
  if (name.includes('short')) return 'shorts';
  if (name.includes('curtain')) return 'curtain';
  return 'shirt';
};

// 6 Dedicated Sections for Navigation
export const SECTIONS = [
  {
    id: 'customer',
    key: 'Customer Details',
    label: 'Customer Details',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
  },
  {
    id: 'services',
    key: 'Garments & Services',
    label: 'Garments & Services',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
      </svg>
    ),
  },
  {
    id: 'inspection',
    key: 'Garment Inspection',
    label: 'Garment Inspection',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <polyline points="9 11 11 13 15 9"></polyline>
      </svg>
    ),
  },
  {
    id: 'processing',
    key: 'Laundry Processing',
    label: 'Laundry Processing',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="3"></rect>
        <circle cx="12" cy="13" r="5"></circle>
        <path d="M12 18a5 5 0 0 0 5-5"></path>
        <line x1="6" y1="6" x2="6.01" y2="6"></line>
        <line x1="10" y1="6" x2="10.01" y2="6"></line>
      </svg>
    ),
  },
  {
    id: 'payments',
    key: 'Payments & Billing',
    label: 'Payments & Billing',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"></rect>
        <line x1="2" y1="10" x2="22" y2="10"></line>
      </svg>
    ),
  },
  {
    id: 'messages',
    key: 'Messages & Review',
    label: 'Messages & Review',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
  },
];

// Preserved for full backward compatibility with any tests or external callers
export const TABS = [
  'Customer Details',
  'Garments & Services',
  'Garment Inspection',
  'Laundry Processing',
  'Payments & Billing',
  'Messages & Review',
  '1. Order Details',
  '2. Logistics & Factory',
  '3. Status Updates',
  '4. Payments',
  '5. Customer Messages',
  '6. Comments & Audit',
];

export default function OrdersV2SideEditPanel({
  isOpen,
  order,
  onClose,
  onDelete,
  showToast,
  currencySymbol = '₹',
  onUpdateOrder,
}) {
  const localServiceTypes = useServiceTypes();

  // Extract order defaults
  const initialOrderNum = order?.order_number || order?.order_id || order?.work_number || 'ORD00060';
  const initialCustName = order?.customer_name || order?.customer?.customer_name || 'Arun Kumar';
  const initialPhone = order?.mobile_number || order?.customer?.mobile_number || '+91 98765 43210';
  const initialAltPhone = order?.alternate_phone || order?.customer?.alternate_phone || '';
  const initialEmail = order?.email || order?.customer?.email || 'arun.k@example.com';
  const initialAddress = order?.address || order?.delivery_address || order?.customer?.address || 'No.16, Anna Nagar, Ranipet - 632401';
  const initialAddresses = normalizeAdditionalAddresses(
    order?.additional_addresses || order?.customer?.additional_addresses || [],
  );
  const initialStatus = normalizeOrdersV2Status(order?.status || order?.order_status || 'Delivered');
  const initialOrderType = order?.order_type || 'Walk-in';
  const initialExpectedDelivery = formatDeliveryDateTimeForDisplay(order);
  const initialComments = order?.comments || order?.order_notes || order?.special_instructions || 'Handle with care. VIP regular customer.';

  // 1. Customer & Order Info Form State (Editable)
  const [customerName, setCustomerName] = useState(initialCustName);
  const [mobileNumber, setMobileNumber] = useState(initialPhone);
  const [alternatePhone, setAlternatePhone] = useState(initialAltPhone);
  const [email, setEmail] = useState(initialEmail);
  const [address, setAddress] = useState(initialAddress);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(order?.selected_customer_address_id || null);
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const addressTokenRef = useRef(0);
  const [advancedFields, setAdvancedFields] = useState(INITIAL_ADVANCED_FIELDS);
  const [advancedBaseline, setAdvancedBaseline] = useState(INITIAL_ADVANCED_FIELDS);
  const [advancedSections, setAdvancedSections] = useState(INITIAL_ADVANCED_SECTIONS);
  const [advancedErrors, setAdvancedErrors] = useState({});
  const advancedTokenRef = useRef(0);
  const advancedDirtyRef = useRef(false);
  const [status, setStatus] = useState(initialStatus);
  const [orderType, setOrderType] = useState(initialOrderType);
  const [expectedDelivery, setExpectedDelivery] = useState(initialExpectedDelivery);
  const initialPickupSplit = splitIsoToLocalDateAndTime(order?.scheduled_pickup_at);
  const initialDeliverySplit = splitIsoToLocalDateAndTime(resolveDisplayScheduledDelivery(order));
  const deliveryTouchedRef = useRef(false);
  const [scheduledPickupDate, setScheduledPickupDate] = useState(initialPickupSplit.date || '2026-10-28');
  const [scheduledPickupTime, setScheduledPickupTime] = useState(initialPickupSplit.time || '10:15');
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState(initialDeliverySplit.date || '');
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState(initialDeliverySplit.time || '');
  const [scheduleErrors, setScheduleErrors] = useState({});

  const normalizedAddresses = useMemo(() => normalizeAdditionalAddresses(addresses), [addresses]);
  const selectedAddress = normalizedAddresses.find((item) => item.id === selectedAddressId) || null;
  const effectiveAddress = selectedAddress ? formatAddressForOrder(selectedAddress) : sanitizeAddress(address);

  const advancedOrderPreferenceOptions = useMemo(() => {
    const values = [...localServiceTypes, advancedFields.order_preference, 'Laundry'];
    const seen = new Set();
    return values.reduce((result, value) => {
      const name = String(value || '').trim();
      if (!name || seen.has(name.toLowerCase())) return result;
      seen.add(name.toLowerCase());
      result.push(name);
      return result;
    }, []);
  }, [localServiceTypes, advancedFields.order_preference]);

  const effectiveAdvancedFields = useMemo(() => ({
    ...advancedFields,
    alternate_phone: alternatePhone || '',
    email: email || '',
  }), [advancedFields, alternatePhone, email]);

  const [attendStaffName, setAttendStaffName] = useState(
    order?.attend_staff_name || order?.status_updated_by || order?.assigned_staff || 'Ramesh K. (CNT102)'
  );
  const [attendStaffId, setAttendStaffId] = useState(
    order?.attend_staff_id || 'STAFF-102'
  );
  const [assignedPickupPerson, setAssignedPickupPerson] = useState(
    order?.assigned_pickup_delivery_person || order?.assigned_driver || ''
  );
  const [assignedPickupPersonId, setAssignedPickupPersonId] = useState(
    order?.assigned_pickup_person_id || ''
  );
  const [assignedPickupPersonCity, setAssignedPickupPersonCity] = useState(
    order?.assigned_pickup_person_city || ''
  );
  const [assignedPickupPersonZone, setAssignedPickupPersonZone] = useState(
    order?.assigned_pickup_person_zone || ''
  );
  const [staffMasterList, setStaffMasterList] = useState([]);
  const [staffMasterLoading, setStaffMasterLoading] = useState(false);
  const [staffMasterError, setStaffMasterError] = useState('');
  const [pickupMasterList, setPickupMasterList] = useState([]);
  const [pickupMasterLoading, setPickupMasterLoading] = useState(false);
  const [pickupMasterError, setPickupMasterError] = useState('');

  const loadStaffAndPickupMasters = useCallback(async () => {
    setStaffMasterLoading(true);
    setPickupMasterLoading(true);
    setStaffMasterError('');
    setPickupMasterError('');

    const [staffRes, pickupRes] = await Promise.all([
      fetchActiveStaffMaster(),
      fetchActivePickupDeliveryMaster(),
    ]);

    if (staffRes.error) {
      setStaffMasterError(staffRes.error);
    } else {
      setStaffMasterList(staffRes.data || []);
    }
    setStaffMasterLoading(false);

    if (pickupRes.error) {
      setPickupMasterError(pickupRes.error);
    } else {
      setPickupMasterList(pickupRes.data || []);
    }
    setPickupMasterLoading(false);
  }, []);

  useEffect(() => {
    loadStaffAndPickupMasters();
  }, [loadStaffAndPickupMasters]);

  const [comments, setComments] = useState(initialComments);

  // 2. Catalog & Item Selection State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(CATALOG_ITEMS[1]); // T-Shirt default
  const [selectedServiceType, setSelectedServiceType] = useState('Laundry');
  const [quantity, setQuantity] = useState(1);
  const [ratePerPiece, setRatePerPiece] = useState(12.00);

  // 3. Cart State (Editable measures)
  const [cartItems, setCartItems] = useState(() => {
    if (order?.items?.length) {
      return order.items.map((it, idx) => ({
        id: it.id || idx + 1,
        itemId: it.itemId || it.item_id || getClothId(it),
        name: it.name || it.item_name || 'Garment',
        service: it.service || it.serviceType || it.service_type || 'Laundry',
        rate: Number(it.rate || it.price || 15),
        qty: Number(it.qty || it.quantity || 1),
        icon: it.icon || '🧺',
      }));
    }
    // Default items matching reference image: T-Shirt (Laundry) 1x ₹12, Shirt (Laundry) 1x ₹15
    return [
      { id: 101, itemId: 'tshirt', name: 'T-Shirt', service: 'Laundry', rate: 12.00, qty: 1, icon: '👕' },
      { id: 102, itemId: 'shirt', name: 'Shirt', service: 'Laundry', rate: 15.00, qty: 1, icon: '👔' },
    ];
  });

  // 4. Dynamic Garment-by-Garment Inspection State
  const [inspections, setInspections] = useState(() => {
    if (order?.garment_inspections && typeof order.garment_inspections === 'object') {
      return { ...order.garment_inspections };
    }
    if (order?.inspections && typeof order.inspections === 'object' && !Array.isArray(order.inspections)) {
      return { ...order.inspections };
    }
    return {
      101: {
        id: 101,
        cartItemId: 101,
        name: 'T-Shirt',
        tagNo: 'TAG-RANIPET-01',
        color: 'White',
        brand: 'Nike',
        fabric: 'Cotton',
        stains: 'Collar Stain',
        damage: 'No Damage',
        treatment: 'Enzyme Wash',
        extraCharge: 5.00,
        qcPassed: true,
        customerRisk: false,
        photos: [
          { id: 'p1', name: 'collar_stain.jpg', size: '1.2 MB', url: '/sample-cloth.png', tag: 'Collar Stain', timestamp: '28 Oct 2026, 10:48 AM' },
          { id: 'p2', name: 'cuff_close.jpg', size: '980 KB', url: '/sample-cloth.png', tag: 'Cuff Inspection', timestamp: '28 Oct 2026, 10:49 AM' },
          { id: 'p3', name: 'fabric_texture.jpg', size: '1.4 MB', url: '/sample-cloth.png', tag: 'Fabric Check', timestamp: '28 Oct 2026, 10:50 AM' },
        ],
      },
      102: {
        id: 102,
        cartItemId: 102,
        name: 'Shirt',
        tagNo: 'TAG-RANIPET-02',
        color: 'Sky Blue',
        brand: 'Allen Solly',
        fabric: 'Cotton Blend',
        stains: 'None',
        damage: 'No Damage',
        treatment: 'Steam Press Only',
        extraCharge: 0.00,
        qcPassed: false,
        customerRisk: false,
        photos: [],
      },
    };
  });

  const [activeInspectIndex, setActiveInspectIndex] = useState(0);
  const activeInspectItem = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return null;
    return cartItems[Math.min(activeInspectIndex, cartItems.length - 1)];
  }, [cartItems, activeInspectIndex]);

  const currentInspData = useMemo(() => {
    if (!activeInspectItem) return {
      color: 'White', brand: 'Nike', fabric: 'Cotton', stains: 'None', damage: 'No Damage', treatment: 'Normal Wash', extraCharge: 0, qcPassed: false, customerRisk: false, photos: []
    };
    return inspections[activeInspectItem.id] || {
      id: activeInspectItem.id,
      cartItemId: activeInspectItem.id,
      name: activeInspectItem.name,
      tagNo: `TAG-RANIPET-${activeInspectItem.id}`,
      color: 'White',
      brand: 'Nike',
      fabric: 'Cotton',
      stains: 'None',
      damage: 'No Damage',
      treatment: 'Normal Wash',
      extraCharge: 0,
      qcPassed: false,
      customerRisk: false,
      photos: [],
    };
  }, [activeInspectItem, inspections]);

  const updateActiveInspection = (field, value) => {
    if (!activeInspectItem) return;
    setInspections((prev) => ({
      ...prev,
      [activeInspectItem.id]: {
        ...(prev[activeInspectItem.id] || currentInspData),
        [field]: value,
        cartItemId: activeInspectItem.id,
        name: activeInspectItem.name,
      },
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPhotos = files.map((file, i) => ({
      id: `photo_${Date.now()}_${i}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      url: URL.createObjectURL(file),
      tag: `Inspection Photo ${(currentInspData.photos?.length || 0) + i + 1}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
    const existing = currentInspData.photos || [];
    updateActiveInspection('photos', [...existing, ...newPhotos].slice(0, 6));
    showToast?.(`📷 Uploaded ${files.length} photo(s)`);
  };

  const handleRemovePhoto = (photoId) => {
    const existing = currentInspData.photos || [];
    updateActiveInspection('photos', existing.filter((p) => p.id !== photoId));
  };

  const [previewPhoto, setPreviewPhoto] = useState(null);

  // 5. Active Section & Tab Navigation State
  const [activeTab, setActiveTab] = useState('Customer Details');

  const activeSectionIndex = useMemo(() => {
    const norm = (activeTab || '').toLowerCase();
    if (norm.includes('customer') || norm.includes('order details')) return 0;
    if (norm.includes('garment') && norm.includes('service')) return 1;
    if (norm.includes('inspect')) return 2;
    if (norm.includes('processing') || norm.includes('logistics') || norm.includes('status')) return 3;
    if (norm.includes('payment') || norm.includes('billing')) return 4;
    if (norm.includes('message') || norm.includes('review') || norm.includes('audit') || norm.includes('comment')) return 5;
    return 0;
  }, [activeTab]);

  const handlePrevTab = () => {
    if (activeSectionIndex > 0) {
      setActiveTab(SECTIONS[activeSectionIndex - 1].key);
    }
  };

  const handleNextTab = () => {
    if (activeSectionIndex < SECTIONS.length - 1) {
      setActiveTab(SECTIONS[activeSectionIndex + 1].key);
    }
  };

  // 6. Laundry Processing & Logistics Fields
  const initialProcessing = getProcessingFieldValues(order);
  const [processingPriority, setProcessingPriority] = useState(initialProcessing.processingPriority);
  const [factoryPlant, setFactoryPlant] = useState(initialProcessing.factoryPlant);
  const [bagTag, setBagTag] = useState(initialProcessing.bagTag);
  const [packagingType, setPackagingType] = useState(initialProcessing.packagingType);
  const [assignedRider, setAssignedRider] = useState(
    order?.assigned_pickup_delivery_person || order?.assigned_driver || order?.logistics?.assignedRider || ''
  );
  const [riderPhone, setRiderPhone] = useState(order?.rider_phone || order?.logistics?.riderPhone || '');
  const [vehicleNo, setVehicleNo] = useState(
    order?.assigned_driver_full || order?.vehicle_name || order?.logistics?.vehicleNo || ''
  );
  const [routeZone, setRouteZone] = useState(order?.route_from_to || order?.logistics?.routeZone || '');
  const [assignedMachine, setAssignedMachine] = useState(initialProcessing.assignedMachine);
  const [processingStage, setProcessingStage] = useState(initialProcessing.processingStage);
  const [qcInspector, setQcInspector] = useState(order?.qc_inspector || order?.workflow?.qcInspector || '');
  const [logisticsStatus, setLogisticsStatus] = useState(order?.pickup_status || '');
  const [processingInstructions, setProcessingInstructions] = useState(initialProcessing.processingInstructions);
  const processingTouchedRef = useRef(false);
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
  const barcodeVideoRef = useRef(null);
  const barcodeImageInputRef = useRef(null);
  const cameraControlsRef = useRef(null);
  const barcodeReaderRef = useRef(null);
  const barcodePreviewSvgRef = useRef(null);

  const processingStages = useMemo(() => getProcessingTimeline(order, status), [order, status]);
  const garmentBarcodeEntries = useMemo(
    () => getGarmentBarcodeEntries({ cart: cartItems, inspections }),
    [cartItems, inspections]
  );
  const scanTotalGarments = cartItems.reduce(
    (sum, item) => sum + Math.max(1, parseInt(item.qty ?? item.quantity ?? item.count, 10) || 1),
    0
  );
  const scanScannedGarments = Math.min(scannedGarmentKeys.length, scanTotalGarments);
  const scanRemainingGarments = Math.max(0, scanTotalGarments - scanScannedGarments);

  useEffect(() => {
    const identifier = order?.order_number || order?.id || order?.work_number;
    if (!identifier) return undefined;
    const sourceCart = Array.isArray(order?.items) && order.items.length > 0
      ? order.items.map((item, index) => ({
          id: item.id || index + 1,
          qty: Number(item.qty ?? item.quantity ?? 1),
        }))
      : [];
    const token = ++barcodeLoadTokenRef.current;
    let active = true;
    setBarcodesLoading(true);
    setBarcodesError('');
    fetchOrderGarmentBarcodes(identifier, sourceCart)
      .then(({ data, error }) => {
        if (!active || token !== barcodeLoadTokenRef.current) return;
        if (data?.inspections) {
          setInspections((prev) => mergeGarmentBarcodePatch(prev, data.inspections));
        }
        setBarcodesError(error || '');
        setBarcodesLoading(false);
      })
      .catch((err) => {
        if (!active || token !== barcodeLoadTokenRef.current) return;
        setBarcodesError(err?.message || 'Unable to load garment barcodes.');
        setBarcodesLoading(false);
      });
    return () => {
      active = false;
      barcodeLoadTokenRef.current += 1;
    };
  }, [order?.order_number, order?.id, order?.work_number]);

  const selectedPickupMaster = pickupMasterList.find(
    (option) => String(option.uniqueId) === String(assignedPickupPersonId)
  ) || pickupMasterList.find(
    (option) => String(option.name).toLowerCase() === String(assignedPickupPerson).trim().toLowerCase()
  ) || null;
  const logisticsSource = {
    ...(order || {}),
    assigned_pickup_person_city: selectedPickupMaster?.city || assignedPickupPersonCity,
    assigned_pickup_person_zone: selectedPickupMaster?.zone || assignedPickupPersonZone,
  };
  const logisticsDisplay = formatLogisticsDeliveryInfo(logisticsSource, selectedPickupMaster);

  const getOrderScanCodes = (sourceOrder) => [
    sourceOrder?.order_number,
    sourceOrder?.work_number,
    sourceOrder?.id,
    sourceOrder?.bag_barcode,
    sourceOrder?.dispatch_bag_tag,
    sourceOrder?.barcode,
    sourceOrder?.qr_code,
  ].filter(Boolean).map(normalizeBarcodeValue);

  const getGarmentScanEntries = () => {
    const entries = [];
    Object.entries(inspections || {}).forEach(([key, detail]) => {
      const cartItem = (cartItems || []).find((item) => String(item.id) === String(detail?.cartItemId || detail?.productId || key));
      entries.push({
        key,
        detail,
        cartItem,
        codes: [detail?.tagNumber, detail?.barcode, detail?.garment_barcode, detail?.qr_code, detail?.garmentTag, key, detail?.id]
          .filter(Boolean)
          .map(normalizeBarcodeValue),
      });
    });
    (cartItems || []).forEach((cartItem) => {
      if (entries.some((entry) => String(entry.cartItem?.id) === String(cartItem.id))) return;
      entries.push({
        key: `cart-${cartItem.id}`,
        detail: null,
        cartItem,
        codes: [cartItem.barcode, cartItem.tagNumber, cartItem.qr_code, cartItem.id]
          .filter(Boolean)
          .map(normalizeBarcodeValue),
      });
    });
    return entries;
  };

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
        const currentKeys = [order?.order_number, order?.work_number, order?.id]
          .filter(Boolean)
          .map(normalizeBarcodeValue);
        const detailOrderId = normalizeBarcodeValue(details.orderId || details.workId || details.order?.order_number);
        if (detailOrderId && currentKeys.length > 0 && !currentKeys.includes(detailOrderId)) {
          setScanResult(null);
          setScanNotice({
            severity: 'warning',
            text: `This barcode belongs to order ${details.orderId || details.workId || detailOrderId}, not ${initialOrderNum}.`,
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
                color: details.color || prev.entry?.detail?.color,
                fabric: details.fabric || prev.entry?.detail?.fabric,
                brand: details.brand || prev.entry?.detail?.brand,
                condition: details.condition || prev.entry?.detail?.condition,
                actionPlan: details.treatmentAction || prev.entry?.detail?.actionPlan,
                notes: details.inspectionNotes || prev.entry?.detail?.notes,
                processingStage: details.processingStage || prev.entry?.detail?.processingStage,
                assignedStaff: details.assignedStaff || prev.entry?.detail?.assignedStaff,
              },
              cartItem: prev.entry?.cartItem,
            },
            barcodeDetails: details,
            source: 'Supabase',
          };
        });
        return;
      }

      const { data } = await getOrderById(orderIdentifier);
      if (!data) return;
      setScanResult((prev) => {
        if (!prev || prev.code !== result.code) return prev;
        return { ...prev, order: data, source: 'Supabase' };
      });
    } catch {}
  };

  const processBarcodeValue = async (rawCode, source = 'manual') => {
    const code = normalizeBarcodeValue(rawCode);
    if (!code) {
      setScanResult(null);
      setScanNotice({ severity: 'warning', text: 'Enter or scan a barcode/QR code before pressing Scan.' });
      return;
    }

    const currentOrder = order || { order_number: initialOrderNum, id: initialOrderNum };
    const currentKeys = [currentOrder.order_number, currentOrder.work_number, currentOrder.id]
      .filter(Boolean)
      .map(normalizeBarcodeValue);
    const currentOrderLabel = currentOrder.order_number || currentOrder.id || initialOrderNum;
    const barcodeOrderId = normalizeBarcodeValue(getOrderIdFromBarcode(code));
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
      ].filter(Boolean).map(normalizeBarcodeValue);
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

    const orderMatch = getOrderScanCodes(scannedOrder).includes(code);
    const garmentMatch = getGarmentScanEntries().find((entry) => entry.codes.includes(code));

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
      text: looksLikeGarmentBarcode
        ? `No garment record found for barcode ${code}. Print the latest tag or save this order again.`
        : 'No matching order or garment barcode was found for the selected order.',
    });
  };

  const handleScannerScan = () => processBarcodeValue(scanInput, 'manual');

  const scanResultDetails = scanResult ? (() => {
    const detail = scanResult.entry?.detail || {};
    const db = scanResult.barcodeDetails || {};
    const sourceOrder = db.order || scanResult.order || order || {};
    const isOrderScan = scanResult.kind === 'order';
    const orderServices = [...new Set(cartItems.map((item) => item.serviceType || item.service).filter(Boolean))].join(', ');
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
      orderId: db.orderId || db.workNumber || sourceOrder.order_number || sourceOrder.id || initialOrderNum,
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

  const handlePrintBarcode = (entry) => {
    if (!entry?.barcode) return;
    let svg;
    try {
      svg = createBarcodeSvgElement(entry.barcode);
    } catch {
      showToast?.('This barcode cannot be encoded as Code 128. Save the order to regenerate it.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=720,height=420');
    if (!printWindow) {
      showToast?.('Allow pop-ups to print garment barcodes.');
      return;
    }
    printWindow.document.write('<!doctype html><html><head><meta charset="utf-8" /><title>Garment Barcode</title></head><body></body></html>');
    printWindow.document.close();

    const orderLine = printWindow.document.createElement('div');
    orderLine.style.cssText = 'font:600 14px Arial,sans-serif;margin-bottom:4px;';
    orderLine.textContent = `Order: ${initialOrderNum}`;

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

  // 7. Payments & Billing Fields
  const [paymentStatus, setPaymentStatus] = useState(order?.payment_status || order?.payment?.status || 'Paid in Full');
  const [paymentMode, setPaymentMode] = useState(order?.payment_method || order?.payment?.mode || 'UPI');
  const [advancePaid, setAdvancePaid] = useState(Number(order?.advance_paid !== undefined ? order.advance_paid : (order?.payment?.advancePaid || 25.65)));
  const [transactionRef, setTransactionRef] = useState('UPI/2026/8941729831');
  const [invoiceNo, setInvoiceNo] = useState('INV-WD-2026-0060');
  const [discountAmount, setDiscountAmount] = useState(Number(order?.discount_amount !== undefined ? order.discount_amount : (order?.discount || order?.payment?.discount || 2.70)));
  const [showQRModal, setShowQRModal] = useState(false);
  const [newPayMode, setNewPayMode] = useState('UPI');
  const [newPayAmount, setNewPayAmount] = useState(25.65);
  const [paymentHistory, setPaymentHistory] = useState([
    {
      id: 1,
      dateTime: '28 Oct 2026, 10:35 AM',
      mode: 'UPI (GPay)',
      ref: 'UPI/2026/8941729831',
      amount: 25.65,
      status: 'Paid',
    },
  ]);

  // 8. Messages & Conversation Fields
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [conversationMessages, setConversationMessages] = useState([
    {
      id: 'msg_1',
      type: 'outbound',
      title: 'Order Confirmed',
      time: '10:15 AM',
      date: '28 Oct 2026',
      text: `Your order #${initialOrderNum} has been confirmed.`,
    },
    {
      id: 'msg_2',
      type: 'outbound',
      title: 'Ready for Delivery',
      time: '03:20 PM',
      date: '28 Oct 2026',
      text: `Your garments are ready for delivery on ${expectedDelivery}.`,
    },
    {
      id: 'msg_3',
      type: 'inbound',
      title: customerName || 'Customer',
      time: '03:42 PM',
      date: '28 Oct 2026',
      text: 'Great, thank you!',
    },
  ]);

  // 9. Comments & Audit Fields
  const [staffNote, setStaffNote] = useState('Customer is a regular VIP. Handle silk saree with gentle enzyme wash. Light starch on formal shirts.');
  const [flags, setFlags] = useState({
    delicate: true,
    colorBleed: false,
    starch: true,
    express: false,
    stainTreatment: true,
  });

  const getInitialAuditLogs = () => {
    if (order?.audit_logs && Array.isArray(order.audit_logs) && order.audit_logs.length > 0) {
      return order.audit_logs;
    }
    return [
      {
        id: 'log_1',
        title: 'Order Intake Created',
        detail: `Order #${initialOrderNum} created for ${initialCustName || 'Customer'} (${initialOrderType})`,
        time: '28 Oct 2026, 10:15 AM',
        author: 'Admin (Counter #1)',
        type: 'create',
      },
      {
        id: 'log_2',
        title: 'Garments & Services Allocated',
        detail: 'Catalog items added to cart. Service: Laundry.',
        time: '28 Oct 2026, 10:30 AM',
        author: 'Staff (Ranipet Store)',
        type: 'items',
      },
      {
        id: 'log_3',
        title: 'Inspection & Tagging Completed',
        detail: 'Collar stain noted on T-Shirt. 3 inspection photos attached. QC Passed.',
        time: '28 Oct 2026, 10:48 AM',
        author: 'QC Lead (Ramesh K.)',
        type: 'inspection',
      },
      {
        id: 'log_4',
        title: 'Payment Received',
        detail: '₹25.65 received via UPI / Google Pay (Ref: UPI/2026/8941729831)',
        time: '28 Oct 2026, 10:35 AM',
        author: 'Cashier (Pooja M.)',
        type: 'payment',
      },
    ];
  };

  const [auditLogs, setAuditLogs] = useState(getInitialAuditLogs);
  const [newAuditNote, setNewAuditNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checklist, setChecklist] = useState({
    allInspected: true,
    paymentVerified: true,
    readyForDispatch: true,
  });

  // Sync state when order prop updates
  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name || order.customer?.customer_name || 'Arun Kumar');
      setMobileNumber(order.mobile_number || order.customer?.mobile_number || '+91 98765 43210');
      setAlternatePhone(order.alternate_phone || order.customer?.alternate_phone || '');
      setEmail(order.email || order.customer?.email || 'arun.k@example.com');
      setAddress(order.address || order.delivery_address || order.customer?.address || 'No.16, Anna Nagar, Ranipet - 632401');
      setAddresses(normalizeAdditionalAddresses(
        order.additional_addresses || order.customer?.additional_addresses || [],
      ));
      setSelectedAddressId(order.selected_customer_address_id || null);
      setShowAddressErrors(false);
      addressTokenRef.current += 1;
      setStatus(normalizeOrdersV2Status(order.status || order.order_status || 'Delivered'));
      setOrderType(order.order_type || 'Walk-in');
      deliveryTouchedRef.current = false;
      setExpectedDelivery(formatDeliveryDateTimeForDisplay(order));
      const pSplit = splitIsoToLocalDateAndTime(order.scheduled_pickup_at);
      const dSplit = splitIsoToLocalDateAndTime(resolveDisplayScheduledDelivery(order));
      setScheduledPickupDate(pSplit.date || '2026-10-28');
      setScheduledPickupTime(pSplit.time || '10:15');
      setScheduledDeliveryDate(dSplit.date || '');
      setScheduledDeliveryTime(dSplit.time || '');
      setScheduleErrors({});

      const advancedSeed = normalizeAdvancedFields(order.customer || order);
      setAdvancedFields(advancedSeed);
      setAdvancedBaseline(advancedSeed);
      setAdvancedSections(INITIAL_ADVANCED_SECTIONS);
      setAdvancedErrors({});
      const advancedToken = advancedTokenRef.current + 1;
      advancedTokenRef.current = advancedToken;
      advancedDirtyRef.current = false;
      const advancedCustomerId = order.customer_id
        || order.customerId
        || order.customer?.customer_id
        || order.customer?.customerId
        || null;
      const advancedMobile = order.mobile_number || order.customer?.mobile_number || '';
      if (advancedCustomerId || advancedMobile) {
        loadAdvancedCustomerProfile({ customerId: advancedCustomerId, mobileNumber: advancedMobile })
          .then((profile) => {
            if (!profile || advancedTokenRef.current !== advancedToken || advancedDirtyRef.current) return;
            const normalizedProfile = normalizeAdvancedFields({ ...(order.customer || {}), ...profile });
            setAdvancedFields(normalizedProfile);
            setAdvancedBaseline(normalizedProfile);
            setAlternatePhone(normalizedProfile.alternate_phone || '');
            setEmail(normalizedProfile.email || '');
          })
          .catch(() => {});
      }

      setComments(order.comments || order.order_notes || order.special_instructions || '');
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
        setCartItems(order.items.map((it, idx) => ({
          id: it.id || idx + 1,
          itemId: it.itemId || it.item_id || getClothId(it),
          name: it.name || it.item_name || 'Garment',
          service: it.service || it.service_type || 'Laundry',
          rate: Number(it.rate || it.price || 15),
          qty: Number(it.qty || it.quantity || 1),
          icon: it.icon || '🧺',
        })));
      }
      setPaymentStatus(order.payment_status || order.payment?.status || 'Paid in Full');
      setPaymentMode(order.payment_method || order.payment?.mode || 'UPI');
      setAdvancePaid(Number(order.advance_paid !== undefined ? order.advance_paid : (order.payment?.advancePaid || 25.65)));
      setDiscountAmount(Number(order.discount_amount !== undefined ? order.discount_amount : (order.discount || order.payment?.discount || 2.70)));
      processingTouchedRef.current = false;
      const nextProcessing = getProcessingFieldValues(order);
      setProcessingPriority(nextProcessing.processingPriority);
      setFactoryPlant(nextProcessing.factoryPlant);
      setBagTag(nextProcessing.bagTag);
      setPackagingType(nextProcessing.packagingType);
      setAssignedMachine(nextProcessing.assignedMachine);
      setProcessingStage(nextProcessing.processingStage);
      setProcessingInstructions(nextProcessing.processingInstructions);
      setAssignedPickupPerson(order.assigned_pickup_delivery_person || order.assigned_driver || '');
      setAssignedPickupPersonId(order.assigned_pickup_person_id || '');
      setAssignedPickupPersonCity(order.assigned_pickup_person_city || '');
      setAssignedPickupPersonZone(order.assigned_pickup_person_zone || '');
      setAssignedRider(order.assigned_pickup_delivery_person || order.assigned_driver || order.logistics?.assignedRider || '');
      setRiderPhone(order.rider_phone || order.logistics?.riderPhone || '');
      setVehicleNo(order.assigned_driver_full || order.vehicle_name || order.logistics?.vehicleNo || '');
      setRouteZone(order.route_from_to || order.logistics?.routeZone || '');
      setQcInspector(order.qc_inspector || order.workflow?.qcInspector || '');
      setLogisticsStatus(order.pickup_status || '');
      setAuditLogs(getInitialAuditLogs());
    }
  }, [order]);

  const savedOrderKey = order?.order_number || order?.work_number || order?.order_id || order?.id;
  useEffect(() => {
    if (!savedOrderKey) return undefined;
    let cancelled = false;
    getOrderById(savedOrderKey)
      .then(({ data }) => {
        if (cancelled || !data) return;
        if (!deliveryTouchedRef.current) {
          setExpectedDelivery(formatDeliveryDateTimeForDisplay(data));
          const dSplit = splitIsoToLocalDateAndTime(resolveDisplayScheduledDelivery(data));
          setScheduledDeliveryDate(dSplit.date || '');
          setScheduledDeliveryTime(dSplit.time || '');
        }
        if (!processingTouchedRef.current) {
          const nextProcessing = getProcessingFieldValues(data);
          setProcessingPriority(nextProcessing.processingPriority);
          setFactoryPlant(nextProcessing.factoryPlant);
          setBagTag(nextProcessing.bagTag);
          setPackagingType(nextProcessing.packagingType);
          setAssignedMachine(nextProcessing.assignedMachine);
          setProcessingStage(nextProcessing.processingStage);
          setProcessingInstructions(nextProcessing.processingInstructions);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [savedOrderKey]);

  const savedCustomerKey = order?.customer_id || order?.customer?.customer_id || null;
  useEffect(() => {
    if (!savedCustomerKey) return undefined;
    let cancelled = false;
    const token = addressTokenRef.current + 1;
    addressTokenRef.current = token;
    fetchCustomerAddresses(savedCustomerKey)
      .then(({ data }) => {
        if (cancelled || token !== addressTokenRef.current) return;
        if (Array.isArray(data) && data.length > 0) {
          setAddresses(normalizeAdditionalAddresses(data));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [savedCustomerKey]);

  // Sync selected product rate
  useEffect(() => {
    if (selectedProduct) {
      setRatePerPiece(selectedProduct.price || 15.00);
    }
  }, [selectedProduct]);

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      const matchCat = activeCategory === 'All' || activeCategory === 'Laundry' || activeCategory === 'Others' || item.category === activeCategory;
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  // Dynamic Cart Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.rate || 0) * Number(item.qty || 0)), 0);
  }, [cartItems]);

  const taxAmount = useMemo(() => {
    return Number((subtotal * 0.05).toFixed(2));
  }, [subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, Number((subtotal + taxAmount - Number(discountAmount || 0)).toFixed(2)));
  }, [subtotal, taxAmount, discountAmount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, Number((grandTotal - Number(advancePaid || 0)).toFixed(2)));
  }, [grandTotal, advancePaid]);

  const totalCartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [cartItems]);

  const updateAdvancedFields = (patch) => {
    advancedDirtyRef.current = true;
    const nextFields = { ...advancedFields, ...patch };
    setAdvancedFields(nextFields);
    if (patch.alternate_phone !== undefined) setAlternatePhone(String(patch.alternate_phone || ''));
    if (patch.email !== undefined) setEmail(String(patch.email || ''));
    setAdvancedErrors((previous) => {
      const next = { ...previous };
      let changed = false;
      Object.keys(patch).forEach((key) => {
        if (next[key]) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : previous;
    });

    if (patch.price_list !== undefined || patch.default_discount !== undefined) {
      const previousPercent = getCustomerPricingDiscount(advancedFields);
      const expectedAmount = Number((subtotal * previousPercent / 100).toFixed(2));
      if (Math.abs(Number(discountAmount || 0) - expectedAmount) < 0.01) {
        const nextPercent = getCustomerPricingDiscount(nextFields);
        setDiscountAmount(Number((subtotal * nextPercent / 100).toFixed(2)));
      }
    }
  };

  const applyCustomerPricing = () => {
    const discount = getCustomerPricingDiscount(effectiveAdvancedFields);
    const amount = Number((subtotal * discount / 100).toFixed(2));
    setDiscountAmount(amount);
    showToast?.(`Applied ${effectiveAdvancedFields.price_list} customer pricing (${discount}% default discount, ₹${amount}) to this order.`);
  };

  // Cart Handlers
  const handleAddToCart = (productToAdd = selectedProduct) => {
    const prod = productToAdd || selectedProduct;
    if (!prod) return;
    const newItem = {
      id: Date.now() + Math.floor(Math.random() * 100),
      itemId: prod.id,
      name: `${prod.name} (${selectedServiceType})`,
      service: selectedServiceType,
      rate: Number(prod.price || ratePerPiece),
      qty: 1,
      icon: '🧺',
    };
    setCartItems((prev) => [...prev, newItem]);
    showToast?.(`✅ Added ${prod.name} (${selectedServiceType}) to cart`);
  };

  const handleUpdateCartQty = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: Math.max(1, (it.qty || 1) + delta) } : it))
    );
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Payment Handlers
  const handleAddPayment = () => {
    const amt = Number(newPayAmount) || 0;
    if (amt <= 0) {
      showToast?.('⚠️ Please enter a valid payment amount.');
      return;
    }
    const newEntry = {
      id: paymentHistory.length + 1,
      dateTime: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      mode: newPayMode === 'UPI' ? 'UPI (GPay)' : newPayMode,
      ref: newPayMode === 'UPI' ? `UPI/${Date.now().toString().slice(-10)}` : `REF-${Date.now().toString().slice(-6)}`,
      amount: amt,
      status: 'Paid',
    };
    setPaymentHistory((prev) => [newEntry, ...prev]);
    const nextAdvance = Number((Number(advancePaid || 0) + amt).toFixed(2));
    setAdvancePaid(nextAdvance);
    if (nextAdvance >= grandTotal) {
      setPaymentStatus('Paid in Full');
    } else {
      setPaymentStatus('Partially Paid');
    }
    showToast?.(`✅ Recorded ${currencySymbol}${amt.toFixed(2)} payment via ${newPayMode}`);
  };

  const handleMarkFullyPaid = () => {
    setAdvancePaid(grandTotal);
    setPaymentStatus('Paid in Full');
    setPaymentHistory((prev) => [
      {
        id: prev.length + 1,
        dateTime: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        mode: paymentMode === 'Cash' ? 'Cash' : 'UPI (GPay)',
        ref: `SETTLE-${Date.now().toString().slice(-6)}`,
        amount: balanceDue > 0 ? balanceDue : grandTotal,
        status: 'Paid',
      },
      ...prev,
    ]);
    showToast?.('✅ Order marked as Fully Paid!');
  };

  // Message Sending Handler
  const handleSendMessage = () => {
    if (!customMessage.trim()) return;
    const newMsg = {
      id: `msg_${Date.now()}`,
      type: 'outbound',
      title: 'Staff Message',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      text: customMessage.trim(),
    };
    setConversationMessages((prev) => [...prev, newMsg]);
    const channels = [];
    if (notifyWhatsapp) channels.push('WhatsApp');
    if (notifySms) channels.push('SMS');
    if (notifyEmail) channels.push('Email');
    showToast?.(`✉️ Message sent via ${channels.join(', ') || 'Chat'}!`);
    setCustomMessage('');
  };

  const handleSelectTemplate = (templateName) => {
    let msg = '';
    switch (templateName) {
      case 'Order Confirmed':
        msg = `Hello ${customerName}, your Washdoor laundry order #${initialOrderNum} has been received and confirmed. Total garments: ${totalCartCount} pcs. Expected delivery: ${expectedDelivery}.`;
        break;
      case 'Washing Started':
        msg = `Hi ${customerName}, order #${initialOrderNum} is now undergoing quality washing and care at our central plant. We will notify you once it's ready.`;
        break;
      case 'Ready for Delivery':
        msg = `Great news ${customerName}! Your laundry order #${initialOrderNum} is fresh, pressed, and READY for delivery / pickup. Total due: ${currencySymbol}${balanceDue.toFixed(2)}.`;
        break;
      case 'Out for Delivery':
        msg = `Hello ${customerName}, your order #${initialOrderNum} is out for delivery with rider ${assignedRider} (${riderPhone}). Please keep payment ready.`;
        break;
      case 'Payment Reminder':
        msg = `Dear ${customerName}, this is a reminder for pending balance ${currencySymbol}${balanceDue.toFixed(2)} on order #${initialOrderNum}. Pay via UPI / Cash upon doorstep delivery.`;
        break;
      default:
        msg = customMessage;
    }
    setCustomMessage(msg);
  };

  const handleAddAuditLog = () => {
    if (!newAuditNote.trim()) return;
    const newEntry = {
      id: `log_${Date.now()}`,
      title: 'Manual Staff Audit Note',
      detail: newAuditNote.trim(),
      time: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      author: 'Staff Operator',
      type: 'manual',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    setNewAuditNote('');
    showToast?.('📝 Audit record added to timeline');
  };

  // Comprehensive Save
  const handleSave = async () => {
    // 1. Shared Validation
    if (!customerName || !customerName.trim()) {
      showToast?.('⚠️ Customer Name is required.');
      return;
    }
    const cleanPhone = String(mobileNumber || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast?.('⚠️ A valid 10-digit mobile number is required.');
      return;
    }

    const addressValidationErrors = validateAdditionalAddresses(normalizedAddresses);
    if (Object.keys(addressValidationErrors).length > 0) {
      setShowAddressErrors(true);
      showToast?.('⚠️ Review the highlighted additional addresses before saving.');
      return;
    }
    setShowAddressErrors(false);

    if (isOnCallOrderType(orderType) && !effectiveAddress) {
      showToast?.('⚠️ A valid selected address is required for On-Call orders.');
      return;
    }

    let resolvedScheduledPickupAt = order?.scheduled_pickup_at || null;
    let resolvedScheduledDeliveryAt = order?.scheduled_delivery_at || null;
    if (isOnCallOrderType(orderType)) {
      const schedResult = validateOnCallSchedule({
        pickupDate: scheduledPickupDate,
        pickupTime: scheduledPickupTime,
        deliveryDate: scheduledDeliveryDate,
        deliveryTime: scheduledDeliveryTime,
        isNewOrder: false,
        initialPickupIso: order?.scheduled_pickup_at || null,
      });
      if (!schedResult.isValid) {
        setScheduleErrors(schedResult.errors);
        showToast?.(`⚠️ ${Object.values(schedResult.errors)[0]}`);
        return;
      }
      setScheduleErrors({});
      resolvedScheduledPickupAt = schedResult.scheduled_pickup_at;
      resolvedScheduledDeliveryAt = schedResult.scheduled_delivery_at;
    } else {
      const deliveryResult = resolveOptionalDelivery({
        deliveryDate: scheduledDeliveryDate,
        deliveryTime: scheduledDeliveryTime,
      });
      if (!deliveryResult.isValid) {
        setScheduleErrors(deliveryResult.errors);
        showToast?.(`⚠️ ${Object.values(deliveryResult.errors)[0]}`);
        return;
      }
      setScheduleErrors({});
      resolvedScheduledDeliveryAt = deliveryResult.scheduled_delivery_at;
    }

    const advancedValidationErrors = getAdvancedErrors(effectiveAdvancedFields);
    const advancedErrorKeys = Object.keys(advancedValidationErrors);
    if (advancedErrorKeys.length > 0) {
      setAdvancedErrors(advancedValidationErrors);
      setAdvancedSections((previous) => ({
        ...previous,
        ...Object.fromEntries(advancedErrorKeys.map((field) => [getAdvancedSectionForField(field), true])),
      }));
      showToast?.('⚠️ Review the highlighted customer details before saving.');
      return;
    }
    setAdvancedErrors({});

    const totalPieces = cartItems.reduce((sum, c) => sum + Number(c.qty || 0), 0);
    const barcodeAssignment = assignGarmentBarcodes({ orderId: initialOrderNum, inspections });
    const inspectionsWithBarcodes = barcodeAssignment.inspections;
    setInspections(inspectionsWithBarcodes);
    const resolvedStatus = normalizeOrdersV2Status(status);
    const nowIso = new Date().toISOString();
    const staffActor = attendStaffName.trim() || order?.attend_staff_name || order?.assigned_staff || 'Counter Staff';
    const pickupPerson = assignedPickupPerson.trim() || assignedRider || '';
    const existingHistory = Array.isArray(order?.activity_history) && order.activity_history.length > 0
      ? [...order.activity_history]
      : (Array.isArray(auditLogs) ? [...auditLogs] : []);
    const newEntries = [];

    if (resolvedStatus !== normalizeOrdersV2Status(order?.order_status || order?.status)) {
      newEntries.push({
        id: `act_status_${Date.now()}`,
        type: resolvedStatus === 'Delivered' ? 'collection' : 'status',
        title: resolvedStatus === 'Delivered' ? 'Order Delivered' : 'Status Updated',
        detail: resolvedStatus === 'Delivered'
          ? `Garments delivered (${pickupPerson || customerName})`
          : `Status changed to ${resolvedStatus}`,
        staff: staffActor,
        timestamp: nowIso,
      });
    }

    const prevItemCount = Array.isArray(order?.items) ? order.items.length : 0;
    const prevCartSig = (order?.items || []).map((i) => `${i.name}:${i.qty}:${i.service || i.serviceType || ''}`).join('|');
    const nextCartSig = cartItems.map((i) => `${i.name}:${i.qty}:${i.service || ''}`).join('|');
    if (prevCartSig !== nextCartSig || prevItemCount !== cartItems.length) {
      const breakdownText = formatServiceBreakdown(cartItems, order?.service_category || 'Laundry', true);
      newEntries.push({
        id: `act_svc_${Date.now() + 1}`,
        type: 'service',
        title: 'Service Updated',
        detail: breakdownText || `Order items updated (${totalPieces} pcs)`,
        staff: staffActor,
        timestamp: nowIso,
      });
    }

    const prevAdv = Number(order?.advance_paid || 0);
    const nextAdv = Number(advancePaid || 0);
    if (nextAdv > 0 && (nextAdv !== prevAdv || paymentStatus !== order?.payment_status)) {
      newEntries.push({
        id: `act_pay_${Date.now() + 2}`,
        type: 'payment',
        title: 'Payment Received',
        detail: `${currencySymbol}${nextAdv.toFixed(2)} received via ${paymentMode}`,
        staff: staffActor,
        timestamp: nowIso,
      });
    }

    const combinedHistory = [...newEntries, ...existingHistory];
    const resolvedPaymentReceivedAt = nextAdv > 0
      ? (nextAdv !== prevAdv ? nowIso : (order?.payment_received_at || nowIso))
      : order?.payment_received_at || null;
    const resolvedCollectionAt = resolvedStatus === 'Delivered'
      ? nowIso
      : (order?.collection_at || null);
    const resolvedCollectedBy = resolvedStatus === 'Delivered'
      ? (order?.collected_by_person || pickupPerson || customerName || 'Customer')
      : (order?.collected_by_person || '');
    const processingPayload = buildProcessingPayload({
      processingPriority,
      factoryPlant,
      bagTag,
      packagingType,
      assignedMachine,
      processingStage,
      processingInstructions,
    });

    const updatedOrder = {
      ...(order || {}),
      id: order?.id || initialOrderNum,
      order_number: initialOrderNum,
      order_id: initialOrderNum,
      customer_name: customerName,
      mobile_number: mobileNumber,
      alternate_phone: alternatePhone,
      email: email,
      address: effectiveAddress,
      additional_addresses: toStoredAdditionalAddresses(normalizedAddresses),
      selected_customer_address_id: selectedAddress?.id || null,
      selected_address: effectiveAddress,
      status: resolvedStatus,
      order_status: resolvedStatus,
      order_type: orderType,
      expected_delivery: expectedDelivery === NOT_SCHEDULED_LABEL ? '' : expectedDelivery,
      scheduled_pickup_at: isOnCallOrderType(orderType) ? resolvedScheduledPickupAt : (order?.scheduled_pickup_at || null),
      scheduled_delivery_at: resolvedScheduledDeliveryAt,
      comments: comments,
      special_instructions: comments,
      order_notes: comments,
      ...processingPayload,
      items: cartItems.map((c) => ({
        id: c.id,
        name: c.name,
        service: c.service || 'Laundry',
        serviceType: c.service || 'Laundry',
        rate: c.rate,
        qty: c.qty,
        quantity: c.qty,
        total: c.rate * c.qty,
        icon: c.icon || '👕',
        inspections: Object.values(inspectionsWithBarcodes).filter((p) => p.cartItemId === c.id || p.productId === c.id || String(p.id).startsWith(`${c.id}-`)),
      })),
      services_allocated: cartItems.map((c) => ({
        name: c.name,
        count: c.qty,
        serviceType: c.service || c.serviceType || 'Laundry',
        service: c.service || c.serviceType || 'Laundry',
        icon: c.icon || '👕',
      })),
      item_count: totalPieces,
      total_pieces: totalPieces,
      cart: cartItems,
      garment_inspections: inspectionsWithBarcodes,
      inspections: inspectionsWithBarcodes,
      photos: Object.values(inspectionsWithBarcodes).flatMap((p) => p.photos || []),
      inspection: {
        garment: Object.values(inspectionsWithBarcodes)[0]?.name || 'T-Shirt',
        color: Object.values(inspectionsWithBarcodes)[0]?.color || 'White',
        stains: Object.values(inspectionsWithBarcodes)[0]?.stains || '',
        make: Object.values(inspectionsWithBarcodes)[0]?.make || '',
        brand: Object.values(inspectionsWithBarcodes)[0]?.brand || 'Nike',
        fabric: Object.values(inspectionsWithBarcodes)[0]?.fabric || 'Cotton',
        notes: Object.values(inspectionsWithBarcodes)[0]?.notes || '',
        photos: Object.values(inspectionsWithBarcodes).flatMap((p) => p.photos || []),
      },
      logistics: {
        factoryPlant,
        assignedRider,
        riderPhone,
        vehicleNo,
        routeZone,
        pickupTime: formatDeliveryInputsForDisplay(scheduledPickupDate, scheduledPickupTime),
        deliverySlot: expectedDelivery,
        dispatchBagTag: bagTag,
        logisticsStatus,
        driverInstructions: processingInstructions,
      },
      workflow: {
        assignedMachine,
        qcInspector,
        statusRemark: processingInstructions,
      },
      payment: {
        status: paymentStatus,
        mode: paymentMode,
        advancePaid: Number(advancePaid || 0),
        balanceDue: balanceDue,
        subtotal: subtotal,
        tax: taxAmount,
        discount: Number(discountAmount || 0),
        grandTotal: grandTotal,
        invoiceNo: invoiceNo,
        transactionRef: transactionRef,
        note: staffNote,
      },
      grand_total: grandTotal,
      advance_paid: Number(advancePaid || 0),
      balance_due: balanceDue,
      payment_status: paymentStatus,
      staff_notes: staffNote,
      flags: flags,
      attend_staff_id: attendStaffId || null,
      attend_staff_name: staffActor,
      assigned_staff: staffActor,
      assigned_pickup_person_id: assignedPickupPersonId || null,
      assigned_pickup_person_city: assignedPickupPersonCity,
      assigned_pickup_person_zone: assignedPickupPersonZone,
      assigned_pickup_delivery_person: pickupPerson,
      assigned_driver: pickupPerson || assignedRider,
      assigned_driver_full: pickupPerson ? `${pickupPerson} (${vehicleNo})` : `${assignedRider} (${vehicleNo})`,
      status_updated_at: nowIso,
      status_updated_by: staffActor,
      activity_history: combinedHistory,
      payment_received_at: resolvedPaymentReceivedAt,
      payment_received_by: nextAdv > 0 ? staffActor : (order?.payment_received_by || ''),
      collection_at: resolvedCollectionAt,
      collected_by_person: resolvedCollectedBy,
      pickup_status: logisticsStatus,
      assigned_for_pickup: Boolean(pickupPerson || assignedRider || logisticsStatus === 'Assigned for Pickup'),
      audit_logs: combinedHistory,
      logs: combinedHistory,
      updated_at: nowIso,
    };

    const customerId = order?.customer_id
      || order?.customerId
      || order?.customer_code
      || order?.customer?.customer_id
      || order?.customer?.customerId
      || order?.customer?.customer_code
      || order?.customer?.id
      || null;
    if (customerId) {
      const changedAdvanced = getChangedAdvancedPayload(effectiveAdvancedFields, advancedBaseline);
      const { error: customerUpdateError } = await updateCustomer(customerId, {
        customer_id: customerId,
        ...changedAdvanced,
        additional_addresses: toStoredAdditionalAddresses(normalizedAddresses),
      });
      if (customerUpdateError) {
        showToast?.(`⚠️ ${customerUpdateError.message || 'Could not save customer details.'}`);
        return;
      }
      setAdvancedBaseline(effectiveAdvancedFields);
      advancedDirtyRef.current = false;
    }

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    }

    // Direct Supabase update
    const saveKey = updatedOrder.order_number || updatedOrder.id || updatedOrder.work_number;
    if (saveKey) {
      updateOrderInSupabase(saveKey, {
        status: updatedOrder.status,
        orderStatus: updatedOrder.status,
        customerName: updatedOrder.customer_name,
        mobileNumber: updatedOrder.mobile_number,
        alternatePhone: updatedOrder.alternate_phone,
        email: updatedOrder.email,
        address: updatedOrder.address,
        additional_addresses: updatedOrder.additional_addresses,
        selected_customer_address_id: updatedOrder.selected_customer_address_id,
        selected_address: updatedOrder.selected_address,
        serviceCategory: updatedOrder.service_category,
        orderType: updatedOrder.order_type,
        expectedDelivery: updatedOrder.expected_delivery,
        deliveryDate: updatedOrder.expected_delivery,
        ...(isOnCallOrderType(updatedOrder.order_type)
          ? { scheduled_pickup_at: updatedOrder.scheduled_pickup_at }
          : {}),
        scheduled_delivery_at: updatedOrder.scheduled_delivery_at,
        ...processingPayload,
        orderNotes: updatedOrder.comments,
        subtotal: subtotal,
        discountAmount: Number(discountAmount || 0),
        taxAmount: taxAmount,
        totalAmount: grandTotal,
        grandTotal: grandTotal,
        advancePaid: Number(advancePaid || 0),
        paymentStatus: paymentStatus,
        paymentMethod: paymentMode,
        assignedStaff: staffActor,
        attend_staff_id: attendStaffId || null,
        attend_staff_name: staffActor,
        assigned_pickup_person_id: assignedPickupPersonId || null,
        assigned_pickup_person_city: assignedPickupPersonCity,
        assigned_pickup_person_zone: assignedPickupPersonZone,
        assigned_pickup_delivery_person: pickupPerson,
        assigned_driver: pickupPerson || assignedRider,
        assigned_driver_full: pickupPerson ? `${pickupPerson} (${vehicleNo})` : `${assignedRider} (${vehicleNo})`,
        status_updated_at: nowIso,
        status_updated_by: staffActor,
        activity_history: combinedHistory,
        payment_received_at: resolvedPaymentReceivedAt,
        payment_received_by: nextAdv > 0 ? staffActor : (order?.payment_received_by || ''),
        collection_at: resolvedCollectionAt,
        collected_by_person: resolvedCollectedBy,
        staff_notes: staffNote,
        flags: flags,
        items: updatedOrder.items,
        garment_inspections: inspectionsWithBarcodes,
      }).catch((e) => console.warn('Supabase SideEdit update note:', e));
    }

    // Persist to local cache so updates remain immediate
    try {
      const cached = localStorage.getItem('washdoor_orders_cache');
      if (cached) {
        const list = JSON.parse(cached);
        const nextList = list.map((o) =>
          o.id === updatedOrder.id || o.order_number === updatedOrder.order_number ? updatedOrder : o
        );
        localStorage.setItem('washdoor_orders_cache', JSON.stringify(nextList));
      }
    } catch {}

    showToast?.(`✅ Order ${initialOrderNum} updated successfully with all 6 sections saved!`);
    onClose();
  };

  const getStatusClass = (st) => {
    const s = String(st).toLowerCase();
    if (s.includes('ready')) return 'ready';
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('cancel')) return 'cancelled';
    if (s.includes('progress') || s.includes('wash')) return 'in-progress';
    return 'received';
  };

  if (!isOpen || !order) return null;

  return (
    <div className="side-edit-backdrop" onClick={onClose}>
      <div className="side-edit-panel" onClick={(e) => e.stopPropagation()}>
        {/* ── Fixed Header ── */}
        <div className="side-edit-header">
          <div className="side-edit-header-left">
            <div className="side-edit-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="side-edit-title-wrap">
              <h2 className="side-edit-title">Edit Order — {initialOrderNum}</h2>
              <p className="side-edit-subtitle">Update customer, garments, services and order details.</p>
            </div>
          </div>

          <div className="side-edit-header-right">
            <div className={`side-edit-status-badge ${getStatusClass(status)}`}>
              <span className="side-edit-status-dot" />
              <span>{status}</span>
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

        {/* ── Main Layout: Fixed Left Navigation + Independent Scrollable Content Area ── */}
        <div className="side-edit-main-layout">
          {/* Fixed Left Sidebar Navigation with 6 Sections */}
          <aside className="side-edit-sidebar" aria-label="Order Sections">
            {SECTIONS.map((sec, idx) => {
              const isActive = activeSectionIndex === idx;
              return (
                <button
                  key={sec.id}
                  type="button"
                  className={`side-edit-nav-item side-edit-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(sec.key);
                    showToast?.(`Switched to: ${sec.label}`);
                  }}
                  title={sec.label}
                >
                  <span className="side-edit-nav-icon">{sec.icon}</span>
                  <span className="side-edit-nav-label">{sec.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Right Content Area with Independent Scrolling */}
          <div className="side-edit-body">
            {/* ════════ SECTION 1: CUSTOMER DETAILS ════════ */}
            {activeSectionIndex === 0 && (
              <div className="side-edit-card">
                <div className="side-edit-card-head">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Customer Details</span>
                </div>

                <div className="side-edit-row-2col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Customer Name <span className="side-edit-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Arun Kumar"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Phone Number <span className="side-edit-req">*</span>
                    </label>
                    <div className="side-edit-icon-wrap">
                     
                      <input
                        type="text"
                        className="side-edit-input"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 98XXX 45XXX"
                      />
                    </div>
                  </div>
                </div>

                <div className="side-edit-row-2col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">Alternate Phone</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="Secondary contact"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Email Address</label>
                    <input
                      type="email"
                      className="side-edit-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@email.com"
                    />
                  </div>
                </div>

                <div className="side-edit-field">
                  <label className="side-edit-label">
                    Address (Optional for Walk-In)
                  </label>
                  <textarea
                    rows={2}
                    className="side-edit-textarea"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="No.16, Anna Nagar, Ranipet - 632401"
                  />
                  <OrdersV2AddressManager
                    value={normalizedAddresses}
                    onChange={(next) => setAddresses(normalizeAdditionalAddresses(next))}
                    selectedId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                    showErrors={showAddressErrors}
                  />
                </div>

                <div className="side-edit-row-2col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Order Type <span className="side-edit-req">*</span>
                    </label>
                    <div className="side-edit-segmented-group">
                      <button
                        type="button"
                        className={`side-edit-segmented-btn ${!isOnCallOrderType(orderType) ? 'active' : ''}`}
                        onClick={() => {
                          setOrderType('Walk-in');
                          setScheduleErrors({});
                        }}
                      >
                        <span>🏬</span> Walk-In (Counter)
                      </button>
                      <button
                        type="button"
                        className={`side-edit-segmented-btn ${isOnCallOrderType(orderType) ? 'active' : ''}`}
                        onClick={() => {
                          setOrderType('On-Call');
                          setScheduleErrors({});
                        }}
                      >
                        <span>🚚</span> On-Call (Pickup &amp; Delivery)
                      </button>
                    </div>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Delivery Date &amp; Time <span className="side-edit-req">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="date"
                        className="side-edit-input"
                        value={scheduledDeliveryDate}
                        onChange={(e) => {
                          deliveryTouchedRef.current = true;
                          setScheduledDeliveryDate(e.target.value);
                          setExpectedDelivery(formatDeliveryInputsForDisplay(e.target.value, scheduledDeliveryTime));
                        }}
                        aria-label="Delivery Date"
                      />
                      <input
                        type="time"
                        className="side-edit-input"
                        value={scheduledDeliveryTime}
                        onChange={(e) => {
                          deliveryTouchedRef.current = true;
                          setScheduledDeliveryTime(e.target.value);
                          setExpectedDelivery(formatDeliveryInputsForDisplay(scheduledDeliveryDate, e.target.value));
                        }}
                        aria-label="Delivery Time"
                      />
                    </div>
                  </div>
                </div>

                {isOnCallOrderType(orderType) && (
                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Scheduled Pickup Date &amp; Time <span className="side-edit-req">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="date"
                        className="side-edit-input"
                        value={scheduledPickupDate}
                        onChange={(e) => setScheduledPickupDate(e.target.value)}
                        aria-label="Pickup Date"
                      />
                      <input
                        type="time"
                        className="side-edit-input"
                        value={scheduledPickupTime}
                        onChange={(e) => setScheduledPickupTime(e.target.value)}
                        aria-label="Pickup Time"
                      />
                    </div>
                  </div>
                )}

                {/* Staff Assignment: Counter Staff & Pickup/Delivery Staff */}
                <div className="side-edit-row-2col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Counter Staff <span className="side-edit-req">*</span> (Attend Staff Name)
                    </label>
                    <StaffSearchDropdown
                      id="side-edit-attend-staff"
                      variant="staff"
                      options={staffMasterList}
                      value={attendStaffId}
                      fallbackName={attendStaffName}
                      onChange={(selected) => {
                        setAttendStaffId(selected ? selected.uniqueId : '');
                        setAttendStaffName(selected ? selected.name : '');
                      }}
                      loading={staffMasterLoading}
                      error={staffMasterError}
                      onRetry={loadStaffAndPickupMasters}
                      placeholder="Ramesh K. (CNT102)"
                      emptyMessage="No active staff found"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Pickup Staff (Assigned Pickup &amp; Delivery Person)
                    </label>
                    <StaffSearchDropdown
                      id="side-edit-pickup-person"
                      variant="pickup"
                      options={pickupMasterList}
                      value={assignedPickupPersonId}
                      fallbackName={assignedPickupPerson}
                        onChange={(selected) => {
                          const nextName = selected ? selected.name : '';
                          setAssignedPickupPersonId(selected ? selected.uniqueId : '');
                          setAssignedPickupPerson(nextName);
                          setAssignedPickupPersonCity(selected ? selected.city || '' : '');
                          setAssignedPickupPersonZone(selected ? selected.zone || '' : '');
                          setAssignedRider(nextName);
                        }}
                      loading={pickupMasterLoading}
                      error={pickupMasterError}
                      onRetry={loadStaffAndPickupMasters}
                      placeholder="Suresh R. (PUP204)"
                      emptyMessage="No active pickup staff found"
                    />
                  </div>
                </div>

                <div className="side-edit-row-2col">
                  <div className="side-edit-field">
                    <label className="side-edit-label">
                      Current Order Status <span className="side-edit-req">*</span>
                    </label>
                    <select
                      className="side-edit-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Order Received">Order Received</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Ready">Ready for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Special Instructions / Comments</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Customer special requests or instructions..."
                    />
                  </div>
                </div>

                <div className="side-edit-advanced-customer" data-inspect="side-advanced-customer-details">
                  <OrdersV2AdvancedCustomerDetails
                    fields={effectiveAdvancedFields}
                    errors={advancedErrors}
                    sections={advancedSections}
                    onChange={updateAdvancedFields}
                    onSectionChange={(section, isExpanded) => setAdvancedSections((previous) => ({ ...previous, [section]: isExpanded }))}
                    orderPreferenceOptions={advancedOrderPreferenceOptions}
                    reviewLines={buildAdvancedReviewLines({
                      customerName,
                      address: effectiveAddress,
                      onCall: isOnCallOrderType(orderType),
                      staff: attendStaffName,
                      itemCount: totalCartCount,
                      pickupDate: scheduledPickupDate,
                      pickupTime: scheduledPickupTime,
                      deliveryDate: scheduledDeliveryDate,
                      deliveryTime: scheduledDeliveryTime,
                    })}
                    onApplyPricing={applyCustomerPricing}
                  />
                </div>
              </div>
            )}

            {/* ════════ SECTION 2: GARMENTS & SERVICES ════════ */}
            {activeSectionIndex === 1 && (
              <div className="side-edit-services-split">
                {/* Left Side – Garment Catalog */}
                <div className="side-edit-card side-edit-catalog-box">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <span>Garment Catalog</span>
                  </div>

                  {/* Category Filter Pills */}
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

                  {/* Search Garment Bar */}
                  <div className="side-edit-icon-wrap">
                   
                    <input
                      type="text"
                      className="side-edit-input"
                      placeholder="Search garment (e.g. Shirt, Saree...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Service Selection Dropdown */}
                  <div className="side-edit-field">
                    <ServiceTypeSelect
                      id="side-edit-service-type"
                      label="Select Service"
                      labelClassName="side-edit-label"
                      selectClassName="side-edit-select"
                      value={selectedServiceType}
                      onChange={setSelectedServiceType}
                      onServiceAdded={(added, isNew) => {
                        if (isNew) showToast?.(`✅ Added service type "${added}"`);
                      }}
                    />
                  </div>

                  {/* Garment Grid */}
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
                          <div className="side-edit-prod-info">
                            <span className="side-edit-prod-name" title={item.name}>
                              {item.name}
                            </span>
                            <span className="side-edit-prod-price">
                              <span>{currencySymbol}{item.price.toFixed(2)}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            className="side-edit-prod-add"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                          >
                            + Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side – Order Cart */}
                <div className="side-edit-card side-edit-item-details-box">
                  <div className="side-edit-card-head" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      </svg>
                      <span>Order Cart ({cartItems.length} items)</span>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => handleAddToCart(selectedProduct)}
                    >
                      + Add Service
                    </button>
                  </div>

                  {/* Cart Items List */}
                  <div className="side-edit-cart-list">
                    {cartItems.map((c) => (
                      <div key={c.id} className="side-edit-cart-item">
                        <div className="side-edit-cart-item-title">
                          <div className="side-edit-cart-item-thumb">
                            <ClothIllustration itemId={c.itemId || getClothId(c)} size={24} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="side-edit-cart-item-name">{c.name.split(' (')[0]}</span>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>{c.service || 'Laundry'}</span>
                          </div>
                        </div>

                        <div className="side-edit-qty-row" style={{ height: '28px', maxWidth: '85px' }}>
                          <button
                            type="button"
                            className="side-edit-qty-btn"
                            onClick={() => handleUpdateCartQty(c.id, -1)}
                          >
                            -
                          </button>
                          <span className="side-edit-qty-val" style={{ fontSize: '12px' }}>{c.qty}</span>
                          <button
                            type="button"
                            className="side-edit-qty-btn"
                            onClick={() => handleUpdateCartQty(c.id, 1)}
                          >
                            +
                          </button>
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
                    {cartItems.length === 0 && (
                      <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '24px 0', fontStyle: 'italic' }}>
                        Cart is empty. Click "+ Add" on any garment on the left.
                      </div>
                    )}
                  </div>

                  {/* Dynamic Totals */}
                  <div className="side-edit-cart-totals" style={{ marginTop: 'auto' }}>
                    <div className="side-edit-total-line">
                      <span>Subtotal</span>
                      <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="side-edit-total-line">
                      <span>Discount</span>
                      <span>- {currencySymbol}{Number(discountAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="side-edit-total-line">
                      <span>GST (5%)</span>
                      <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="side-edit-total-line grand">
                      <span>Grand Total</span>
                      <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════ SECTION 3: GARMENT INSPECTION & QUALITY CHECK ════════ */}
            {activeSectionIndex === 2 && (
              <GarmentInspectionSection
                cart={cartItems}
                inspections={inspections}
                onChangeInspections={setInspections}
                showToast={showToast}
                currencySymbol={currencySymbol}
                orderNumber={order?.order_number || initialOrderNum}
              />
            )}

            {/* ════════ SECTION 4: LAUNDRY PROCESSING & WORKFLOW ════════ */}
            {activeSectionIndex === 3 && (
              <>
                <div className="side-edit-card">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="3"></rect>
                      <circle cx="12" cy="13" r="5"></circle>
                      <path d="M12 18a5 5 0 0 0 5-5"></path>
                    </svg>
                    <span>Laundry Processing &amp; Workflow</span>
                  </div>

                  <div className="side-edit-row-3col">
                    <div className="side-edit-field">
                      <label className="side-edit-label">
                        Processing Priority <span className="side-edit-req">*</span>
                      </label>
                      <select
                        className="side-edit-select"
                        value={processingPriority}
                        onChange={(e) => {
                          processingTouchedRef.current = true;
                          setProcessingPriority(e.target.value);
                        }}
                      >
                        {withCurrentOption(PROCESSING_PRIORITIES, processingPriority).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">
                        Required Factory / Plant <span className="side-edit-req">*</span>
                      </label>
                      <select
                        className="side-edit-select"
                        value={factoryPlant}
                        onChange={(e) => {
                          processingTouchedRef.current = true;
                          setFactoryPlant(e.target.value);
                        }}
                      >
                        {withCurrentOption(FACTORY_PLANTS, factoryPlant).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">Bag Tag / Crate No.</label>
                      <input
                        type="text"
                        className="side-edit-input"
                        value={bagTag}
                        onChange={(e) => {
                          processingTouchedRef.current = true;
                          setBagTag(e.target.value);
                        }}
                        placeholder="Not Assigned"
                      />
                    </div>
                  </div>

                  <div className="side-edit-row-2col">
                    <div className="side-edit-field">
                      <label className="side-edit-label">Packaging Type</label>
                      <select
                        className="side-edit-select"
                        value={packagingType}
                        onChange={(e) => {
                          processingTouchedRef.current = true;
                          setPackagingType(e.target.value);
                        }}
                      >
                        {withCurrentOption(PACKAGING_TYPES, packagingType).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">
                        Expected Delivery Date &amp; Time <span className="side-edit-req">*</span>
                      </label>
                      <input
                        type="text"
                        className="side-edit-input"
                        value={expectedDelivery}
                        readOnly
                        placeholder="Not Scheduled"
                      />
                    </div>
                  </div>

                  <div className="side-edit-row-2col">
                    <div className="side-edit-field">
                      <label className="side-edit-label">Assigned Machine</label>
                      <select
                        className="side-edit-select"
                        value={assignedMachine}
                        onChange={(e) => {
                          processingTouchedRef.current = true;
                          setAssignedMachine(e.target.value);
                        }}
                      >
                        {withCurrentOption(ASSIGNED_MACHINES, assignedMachine).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">Current Processing Stage</label>
                      <select
                        className="side-edit-select"
                        value={processingStage}
                        onChange={(e) => {
                          processingTouchedRef.current = true;
                          setProcessingStage(e.target.value);
                        }}
                      >
                        {withCurrentOption(PROCESSING_STAGES, processingStage).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Logistics &amp; Delivery Information</label>
                    <input
                      type="text"
                      className="side-edit-input"
                      value={logisticsDisplay}
                      readOnly
                      placeholder="Not Assigned"
                    />
                  </div>

                  <div className="side-edit-field">
                    <label className="side-edit-label">Processing Instructions</label>
                    <textarea
                      rows={2}
                      className="side-edit-textarea"
                      value={processingInstructions}
                      onChange={(e) => {
                        processingTouchedRef.current = true;
                        setProcessingInstructions(e.target.value);
                      }}
                      placeholder="Special care directions, stain notes, or customer delivery requests..."
                    />
                  </div>
                </div>

                {/* Card 2: Dynamic Processing Progress Timeline */}
                <div className="side-edit-card">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span>Processing Progress Timeline</span>
                  </div>

                  <div className="side-edit-stepper-track">
                    {processingStages.map((step, idx) => (
                      <div
                        key={step.name}
                        className={`side-edit-stepper-item ${step.isCompleted ? 'completed' : ''} ${step.isActive ? 'active' : ''}`}
                        onClick={() => {
                          setStatus(step.statusTarget);
                          showToast?.(`Updated status to ${step.statusTarget}`);
                        }}
                        title={`Click to set status to ${step.statusTarget}`}
                      >
                        {idx < processingStages.length - 1 && (
                          <div className={`side-edit-stepper-line ${step.isCompleted ? 'completed' : ''}`} />
                        )}
                        <div className="side-edit-stepper-node">
                          {step.isCompleted ? '✓' : idx + 1}
                        </div>
                        <span className="side-edit-stepper-label">{step.name}</span>
                        <span className="side-edit-stepper-time">{step.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="side-edit-card side-edit-barcode-card">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                      <line x1="14" y1="14" x2="14" y2="21"></line>
                      <line x1="21" y1="14" x2="21" y2="21"></line>
                      <line x1="14" y1="17.5" x2="21" y2="17.5"></line>
                    </svg>
                    <span>Order &amp; Garment Scanner</span>
                  </div>

                  <div className="side-edit-scan-modes">
                    <button
                      type="button"
                      className={`side-edit-scan-mode-btn ${scanMode === 'order' ? 'active' : ''}`}
                      onClick={() => handleScanModeChange(null, 'order')}
                    >
                      Scan Order
                    </button>
                    <button
                      type="button"
                      className={`side-edit-scan-mode-btn ${scanMode === 'garment' ? 'active' : ''}`}
                      onClick={() => handleScanModeChange(null, 'garment')}
                    >
                      Scan Garment
                    </button>
                  </div>

                  <div className="side-edit-scan-row">
                    <input
                      type="text"
                      className="side-edit-scan-input"
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
                      placeholder={scanMode === 'order' ? 'Scan or enter order barcode / ID' : 'Scan or enter garment tag / barcode'}
                    />
                    <button type="button" className="side-edit-scan-btn" onClick={handleScannerScan}>
                      Scan
                    </button>
                  </div>

                  <div className="side-edit-scan-tools">
                    <button
                      type="button"
                      className="side-edit-scan-tool-btn"
                      onClick={cameraActive ? stopCameraScanner : startCameraScanner}
                    >
                      {cameraActive ? 'Stop Camera' : 'Scan with Camera'}
                    </button>
                    <button
                      type="button"
                      className="side-edit-scan-tool-btn"
                      onClick={() => barcodeImageInputRef.current?.click()}
                    >
                      Upload Barcode Image
                    </button>
                    <input
                      ref={barcodeImageInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleBarcodeImageUpload}
                    />
                  </div>

                  <video
                    ref={barcodeVideoRef}
                    playsInline
                    muted
                    className={`side-edit-scan-video ${cameraActive ? 'active' : ''}`}
                  />

                  <div className={`side-edit-scan-notice ${scanNotice.severity || 'info'}`}>
                    {scanNotice.text || 'Use camera, uploaded image, USB scanner or manual entry. Codes are verified against live Supabase order and garment records.'}
                  </div>

                  <div className="side-edit-scan-counts">
                    <span className="side-edit-scan-count blue">Total: {scanTotalGarments}</span>
                    <span className="side-edit-scan-count green">Scanned: {scanScannedGarments}</span>
                    <span className="side-edit-scan-count grey">Remaining: {scanRemainingGarments}</span>
                  </div>

                  {scanResultDetails && (
                    <div className="side-edit-scan-details">
                      <div className="side-edit-scan-details-head">
                        <span>✓</span>
                        <strong>Barcode matched successfully</strong>
                      </div>
                      <div className="side-edit-detail-grid">
                        <div className="side-edit-detail-item"><span>Order ID</span><strong>{scanResultDetails.orderId}</strong></div>
                        <div className="side-edit-detail-item"><span>Customer</span><strong>{scanResultDetails.customer}</strong></div>
                        <div className="side-edit-detail-item"><span>Phone</span><strong>{scanResultDetails.customerPhone}</strong></div>
                        <div className="side-edit-detail-item"><span>Expected Delivery</span><strong>{scanResultDetails.expectedDelivery}</strong></div>
                        <div className="side-edit-detail-item wide"><span>Customer Address</span><strong>{scanResultDetails.customerAddress}</strong></div>
                        <div className="side-edit-detail-item"><span>Garment</span><strong>{scanResultDetails.garment} • Qty: {scanResultDetails.garmentQuantity}</strong></div>
                        <div className="side-edit-detail-item"><span>Unique Barcode</span><strong>{scanResultDetails.garmentTag}</strong></div>
                        <div className="side-edit-detail-item"><span>Service</span><strong>{scanResultDetails.service}</strong></div>
                        <div className="side-edit-detail-item"><span>Order Status</span><strong>{scanResultDetails.orderStatus}</strong></div>
                        <div className="side-edit-detail-item"><span>Processing Stage</span><strong>{scanResultDetails.processingStage}</strong></div>
                        <div className="side-edit-detail-item"><span>Assigned Staff</span><strong>{scanResultDetails.assignedStaff}</strong></div>
                        <div className="side-edit-detail-item wide"><span>Inspection Details</span><strong>{scanResultDetails.inspection}</strong></div>
                        <div className="side-edit-detail-item wide"><span>Processing Instructions</span><strong>{scanResultDetails.processingInstructions}</strong></div>
                        <div className="side-edit-detail-item wide">
                          <span>Garment Counts</span>
                          <strong>
                            Total: {scanResultDetails.totalGarments} • Scanned: {scanResultDetails.scannedGarments} • Remaining: {scanResultDetails.remainingGarments}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="side-edit-card side-edit-barcode-card">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="5" x2="4" y2="19"></line>
                      <line x1="8" y1="5" x2="8" y2="19"></line>
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="16" y1="5" x2="16" y2="19"></line>
                      <line x1="20" y1="5" x2="20" y2="19"></line>
                    </svg>
                    <span>Individual Garment Barcodes</span>
                  </div>
                  <div className="side-edit-barcode-caption">
                    Save order → generate unique Code 128 garment tags → print &amp; attach → scan garment → view live order details.
                  </div>
                  {barcodesLoading && (
                    <div className="side-edit-barcode-loading">
                      <span className="side-edit-barcode-spinner" />
                      Loading garment barcodes…
                    </div>
                  )}
                  {!barcodesLoading && barcodesError && (
                    <div className="side-edit-barcode-error">{barcodesError}</div>
                  )}
                  <div className="side-edit-barcode-cards-scroll">
                    <div className="side-edit-barcode-grid">
                      {garmentBarcodeEntries.map((entry) => (
                        <div className="side-edit-barcode-card-item" key={entry.key}>
                          <div className="side-edit-barcode-card-inner">
                            <div className="side-edit-barcode-card-title">
                              <strong>{entry.garmentName} – Piece {entry.piece}</strong>
                              <span>{entry.cartItem?.serviceType || entry.cartItem?.service || 'Laundry service'}</span>
                            </div>
                            {entry.barcode
                              ? <GarmentBarcodeSvg value={entry.barcode} label={entry.barcode} />
                              : (
                                <div className="side-edit-barcode-pending">
                                  Generated when order is saved
                                </div>
                              )}
                            <div className="side-edit-barcode-value">{entry.barcode || 'Pending generation'}</div>
                            <div className="side-edit-barcode-actions">
                              <button
                                type="button"
                                disabled={!entry.barcode}
                                onClick={() => setBarcodePreviewEntry(entry)}
                              >
                                View Barcode
                              </button>
                              <button
                                type="button"
                                className="primary"
                                disabled={!entry.barcode}
                                onClick={() => handlePrintBarcode(entry)}
                              >
                                Print Barcode
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════════ SECTION 5: PAYMENTS & BILLING ════════ */}
            {activeSectionIndex === 4 && (
              <>
                <div className="side-edit-payments-top-grid">
                  {/* Left Card: Totals & Summary */}
                  <div className="side-edit-card">
                    <div className="side-edit-card-head">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <span>Payments, Invoicing &amp; Billing</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="side-edit-total-line">
                        <span>Subtotal</span>
                        <strong style={{ color: '#0f172a' }}>{currencySymbol}{subtotal.toFixed(2)}</strong>
                      </div>
                      <div className="side-edit-total-line">
                        <span>Discount (10%)</span>
                        <span style={{ color: '#dc2626' }}>- {currencySymbol}{Number(discountAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="side-edit-total-line">
                        <span>GST (5%)</span>
                        <span style={{ color: '#475569' }}>{currencySymbol}{taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="side-edit-total-line grand" style={{ padding: '8px 0', borderTop: '1.5px solid #e2e8f0' }}>
                        <span style={{ fontSize: '15px' }}>Grand Total</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>
                          {currencySymbol}{grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="side-edit-total-line">
                        <span>Paid Amount</span>
                        <strong style={{ color: '#16a34a' }}>{currencySymbol}{Number(advancePaid || 0).toFixed(2)}</strong>
                      </div>
                      <div className="side-edit-total-line">
                        <span>Balance Due</span>
                        <strong style={{ color: balanceDue > 0 ? '#ea580c' : '#16a34a' }}>
                          {currencySymbol}{balanceDue.toFixed(2)}
                        </strong>
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                          onClick={handleMarkFullyPaid}
                        >
                          ✓ Mark as Fully Paid
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Card: Add Payment */}
                  <div className="side-edit-card">
                    <div className="side-edit-card-head">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      <span>Add Payment</span>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">Payment Mode</label>
                      <div className="side-edit-payment-method-radios">
                        <label className="side-edit-radio-label">
                          <input
                            type="radio"
                            name="newPayMode"
                            value="Cash"
                            checked={newPayMode === 'Cash'}
                            onChange={(e) => setNewPayMode(e.target.value)}
                          />
                          Cash
                        </label>
                        <label className="side-edit-radio-label">
                          <input
                            type="radio"
                            name="newPayMode"
                            value="UPI"
                            checked={newPayMode === 'UPI'}
                            onChange={(e) => setNewPayMode(e.target.value)}
                          />
                          UPI
                        </label>
                        <label className="side-edit-radio-label">
                          <input
                            type="radio"
                            name="newPayMode"
                            value="Card"
                            checked={newPayMode === 'Card'}
                            onChange={(e) => setNewPayMode(e.target.value)}
                          />
                          Card
                        </label>
                      </div>
                    </div>

                    <div className="side-edit-field">
                      <label className="side-edit-label">Amount ({currencySymbol})</label>
                      <input
                        type="number"
                        className="side-edit-input"
                        value={newPayAmount}
                        onChange={(e) => setNewPayAmount(e.target.value)}
                        placeholder="25.65"
                      />
                    </div>

                    <div
                      className="side-edit-qr-preview-box"
                      onClick={() => setShowQRModal(true)}
                      title="Click to view full UPI QR Code"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <div>
                        <strong style={{ fontSize: '12px', color: '#1e3a8a', display: 'block' }}>Scan &amp; Pay (UPI)</strong>
                        <span style={{ fontSize: '11px', color: '#2563eb' }}>Click to open UPI QR Code scanner</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="side-edit-btn-save"
                      style={{ width: '100%', marginTop: '4px' }}
                      onClick={handleAddPayment}
                    >
                      + Add Payment
                    </button>
                  </div>
                </div>

                {/* Bottom Card: Payment History Table */}
                <div className="side-edit-card">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Payment History</span>
                  </div>

                  <div className="side-edit-table-wrap">
                    <table className="side-edit-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date &amp; Time</th>
                          <th>Mode</th>
                          <th>Transaction Ref</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((ph, idx) => (
                          <tr key={ph.id || idx}>
                            <td>{idx + 1}</td>
                            <td>{ph.dateTime}</td>
                            <td>{ph.mode}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{ph.ref}</td>
                            <td><strong>{currencySymbol}{Number(ph.amount).toFixed(2)}</strong></td>
                            <td>
                              <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                ✓ Paid
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ════════ SECTION 6: MESSAGES & REVIEW ════════ */}
            {activeSectionIndex === 5 && (
              <div className="side-edit-messages-split">
                {/* Left Side: Conversation History & Message Input */}
                <div className="side-edit-card side-edit-chat-area">
                  <div className="side-edit-card-head">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>Customer Messages &amp; Final Review</span>
                  </div>

                  {/* Chat Bubbles */}
                  <div className="side-edit-chat-bubbles">
                    <span className="side-edit-chat-date-chip">28 Oct 2026</span>
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`side-edit-bubble ${msg.type === 'outbound' ? 'outbound' : 'inbound'}`}
                      >
                        <div className="side-edit-bubble-head">
                          <span>{msg.title}</span>
                          <span className="side-edit-bubble-time">{msg.time}</span>
                        </div>
                        <div>{msg.text}</div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input Box */}
                  <div className="side-edit-chat-input-wrap">
                    <textarea
                      rows={2}
                      className="side-edit-textarea"
                      placeholder="Type a message to the customer (max 500 characters...)"
                      value={customMessage}
                      maxLength={500}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {customMessage.length}/500
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notifyWhatsapp}
                            onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                            style={{ accentColor: '#2563eb' }}
                          />
                          WhatsApp
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notifySms}
                            onChange={(e) => setNotifySms(e.target.checked)}
                            style={{ accentColor: '#2563eb' }}
                          />
                          SMS
                        </label>
                      </div>

                      <button
                        type="button"
                        className="side-edit-btn-save"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={handleSendMessage}
                      >
                        Send Reply ✉
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Contact Details, Templates, Internal Notes & Final Review */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Contact Details Card */}
                  <div className="side-edit-card" style={{ padding: '12px 14px' }}>
                    <span className="side-edit-subhead" style={{ marginBottom: '6px' }}>👤 Contact Details</span>
                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155' }}>
                      <strong>{customerName || 'Arun Kumar'}</strong>
                      <span>📞 {mobileNumber || '+91 98XXX 45XXX'}</span>
                      <span>✉ {email || 'arun.k****@gmail.com'}</span>
                    </div>
                  </div>

                  {/* Message Templates Dropdown */}
                  <div className="side-edit-card" style={{ padding: '12px 14px' }}>
                    <span className="side-edit-subhead" style={{ marginBottom: '6px' }}>💬 Message Templates</span>
                    <select
                      className="side-edit-select"
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select a template...</option>
                      <option value="Order Confirmed">Order Confirmed</option>
                      <option value="Washing Started">Washing Started</option>
                      <option value="Ready for Delivery">Ready for Delivery</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Payment Reminder">Payment Reminder</option>
                    </select>
                  </div>

                  {/* Internal Staff Notes */}
                  <div className="side-edit-card" style={{ padding: '12px 14px' }}>
                    <span className="side-edit-subhead" style={{ marginBottom: '6px' }}>📝 Internal Staff Notes</span>
                    <textarea
                      rows={2}
                      className="side-edit-textarea"
                      value={staffNote}
                      onChange={(e) => setStaffNote(e.target.value)}
                      placeholder="Special handling instructions, VIP customer care..."
                    />
                  </div>

                  {/* Audit Trail Timeline */}
                  <div className="side-edit-card" style={{ padding: '12px 14px' }}>
                    <span className="side-edit-subhead" style={{ marginBottom: '6px' }}>📜 Audit Trail History</span>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {auditLogs.map((log) => (
                        <div key={log.id} style={{ fontSize: '11px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                          <strong style={{ color: '#0f172a' }}>{log.title}</strong>
                          <div style={{ color: '#64748b' }}>{log.detail}</div>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{log.time} · {log.author || 'Staff'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Review (Order Summary) & Verification Checklist */}
                  <div className="side-edit-card" style={{ padding: '12px 14px', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                    <span className="side-edit-subhead" style={{ color: '#1e3a8a', marginBottom: '6px' }}>
                      📋 Final Review (Order Summary)
                    </span>
                    <div style={{ fontSize: '11.5px', color: '#1e3a8a', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>Order: <strong>#{initialOrderNum}</strong> | Total: <strong>{currencySymbol}{grandTotal.toFixed(2)}</strong></div>
                      <div>Status: <strong>{status}</strong></div>
                      <div>Items: <strong>{cartItems.length}</strong> | Payment: <strong>{paymentStatus}</strong></div>
                    </div>

                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #bfdbfe', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a8a', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checklist.allInspected}
                          onChange={(e) => setChecklist((c) => ({ ...c, allInspected: e.target.checked }))}
                        />
                        All items inspected
                      </label>
                      <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a8a', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checklist.paymentVerified}
                          onChange={(e) => setChecklist((c) => ({ ...c, paymentVerified: e.target.checked }))}
                        />
                        Payment verified
                      </label>
                      <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a8a', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checklist.readyForDispatch}
                          onChange={(e) => setChecklist((c) => ({ ...c, readyForDispatch: e.target.checked }))}
                        />
                        Ready for dispatch
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Fixed Action Footer ── */}
        <div className="side-edit-footer">
          <div className="side-edit-footer-left">
            {onDelete && (
              <button
                type="button"
                className="side-edit-btn-delete"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete this order"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>Delete Order</span>
              </button>
            )}
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
              className="side-edit-btn-nav-prev"
              onClick={handlePrevTab}
              disabled={activeSectionIndex === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="side-edit-btn-nav-next"
              onClick={handleNextTab}
              disabled={activeSectionIndex === SECTIONS.length - 1}
            >
              Next
            </button>
            <button
              type="button"
              className="side-edit-btn-save"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog Modal ── */}
      {showDeleteConfirm && (
        <div className="pos-held-modal-backdrop" style={{ zIndex: 12000 }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="pos-dialog-modal" style={{ maxWidth: '420px', padding: '22px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', display: 'grid', placeItems: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>Delete Order</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to delete order <strong>#{initialOrderNum}</strong> for <strong>{customerName || 'Customer'}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="side-edit-btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete?.(order?.id || initialOrderNum);
                }}
              >
                Yes, Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPI Payment QR Code Modal ── */}
      {showQRModal && (
        <div className="pos-held-modal-backdrop" style={{ zIndex: 12000 }} onClick={() => setShowQRModal(false)}>
          <div
            className="pos-dialog-modal pos-qr-dialog-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-dialog-header">
              <div className="pos-dialog-title">
                <span style={{ fontSize: '18px' }}>📱</span>
                <span>UPI Payment QR Code</span>
              </div>
              <button
                type="button"
                className="pos-dialog-close-btn"
                onClick={() => setShowQRModal(false)}
                title="Close QR"
              >
                ✕
              </button>
            </div>

            <div className="pos-qr-order-banner">
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                #{initialOrderNum}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                {customerName || 'Customer'}
              </div>
              <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                {currencySymbol}{(balanceDue > 0 ? balanceDue : grandTotal).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                Scan to Pay via any UPI App (GPay, PhonePe, Paytm)
              </div>
            </div>

            <div className="pos-qr-image-wrapper">
              <svg width="180" height="180" viewBox="0 0 100 100" style={{ margin: 'auto', display: 'block' }}>
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                <rect x="18" y="18" width="9" height="9" fill="#2563eb" />
                <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                <rect x="73" y="18" width="9" height="9" fill="#2563eb" />
                <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                <rect x="18" y="73" width="9" height="9" fill="#2563eb" />
                <rect x="45" y="15" width="10" height="10" fill="#0f172a" />
                <rect x="45" y="35" width="15" height="10" fill="#0f172a" />
                <rect x="20" y="45" width="10" height="10" fill="#0f172a" />
                <rect x="40" y="55" width="20" height="10" fill="#0f172a" />
                <rect x="65" y="45" width="10" height="15" fill="#0f172a" />
                <rect x="75" y="65" width="15" height="15" fill="#2563eb" />
              </svg>
            </div>

            <div className="pos-qr-apps-badge">
              <span>Google Pay</span>
              <span>•</span>
              <span>PhonePe</span>
              <span>•</span>
              <span>Paytm</span>
              <span>•</span>
              <span>BHIM UPI</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="pos-btn-secondary"
                style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => setShowQRModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                style={{
                  flex: 1.2,
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                }}
                onClick={() => {
                  setPaymentStatus('Paid in Full');
                  setAdvancePaid(grandTotal);
                  setShowQRModal(false);
                  showToast?.('✓ Payment received via QR & marked as Fully Paid!');
                }}
              >
                <span>✓</span>
                <span>Mark Paid via QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Preview Lightbox Modal ── */}
      {previewPhoto && (
        <div className="side-edit-lightbox-overlay" onClick={() => setPreviewPhoto(null)}>
          <div className="side-edit-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="side-edit-lightbox-head">
              <div>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{previewPhoto.tag || 'Inspection Photo'}</strong>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{previewPhoto.name} · {previewPhoto.size || 'Photo'}</div>
              </div>
              <button
                type="button"
                className="side-edit-close-btn"
                onClick={() => setPreviewPhoto(null)}
              >
                ✕
              </button>
            </div>
            <div className="side-edit-lightbox-body">
              <img src={previewPhoto.url} alt={previewPhoto.name} />
            </div>
            <div className="side-edit-lightbox-footer">
              <span>Attached: {previewPhoto.timestamp || 'Today'}</span>
              <button
                type="button"
                className="side-edit-btn-cancel"
                onClick={() => setPreviewPhoto(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {barcodePreviewEntry && (
        <div className="side-edit-barcode-preview-overlay" onClick={() => setBarcodePreviewEntry(null)}>
          <div className="side-edit-barcode-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="side-edit-barcode-preview-head">
              <div>
                <strong>{barcodePreviewEntry.garmentName} – Piece {barcodePreviewEntry.piece}</strong>
                <span>{barcodePreviewEntry.barcode}</span>
              </div>
              <button type="button" onClick={() => setBarcodePreviewEntry(null)}>✕</button>
            </div>
            <div className="side-edit-barcode-preview-body">
              <GarmentBarcodeSvg
                value={barcodePreviewEntry.barcode}
                label={barcodePreviewEntry.barcode}
                svgRef={barcodePreviewSvgRef}
              />
            </div>
            <div className="side-edit-barcode-preview-actions">
              <button type="button" className="side-edit-barcode-preview-close" onClick={() => setBarcodePreviewEntry(null)}>
                Close
              </button>
              <button type="button" className="side-edit-barcode-preview-print" onClick={() => handlePrintBarcode(barcodePreviewEntry)}>
                Print Barcode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
