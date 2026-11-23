export type ColumnId =
  | 'order_id'
  | 'customer'
  | 'address'
  | 'services'
  | 'status'
  | 'payment'
  | 'order_details'
  | 'pickup_delivery'
  | 'actions';

export type EditTabId = 'details' | 'history' | 'payment' | 'collection' | 'messages';

export type OrderFilter = 'All' | 'Order Received' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled';

export type DateFilter = 'All Time' | 'Today' | 'Yesterday' | 'Last 7 Days' | 'This Month';

export type ServiceFilter = 'All Services' | 'Normal Wash' | 'Wash & Steam Press' | 'Wash & Fold' | 'Dry Cleaning' | 'Heavy Linens & Quilts' | 'Express 24H Service';

export interface ColumnPreference {
  id: ColumnId;
  label: string;
  default: boolean;
  required: boolean;
}

export const DEFAULT_COLUMN_IDS: ColumnId[] = [
  'order_id',
  'customer',
  'address',
];

export const ALL_COLUMN_IDS: ColumnId[] = [
  'order_id',
  'customer',
  'address',
  'services',
  'status',
  'payment',
  'order_details',
  'pickup_delivery',
  'actions',
];