import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  ArrowForward,
  ArticleOutlined,
  CalendarTodayOutlined,
  CheckCircleOutlined,
  Close,
  CreditCardOutlined,
  DeleteOutlined,
  DirectionsWalkOutlined,
  ExpandMore,
  InfoOutlined,
  LocalPhoneOutlined,
  PeopleAltOutlined,
  PersonOutlineOutlined,
  ReceiptLongOutlined,
  Remove,
  Search,
  ShoppingCartOutlined,
  StorefrontOutlined,
} from '@mui/icons-material';
import {
  DEFAULT_PRODUCTS,
  createOrderWithCustomer,
  fetchActivePickupDeliveryMaster,
  fetchActiveStaffMaster,
  fetchCustomerAddresses,
  formatOrderId,
  getNextCustomerId,
  getNextOrderId,
  getProducts,
  searchCustomers,
  updateCustomer,
} from '../services/customerService';
import {
  BUSINESS_CONFIG,
  calculateOrderTotals,
  getStoredSettings,
  formatServiceBreakdown,
} from '../config/businessRules';
import { stripAddressTag } from '../utils/normalizeOrder';
import { useServiceTypes } from './ServiceTypeSelect';
import { fetchServiceTypes, createServiceType } from '../services/serviceTypeService';
import { useDebounce } from '../hooks/useDebounce';
import {
  combineLocalDateAndTimeToIso,
  formatScheduledDateTime,
  isOnCallOrderType,
  resolveOptionalDelivery,
  validateOnCallSchedule,
} from '../utils/onCallScheduling';
import {
  formatPhoneDisplay,
  friendlySupabaseError,
  normalizeMobileNumber,
  validateCustomer,
} from '../utils/validation';
import ClothIllustration from './ClothIllustration';
import UPIPaymentQRDialog from './UPIPaymentQRDialog';
import OrdersV2AddressManager, {
  formatAddressForOrder,
  normalizeAdditionalAddresses,
  toStoredAdditionalAddresses,
  validateAdditionalAddresses,
} from './OrdersV2AddressManager';
import OrdersV2AdvancedCustomerDetails, {
  INITIAL_ADVANCED_FIELDS,
  INITIAL_ADVANCED_SECTIONS,
  buildAdvancedReviewLines,
  getAdvancedErrors,
  getAdvancedSectionForField,
  getChangedAdvancedPayload,
  getCustomerPricingDiscount,
  normalizeAdvancedFields,
} from './OrdersV2AdvancedCustomerDetails';

const PRIMARY = '#2563EB';
const PRIMARY_DARK = '#1D4ED8';
const PRIMARY_LIGHT = '#EFF6FF';
const PAGE_BG = '#F8FAFC';
const BORDER = '#DBE4F0';
const TEXT = '#0F172A';
const MUTED = '#64748B';

const FIELD_SX = {
  bgcolor: '#ffffff',
  '& fieldset': { borderColor: BORDER },
  '&:hover fieldset': { borderColor: '#94A3B8' },
  '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
  '& .MuiInputBase-input': { py: '10.5px', fontSize: '0.9rem' },
  '& .MuiInputLabel-root': { fontSize: '0.9rem' },
};

const CARD_SX = {
  bgcolor: '#ffffff',
  border: `1px solid ${BORDER}`,
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
  p: 2,
  minWidth: 0,
};

const SCROLLBAR_SX = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#94A3B8 #F1F5F9',
  '&::-webkit-scrollbar': { width: 9 },
  '&::-webkit-scrollbar-track': { bgcolor: '#F1F5F9', borderRadius: '8px' },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#94A3B8', borderRadius: '8px', border: '2px solid #F1F5F9' },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#64748B' },
};

const INITIAL_FORM = {
  customer_name: '',
  country_code: '+91',
  mobile_number: '',
  address: '',
  addressType: 'Home',
  orderType: 'walk-in',
  pickupDate: '',
  pickupTime: '',
  deliveryDate: '',
  deliveryTime: '',
  attendStaffId: '',
  attendStaffName: '',
  pickupStaffId: '',
  pickupStaffName: '',
  taxExemption: false,
  propertyStatus: 'No',
  internalNotes: '',
  orderNotes: '',
  paymentMethod: 'Cash',
  paymentStatus: 'Unpaid / Pay on Delivery',
  paymentReference: '',
  advancePaid: '',
};

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'netbanking', label: 'Net Banking' },
  { key: 'credit', label: 'Credit' },
];

