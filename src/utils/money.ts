export const round2 = (n: number | string | null | undefined): number => {
  if (n == null || n === undefined) return 0;
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
};

export const formatCurrency = (amount: number | string | null | undefined, symbol: string = '₹'): string => {
  const amt = round2(amount);
  return `${symbol}${amt.toFixed(2)}`;
};

export const calculateTax = (subtotal: number): number => round2(subtotal * 0.05);

export const calculateGrandTotal = (subtotal: number, tax: number): number => round2(subtotal + tax);