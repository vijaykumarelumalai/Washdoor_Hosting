// src/components/OrdersV2.jsx - Orders & POS v2 Core Shell matching reference UI design
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Paper, Card, Typography, Button, IconButton, Chip, Checkbox, Popover,
  TextField, MenuItem, Snackbar, Alert, Tooltip, InputAdornment,
} from '@mui/material';
import {
  Add, Refresh, Search, ShoppingCartRounded, FilterAltOutlined,
  Inventory2Outlined, TrendingUp, AccessTime, LocalShippingOutlined,
  Storefront, OpenInNew, ViewColumnRounded, KeyboardArrowDown, CloseRounded,
  LockOutlined,
} from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';
import { normalizeOrder } from '../utils/normalizeOrder';
import { LoadingState } from './common/LoadingState';
import {
  OrdersV2List,
  restoreOrderPricing,
  normalizeOrdersV2Status,
  getOrderServiceFilterValues,
  getServiceFilterKeys,
} from './OrdersV2List';
import { OrdersV2EditDrawer } from './OrdersV2EditDrawer';
import OrdersV2SideEditPanel from './OrdersV2SideEditPanel';
import OrderStatusSidePanel from './pos/OrderStatusDrawer';
import ThermalReceiptModal from './ThermalReceiptModal';
import OrdersV2CreateOrder from './OrdersV2CreateOrder';
import { deleteOrderFromSupabase } from '../services/customerService';
import { fetchServiceTypes, SERVICE_TYPES_UPDATED_EVENT } from '../services/serviceTypeService';
import {
  ORDERS_V2_ALL_COLUMN_IDS,
  ORDERS_V2_COLUMN_GROUPS,
  ORDERS_V2_DEFAULT_COLUMN_IDS,
  ORDERS_V2_REQUIRED_COLUMN_IDS,
  enforceOrdersV2RequiredColumns,
} from '../config/ordersV2ColumnsConfig';
import {
  loadOrdersV2ColumnPreferences,
  saveOrdersV2ColumnPreferences,
} from '../services/ordersV2ColumnPreferenceService';
import '../styles/OrdersV2.css';

const MONEY = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isDbServiceTypeId = (id) => {
  const value = String(id || '').trim();
  return Boolean(value) && !value.startsWith('default:') && !value.startsWith('local:');
};

const normalizeServiceNameKey = (name) => String(name || '').trim().toLowerCase();

const isActiveService = (service) => (service?.isActive ?? service?.is_active) === true;

const dedupeServiceTypes = (services) => {
  const groups = new Map();
  const activeServices = (services || [])
    .filter((service) => isDbServiceTypeId(service?.id) && isActiveService(service) && normalizeServiceNameKey(service?.name))
    .sort((a, b) => {
      const orderDiff = Number(a.displayOrder ?? a.display_order ?? 0) - Number(b.displayOrder ?? b.display_order ?? 0);
      if (orderDiff) return orderDiff;
      const nameDiff = normalizeServiceNameKey(a.name).localeCompare(normalizeServiceNameKey(b.name));
      if (nameDiff) return nameDiff;
      return String(a.id).localeCompare(String(b.id));
    });

  activeServices.forEach((service) => {
    const id = String(service.id);
    const name = String(service.name).trim();
    const key = normalizeServiceNameKey(name);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { ...service, id, name, serviceIds: [id], names: [name] });
      return;
    }
    if (!existing.serviceIds.includes(id)) existing.serviceIds.push(id);
    if (!existing.names.includes(name)) existing.names.push(name);
  });

  return [...groups.values()];
};

const FILTER_FIELD_SX = {
  bgcolor: '#ffffff',
  fontSize: '0.88rem',
  '& fieldset': { borderColor: '#cbd5e1' },
  '&:hover fieldset': { borderColor: '#94a3b8' },
  '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: 1.5 },
  '& .MuiInputBase-input': { py: '8px' },
};