const money = (value) => {
  const symbol = BUSINESS_CONFIG.CURRENCY_SYMBOL || '₹';
  const amount = Number(value) || 0;
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getProductUnitPrice = (product) => {
  const candidates = [product?.price, product?.base_price];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
};

const dedupeStrings = (values = []) => {
  const seen = new Set();
  return values.reduce((result, raw) => {
    const value = String(raw || '').trim();
    if (!value || seen.has(value.toLowerCase())) return result;
    seen.add(value.toLowerCase());
    result.push(value);
    return result;
  }, []);
};

const getCustomerId = (customer) => customer?.customerId || customer?.customer_code || customer?.customer_id || customer?.id || '';
const getCustomerName = (customer) => customer?.customer_name || customer?.name || '';
const getCustomerPhone = (customer) => customer?.mobile_number || customer?.phone || '';
const getCustomerAddress = (customer) => customer?.address || customer?.delivery_address || customer?.street_area || '';

const staffLabel = (option) => {
  const name = option?.name || '';
  const id = option?.uniqueId || option?.id || '';
  const zone = option?.zone || '';
  const city = option?.city || '';
  const locParts = [zone ? `Zone: ${zone}` : '', city ? `City: ${city}` : ''].filter(Boolean).join(' • ');
  if (name && id && locParts) return `${name} (${id}) • ${locParts}`;
  if (name && id) return `${name} (${id})`;
  if (name && locParts) return `${name} • ${locParts}`;
  return name || id || '';
};

const staffOptionKey = (option) => String(option?.uniqueId || option?.id || '');

const findStaffOption = (options, staffId) => {
  const key = String(staffId || '');
  return key ? options.find((option) => staffOptionKey(option) === key) || null : null;
};

function getStageOneErrors({ customerMode, selectedCustomer, form, isOnCall, address }) {
  const nextErrors = {};

  if (customerMode === 'existing') {
    if (!selectedCustomer) {
      nextErrors.customer = 'Select an existing customer to continue.';
    } else {
      const customerErrors = validateCustomer({
        customer_name: getCustomerName(selectedCustomer),
        mobile_number: getCustomerPhone(selectedCustomer),
      });
      if (Object.keys(customerErrors).length > 0) {
        nextErrors.customer = 'The selected customer has incomplete or invalid details.';
      }
    }
  } else {
    Object.assign(nextErrors, validateCustomer({
      customer_name: form.customer_name,
      mobile_number: form.mobile_number,
      pincode: form.pincode,
      email: form.email,
      map_link: form.map_link,
    }));
  }

  if (!['walk-in', 'on-call'].includes(String(form.orderType || '').toLowerCase())) {
    nextErrors.orderType = 'Select a valid order type.';
  }

  if (!isOnCall) {
    const deliveryResult = resolveOptionalDelivery({
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
    });
    if (!deliveryResult.isValid) Object.assign(nextErrors, deliveryResult.errors);
  }

  if (isOnCall) {
    if (!String(address || '').trim()) {
      nextErrors.address = 'Address is required for On-Call orders.';
    }
    const schedule = validateOnCallSchedule({
      pickupDate: form.pickupDate,
      pickupTime: form.pickupTime,
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
      isNewOrder: true,
    });
    if (!schedule.isValid) Object.assign(nextErrors, schedule.errors);
  }

  return nextErrors;
}

function SectionCard({ icon, title, subtitle, badge, children }) {
  return (
    <Paper sx={{ ...CARD_SX, p: { xs: 1.5, sm: 2 }, borderRadius: '12px' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.5 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: PRIMARY_LIGHT, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: TEXT, lineHeight: 1.3 }}>{title}</Typography>
            {badge ? <Chip size="small" label={badge} sx={{ height: 20, fontSize: '0.68rem', bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK }} /> : null}
          </Box>
          <Typography sx={{ mt: 0.2, fontSize: '0.76rem', color: MUTED, lineHeight: 1.4 }}>{subtitle}</Typography>
        </Box>
      </Box>
      {children}
    </Paper>
  );
}

function SmallLabel({ children }) {
  return (
    <Typography sx={{ mb: 0.65, fontSize: '0.76rem', fontWeight: 700, color: MUTED, letterSpacing: '0.01em' }}>
      {children}
    </Typography>
  );
}

export default function OrdersV2CreateOrder({ isOpen, onClose, onOrderSuccess, showToast }) {
  const localServiceTypes = useServiceTypes();
  const [stage, setStage] = useState(1);
  const [customerMode, setCustomerMode] = useState('existing');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [nextOrderId, setNextOrderId] = useState('ORD00001');
  const [staffOptions, setStaffOptions] = useState([]);
  const [pickupOptions, setPickupOptions] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [dbServiceTypes, setDbServiceTypes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cardSelections, setCardSelections] = useState({});
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [advancedFields, setAdvancedFields] = useState(INITIAL_ADVANCED_FIELDS);
  const [advancedBaseline, setAdvancedBaseline] = useState(INITIAL_ADVANCED_FIELDS);
  const [advancedSections, setAdvancedSections] = useState(INITIAL_ADVANCED_SECTIONS);
  const [additionalAddresses, setAdditionalAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const addressLoadTokenRef = useRef(0);
  const [addingServiceIndex, setAddingServiceIndex] = useState(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);

  const debouncedCustomerQuery = useDebounce(customerQuery, 300);

  useEffect(() => {
    if (!isOpen) return;

    setStage(1);
    setCustomerMode('existing');
    setCustomerQuery('');
    setCustomerResults([]);
    setCustomerLoading(false);
    setSelectedCustomer(null);
    setForm(INITIAL_FORM);
    setAdvancedFields(INITIAL_ADVANCED_FIELDS);
    setAdvancedBaseline(INITIAL_ADVANCED_FIELDS);
    setAdvancedSections(INITIAL_ADVANCED_SECTIONS);
    setAdditionalAddresses([]);
    setSelectedAddressId(null);
    setShowAddressErrors(false);
    addressLoadTokenRef.current += 1;
    setErrors({});
    setActiveCategory('All');
    setSearchQuery('');
    setCardSelections({});
    setCart([]);
    setDiscountPercent(0);
    setConfirmClearOpen(false);
    setSubmitting(false);
    setDirectSubmitting(false);

    getNextOrderId().then((id) => {
      if (id) setNextOrderId(id);
    });
    getNextCustomerId().catch(() => null);

    setMasterLoading(true);
    Promise.all([fetchActiveStaffMaster(), fetchActivePickupDeliveryMaster()]).then(([staffRes, pickupRes]) => {
      setStaffOptions(Array.isArray(staffRes?.data) ? staffRes.data : []);
      setPickupOptions(Array.isArray(pickupRes?.data) ? pickupRes.data : []);
      setMasterLoading(false);
    });

    getProducts().then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) setProducts(data);
    });
    fetchServiceTypes().then(({ data }) => {
      setDbServiceTypes((data || []).map((entry) => entry?.name).filter(Boolean));
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || customerMode !== 'existing' || selectedCustomer || !debouncedCustomerQuery.trim()) {
      setCustomerResults([]);
      setCustomerLoading(false);
      return undefined;
    }

    let active = true;
    setCustomerLoading(true);
    searchCustomers(debouncedCustomerQuery).then(({ data, error }) => {
      if (!active) return;
      setCustomerLoading(false);
      setCustomerResults(!error && Array.isArray(data) ? data : []);
    });

    return () => {
      active = false;
    };
  }, [debouncedCustomerQuery, customerMode, selectedCustomer, isOpen]);

  const serviceOptions = useMemo(
    () => dedupeStrings([...localServiceTypes, ...dbServiceTypes, 'Laundry']),
    [localServiceTypes, dbServiceTypes],
  );

  const advancedOrderPreferenceOptions = useMemo(
    () => dedupeStrings([...serviceOptions, advancedFields.order_preference]),
    [serviceOptions, advancedFields.order_preference],
  );

  const paymentOptions = useMemo(() => {
    const settings = getStoredSettings();
    const enabled = settings?.enabledPayments || {};
    return PAYMENT_METHODS.filter((method) => enabled[method.key] !== false);
  }, []);

  useEffect(() => {
    if (paymentOptions.length > 0 && !paymentOptions.some((method) => method.label === form.paymentMethod)) {
      updateForm({ paymentMethod: paymentOptions[0].label });
    }
  }, [paymentOptions, form.paymentMethod]);

  const categories = useMemo(() => {
    const present = new Set();
    products.forEach((product) => {
      if (product?.category) present.add(product.category);
      if (product?.secondaryCategory) present.add(product.secondaryCategory);
    });
    return ['All', 'Men', 'Women', 'Kids', 'Home Linen', 'Accessories'].filter(
      (category) => category === 'All' || present.has(category),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'All' ||
        product?.category === activeCategory ||
        product?.secondaryCategory === activeCategory;
      const matchesSearch =
        !query ||
        String(product?.name || '').toLowerCase().includes(query) ||
        String(product?.category || '').toLowerCase().includes(query) ||
        String(product?.item_code || '').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const totals = useMemo(() => {
    const result = calculateOrderTotals(cart, BUSINESS_CONFIG.DEFAULT_GST_RATE, Boolean(form.taxExemption));
    const percent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    const discountAmount = Number((result.subtotal * percent / 100).toFixed(2));
    const grandTotal = Math.max(0, Number((result.subtotal + result.taxAmount - discountAmount).toFixed(2)));
    const itemCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    return { ...result, discountPercent: percent, discountAmount, grandTotal, itemCount, lineCount: cart.length };
  }, [cart, form.taxExemption, discountPercent]);

  const isOnCall = isOnCallOrderType(form.orderType);
  const normalizedAddresses = useMemo(
    () => normalizeAdditionalAddresses(additionalAddresses),
    [additionalAddresses],
  );
  const selectedAdditionalAddress = useMemo(
    () => normalizedAddresses.find((address) => address.id === selectedAddressId) || null,
    [normalizedAddresses, selectedAddressId],
  );
  const effectiveAddress = selectedAdditionalAddress
    ? formatAddressForOrder(selectedAdditionalAddress)
    : String(form.address || '').trim();
  const stageOneErrors = useMemo(
    () => getStageOneErrors({ customerMode, selectedCustomer, form, isOnCall, address: effectiveAddress }),
    [customerMode, selectedCustomer, form, isOnCall, effectiveAddress],
  );
  const isStageOneValid = Object.keys(stageOneErrors).length === 0;
  const canSave = !submitting && cart.length > 0 && isStageOneValid;
  const defaultService = serviceOptions[0] || 'Laundry';

  const customerOptions = useMemo(() => {
    const newOption = {
      __key: '__new_customer__',
      __newCustomer: true,
      __label: customerQuery.trim() ? `Add "${customerQuery.trim()}" as a new customer` : 'Create a new customer',
    };
    return [
      newOption,
      ...customerResults.map((customer) => ({
        __key: `c_${getCustomerId(customer) || getCustomerPhone(customer) || getCustomerName(customer)}`,
        __customer: customer,
        __label: `${getCustomerName(customer)}${getCustomerPhone(customer) ? ` • ${formatPhoneDisplay(getCustomerPhone(customer))}` : ''}`,
      })),
    ];
  }, [customerResults, customerQuery]);

  const selectedCustomerOption = selectedCustomer
    ? {
        __key: `c_${getCustomerId(selectedCustomer) || getCustomerPhone(selectedCustomer) || getCustomerName(selectedCustomer)}`,
        __customer: selectedCustomer,
        __label: `${getCustomerName(selectedCustomer)}${getCustomerPhone(selectedCustomer) ? ` • ${formatPhoneDisplay(getCustomerPhone(selectedCustomer))}` : ''}`,
      }
    : null;

  const updateForm = (patch) => {
    setForm((previous) => ({ ...previous, ...patch }));

    const hasPatchKey = (key) => Object.prototype.hasOwnProperty.call(patch, key);
    const orderTypeChanged = hasPatchKey('orderType');
    const addressProvided = hasPatchKey('address') && String(patch.address || '').trim();
    const deliveryChanged = hasPatchKey('deliveryDate') || hasPatchKey('deliveryTime');
    if (!orderTypeChanged && !addressProvided && !deliveryChanged) return;

    setErrors((previous) => {
      const next = { ...previous };
      let changed = false;
      if (next.address) {
        delete next.address;
        changed = true;
      }
      if (deliveryChanged && next.scheduled_delivery_at) {
        delete next.scheduled_delivery_at;
        changed = true;
      }
      return changed ? next : previous;
    });
  };

  const resetAdvancedFields = () => {
    setAdvancedFields(INITIAL_ADVANCED_FIELDS);
    setAdvancedBaseline(INITIAL_ADVANCED_FIELDS);
    setAdvancedSections(INITIAL_ADVANCED_SECTIONS);
    setAdditionalAddresses([]);
    setSelectedAddressId(null);
    setShowAddressErrors(false);
    addressLoadTokenRef.current += 1;
  };

  const updateAdvancedFields = (patch) => {
    const nextFields = { ...advancedFields, ...patch };
    setAdvancedFields(nextFields);
    setErrors((previous) => {
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
      const currentOrderDiscount = Number(discountPercent) || 0;
      const previousCustomerDiscount = Number(advancedFields.default_discount) || 0;
      if (Math.abs(currentOrderDiscount - previousCustomerDiscount) < 0.001) {
        setDiscountPercent(getCustomerPricingDiscount(nextFields));
      }
    }
  };

  const validateAdvancedDetails = () => getAdvancedErrors(advancedFields);

  const applyCustomerPricing = () => {
    const discount = getCustomerPricingDiscount(advancedFields);
    setDiscountPercent(discount);
    showToast?.(`Applied ${advancedFields.price_list} customer pricing (${discount}% default discount) to this order.`);
  };

  const loadCustomerAddresses = async (customer) => {
    const token = addressLoadTokenRef.current + 1;
    addressLoadTokenRef.current = token;
    const seed = normalizeAdditionalAddresses(customer?.additional_addresses || customer?.additionalAddresses);
    setAdditionalAddresses(seed);
    setSelectedAddressId(null);
    setShowAddressErrors(false);

    const customerId = getCustomerId(customer);
    if (!customerId) return;

    const { data } = await fetchCustomerAddresses(customerId);
    if (token !== addressLoadTokenRef.current) return;
    const normalized = Array.isArray(data) && data.length > 0 ? normalizeAdditionalAddresses(data) : seed;
    setAdditionalAddresses(normalized);
    setSelectedAddressId(null);
  };

  const prefillCustomer = (customer) => {
    const rawAddress = getCustomerAddress(customer);
    const tagMatch = String(rawAddress || '').match(/^(Home|Office|Other)\s*:/i);
    const detectedType = tagMatch ? (tagMatch[1].charAt(0).toUpperCase() + tagMatch[1].slice(1).toLowerCase()) : 'Home';
    const cleanAddress = stripAddressTag(rawAddress);
    const normalizedAdvanced = normalizeAdvancedFields(customer);
    setAdvancedFields(normalizedAdvanced);
    setAdvancedBaseline(normalizedAdvanced);
    setAdvancedSections(INITIAL_ADVANCED_SECTIONS);
    updateForm({
      customer_name: getCustomerName(customer),
      mobile_number: normalizeMobileNumber(getCustomerPhone(customer)),
      address: cleanAddress,
      addressType: detectedType,
    });
    loadCustomerAddresses(customer);
  };

  const handleCustomerSelect = (_, option) => {
    if (!option) return;
    if (option.__newCustomer) {
      const query = customerQuery.trim();
      const phoneMatch = query.match(/\d{10}/);
      setCustomerMode('new');
      setSelectedCustomer(null);
      setDiscountPercent(0);
      resetAdvancedFields();
      updateForm({
        customer_name: phoneMatch ? '' : query,
        mobile_number: phoneMatch ? phoneMatch[0] : '',
      });
      return;
    }

    setCustomerMode('existing');
    setSelectedCustomer(option.__customer || null);
    prefillCustomer(option.__customer || {});
  };

  const getCardSelection = (product) => cardSelections[product?.id] || { service: defaultService, qty: 1 };

  const updateCardSelection = (product, patch) => {
    setCardSelections((previous) => ({
      ...previous,
      [product.id]: {
        ...(previous[product.id] || { service: defaultService, qty: 1 }),
        ...patch,
      },
    }));
  };

  const addToCart = (product) => {
    const selection = getCardSelection(product);
    const rate = getProductUnitPrice(product);
    const qty = Math.max(1, Number(selection.qty) || 1);

    if (rate === null) {
      showToast?.(`⚠️ ${product?.name || 'This garment'} has no valid price in the product master.`);
      return;
    }

    setCart((previous) => {
      const existingIndex = previous.findIndex(
        (item) => String(item.id) === String(product.id) && item.serviceType === selection.service,
      );
      if (existingIndex >= 0) {
        const next = [...previous];
        const nextQty = Number(next[existingIndex].qty || 0) + qty;
        next[existingIndex] = {
          ...next[existingIndex],
          rate,
          qty: nextQty,
          amount: rate * nextQty,
        };
        return next;
      }

      return [
        ...previous,
        {
          id: product.id,
          product_id: product.product_id || product.item_code || product.id,
          name: product.name,
          category: product.category,
          serviceType: selection.service,
          rate,
          qty,
          amount: rate * qty,
          careNotes: '',
        },
      ];
    });
  };

  const updateCartQty = (index, delta) => {
    setCart((previous) => previous.reduce((result, item, itemIndex) => {
      if (itemIndex !== index) {
        result.push(item);
        return result;
      }
      const nextQty = (Number(item.qty) || 0) + delta;
      if (nextQty > 0) {
        result.push({ ...item, qty: nextQty, amount: (Number(item.rate) || 0) * nextQty });
      }
      return result;
    }, []));
  };

  const updateCartService = (index, service) => {
    setCart((previous) => previous.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const product = products.find((entry) => String(entry.id) === String(item.id));
      const rate = getProductUnitPrice(product) ?? (Number(item.rate) || 0);
      return { ...item, serviceType: service, rate, amount: rate * (Number(item.qty) || 0) };
    }));
  };

  const handleAddNewService = async (itemIndex = null) => {
    const trimmed = newServiceName.trim();
    if (!trimmed) return;
    setIsSavingService(true);
    try {
      const res = await createServiceType({ name: trimmed });
      const addedName = res?.data?.name || trimmed;
      if (itemIndex !== null && itemIndex !== undefined) {
        updateCartService(itemIndex, addedName);
      }
      showToast?.(`Added service type "${addedName}"`);
      setNewServiceName('');
      setAddingServiceIndex(null);
      const latest = await fetchServiceTypes();
      if (Array.isArray(latest?.data)) {
        setDbServiceTypes(latest.data.filter((s) => s.isActive !== false).map((s) => s.name));
      }
    } catch (err) {
      console.error('Failed to create service type:', err);
      showToast?.('Failed to save service type');
    } finally {
      setIsSavingService(false);
    }
  };

  const removeCartItem = (index) => {
    setCart((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearCart = () => {
    setCart([]);
    setConfirmClearOpen(false);
  };

  const validateStageOne = () => {
    setErrors(stageOneErrors);
    return isStageOneValid;
  };

  const handleNext = () => {
    if (!validateStageOne()) return;
    setStage(2);
  };

  const buildCustomerData = (schedule, primaryService) => {
    const rawAddress = String(form.address || '').trim();
    const cleanAddress = stripAddressTag(rawAddress);
    const formattedAddress = selectedAdditionalAddress
      ? formatAddressForOrder(selectedAdditionalAddress)
      : (cleanAddress ? `${form.addressType}: ${cleanAddress}` : '');
    const storedAddresses = toStoredAdditionalAddresses(additionalAddresses);
    const staffNotes = [advancedFields.internal_comments, form.internalNotes].filter(Boolean).join(' • ');
    const notes = [staffNotes, advancedFields.notes, form.orderNotes].filter(Boolean).join(' • ');
    const advancePaid = Number(form.advancePaid) || 0;

    return {
      customer_id: customerMode === 'existing' ? (getCustomerId(selectedCustomer) || null) : null,
      customer_name: String(form.customer_name || '').trim() || 'Walk-In Customer',
      country_code: '+91',
      mobile_number: normalizeMobileNumber(form.mobile_number),
      alternate_phone: advancedFields.alternate_phone,
      address: formattedAddress,
      additional_addresses: storedAddresses,
      selected_customer_address_id: selectedAdditionalAddress?.id || null,
      selected_address: formattedAddress,
      city: advancedFields.city,
      pincode: advancedFields.pincode,
      date_of_birth: advancedFields.date_of_birth,
      map_link: advancedFields.map_link,
      email: advancedFields.email,
      gst_number: advancedFields.gst_number,
      company_name: advancedFields.company_name,
      tax_exemption: Boolean(form.taxExemption),
      notes,
      communication_pref: advancedFields.communication_pref,
      communication_lang: advancedFields.communication_lang,
      dnd: Boolean(advancedFields.dnd),
      property_status: form.propertyStatus,
      priority: form.propertyStatus === 'Yes' ? 'Yes' : 'No',
      order_status: 'order recived',
      internal_comments: staffNotes,
      order_preference: advancedFields.order_preference || primaryService,
      default_discount: Number(advancedFields.default_discount) || 0,
      referral_code: advancedFields.referral_code,
      marketing_source: advancedFields.marketing_source,
      membership_id: advancedFields.membership_id,
      customer_classification: advancedFields.customer_classification,
      customer_status: advancedFields.customer_status,
      price_list: advancedFields.price_list,
      service_zone: advancedFields.service_zone,
      credit_limit: Number(advancedFields.credit_limit) || 0,
      service_category: primaryService,
      item_count: totals.itemCount,
      product_weight: '',
      product_garment_type: cart[0]?.category || '',
      order_notes: notes,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_pct: totals.discountPercent,
      discount_amount: totals.discountAmount,
      taxable_amount: Math.max(0, Number((totals.subtotal - totals.discountAmount).toFixed(2))),
      total_amount: totals.grandTotal,
      attend_staff_id: form.attendStaffId || null,
      attend_staff_name: form.attendStaffName || 'Counter Staff',
      assigned_staff: form.attendStaffName || 'Counter Staff',
      assigned_pickup_person_id: form.pickupStaffId || null,
      assigned_pickup_delivery_person: form.pickupStaffName || '',
      assigned_driver: form.pickupStaffName || '',
      scheduled_pickup_at: schedule.scheduled_pickup_at,
      scheduled_delivery_at: schedule.scheduled_delivery_at,
      payment_method: paymentOptions.length > 0 ? form.paymentMethod : 'Cash',
      payment_status: form.paymentStatus || (advancePaid >= totals.grandTotal && totals.grandTotal > 0 ? 'Paid in Full' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery'),
      payment_reference: form.paymentReference || '',
      advance_paid: advancePaid,
    };
  };

  const getScheduleResult = () => {
    if (isOnCall) {
      return validateOnCallSchedule({
        pickupDate: form.pickupDate,
        pickupTime: form.pickupTime,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        isNewOrder: true,
      });
    }

    const deliveryResult = resolveOptionalDelivery({
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
    });
    return {
      isValid: deliveryResult.isValid,
      errors: deliveryResult.errors,
      scheduled_pickup_at: null,
      scheduled_delivery_at: deliveryResult.scheduled_delivery_at,
    };
  };

  const persistOrder = async ({ scheduleResult, primaryService, setSaving }) => {
    const addressValidationErrors = validateAdditionalAddresses(additionalAddresses);
    if (Object.keys(addressValidationErrors).length > 0) {
      setShowAddressErrors(true);
      showToast?.('Review the highlighted additional addresses before saving.');
      return;
    }
    setShowAddressErrors(false);

    if (isOnCall && !String(effectiveAddress || '').trim()) {
      setErrors((previous) => ({ ...previous, address: 'Address is required for On-Call orders.' }));
      showToast?.('A valid selected address is required for On-Call orders.');
      return;
    }

    const advancedValidationErrors = validateAdvancedDetails();
    const advancedErrorKeys = Object.keys(advancedValidationErrors);
    if (advancedErrorKeys.length > 0) {
      setErrors((previous) => ({ ...previous, ...advancedValidationErrors }));
      const sectionsToExpand = [...new Set(advancedErrorKeys.map(getAdvancedSectionForField))];
      setAdvancedSections((previous) => ({
        ...previous,
        ...Object.fromEntries(sectionsToExpand.map((section) => [section, true])),
      }));
      showToast?.('Review the highlighted customer details before saving.');
      return;
    }

    const customerData = buildCustomerData(scheduleResult, primaryService);
    const existingCustomerId = customerMode === 'existing' ? (getCustomerId(selectedCustomer) || null) : null;

    setSaving(true);
    if (existingCustomerId) {
      const changedAdvanced = {
        ...getChangedAdvancedPayload(advancedFields, advancedBaseline),
        additional_addresses: toStoredAdditionalAddresses(additionalAddresses),
      };
      if (Object.keys(changedAdvanced).length > 0) {
        const { error: updateError } = await updateCustomer(existingCustomerId, {
          customer_id: existingCustomerId,
          ...changedAdvanced,
        });
        if (updateError) {
          setSaving(false);
          showToast?.(`⚠️ ${friendlySupabaseError(updateError)}`);
          return;
        }
        setAdvancedBaseline(advancedFields);
      }
    }

    const { data, error } = await createOrderWithCustomer({
      existingCustomerId,
      customerData: {
        ...customerData,
        item_count: totals.itemCount,
        total_amount: totals.grandTotal,
      },
      orderType: form.orderType,
      orderPreference: primaryService,
      orderPreferenceNotes: form.orderNotes || customerData.order_notes || '',
      totalAmount: totals.grandTotal,
      items: cart,
    });
    setSaving(false);

    if (error) {
      showToast?.(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }

    const orderNumber = data?.order_number
      ? formatOrderId(data.order_number)
      : data?.order_id
        ? formatOrderId(data.order_id)
        : nextOrderId;
    const finalCustomerId = data?.customer_id || existingCustomerId || getCustomerId(selectedCustomer) || null;
    const toastMessage = data?.isNewCustomer
      ? `✅ New Customer registered & Order ${orderNumber} created!`
      : `✅ Order ${orderNumber} created for ${customerData.customer_name}!`;
    showToast?.(toastMessage);

    const timestamp = new Date().toISOString();
    const staffName = form.attendStaffName || 'Counter Staff';
    const advanceNum = Number(form.advancePaid || 0);
    const paymentSt = form.paymentStatus || (advanceNum >= totals.grandTotal && totals.grandTotal > 0 ? 'Paid in Full' : (advanceNum > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery'));
    const createdOrderPayload = {
      id: orderNumber,
      order_id: data?.order_id || orderNumber,
      order_number: orderNumber,
      customer_id: finalCustomerId,
      customer_registered: Boolean(data?.isNewCustomer),
      order_type: form.orderType,
      preference: primaryService,
      preference_notes: customerData.order_notes || '',
      status: 'order recived',
      order_status: 'order recived',
      property_status: form.propertyStatus,
      priority: form.propertyStatus === 'Yes' ? 'Yes' : 'No',
      progress: 15,
      total_amount: totals.grandTotal,
      item_count: totals.itemCount,
      items: cart,
      customer_history: { items: cart },
      tax_exemption: Boolean(form.taxExemption),
      customer: {
        customer_id: finalCustomerId,
        customer_name: customerData.customer_name,
        mobile_number: customerData.mobile_number,
        tax_exemption: Boolean(form.taxExemption),
        address: customerData.address,
      },
      customer_name: customerData.customer_name,
      mobile_number: customerData.mobile_number,
      attend_staff_id: form.attendStaffId || null,
      attend_staff_name: staffName,
      assigned_staff: staffName,
      assigned_pickup_person_id: form.pickupStaffId || null,
      assigned_pickup_delivery_person: form.pickupStaffName || '',
      assigned_driver: form.pickupStaffName || '',
      scheduled_pickup_at: customerData.scheduled_pickup_at,
      scheduled_delivery_at: customerData.scheduled_delivery_at,
      status_updated_at: timestamp,
      status_updated_by: staffName,
      activity_history: [
        ...(advanceNum > 0 || String(paymentSt).includes('Paid') ? [{
          id: `act_pay_${Date.now() + 2}`,
          type: 'payment',
          title: 'Payment Received',
          detail: `${BUSINESS_CONFIG.CURRENCY_SYMBOL || '₹'}${advanceNum.toFixed(2)} received via ${form.paymentMethod || 'Cash'}`,
          staff: staffName,
          timestamp,
        }] : []),
        ...(cart.length > 0 ? [{
          id: `act_svc_${Date.now() + 1}`,
          type: 'service',
          title: 'Service Allocated',
          detail: formatServiceBreakdown(cart, primaryService, true) || `${primaryService} (${cart.length} items)`,
          staff: staffName,
          timestamp,
        }] : []),
        {
          id: `act_recv_${Date.now()}`,
          type: 'received',
          title: 'Order Received',
          detail: `New order placed (${form.orderType})${form.pickupStaffName ? ` • Pickup/Delivery: ${form.pickupStaffName}` : ''}`,
          staff: staffName,
          timestamp,
        },
      ],
    };

    onOrderSuccess?.(createdOrderPayload);
    onClose?.();
  };

  const handleSave = async () => {
    if (submitting || directSubmitting) return;

    if (!validateStageOne()) {
      setStage(1);
      return;
    }

    if (cart.length === 0) {
      showToast?.('Add at least one item before saving the order.');
      return;
    }

    const scheduleResult = getScheduleResult();

    if (!scheduleResult.isValid) {
      setErrors(scheduleResult.errors);
      setStage(1);
      return;
    }

    await persistOrder({
      scheduleResult,
      primaryService: cart[0]?.serviceType || defaultService,
      setSaving: setSubmitting,
    });
  };

  const handleCreateDirect = async () => {
    if (submitting || directSubmitting) return;

    if (!validateStageOne()) return;

    const scheduleResult = getScheduleResult();

    if (!scheduleResult.isValid) {
      setErrors(scheduleResult.errors);
      return;
    }

    await persistOrder({
      scheduleResult,
      primaryService: cart[0]?.serviceType || '',
      setSaving: setDirectSubmitting,
    });
  };

  const renderCustomerCard = () => (
    <SectionCard
      icon={<PersonOutlineOutlined sx={{ fontSize: 20 }} />}
      title="Customer Details"
      subtitle="Search an existing customer or register a new one."
      badge={customerMode === 'new' ? 'New' : 'Existing'}
    >
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Button
          type="button"
          variant={customerMode === 'existing' ? 'contained' : 'outlined'}
          onClick={() => {
            setCustomerMode('existing');
            setErrors({});
            if (!selectedCustomer) resetAdvancedFields();
          }}
          sx={{ flex: 1, textTransform: 'none', bgcolor: customerMode === 'existing' ? PRIMARY : 'transparent', borderColor: PRIMARY, color: customerMode === 'existing' ? '#fff' : PRIMARY_DARK, fontWeight: 700, fontSize: '0.82rem' }}
        >
          Existing Customer
        </Button>
        <Button
          type="button"
          variant={customerMode === 'new' ? 'contained' : 'outlined'}
          onClick={() => {
            setCustomerMode('new');
            setSelectedCustomer(null);
            setCustomerQuery('');
            setDiscountPercent(0);
            resetAdvancedFields();
            setErrors({});
          }}
          sx={{ flex: 1, textTransform: 'none', bgcolor: customerMode === 'new' ? PRIMARY : 'transparent', borderColor: PRIMARY, color: customerMode === 'new' ? '#fff' : PRIMARY_DARK, fontWeight: 700, fontSize: '0.82rem' }}
        >
          New Customer
        </Button>
      </Box>

      {customerMode === 'existing' && !selectedCustomer ? (
        <Box>
          <SmallLabel>Search by name, mobile number, address or customer ID</SmallLabel>
          <Autocomplete
            options={customerOptions}
            value={null}
            loading={customerLoading}
            filterOptions={(options) => options}
            isOptionEqualToValue={(option, value) => option.__key === value.__key}
            getOptionLabel={(option) => option.__label || ''}
            onChange={handleCustomerSelect}
            onInputChange={(_, value, reason) => {
              if (reason === 'input') setCustomerQuery(value);
            }}
            noOptionsText="No matching customers found"
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.__key} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                {option.__newCustomer ? <PersonOutlineOutlined sx={{ color: PRIMARY, fontSize: 18 }} /> : <PeopleAltOutlined sx={{ color: MUTED, fontSize: 18 }} />}
                <Typography sx={{ fontSize: '0.86rem' }}>{option.__label}</Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                fullWidth
                placeholder="Type to search customers..."
                error={Boolean(errors.customer)}
                helperText={errors.customer || ''}
                sx={FIELD_SX}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: MUTED, fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Box>
      ) : null}

      {customerMode === 'existing' && selectedCustomer ? (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px', borderColor: BORDER, bgcolor: PAGE_BG, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                {String(getCustomerName(selectedCustomer) || 'C').charAt(0).toUpperCase()}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: '0.9rem', fontWeight: 800, color: TEXT }}>{getCustomerName(selectedCustomer)}</Typography>
              <Typography noWrap sx={{ fontSize: '0.76rem', color: MUTED }}>
                {formatPhoneDisplay(getCustomerPhone(selectedCustomer))} • {getCustomerId(selectedCustomer) || 'Customer'}
              </Typography>
            </Box>
            <Button
              type="button"
              size="small"
              onClick={() => {
                setSelectedCustomer(null);
                setCustomerQuery('');
                resetAdvancedFields();
              }}
              sx={{ textTransform: 'none', color: PRIMARY_DARK, fontSize: '0.76rem', fontWeight: 700, minWidth: 0 }}
            >
              Change
            </Button>
          </Box>
        </Paper>
      ) : null}

      {customerMode === 'new' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, mt: customerMode === 'existing' && selectedCustomer ? 0 : 1.5 }}>
          <Box>
            <SmallLabel>Customer name *</SmallLabel>
            <TextField
              size="small"
              fullWidth
              value={form.customer_name}
              onChange={(event) => updateForm({ customer_name: event.target.value })}
              onBlur={() => updateForm({ customer_name: String(form.customer_name || '').trim() })}
              placeholder="Enter full name"
              error={Boolean(errors.customer_name)}
              helperText={errors.customer_name || ''}
              sx={FIELD_SX}
            />
          </Box>
          <Box>
            <SmallLabel>Phone number *</SmallLabel>
            <TextField
              size="small"
              fullWidth
              value={form.mobile_number}
              onChange={(event) => updateForm({ mobile_number: event.target.value.replace(/[^\d\s+()-]/g, '') })}
              onBlur={() => updateForm({ mobile_number: normalizeMobileNumber(form.mobile_number) })}
              placeholder="10-digit mobile number"
              error={Boolean(errors.mobile_number)}
              helperText={errors.mobile_number || '+91 is added automatically'}
              sx={FIELD_SX}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LocalPhoneOutlined sx={{ fontSize: 17, color: MUTED }} /></InputAdornment>,
              }}
            />
          </Box>
        </Box>
      ) : null}

      <Box sx={{ mt: 1.5 }}>
        <SmallLabel>Address {isOnCall ? '* required' : '(optional for Walk-In orders)'}</SmallLabel>
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
          {['Home', 'Office', 'Other'].map((tag) => (
            <Button
              key={tag}
              type="button"
              size="small"
              variant={form.addressType === tag ? 'contained' : 'outlined'}
              onClick={() => updateForm({ addressType: tag })}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, minWidth: 64, bgcolor: form.addressType === tag ? PRIMARY : 'transparent', borderColor: BORDER, color: form.addressType === tag ? '#fff' : MUTED, '&.MuiButton-contained': { borderColor: PRIMARY } }}
            >
              {tag}
            </Button>
          ))}
        </Box>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={form.address}
          onChange={(event) => updateForm({ address: event.target.value })}
          placeholder="Flat / house no., street, area, city"
          error={Boolean(errors.address)}
          helperText={errors.address || ''}
          sx={{ ...FIELD_SX, '& textarea': { fontSize: '0.88rem', lineHeight: 1.5 } }}
        />
        <OrdersV2AddressManager
          value={additionalAddresses}
          onChange={(next) => setAdditionalAddresses(normalizeAdditionalAddresses(next))}
          selectedId={selectedAddressId}
          onSelect={(id) => {
            setSelectedAddressId(id);
            if (id) {
              setErrors((previous) => {
                if (!previous.address) return previous;
                const next = { ...previous };
                delete next.address;
                return next;
              });
            }
          }}
          showErrors={showAddressErrors}
        />
      </Box>
    </SectionCard>
  );

  const renderOrderTypeCard = () => (
    <SectionCard
      icon={<DirectionsWalkOutlined sx={{ fontSize: 20 }} />}
      title="Order Type & Schedule"
      subtitle="Choose how the order reaches the store and set pickup timing."
    >
      <SmallLabel>Order type *</SmallLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mb: 1.5 }}>
        {[
          { value: 'walk-in', title: 'Walk-In', detail: 'Customer drops off at store', icon: <StorefrontOutlined sx={{ fontSize: 20 }} /> },
          { value: 'on-call', title: 'On-Call', detail: 'Pickup & delivery scheduled', icon: <LocalPhoneOutlined sx={{ fontSize: 20 }} /> },
        ].map((option) => {
          const active = form.orderType === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              onClick={() => updateForm({ orderType: option.value })}
              sx={{
                textTransform: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 0.35,
                p: 1.25,
                minHeight: 76,
                minWidth: 0,
                border: `1.5px solid ${active ? PRIMARY : BORDER}`,
                borderRadius: '11px',
                bgcolor: active ? PRIMARY_LIGHT : '#fff',
                color: active ? PRIMARY_DARK : TEXT,
                '&:hover': { bgcolor: active ? PRIMARY_LIGHT : '#F8FBFF', borderColor: PRIMARY },
              }}
            >
              {option.icon}
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 800, textAlign: 'left', lineHeight: 1.2 }}>{option.title}</Typography>
              <Typography sx={{ fontSize: '0.69rem', color: active ? PRIMARY_DARK : MUTED, textAlign: 'left', lineHeight: 1.3 }}>{option.detail}</Typography>
            </Button>
          );
        })}
      </Box>

      {isOnCall ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Box>
            <SmallLabel>Pickup date *</SmallLabel>
            <TextField
              type="date"
              size="small"
              fullWidth
              value={form.pickupDate}
              onChange={(event) => updateForm({ pickupDate: event.target.value })}
              error={Boolean(errors.scheduled_pickup_at)}
              helperText={errors.scheduled_pickup_at || ''}
              InputLabelProps={{ shrink: true }}
              sx={FIELD_SX}
            />
          </Box>
          <Box>
            <SmallLabel>Pickup time *</SmallLabel>
            <TextField
              type="time"
              size="small"
              fullWidth
              value={form.pickupTime}
              onChange={(event) => updateForm({ pickupTime: event.target.value })}
              error={Boolean(errors.scheduled_pickup_at)}
              helperText={errors.scheduled_pickup_at || ''}
              InputLabelProps={{ shrink: true }}
              sx={FIELD_SX}
            />
          </Box>
        </Box>
      ) : null}

      <Box sx={{ mt: isOnCall ? 1.5 : 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Box>
            <SmallLabel>Delivery date (optional)</SmallLabel>
            <TextField
              type="date"
              size="small"
              fullWidth
              value={form.deliveryDate}
              onChange={(event) => updateForm({ deliveryDate: event.target.value })}
              error={Boolean(errors.scheduled_delivery_at)}
              helperText={errors.scheduled_delivery_at || ''}
              InputLabelProps={{ shrink: true }}
              sx={FIELD_SX}
            />
          </Box>
          <Box>
            <SmallLabel>Delivery time (optional)</SmallLabel>
            <TextField
              type="time"
              size="small"
              fullWidth
              value={form.deliveryTime}
              onChange={(event) => updateForm({ deliveryTime: event.target.value })}
              error={Boolean(errors.scheduled_delivery_at)}
              helperText={errors.scheduled_delivery_at || ''}
              InputLabelProps={{ shrink: true }}
              sx={FIELD_SX}
            />
          </Box>
        </Box>
      </Box>

      {isOnCall ? (
        <Alert severity="info" icon={<InfoOutlined sx={{ fontSize: 17 }} />} sx={{ mt: 1.5, py: 0.5, bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK, fontSize: '0.76rem', alignItems: 'center' }}>
          Pickup must be in the future. Delivery, when set, must be after pickup.
        </Alert>
      ) : (
        <Alert severity="success" icon={<CheckCircleOutlined sx={{ fontSize: 17 }} />} sx={{ mt: 1.5, py: 0.75, bgcolor: '#F0FDF4', color: '#166534', fontSize: '0.8rem', alignItems: 'center' }}>
          Walk-In orders are created for immediate counter drop-off. Delivery date &amp; time are optional; select both together if needed.
        </Alert>
      )}
    </SectionCard>
  );

  const renderStaffCard = () => (
    <SectionCard
      icon={<PeopleAltOutlined sx={{ fontSize: 20 }} />}
      title="Staff Assignment"
      subtitle="Assign counter and pickup/delivery staff from active masters."
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
        <Box>
          <SmallLabel>Attending / counter staff</SmallLabel>
          <Autocomplete
            size="small"
            options={staffOptions}
            loading={masterLoading}
            getOptionLabel={staffLabel}
            isOptionEqualToValue={(option, value) => staffOptionKey(option) === staffOptionKey(value)}
            value={findStaffOption(staffOptions, form.attendStaffId)}
            onChange={(_, option) => updateForm({
              attendStaffId: staffOptionKey(option),
              attendStaffName: option?.name || '',
            })}
            noOptionsText="No active staff found"
            renderOption={(props, option) => (
              <Box component="li" {...props} key={staffOptionKey(option)} sx={{ display: 'flex !important', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                  {option.name}
                </Typography>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                  {(option.uniqueId || option.id) && (
                    <Chip
                      label={`ID: ${option.uniqueId || option.id}`}
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
                  {option.zone && (
                    <Chip
                      label={`Zone: ${option.zone}`}
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
                  {option.city && (
                    <Chip
                      label={`City: ${option.city}`}
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
            )}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search by name or ID" sx={FIELD_SX} />
            )}
          />
        </Box>
        <Box>
          <SmallLabel>Pickup / delivery person</SmallLabel>
          <Autocomplete
            size="small"
            options={pickupOptions}
            loading={masterLoading}
            getOptionLabel={staffLabel}
            isOptionEqualToValue={(option, value) => staffOptionKey(option) === staffOptionKey(value)}
            value={findStaffOption(pickupOptions, form.pickupStaffId)}
            onChange={(_, option) => updateForm({
              pickupStaffId: staffOptionKey(option),
              pickupStaffName: option?.name || '',
            })}
            noOptionsText="No active pickup/delivery staff found"
            renderOption={(props, option) => (
              <Box component="li" {...props} key={staffOptionKey(option)} sx={{ display: 'flex !important', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                  {option.name}
                </Typography>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                  {(option.uniqueId || option.id) && (
                    <Chip
                      label={`ID: ${option.uniqueId || option.id}`}
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
                  {option.zone && (
                    <Chip
                      label={`Zone: ${option.zone}`}
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
                  {option.city && (
                    <Chip
                      label={`City: ${option.city}`}
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
            )}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search by name or ID" sx={FIELD_SX} />
            )}
          />
        </Box>
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: '0.72rem', color: MUTED, lineHeight: 1.45 }}>
        Staff are loaded from the active master records with their IDs and store/zone details. Assignment is optional at creation.
      </Typography>
    </SectionCard>
  );

  const renderStageOne = () => (
    <Box sx={{ maxWidth: 920, mx: 'auto', width: '100%', minWidth: 0 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: { xs: '1.05rem', sm: '1.15rem' }, fontWeight: 850, color: TEXT }}>Step 1 — Order Basics</Typography>
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: MUTED, lineHeight: 1.45 }}>
          Enter or select customer information, choose the order type, and assign staff. New customer details and the order will be saved together when you complete Step 2.
        </Typography>
      </Box>
      {Object.keys(errors).length > 0 ? (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: '10px', fontSize: '0.82rem' }}>
          Please review the highlighted fields before continuing.
        </Alert>
      ) : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: { xs: 1.5, md: 2 }, alignItems: 'start', minWidth: 0 }}>
        {renderCustomerCard()}
        {renderOrderTypeCard()}
        {renderStaffCard()}
      </Box>
    </Box>
  );

  const renderCatalog = () => (
    <Paper sx={{ ...CARD_SX, p: 0, height: { xs: 390, md: 430 }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2, pb: 1.25, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <ShoppingCartOutlined sx={{ color: PRIMARY, fontSize: 21 }} />
          <Box>
            <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: TEXT }}>Garment Catalog</Typography>
            <Typography sx={{ fontSize: '0.74rem', color: MUTED }}>Select service, quantity and add items to the order.</Typography>
          </Box>
        </Box>
        <TextField
          size="small"
          fullWidth
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search garments or item codes..."
          sx={FIELD_SX}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: MUTED }} /></InputAdornment>,
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1.25, flexWrap: 'wrap' }}>
          {categories.map((category) => (
            <Button
              key={category}
              type="button"
              size="small"
              onClick={() => setActiveCategory(category)}
              sx={{
                textTransform: 'none',
                borderRadius: '20px',
                px: 1.5,
                py: 0.45,
                fontSize: '0.76rem',
                fontWeight: 700,
                bgcolor: activeCategory === category ? PRIMARY : '#fff',
                color: activeCategory === category ? '#fff' : MUTED,
                border: `1px solid ${activeCategory === category ? PRIMARY : BORDER}`,
                '&:hover': { bgcolor: activeCategory === category ? PRIMARY_DARK : PRIMARY_LIGHT },
              }}
            >
              {category}
            </Button>
          ))}
        </Box>
      </Box>

      <Box sx={{ ...SCROLLBAR_SX, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', p: 1.5 }}>
        {filteredProducts.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: MUTED }}>No garments match this filter.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
            {filteredProducts.map((product) => {
              const unitPrice = getProductUnitPrice(product);
              const unit = product?.unit || 'piece';
              return (
                <Paper
                  key={product.id || product.name}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: '12px',
                    borderColor: BORDER,
                    bgcolor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    minWidth: 0,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: PRIMARY,
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      flexShrink: 0,
                      borderRadius: '10px',
                      bgcolor: '#F0F7FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ClothIllustration itemId={product.id} itemName={product.name} size={40} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{ fontSize: '0.84rem', fontWeight: 800, color: TEXT, lineHeight: 1.25 }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      noWrap
                      sx={{ fontSize: '0.72rem', color: MUTED, mt: 0.25 }}
                    >
                      {product.category}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: unitPrice === null ? '0.72rem' : '0.82rem',
                        fontWeight: 800,
                        color: unitPrice === null ? '#DC2626' : PRIMARY,
                        mt: 0.25,
                      }}
                    >
                      {unitPrice === null ? (
                        'Price unavailable'
                      ) : (
                        <>
                          {money(unitPrice)}{' '}
                          <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 500, color: MUTED }}>
                            / {unit}
                          </Box>
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    disabled={unitPrice === null}
                    onClick={() => addToCart(product)}
                    startIcon={<Add sx={{ fontSize: 15 }} />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '20px',
                      borderColor: PRIMARY,
                      color: PRIMARY,
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      px: 1.4,
                      py: 0.35,
                      minWidth: 0,
                      flexShrink: 0,
                      '&:hover': {
                        bgcolor: PRIMARY_LIGHT,
                        borderColor: PRIMARY_DARK,
                      },
                    }}
                  >
                    Add
                  </Button>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Paper>
  );

  const renderCart = () => (
    <Paper sx={{ ...CARD_SX, p: 0, height: { xs: 390, md: 430 }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2, pb: 1.25, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingCartOutlined sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: TEXT }}>Order Cart</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: MUTED }}>
            {totals.lineCount} line{totals.lineCount === 1 ? '' : 's'} • {totals.itemCount} pcs
          </Typography>
        </Box>
        <Button
          type="button"
          size="small"
          disabled={cart.length === 0}
          startIcon={<DeleteOutlined sx={{ fontSize: 16 }} />}
          onClick={() => setConfirmClearOpen(true)}
          sx={{ textTransform: 'none', color: cart.length === 0 ? MUTED : '#DC2626', fontSize: '0.74rem', fontWeight: 700 }}
        >
          Clear
        </Button>
      </Box>

      <Box sx={{ ...SCROLLBAR_SX, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', p: 2, display: 'flex', flexDirection: 'column' }}>
        {cart.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 4 }}>
            <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M52 14L56 10" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M57 21L62 20" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M49 8L48 3" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M16 20H54L48 38H22L16 20Z" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M10 14H16L22 38H50" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="46" r="3.5" fill="#334155" />
              <circle cx="44" cy="46" r="3.5" fill="#334155" />
            </svg>
            <Typography sx={{ mt: 2, fontSize: '0.98rem', fontWeight: 800, color: TEXT }}>
              Your cart is empty
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.8rem', color: MUTED }}>
              Add garments from the catalog to continue.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {cart.map((item, index) => (
              <Paper key={`${item.id}_${item.serviceType}_${index}`} variant="outlined" sx={{ p: 1.25, borderRadius: '10px', borderColor: BORDER, bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: '8px',
                      bgcolor: '#F0F7FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ClothIllustration itemId={item.id} itemName={item.name} size={32} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: '0.84rem', fontWeight: 800, color: TEXT }}>{item.name}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: MUTED, mt: 0.2 }}>{item.serviceType} • {money(item.rate)} each</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => removeCartItem(index)} sx={{ color: '#DC2626' }}>
                    <DeleteOutlined sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: MUTED }}>Service</Typography>
                    <Button
                      type="button"
                      size="small"
                      onClick={() => {
                        setAddingServiceIndex(addingServiceIndex === index ? null : index);
                        setNewServiceName('');
                      }}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: PRIMARY,
                        p: 0,
                        minWidth: 0,
                        lineHeight: 1,
                        '&:hover': { textDecoration: 'underline', bgcolor: 'transparent' },
                      }}
                    >
                      + Add Service
                    </Button>
                  </Box>

                  {addingServiceIndex === index && (
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 1, p: 1, bgcolor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${BORDER}` }}>
                      <TextField
                        size="small"
                        autoFocus
                        placeholder="New service name (e.g. Steam Press)"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewService(index);
                          } else if (e.key === 'Escape') {
                            setAddingServiceIndex(null);
                            setNewServiceName('');
                          }
                        }}
                        sx={{ ...FIELD_SX, flex: 1, '& .MuiInputBase-input': { py: '6px', fontSize: '0.78rem' } }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!newServiceName.trim() || isSavingService}
                        onClick={() => handleAddNewService(index)}
                        sx={{ textTransform: 'none', bgcolor: PRIMARY, fontSize: '0.74rem', fontWeight: 700, px: 1.25, py: 0.5, '&:hover': { bgcolor: PRIMARY_DARK } }}
                      >
                        Add
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => { setAddingServiceIndex(null); setNewServiceName(''); }}
                        sx={{ textTransform: 'none', borderColor: BORDER, color: MUTED, fontSize: '0.74rem', px: 1, py: 0.5 }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}

                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={item.serviceType || defaultService}
                    onChange={(event) => {
                      if (event.target.value === '__add_new_service__') {
                        setAddingServiceIndex(index);
                        setNewServiceName('');
                      } else {
                        updateCartService(index, event.target.value);
                      }
                    }}
                    sx={{ ...FIELD_SX, '& .MuiSelect-select': { py: '7px', fontSize: '0.78rem' } }}
                  >
                    {serviceOptions.map((service) => (
                      <MenuItem key={service} value={service} sx={{ fontSize: '0.82rem' }}>{service}</MenuItem>
                    ))}
                    <MenuItem value="__add_new_service__" sx={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 700, borderTop: `1px solid ${BORDER}` }}>
                      + Add New Service Type...
                    </MenuItem>
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <IconButton size="small" onClick={() => updateCartQty(index, -1)} sx={{ borderRadius: 0, color: PRIMARY_DARK }}>
                      <Remove sx={{ fontSize: 15 }} />
                    </IconButton>
                    <Typography sx={{ width: 24, textAlign: 'center', fontSize: '0.8rem', fontWeight: 800 }}>{item.qty}</Typography>
                    <IconButton size="small" onClick={() => updateCartQty(index, 1)} sx={{ borderRadius: 0, color: PRIMARY_DARK }}>
                      <Add sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: PRIMARY_DARK }}>{money(item.amount)}</Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );

  const renderStageTwo = () => (
    <Box className="orders-v2-create-step2" sx={{ maxWidth: 1200, mx: 'auto', width: '100%', minWidth: 0 }}>
      {/* Top Header Chips matching Image 2 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          size="small"
          label={`Order ${nextOrderId}`}
          sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK, fontWeight: 700, borderRadius: '8px', px: 0.5 }}
        />
        <Chip
          size="small"
          label={customerMode === 'new' ? form.customer_name || 'New customer' : getCustomerName(selectedCustomer) || 'Existing customer'}
          sx={{ bgcolor: '#F1F5F9', color: TEXT, fontWeight: 600, borderRadius: '8px' }}
        />
        <Chip
          size="small"
          label={isOnCall ? 'On-Call' : 'Walk-In'}
          sx={{ bgcolor: '#F1F5F9', color: TEXT, fontWeight: 600, borderRadius: '8px' }}
        />
        <Chip
          size="small"
          label={form.attendStaffName || 'Counter Staff'}
          sx={{ bgcolor: '#F1F5F9', color: TEXT, fontWeight: 600, borderRadius: '8px' }}
        />
      </Box>

      {/* Main 2-column Grid: Garment Catalog & Order Cart matching Image 2 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'stretch',
          minWidth: 0,
        }}
      >
        {renderCatalog()}
        {renderCart()}
      </Box>

      {/* 3 Full-Width Accordions matching Image 2 */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            border: `1px solid ${BORDER}`,
            borderRadius: '10px !important',
            '&:before': { display: 'none' },
            bgcolor: '#fff',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ fontSize: 20, color: MUTED }} />}
            sx={{ minHeight: 46, '& .MuiAccordionSummary-content': { my: 1, display: 'flex', alignItems: 'center', gap: 1.25 } }}
          >
            <ArticleOutlined sx={{ fontSize: 20, color: PRIMARY }} />
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: TEXT }}>Additional Details</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 2, display: 'grid', gap: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label="Care / service notes"
              value={form.orderNotes}
              onChange={(event) => updateForm({ orderNotes: event.target.value })}
              sx={FIELD_SX}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label="Internal comments"
              value={form.internalNotes}
              onChange={(event) => updateForm({ internalNotes: event.target.value })}
              sx={FIELD_SX}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Discount %"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
              inputProps={{ min: 0, max: 100, step: '0.01' }}
              sx={FIELD_SX}
            />
            <Button
              type="button"
              size="small"
              variant={form.taxExemption ? 'contained' : 'outlined'}
              onClick={() => updateForm({ taxExemption: !form.taxExemption })}
              sx={{ textTransform: 'none', alignSelf: 'flex-start', bgcolor: form.taxExemption ? PRIMARY : 'transparent', borderColor: PRIMARY, color: form.taxExemption ? '#fff' : PRIMARY_DARK, fontSize: '0.76rem', fontWeight: 700 }}
            >
              {form.taxExemption ? 'Tax exemption applied' : 'Apply tax exemption'}
            </Button>
          </AccordionDetails>
        </Accordion>

        {paymentOptions.length > 0 ? (
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: '10px !important',
              '&:before': { display: 'none' },
              bgcolor: '#fff',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore sx={{ fontSize: 20, color: MUTED }} />}
              sx={{ minHeight: 46, '& .MuiAccordionSummary-content': { my: 1, display: 'flex', alignItems: 'center', gap: 1.25 } }}
            >
              <CreditCardOutlined sx={{ fontSize: 20, color: PRIMARY }} />
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: TEXT }}>Payment / Billing</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 2, display: 'grid', gap: 1.5 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="Payment Status *"
                value={form.paymentStatus || (Number(form.advancePaid) >= totals.grandTotal && totals.grandTotal > 0 ? 'Paid in Full' : Number(form.advancePaid) > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery')}
                onChange={(event) => {
                  const newStatus = event.target.value;
                  const nextAdvance = newStatus === 'Paid in Full' ? totals.grandTotal : (newStatus === 'Unpaid / Pay on Delivery' ? '' : form.advancePaid);
                  updateForm({
                    paymentStatus: newStatus,
                    advancePaid: nextAdvance,
                  });
                }}
                sx={FIELD_SX}
              >
                <MenuItem value="Paid in Full">Paid in Full</MenuItem>
                <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                <MenuItem value="Unpaid / Pay on Delivery">Unpaid / Pay on Delivery</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                fullWidth
                label="Payment method"
                value={form.paymentMethod}
                onChange={(event) => updateForm({ paymentMethod: event.target.value })}
                sx={FIELD_SX}
              >
                {paymentOptions.map((method) => (
                  <MenuItem key={method.key} value={method.label}>{method.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                fullWidth
                type="number"
                label="Advance collected"
                value={form.advancePaid}
                onChange={(event) => updateForm({ advancePaid: event.target.value })}
                inputProps={{ min: 0, step: '0.01' }}
                sx={FIELD_SX}
              />
              <TextField
                size="small"
                fullWidth
                label="Reference / transaction ID"
                value={form.paymentReference}
                onChange={(event) => updateForm({ paymentReference: event.target.value })}
                sx={FIELD_SX}
              />

              {/* UPI Instant Pay & Mark as Fully Paid */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 1.5, flexWrap: 'wrap', mt: 0.5, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                <Box sx={{ minWidth: 150, flex: '1 1 180px' }}>
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
                    updateForm({
                      advancePaid: totals.grandTotal,
                      paymentStatus: 'Paid in Full',
                    });
                    showToast?.('✅ Marked order as fully paid!');
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
            </AccordionDetails>
          </Accordion>
        ) : null}

        <OrdersV2AdvancedCustomerDetails
          fields={advancedFields}
          errors={errors}
          sections={advancedSections}
          onChange={updateAdvancedFields}
          onSectionChange={(section, isExpanded) => setAdvancedSections((previous) => ({ ...previous, [section]: isExpanded }))}
          orderPreferenceOptions={advancedOrderPreferenceOptions}
          reviewLines={buildAdvancedReviewLines({
            customerName: getCustomerName(selectedCustomer) || form.customer_name,
            address: effectiveAddress,
            onCall: isOnCall,
            staff: form.attendStaffName,
            itemCount: totals.itemCount,
            pickupDate: form.pickupDate,
            pickupTime: form.pickupTime,
            deliveryDate: form.deliveryDate,
            deliveryTime: form.deliveryTime,
          })}
          onApplyPricing={applyCustomerPricing}
        />
      </Box>
    </Box>
  );

  const renderOrderSummary = () => (
    <Box sx={{ bgcolor: '#fff', borderTop: `1px solid ${BORDER}`, px: { xs: 1.5, md: 3 }, py: 1.25, flexShrink: 0 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' },
          gap: 1.5,
          maxWidth: 1200,
          mx: 'auto',
          width: '100%',
        }}
      >
        {[
          { label: 'Total Items', value: totals.lineCount },
          { label: 'Total Pieces', value: totals.itemCount },
          { label: 'Subtotal', value: money(totals.subtotal) },
          { label: `Discount (${totals.discountPercent}%)`, value: `- ${money(totals.discountAmount)}` },
          { label: `GST / Tax (${(Number(totals.taxRate) * 100).toFixed(0)}%)`, value: money(totals.taxAmount) },
          { label: 'Grand Total', value: money(totals.grandTotal), highlight: true },
        ].map((entry) => (
          <Box key={entry.label} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.68rem', color: MUTED }}>{entry.label}</Typography>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 800, color: entry.highlight ? PRIMARY_DARK : TEXT, overflowWrap: 'anywhere' }}>
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={submitting ? undefined : onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: '95vw', sm: '85vw' },
          maxWidth: '1200px',
          height: 'min(90vh, 900px)',
          maxHeight: '90vh',
          m: 0,
          bgcolor: PAGE_BG,
          borderRadius: '14px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#fff', borderBottom: `1px solid ${BORDER}`, px: { xs: 1.5, md: 3 }, py: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: 1200, mx: 'auto', width: '100%' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '11px', bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ReceiptLongOutlined sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: { xs: '1rem', md: '1.12rem' }, fontWeight: 850, color: TEXT, lineHeight: 1.2 }}>Create Order</Typography>
              <Typography noWrap sx={{ fontSize: '0.75rem', color: MUTED }}>Orders & POS v2 • {nextOrderId}</Typography>
            </Box>
            <Chip
              size="small"
              label={stage === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
              sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK, fontWeight: 800, fontSize: '0.74rem' }}
            />
            <IconButton aria-label="Close create order" onClick={onClose} disabled={submitting} sx={{ color: MUTED }}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        <Box component="form" onSubmit={(event) => { event.preventDefault(); if (stage === 2) handleSave(); }} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ ...SCROLLBAR_SX, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', px: { xs: 1.5, md: 3 }, py: 2 }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
              {stage === 1 ? renderStageOne() : renderStageTwo()}
            </Box>
          </Box>

          {stage === 2 ? renderOrderSummary() : null}

          <Box sx={{ bgcolor: '#fff', borderTop: `1px solid ${BORDER}`, px: { xs: 1.5, md: 3 }, py: 1.5, flexShrink: 0 }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 240 } }}>
                <Typography sx={{ fontSize: '0.74rem', color: MUTED }}>Grand total</Typography>
                <Typography sx={{ fontSize: '1.05rem', fontWeight: 850, color: PRIMARY_DARK }}>
                  {money(stage === 2 ? totals.grandTotal : 0)}
                </Typography>
                {stage === 1 && !isStageOneValid ? (
                  <Typography sx={{ mt: 0.25, fontSize: '0.7rem', color: '#B45309' }}>
                    Complete the required customer and order details to continue.
                  </Typography>
                ) : null}
                {stage === 2 && cart.length === 0 ? (
                  <Typography sx={{ mt: 0.25, fontSize: '0.7rem', color: '#B45309' }}>
                    Add at least one garment before saving.
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                {stage === 1 ? (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={onClose}
                    disabled={submitting || directSubmitting}
                    sx={{ textTransform: 'none', borderColor: BORDER, color: MUTED, fontWeight: 700, px: 2.5 }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setStage(1)}
                    disabled={submitting}
                    sx={{ textTransform: 'none', borderColor: PRIMARY, color: PRIMARY_DARK, fontWeight: 700, px: 2.5 }}
                  >
                    Back
                  </Button>
                )}
                {stage === 1 ? (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleCreateDirect}
                    disabled={submitting || directSubmitting || !isStageOneValid}
                    startIcon={<CheckCircleOutlined sx={{ fontSize: 17 }} />}
                    sx={{ textTransform: 'none', borderColor: PRIMARY, color: PRIMARY_DARK, fontWeight: 800, px: 2.5 }}
                  >
                    {directSubmitting ? 'Creating...' : 'Create Order'}
                  </Button>
                ) : null}
                {stage === 1 ? (
                  <Button
                    type="button"
                    variant="contained"
                    onClick={handleNext}
                    disabled={submitting || directSubmitting || !isStageOneValid}
                    endIcon={<ArrowForward sx={{ fontSize: 17 }} />}
                    sx={{ textTransform: 'none', bgcolor: PRIMARY, fontWeight: 800, px: 2.5, '&:hover': { bgcolor: PRIMARY_DARK } }}
                  >
                    Continue to Order
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!canSave}
                    startIcon={<CheckCircleOutlined sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: 'none', bgcolor: PRIMARY, fontWeight: 800, px: 2.5, '&:hover': { bgcolor: PRIMARY_DARK } }}
                  >
                    {submitting ? 'Saving...' : 'Save Order'}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, color: TEXT }}>Clear this cart?</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: '0.86rem', color: MUTED }}>
            All selected garments and quantities will be removed. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmClearOpen(false)} sx={{ textTransform: 'none', color: MUTED }}>Keep Items</Button>
          <Button onClick={clearCart} variant="contained" sx={{ textTransform: 'none', bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}>
            Clear Cart
          </Button>
        </DialogActions>
      </Dialog>
    
      {/* ── UPI Payment QR Code Modal in Create Order ── */}
      <UPIPaymentQRDialog
        open={showQRModal}
        onClose={() => setShowQRModal(false)}
        orderNumber={nextOrderId || 'NEW ORDER'}
        customerName={getCustomerName(selectedCustomer) || form.customer_name || 'Customer'}
        amount={Math.max(0, totals.grandTotal - (Number(form.advancePaid) || 0)) || totals.grandTotal}
        currencySymbol={BUSINESS_CONFIG.CURRENCY_SYMBOL || '₹'}
        onMarkPaid={() => {
          updateForm({
            advancePaid: totals.grandTotal,
            paymentStatus: 'Paid in Full',
            paymentMethod: 'UPI / QR Code',
          });
          showToast?.('✓ Payment received via QR & marked as Fully Paid!');
        }}
      />
    </Dialog>
  );
}
