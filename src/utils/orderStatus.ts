import { OrderStatus } from '../types/order.types';

export const normalizeOrderStatus = (raw: string): OrderStatus => {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('deliver') || s.includes('complete')) return 'Delivered';
  if (s.includes('ready') || s.includes('billing')) return 'Ready';
  if (s.includes('receive') || s.includes('intake') || s.includes('new') || s.includes('overdue')) return 'Order Received';
  if (s.includes('progress') || s.includes('wash') || s.includes('iron') || s.includes('process')) return 'In Progress';
  return 'Order Received';
};

export const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'In Progress':
      return { bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' };
    case 'Ready':
      return { bg: '#dcfce7', color: '#15803d', dot: '#10b981' };
    case 'Delivered':
      return { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' };
    case 'Cancelled':
      return { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' };
    case 'Order Received':
    default:
      return { bg: '#eff6ff', color: '#1d4ed8', dot: '#2563eb' };
  }
};