import { Customer } from './customer';

export type CanonicalOrderStatus =
  | 'order recived'
  | 'landry in progress'
  | 'ladaery in pro Emer'
  | 'ready for delvier'
  | 'dfa'
  | 'dfa -card'
  | 'today delivery'
  | 'not cleared'
  | 'other';

export type PropertyStatus = 'Yes' | 'No';

export type ServiceCategory =
  | 'Laundry'
  | 'Dry Cleaning'
  | 'Washing'
  | 'Shoe Cleaning'
  | 'Ironing Only'
  | 'Custom Category'
  | string;

export interface OrderItem {
  id: string;
  item_code?: string;
  name: string;
  qty: number;
  rate: number;
  amount: number;
  service?: ServiceCategory | string;
  service_type?: string;
  serviceType?: string;
  notes?: string;
  inspections?: Array<{
    id: string;
    photos?: string[];
    condition?: string;
    stains?: string;
  }>;
}

export interface Order {
  id: string;
  order_id?: string;
  order_number: string;
  work_id?: string;
  work_number?: string;
  customer_id: string;
  customerId?: string;
  customer_name: string;
  customerName?: string;
  mobile_number: string;
  mobileNumber?: string;
  alternate_phone?: string | null;
  email?: string | null;
  address?: string | null;
  delivery_address?: string | null;
  status: CanonicalOrderStatus | string;
  order_status: CanonicalOrderStatus | string;
  property_status: PropertyStatus;
  priority: PropertyStatus | string;
  order_type: string;
  service_type?: string;
  serviceCategory?: ServiceCategory | string;
  item_count: number;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  advance_paid: number;
  balance_due?: number;
  payment_status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Refunded' | string;
  payment_method: 'Cash' | 'UPI / QR' | 'Card' | 'Wallet' | 'Net Banking' | string;
  created_at: string;
  expected_delivery?: string | null;
  deliveryDate?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  assigned_driver?: string | null;
  assigned_staff?: string | null;
  comments?: string;
  customer?: Partial<Customer>;
  flags?: Record<string, boolean>;
  internal_notes?: string;
}