export function OrdersV2({
  orders = [],
  loadingOrders = false,
  onRefreshOrders,
  onCreateOrder,
  onUpdateOrder,
  onDeleteOrder,
  currencySymbol = '₹',
  showToast,
  onNavigateTab,
  searchQuery = '',
  onSearchChange,
  theme = 'light',
} = {}) {
  const { language, t } = useLanguage();

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sideEditOrder, setSideEditOrder] = useState(null);
  const [viewOrderModal, setViewOrderModal] = useState(null);
  const [viewOrderTab, setViewOrderTab] = useState('details');
  const [receiptOrderModal, setReceiptOrderModal] = useState(null);
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [topSearch, setTopSearch] = useState(searchQuery || '');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [serviceTypes, setServiceTypes] = useState([]);
  const [isLoadingServiceTypes, setIsLoadingServiceTypes] = useState(true);
  const [serviceTypesError, setServiceTypesError] = useState('');
  const serviceNameHistoryRef = useRef(new Map());

  const [visibleColumnIds, setVisibleColumnIds] = useState([...ORDERS_V2_DEFAULT_COLUMN_IDS]);
  const [draftColumnIds, setDraftColumnIds] = useState([...ORDERS_V2_DEFAULT_COLUMN_IDS]);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  // Sync external search query
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== topSearch) {
      setTopSearch(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    loadOrdersV2ColumnPreferences().then((columns) => {
      if (!active) return;
      const sanitized = enforceOrdersV2RequiredColumns(columns);
      setVisibleColumnIds(sanitized);
      setDraftColumnIds([...sanitized]);
    });
    return () => {
      active = false;
    };
  }, []);

  const showSnack = useCallback((msg, severity = 'success') => {
    setSnack({ open: true, message: msg, severity });
    showToast?.(msg);
  }, [showToast]);

  const handleOpenColumnMenu = (event) => {
    setDraftColumnIds([...visibleColumnIds]);
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleCloseColumnMenu = () => {
    setColumnMenuAnchor(null);
    setDraftColumnIds([...visibleColumnIds]);
  };

  const handleToggleDraftColumn = (columnId, required) => {
    if (required) return;
    setDraftColumnIds((current) => (
      current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId]
    ));
  };

  const allColumnsSelected = ORDERS_V2_ALL_COLUMN_IDS.every((id) => draftColumnIds.includes(id));
  const handleToggleAllColumns = () => {
    setDraftColumnIds(allColumnsSelected
      ? [...ORDERS_V2_REQUIRED_COLUMN_IDS]
      : [...ORDERS_V2_ALL_COLUMN_IDS]);
  };

  const handleApplyColumns = async () => {
    const sanitized = enforceOrdersV2RequiredColumns(draftColumnIds);
    const saved = await saveOrdersV2ColumnPreferences(sanitized);
    setVisibleColumnIds(saved);
    setDraftColumnIds([...saved]);
    setColumnMenuAnchor(null);
    showSnack(`${saved.length} of ${ORDERS_V2_ALL_COLUMN_IDS.length} columns applied`, 'success');
  };

  const withNameHistory = useCallback((services) => {
    const history = serviceNameHistoryRef.current;
    const activeIds = new Set();
    const enriched = (services || []).map((service) => {
      const ids = [service.id, ...(Array.isArray(service.serviceIds) ? service.serviceIds : [])]
        .map(String)
        .filter(Boolean);
      ids.forEach((id) => activeIds.add(id));
      const names = [...new Set([
        ...(Array.isArray(service.names) ? service.names : []),
        service.name,
        ...ids.flatMap((id) => history.get(id) || []),
      ].map((name) => String(name || '').trim()).filter(Boolean))];
      ids.forEach((id) => history.set(id, names));
      return { ...service, names };
    });
    [...history.keys()].forEach((id) => {
      if (!activeIds.has(id)) history.delete(id);
    });
    return enriched;
  }, []);

  const loadServiceTypes = useCallback(async () => {
    setIsLoadingServiceTypes(true);
    setServiceTypesError('');
    try {
      const result = await fetchServiceTypes();
      if (result.source !== 'supabase' || !Array.isArray(result.data)) {
        setServiceTypesError(result.error ? 'Unable to load service types' : '');
        return;
      }
      setServiceTypes(withNameHistory(dedupeServiceTypes(result.data)));
      if (result.error) setServiceTypesError('Unable to load service types');
    } catch (err) {
      setServiceTypesError('Unable to load service types');
    } finally {
      setIsLoadingServiceTypes(false);
    }
  }, [withNameHistory]);

  useEffect(() => {
    loadServiceTypes();
  }, [loadServiceTypes]);

  useEffect(() => {
    const handleServiceTypesUpdated = () => {
      loadServiceTypes();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(SERVICE_TYPES_UPDATED_EVENT, handleServiceTypesUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SERVICE_TYPES_UPDATED_EVENT, handleServiceTypesUpdated);
      }
    };
  }, [loadServiceTypes]);

  const selectedServiceType = useMemo(
    () => serviceTypes.find((service) => (
      String(service.id) === String(serviceFilter)
      || (Array.isArray(service.serviceIds) && service.serviceIds.some((id) => String(id) === String(serviceFilter)))
    )) || null,
    [serviceTypes, serviceFilter],
  );

  const serviceFilterKeys = useMemo(() => getServiceFilterKeys(selectedServiceType), [selectedServiceType]);

  useEffect(() => {
    if (isLoadingServiceTypes || serviceFilter === 'All Services') return;
    if (!selectedServiceType) {
      setServiceFilter('All Services');
      return;
    }
    if (String(selectedServiceType.id) !== String(serviceFilter)) {
      setServiceFilter(selectedServiceType.id);
    }
  }, [isLoadingServiceTypes, serviceFilter, selectedServiceType]);

  // Normalized and filtered orders
  const normalizedList = useMemo(() => {
    return (orders || []).map((raw) => {
      const normalized = normalizeOrder(raw);
      const status = normalizeOrdersV2Status(normalized.order_status || normalized.status || raw?.order_status || raw?.status);
      return {
        ...restoreOrderPricing({ ...normalized, order_status: status, status }, raw),
        __serviceFilterValues: getOrderServiceFilterValues(raw),
      };
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = normalizedList;

    if (statusFilter !== 'All') {
      list = list.filter((o) => normalizeOrdersV2Status(o.order_status || o.status) === statusFilter);
    }
    if (serviceFilter !== 'All Services' && serviceFilterKeys.length > 0) {
      list = list.filter((o) => {
        const values = o.__serviceFilterValues || [];
        return serviceFilterKeys.some((key) => values.includes(key));
      });
    }
    if (dateFilter !== 'All Time') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'Today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'This Week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'This Month') cutoff.setMonth(now.getMonth() - 1);
      list = list.filter((o) => new Date(o.created_at || now) >= cutoff);
    }
    if (topSearch) {
      const q = topSearch.toLowerCase().trim();
      list = list.filter((o) =>
        String(o.order_number || '').toLowerCase().includes(q) ||
        String(o.customer_name || '').toLowerCase().includes(q) ||
        String(o.mobile_number || '').toLowerCase().includes(q) ||
        String(o.address || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [normalizedList, statusFilter, serviceFilter, serviceFilterKeys, dateFilter, topSearch]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, serviceFilter, dateFilter, topSearch]);

  // KPI calculations based on current dataset
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.total_amount || 0) || 0), 0);
  }, [filteredOrders]);

  const pendingBalance = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.balance_due || 0) || 0), 0);
  }, [filteredOrders]);

  const readyCount = useMemo(() => {
    return filteredOrders.filter((o) => normalizeOrdersV2Status(o.order_status || o.status) === 'Ready').length;
  }, [filteredOrders]);

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const counts = {
      All: normalizedList.length,
      'Order Received': 0,
      'In Progress': 0,
      Ready: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    normalizedList.forEach((o) => {
      const s = normalizeOrdersV2Status(o.order_status || o.status);
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    });
    return counts;
  }, [normalizedList]);

  const formatDate = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(v);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t?.('delete_confirm_msg', 'Are you sure you want to delete this order?') || 'Are you sure you want to delete this order?')) return;
    try {
      await deleteOrderFromSupabase(id);
      showSnack('Order deleted successfully', 'success');
      onDeleteOrder?.(id);
      onRefreshOrders?.();
    } catch (err) {
      showSnack(err.message || 'Delete failed', 'error');
    }
  };

  return (
    <Box
      className="orders-v2-container"
      sx={{
        width: '100%',
        maxWidth: 'none',
        minWidth: 0,
        boxSizing: 'border-box',
        bgcolor: '#f8fafc',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        height: '100%',
      }}
    >
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Box
        className="orders-v2-content"
        sx={{
          width: '100%',
          maxWidth: 'none',
          minWidth: 0,
          boxSizing: 'border-box',
          pt: { xs: 1.25, sm: 1.5 },
          pb: 0,
          px: { xs: 1.5, sm: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          height: '100%',
        }}
      >
        {/* ── Top Header ── */}
        <Box
          className="orders-v2-header-section"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'space-between' },
            width: '100%',
            minWidth: 0,
            mb: { xs: 1, sm: 1.25 },
            gap: { xs: 0.75, sm: 1.25, md: 1.5 },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            flexShrink: 0,
          }}
        >
          {/* Left: Blue Cart Icon + Title + Subtitle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: '1 1 auto' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '9px',
                bgcolor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                flexShrink: 0,
              }}
            >
              <ShoppingCartRounded sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.15rem', sm: '1.3rem' },
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                Orders & POS
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#64748b', fontSize: '0.8rem', mt: 0.2 }}
              >
                Create, manage and update laundry orders
              </Typography>
            </Box>
          </Box>

          {/* Right Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: { xs: 0.5, sm: 0.75 },
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIsCreateModalOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                bgcolor: '#2563eb',
                color: '#ffffff',
                border: '1px solid #2563eb',
                borderRadius: '8px',
                px: { xs: 1.25, sm: 1.75 },
                py: 0.75,
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#1d4ed8',
                  borderColor: '#1d4ed8',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                },
              }}
            >
              + Create Order
            </Button>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                loadServiceTypes();
                onRefreshOrders?.();
                showSnack('Refreshing orders...', 'info');
              }}
              disabled={loadingOrders}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                bgcolor: '#ffffff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
                borderRadius: '8px',
                px: { xs: 1.25, sm: 1.75 },
                py: 0.75,
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: '#eff6ff',
                  borderColor: '#60a5fa',
                },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* ── Search and Filter Toolbar Bar ── */}
        <Paper
          elevation={0}
          className="orders-v2-filter-section"
          sx={{
            width: '100%',
            maxWidth: 'none',
            minWidth: 0,
            boxSizing: 'border-box',
            p: { xs: 1, sm: 1.25 },
            borderRadius: 2,
            mb: 1,
            border: '1px solid #dbeafe',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              width: '100%',
              maxWidth: 'none',
              minWidth: 0,
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'minmax(0, 2fr) repeat(3, minmax(0, 1.2fr)) 36px',
              },
              columnGap: { xs: 0.75, sm: 1 },
              rowGap: { xs: 0.75, sm: 1 },
              alignItems: 'center',
            }}
          >
            <Box sx={{ minWidth: 0, width: '100%', gridColumn: { sm: '1 / -1', md: 'auto' } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by Order ID, Customer Name, or Mobile Number..."
                value={topSearch}
                onChange={(e) => {
                  setTopSearch(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" sx={{ color: '#60a5fa' }} />
                    </InputAdornment>
                  ),
                  sx: { ...FILTER_FIELD_SX, borderRadius: 2 },
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0, width: '100%' }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={statusFilter === 'All' ? 'All Statuses' : statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatusFilter(val === 'All Statuses' ? 'All' : val);
                }}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    fontSize: '0.85rem',
                    color: '#64748b',
                    '&.Mui-focused': { color: '#2563eb' },
                  },
                }}
                SelectProps={{ sx: FILTER_FIELD_SX }}
              >
                <MenuItem value="All Statuses">All Statuses</MenuItem>
                <MenuItem value="Order Received">Order Received</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Ready">Ready</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ minWidth: 0, width: '100%' }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Service Category"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    fontSize: '0.85rem',
                    color: '#64748b',
                    '&.Mui-focused': { color: '#2563eb' },
                  },
                }}
                SelectProps={{ sx: FILTER_FIELD_SX }}
              >
                <MenuItem value="All Services">All Services</MenuItem>
                {isLoadingServiceTypes && (
                  <MenuItem disabled value="__loading_service_types__">Loading service types...</MenuItem>
                )}
                {!isLoadingServiceTypes && serviceTypesError && (
                  <MenuItem disabled value="__service_types_error__">{serviceTypesError}</MenuItem>
                )}
                {!isLoadingServiceTypes && !serviceTypesError && serviceTypes.length === 0 && (
                  <MenuItem disabled value="__no_service_types__">No active service types</MenuItem>
                )}
                {!isLoadingServiceTypes && serviceTypes.map((service) => (
                  <MenuItem key={service.id} value={service.id}>{service.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ minWidth: 0, width: '100%' }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Time Range"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    fontSize: '0.85rem',
                    color: '#64748b',
                    '&.Mui-focused': { color: '#2563eb' },
                  },
                }}
                SelectProps={{ sx: FILTER_FIELD_SX }}
              >
                <MenuItem value="All Time">All Time</MenuItem>
                <MenuItem value="Today">Today</MenuItem>
                <MenuItem value="This Week">This Week</MenuItem>
                <MenuItem value="This Month">This Month</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ width: 36, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
              <Tooltip title="Reset Filters">
                <IconButton
                  size="small"
                  onClick={() => {
                    setStatusFilter('All');
                    setServiceFilter('All Services');
                    setDateFilter('All Time');
                    setTopSearch('');
                    onSearchChange?.('');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid #bfdbfe',
                    borderRadius: 2,
                    color: '#2563eb',
                    bgcolor: '#eff6ff',
                    '&:hover': { bgcolor: '#dbeafe', borderColor: '#60a5fa' },
                  }}
                >
                  <FilterAltOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* ── Status Filter Pills ── */}
        <Box
          className="orders-v2-status-section"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            gap: { xs: 0.5, sm: 0.75 },
            width: '100%',
            maxWidth: 'none',
            minWidth: 0,
            boxSizing: 'border-box',
            minHeight: 28,
            mb: 1,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 0.75 },
              flex: 1,
              minWidth: 0,
            }}
          >
            {[
              'All',
              'Order Received',
              'In Progress',
              'Ready',
              'Delivered',
              'Cancelled',
            ].map((st) => {
              const isSelected = statusFilter === st;
              const count = statusCounts[st] || 0;
              return (
                <Chip
                  key={st}
                  label={`${st} (${count})`}
                  onClick={() => setStatusFilter(st)}
                  size="small"
                  clickable
                  sx={{
                    height: 26,
                    px: 0.5,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: '0.72rem',
                    borderRadius: 2,
                    bgcolor: isSelected ? '#2563eb' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: isSelected ? '#2563eb' : '#dbeafe',
                    boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isSelected ? '#1d4ed8' : '#eff6ff',
                      borderColor: isSelected ? '#1d4ed8' : '#93c5fd',
                    },
                  }}
                />
              );
            })}
          </Box>

          <Box className="orders-v2-columns-control" sx={{ flexShrink: 0 }}>
            <Button
              className="orders-v2-columns-button"
              size="small"
              variant="outlined"
              onClick={handleOpenColumnMenu}
              aria-label="Manage table columns"
              startIcon={<ViewColumnRounded sx={{ fontSize: 16 }} />}
              endIcon={<KeyboardArrowDown sx={{ fontSize: 16 }} />}
              sx={{
                height: 28,
                px: 1,
                whiteSpace: 'nowrap',
                textTransform: 'none',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#bfdbfe',
                bgcolor: '#eff6ff',
                color: '#2563eb',
                '&:hover': { bgcolor: '#dbeafe', borderColor: '#60a5fa' },
              }}
            >
              Columns ({visibleColumnIds.length}/{ORDERS_V2_ALL_COLUMN_IDS.length})
            </Button>
            <Popover
              open={Boolean(columnMenuAnchor)}
              anchorEl={columnMenuAnchor}
              onClose={handleCloseColumnMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ className: 'orders-v2-column-popover-paper' }}
            >
              <Box className="orders-v2-column-popover">
                <Box className="orders-v2-column-popover-header">
                  <Box className="orders-v2-column-popover-heading">
                    <Typography className="orders-v2-column-popover-title">Manage Columns</Typography>
                    <Typography className="orders-v2-column-popover-count">
                      <span className="orders-v2-column-count-badge">
                        {draftColumnIds.length} of {ORDERS_V2_ALL_COLUMN_IDS.length}
                      </span>
                      <span>columns selected</span>
                    </Typography>
                  </Box>
                  <Box className="orders-v2-column-header-actions">
                    <Button
                      size="small"
                      className="orders-v2-column-select-all"
                      onClick={handleToggleAllColumns}
                    >
                      {allColumnsSelected ? 'Clear' : 'All'}
                    </Button>
                    <IconButton size="small" onClick={handleCloseColumnMenu} aria-label="Close column manager">
                      <CloseRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>

                <Box className="orders-v2-column-groups">
                  {ORDERS_V2_COLUMN_GROUPS.map((group) => (
                    <Box className="orders-v2-column-group" key={group.id}>
                      <Typography className="orders-v2-column-group-label">{group.label}</Typography>
                      {group.columns.map((column) => {
                        const isSelected = draftColumnIds.includes(column.id);
                        const badgeLabel = column.required
                          ? 'Required'
                          : (column.default && !column.required ? 'Default' : null);
                        return (
                          <Box
                            className={`orders-v2-column-option${isSelected ? ' is-selected' : ''}`}
                            key={column.id}
                          >
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              disabled={column.required}
                              onChange={() => handleToggleDraftColumn(column.id, column.required)}
                              inputProps={{ 'aria-label': column.label }}
                            />
                            <Box className="orders-v2-column-option-text">
                              <Typography
                                variant="body2"
                                className="orders-v2-column-option-name"
                                sx={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.35, fontFamily: 'inherit', color: '#0f172a' }}
                              >
                                {column.label}
                              </Typography>
                              <Typography
                                variant="caption"
                                className="orders-v2-column-option-description"
                                sx={{ fontSize: '11px', fontWeight: 400, lineHeight: 1.35, fontFamily: 'inherit', color: '#64748b' }}
                              >
                                {column.purpose}
                              </Typography>
                            </Box>
                            {badgeLabel && (
                              <span className={`orders-v2-column-badge${column.required ? ' is-required' : ''}`}>
                                {column.required && <LockOutlined className="orders-v2-column-badge-icon" />}
                                {badgeLabel}
                              </span>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>

                <Box className="orders-v2-column-popover-footer">
                  <Button size="small" onClick={() => setDraftColumnIds([...ORDERS_V2_DEFAULT_COLUMN_IDS])}>Reset</Button>
                  <Button size="small" variant="contained" onClick={handleApplyColumns}>Apply Columns</Button>
                </Box>
              </Box>
            </Popover>
          </Box>
        </Box>

        {/* ── 4 KPI Summary Cards ── */}
        <Box
          className="orders-v2-kpi-section"
          sx={{
            display: 'grid',
            width: '100%',
            maxWidth: 'none',
            minWidth: 0,
            boxSizing: 'border-box',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 0.75, sm: 1 },
            mb: 1.25,
            flexShrink: 0,
          }}
        >
          {/* 1. Total Orders */}
          <Box sx={{ minWidth: 0, width: '100%', display: 'flex' }}>
            <Card
              elevation={0}
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                width: '100%',
                minHeight: { xs: 72, sm: 78 },
                border: '1px solid #dbeafe',
                borderTop: '3px solid #2563eb',
                borderRadius: 2,
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
                transition: 'box-shadow 0.15s ease',
                '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' },
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '9px',
                  bgcolor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Inventory2Outlined sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  Total Orders
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.2, color: '#0f172a', fontSize: '1.35rem' }}>
                  {filteredOrders.length}
                </Typography>
              </Box>
            </Card>
          </Box>

          {/* 2. Total Revenue */}
          <Box sx={{ minWidth: 0, width: '100%', display: 'flex' }}>
            <Card
              elevation={0}
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                width: '100%',
                minHeight: { xs: 72, sm: 78 },
                border: '1px solid #dbeafe',
                borderTop: '3px solid #2563eb',
                borderRadius: 2,
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
                transition: 'box-shadow 0.15s ease',
                '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' },
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '9px',
                  bgcolor: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  Total Revenue
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.2, color: '#0f172a', fontSize: '1.35rem' }}>
                  {currencySymbol}{MONEY(totalRevenue)}
                </Typography>
              </Box>
            </Card>
          </Box>

          {/* 3. Pending Balance */}
          <Box sx={{ minWidth: 0, width: '100%', display: 'flex' }}>
            <Card
              elevation={0}
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                width: '100%',
                minHeight: { xs: 72, sm: 78 },
                border: '1px solid #dbeafe',
                borderTop: '3px solid #2563eb',
                borderRadius: 2,
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
                transition: 'box-shadow 0.15s ease',
                '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' },
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '9px',
                  bgcolor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AccessTime sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  Pending Balance
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.2, color: '#2563eb', fontSize: '1.35rem' }}>
                  {currencySymbol}{MONEY(pendingBalance)}
                </Typography>
              </Box>
            </Card>
          </Box>

          {/* 4. Ready for Pickup */}
          <Box sx={{ minWidth: 0, width: '100%', display: 'flex' }}>
            <Card
              elevation={0}
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                width: '100%',
                minHeight: { xs: 72, sm: 78 },
                border: '1px solid #dbeafe',
                borderTop: '3px solid #2563eb',
                borderRadius: 2,
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
                transition: 'box-shadow 0.15s ease',
                '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' },
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '9px',
                  bgcolor: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LocalShippingOutlined sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  Ready for Pickup
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.2, color: '#0f172a', fontSize: '1.35rem' }}>
                  {readyCount}
                </Typography>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* ── Orders Table with Inline Edit & Child Modals ── */}
        {loadingOrders ? (
          <LoadingState text="Syncing Orders..." />
        ) : (
          <Box
            className="orders-v2-table-wrapper"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <OrdersV2List
              orders={filteredOrders}
              page={page}
              pageSize={pageSize}
              statusFilter={statusFilter}
              serviceFilter={serviceFilter}
              serviceFilterKeys={serviceFilterKeys}
              serviceTypes={serviceTypes}
              isLoadingServiceTypes={isLoadingServiceTypes}
              dateFilter={dateFilter}
              topSearch={topSearch}
              currencySymbol={currencySymbol}
              visibleColumnIds={visibleColumnIds}
              onOpenSideEdit={(order) => setSideEditOrder(order)}
              onOpenViewOrder={(order) => { setViewOrderTab('details'); setViewOrderModal(order); }}
              onOpenReceipt={(order) => setReceiptOrderModal(order)}
              onEditInDrawer={(order) => {
                setDrawerOrder(order);
                setIsDrawerOpen(true);
              }}
              onDelete={handleDelete}
              onUpdateOrder={(updated) => {
                onUpdateOrder?.(updated);
                showSnack('Order updated successfully', 'success');
                onRefreshOrders?.();
              }}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              t={t}
              language={language}
              formatDateFn={formatDate}
              showToast={showSnack}
            />
          </Box>
        )}
      </Box>

      {/* ── Standalone Child Modals & Panels ── */}
      {/* 1. Orders V2 Redesigned Side Edit Panel */}
      {sideEditOrder && (
        <OrdersV2SideEditPanel
          isOpen={Boolean(sideEditOrder)}
          order={sideEditOrder}
          onClose={() => setSideEditOrder(null)}
          onUpdateOrder={(upd) => {
            onUpdateOrder?.(upd);
            showSnack('Order updated in Side Panel', 'success');
            onRefreshOrders?.();
          }}
          onDelete={(id) => {
            onDeleteOrder?.(id);
            showSnack('Order deleted', 'success');
            onRefreshOrders?.();
            setSideEditOrder(null);
          }}
          currencySymbol={currencySymbol}
          showToast={showToast}
        />
      )}

      {/* 2. Detailed View Order Dialog (POS-style 4-tab panel) */}
      {viewOrderModal && (
        <OrderStatusSidePanel
          isOpen={Boolean(viewOrderModal)}
          order={viewOrderModal}
          activeTab={viewOrderTab}
          onTabChange={setViewOrderTab}
          onClose={() => setViewOrderModal(null)}
          onEdit={(o) => {
            setViewOrderModal(null);
            setSideEditOrder(o);
          }}
          onPrint={(o) => setReceiptOrderModal(o)}
          currencySymbol={currencySymbol}
        />
      )}

      {/* 3. Thermal Receipt Preview Modal */}
      {receiptOrderModal && (
        <ThermalReceiptModal
          isOpen={Boolean(receiptOrderModal)}
          order={receiptOrderModal}
          onClose={() => setReceiptOrderModal(null)}
        />
      )}

      {isCreateModalOpen && (
        <OrdersV2CreateOrder
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onOrderSuccess={() => {
            showSnack('Order created successfully', 'success');
            onRefreshOrders?.();
            setIsCreateModalOpen(false);
          }}
          showToast={showToast}
        />
      )}

      {/* 5. Fast Slide Drawer */}
      {isDrawerOpen && (
        <OrdersV2EditDrawer
          open={isDrawerOpen}
          order={drawerOrder}
          onClose={() => {
            setIsDrawerOpen(false);
            setDrawerOrder(null);
          }}
          onSave={(upd) => {
            onUpdateOrder?.(upd);
            showSnack('Order updated successfully', 'success');
            onRefreshOrders?.();
          }}
          currencySymbol={currencySymbol}
          t={t}
          language={language}
          formatDateFn={formatDate}
        />
      )}
    </Box>
  );
}

export default OrdersV2;
