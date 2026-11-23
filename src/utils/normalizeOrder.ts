// src/utils/normalizeOrder.ts
// Single source of truth for normalizing Supabase order rows into a consistent Order shape.
// Never throws on null/undefined input. Numbers default to 0, strings to ''.

export interface OrderItem {
  name: string;
  qty: number;
  serviceType: string;
}

export interface NormalizedOrder {
  id: number | string;
  order_number: string;
  customer_name: string;
  mobile_number: string;
  address: string;
  service_category: string;
  service_type: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  payment_status: string;
  payment_method: string;
  order_status: string;
  status: string;
  created_at: string | Date;
  expected_delivery: string | Date;
  assigned_driver: string;
  assigned_staff: string;
  attend_staff_id: string | null;
  attend_staff_name: string;
  assigned_pickup_person_id: string | null;
  assigned_pickup_delivery_person: string;
  comments: string;
  special_instructions: string;
  activity_history?: any[];
  audit_logs?: any[];
  logs?: any[];
  payment_history?: any[];
  paymentHistory?: any[];
  payments?: any[];
}

export const stripAddressTag = (rawAddress: unknown): string => {
  if (!rawAddress || typeof rawAddress !== 'string') return '';
  return rawAddress.replace(/^(?:(?:Home|Office|Other)\s*:\s*)+/gi, '').trim();
};

export const sanitizeAddress = (rawAddress: unknown): string => {
  if (!rawAddress || typeof rawAddress !== 'string') return '';
  const trimmed = rawAddress.trim();
  const match = trimmed.match(/^((?:(?:Home|Office|Other)\s*:\s*)+)(.*)$/i);
  if (!match) return trimmed;
  const tags = match[1].match(/Home|Office|Other/gi) || [];
  const firstTag = tags[0] || 'Home';
  const primaryTag = firstTag.charAt(0).toUpperCase() + firstTag.slice(1).toLowerCase();
  const cleanBody = match[2].trim();
  return cleanBody ? `${primaryTag}: ${cleanBody}` : '';
};

const num = (v: unknown): number => (v == null || v === undefined ? 0 : Number(v) || 0);
const str = (v: unknown): string => (v == null || v === undefined ? '' : String(v));

