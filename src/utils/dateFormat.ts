export const formatDateIN = (dateStr: string | Date | null | undefined, format: 'short' | 'long' | 'en-IN' = 'en-IN'): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  
  if (format === 'en-IN') {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  
  return date.toLocaleDateString();
};

export const formatTimeIN = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
};

export const formatDateTimeIN = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return `${formatDateIN(date, 'en-IN')}, ${formatTimeIN(date)}`;
};