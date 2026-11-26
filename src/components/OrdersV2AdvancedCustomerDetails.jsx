import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  CreditCardOutlined,
  ExpandMore,
  LocalPhoneOutlined,
  PeopleAltOutlined,
  ReceiptLongOutlined,
  StorefrontOutlined,
} from '@mui/icons-material';
import { searchCustomers } from '../services/customerService';
import { validateCustomer } from '../utils/validation';
import { combineLocalDateAndTimeToIso, formatScheduledDateTime } from '../utils/onCallScheduling';
import '../styles/OrdersV2AdvancedCustomerDetails.css';

const PRIMARY = '#2563EB';
const PRIMARY_DARK = '#1D4ED8';
const BORDER = '#DBE4F0';
const TEXT = '#0F172A';
const MUTED = '#64748B';

export const ADVANCED_FIELD_SX = {
  '& .MuiInputBase-root': {
    minHeight: '40px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: BORDER,
    borderRadius: '8px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#93C5FD',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: PRIMARY,
    borderWidth: '1.5px',
  },
  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: '#EF4444',
  },
  '& .MuiInputBase-input': {
    py: '8px',
    fontSize: '14px',
    lineHeight: '20px',
  },
  '& .MuiSelect-select': {
    py: '8px',
    fontSize: '14px',
    lineHeight: '20px',
  },
  '& .MuiInputBase-input::placeholder, & .MuiInputBase-inputMultiline::placeholder': {
    color: '#94A3B8',
    fontSize: '14px',
    opacity: 1,
  },
};

export const INITIAL_ADVANCED_FIELDS = {
  company_name: '',
  gst_number: '',
  alternate_phone: '',
  email: '',
  city: '',
  pincode: '',
  date_of_birth: '',
  map_link: '',
  communication_pref: 'WhatsApp',
  communication_lang: 'English',
  dnd: false,
  internal_comments: '',
  customer_classification: 'Regular Customer',
  customer_status: 'Active',
  price_list: 'Standard',
  service_zone: 'Zone 1',
  order_preference: 'Laundry',
  marketing_source: 'Walk-in',
  default_discount: 0,
  referral_code: '',
  membership_id: '',
  credit_limit: '',
  notes: '',
};

export const INITIAL_ADVANCED_SECTIONS = {
  business: false,
  communication: false,
  profile: false,
  customer: false,
  review: false,
};

export const COMMUNICATION_PREF_OPTIONS = [
  { value: 'WhatsApp', aliases: ['whatsapp', 'wa'] },
  { value: 'SMS', aliases: ['sms'] },
  { value: 'Email', aliases: ['email'] },
  { value: 'Phone call', aliases: ['phone', 'phone call', 'phone_call'] },
  { value: 'None (DND)', aliases: ['none', 'dnd', 'no communication (dnd)'] },
];

export const COMMUNICATION_LANGUAGE_OPTIONS = [
  { value: 'English', aliases: ['en', 'english'] },
  { value: 'Tamil', aliases: ['ta', 'tamil'] },
  { value: 'Hindi', aliases: ['hi', 'hindi'] },
  { value: 'Telugu', aliases: ['te', 'telugu'] },
  { value: 'Kannada', aliases: ['kn', 'kannada'] },
  { value: 'Malayalam', aliases: ['ml', 'malayalam'] },
];

export const CLASSIFICATION_OPTIONS = [
  { value: 'Regular Customer', aliases: ['regular', 'regular customer'] },
  { value: 'VIP Customer', aliases: ['vip', 'vip customer'] },
  { value: 'Corporate Customer', aliases: ['corporate', 'corporate customer'] },
  { value: 'Fraud / Review Required', aliases: ['fraud', 'fraud / review', 'fraud / review required'] },
];

export const CUSTOMER_STATUS_OPTIONS = [
  { value: 'Active', aliases: ['active'] },
  { value: 'Inactive', aliases: ['inactive'] },
  { value: 'Archived', aliases: ['archived'] },
];

export const SERVICE_ZONE_OPTIONS = [
  { value: 'Zone 1', aliases: ['zone-1', 'zone 1'] },
  { value: 'Zone 2', aliases: ['zone-2', 'zone 2'] },
  { value: 'Zone 3', aliases: ['zone-3', 'zone 3'] },
  { value: 'Outside service zone', aliases: ['outside-zone', 'outside service zone'] },
];

