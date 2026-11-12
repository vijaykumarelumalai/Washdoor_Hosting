// src/components/CustomerDetailDrawer.jsx
// Material UI Customer Profile Slide-Over Drawer for structured CRM inspection

import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  formatDOB,
  formatPhoneDisplay,
  getAgeFromDOB,
  normalizeMobileNumber,
} from '../utils/validation';

export function formatRegisteredDate(isoDate) {
  if (!isoDate) return null;
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export function formatCleanStaffNotes(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') {
    const nested = raw.staff_notes || raw.internal_comments || raw.notes;
    return typeof nested === 'string' && nested.trim() ? nested.trim() : null;
  }
  const str = String(raw).trim();
  if (!str) return null;
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        const nested = parsed.staff_notes || parsed.internal_comments || parsed.notes;
        return typeof nested === 'string' && nested.trim() ? nested.trim() : null;
      }
    } catch {
      const match = str.match(/"staff_notes"\s*:\s*"([^"]*)"/);
      if (match && match[1] && match[1].trim()) return match[1].trim();
      if (str.includes('"factory_hub"') || str.includes('"garment_inspections"')) return null;
    }
  }
  return str;
}

function DetailRow({ label, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        py: 0.75,
        borderBottom: '1px dashed',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none', pb: 0 },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, minWidth: 120 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          textAlign: 'right',
          wordBreak: 'break-word',
          color: 'text.primary',
        }}
      >
        {value || <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>}
      </Typography>
    </Box>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

