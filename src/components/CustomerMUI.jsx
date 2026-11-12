// src/components/CustomerMUI.jsx
// Material UI (MUI) CRM Layout for the Washdoor Customer MUI Module

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Popover,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

import {
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  createCustomer,
  getNextCustomerId,
} from '../services/customerService';
import CustomerForm from './CustomerForm';
import CustomerDetailDrawer, {
  formatCleanStaffNotes,
  formatRegisteredDate,
} from './CustomerDetailDrawer';
import Customer360Panel, { getPastelAvatarColors } from './Customer360Panel';
import {
  friendlySupabaseError,
  formatPhoneDisplay,
  isMobileNumberQuery,
  normalizeMobileNumber,
} from '../utils/validation';
import { useLanguage } from '../context/LanguageContext';

const COLUMN_VISIBILITY_STORAGE_KEY = 'washdoor_customer_mui_columns_v2';

const DEFAULT_COLUMN_VISIBILITY = {
  customer_id: true,
  customer_name: true,
  mobile_number: true,
  customer_classification: true,
  address: true,
  orders_count: true,
  customer_status: true,
  company_name: false,
  created_at: false,
  internal_comments: false,
  actions: true,
};

const CUSTOMIZABLE_COLUMNS = [
  { field: 'customer_id', label: 'Customer ID', locked: true },
  { field: 'customer_name', label: 'Customer Name', locked: true },
  { field: 'mobile_number', label: 'Contact' },
  { field: 'customer_classification', label: 'Classification' },
  { field: 'address', label: 'Location / Zone' },
  { field: 'orders_count', label: 'Orders' },
  { field: 'customer_status', label: 'Status' },
  { field: 'company_name', label: 'Company / GST' },
  { field: 'created_at', label: 'Joined Date' },
  { field: 'internal_comments', label: 'Staff Notes' },
  { field: 'actions', label: 'Actions', locked: true },
];

function isVipCustomer(c) {
  const cls = String(c?.customer_classification || c?.customerClassification || '').toLowerCase();
  return Boolean(
    cls.includes('vip') ||
    cls.includes('corporate') ||
    cls.includes('elite') ||
    c?.membership_id ||
    c?.membershipId ||
    Number(c?.default_discount || c?.default_discount_pct || 0) > 0
  );
}

function isGstB2BCustomer(c) {
  return Boolean(
    (c?.gst_number && String(c.gst_number).trim()) ||
    (c?.gstNumber && String(c.gstNumber).trim()) ||
    (c?.company_name && String(c.company_name).trim()) ||
    (c?.companyName && String(c.companyName).trim())
  );
}

function normalizeSegmentLabel(raw) {
  const val = String(raw || '').trim();
  const lower = val.toLowerCase();
  if (!val || lower === 'regular' || lower === 'regular customer') return 'Regular Customer';
  if (lower === 'vip' || lower === 'vip customer') return 'VIP Customer';
  if (lower === 'corporate' || lower === 'b2b' || lower === 'corporate account') return 'Corporate';
  return val;
}

function useWashdoorThemeMode() {
  const readMode = () => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  };
  const [mode, setMode] = useState(readMode);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      setMode(readMode());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return mode;
}

function buildMuiTheme(mode) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#7c5cfc' : '#2563eb',
        light: isDark ? '#9f84fd' : '#3b82f6',
        dark: isDark ? '#5a3de8' : '#1d4ed8',
      },
      secondary: {
        main: '#7c3aed',
      },
      background: {
        default: isDark ? '#0d1117' : '#f4f6fa',
        paper: isDark ? '#161b27' : '#ffffff',
      },
      divider: isDark ? '#2b354f' : '#cbd5e1',
    },
    shape: {
      borderRadius: 6,
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      h5: {
        fontSize: '1.4375rem', // 23px
        fontWeight: 700,
      },
      body1: {
        fontSize: '0.875rem', // 14px
      },
      body2: {
        fontSize: '0.84rem', // ~13.5px
      },
      caption: {
        fontSize: '0.75rem', // 12px
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.8125rem', // 13px
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            height: 40,
            fontSize: '0.8125rem',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            height: 40,
          },
          grouped: {
            borderRadius: 6,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            height: 40,
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.78rem',
            width: 'fit-content',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            height: 40,
            fontSize: '0.875rem',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.84rem',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            borderRadius: 10,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            border: 'none',
            boxShadow: 'none',
            background: 'transparent',
            minHeight: 'unset',
            fontSize: '0.875rem',
            '&:focus, &:focus-visible': {
              outline: 'none !important',
            },
          },
        },
      },
    },
  });
}

function getZoneChipColors(zoneText) {
  const z = String(zoneText || '').toLowerCase();
  if (z.includes('3')) return { bg: '#dcfce7', color: '#15803d' };
  if (z.includes('2')) return { bg: '#e0f2fe', color: '#0369a1' };
  return { bg: '#dbeafe', color: '#1d4ed8' };
}

function getCustomerOrderKey(c) {
  const id = String(c?.customerId || c?.customer_code || c?.customer_id || '').trim().toUpperCase();
  const phone = normalizeMobileNumber(c?.mobile_number || c?.mobileNumber || '');
  return { id, phone };
}