export const PRICE_LIST_OPTIONS = [
  { value: 'Standard', aliases: ['standard'] },
  { value: 'Premium', aliases: ['premium'] },
  { value: 'Wholesale', aliases: ['wholesale'] },
  { value: 'Corporate', aliases: ['corporate'] },
];

export const MARKETING_SOURCE_OPTIONS = [
  { value: 'Walk-in', aliases: ['walk-in', 'walk in'] },
  { value: 'Google', aliases: ['google'] },
  { value: 'Instagram', aliases: ['instagram'] },
  { value: 'Word of Mouth', aliases: ['word of mouth'] },
  { value: 'Pamphlet', aliases: ['pamphlet'] },
];

const stringValue = (value, fallback = '') => (
  value === undefined || value === null || value === '' ? fallback : String(value)
);

const normalizeChoice = (value, options, fallback) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  const matched = options.find((option) => [option.value, ...(option.aliases || [])]
    .some((candidate) => String(candidate).trim().toLowerCase() === raw));
  return matched ? matched.value : fallback;
};

export const normalizeAdvancedFields = (customer) => ({
  ...INITIAL_ADVANCED_FIELDS,
  company_name: stringValue(customer?.company_name),
  gst_number: stringValue(customer?.gst_number),
  alternate_phone: stringValue(customer?.alternate_phone),
  email: stringValue(customer?.email),
  city: stringValue(customer?.city),
  pincode: stringValue(customer?.pincode),
  date_of_birth: stringValue(customer?.date_of_birth),
  map_link: stringValue(customer?.map_link),
  communication_pref: normalizeChoice(
    customer?.communication_pref || customer?.communicationPreference || (customer?.dnd ? 'None (DND)' : ''),
    COMMUNICATION_PREF_OPTIONS,
    customer?.dnd ? 'None (DND)' : 'WhatsApp',
  ),
  communication_lang: normalizeChoice(
    customer?.communication_lang || customer?.preferredCommunicationLanguage || customer?.preferred_language,
    COMMUNICATION_LANGUAGE_OPTIONS,
    'English',
  ),
  dnd: Boolean(customer?.dnd),
  internal_comments: stringValue(customer?.internal_comments || customer?.notes),
  customer_classification: normalizeChoice(customer?.customer_classification, CLASSIFICATION_OPTIONS, 'Regular Customer'),
  customer_status: normalizeChoice(customer?.customer_status, CUSTOMER_STATUS_OPTIONS, 'Active'),
  price_list: normalizeChoice(customer?.price_list, PRICE_LIST_OPTIONS, 'Standard'),
  service_zone: normalizeChoice(customer?.service_zone || customer?.area_service_zone, SERVICE_ZONE_OPTIONS, 'Zone 1'),
  order_preference: stringValue(customer?.order_preference || customer?.service_category || customer?.preference, 'Laundry'),
  marketing_source: normalizeChoice(customer?.marketing_source, MARKETING_SOURCE_OPTIONS, 'Walk-in'),
  default_discount: customer?.default_discount ?? customer?.default_discount_pct ?? 0,
  referral_code: stringValue(customer?.referral_code),
  membership_id: stringValue(customer?.membership_id),
  credit_limit: customer?.credit_limit ?? '',
  notes: stringValue(customer?.notes),
});

export const getAdvancedErrors = (fields = {}) => {
  const errors = {};
  const baseErrors = validateCustomer({
    customer_name: 'Advanced customer check',
    mobile_number: '9999999999',
    ...fields,
  });

  ['alternate_phone', 'email', 'pincode', 'map_link'].forEach((key) => {
    if (baseErrors[key]) errors[key] = baseErrors[key];
  });

  if (fields.default_discount !== '' && fields.default_discount !== null && fields.default_discount !== undefined) {
    const discount = Number(fields.default_discount);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      errors.default_discount = 'Default discount must be between 0 and 100.';
    }
  }

  if (fields.credit_limit !== '' && fields.credit_limit !== null && fields.credit_limit !== undefined) {
    const creditLimit = Number(fields.credit_limit);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      errors.credit_limit = 'Credit limit cannot be negative.';
    }
  }

  return errors;
};

