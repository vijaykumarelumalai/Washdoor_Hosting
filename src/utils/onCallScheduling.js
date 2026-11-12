// src/utils/onCallScheduling.js
// Shared helpers for On-Call (Pickup) order pickup & delivery scheduling.

/**
 * Returns true when an order type / intake method represents an On-Call (Pickup) order.
 * Walk-In and other store-drop types return false.
 */
export function isOnCallOrderType(orderType) {
  const raw = String(orderType || '').trim().toLowerCase();
  if (!raw) return false;
  return raw.includes('call') || raw.includes('phone');
}

/**
 * Splits an ISO timestamp (or Date-parseable string) into local YYYY-MM-DD and HH:mm strings
 * suitable for HTML5 <input type="date"> and <input type="time">.
 */
export function splitIsoToLocalDateAndTime(isoValue) {
  if (!isoValue) return { date: '', time: '' };
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Combines local YYYY-MM-DD and HH:mm strings into an ISO 8601 UTC timestamp string.
 * Returns null if either part is missing or invalid.
 */
export function combineLocalDateAndTimeToIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dateParts = String(dateStr).split('-').map(Number);
  const timeParts = String(timeStr).split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return null;
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  if (
    !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) ||
    !Number.isFinite(hour) || !Number.isFinite(minute)
  ) {
    return null;
  }
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
}

/**
 * Formats a scheduled timestamp for read-only display (e.g. "13 Nov 2026, 10:30 AM").
 * Returns fallback ("Not scheduled") for null/legacy values.
 */
export function formatScheduledDateTime(isoValue, fallback = 'Not scheduled') {
  if (!isoValue) return fallback;
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return fallback;
  const datePart = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

/**
 * Validates On-Call pickup and delivery date/time inputs.
 *
 * For new orders (isNewOrder = true):
 *  - Pickup date & time are mandatory and must be in the future.
 *  - Delivery date & time are mandatory and must be later than pickup.
 *
 * For existing orders (isNewOrder = false):
 *  - Missing legacy values are allowed when both fields are empty.
 *  - Partial date/time entries are rejected.
 *  - Past pickup timestamps are allowed if unchanged from initialPickupIso.
 *  - If delivery is provided, pickup must be present and delivery must be later than pickup.
 */
export function validateOnCallSchedule({
  pickupDate,
  pickupTime,
  deliveryDate,
  deliveryTime,
  isNewOrder = false,
  initialPickupIso = null,
  nowMs = Date.now(),
}) {
  const errors = {};
  const hasPickupDate = Boolean(String(pickupDate || '').trim());
  const hasPickupTime = Boolean(String(pickupTime || '').trim());
  const hasDeliveryDate = Boolean(String(deliveryDate || '').trim());
  const hasDeliveryTime = Boolean(String(deliveryTime || '').trim());

  const hasAnyPickup = hasPickupDate || hasPickupTime;
  const hasAnyDelivery = hasDeliveryDate || hasDeliveryTime;

  let pickupIso = null;
  let deliveryIso = null;

  if (isNewOrder) {
    if (!hasPickupDate || !hasPickupTime) {
      errors.scheduled_pickup_at = 'Scheduled pickup date and time are required.';
    } else {
      pickupIso = combineLocalDateAndTimeToIso(pickupDate, pickupTime);
      if (!pickupIso) {
        errors.scheduled_pickup_at = 'Please enter a valid pickup date and time.';
      } else if (new Date(pickupIso).getTime() <= nowMs) {
        errors.scheduled_pickup_at = 'Scheduled pickup date & time must be in the future.';
      }
    }

    if (!hasDeliveryDate || !hasDeliveryTime) {
      errors.scheduled_delivery_at = 'Scheduled delivery date and time are required.';
    } else {
      deliveryIso = combineLocalDateAndTimeToIso(deliveryDate, deliveryTime);
      if (!deliveryIso) {
        errors.scheduled_delivery_at = 'Please enter a valid delivery date and time.';
      } else if (pickupIso && new Date(deliveryIso).getTime() <= new Date(pickupIso).getTime()) {
        errors.scheduled_delivery_at = 'Scheduled delivery must be later than scheduled pickup.';
      }
    }
  } else {
    // Existing order: allow legacy orders with no schedule, validate any entered/modified values
    if (hasAnyPickup) {
      if (!hasPickupDate || !hasPickupTime) {
        errors.scheduled_pickup_at = 'Please enter both pickup date and time.';
      } else {
        pickupIso = combineLocalDateAndTimeToIso(pickupDate, pickupTime);
        if (!pickupIso) {
          errors.scheduled_pickup_at = 'Please enter a valid pickup date and time.';
        } else {
          const initialMs = initialPickupIso ? new Date(initialPickupIso).getTime() : null;
          const nextMs = new Date(pickupIso).getTime();
          const pickupChanged = initialMs === null || Number.isNaN(initialMs) || Math.abs(nextMs - initialMs) > 59000;
          if (pickupChanged && nextMs <= nowMs) {
            errors.scheduled_pickup_at = 'Scheduled pickup date & time must be in the future.';
          }
        }
      }
    }

    if (hasAnyDelivery) {
      if (!hasDeliveryDate || !hasDeliveryTime) {
        errors.scheduled_delivery_at = 'Please enter both delivery date and time.';
      } else {
        deliveryIso = combineLocalDateAndTimeToIso(deliveryDate, deliveryTime);
        if (!deliveryIso) {
          errors.scheduled_delivery_at = 'Please enter a valid delivery date and time.';
        } else if (!pickupIso && !hasAnyPickup) {
          errors.scheduled_pickup_at = 'Scheduled pickup date & time is required before setting delivery.';
        } else if (pickupIso && new Date(deliveryIso).getTime() <= new Date(pickupIso).getTime()) {
          errors.scheduled_delivery_at = 'Scheduled delivery must be later than scheduled pickup.';
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    scheduled_pickup_at: pickupIso,
    scheduled_delivery_at: deliveryIso,
  };
}
