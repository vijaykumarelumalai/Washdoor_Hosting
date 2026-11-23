export type OrderStatus =
  | 'Order Received'
  | 'In Progress'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

export type PaymentMode = 'Cash' | 'UPI / QR Code' | 'Card' | 'Store Credit' | 'Wallet';

export interface GarmentInspection {
  garment: string;
  color: string;
  stains: string;
  make: string;
  brand: string;
  fabric: string;
  notes: string;
  photosCount: number;
}

export interface ActivityEvent {
  id: string;
  type: 'service' | 'payment' | 'status' | 'collection' | 'received';
  title: string;
  detail: string;
  staff: string;
  timestamp: string;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  amount: number;
  serviceType?: string;
  service?: string;
  icon?: string;
  inspections?: Record<string, any>;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  mobile_number: string;
  address?: string;
  service_category: string;
  service_type?: string;
  preference?: string;
  order_status: OrderStatus;
  status: OrderStatus;
  intake_method?: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  advance_paid: number;
  balance_due?: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMode;
  created_at: string;
  expected_delivery?: string;
  assigned_driver?: string;
  assigned_staff?: string;
  activity_history: ActivityEvent[];
  audit_logs?: ActivityEvent[];
  logs?: ActivityEvent[];
  weight_kg?: number;
  factory_hub?: string;
  factory_outlet?: string;
  store_outlet?: string;
  factory_manifest_no?: string;
  factory_gate_in?: string;
  factory_gate_out?: string;
  factory_supervisor?: string;
  vehicle_name?: string;
  mode_of_transport?: string;
  route_from_to?: string;
  route_return?: string;
  collected_by_person?: string;
  plant_transit_status?: string;
  rack_shelf_location?: string;
  captured_date?: string;
  captured_time?: string;
  comments?: string;
  special_instructions?: string;
  notes?: string;
}