export default function CustomerDetailDrawer({
  customer,
  open,
  onClose,
  onEdit,
  onDelete,
  onCopy,
  t,
}) {
  const [sectionTab, setSectionTab] = useState('all');

  useEffect(() => {
    setSectionTab('all');
  }, [customer?.id, customer?.customer_id, customer?.customerId, open]);

  if (!customer) {
    return (
      <Drawer
        anchor="right"
        open={false}
        onClose={onClose}
      />
    );
  }

  const custId = customer.customerId || customer.customer_code || customer.customer_id || customer.id || '';
  const name = customer.customer_name || customer.customerName || 'Customer';
  const status = customer.customerStatus || customer.customer_status || 'Active';
  const isInactive = String(status).toLowerCase() === 'inactive';
  const membershipId = customer.membershipId || customer.membership_id || '';
  const classification = customer.customer_classification || customer.customerClassification || 'Regular Customer';
  const priceList = customer.price_list || customer.priceList || 'Standard';
  const zone = customer.service_zone || customer.area_service_zone || customer.areaServiceZone || '';
  const email = customer.email || customer.contactDetails?.email || '';
  const altPhone = customer.alternatePhoneNumber || customer.alternate_phone || customer.contactDetails?.alternatePhoneNumber || '';
  const cleanMobile = normalizeMobileNumber(customer.mobile_number || customer.mobileNumber);
  const age = getAgeFromDOB(customer.date_of_birth);
  const regDate = formatRegisteredDate(customer.created_at || customer.registered_at);
  const company = customer.companyName || customer.company_name || '';
  const gst = customer.gstNumber || customer.gst_number || '';
  const locationParts = [
    customer.address || customer.streetArea || customer.street_area,
    customer.city,
    customer.pincode,
  ].filter(Boolean);
  const staffNotes = formatCleanStaffNotes(customer.internal_comments) || formatCleanStaffNotes(customer.notes);
  const prefNotes = formatCleanStaffNotes(customer.preference_notes);
  const servicePref = customer.service_category || customer.preference || '';
  const lang = customer.communication_lang || customer.preferred_language || customer.preferredCommunicationLanguage || 'English';
  const channelPref = customer.communication_pref || customer.communicationPreference || 'WhatsApp';

  const showProfile = sectionTab === 'all' || sectionTab === 'profile';
  const showCommercial = sectionTab === 'all' || sectionTab === 'commercial';
  const showAddresses = sectionTab === 'all' || sectionTab === 'addresses';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 540, md: 600 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          },
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'flex-start' }}>
          <Avatar
            variant="rounded"
            sx={{
              width: { xs: 44, sm: 52 },
              height: { xs: 44, sm: 52 },
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.15rem' },
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff',
              boxShadow: 2,
              flexShrink: 0,
            }}
          >
            {name.slice(0, 2).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h6" fontWeight={700} noWrap sx={{ minWidth: 0, maxWidth: '100%' }}>
                {name}
              </Typography>
              <Chip
                size="small"
                label={isInactive ? (t?.('badge_inactive') || 'Inactive') : (t?.('badge_active') || 'Active')}
                color={isInactive ? 'default' : 'success'}
                variant="outlined"
                sx={{ fontWeight: 600, height: 22 }}
              />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {formatPhoneDisplay(customer.mobile_number || customer.mobileNumber) || 'No mobile number'}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
              {custId && <Chip size="small" label={custId} color="primary" variant="filled" />}
              {membershipId && <Chip size="small" label={`Member: ${membershipId}`} color="secondary" variant="outlined" />}
              <Chip size="small" label={classification} variant="outlined" />
              {regDate && <Chip size="small" label={`Joined ${regDate}`} variant="outlined" />}
            </Box>
          </Box>

          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small" aria-label="Close profile drawer">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* ── Quick Connect Buttons ── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {cleanMobile && (
            <>
              <Button
                size="small"
                variant="outlined"
                component="a"
                href={`tel:+91${cleanMobile}`}
                startIcon={<PhoneOutlinedIcon fontSize="small" />}
              >
                Call
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="success"
                component="a"
                href={`https://wa.me/91${cleanMobile}`}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<WhatsAppIcon fontSize="small" />}
              >
                WhatsApp
              </Button>
            </>
          )}
          {email && (
            <Button
              size="small"
              variant="outlined"
              component="a"
              href={`mailto:${email}`}
              startIcon={<EmailOutlinedIcon fontSize="small" />}
            >
              Email
            </Button>
          )}
          {(customer.map_link || locationParts.length > 0) && (
            <Button
              size="small"
              variant="outlined"
              component="a"
              href={customer.map_link || `https://maps.google.com/?q=${encodeURIComponent(locationParts.join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LocationOnOutlinedIcon fontSize="small" />}
            >
              Map
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={() => onCopy?.(customer)}
            startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
          >
            Copy
          </Button>
        </Box>
      </Box>

      {/* ── Section Tabs ── */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
        <Tabs
          value={sectionTab}
          onChange={(_, val) => setSectionTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 42, '& .MuiTab-root': { minHeight: 42, textTransform: 'none', fontWeight: 600 } }}
        >
          <Tab value="all" label="All Details" />
          <Tab value="profile" label="Personal & Contact" />
          <Tab value="commercial" label="Commercial & Billing" />
          <Tab value="addresses" label="Addresses & Notes" />
        </Tabs>
      </Box>

      {/* ── Scrollable Content ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          {showProfile && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SectionCard icon={<PersonOutlinedIcon fontSize="small" />} title="Personal & Identity">
                  <DetailRow label="Full Name" value={name} />
                  <DetailRow
                    label="Date of Birth"
                    value={customer.date_of_birth ? `${formatDOB(customer.date_of_birth)}${age ? ` (${age} yrs)` : ''}` : null}
                  />
                  {customer.anniversary_date && (
                    <DetailRow label="Anniversary" value={formatDOB(customer.anniversary_date)} />
                  )}
                  {customer.special_occasion && (
                    <DetailRow
                      label="Special Occasion"
                      value={`${customer.special_occasion}${customer.special_occasion_date ? ` (${formatDOB(customer.special_occasion_date)})` : ''}`}
                    />
                  )}
                  <DetailRow label="Marketing Source" value={customer.marketing_source || 'Walk-in'} />
                  <DetailRow label="Referral Code" value={customer.referral_code} />
                </SectionCard>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <SectionCard icon={<ContactPhoneOutlinedIcon fontSize="small" />} title="Contact & Preferences">
                  <DetailRow label="Primary Mobile" value={formatPhoneDisplay(customer.mobile_number || customer.mobileNumber)} />
                  <DetailRow label="Alternate Phone" value={altPhone ? formatPhoneDisplay(altPhone) : null} />
                  <DetailRow label="Email" value={email} />
                  <DetailRow label="Language" value={lang} />
                  <DetailRow label="Channel" value={channelPref} />
                  <DetailRow
                    label="Notifications"
                    value={
                      <Chip
                        size="small"
                        label={customer.dnd ? 'DND Active' : 'Allowed'}
                        color={customer.dnd ? 'error' : 'success'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    }
                  />
                </SectionCard>
              </Grid>
            </Grid>
          )}

          {showCommercial && (
            <SectionCard icon={<BusinessCenterOutlinedIcon fontSize="small" />} title="Commercial & Billing">
              <DetailRow label="Company / Entity" value={company || 'Individual Account'} />
              <DetailRow label="GSTIN / Tax ID" value={gst} />
              <DetailRow
                label="Tax Exemption"
                value={
                  <Chip
                    size="small"
                    label={customer.tax_exemption ? 'Tax Exempt' : 'Standard Taxable (GST)'}
                    color={customer.tax_exemption ? 'info' : 'default'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                }
              />
              <DetailRow label="Price List Tier" value={priceList} />
              <DetailRow
                label="Default Discount"
                value={
                  customer.default_discount || customer.default_discount_pct
                    ? `${customer.default_discount || customer.default_discount_pct}% OFF`
                    : '0%'
                }
              />
              <DetailRow
                label="Credit Limit"
                value={customer.credit_limit ? `₹${Number(customer.credit_limit).toLocaleString('en-IN')}` : 'No credit limit'}
              />
            </SectionCard>
          )}

          {showAddresses && (
            <>
              <SectionCard icon={<HomeWorkOutlinedIcon fontSize="small" />} title="Addresses & Delivery Locations">
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box>
                    <Chip size="small" label="Primary Address" color="primary" variant="outlined" sx={{ mb: 0.75, height: 20 }} />
                    <Typography variant="body2" fontWeight={600}>
                      {customer.address || customer.streetArea || 'No street address recorded'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[customer.city, customer.pincode ? `PIN: ${customer.pincode}` : '']
                        .filter(Boolean)
                        .join(' • ') || '—'}
                    </Typography>
                  </Box>
                  {customer.map_link && (
                    <Button
                      size="small"
                      variant="outlined"
                      component="a"
                      href={customer.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNewIcon fontSize="small" />}
                    >
                      View Map
                    </Button>
                  )}
                </Box>

                {Array.isArray(customer.additional_addresses) && customer.additional_addresses.length > 0 && (
                  <Grid container spacing={1.5} sx={{ mt: 1 }}>
                    {customer.additional_addresses.map((addr, idx) => (
                      <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
                          <Chip
                            size="small"
                            label={addr.label || addr.addressType || `Address #${idx + 1}`}
                            sx={{ mb: 0.75, height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2" fontWeight={500}>
                            {addr.streetAddress || addr.address || addr.addressLine1}
                          </Typography>
                          {addr.landmark && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                              Landmark: {addr.landmark}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {[addr.city, addr.pincode].filter(Boolean).join(' - ')}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </SectionCard>

              {(servicePref || prefNotes || staffNotes) && (
                <SectionCard icon={<StickyNote2OutlinedIcon fontSize="small" />} title="Service Preference & Staff Notes">
                  {servicePref && (
                    <DetailRow
                      label="Service Preference"
                      value={`${servicePref}${prefNotes ? ` (${prefNotes})` : ''}`}
                    />
                  )}
                  {staffNotes && <DetailRow label="Staff Notes" value={staffNotes} />}
                </SectionCard>
              )}
            </>
          )}
        </Stack>
      </Box>

      {/* ── Footer Actions ── */}
      <Divider />
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => onDelete?.(customer)}
        >
          {t?.('btn_delete') || 'Delete'}
        </Button>
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => onEdit?.(customer)}
        >
          {t?.('btn_edit') || 'Edit Customer'}
        </Button>
      </Box>
    </Drawer>
  );
}