export const getAdvancedSectionForField = (field) => {
  if (['company_name', 'gst_number', 'alternate_phone', 'email', 'city', 'pincode', 'date_of_birth', 'map_link'].includes(field)) return 'business';
  if (['communication_pref', 'communication_lang', 'internal_comments', 'notes'].includes(field)) return 'communication';
  if (['customer_classification', 'customer_status', 'service_zone', 'price_list', 'credit_limit'].includes(field)) return 'profile';
  return 'customer';
};

export const getChangedAdvancedPayload = (fields = {}, baseline = {}) => {
  const changed = {};
  Object.keys(fields).forEach((key) => {
    if (String(fields[key] ?? '') !== String(baseline[key] ?? '')) {
      changed[key] = fields[key];
    }
  });
  if (changed.default_discount !== undefined) changed.default_discount = Number(changed.default_discount) || 0;
  if (changed.credit_limit !== undefined) changed.credit_limit = Number(changed.credit_limit) || 0;
  if (changed.dnd !== undefined) changed.dnd = Boolean(changed.dnd);
  return changed;
};

export const getCustomerPricingDiscount = (fields = {}) => (
  Math.max(0, Math.min(100, Number(fields.default_discount) || 0))
);

export const buildAdvancedReviewLines = ({
  customerName,
  address,
  onCall,
  staff,
  itemCount,
  pickupDate,
  pickupTime,
  deliveryDate,
  deliveryTime,
}) => [
  `Customer: ${customerName || 'Not set'}`,
  `Address: ${address || 'Not set'}`,
  `Order type: ${onCall ? 'On-Call' : 'Walk-In'}`,
  `Staff: ${staff || 'Counter Staff'}`,
  `Items: ${itemCount}`,
  `Scheduled pickup: ${onCall ? formatScheduledDateTime(combineLocalDateAndTimeToIso(pickupDate, pickupTime)) : 'Not required'}`,
  `Delivery: ${formatScheduledDateTime(combineLocalDateAndTimeToIso(deliveryDate, deliveryTime))}`,
];

const idKey = (value) => String(value ?? '').trim().toLowerCase();
const phoneKey = (value) => String(value ?? '').replace(/\D/g, '').slice(-10);

export const findMatchingCustomer = (records, customerId, mobileNumber) => {
  const list = Array.isArray(records) ? records : [];
  const targetId = idKey(customerId);
  const targetPhone = phoneKey(mobileNumber);

  if (targetId) {
    const exact = list.find((candidate) => [
      candidate?.customer_id,
      candidate?.customerId,
      candidate?.customer_code,
      candidate?.id,
      candidate?.db_id,
    ].some((value) => idKey(value) === targetId));
    if (exact) return exact;
  }

  if (targetPhone) {
    const byPhone = list.find((candidate) => phoneKey(candidate?.mobile_number || candidate?.mobileNumber) === targetPhone);
    if (byPhone) return byPhone;
  }

  return null;
};

export const loadAdvancedCustomerProfile = async ({ customerId, mobileNumber }) => {
  const queries = [customerId, mobileNumber].filter((value) => String(value ?? '').trim());
  const collected = [];
  for (const query of queries) {
    try {
      const { data } = await searchCustomers(query);
      if (Array.isArray(data)) collected.push(...data);
    } catch {}
  }
  return findMatchingCustomer(collected, customerId, mobileNumber);
};

function AdvancedTextField({ label, required = false, sx, id, slotProps, inputProps, size = 'small', fullWidth = true, ...props }) {
  const generatedId = React.useId();
  const fieldId = id || `orders-v2-advanced-${generatedId.replace(/:/g, '')}`;
  const labelId = `${fieldId}-label`;
  const { gridColumn, ...fieldSx } = sx || {};
  const htmlInputProps = { 'aria-labelledby': labelId, ...inputProps, ...slotProps?.htmlInput };

  return (
    <Box className="orders-v2-advanced-field" sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, gridColumn }}>
      <Typography component="label" id={labelId} htmlFor={fieldId} className="orders-v2-advanced-field-label">
        {label}
        {required ? <span className="orders-v2-advanced-field-required">*</span> : null}
      </Typography>
      <TextField
        {...props}
        id={fieldId}
        size={size}
        fullWidth={fullWidth}
        slotProps={{
          ...slotProps,
          htmlInput: htmlInputProps,
          select: { 'aria-labelledby': labelId, ...slotProps?.select },
        }}
        sx={{ ...ADVANCED_FIELD_SX, ...fieldSx }}
      />
    </Box>
  );
}

