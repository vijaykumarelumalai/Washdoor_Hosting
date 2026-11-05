export interface CustomerAddress {
  label?: string;
  address: string;
  city?: string;
  pincode?: string;
  isDefault?: boolean;
}

export type CustomerClassification =
  | 'Regular Customer'
  | 'VIP Customer'
  | 'Corporate / B2B'
  | 'Student / Senior'
  | 'regular'
  | 'vip'
  | 'corporate'
  | 'fraud';

export type CustomerStatus = 'Active' | 'Inactive' | 'Blacklisted' | 'active' | 'inactive' | 'archived';

export type CommunicationPreference = 'WhatsApp' | 'SMS' | 'Call' | 'Email' | 'sms' | 'whatsapp' | 'email' | 'phone' | 'none';

export interface Customer {
  id: string;
  customerId: string;
  customer_id?: string;
  customer_code?: string;
  customer_name: string;
  mobile_number: string;
  whatsapp_number?: string;
  email?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  customer_classification: CustomerClassification;
  customer_status: CustomerStatus;
  price_list: 'Standard' | 'Express' | 'Commercial' | string;
  credit_limit?: number;
  wallet_balance?: number;
  default_discount?: number;
  is_b2b?: boolean;
  company_name?: string;
  gst_number?: string;
  address: string;
  city: string;
  state?: string;
  pincode: string;
  map_link?: string;
  additional_addresses?: CustomerAddress[];
  preference?: string;
  preference_notes?: string;
  communication_pref: CommunicationPreference;
  preferred_language: string;
  dnd: boolean;
  internal_comments?: string;
  created_at?: string;
  tier?: 'SILVER' | 'GOLD' | 'PLATINUM ELITE' | string;
  notes?: string;
  tax_exemption?: boolean;
}
