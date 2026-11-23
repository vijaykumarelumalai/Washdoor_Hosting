import { useState, useMemo } from 'react';

export const useOrdersPagination = (orders: any[], pageSize: number = 10) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, page, pageSize]);

  const goToPage = (num: number) => {
    setPage(Math.max(1, Math.min(num, totalPages)));
  };

  const nextPage = () => {
    setPage(p => Math.min(p + 1, totalPages));
  };

  const prevPage = () => {
    setPage(p => Math.max(1, p - 1));
  };

  return {
    paginatedOrders,
    page,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    setPage,
  };
};