export const normalizeOrder = (order: unknown): NormalizedOrder => {
  if (!order || typeof order !== 'object') {
    return emptyOrder();
  }

  const o = order as Record<string, unknown>;
  const customer = (o.customer && typeof o.customer === 'object') ? (o.customer as Record<string, unknown>) : {};

  const rawItems =
    Array.isArray(o.items) ? o.items :
    Array.isArray(o.services_allocated) ? o.services_allocated :
    Array.isArray(o.services) ? o.services :
    [];

  const items: OrderItem[] = rawItems
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const item = it as Record<string, unknown>;
      return {
        name: str(item.name || item.service || item.serviceType || ''),
        qty: num(item.qty || item.count || 1),
        serviceType: str(item.serviceType || item.service || item.category || 'Laundry'),
      };
    });

  const subtotal = num(o.subtotal || o.subtotal_amount || 0);
  const taxAmount = num(o.tax_amount || o.tax || 0);
  const totalAmount = num(o.total_amount || o.grand_total || o.bill_amount || subtotal + taxAmount);
  const advancePaid = num(o.advance_paid || o.advancePaid || 0);
  const balanceDue = (totalAmount > 0 && advancePaid >= totalAmount) ? 0 : num(o.balance_due != null ? o.balance_due : (o.balance != null ? o.balance : Math.max(0, totalAmount - advancePaid)));

  return {
    id: num(o.id) || str(o.id || o.order_number || o.work_number || 0),
    order_number: str(o.order_number || o.work_number || o.id || ''),
    customer_name: str(o.customer_name || o.customer_name_full || customer.name || 'Walk-in Customer'),
    mobile_number: str(o.mobile_number || o.formatted_mobile || customer.mobile_number || customer.phone || ''),
    address: sanitizeAddress(str(o.address || o.delivery_address || customer.address || 'Counter Walk-In')) || 'Counter Walk-In',
    service_category: str(o.service_category || o.service_type || 'Laundry'),
    service_type: str(o.service_type || o.service_category || 'Laundry'),
    items,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    advance_paid: advancePaid,
    balance_due: balanceDue,
    payment_status: str(
      (() => {
        if (totalAmount > 0 && advancePaid <= 0) {
          return 'Unpaid / Pay on Delivery';
        }
        if ((totalAmount > 0 && advancePaid >= totalAmount) || (balanceDue <= 0 && (advancePaid > 0 || totalAmount > 0))) {
          return 'Paid in Full';
        }
        if (advancePaid > 0 && advancePaid < totalAmount) {
          return 'Partially Paid';
        }
        const rawStatus = String(o.payment_status || (o.payment as Record<string, unknown> | undefined)?.status || '').trim();
        const lower = rawStatus.toLowerCase();
        if (lower === 'paid' || lower === 'paid in full') {
          return advancePaid > 0 ? 'Paid in Full' : 'Unpaid / Pay on Delivery';
        }
        if (lower === 'partially paid' || lower === 'partial payment' || lower === 'partial') {
          return advancePaid > 0 ? 'Partially Paid' : 'Unpaid / Pay on Delivery';
        }
        return 'Unpaid / Pay on Delivery';
      })()
    ),
    payment_method: str((o.payment as Record<string, unknown> | undefined)?.mode || 'Cash'),
    order_status: str(o.order_status || o.status || 'Order Received'),
    status: str(o.order_status || o.status || 'Order Received'),
    created_at: (o.created_at as string | Date) || new Date(),
    expected_delivery: str(o.expected_delivery || ''),
    assigned_driver: (() => {
      const raw = str(o.assigned_pickup_delivery_person || o.assigned_driver || o.assigned_driver_full || '');
      return (raw === 'Counter Staff' || (o.assigned_staff && raw === o.assigned_staff && !o.assigned_pickup_delivery_person)) ? '' : raw;
    })(),
    assigned_staff: str(o.assigned_staff || o.status_updated_by || 'Counter Staff'),
    attend_staff_id: o.attend_staff_id != null && o.attend_staff_id !== '' ? str(o.attend_staff_id) : null,
    attend_staff_name: str(o.attend_staff_name || o.assigned_staff || 'Counter Staff'),
    assigned_pickup_person_id: o.assigned_pickup_person_id != null && o.assigned_pickup_person_id !== '' ? str(o.assigned_pickup_person_id) : null,
    assigned_pickup_delivery_person: (() => {
      const raw = str(o.assigned_pickup_delivery_person || o.assigned_driver || o.assigned_driver_full || '');
      return (raw === 'Counter Staff' || (o.assigned_staff && raw === o.assigned_staff && !o.assigned_pickup_delivery_person)) ? '' : raw;
    })(),
    comments: str(o.comments || ''),
    special_instructions: str(o.special_instructions || ''),
    activity_history: Array.isArray(o.activity_history) && o.activity_history.length > 0
      ? (o.activity_history as any[])
      : (Array.isArray(o.audit_logs) && o.audit_logs.length > 0
        ? (o.audit_logs as any[])
        : (Array.isArray(o.logs) ? (o.logs as any[]) : [])),
    audit_logs: Array.isArray(o.audit_logs) && o.audit_logs.length > 0
      ? (o.audit_logs as any[])
      : (Array.isArray(o.activity_history) ? (o.activity_history as any[]) : []),
    payment_history: Array.isArray(o.payment_history)
      ? (o.payment_history as any[])
      : (Array.isArray(o.paymentHistory) ? (o.paymentHistory as any[]) : []),
  };
};

const emptyOrder = (): NormalizedOrder => ({
  id: 0,
  order_number: '',
  customer_name: 'Walk-in Customer',
  mobile_number: '',
  address: 'Counter Walk-In',
  service_category: 'Laundry',
  service_type: 'Laundry',
  items: [],
  subtotal: 0,
  tax_amount: 0,
  total_amount: 0,
  advance_paid: 0,
  balance_due: 0,
  payment_status: 'Unpaid',
  payment_method: 'Cash',
  order_status: 'Order Received',
  status: 'Order Received',
  created_at: new Date(),
  expected_delivery: '',
  assigned_driver: '',
  assigned_staff: 'Counter Staff',
  attend_staff_id: null,
  attend_staff_name: '',
  assigned_pickup_person_id: null,
  assigned_pickup_delivery_person: '',
  comments: '',
  special_instructions: '',
  activity_history: [],
  audit_logs: [],
  logs: [],
  payment_history: [],
  paymentHistory: [],
  payments: [],
});
