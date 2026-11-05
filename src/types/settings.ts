export type SettingsTab =
  | 'business_profile'
  | 'tax_currency'
  | 'bank_payments'
  | 'operations_receipts'
  | 'notifications'
  | 'language'
  | 'templates'
  | 'apps'
  | 'help_support'
  | 'account_details';

export interface TaxSettings {
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  isTaxInclusive: boolean;
  hsnSacCode: string;
}

export interface BankDetails {
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface PrinterConfig {
  paperWidth: '58mm' | '80mm';
  headerGreeting?: string;
  footerTerms?: string;
  printBarcode: boolean;
}

export interface StoreSettings {
  shopName: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  gstNumber: string;
  shopLogo?: string;
  mapCoordinates: { lat: number; lng: number };
  taxSettings: TaxSettings;
  bankDetails: BankDetails;
  printerConfig: PrinterConfig;
  language: string;
  dateFormat: string;
  timeFormat: '12-Hour' | '24-Hour';
  currency?: {
    code: string;
    symbol: string;
    label: string;
    name?: string;
  };
}
