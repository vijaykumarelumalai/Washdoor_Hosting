export type TemplateChannel = 'whatsapp' | 'sms' | 'email';

export type TemplateCategory =
  | 'orderReceived'
  | 'readyForDelivery'
  | 'paymentReceived'
  | 'latePayment'
  | 'delayOrder'
  | 'complaint'
  | 'order_created'
  | 'ready_for_pickup'
  | 'delivered'
  | 'payment_reminder'
  | 'order_delayed';

export interface NotificationTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: TemplateChannel;
  status: 'active' | 'inactive';
  messageBody: string;
  variables: string[];
  isCustom?: boolean;
  updatedAt?: string;
}
