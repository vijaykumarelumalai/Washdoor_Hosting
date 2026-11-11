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
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
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
import {
  friendlySupabaseError,
  formatPhoneDisplay,
  isMobileNumberQuery,
} from '../utils/validation';
import { useLanguage } from '../context/LanguageContext';

const COLUMN_VISIBILITY_STORAGE_KEY = 'washdoor_customer_mui_columns_v1';

const DEFAULT_COLUMN_VISIBILITY = {
  customer_id: true,
  customer_name: true,
  mobile_number: true,
  address: true,
  customer_classification: true,
  company_name: true,
  customer_status: true,
  created_at: false,
  internal_comments: false,
  actions: true,
};

const CUSTOMIZABLE_COLUMNS = [
  { field: 'customer_id', label: 'Customer ID', locked: true },
  { field: 'customer_name', label: 'Customer Name', locked: true },
  { field: 'mobile_number', label: 'Contact' },
  { field: 'address', label: 'Location' },
  { field: 'customer_classification', label: 'Segment & Price List' },
  { field: 'company_name', label: 'Company / GST' },
  { field: 'customer_status', label: 'Status' },
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

function KpiHeaderCard({ title, value, subtitle, icon, accentColor, active = false, onClick }) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: 2,
        bgcolor: 'background.paper',
        cursor: onClick ? 'pointer' : 'default',
        borderWidth: active ? 2 : 1,
        borderColor: active ? accentColor : 'divider',
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
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Typography>
              {active && (
                <Chip
                  size="small"
                  label="Active"
                  sx={{
                    height: 18,
                    fontSize: '0.68rem',
                    bgcolor: alpha(accentColor, 0.14),
                    color: accentColor,
                    borderRadius: '4px',
                  }}
                />
              )}
            </Box>
            <Typography sx={{ mt: 0.75, lineHeight: 1.1, fontSize: '1.875rem', fontWeight: 800, color: 'text.primary' }}>
              {value}
            </Typography>
          </Box>

          <Avatar
            variant="rounded"
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '6px',
              bgcolor: alpha(accentColor, 0.12),
              color: accentColor,
            }}
          >
            {icon}
          </Avatar>
        </Box>

        <Typography
          color="text.secondary"
          sx={{ mt: 1, fontSize: '0.78rem', lineHeight: 1.3 }}
          noWrap
        >
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function CustomerMUI({ showToast, searchQuery = '', onSearchChange }) {
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
  const [vipFilter, setVipFilter] = useState('all'); // 'all' | 'vip_only' | 'regular_only'
  const [gstFilter, setGstFilter] = useState('all'); // 'all' | 'gst_only' | 'individual_only'

  // DataGrid Controlled Pagination
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

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

  // Drawer, Modal & Card Expand State
  const [drawerCustomer, setDrawerCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [nextCustId, setNextCustId] = useState('');
  const [prefillData, setPrefillData] = useState(null);
  const [expandedCustIds, setExpandedCustIds] = useState(new Set());
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await getAllCustomers();
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;

      if (res?.error) {
        showToast?.(`⚠️ ${friendlySupabaseError(res.error)}`);
      } else if (res?.data && Array.isArray(res.data)) {
        setCustomers(res.data);
        try {
          localStorage.setItem('washdoor_customers_cache', JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      showToast?.(`⚠️ ${friendlySupabaseError(err)}`);
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
  }, [query, statusFilter, vipFilter, gstFilter, cardsPageSize]);

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

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lines).then(() => {
        showToast?.(`Copied ${name}'s details to clipboard!`, 'info');
      }).catch(() => {});
    }
  }, [showToast]);

  const handleOpenRegister = async (presetData = null) => {
    setPrefillData(presetData);
    try {
      const nextId = await getNextCustomerId();
      if (nextId) setNextCustId(nextId);
    } catch {}
    setIsRegisteringNew(true);
  };

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
    const targetId = existingCustomerId || editingCustomer?.customerId || editingCustomer?.customer_id || customerData?.customer_id;
    const { error } = await updateCustomer(targetId, customerData);
    if (error) {
      showToast?.(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }
    showToast?.(`✅ Customer ${customerData.customer_name} updated successfully.`);
    setEditingCustomer(null);
    setDrawerCustomer(null);
    loadData();
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    const { error } = await deleteCustomer(id);
    setIsDeleting(false);
    setDeleteConfirmTarget(null);
    setDrawerCustomer(null);

    if (error) {
      showToast?.(`⚠️ ${friendlySupabaseError(error)}`);
      return;
    }
    showToast?.(`✅ ${t('customer_deleted_success')}`);
    loadData();
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
    setVipFilter('all');
    setGstFilter('all');
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

  const filteredCustomers = useMemo(() => {
    const qLower = query.trim().toLowerCase();
    return customers.filter((c) => {
      const status = String(c.customerStatus || c.customer_status || 'Active').toLowerCase();
      const clsNormalized = normalizeSegmentLabel(c.customer_classification || c.customerClassification);
      const zone = String(c.service_zone || c.area_service_zone || c.areaServiceZone || 'Zone 1').trim();
      const isVip = isVipCustomer(c);
      const isGst = isGstB2BCustomer(c);

      if (statusFilter === 'active' && status === 'inactive') return false;
      if (statusFilter === 'inactive' && status !== 'inactive') return false;

      if (vipFilter === 'vip_only' && !isVip) return false;
      if (vipFilter === 'regular_only' && isVip) return false;

      if (gstFilter === 'gst_only' && !isGst) return false;
      if (gstFilter === 'individual_only' && isGst) return false;

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
          c.email,
          c.address,
          c.streetArea,
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
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }

      return true;
    });
  }, [customers, query, statusFilter, vipFilter, gstFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count += 1;
    if (statusFilter !== 'all') count += 1;
    if (vipFilter !== 'all') count += 1;
    if (gstFilter !== 'all') count += 1;
    return count;
  }, [query, statusFilter, vipFilter, gstFilter]);

  const kpiStats = useMemo(() => {
    let activeCount = 0;
    let b2bCount = 0;
    let vipOrMemberCount = 0;

    customers.forEach((c) => {
      const status = String(c.customerStatus || c.customer_status || 'Active').toLowerCase();
      if (status !== 'inactive') activeCount += 1;
      if (isGstB2BCustomer(c)) b2bCount += 1;
      if (isVipCustomer(c)) vipOrMemberCount += 1;
    });

    return {
      total: customers.length,
      active: activeCount,
      inactive: Math.max(0, customers.length - activeCount),
      b2b: b2bCount,
      vipOrMember: vipOrMemberCount,
    };
  }, [customers]);

  const gridRows = useMemo(() => {
    return filteredCustomers.map((c, idx) => ({
      ...c,
      _gridId: c.id || c.customer_id || c.customerId || c.mobile_number || `cust-row-${idx}`,
    }));
  }, [filteredCustomers]);

  const gridColumns = useMemo(() => [
    {
      field: 'customer_id',
      headerName: 'Customer ID',
      width: 122,
      valueGetter: (_, row) => row.customerId || row.customer_code || row.customer_id || row.id || '',
      renderCell: (params) => {
        const custId = params.value || '—';
        return (
          <Box
            sx={{
              px: 1,
              py: 0.4,
              borderRadius: '5px',
              border: '1px solid',
              borderColor: 'primary.main',
              bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.82rem',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
            }}
          >
            {custId}
          </Box>
        );
      },
    },
    {
      field: 'customer_name',
      headerName: 'Customer Name',
      flex: 1.05,
      minWidth: 175,
      valueGetter: (_, row) => row.customer_name || row.customerName || 'Customer',
      renderCell: (params) => {
        const c = params.row;
        const name = params.value || 'Customer';
        const memberId = c.membershipId || c.membership_id;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', minWidth: 0 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Tooltip title={name} placement="top-start">
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.35 }} noWrap>
                  {name}
                </Typography>
              </Tooltip>
              {memberId && (
                <Chip
                  label={`Member: ${memberId}`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ height: 20, mt: 0.25, fontSize: '0.72rem', borderRadius: '4px' }}
                />
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'mobile_number',
      headerName: 'Contact',
      flex: 1.0,
      minWidth: 165,
      valueGetter: (_, row) => row.mobile_number || row.mobileNumber || '',
      renderCell: (params) => {
        const c = params.row;
        const mobile = formatPhoneDisplay(c.mobile_number || c.mobileNumber);
        const email = c.email || c.contactDetails?.email;
        const secondary = email || (c.alternate_phone ? `Alt: ${formatPhoneDisplay(c.alternate_phone)}` : 'No email');
        return (
          <Stack spacing={0.25} sx={{ width: '100%', minWidth: 0, justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.35 }} noWrap>
              {mobile || '—'}
            </Typography>
            <Tooltip title={secondary} placement="top-start">
              <Typography color="text.secondary" noWrap sx={{ fontSize: '0.8rem', lineHeight: 1.3, display: 'block' }}>
                {secondary}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    },
    {
      field: 'address',
      headerName: 'Location',
      flex: 1.25,
      minWidth: 185,
      valueGetter: (_, row) => [row.address || row.streetArea, row.city, row.pincode].filter(Boolean).join(', '),
      renderCell: (params) => {
        const c = params.row;
        const loc = [c.address || c.streetArea || c.street_area, c.city, c.pincode].filter(Boolean).join(', ');
        const extraAddrs = Array.isArray(c.additional_addresses) ? c.additional_addresses.length : 0;
        return (
          <Stack spacing={0.35} sx={{ width: '100%', minWidth: 0, justifyContent: 'center' }}>
            <Tooltip title={loc || 'No address saved'} placement="top-start">
              <Typography noWrap sx={{ fontSize: '0.875rem', lineHeight: 1.35 }}>
                {loc || 'No address saved'}
              </Typography>
            </Tooltip>
            {extraAddrs > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={`+${extraAddrs} addr`}
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 21, fontSize: '0.73rem', borderRadius: '4px' }}
                />
              </Box>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'customer_classification',
      headerName: 'Segment & Price List',
      flex: 0.9,
      minWidth: 155,
      valueGetter: (_, row) => normalizeSegmentLabel(row.customer_classification || row.customerClassification),
      renderCell: (params) => {
        const c = params.row;
        const cls = params.value || 'Regular Customer';
        const priceList = c.price_list || 'Standard';
        const discount = Number(c.default_discount || c.default_discount_pct || 0);
        const isVip = isVipCustomer(c);
        return (
          <Stack spacing={0.35} sx={{ width: '100%', minWidth: 0, alignItems: 'flex-start', justifyContent: 'center' }}>
            <Chip
              label={cls}
              size="small"
              color={isVip ? 'secondary' : 'default'}
              variant={isVip ? 'filled' : 'outlined'}
              sx={{ height: 23, fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px' }}
            />
            <Typography color="text.secondary" noWrap sx={{ fontSize: '0.8rem', lineHeight: 1.3, display: 'block' }}>
              {priceList}{discount > 0 ? ` • ${discount}% OFF` : ''}
            </Typography>
          </Stack>
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
            <Tooltip title={company || 'Individual Account'} placement="top-start">
              <Typography
                fontWeight={company ? 700 : 400}
                color={company ? 'text.primary' : 'text.secondary'}
                noWrap
                sx={{ fontSize: '0.875rem', lineHeight: 1.35 }}
              >
                {company || 'Individual'}
              </Typography>
            </Tooltip>
            <Typography
              color={gst ? 'primary.main' : 'text.secondary'}
              noWrap
              sx={{ fontSize: '0.8rem', fontWeight: gst ? 600 : 400, lineHeight: 1.3, display: 'block' }}
            >
              {gst ? `GST: ${gst}` : 'No GSTIN'}
            </Typography>
          </Stack>
        );
      },
    },
    {
      field: 'customer_status',
      headerName: 'Status',
      width: 96,
      valueGetter: (_, row) => row.customerStatus || row.customer_status || 'Active',
      renderCell: (params) => {
        const raw = String(params.value || 'Active');
        const inactive = raw.toLowerCase() === 'inactive';
        return (
          <Chip
            size="small"
            label={inactive ? t('badge_inactive') : t('badge_active')}
            color={inactive ? 'default' : 'success'}
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: '0.78rem', borderRadius: '4px', height: 24 }}
          />
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Joined Date',
      width: 140,
      valueGetter: (_, row) => formatRegisteredDate(row.created_at || row.registered_at) || '—',
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary" noWrap>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'internal_comments',
      headerName: 'Staff Notes',
      flex: 0.9,
      minWidth: 165,
      valueGetter: (_, row) => formatCleanStaffNotes(row.internal_comments) || formatCleanStaffNotes(row.notes) || '—',
      renderCell: (params) => (
        <Tooltip title={params.value} placement="top-start">
          <Typography sx={{ fontSize: '0.84rem' }} color="text.secondary" noWrap>
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filterable: false,
      disableExport: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const c = params.row;
        return (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title={t('view_profile_title') || 'View profile'}>
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
                  '&:hover': {
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.16),
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => setDrawerCustomer(c)}
              >
                <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy customer details">
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
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                  },
                }}
                onClick={() => handleCopyCustomer(c)}
              >
                <ContentCopyOutlinedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('btn_edit') || 'Edit'}>
              <IconButton
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
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
                  '&:hover': {
                    bgcolor: alpha(muiTheme.palette.error.main, 0.16),
                    borderColor: 'error.main',
                  },
                }}
                onClick={() => setDeleteConfirmTarget(c)}
              >
                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ], [handleCopyCustomer, muiTheme.palette.error.main, muiTheme.palette.primary.main, t]);

  const hasActiveFilters = activeFilterCount > 0;

  const visibleColumnsCount = CUSTOMIZABLE_COLUMNS.filter(
    (col) => columnVisibilityModel[col.field] !== false
  ).length;

  const cardsTotalPages = Math.max(1, Math.ceil(filteredCustomers.length / cardsPageSize));
  const safeCardsPage = Math.min(cardsPage, cardsTotalPages);
  const paginatedCards = filteredCustomers.slice(
    (safeCardsPage - 1) * cardsPageSize,
    safeCardsPage * cardsPageSize
  );

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
        {/* ── 1. Compact Header Card (72-80px desktop height, balanced left/right) ── */}
        <Paper
          variant="outlined"
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            minHeight: { md: 76 },
            mb: 2,
            borderRadius: 2,
            borderLeft: '4px solid',
            borderLeftColor: 'primary.main',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
            <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.4375rem' }, fontWeight: 700, lineHeight: 1.2 }}>
              Customer Master Record
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
              disabled={loading}
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
        </Paper>

        {/* ── 2. KPI Summary Header Cards (4 equal cards, clean white surfaces, top-right icons) ── */}
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <KpiHeaderCard
              title="Total Customers"
              value={kpiStats.total}
              subtitle={hasActiveFilters ? `${filteredCustomers.length} matching records` : 'Matching records'}
              icon={<PeopleAltOutlinedIcon />}
              accentColor={themeMode === 'dark' ? '#818cf8' : '#2563eb'}
              active={false}
              onClick={resetAllFilters}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <KpiHeaderCard
              title="Active Accounts"
              value={kpiStats.active}
              subtitle={`${kpiStats.inactive} inactive • Active profiles`}
              icon={<VerifiedUserOutlinedIcon />}
              accentColor="#10b981"
              active={statusFilter === 'active'}
              onClick={() => setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <KpiHeaderCard
              title="B2B / GST"
              value={kpiStats.b2b}
              subtitle="Registered accounts"
              icon={<BusinessOutlinedIcon />}
              accentColor="#6366f1"
              active={gstFilter === 'gst_only'}
              onClick={() => setGstFilter((prev) => (prev === 'gst_only' ? 'all' : 'gst_only'))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <KpiHeaderCard
              title="VIP Memberships"
              value={kpiStats.vipOrMember}
              subtitle="VIP customers"
              icon={<CardMembershipOutlinedIcon />}
              accentColor="#f59e0b"
              active={vipFilter === 'vip_only'}
              onClick={() => setVipFilter((prev) => (prev === 'vip_only' ? 'all' : 'vip_only'))}
            />
          </Grid>
        </Grid>

        {/* ── 3. Two-Row Search & Advanced Filters Section ── */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Row 1: Search & Quick Actions */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'stretch', lg: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flex: 1,
                flexWrap: 'wrap',
              }}
            >
              <TextField
                size="small"
                placeholder={t('search_cust_placeholder')}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: 1 }, minWidth: { sm: 240, md: 300 }, maxWidth: { lg: 440 } }}
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

              <Button
                variant={vipFilter === 'vip_only' ? 'contained' : 'outlined'}
                color={vipFilter === 'vip_only' ? 'secondary' : 'inherit'}
                startIcon={<StarBorderOutlinedIcon fontSize="small" />}
                onClick={() => setVipFilter((prev) => (prev === 'vip_only' ? 'all' : 'vip_only'))}
              >
                VIP Customers ({kpiStats.vipOrMember})
              </Button>

              <Button
                variant={gstFilter === 'gst_only' ? 'contained' : 'outlined'}
                color={gstFilter === 'gst_only' ? 'primary' : 'inherit'}
                startIcon={<ReceiptLongOutlinedIcon fontSize="small" />}
                onClick={() => setGstFilter((prev) => (prev === 'gst_only' ? 'all' : 'gst_only'))}
              >
                GST Accounts ({kpiStats.b2b})
              </Button>

              {viewMode === 'table' && (
                <Button
                  variant="outlined"
                  startIcon={<ViewColumnOutlinedIcon fontSize="small" />}
                  onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
                >
                  Customize Columns ({visibleColumnsCount}/{CUSTOMIZABLE_COLUMNS.length})
                </Button>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'space-between', lg: 'flex-end' },
                gap: 1,
                flexShrink: 0,
              }}
            >
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
                  Clear All ({activeFilterCount})
                </Button>
              )}

              <Box
                sx={{
                  height: 40,
                  px: 1.75,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: 'primary.main',
                  bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {filteredCustomers.length === 1
                  ? t('cust_records_loaded', { count: filteredCustomers.length })
                  : t('cust_records_loaded_plural', { count: filteredCustomers.length })}
              </Box>
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
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
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
              borderRadius: 2,
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
        ) : viewMode === 'table' ? (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              width: '100%',
              borderColor: 'divider',
            }}
          >
            <DataGrid
              rows={gridRows}
              columns={gridColumns}
              getRowId={(row) => row._gridId}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) =>
                handleColumnVisibilityChange(newModel, 'Columns updated')
              }
              loading={loading && customers.length === 0}
              rowHeight={76}
              columnHeaderHeight={50}
              showToolbar
              disableRowSelectionOnClick
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 20, 50]}
              onRowClick={(params) => setDrawerCustomer(params.row)}
              sx={{
                border: 0,
                width: '100%',
                height: { xs: 480, sm: 540, md: 610 },
                fontSize: '0.875rem',
                '& .MuiDataGrid-toolbar': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  px: { xs: 1, sm: 1.5 },
                  py: 0.75,
                  bgcolor: 'background.paper',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  '& .MuiIconButton-root': {
                    width: 34,
                    height: 34,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                    ml: 0.5,
                  },
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: themeMode === 'dark' ? '#1c2436' : '#f1f5f9',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
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
                  fontSize: '0.85rem',
                },
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  '&:nth-of-type(even)': {
                    bgcolor: themeMode === 'dark' ? 'rgba(255,255,255,0.015)' : '#fafbfd',
                  },
                  '&:hover': {
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.06),
                  },
                },
                '& .MuiDataGrid-cell': {
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: '1.4 !important',
                  py: 0.5,
                  px: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: themeMode === 'dark' ? '#131926' : '#f8fafc',
                  minHeight: 52,
                  px: { xs: 0.5, sm: 1.5 },
                  '& .MuiTablePagination-toolbar': {
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-end' },
                    gap: 0.5,
                    px: { xs: 0.5, sm: 1 },
                  },
                },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                  outline: 'none',
                },
              }}
            />
          </Paper>
        ) : (
          <Box>
            <Grid container spacing={2}>
              {paginatedCards.map((c, idx) => {
                const custId = c.customerId || c.customer_code || c.customer_id || c.id || '';
                const cardKey = custId || c.mobile_number || `card-${idx}`;
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
                              onClick={() => setDrawerCustomer(c)}
                            >
                              Profile
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
                              >
                                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
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
                Showing {filteredCustomers.length === 0 ? 0 : (safeCardsPage - 1) * cardsPageSize + 1}–
                {Math.min(safeCardsPage * cardsPageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
          onClose={() => setEditingCustomer(null)}
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
                          {editingCustomer.customer_name}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton onClick={() => setEditingCustomer(null)} aria-label="Close">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                <CustomerForm
                  initialCustomer={editingCustomer}
                  customerId={
                    editingCustomer.customerId ||
                    editingCustomer.customer_id ||
                    `CUST-${String(editingCustomer.id).padStart(5, '0')}`
                  }
                  isOrderFlow={false}
                  submitLabel="Update Customer Record"
                  onBack={() => setEditingCustomer(null)}
                  onSubmit={handleUpdate}
                />
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* ── Register New Customer MUI Dialog ── */}
        <Dialog
          open={isRegisteringNew}
          onClose={() => {
            setIsRegisteringNew(false);
            setPrefillData(null);
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
                  setIsRegisteringNew(false);
                  setPrefillData(null);
                }}
                aria-label="Close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
            <CustomerForm
              initialCustomer={prefillData}
              customerId={nextCustId}
              isOrderFlow={false}
              submitLabel="Register Customer"
              onBack={() => {
                setIsRegisteringNew(false);
                setPrefillData(null);
              }}
              onSubmit={async ({ customerData }) => {
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
              <strong>{deleteConfirmTarget?.customer_name}</strong>{' '}
              ({formatPhoneDisplay(deleteConfirmTarget?.mobile_number)})?
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
              onClick={() => handleDelete(deleteConfirmTarget.id)}
            >
              {isDeleting ? t('btn_deleting') : t('btn_confirm_delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
