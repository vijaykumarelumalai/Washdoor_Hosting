import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  CheckCircleOutlineRounded,
  DeleteOutlineRounded,
  ExpandMoreRounded,
  RadioButtonUncheckedRounded,
} from '@mui/icons-material';
import { validateCustomer } from '../utils/validation';

export const MAX_ADDITIONAL_ADDRESSES = 5;
export const ADDRESS_LABELS = ['Home', 'Office', 'Other'];

const PRIMARY = '#2563EB';
const PRIMARY_DARK = '#1D4ED8';
const PRIMARY_LIGHT = '#EFF6FF';
const BORDER = '#DBE4F0';
const TEXT = '#0F172A';
const MUTED = '#64748B';

const FIELD_SX = {
  bgcolor: '#ffffff',
  '& fieldset': { borderColor: BORDER },
  '&:hover fieldset': { borderColor: '#94A3B8' },
  '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
  '& .MuiInputBase-input': { py: '7px', fontSize: '0.8125rem', lineHeight: 1.5 },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
  '& .MuiSelect-select': { py: '7px', fontSize: '0.8125rem' },
};

const SHRINK_LABEL = { shrink: true };

let addressSequence = 0;

const nextAddressId = () => `addr_${Date.now()}_${++addressSequence}`;

const stringValue = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeLabel = (value) => {
  const raw = stringValue(value).toLowerCase();
  return ADDRESS_LABELS.find((label) => label.toLowerCase() === raw) || 'Home';
};

export const createAdditionalAddress = () => ({
  id: nextAddressId(),
  label: 'Home',
  addressLine: '',
  city: '',
  pincode: '',
  mapLink: '',
  altPhone: '',
});

export const normalizeAdditionalAddresses = (value) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ADDITIONAL_ADDRESSES).map((address) => ({
    id: stringValue(address?.id || address?.address_id || address?.customer_address_id, nextAddressId()),
    label: normalizeLabel(address?.label || address?.address_label),
    addressLine: stringValue(address?.addressLine || address?.address_line || address?.streetAddress || address?.street_address),
    city: stringValue(address?.city),
    pincode: stringValue(address?.pincode),
    mapLink: stringValue(address?.mapLink || address?.map_link),
    altPhone: stringValue(address?.altPhone || address?.alternate_phone),
  }));
};

export const isBlankAddress = (address) => ![
  address?.addressLine,
  address?.city,
  address?.pincode,
  address?.mapLink,
  address?.altPhone,
].some((value) => stringValue(value));

const addressSignature = (address) => [
  stringValue(address?.addressLine).toLowerCase().replace(/\s+/g, ' '),
  stringValue(address?.city).toLowerCase().replace(/\s+/g, ' '),
  stringValue(address?.pincode),
  stringValue(address?.mapLink).toLowerCase(),
  stringValue(address?.altPhone).replace(/\D/g, ''),
].join('|');

