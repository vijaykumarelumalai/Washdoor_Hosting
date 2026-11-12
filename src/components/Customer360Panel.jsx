// src/components/Customer360Panel.jsx
// Docked Customer 360° Split-View Panel & Mobile Drawer Content

import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  formatDOB,
  formatPhoneDisplay,
  getAgeFromDOB,
  normalizeMobileNumber,
} from '../utils/validation';
import { formatCleanStaffNotes } from './CustomerDetailDrawer';

const AVATAR_PALETTES = [
  { bg: '#ede9fe', color: '#6d28d9' },
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
];

export function getPastelAvatarColors(seedText = '') {
  const str = String(seedText || 'C');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % AVATAR_PALETTES.length;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getOrderStatusStyle(rawStatus) {
  const s = String(rawStatus || '').toLowerCase();
  if (s.includes('deliver') || s.includes('complet') || s.includes('dfa') || s.includes('today')) {
    return { label: 'Completed', bg: '#dcfce7', color: '#15803d' };
  }
  if (s.includes('ready')) {
    return { label: 'Ready', bg: '#dbeafe', color: '#1d4ed8' };
  }
  if (s.includes('cancel') || s.includes('not cleared')) {
    return { label: 'Attention', bg: '#fee2e2', color: '#b91c1c' };
  }
  if (s.includes('progress') || s.includes('wash') || s.includes('emer')) {
    return { label: 'In Progress', bg: '#fef3c7', color: '#b45309' };
  }
  return { label: 'Received', bg: '#f1f5f9', color: '#334155' };
}

function formatShortDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function getOrderPiecesCount(ord) {
  const explicit = Number(ord?.total_pieces || ord?.item_count || 0);
  if (explicit > 0) return explicit;
  if (Array.isArray(ord?.items) && ord.items.length > 0) {
    const summed = ord.items.reduce((sum, it) => sum + Math.max(1, Number(it?.qty ?? it?.quantity ?? it?.count ?? 1)), 0);
    if (summed > 0) return summed;
  }
  return 1;
}

function getOrderPaymentBreakdown(ord) {
  const total = Number(ord?.total_amount || 0);
  const adv = Number(ord?.advance_paid || 0);
  const payStatus = String(ord?.payment_status || '').toLowerCase();
  const isPaid = payStatus === 'paid';
  const due = isPaid ? 0 : Math.max(0, Number(ord?.balance_due ?? (total - adv)));
  const paid = isPaid ? Math.max(adv, total) : Math.max(0, adv);
  const label = ord?.payment_status || (due <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid');
  return { total, paid, due, isPaid, label };
}

function getOrderItemsPreview(ord) {
  if (!Array.isArray(ord?.items) || ord.items.length === 0) return '';
  const parts = ord.items
    .filter((it) => it && it.type !== 'customer_registration' && (it.name || it.item_name || it.product_name))
    .slice(0, 3)
    .map((it) => `${it.name || it.item_name || it.product_name} × ${Number(it.qty ?? it.quantity ?? it.count ?? 1)}`);
  if (parts.length === 0) return '';
  const extra = ord.items.length > 3 ? ` +${ord.items.length - 3} more` : '';
  return `${parts.join(', ')}${extra}`;
}

export default function Customer360Panel({
  customer,
  customerOrders = [],
  orderStats = { orderCount: 0, lifetimeSpend: 0, outstandingDue: 0 },
  currencySymbol = '₹',
  inDrawer = false,
  onClose,
  onEdit,
  onDelete,
  onCopy,
  onViewFullProfile,
  t,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  useEffect(() => {
    setActiveTab('overview');
  }, [customer?.customer_id, customer?.customerId, customer?.id]);

  if (!customer) return null;

  const custId = customer.customerId || customer.customer_code || customer.customer_id || customer.id || '';
  const name = customer.customer_name || customer.customerName || 'Customer';
  const status = customer.customerStatus || customer.customer_status || 'Active';
  const isInactive = String(status).toLowerCase() === 'inactive';
  const cleanMobile = normalizeMobileNumber(customer.mobile_number || customer.mobileNumber);
  const formattedMobile = formatPhoneDisplay(customer.mobile_number || customer.mobileNumber) || '—';
  const rawAltPhone = customer.alternate_phone || customer.alternatePhoneNumber || customer.contactDetails?.alternatePhoneNumber || '';
  const formattedAltPhone = rawAltPhone ? formatPhoneDisplay(rawAltPhone) : '';
  const email = customer.email || customer.contactDetails?.email || 'No email';
  const companyName = customer.company_name || customer.companyName || '';
  const gstNumber = customer.gst_number || customer.gstNumber || '';
  const clsRaw = String(customer.customer_classification || customer.customerClassification || 'Regular').toLowerCase();
  const clsLabel = clsRaw.includes('vip') || clsRaw.includes('elite')
    ? 'VIP'
    : clsRaw.includes('corp') || clsRaw.includes('b2b')
    ? 'Corporate'
    : 'Regular';
  const priceList = customer.price_list || customer.priceList || 'Standard';
  const defaultDiscount = Number(customer.default_discount || customer.default_discount_pct || 0);
  const priceListDisplay = defaultDiscount > 0 ? `${priceList} (${defaultDiscount}% OFF)` : priceList;
  const serviceZone = customer.service_zone || customer.area_service_zone || customer.areaServiceZone || 'Zone 1';
  const creditLimit = Number(customer.credit_limit || 0);
  const walletBalance = Number(customer.wallet_balance || 0);
  const membershipId = customer.membership_id || customer.membershipId || '';
  const tier = customer.tier || '';

  const addressParts = [
    customer.address || customer.streetArea || customer.street_area,
    customer.city,
    customer.pincode,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No address saved';
  const additionalAddresses = Array.isArray(customer.additional_addresses)
    ? customer.additional_addresses
    : Array.isArray(customer.additionalAddresses)
    ? customer.additionalAddresses
    : [];
  const mapHref = customer.map_link || (addressParts.length > 0 ? `https://maps.google.com/?q=${encodeURIComponent(addressParts.join(', '))}` : '');

  const dobAge = getAgeFromDOB(customer.date_of_birth);
  const dobText = customer.date_of_birth
    ? `${formatDOB(customer.date_of_birth)}${dobAge ? ` (${dobAge} yrs)` : ''}`
    : '';
  const occasionParts = [];
  if (customer.anniversary_date) {
    occasionParts.push(`${formatDOB(customer.anniversary_date)} (Anniversary)`);
  }
  if (customer.special_occasion) {
    occasionParts.push(`${customer.special_occasion_date ? `${formatDOB(customer.special_occasion_date)} ` : ''}(${customer.special_occasion})`.trim());
  }
  const occasionDisplay = occasionParts.length > 0
    ? occasionParts.join(' • ')
    : (dobText ? '' : 'Not specified');

  const membershipSummary = [
    tier || (clsLabel === 'VIP' ? 'VIP Plan' : `${priceList} Plan`),
    membershipId ? `ID: ${membershipId}` : null,
  ].filter(Boolean).join(' • ');

  const internalCommentsClean = formatCleanStaffNotes(customer.internal_comments);
  const generalNotesClean = formatCleanStaffNotes(customer.notes);
  const staffNotesList = [internalCommentsClean, generalNotesClean].filter(
    (note, index, arr) => note && arr.indexOf(note) === index
  );
  const prefNotesClean = formatCleanStaffNotes(customer.preference_notes);
  const servicePref = customer.service_category || customer.preference || '';
  const joinedDateText = formatShortDate(customer.created_at || customer.registered_at);
  const avatarPalette = getPastelAvatarColors(name);

  const recentOrders = customerOrders.slice(0, 3);

  return (
    <Paper
      variant={inDrawer ? 'elevation' : 'outlined'}
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: inDrawer ? 0 : 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* ── Panel Top Header ── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}>
          Customer 360°
        </Typography>
        <Tooltip title="Close Customer 360°">
          <IconButton size="small" onClick={onClose} aria-label="Close Customer 360">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Profile Identity + Quick Connect ── */}
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
            <Avatar
              sx={{
                width: 46,
                height: 46,
                bgcolor: avatarPalette.bg,
                color: avatarPalette.color,
                fontWeight: 700,
                fontSize: '0.95rem',
                flexShrink: 0,
              }}
            >
              {name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.25 }} noWrap>
                {name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                {custId && (
                  <Chip
                    size="small"
                    label={custId}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      borderRadius: '6px',
                    }}
                  />
                )}
                <Chip
                  size="small"
                  label={isInactive ? (t?.('badge_inactive') || 'Inactive') : (t?.('badge_active') || 'Active')}
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    bgcolor: isInactive
                      ? (theme) => alpha(theme.palette.text.secondary, 0.12)
                      : (theme) => alpha(theme.palette.success.main, 0.14),
                    color: isInactive ? 'text.secondary' : 'success.main',
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Top-right Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {cleanMobile && (
              <>
                <Tooltip title="Call Customer">
                  <IconButton
                    size="small"
                    component="a"
                    href={`tel:+91${cleanMobile}`}
                    sx={{
                      width: 30,
                      height: 30,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '50%',
                      color: 'text.secondary',
                    }}
                  >
                    <CallOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Message on WhatsApp">
                  <IconButton
                    size="small"
                    component="a"
                    href={`https://wa.me/91${cleanMobile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      width: 30,
                      height: 30,
                      border: '1px solid',
                      borderColor: (theme) => alpha(theme.palette.success.main, 0.4),
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                      borderRadius: '50%',
                      color: 'success.main',
                    }}
                  >
                    <WhatsAppIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="More Actions">
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                sx={{ width: 30, height: 30, borderRadius: '50%' }}
                aria-label="Customer actions menu"
              >
                <MoreVertIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Actions Dropdown Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {onViewFullProfile && (
            <MenuItem
              onClick={() => {
                setMenuAnchorEl(null);
                onViewFullProfile(customer);
              }}
            >
              <ListItemIcon>
                <PersonSearchOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Full Profile Details</ListItemText>
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              onEdit?.(customer);
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Profile</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              onCopy?.(customer);
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
              setMenuAnchorEl(null);
              onDelete?.(customer);
            }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Customer</ListItemText>
          </MenuItem>
        </Menu>

        {/* ── 2x3 Metadata Grid ── */}
        <Box
          sx={{
            mt: 1.75,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
            <CallOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Mobile</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>
                {formattedMobile}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
            <MailOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Email</Typography>
              <Tooltip title={email}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>
                  {email}
                </Typography>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
            <WorkspacePremiumOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Classification</Typography>
              <Chip
                size="small"
                icon={
                  clsLabel === 'VIP' ? (
                    <WorkspacePremiumOutlinedIcon sx={{ fontSize: '13px !important' }} />
                  ) : clsLabel === 'Corporate' ? (
                    <BusinessOutlinedIcon sx={{ fontSize: '13px !important' }} />
                  ) : (
                    <PersonOutlinedIcon sx={{ fontSize: '13px !important' }} />
                  )
                }
                label={clsLabel}
                sx={{
                  mt: 0.2,
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  bgcolor: clsLabel === 'VIP' ? '#f3e8ff' : clsLabel === 'Corporate' ? '#dbeafe' : '#f1f5f9',
                  color: clsLabel === 'VIP' ? '#7e22ce' : clsLabel === 'Corporate' ? '#1d4ed8' : '#334155',
                  '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
            <LocalOfferOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Price List</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>
                {priceListDisplay}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Service Zone</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>
                {serviceZone}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Credit Limit</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>
                {currencySymbol} {creditLimit.toLocaleString('en-IN')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Navigation Tabs ── */}
      <Box sx={{ borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              minWidth: 'auto',
              px: 1.25,
              py: 0.75,
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="orders" label={`Orders (${orderStats.orderCount})`} />
          <Tab value="payments" label="Payments" />
          <Tab value="complaints" label="Notes" />
          <Tab value="membership" label="Membership" />
        </Tabs>
      </Box>

      {/* ── Scrollable Tab Body ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {activeTab === 'overview' && (
          <Stack spacing={2}>
            {/* 3 Mini Stat Cards */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  p: 1.15,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha('#3b82f6', theme.palette.mode === 'dark' ? 0.14 : 0.08),
                  border: '1px solid',
                  borderColor: (theme) => alpha('#3b82f6', 0.18),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
                  <ShoppingBagOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }} noWrap>
                    Total Orders
                  </Typography>
                </Box>
                <Typography sx={{ mt: 0.35, fontSize: '1.05rem', fontWeight: 800 }}>
                  {orderStats.orderCount}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.15,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha('#f59e0b', theme.palette.mode === 'dark' ? 0.14 : 0.09),
                  border: '1px solid',
                  borderColor: (theme) => alpha('#f59e0b', 0.2),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#d97706' }}>
                  <SavingsOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }} noWrap>
                    Lifetime Spend
                  </Typography>
                </Box>
                <Typography sx={{ mt: 0.35, fontSize: '1.05rem', fontWeight: 800 }} noWrap>
                  {currencySymbol} {Math.round(orderStats.lifetimeSpend).toLocaleString('en-IN')}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.15,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    alpha(
                      orderStats.outstandingDue > 0 ? '#ef4444' : '#10b981',
                      theme.palette.mode === 'dark' ? 0.14 : 0.09
                    ),
                  border: '1px solid',
                  borderColor: (theme) => alpha(orderStats.outstandingDue > 0 ? '#ef4444' : '#10b981', 0.2),
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: orderStats.outstandingDue > 0 ? 'error.main' : 'success.main',
                  }}
                >
                  <VerifiedOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }} noWrap>
                    Outstanding
                  </Typography>
                </Box>
                <Typography sx={{ mt: 0.35, fontSize: '1.05rem', fontWeight: 800 }} noWrap>
                  {currencySymbol} {Math.round(orderStats.outstandingDue).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>

            {/* Customer Information */}
            <Box>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, mb: 1 }}>
                Customer Information
              </Typography>
              <Stack spacing={1.15}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <LocationOnOutlinedIcon sx={{ fontSize: 17, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Address</Typography>
                      {mapHref && (
                        <Box
                          component="a"
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.3,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'primary.main',
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          Map <OpenInNewIcon sx={{ fontSize: 11 }} />
                        </Box>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                      {fullAddress}
                    </Typography>
                    {additionalAddresses.length > 0 && (
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
                        +{additionalAddresses.length} saved {additionalAddresses.length === 1 ? 'address' : 'addresses'}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {formattedAltPhone && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <CallOutlinedIcon sx={{ fontSize: 17, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Alternate Phone</Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                        {formattedAltPhone}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {(companyName || gstNumber) && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <BusinessOutlinedIcon sx={{ fontSize: 17, color: 'primary.main', mt: 0.2, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Company / GSTIN</Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                        {companyName || 'Business Account'}{gstNumber ? ` • GST: ${gstNumber}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {dobText && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <CakeOutlinedIcon sx={{ fontSize: 17, color: '#e11d48', mt: 0.2, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        Date of Birth
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                        {dobText}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {occasionDisplay && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <CakeOutlinedIcon sx={{ fontSize: 17, color: '#e11d48', mt: 0.2, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        Anniversary / Special Occasion
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                        {occasionDisplay}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <CardMembershipOutlinedIcon sx={{ fontSize: 17, color: '#d97706', mt: 0.2, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Membership</Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                      {membershipSummary}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Recent Orders */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  Recent Orders
                </Typography>
                {customerOrders.length > 0 && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    sx={{
                      border: 'none',
                      background: 'transparent',
                      color: 'primary.main',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.35,
                      p: 0,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    View All <ArrowForwardIcon sx={{ fontSize: 13 }} />
                  </Box>
                )}
              </Box>

              {recentOrders.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    No orders recorded for this customer yet.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={0.85}>
                  {recentOrders.map((ord, idx) => {
                    const ordNum = ord.order_number || ord.work_number || ord.id || `ORD-${idx + 1}`;
                    const serviceName = ord.service_category || ord.service_type || ord.preference || 'Laundry';
                    const pieces = getOrderPiecesCount(ord);
                    const amt = Number(ord.total_amount || 0);
                    const dateStr = formatShortDate(ord.created_at || ord.intake_date);
                    const st = getOrderStatusStyle(ord.order_status || ord.status);

                    return (
                      <Paper
                        key={ordNum + idx}
                        variant="outlined"
                        sx={{
                          px: 1.25,
                          py: 0.9,
                          borderRadius: 1.75,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                          <Chip
                            size="small"
                            label={ordNum}
                            sx={{
                              height: 21,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                              color: 'primary.main',
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }} noWrap>
                              {serviceName} ({pieces} {pieces === 1 ? 'item' : 'items'})
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }} noWrap>
                              {dateStr}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            {currencySymbol} {Math.round(amt).toLocaleString('en-IN')}
                          </Typography>
                          <Chip
                            size="small"
                            label={st.label}
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              bgcolor: st.bg,
                              color: st.color,
                            }}
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        {activeTab === 'orders' && (
          <Stack spacing={1}>
            {customerOrders.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                  No order history found for {name}.
                </Typography>
              </Paper>
            ) : (
              customerOrders.map((ord, idx) => {
                const ordNum = ord.order_number || ord.work_number || ord.id || `ORD-${idx + 1}`;
                const serviceName = ord.service_category || ord.service_type || ord.preference || 'Laundry';
                const pieces = getOrderPiecesCount(ord);
                const itemsPreview = getOrderItemsPreview(ord);
                const payInfo = getOrderPaymentBreakdown(ord);
                const deliveryDisplay = ord.delivery_date || (ord.target_delivery_date ? formatShortDate(ord.target_delivery_date) : '');
                const st = getOrderStatusStyle(ord.order_status || ord.status);
                return (
                  <Paper key={ordNum + idx} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={ordNum}
                        sx={{
                          height: 21,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Chip
                          size="small"
                          label={payInfo.label}
                          color={payInfo.due <= 0 ? 'success' : 'warning'}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.67rem', fontWeight: 600 }}
                        />
                        <Chip size="small" label={st.label} sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: st.bg, color: st.color }} />
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, mt: 0.75 }}>
                      {serviceName} • {pieces} {pieces === 1 ? 'item' : 'items'}
                    </Typography>
                    {itemsPreview && (
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
                        {itemsPreview}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.6, gap: 1 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {formatShortDate(ord.created_at || ord.intake_date)}
                        {deliveryDisplay ? ` • Due: ${deliveryDisplay}` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                        {currencySymbol}{payInfo.total.toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })
            )}
          </Stack>
        )}

        {activeTab === 'payments' && (
          <Stack spacing={1.25}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Total Billed</Typography>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  {currencySymbol}{orderStats.lifetimeSpend.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Total Collected</Typography>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'success.main' }}>
                  {currencySymbol}{Math.max(0, orderStats.lifetimeSpend - orderStats.outstandingDue).toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Outstanding Balance</Typography>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: orderStats.outstandingDue > 0 ? 'error.main' : 'success.main' }}>
                  {currencySymbol}{orderStats.outstandingDue.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Paper>

            {customerOrders.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  No payment transactions recorded for {name} yet.
                </Typography>
              </Paper>
            ) : (
              customerOrders.map((ord, idx) => {
                const ordNum = ord.order_number || ord.work_number || ord.id || `ORD-${idx + 1}`;
                const payInfo = getOrderPaymentBreakdown(ord);
                return (
                  <Paper key={ordNum + idx} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{ordNum}</Typography>
                      <Chip
                        size="small"
                        label={payInfo.label}
                        color={payInfo.due <= 0 ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.68rem' }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.35 }}>
                      Mode: {ord.payment_method || 'Cash'} • Total: {currencySymbol}{payInfo.total.toFixed(0)} • Paid: {currencySymbol}{payInfo.paid.toFixed(0)} • Due: {currencySymbol}{payInfo.due.toFixed(0)}
                    </Typography>
                  </Paper>
                );
              })
            )}
          </Stack>
        )}

        {activeTab === 'complaints' && (
          <Stack spacing={1.25}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>
                Internal Staff Notes
              </Typography>
              {staffNotesList.length > 0 ? (
                <Stack spacing={0.5}>
                  {staffNotesList.map((note, idx) => (
                    <Typography key={idx} sx={{ fontSize: '0.8rem', color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                      {note}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  No internal staff notes or complaints logged for this customer.
                </Typography>
              )}
            </Paper>

            {(servicePref || prefNotesClean) && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>
                  Service &amp; Fabric Care Preferences
                </Typography>
                {servicePref && (
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.primary' }}>
                    Preferred Service: <strong>{servicePref}</strong>
                  </Typography>
                )}
                {prefNotesClean && (
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: servicePref ? 0.35 : 0 }}>
                    {prefNotesClean}
                  </Typography>
                )}
              </Paper>
            )}

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>
                Communication Preferences
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                Channel: <strong>{customer.communication_pref || customer.communicationPreference || 'WhatsApp'}</strong> • Language:{' '}
                <strong>{customer.communication_lang || customer.preferred_language || customer.preferredCommunicationLanguage || 'English'}</strong> • DND:{' '}
                <strong>{customer.dnd ? 'Enabled' : 'Allowed'}</strong>
              </Typography>
            </Paper>

            {onEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={() => onEdit(customer)}
                sx={{ alignSelf: 'flex-start', height: 34 }}
              >
                Edit Notes &amp; Preferences
              </Button>
            )}
          </Stack>
        )}

        {activeTab === 'membership' && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack spacing={0.85}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Segment</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>{clsLabel}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Price List</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>{priceListDisplay}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Service Zone</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>{serviceZone}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Membership ID</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>{membershipId || '—'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Default Discount</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>{defaultDiscount > 0 ? `${defaultDiscount}%` : '0%'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Wallet Balance</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>
                  {currencySymbol} {walletBalance.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Credit Limit</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>
                  {currencySymbol} {creditLimit.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Tax Exemption</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>
                  {customer.tax_exemption ? 'Tax Exempt' : 'Standard GST'}
                </Typography>
              </Box>
              {(companyName || gstNumber) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Company / GSTIN</Typography>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>
                    {companyName || '—'} {gstNumber ? `(${gstNumber})` : ''}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Marketing / Referral</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>
                  {customer.marketing_source || 'Walk-in'} {customer.referral_code ? `(${customer.referral_code})` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>Joined Date</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>{joinedDateText}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </Box>
    </Paper>
  );
}