function KpiHeaderCard({
  title,
  value,
  subtitle,
  subtitleColor = 'text.secondary',
  icon,
  accentColor,
  tintColor,
  active = false,
  onClick,
}) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: 2.5,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? alpha(accentColor, active ? 0.18 : 0.1)
            : (tintColor || alpha(accentColor, 0.08)),
        cursor: onClick ? 'pointer' : 'default',
        borderWidth: active ? 2 : 1,
        borderColor: active ? accentColor : alpha(accentColor, 0.22),
        boxShadow: active ? `0 0 0 1px ${alpha(accentColor, 0.2)}` : 'none',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: 2,
              borderColor: accentColor,
            }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 1.75, height: '100%', display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:last-child': { pb: 1.75 } }}>
        <Avatar
          variant="rounded"
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: '10px',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? alpha(accentColor, 0.24) : '#ffffff',
            color: accentColor,
            border: '1px solid',
            borderColor: alpha(accentColor, 0.22),
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
          }}
        >
          {icon}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            color="text.secondary"
            sx={{
              fontSize: '0.74rem',
              fontWeight: 600,
              lineHeight: 1.25,
            }}
            noWrap
          >
            {title}
          </Typography>
          <Typography sx={{ mt: 0.35, lineHeight: 1.15, fontSize: '1.55rem', fontWeight: 800, color: 'text.primary' }} noWrap>
            {value}
          </Typography>
          <Typography
            sx={{ mt: 0.35, fontSize: '0.73rem', fontWeight: 600, lineHeight: 1.25, color: subtitleColor }}
            noWrap
          >
            {subtitle}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function CustomerMUI({
  showToast,
  orders = [],
  currencySymbol = '₹',
  searchQuery = '',
  onSearchChange,
  onCreateOrderForCustomer,
  onOpenOrderInPos,
}) {
  const { t } = useLanguage();
  const themeMode = useWashdoorThemeMode();
  const muiTheme = useMemo(() => buildMuiTheme(themeMode), [themeMode]);

  const [customers, setCustomers] = useState(() => {
    try {
      const cached = localStorage.getItem('washdoor_customers_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery || '');

  // CRM Toolbar Filters & View State
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'Regular Customer' | 'VIP Customer' | 'Corporate'
  const [zoneFilter, setZoneFilter] = useState('all'); // 'all' | zone name
  const [regDateFilter, setRegDateFilter] = useState('all'); // 'all' | '7d' | '30d' | 'month'
  const [vipFilter, setVipFilter] = useState('all'); // 'all' | 'vip_only' | 'regular_only'
  const [gstFilter, setGstFilter] = useState('all'); // 'all' | 'gst_only' | 'individual_only'
  const [duesFilter, setDuesFilter] = useState('all'); // 'all' | 'dues_only'
  const [loadError, setLoadError] = useState('');
  const [duplicateConflict, setDuplicateConflict] = useState(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [unsavedConfirmAction, setUnsavedConfirmAction] = useState(null); // null | { type: 'edit' | 'register' }

  // DataGrid Controlled Pagination (default 5 rows per page matching mockup)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 5 });

  // Customized Columns State & Event Tracking
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_COLUMN_VISIBILITY;
  });
  const [columnsAnchorEl, setColumnsAnchorEl] = useState(null);

  // Selected Customer for Top-to-Bottom Customer 360° Side Panel + Legacy Drawer/Modals
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(null);
  const [is360Open, setIs360Open] = useState(false);
  const [rowMenuState, setRowMenuState] = useState({ anchorEl: null, row: null });
  const [drawerCustomer, setDrawerCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [nextCustId, setNextCustId] = useState('');
  const [prefillData, setPrefillData] = useState(null);
  const [expandedCustIds, setExpandedCustIds] = useState(new Set());
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cards Pagination
  const [cardsPageSize, setCardsPageSize] = useState(6);
  const [cardsPage, setCardsPage] = useState(1);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setQuery(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!editingCustomer && !isRegisteringNew) {
      setHasFormChanges(false);
    }
  }, [editingCustomer, isRegisteringNew]);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const res = await getAllCustomers();
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;

      if (res?.error) {
        const msg = friendlySupabaseError(res.error);
        setLoadError(msg);
        showToast?.(`⚠️ ${msg}`);
      } else if (res?.data && Array.isArray(res.data)) {
        setCustomers(res.data);
        try {
          localStorage.setItem('washdoor_customers_cache', JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      const msg = friendlySupabaseError(err);
      setLoadError(msg);
      showToast?.(`⚠️ ${msg}`);
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset pagination whenever filters or search change
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setCardsPage(1);
  }, [query, statusFilter, typeFilter, zoneFilter, regDateFilter, vipFilter, gstFilter, duesFilter, cardsPageSize]);

  const handleCopyCustomer = useCallback((c) => {
    const name = c.customer_name || c.customerName || 'Customer';
    const id = c.customerId || c.customer_code || c.customer_id || '';
    const phone = formatPhoneDisplay(c.mobile_number || c.mobileNumber);
    const alt = c.alternate_phone || c.alternatePhoneNumber ? formatPhoneDisplay(c.alternate_phone || c.alternatePhoneNumber) : null;
    const email = c.email || c.contactDetails?.email;
    const address = [c.address || c.streetArea, c.city, c.pincode].filter(Boolean).join(', ');
    const company = c.company_name || c.companyName;
    const gst = c.gst_number || c.gstNumber;

    const lines = [
      `*Customer Profile: ${name} (${id})*`,
      `📞 Mobile: ${phone}`,
      alt ? `📞 Alt Phone: ${alt}` : null,
      email ? `✉️ Email: ${email}` : null,
      address ? `📍 Address: ${address}` : null,
      company ? `🏢 Company: ${company}` : null,
      gst ? `🧾 GSTIN: ${gst}` : null,
      c.customer_status ? `Status: ${c.customer_status}` : null,
    ].filter(Boolean).join('\n');

    const copyWithFallback = (text) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      } finally {
        document.body.removeChild(textarea);
      }
      return ok;
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lines).then(() => {
        showToast?.(`Copied ${name}'s details to clipboard!`, 'info');
      }).catch(() => {
        if (copyWithFallback(lines)) {
          showToast?.(`Copied ${name}'s details to clipboard!`, 'info');
        } else {
          showToast?.('⚠️ Unable to copy customer details to clipboard.', 'error');
        }
      });
    } else if (copyWithFallback(lines)) {
      showToast?.(`Copied ${name}'s details to clipboard!`, 'info');
    } else {
      showToast?.('⚠️ Clipboard is unavailable in this browser.', 'error');
    }
  }, [showToast]);

  const handleOpenRegister = async (presetData = null) => {
    setPrefillData(presetData);
    setDuplicateConflict(null);
    setHasFormChanges(false);
    try {
      const nextId = await getNextCustomerId();
      if (nextId) setNextCustId(nextId);
    } catch {}
    setIsRegisteringNew(true);
  };

  const findDuplicateCustomer = useCallback(
    (customerData) => {
      const normMob = normalizeMobileNumber(customerData?.mobile_number || customerData?.mobileNumber || '');
      const normEmail = String(customerData?.email || '').trim().toLowerCase();
      if (!normMob && !normEmail) return null;
      return (
        customers.find((existing) => {
          const existingMob = normalizeMobileNumber(existing.mobile_number || existing.mobileNumber || '');
          const existingEmail = String(existing.email || existing.contactDetails?.email || '').trim().toLowerCase();
          if (normMob && existingMob && normMob === existingMob) return true;
          if (normEmail && existingEmail && normEmail === existingEmail) return true;
          return false;
        }) || null
      );
    },
    [customers]
  );

  const handleOpenRegisterWithNumber = (searchedTerm) => {
    const digitsOnly = String(searchedTerm || '').replace(/\D/g, '');
    const cleanNumber = digitsOnly.length === 12 && digitsOnly.startsWith('91')
      ? digitsOnly.slice(2)
      : digitsOnly.length === 11 && digitsOnly.startsWith('0')
      ? digitsOnly.slice(1)
      : digitsOnly;

    handleOpenRegister(cleanNumber ? { mobile_number: cleanNumber.slice(-10) } : null);
  };

  const handleUpdate = async ({ customerData, existingCustomerId }) => {
    const targetId =
      editingCustomer?.customerId ||
      editingCustomer?.customer_id ||
      editingCustomer?.customer_code ||
      existingCustomerId ||
      customerData?.customer_id;
    setIsSaving(true);
    try {
      const { error } = await updateCustomer(targetId, customerData);
      if (error) {
        showToast?.(`⚠️ ${friendlySupabaseError(error)}`);
        return;
      }
      showToast?.(`✅ Customer ${customerData.customer_name} updated successfully.`);
      setEditingCustomer(null);
      setDrawerCustomer(null);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (target) => {
    const targetObj = target && typeof target === 'object' ? target : null;
    const idToDelete = targetObj
      ? (targetObj.customer_id || targetObj.customerId || targetObj.customer_code || targetObj.id)
      : target;
    if (!idToDelete) {
      setDeleteConfirmTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await deleteCustomer(idToDelete);
      const deletedGridId = targetObj?._gridId;
      const matchesOpen360 = Boolean(
        selectedCustomerKey &&
        (
          (deletedGridId && deletedGridId === selectedCustomerKey) ||
          String(selectedCustomerKey) === String(idToDelete) ||
          (targetObj?.id !== undefined && String(selectedCustomerKey) === String(targetObj.id))
        )
      );

      setDeleteConfirmTarget(null);
      setDrawerCustomer(null);

      if (error) {
        showToast?.(`⚠️ ${friendlySupabaseError(error)}`);
        return;
      }
      if (matchesOpen360) {
        setIs360Open(false);
        setSelectedCustomerKey(null);
      }
      showToast?.(`✅ ${t('customer_deleted_success')}`);
      await loadData();
    } catch (err) {
      showToast?.(`⚠️ ${friendlySupabaseError(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpandCustomer = (id) => {
    if (!id) return;
    setExpandedCustIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAllFilters = useCallback(() => {
    setQuery('');
    onSearchChange?.('');
    setStatusFilter('all');
    setTypeFilter('all');
    setZoneFilter('all');
    setRegDateFilter('all');
    setVipFilter('all');
    setGstFilter('all');
    setDuesFilter('all');
  }, [onSearchChange]);

  const handleColumnVisibilityChange = useCallback((nextModel, sourceLabel = 'Columns updated') => {
    setColumnVisibilityModel(nextModel);
    try {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(nextModel));
    } catch {}
    const visibleCount = CUSTOMIZABLE_COLUMNS.filter((col) => nextModel[col.field] !== false).length;
    showToast?.(`${sourceLabel} (${visibleCount}/${CUSTOMIZABLE_COLUMNS.length} visible)`, 'info');
  }, [showToast]);

  const toggleSingleColumn = (field) => {
    const next = {
      ...columnVisibilityModel,
      [field]: columnVisibilityModel[field] === false,
    };
    const colLabel = CUSTOMIZABLE_COLUMNS.find((c) => c.field === field)?.label || field;
    const verb = next[field] ? 'Shown' : 'Hidden';
    handleColumnVisibilityChange(next, `${verb}: ${colLabel}`);
  };

  // Index live orders by customer_id and mobile_number for Customer 360° & KPI stats
  const ordersIndex = useMemo(() => {
    const byId = new Map();
    const byPhone = new Map();

    const sortedOrders = [...(Array.isArray(orders) ? orders : [])].sort((a, b) => {
      const ta = new Date(a?.created_at || a?.intake_date || 0).getTime() || 0;
      const tb = new Date(b?.created_at || b?.intake_date || 0).getTime() || 0;
      return tb - ta;
    });

    sortedOrders.forEach((ord) => {
      const cid = String(
        ord?.customer_id ||
        ord?.customerId ||
        ord?.customer?.customer_id ||
        ord?.customer?.customerId ||
        ord?.customer?.customer_code ||
        ord?.customer?.id ||
        ''
      ).trim().toUpperCase();
      const phone = normalizeMobileNumber(
        ord?.mobile_number ||
        ord?.mobileNumber ||
        ord?.customer_mobile ||
        ord?.customer?.mobile_number ||
        ord?.customer?.mobileNumber ||
        ''
      );
      if (cid) {
        if (!byId.has(cid)) byId.set(cid, []);
        byId.get(cid).push(ord);
      }
      if (phone) {
        if (!byPhone.has(phone)) byPhone.set(phone, []);
        byPhone.get(phone).push(ord);
      }
    });

    return { byId, byPhone };
  }, [orders]);

  const getCustomerOrdersAndStats = useCallback((c) => {
    const { id, phone } = getCustomerOrderKey(c);
    const idMatches = id ? (ordersIndex.byId.get(id) || []) : [];
    const phoneMatches = phone ? (ordersIndex.byPhone.get(phone) || []) : [];

    const seen = new Set();
    const list = [];
    [...idMatches, ...phoneMatches].forEach((ord, idx) => {
      const key = ord?.work_id || ord?.order_id || ord?.order_number || ord?.id || `ord-${idx}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(ord);
      }
    });

    let lifetimeSpend = 0;
    let outstandingDue = 0;
    list.forEach((ord) => {
      const total = Number(ord?.total_amount || 0);
      const adv = Number(ord?.advance_paid || 0);
      const payStatus = String(ord?.payment_status || '').toLowerCase();
      const due = payStatus === 'paid'
        ? 0
        : Math.max(0, Number(ord?.balance_due ?? (total - adv)));
      lifetimeSpend += total;
      outstandingDue += due;
    });

    return {
      ordersList: list,
      orderCount: list.length,
      lifetimeSpend,
      outstandingDue,
    };
  }, [ordersIndex]);

  const availableZones = useMemo(() => {
    const set = new Set();
    customers.forEach((c) => {
      const z = String(c.service_zone || c.area_service_zone || c.areaServiceZone || 'Zone 1').trim();
      if (z) set.add(z);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const qLower = query.trim().toLowerCase();
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    return customers.filter((c) => {
      const status = String(c.customerStatus || c.customer_status || 'Active').toLowerCase();
      const clsNormalized = normalizeSegmentLabel(c.customer_classification || c.customerClassification);
      const zone = String(c.service_zone || c.area_service_zone || c.areaServiceZone || 'Zone 1').trim();
      const isVip = isVipCustomer(c);
      const isGst = isGstB2BCustomer(c);

      if (statusFilter === 'active' && status === 'inactive') return false;
      if (statusFilter === 'inactive' && status !== 'inactive') return false;

      if (typeFilter !== 'all' && clsNormalized !== typeFilter) return false;
      if (zoneFilter !== 'all' && zone !== zoneFilter) return false;

      if (regDateFilter !== 'all') {
        const createdRaw = c.created_at || c.registered_at;
        const d = createdRaw ? new Date(createdRaw) : null;
        if (!d || Number.isNaN(d.getTime())) return false;
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (regDateFilter === '7d' && diffDays > 7) return false;
        if (regDateFilter === '30d' && diffDays > 30) return false;
        if (regDateFilter === 'month' && (d.getMonth() !== curMonth || d.getFullYear() !== curYear)) return false;
      }

      if (vipFilter === 'vip_only' && !isVip) return false;
      if (vipFilter === 'regular_only' && isVip) return false;

      if (gstFilter === 'gst_only' && !isGst) return false;
      if (gstFilter === 'individual_only' && isGst) return false;

      if (duesFilter === 'dues_only') {
        const stats = getCustomerOrdersAndStats(c);
        if (stats.outstandingDue <= 0) return false;
      }

      if (qLower) {
        const haystack = [
          c.customerId,
          c.customer_id,
          c.customer_code,
          c.customer_name,
          c.customerName,
          c.mobile_number,
          c.mobileNumber,
          c.alternate_phone,
          c.alternatePhoneNumber,
          c.contactDetails?.alternatePhoneNumber,
          c.email,
          c.contactDetails?.email,
          c.address,
          c.streetArea,
          c.street_area,
          c.city,
          c.pincode,
          c.company_name,
          c.companyName,
          c.gst_number,
          c.gstNumber,
          c.membership_id,
          c.membershipId,
          zone,
          clsNormalized,
          formatCleanStaffNotes(c.internal_comments),
          formatCleanStaffNotes(c.notes),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }

      return true;
    });
  }, [customers, query, statusFilter, typeFilter, zoneFilter, regDateFilter, vipFilter, gstFilter, duesFilter, getCustomerOrdersAndStats]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count += 1;
    if (statusFilter !== 'all') count += 1;
    if (typeFilter !== 'all') count += 1;
    if (zoneFilter !== 'all') count += 1;
    if (regDateFilter !== 'all') count += 1;
    if (vipFilter !== 'all') count += 1;
    if (gstFilter !== 'all') count += 1;
    if (duesFilter !== 'all') count += 1;
    return count;
  }, [query, statusFilter, typeFilter, zoneFilter, regDateFilter, vipFilter, gstFilter, duesFilter]);

  const kpiStats = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    let activeCount = 0;
    let b2bCount = 0;
    let vipOrMemberCount = 0;
    let addedThisMonth = 0;
    let vipThisMonth = 0;
    let totalOutstandingDues = 0;
    let duesCustomersCount = 0;

    customers.forEach((c) => {
      const status = String(c.customerStatus || c.customer_status || 'Active').toLowerCase();
      const isVip = isVipCustomer(c);
      if (status !== 'inactive') activeCount += 1;
      if (isGstB2BCustomer(c)) b2bCount += 1;
      if (isVip) vipOrMemberCount += 1;

      const createdRaw = c.created_at || c.registered_at;
      if (createdRaw) {
        const d = new Date(createdRaw);
        if (!Number.isNaN(d.getTime()) && d.getMonth() === curMonth && d.getFullYear() === curYear) {
          addedThisMonth += 1;
          if (isVip) vipThisMonth += 1;
        }
      }

      const stats = getCustomerOrdersAndStats(c);
      if (stats.outstandingDue > 0) {
        totalOutstandingDues += stats.outstandingDue;
        duesCustomersCount += 1;
      }
    });

    const activePct = customers.length > 0 ? Math.round((activeCount / customers.length) * 100) : 0;

    return {
      total: customers.length,
      active: activeCount,
      activePct,
      inactive: Math.max(0, customers.length - activeCount),
      b2b: b2bCount,
      vipOrMember: vipOrMemberCount,
      addedThisMonth,
      vipThisMonth,
      totalOutstandingDues,
      duesCustomersCount,
    };
  }, [customers, getCustomerOrdersAndStats]);

  const gridRows = useMemo(() => {
    return filteredCustomers.map((c, idx) => ({
      ...c,
      _gridId: c.id || c.customer_id || c.customerId || c.mobile_number || `cust-row-${idx}`,
      _orderStats: getCustomerOrdersAndStats(c),
    }));
  }, [filteredCustomers, getCustomerOrdersAndStats]);

  const handleExportCsv = useCallback(() => {
    if (!gridRows.length) {
      showToast?.('⚠️ No customer records match the current filters to export.', 'info');
      return;
    }
    const headers = ['Customer ID', 'Name', 'Mobile', 'Email', 'Customer Type', 'Zone', 'Status', 'Orders', 'Outstanding'];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = gridRows.map((c) => {
      const custId = c.customerId || c.customer_code || c.customer_id || '';
      const name = c.customer_name || c.customerName || '';
      const mobile = formatPhoneDisplay(c.mobile_number || c.mobileNumber || '');
      const email = c.email || c.contactDetails?.email || '';
      const segment = normalizeSegmentLabel(c.customer_classification || c.customerClassification);
      const zone = String(c.service_zone || c.area_service_zone || c.areaServiceZone || 'Zone 1').trim();
      const status = String(c.customerStatus || c.customer_status || 'Active');
      const orderCount = c._orderStats?.orderCount ?? 0;
      const due = c._orderStats?.outstandingDue ?? 0;
      return [custId, name, mobile, email, segment, zone, status, orderCount, due].map(escapeCsv).join(',');
    });
    const csv = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `washdoor_customers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast?.(`✅ Exported ${gridRows.length} customer records to CSV.`);
  }, [gridRows, showToast]);

  // Resolve currently selected row for Customer 360° Side Panel
  const selectedRow = useMemo(() => {
    if (!selectedCustomerKey || gridRows.length === 0) return null;
    return gridRows.find((r) => r._gridId === selectedCustomerKey) || null;
  }, [gridRows, selectedCustomerKey]);

  const activeSelectedKey = selectedRow?._gridId || null;

  const gridColumns = useMemo(() => [
    {
      field: 'customer_id',
      headerName: 'Customer ID',
      width: 126,
      valueGetter: (_, row) => row.customerId || row.customer_code || row.customer_id || row.id || '',
      renderCell: (params) => {
        const custId = params.value || '—';
        return (
          <Chip
            size="small"
            label={custId}
            sx={{
              height: 24,
              borderRadius: '6px',
              bgcolor: alpha(muiTheme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.75rem',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        );
      },
    },
    {
      field: 'customer_name',
      headerName: 'Customer Name',
      flex: 1.05,
      minWidth: 165,
      valueGetter: (_, row) => row.customer_name || row.customerName || 'Customer',
      renderCell: (params) => {
        const name = params.value || 'Customer';
        const palette = getPastelAvatarColors(name);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', minWidth: 0 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: '0.78rem',
                fontWeight: 700,
                bgcolor: palette.bg,
                color: palette.color,
                flexShrink: 0,
              }}
            >
              {name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Tooltip title={name} placement="top-start">
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.3 }} noWrap>
                {name}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'mobile_number',
      headerName: 'Contact',
      flex: 1.1,
      minWidth: 185,
      valueGetter: (_, row) => row.mobile_number || row.mobileNumber || '',
      renderCell: (params) => {
        const c = params.row;
        const mobile = formatPhoneDisplay(c.mobile_number || c.mobileNumber);
        const email = c.email || c.contactDetails?.email;
        const secondary = email || (c.alternate_phone ? formatPhoneDisplay(c.alternate_phone) : 'No email');
        return (
          <Stack spacing={0.25} sx={{ width: '100%', minWidth: 0, justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
              <CallOutlinedIcon sx={{ fontSize: 13.5, color: 'text.secondary', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.25 }} noWrap>
                {mobile || '—'}
              </Typography>
            </Box>
            <Tooltip title={secondary} placement="top-start">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                <MailOutlinedIcon sx={{ fontSize: 13.5, color: 'text.secondary', flexShrink: 0 }} />
                <Typography color="text.secondary" noWrap sx={{ fontSize: '0.75rem', lineHeight: 1.25 }}>
                  {secondary}
                </Typography>
              </Box>
            </Tooltip>
          </Stack>
        );
      },
    },
    {
      field: 'customer_classification',
      headerName: 'Classification',
      width: 130,
      valueGetter: (_, row) => normalizeSegmentLabel(row.customer_classification || row.customerClassification),
      renderCell: (params) => {
        const raw = String(params.value || '').toLowerCase();
        const isVip = raw.includes('vip') || raw.includes('elite');
        const isCorp = raw.includes('corp') || raw.includes('b2b');
        const label = isVip ? 'VIP' : isCorp ? 'Corporate' : 'Regular';
        return (
          <Chip
            size="small"
            icon={
              isVip ? (
                <WorkspacePremiumOutlinedIcon sx={{ fontSize: '14px !important' }} />
              ) : isCorp ? (
                <BusinessOutlinedIcon sx={{ fontSize: '14px !important' }} />
              ) : (
                <PersonOutlinedIcon sx={{ fontSize: '14px !important' }} />
              )
            }
            label={label}
            sx={{
              height: 24,
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: '6px',
              bgcolor: isVip ? '#f3e8ff' : isCorp ? '#dbeafe' : '#f1f5f9',
              color: isVip ? '#7e22ce' : isCorp ? '#1d4ed8' : '#334155',
              '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
            }}
          />
        );
      },
    },
    {
      field: 'address',
      headerName: 'Location / Zone',
      flex: 1.25,
      minWidth: 195,
      valueGetter: (_, row) => [row.address || row.streetArea, row.city, row.pincode].filter(Boolean).join(', '),
      renderCell: (params) => {
        const c = params.row;
        const loc = [c.address || c.streetArea || c.street_area, c.city].filter(Boolean).join(', ');
        const zone = String(c.service_zone || c.area_service_zone || c.areaServiceZone || 'Zone 1').trim();
        const zoneColors = getZoneChipColors(zone);
        return (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.65, width: '100%', minWidth: 0 }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 15, color: 'primary.main', mt: 0.2, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Tooltip title={loc || 'No address saved'} placement="top-start">
                <Typography sx={{ fontSize: '0.79rem', lineHeight: 1.3 }} noWrap>
                  {loc || 'No address saved'}
                </Typography>
              </Tooltip>
              <Chip
                size="small"
                label={zone}
                sx={{
                  mt: 0.3,
                  height: 18,
                  fontSize: '0.67rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  bgcolor: zoneColors.bg,
                  color: zoneColors.color,
                }}
              />
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'orders_count',
      headerName: 'Orders',
      width: 78,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_, row) => row._orderStats?.orderCount ?? 0,
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: 'text.primary' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'customer_status',
      headerName: 'Status',
      width: 94,
      valueGetter: (_, row) => row.customerStatus || row.customer_status || 'Active',
      renderCell: (params) => {
        const raw = String(params.value || 'Active');
        const inactive = raw.toLowerCase() === 'inactive';
        return (
          <Chip
            size="small"
            label={inactive ? t('badge_inactive') : t('badge_active')}
            sx={{
              height: 23,
              fontWeight: 700,
              fontSize: '0.74rem',
              borderRadius: '6px',
              bgcolor: inactive ? alpha(muiTheme.palette.text.secondary, 0.12) : '#dcfce7',
              color: inactive ? 'text.secondary' : '#15803d',
            }}
          />
        );
      },
    },
    {
      field: 'company_name',
      headerName: 'Company / GST',
      flex: 0.85,
      minWidth: 145,
      valueGetter: (_, row) => row.company_name || row.companyName || 'Individual',
      renderCell: (params) => {
        const c = params.row;
        const company = c.company_name || c.companyName;
        const gst = c.gst_number || c.gstNumber;
        return (
          <Stack spacing={0.25} sx={{ width: '100%', minWidth: 0, justifyContent: 'center' }}>
            <Typography fontWeight={company ? 700 : 400} color={company ? 'text.primary' : 'text.secondary'} noWrap sx={{ fontSize: '0.82rem' }}>
              {company || 'Individual'}
            </Typography>
            <Typography color={gst ? 'primary.main' : 'text.secondary'} noWrap sx={{ fontSize: '0.74rem' }}>
              {gst ? `GST: ${gst}` : 'No GSTIN'}
            </Typography>
          </Stack>
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Joined Date',
      width: 130,
      valueGetter: (_, row) => formatRegisteredDate(row.created_at || row.registered_at) || '—',
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.8rem' }} color="text.secondary" noWrap>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'internal_comments',
      headerName: 'Staff Notes',
      flex: 0.9,
      minWidth: 155,
      valueGetter: (_, row) => formatCleanStaffNotes(row.internal_comments) || formatCleanStaffNotes(row.notes) || '—',
      renderCell: (params) => (
        <Tooltip title={params.value} placement="top-start">
          <Typography sx={{ fontSize: '0.8rem' }} color="text.secondary" noWrap>
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 164,
      sortable: false,
      filterable: false,
      disableExport: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const c = params.row;
        const cleanMob = normalizeMobileNumber(c.mobile_number || c.mobileNumber);
        return (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title={t('view_profile_title') || 'View Customer Profile'}>
              <IconButton
                size="small"
                color="primary"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: alpha(muiTheme.palette.primary.main, 0.35),
                  bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
                  '&:hover': {
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.16),
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => {
                  setSelectedCustomerKey(c._gridId);
                  setIs360Open(true);
                }}
                aria-label="View customer 360"
              >
                <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('btn_edit') || 'Edit Customer'}>
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  },
                }}
                onClick={() => setEditingCustomer(c)}
                aria-label="Edit customer"
              >
                <EditOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            {cleanMob ? (
              <Tooltip title="WhatsApp">
                <IconButton
                  size="small"
                  component="a"
                  href={`https://wa.me/91${cleanMob}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp customer"
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid',
                    borderColor: alpha('#16a34a', 0.35),
                    bgcolor: alpha('#16a34a', 0.08),
                    color: '#16a34a',
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="No valid mobile number for WhatsApp">
                <span>
                  <IconButton
                    size="small"
                    disabled
                    aria-label="WhatsApp unavailable"
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <WhatsAppIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip title="More Actions">
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                }}
                onClick={(e) => setRowMenuState({ anchorEl: e.currentTarget, row: c })}
                aria-label="Customer row actions"
              >
                <MoreVertIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ], [muiTheme.palette.primary.main, muiTheme.palette.text.secondary, t]);

  const hasActiveFilters = activeFilterCount > 0;

  const visibleColumnsCount = CUSTOMIZABLE_COLUMNS.filter(
    (col) => columnVisibilityModel[col.field] !== false
  ).length;

  const cardsTotalPages = Math.max(1, Math.ceil(gridRows.length / cardsPageSize));
  const safeCardsPage = Math.min(cardsPage, cardsTotalPages);
  const paginatedCards = gridRows.slice(
    (safeCardsPage - 1) * cardsPageSize,
    safeCardsPage * cardsPageSize
  );

  // Clamp controlled page indices when row count shrinks (e.g. after deletion)
  useEffect(() => {
    const maxGridPage = Math.max(0, Math.ceil(gridRows.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxGridPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxGridPage }));
    }
    if (cardsPage > cardsTotalPages) {
      setCardsPage(cardsTotalPages);
    }
  }, [gridRows.length, paginationModel.page, paginationModel.pageSize, cardsPage, cardsTotalPages]);

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          width: '100%',
          fontFamily: "'Inter', sans-serif",
          '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiSelect-select, & .MuiDataGrid-root, & .MuiDataGrid-columnHeaderTitle, & .MuiDataGrid-cell, & .MuiTablePagination-root': {
            fontFamily: "'Inter', sans-serif",
          },
        }}
      >
        {/* ── 1. Clean Top Header Bar (Matching Mockup) ── */}
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' }, fontWeight: 700, lineHeight: 1.2 }}>
              Customer Reference
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.35, fontSize: '0.84rem' }}>
              Manage customer profiles, contact details, pricing and service history
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              gap: 1,
              flexWrap: 'wrap',
              width: { xs: '100%', md: 'auto' },
              flexShrink: 0,
            }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={(_, next) => {
                if (next) setViewMode(next);
              }}
              aria-label="Customer layout mode"
              sx={{ bgcolor: 'background.paper' }}
            >
              <ToggleButton value="table" aria-label="Data Grid View" sx={{ px: { xs: 1.25, sm: 1.5 } }}>
                <TableRowsOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                Grid
              </ToggleButton>
              <ToggleButton value="cards" aria-label="Cards View" sx={{ px: { xs: 1.25, sm: 1.5 } }}>
                <ViewAgendaOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                Cards
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              sx={{ bgcolor: 'background.paper' }}
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExportCsv}
              disabled={loading || gridRows.length === 0}
            >
              Export CSV
            </Button>

            <Button
              variant="outlined"
              disabled={loading}
              sx={{ bgcolor: 'background.paper' }}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={() => {
                loadData();
                showToast?.(t('syncing_toast'));
              }}
            >
              {loading ? t('syncing') : t('refresh')}
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
              onClick={() => handleOpenRegister(null)}
            >
              {t('register_customer')}
            </Button>
          </Box>
        </Box>

        {/* ── 2. 5 Color-Tinted KPI Cards Row ── */}
        <Box
          sx={{
            mb: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(5, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          <KpiHeaderCard
            title="Total Customers"
            value={kpiStats.total}
            subtitle={hasActiveFilters ? `${filteredCustomers.length} matching` : `+${kpiStats.addedThisMonth} this month`}
            subtitleColor={hasActiveFilters ? 'primary.main' : '#16a34a'}
            icon={<PeopleAltOutlinedIcon />}
            accentColor="#2563eb"
            tintColor="#eff6ff"
            active={false}
            onClick={resetAllFilters}
          />
          <KpiHeaderCard
            title="Active Customers"
            value={kpiStats.active}
            subtitle={`${kpiStats.activePct}% of total`}
            icon={<VerifiedUserOutlinedIcon />}
            accentColor="#16a34a"
            tintColor="#f0fdf4"
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'))}
          />
          <KpiHeaderCard
            title="VIP Customers"
            value={kpiStats.vipOrMember}
            subtitle={kpiStats.vipThisMonth > 0 ? `+${kpiStats.vipThisMonth} new` : 'VIP & Elite'}
            subtitleColor="#16a34a"
            icon={<WorkspacePremiumOutlinedIcon />}
            accentColor="#7c3aed"
            tintColor="#faf5ff"
            active={vipFilter === 'vip_only'}
            onClick={() => setVipFilter((prev) => (prev === 'vip_only' ? 'all' : 'vip_only'))}
          />
          <KpiHeaderCard
            title="B2B / GST"
            value={kpiStats.b2b}
            subtitle="Corporate & GST"
            icon={<StorefrontOutlinedIcon />}
            accentColor="#d97706"
            tintColor="#fffbeb"
            active={gstFilter === 'gst_only'}
            onClick={() => setGstFilter((prev) => (prev === 'gst_only' ? 'all' : 'gst_only'))}
          />
          <KpiHeaderCard
            title="Outstanding Dues"
            value={`${currencySymbol} ${Math.round(kpiStats.totalOutstandingDues).toLocaleString('en-IN')}`}
            subtitle={`${kpiStats.duesCustomersCount} ${kpiStats.duesCustomersCount === 1 ? 'customer' : 'customers'}`}
            icon={<AccountBalanceWalletOutlinedIcon />}
            accentColor="#e11d48"
            tintColor="#fef2f2"
            active={duesFilter === 'dues_only'}
            onClick={() => setDuesFilter((prev) => (prev === 'dues_only' ? 'all' : 'dues_only'))}
          />
        </Box>

        {/* ── 3. Main Split Workspace: Left Directory + Right Customer 360° Panel ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: 'stretch',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Compact Search & Filter Toolbar */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1.75,
                borderRadius: 2.5,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'stretch', md: 'center' },
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder={t('search_cust_placeholder')}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      onSearchChange?.(e.target.value);
                    }}
                    sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: 1 }, minWidth: { sm: 220 } }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: query ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              sx={{ borderRadius: '4px' }}
                              aria-label={t('clear_search')}
                              onClick={() => {
                                setQuery('');
                                onSearchChange?.('');
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      },
                    }}
                  />

                  <FormControl size="small" sx={{ minWidth: 126 }}>
                    <Select
                      value={statusFilter}
                      aria-label="Filter by customer status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                      sx={{ fontSize: '0.84rem' }}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="active">Active Only</MenuItem>
                      <MenuItem value="inactive">Inactive Only</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 132 }}>
                    <Select
                      value={typeFilter}
                      aria-label="Filter by customer type"
                      onChange={(e) => setTypeFilter(e.target.value)}
                      sx={{ fontSize: '0.84rem' }}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="Regular Customer">Regular</MenuItem>
                      <MenuItem value="VIP Customer">VIP</MenuItem>
                      <MenuItem value="Corporate">Corporate</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 124 }}>
                    <Select
                      value={zoneFilter}
                      aria-label="Filter by service zone"
                      onChange={(e) => setZoneFilter(e.target.value)}
                      sx={{ fontSize: '0.84rem' }}
                    >
                      <MenuItem value="all">All Zones</MenuItem>
                      {availableZones.map((z) => (
                        <MenuItem key={z} value={z}>
                          {z}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 132 }}>
                    <Select
                      value={regDateFilter}
                      aria-label="Filter by registration date"
                      onChange={(e) => setRegDateFilter(e.target.value)}
                      sx={{ fontSize: '0.84rem' }}
                    >
                      <MenuItem value="all">All Dates</MenuItem>
                      <MenuItem value="7d">Last 7 Days</MenuItem>
                      <MenuItem value="30d">Last 30 Days</MenuItem>
                      <MenuItem value="month">This Month</MenuItem>
                    </Select>
                  </FormControl>

                  {viewMode === 'table' && (
                    <Button
                      variant="outlined"
                      startIcon={<ViewColumnOutlinedIcon fontSize="small" />}
                      onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
                    >
                      Columns ({visibleColumnsCount}/{CUSTOMIZABLE_COLUMNS.length})
                    </Button>
                  )}

                  {Boolean(isMobileNumberQuery(query) && filteredCustomers.length === 0 && !loading) && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAddAlt1OutlinedIcon />}
                      onClick={() => handleOpenRegisterWithNumber(query.trim())}
                    >
                      {t('register_customer')}
                    </Button>
                  )}

                  {hasActiveFilters && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<RestartAltIcon fontSize="small" />}
                      onClick={resetAllFilters}
                    >
                      Clear ({activeFilterCount})
                    </Button>
                  )}
                </Box>
              </Box>

              {loading && (
                <LinearProgress
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 3,
                  }}
                />
              )}
            </Paper>

            {loadError && (
              <Alert
                severity="error"
                sx={{ mb: 1.75, borderRadius: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={loadData}>
                    Retry
                  </Button>
                }
              >
                {loadError}
              </Alert>
            )}

        {/* ── Customize Columns Popover ── */}
        <Popover
          open={Boolean(columnsAnchorEl)}
          anchorEl={columnsAnchorEl}
          onClose={() => setColumnsAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: { p: 2, width: 270, borderRadius: 2, border: '1px solid', borderColor: 'divider' },
            },
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Customize Table Columns
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <FormGroup>
            {CUSTOMIZABLE_COLUMNS.map((col) => (
              <FormControlLabel
                key={col.field}
                control={
                  <Checkbox
                    size="small"
                    checked={columnVisibilityModel[col.field] !== false}
                    disabled={Boolean(col.locked)}
                    onChange={() => toggleSingleColumn(col.field)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: col.locked ? 700 : 500 }}>
                    {col.label}{col.locked ? ' (Required)' : ''}
                  </Typography>
                }
              />
            ))}
          </FormGroup>
          <Divider sx={{ my: 1.25 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              sx={{ height: 34 }}
              onClick={() => {
                const allVisible = CUSTOMIZABLE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.field]: true }), {});
                handleColumnVisibilityChange(allVisible, 'All columns enabled');
              }}
            >
              Show All
            </Button>
            <Button
              size="small"
              variant="text"
              sx={{ height: 34 }}
              onClick={() => handleColumnVisibilityChange(DEFAULT_COLUMN_VISIBILITY, 'Default columns restored')}
            >
              Reset Default
            </Button>
          </Box>
        </Popover>

        {/* ── 4. Customer Directory Content Area ── */}
        {loading && customers.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Stack spacing={1.5}>
              {[1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} variant="rounded" height={58} />
              ))}
            </Stack>
          </Paper>
        ) : filteredCustomers.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: 2.5,
              textAlign: 'center',
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                borderRadius: 2,
                bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
                color: 'primary.main',
              }}
            >
              <PersonSearchOutlinedIcon fontSize="large" />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              {t('no_customers_found')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2.5, maxWidth: 460, mx: 'auto' }}>
              {t('no_customers_subtitle')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              {hasActiveFilters && (
                <Button variant="outlined" onClick={resetAllFilters}>
                  Clear All Filters
                </Button>
              )}
              {isMobileNumberQuery(query) ? (
                <Button
                  variant="contained"
                  startIcon={<PersonAddAlt1OutlinedIcon />}
                  onClick={() => handleOpenRegisterWithNumber(query.trim())}
                >
                  Register {query.trim()}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenRegister(null)}
                >
                  {t('register_customer')}
                </Button>
              )}
            </Box>
          </Paper>
        ) : viewMode === 'table' ? (() => {
          const totalGridPages = Math.max(1, Math.ceil(gridRows.length / paginationModel.pageSize));
          const safeGridPage = Math.min(paginationModel.page, totalGridPages - 1);
          const startItem = gridRows.length === 0 ? 0 : safeGridPage * paginationModel.pageSize + 1;
          const endItem = Math.min((safeGridPage + 1) * paginationModel.pageSize, gridRows.length);

          return (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              width: '100%',
              borderColor: 'divider',
            }}
          >
            <DataGrid
              rows={gridRows}
              columns={gridColumns}
              getRowId={(row) => row._gridId}
              getRowClassName={(params) => (params.id === activeSelectedKey ? 'washdoor-selected-row' : '')}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) =>
                handleColumnVisibilityChange(newModel, 'Columns updated')
              }
              loading={loading && customers.length === 0}
              rowHeight={68}
              columnHeaderHeight={46}
              checkboxSelection
              disableRowSelectionOnClick
              hideFooter
              pagination
              paginationModel={{ ...paginationModel, page: safeGridPage }}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 20, 50, 100]}
              onRowClick={(params) => {
                setSelectedCustomerKey(params.row._gridId);
                setIs360Open(true);
              }}
              sx={{
                border: 0,
                width: '100%',
                minHeight: 380,
                fontSize: '0.84rem',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: themeMode === 'dark' ? '#1c2436' : '#f8fafc',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                },
                '& .MuiDataGrid-columnSeparator': {
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                },
                '& .MuiDataGrid-columnHeader:hover .MuiDataGrid-columnSeparator': {
                  opacity: 0.45,
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  fontSize: '0.78rem',
                },
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.05),
                  },
                },
                '& .washdoor-selected-row': {
                  bgcolor: `${alpha(muiTheme.palette.primary.main, themeMode === 'dark' ? 0.18 : 0.08)} !important`,
                },
                '& .MuiDataGrid-cell': {
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: '1.35 !important',
                  py: 0.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                  outline: 'none',
                },
              }}
            />

            {/* Custom Pagination Footer */}
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'space-between' },
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>
                Showing {startItem}–{endItem} of {gridRows.length} customers • Page {safeGridPage + 1} of {totalGridPages}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    Rows per page:
                  </Typography>
                  <Select
                    size="small"
                    aria-label="Grid rows per page"
                    value={paginationModel.pageSize}
                    onChange={(e) => setPaginationModel({ page: 0, pageSize: Number(e.target.value) })}
                    sx={{ height: 32, minWidth: 68, fontSize: '0.8rem' }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </Box>

                <Pagination
                  count={totalGridPages}
                  page={safeGridPage + 1}
                  onChange={(_, p) => setPaginationModel((prev) => ({ ...prev, page: p - 1 }))}
                  color="primary"
                  size="small"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </Box>
          </Paper>
          );
        })() : (
          <Box>
            <Grid container spacing={2}>
              {paginatedCards.map((c) => {
                const custId = c.customerId || c.customer_code || c.customer_id || c.id || '';
                const cardKey = c._gridId;
                const cleanMob = normalizeMobileNumber(c.mobile_number || c.mobileNumber);
                const name = c.customer_name || c.customerName || 'Customer';
                const status = c.customerStatus || c.customer_status || 'Active';
                const isInactive = String(status).toLowerCase() === 'inactive';
                const isExpanded = expandedCustIds.has(cardKey);
                const loc = [c.address || c.streetArea || c.street_area, c.city, c.pincode].filter(Boolean).join(', ');
                const regDate = formatRegisteredDate(c.created_at || c.registered_at);
                const staffNotes = formatCleanStaffNotes(c.internal_comments) || formatCleanStaffNotes(c.notes);

                return (
                  <Grid key={cardKey} size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                      <CardContent sx={{ p: 2.25 }}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Avatar
                            variant="rounded"
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '6px',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {name.slice(0, 2).toUpperCase()}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Typography sx={{ fontSize: '0.96rem', fontWeight: 700 }} noWrap>
                                {name}
                              </Typography>
                              {custId && (
                                <Chip
                                  size="small"
                                  label={custId}
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 22, borderRadius: '4px' }}
                                />
                              )}
                              <Chip
                                size="small"
                                label={isInactive ? t('badge_inactive') : t('badge_active')}
                                color={isInactive ? 'default' : 'success'}
                                variant="outlined"
                                sx={{ height: 22, borderRadius: '4px' }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.75 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <PhoneOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary">
                                  {formatPhoneDisplay(c.mobile_number || c.mobileNumber) || '—'}
                                </Typography>
                              </Box>
                              {c.email && (
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                  <EmailOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                  <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary" noWrap>
                                    {c.email}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                              <LocationOnOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                              <Tooltip title={loc || 'No address'}>
                                <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary" noWrap>
                                  {loc || 'No address'}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Box>

                        <Collapse in={isExpanded} unmountOnExit>
                          <Divider sx={{ my: 1.5 }} />
                          <Stack spacing={0.75}>
                            <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary">
                              <strong>Segment:</strong> {normalizeSegmentLabel(c.customer_classification)} •{' '}
                              <strong>Price List:</strong> {c.price_list || 'Standard'}
                            </Typography>
                            {(c.company_name || c.gst_number) && (
                              <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary">
                                <strong>Company:</strong> {c.company_name || '—'} {c.gst_number ? `(GST: ${c.gst_number})` : ''}
                              </Typography>
                            )}
                            {regDate && (
                              <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary">
                                <strong>Joined:</strong> {regDate}
                              </Typography>
                            )}
                            {staffNotes && (
                              <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary">
                                <strong>Staff Notes:</strong> {staffNotes}
                              </Typography>
                            )}
                          </Stack>
                        </Collapse>

                        <Divider sx={{ my: 1.5 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ height: 34 }}
                              startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                              onClick={() => {
                                setSelectedCustomerKey(c._gridId);
                                setIs360Open(true);
                              }}
                            >
                              View 360°
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              sx={{ height: 34 }}
                              endIcon={
                                <ExpandMoreIcon
                                  fontSize="small"
                                  sx={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                  }}
                                />
                              }
                              onClick={() => toggleExpandCustomer(cardKey)}
                            >
                              {isExpanded ? 'Less' : 'Quick Info'}
                            </Button>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            {cleanMob ? (
                              <Tooltip title="WhatsApp">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={`https://wa.me/91${cleanMob}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="WhatsApp customer"
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '6px',
                                    border: '1px solid',
                                    borderColor: alpha('#16a34a', 0.35),
                                    bgcolor: alpha('#16a34a', 0.08),
                                    color: '#16a34a',
                                  }}
                                >
                                  <WhatsAppIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="No valid mobile number for WhatsApp">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled
                                    aria-label="WhatsApp unavailable"
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '6px',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <WhatsAppIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip title="Copy details">
                              <IconButton
                                size="small"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'background.paper',
                                }}
                                onClick={() => handleCopyCustomer(c)}
                                aria-label="Copy customer details"
                              >
                                <ContentCopyOutlinedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('btn_edit') || 'Edit'}>
                              <IconButton
                                size="small"
                                color="primary"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  borderColor: alpha(muiTheme.palette.primary.main, 0.35),
                                  bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
                                }}
                                onClick={() => setEditingCustomer(c)}
                                aria-label="Edit customer"
                              >
                                <EditOutlinedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('btn_delete') || 'Delete'}>
                              <IconButton
                                size="small"
                                color="error"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  borderColor: alpha(muiTheme.palette.error.main, 0.35),
                                  bgcolor: alpha(muiTheme.palette.error.main, 0.08),
                                }}
                                onClick={() => setDeleteConfirmTarget(c)}
                                aria-label="Delete customer"
                              >
                                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="More Actions">
                              <IconButton
                                size="small"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'background.paper',
                                  color: 'text.secondary',
                                }}
                                onClick={(e) => setRowMenuState({ anchorEl: e.currentTarget, row: c })}
                                aria-label="Customer card actions"
                              >
                                <MoreVertIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* ── Cards Pagination Footer ── */}
            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 1.5,
                px: 2,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary" fontWeight={600}>
                Showing {gridRows.length === 0 ? 0 : (safeCardsPage - 1) * cardsPageSize + 1}–
                {Math.min(safeCardsPage * cardsPageSize, gridRows.length)} of {gridRows.length} customers • Page {safeCardsPage} of {cardsTotalPages}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 96 }}>
                  <InputLabel id="cards-page-size-lbl">Show</InputLabel>
                  <Select
                    labelId="cards-page-size-lbl"
                    label="Show"
                    value={cardsPageSize}
                    onChange={(e) => {
                      setCardsPageSize(Number(e.target.value));
                      setCardsPage(1);
                    }}
                  >
                    <MenuItem value={6}>6</MenuItem>
                    <MenuItem value={12}>12</MenuItem>
                    <MenuItem value={24}>24</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>

                <Pagination
                  count={cardsTotalPages}
                  page={safeCardsPage}
                  onChange={(_, p) => setCardsPage(p)}
                  color="primary"
                  size="small"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </Paper>
          </Box>
        )}
          </Box>
        </Box>

        {/* Top-to-Bottom Side Panel Drawer for Customer 360° (Opens when View button is pressed) */}
        <Drawer
          anchor="right"
          open={is360Open && Boolean(selectedRow)}
          onClose={() => setIs360Open(false)}
          slotProps={{
            paper: {
              sx: {
                width: { xs: '100%', sm: 440, md: 460 },
                height: '100vh',
                maxHeight: '100vh',
                borderRadius: 0,
                p: 0,
                boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.16)',
              },
            },
          }}
        >
          {selectedRow && (
            <Customer360Panel
              inDrawer
              customer={selectedRow}
              customerOrders={selectedRow._orderStats?.ordersList || []}
              orderStats={selectedRow._orderStats || { orderCount: 0, lifetimeSpend: 0, outstandingDue: 0 }}
              currencySymbol={currencySymbol}
              onClose={() => setIs360Open(false)}
              onEdit={(c) => {
                setIs360Open(false);
                setEditingCustomer(c);
              }}
              onViewFullProfile={(c) => {
                setIs360Open(false);
                setDrawerCustomer(c);
              }}
              onCreateOrder={onCreateOrderForCustomer ? (c) => {
                setIs360Open(false);
                onCreateOrderForCustomer(c);
              } : undefined}
              onOpenOrder={onOpenOrderInPos ? (ord) => {
                setIs360Open(false);
                onOpenOrderInPos(ord);
              } : undefined}
              onDelete={(c) => setDeleteConfirmTarget(c)}
              onCopy={handleCopyCustomer}
              t={t}
            />
          )}
        </Drawer>

        {/* Row Actions Menu */}
        <Menu
          anchorEl={rowMenuState.anchorEl}
          open={Boolean(rowMenuState.anchorEl)}
          onClose={() => setRowMenuState({ anchorEl: null, row: null })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              const target = rowMenuState.row;
              setRowMenuState({ anchorEl: null, row: null });
              if (target) {
                setSelectedCustomerKey(target._gridId);
                setIs360Open(true);
              }
            }}
          >
            <ListItemIcon>
              <VisibilityOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open Customer 360°</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              const target = rowMenuState.row;
              setRowMenuState({ anchorEl: null, row: null });
              if (target) setDrawerCustomer(target);
            }}
          >
            <ListItemIcon>
              <PersonSearchOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Full Profile Details</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              const target = rowMenuState.row;
              setRowMenuState({ anchorEl: null, row: null });
              if (target) setEditingCustomer(target);
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('btn_edit') || 'Edit Customer'}</ListItemText>
          </MenuItem>
          {(() => {
            const mob = normalizeMobileNumber(rowMenuState.row?.mobile_number || rowMenuState.row?.mobileNumber);
            return (
              <MenuItem
                component={mob ? 'a' : 'li'}
                href={mob ? `https://wa.me/91${mob}` : undefined}
                target={mob ? '_blank' : undefined}
                rel={mob ? 'noopener noreferrer' : undefined}
                disabled={!mob}
                onClick={() => setRowMenuState({ anchorEl: null, row: null })}
              >
                <ListItemIcon sx={{ color: mob ? '#16a34a' : undefined }}>
                  <WhatsAppIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>WhatsApp Chat</ListItemText>
              </MenuItem>
            );
          })()}
          <MenuItem
            onClick={() => {
              const target = rowMenuState.row;
              setRowMenuState({ anchorEl: null, row: null });
              if (target) handleCopyCustomer(target);
            }}
          >
            <ListItemIcon>
              <ContentCopyOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copy Details</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            sx={{ color: 'error.main' }}
            onClick={() => {
              const target = rowMenuState.row;
              setRowMenuState({ anchorEl: null, row: null });
              if (target) setDeleteConfirmTarget(target);
            }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('btn_delete') || 'Delete'}</ListItemText>
          </MenuItem>
        </Menu>

        {/* ── Slide-Over Customer Detail Drawer ── */}
        <CustomerDetailDrawer
          customer={drawerCustomer}
          open={Boolean(drawerCustomer)}
          onClose={() => setDrawerCustomer(null)}
          onCopy={handleCopyCustomer}
          onEdit={(c) => {
            setDrawerCustomer(null);
            setEditingCustomer(c);
          }}
          onDelete={(c) => setDeleteConfirmTarget(c)}
          t={t}
        />

        {/* ── Edit Customer MUI Dialog ── */}
        <Dialog
          open={Boolean(editingCustomer)}
          onClose={() => {
            if (isSaving) return;
            if (hasFormChanges) {
              setUnsavedConfirmAction({ type: 'edit' });
              return;
            }
            setEditingCustomer(null);
          }}
          maxWidth="md"
          fullWidth
          scroll="paper"
          sx={{
            '& .MuiDialog-paper': {
              m: { xs: 1, sm: 3 },
              width: { xs: 'calc(100% - 16px)', sm: '100%' },
              maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            },
          }}
        >
          {editingCustomer && (
            <>
              <DialogTitle sx={{ pb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
                    <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', color: '#fff', width: 38, height: 38, borderRadius: '6px' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" fontWeight={700}>
                        Edit Customer Record
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label={
                            editingCustomer.customerId ||
                            editingCustomer.customer_id ||
                            `CUST-${String(editingCustomer.id).padStart(5, '0')}`
                          }
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px' }}
                        />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {editingCustomer.customer_name || editingCustomer.customerName}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton onClick={() => !isSaving && setEditingCustomer(null)} disabled={isSaving} aria-label="Close">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent
                dividers
                sx={{ p: { xs: 2, sm: 3 } }}
                onInputCapture={() => setHasFormChanges(true)}
                onChangeCapture={() => setHasFormChanges(true)}
              >
                <CustomerForm
                  initialCustomer={editingCustomer}
                  customerId={
                    editingCustomer.customerId ||
                    editingCustomer.customer_id ||
                    `CUST-${String(editingCustomer.id).padStart(5, '0')}`
                  }
                  isOrderFlow={false}
                  isSubmitting={isSaving}
                  submitLabel={isSaving ? 'Updating...' : 'Update Customer Record'}
                  onBack={() => {
                    if (isSaving) return;
                    if (hasFormChanges) {
                      setUnsavedConfirmAction({ type: 'edit' });
                      return;
                    }
                    setEditingCustomer(null);
                  }}
                  onSubmit={async (payload) => {
                    setHasFormChanges(false);
                    await handleUpdate(payload);
                  }}
                />
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* ── Register New Customer MUI Dialog ── */}
        <Dialog
          open={isRegisteringNew}
          onClose={() => {
            if (isSaving) return;
            if (hasFormChanges) {
              setUnsavedConfirmAction({ type: 'register' });
              return;
            }
            setIsRegisteringNew(false);
            setPrefillData(null);
            setDuplicateConflict(null);
          }}
          maxWidth="md"
          fullWidth
          scroll="paper"
          sx={{
            '& .MuiDialog-paper': {
              m: { xs: 1, sm: 3 },
              width: { xs: 'calc(100% - 16px)', sm: '100%' },
              maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', color: '#fff', width: 38, height: 38, borderRadius: '6px' }}>
                  <PersonAddAlt1OutlinedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Register New Customer
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {nextCustId && (
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={nextCustId}
                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px' }}
                      />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Register new customer profile &amp; master account
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <IconButton
                onClick={() => {
                  if (isSaving) return;
                  if (hasFormChanges) {
                    setUnsavedConfirmAction({ type: 'register' });
                    return;
                  }
                  setIsRegisteringNew(false);
                  setPrefillData(null);
                  setDuplicateConflict(null);
                }}
                disabled={isSaving}
                aria-label="Close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{ p: { xs: 2, sm: 3 } }}
            onInputCapture={() => setHasFormChanges(true)}
            onChangeCapture={() => setHasFormChanges(true)}
          >
            {duplicateConflict && (
              <Alert
                severity="warning"
                sx={{ mb: 2, borderRadius: 2 }}
                action={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        const existing = duplicateConflict;
                        setDuplicateConflict(null);
                        setHasFormChanges(false);
                        setIsRegisteringNew(false);
                        setPrefillData(null);
                        const matchKey =
                          existing.id ||
                          existing.customer_id ||
                          existing.customerId ||
                          existing.mobile_number;
                        if (matchKey) {
                          setSelectedCustomerKey(matchKey);
                          setIs360Open(true);
                        }
                      }}
                    >
                      View Existing
                    </Button>
                    <Button size="small" color="inherit" onClick={() => setDuplicateConflict(null)}>
                      Dismiss
                    </Button>
                  </Box>
                }
              >
                A customer with this mobile number or email already exists:{' '}
                <strong>
                  {duplicateConflict.customer_name || duplicateConflict.customerName} (
                  {duplicateConflict.customerId || duplicateConflict.customer_code || duplicateConflict.customer_id})
                </strong>
                .
              </Alert>
            )}
            <CustomerForm
              initialCustomer={prefillData}
              customerId={nextCustId}
              isOrderFlow={false}
              isSubmitting={isSaving}
              submitLabel={isSaving ? 'Registering...' : 'Register Customer'}
              onBack={() => {
                if (isSaving) return;
                if (hasFormChanges) {
                  setUnsavedConfirmAction({ type: 'register' });
                  return;
                }
                setIsRegisteringNew(false);
                setPrefillData(null);
                setDuplicateConflict(null);
              }}
              onSubmit={async ({ customerData }) => {
                const dup = findDuplicateCustomer(customerData);
                if (dup) {
                  setDuplicateConflict(dup);
                  showToast?.('⚠️ Duplicate mobile number or email detected.');
                  return;
                }
                setDuplicateConflict(null);
                setHasFormChanges(false);
                setIsSaving(true);
                try {
                  const res = await createCustomer({
                    ...customerData,
                    customer_id: nextCustId,
                  });
                  if (res.error) {
                    showToast?.(`⚠️ ${friendlySupabaseError(res.error)}`);
                    return;
                  }
                  const assignedId = res.data?.id || res.data?.customerId || nextCustId;
                  showToast?.(`✅ Customer ${customerData.customer_name} registered successfully with ID ${assignedId}!`);
                  setIsRegisteringNew(false);
                  setPrefillData(null);
                  await loadData();
                } finally {
                  setIsSaving(false);
                }
              }}
            />
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation MUI Dialog ── */}
        <Dialog
          open={Boolean(deleteConfirmTarget)}
          onClose={() => !isDeleting && setDeleteConfirmTarget(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <WarningAmberRoundedIcon color="error" />
              <Typography variant="h6" fontWeight={700}>
                {t('delete_confirm_title')}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {t('delete_confirm_msg')}{' '}
              <strong>{deleteConfirmTarget?.customer_name || deleteConfirmTarget?.customerName}</strong>{' '}
              ({formatPhoneDisplay(deleteConfirmTarget?.mobile_number || deleteConfirmTarget?.mobileNumber)})?
            </Typography>
            <Alert severity="warning" variant="outlined">
              {t('delete_confirm_warning')}
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setDeleteConfirmTarget(null)}
              disabled={isDeleting}
            >
              {t('btn_cancel')}
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlinedIcon />}
              onClick={() => handleDelete(deleteConfirmTarget)}
            >
              {isDeleting ? t('btn_deleting') : t('btn_confirm_delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Unsaved Changes Confirmation Dialog ── */}
        <Dialog
          open={Boolean(unsavedConfirmAction)}
          onClose={() => setUnsavedConfirmAction(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Discard Unsaved Changes?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              You have unsaved modifications in this customer form. Are you sure you want to close without saving?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="outlined" onClick={() => setUnsavedConfirmAction(null)}>
              Keep Editing
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                const actionType = unsavedConfirmAction?.type;
                setUnsavedConfirmAction(null);
                setHasFormChanges(false);
                if (actionType === 'edit') {
                  setEditingCustomer(null);
                } else if (actionType === 'register') {
                  setIsRegisteringNew(false);
                  setPrefillData(null);
                  setDuplicateConflict(null);
                }
              }}
            >
              Discard Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