export const compactAdditionalAddresses = (value) => {
  const seen = new Set();
  return normalizeAdditionalAddresses(value).filter((address) => {
    if (isBlankAddress(address)) return false;
    const signature = addressSignature(address);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

export const validateAdditionalAddresses = (value) => {
  const errors = {};
  const seen = new Set();

  compactAdditionalAddresses(value).forEach((address) => {
    const addressErrors = {};
    if (!stringValue(address.addressLine)) addressErrors.addressLine = 'Address line is required.';
    if (!ADDRESS_LABELS.includes(address.label)) addressErrors.label = 'Select Home, Office, or Other.';

    const baseErrors = validateCustomer({
      customer_name: 'Additional address',
      mobile_number: '9999999999',
      alternate_phone: address.altPhone,
      pincode: address.pincode,
      map_link: address.mapLink,
    });
    if (baseErrors.alternate_phone) addressErrors.altPhone = baseErrors.alternate_phone;
    if (baseErrors.pincode) addressErrors.pincode = baseErrors.pincode;
    if (baseErrors.map_link) addressErrors.mapLink = baseErrors.map_link;

    const signature = addressSignature(address);
    if (seen.has(signature)) addressErrors.duplicate = 'This address is already saved.';
    seen.add(signature);

    if (Object.keys(addressErrors).length > 0) errors[address.id] = addressErrors;
  });

  return errors;
};

export const formatAddressForOrder = (address) => {
  if (!address) return '';
  const parts = [
    stringValue(address.addressLine || address.address_line),
    stringValue(address.city),
    stringValue(address.pincode),
  ].filter(Boolean);
  const label = normalizeLabel(address.label || address.address_label);
  return parts.length > 0 ? `${label}: ${parts.join(', ')}` : '';
};

export const toStoredAdditionalAddresses = (value) => compactAdditionalAddresses(value).map((address) => ({
  id: address.id,
  address_id: address.id,
  label: address.label,
  address_label: address.label,
  addressLine: address.addressLine,
  address_line: address.addressLine,
  city: address.city,
  pincode: address.pincode,
  mapLink: address.mapLink,
  map_link: address.mapLink,
  altPhone: address.altPhone,
  alternate_phone: address.altPhone,
}));

export default function OrdersV2AddressManager({
  value = [],
  onChange,
  selectedId,
  onSelect,
  showErrors = false,
  addLabel,
  savedLabel,
  hideSavedLabel,
  showAddIcon = true,
  compact = false,
  inspectId,
}) {
  const [expanded, setExpanded] = useState(false);
  const [openCards, setOpenCards] = useState(() => new Set());
  const addresses = useMemo(() => normalizeAdditionalAddresses(value), [value]);
  const errors = useMemo(
    () => (showErrors ? validateAdditionalAddresses(addresses) : {}),
    [addresses, showErrors],
  );

  const patchAddress = (id, patch) => {
    onChange?.(addresses.map((address) => (address.id === id ? { ...address, ...patch } : address)));
  };

  const addAddress = () => {
    if (addresses.length >= MAX_ADDITIONAL_ADDRESSES) return;
    const address = createAdditionalAddress();
    onChange?.([...addresses, address]);
    onSelect?.(address.id);
    setExpanded(true);
    setOpenCards((previous) => new Set(previous).add(address.id));
  };

  const removeAddress = (id) => {
    const next = addresses.filter((address) => address.id !== id);
    onChange?.(next);
    if (selectedId === id) onSelect?.(null);
    setOpenCards((previous) => {
      const copy = new Set(previous);
      copy.delete(id);
      return copy;
    });
  };

  const toggleCard = (id) => {
    setOpenCards((previous) => {
      const copy = new Set(previous);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  return (
    <Box
      className={compact ? 'orders-v2-inline-address-manager' : undefined}
      data-inspect={inspectId}
      sx={{
        mt: compact ? 1 : 1.25,
        pt: compact ? 0 : 1.25,
        borderTop: compact ? 'none' : `1px dashed ${BORDER}`,
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        flexWrap: compact ? 'nowrap' : 'wrap',
        alignItems: compact ? 'stretch' : 'center',
        gap: compact ? 1.5 : 0,
        width: compact ? '100%' : 'auto',
        minWidth: 0,
      }}
    >
      <Box
        className={compact ? 'orders-v2-inline-address-actions' : undefined}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: compact ? 1.5 : 0,
          width: compact ? '100%' : 'auto',
          minWidth: 0,
        }}
      >
        <Button
          type="button"
          size="small"
          variant="outlined"
          startIcon={showAddIcon ? <AddRounded sx={{ fontSize: 16 }} /> : null}
          onClick={addAddress}
          disabled={addresses.length >= MAX_ADDITIONAL_ADDRESSES}
          sx={{
            flex: '0 0 auto',
            textTransform: 'none',
            fontSize: '0.76rem',
            fontWeight: 700,
            borderColor: PRIMARY,
            color: PRIMARY_DARK,
            bgcolor: '#fff',
            minHeight: compact ? 30 : 32,
            '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY },
          }}
        >
          {addLabel || `+ Add Additional Address (${addresses.length}/${MAX_ADDITIONAL_ADDRESSES})`}
        </Button>

        {addresses.length > 0 ? (
          <Button
            type="button"
            size="small"
            onClick={() => setExpanded((previous) => !previous)}
            endIcon={(
              <ExpandMoreRounded
                sx={{ fontSize: 16, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
              />
            )}
            sx={{ ml: compact ? 0 : 1, textTransform: 'none', fontSize: '0.74rem', fontWeight: 700, color: MUTED }}
          >
            {expanded
              ? (hideSavedLabel || 'Hide saved addresses')
              : (savedLabel || `Show saved addresses (${addresses.length})`)}
          </Button>
        ) : null}
      </Box>

      {addresses.length >= MAX_ADDITIONAL_ADDRESSES ? (
        <Typography className="orders-v2-inline-address-limit" sx={{ mt: 0.75, fontSize: '0.7rem', color: MUTED }}>
          Maximum {MAX_ADDITIONAL_ADDRESSES} additional addresses reached.
        </Typography>
      ) : null}

      {expanded ? (
        <Box
          className={compact ? 'orders-v2-inline-address-cards' : undefined}
          data-inspect={compact ? 'inline-customer-address-cards' : undefined}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            alignItems: 'start',
            gap: compact ? '12px' : 1,
            width: '100%',
            minWidth: 0,
            mt: compact ? 0 : 1.25,
          }}
        >
          {addresses.map((address, index) => {
            const isSelected = selectedId === address.id;
            const cardErrors = errors[address.id] || {};
            const isCardOpen = openCards.has(address.id);
            return (
              <Box
                key={address.id}
                className={compact ? 'orders-v2-inline-address-card' : undefined}
                sx={{
                  alignSelf: 'start',
                  height: 'auto',
                  minHeight: 0,
                  maxHeight: 'none',
                  border: `1px solid ${isSelected ? PRIMARY : BORDER}`,
                  bgcolor: isSelected ? PRIMARY_LIGHT : '#fff',
                  borderRadius: '10px',
                  overflow: 'visible',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5 }}>
                  <Tooltip title={isSelected ? 'Selected order address' : 'Use this address for the order'}>
                    <IconButton size="small" onClick={() => onSelect?.(address.id)} sx={{ color: isSelected ? PRIMARY : '#94A3B8' }}>
                      {isSelected ? <CheckCircleOutlineRounded sx={{ fontSize: 18 }} /> : <RadioButtonUncheckedRounded sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </Tooltip>
                  <Typography
                    sx={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 800, color: TEXT }}
                    noWrap
                    onClick={() => onSelect?.(address.id)}
                  >
                    {address.label} {index + 1}
                    {address.addressLine ? ` • ${address.addressLine}` : ' • New address'}
                  </Typography>
                  <IconButton size="small" onClick={() => toggleCard(address.id)} sx={{ color: MUTED }}>
                    <ExpandMoreRounded sx={{ fontSize: 18, transform: isCardOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                  </IconButton>
                  <Tooltip title="Remove address">
                    <IconButton size="small" onClick={() => removeAddress(address.id)} sx={{ color: '#DC2626' }}>
                      <DeleteOutlineRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {isCardOpen ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25, px: 1.25, pb: 1.25 }}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Address Label"
                      value={address.label}
                      onChange={(event) => patchAddress(address.id, { label: event.target.value })}
                      error={Boolean(cardErrors.label)}
                      helperText={cardErrors.label || ''}
                      InputLabelProps={SHRINK_LABEL}
                      sx={FIELD_SX}
                    >
                      {ADDRESS_LABELS.map((label) => (
                        <MenuItem key={label} value={label}>{label}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      fullWidth
                      label="Address Line"
                      value={address.addressLine}
                      onChange={(event) => patchAddress(address.id, { addressLine: event.target.value })}
                      error={Boolean(cardErrors.addressLine)}
                      helperText={cardErrors.addressLine || ''}
                      InputLabelProps={SHRINK_LABEL}
                      sx={FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="City"
                      value={address.city}
                      onChange={(event) => patchAddress(address.id, { city: event.target.value })}
                      InputLabelProps={SHRINK_LABEL}
                      sx={FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Pincode"
                      value={address.pincode}
                      onChange={(event) => patchAddress(address.id, { pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                      error={Boolean(cardErrors.pincode)}
                      helperText={cardErrors.pincode || ''}
                      InputLabelProps={SHRINK_LABEL}
                      sx={FIELD_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Map Link"
                      value={address.mapLink}
                      onChange={(event) => patchAddress(address.id, { mapLink: event.target.value })}
                      error={Boolean(cardErrors.mapLink)}
                      helperText={cardErrors.mapLink || ''}
                      InputLabelProps={SHRINK_LABEL}
                      sx={{ ...FIELD_SX, gridColumn: '1 / -1' }}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Alternative Phone Number"
                      value={address.altPhone}
                      onChange={(event) => patchAddress(address.id, { altPhone: event.target.value.replace(/[^\d\s+()-]/g, '') })}
                      error={Boolean(cardErrors.altPhone)}
                      helperText={cardErrors.altPhone || ''}
                      InputLabelProps={SHRINK_LABEL}
                      sx={FIELD_SX}
                    />
                    {cardErrors.duplicate ? (
                      <Typography sx={{ gridColumn: '1 / -1', fontSize: '0.72rem', color: '#DC2626' }}>
                        {cardErrors.duplicate}
                      </Typography>
                    ) : null}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