function AdvancedSection({ icon, title, section, expanded, onSectionChange, children }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={Boolean(expanded)}
      onChange={(_, isExpanded) => onSectionChange?.(section, isExpanded)}
      data-section={section}
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
        {icon}
        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: TEXT }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 2,
  minWidth: 0,
};

export default function OrdersV2AdvancedCustomerDetails({
  fields,
  errors = {},
  sections = INITIAL_ADVANCED_SECTIONS,
  onChange,
  onSectionChange,
  orderPreferenceOptions = ['Laundry'],
  reviewLines = [],
  onApplyPricing,
}) {
  const handleChange = (patch) => onChange?.(patch);

  return (
    <Box className="orders-v2-advanced-customer-details" data-inspect="advanced-customer-details">
      <AdvancedSection
        section="business"
        icon={<StorefrontOutlined sx={{ fontSize: 20, color: PRIMARY }} />}
        title="Business Details"
        expanded={sections.business}
        onSectionChange={onSectionChange}
      >
        <Box sx={GRID_SX}>
          <AdvancedTextField
            label="Company Name"
            value={fields.company_name}
            onChange={(event) => handleChange({ company_name: event.target.value })}
          />
          <AdvancedTextField
            label="GST Number"
            value={fields.gst_number}
            onChange={(event) => handleChange({ gst_number: event.target.value })}
          />
          <AdvancedTextField
            label="Alternate Phone"
            value={fields.alternate_phone}
            onChange={(event) => handleChange({ alternate_phone: event.target.value })}
            error={Boolean(errors.alternate_phone)}
            helperText={errors.alternate_phone || ''}
          />
          <AdvancedTextField
            label="Email"
            type="email"
            value={fields.email}
            onChange={(event) => handleChange({ email: event.target.value })}
            error={Boolean(errors.email)}
            helperText={errors.email || ''}
          />
          <AdvancedTextField
            label="City"
            value={fields.city}
            onChange={(event) => handleChange({ city: event.target.value })}
          />
          <AdvancedTextField
            label="Pincode"
            value={fields.pincode}
            onChange={(event) => handleChange({ pincode: event.target.value })}
            error={Boolean(errors.pincode)}
            helperText={errors.pincode || ''}
          />
          <AdvancedTextField
            type="date"
            label="Date of Birth"
            value={fields.date_of_birth}
            onChange={(event) => handleChange({ date_of_birth: event.target.value })}
          />
          <AdvancedTextField
            label="Map Link"
            value={fields.map_link}
            onChange={(event) => handleChange({ map_link: event.target.value })}
            error={Boolean(errors.map_link)}
            helperText={errors.map_link || ''}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      </AdvancedSection>

      <AdvancedSection
        section="communication"
        icon={<LocalPhoneOutlined sx={{ fontSize: 20, color: PRIMARY }} />}
        title="Communication Preferences"
        expanded={sections.communication}
        onSectionChange={onSectionChange}
      >
        <Box sx={GRID_SX}>
          <AdvancedTextField
            select
            label="Communication Preference"
            value={fields.communication_pref}
            onChange={(event) => handleChange({
              communication_pref: event.target.value,
              dnd: event.target.value === 'None (DND)',
            })}
          >
            {COMMUNICATION_PREF_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value === 'None (DND)' ? 'No communication (DND)' : option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            select
            label="Preferred Communication Language"
            value={fields.communication_lang}
            onChange={(event) => handleChange({ communication_lang: event.target.value })}
          >
            {COMMUNICATION_LANGUAGE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            multiline
            minRows={2}
            label="Internal Comments (staff only)"
            value={fields.internal_comments}
            onChange={(event) => handleChange({ internal_comments: event.target.value })}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      </AdvancedSection>

      <AdvancedSection
        section="profile"
        icon={<PeopleAltOutlined sx={{ fontSize: 20, color: PRIMARY }} />}
        title="Profile & Services Setting"
        expanded={sections.profile}
        onSectionChange={onSectionChange}
      >
        <Box sx={GRID_SX}>
          <AdvancedTextField
            select
            label="Customer Classification"
            value={fields.customer_classification}
            onChange={(event) => handleChange({ customer_classification: event.target.value })}
          >
            {CLASSIFICATION_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            select
            label="Customer Status"
            value={fields.customer_status}
            onChange={(event) => handleChange({ customer_status: event.target.value })}
          >
            {CUSTOMER_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            select
            label="Area Service Zone"
            value={fields.service_zone}
            onChange={(event) => handleChange({ service_zone: event.target.value })}
          >
            {SERVICE_ZONE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            select
            label="Specific Price List"
            value={fields.price_list}
            onChange={(event) => handleChange({ price_list: event.target.value })}
          >
            {PRICE_LIST_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            type="number"
            label="Credit Limit (₹)"
            value={fields.credit_limit}
            onChange={(event) => handleChange({ credit_limit: event.target.value })}
            inputProps={{ min: 0, step: '100' }}
            error={Boolean(errors.credit_limit)}
            helperText={errors.credit_limit || 'Approved credit limit for postpaid customer orders.'}
          />
        </Box>
      </AdvancedSection>

      <AdvancedSection
        section="customer"
        icon={<CreditCardOutlined sx={{ fontSize: 20, color: PRIMARY }} />}
        title="Customer & Membership"
        expanded={sections.customer}
        onSectionChange={onSectionChange}
      >
        <Box sx={GRID_SX}>
          <AdvancedTextField
            label="Membership ID (optional)"
            value={fields.membership_id}
            onChange={(event) => handleChange({ membership_id: event.target.value })}
          />
          <AdvancedTextField
            select
            label="Order Preference"
            value={fields.order_preference}
            onChange={(event) => handleChange({ order_preference: event.target.value })}
          >
            {orderPreferenceOptions.map((service) => (
              <MenuItem key={service} value={service}>{service}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            select
            label="Marketing Source"
            value={fields.marketing_source}
            onChange={(event) => handleChange({ marketing_source: event.target.value })}
          >
            {MARKETING_SOURCE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.value}</MenuItem>
            ))}
          </AdvancedTextField>
          <AdvancedTextField
            type="number"
            label="Default Discount (%)"
            value={fields.default_discount}
            onChange={(event) => handleChange({ default_discount: event.target.value })}
            inputProps={{ min: 0, max: 100, step: '0.01' }}
            error={Boolean(errors.default_discount)}
            helperText={errors.default_discount || ''}
          />
          <AdvancedTextField
            label="Referral Code (optional)"
            value={fields.referral_code}
            onChange={(event) => handleChange({ referral_code: event.target.value })}
          />
          <AdvancedTextField
            multiline
            minRows={2}
            label="Customer Notes"
            value={fields.notes}
            onChange={(event) => handleChange({ notes: event.target.value })}
            sx={{ gridColumn: '1 / -1' }}
          />
          <Typography sx={{ gridColumn: '1 / -1', fontSize: '0.74rem', color: MUTED, lineHeight: 1.45 }}>
            Customer pricing is stored on the customer and kept separate from the manual order discount. Changing Price List or Default Discount recalculates this cart only while it still uses the customer default; use Apply customer pricing after editing the order discount manually.
          </Typography>
          <Button
            type="button"
            size="small"
            variant="outlined"
            onClick={onApplyPricing}
            sx={{ gridColumn: '1 / -1', justifySelf: 'start', textTransform: 'none', borderColor: PRIMARY, color: PRIMARY_DARK, fontWeight: 700, fontSize: '0.76rem' }}
          >
            Apply customer pricing to cart
          </Button>
        </Box>
      </AdvancedSection>

      <AdvancedSection
        section="review"
        icon={<ReceiptLongOutlined sx={{ fontSize: 20, color: PRIMARY }} />}
        title="Review & Actions"
        expanded={sections.review}
        onSectionChange={onSectionChange}
      >
        <Box sx={{ display: 'grid', gap: 1 }}>
          {reviewLines.map((line) => (
            <Box key={line} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CheckCircleOutlined sx={{ fontSize: 15, color: '#16A34A' }} />
              <Typography sx={{ fontSize: '0.76rem', color: MUTED }}>{line}</Typography>
            </Box>
          ))}
        </Box>
      </AdvancedSection>
    </Box>
  );
}