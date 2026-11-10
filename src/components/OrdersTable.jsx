// src/components/OrdersTable.jsx
// Displays the live orders list, refreshed after each new order.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigurationError } from '../lib/supabaseClient';

function statusClass(status) {
  return `status-pill status-${status?.replace(/\s+/g, '-')}`;
}

export default function OrdersTable({ refreshKey }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    if (!supabase) {
      setError(supabaseConfigurationError);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('customer_works')
      .select('work_id, work_number, intake_method, work_status, total_amount, special_instructions, created_at, customer_name, mobile_number, delivery_address')
      .order('created_at', { ascending: false })
      .limit(50);

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      const mapped = (data ?? []).map((w) => ({
        id: w.work_number || w.work_id,
        order_type: w.intake_method || 'Walk-In',
        status: w.work_status || 'Received',
        total_amount: w.total_amount,
        notes: w.special_instructions,
        created_at: w.created_at,
        customer: {
          customer_name: w.customer_name,
          mobile_number: w.mobile_number,
          city: w.delivery_address || '—',
        },
      }));
      setOrders(mapped);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="search-loading" style={{ padding: '32px 0' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--accent)' }} />
        Loading orders…
      </div>
    );
  }

  if (error) {
    return <div className="toast error" style={{ marginTop: 16 }}>⚠️ {error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders-table-wrap">
        <div className="orders-empty-state">
          <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
          <p>No orders yet. Create your first order above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Customer</th>
            <th>Mobile</th>
            <th>City</th>
            <th>Type</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td style={{ color: 'var(--text-muted)' }}>#{o.id}</td>
              <td className="customer-name-cell">{o.customer?.customer_name ?? '—'}</td>
              <td>{o.customer?.mobile_number ?? '—'}</td>
              <td>{o.customer?.city ?? '—'}</td>
              <td style={{ textTransform: 'capitalize' }}>{o.order_type}</td>
              <td><span className={statusClass(o.status)}>{o.status}</span></td>
              <td>
                {o.total_amount
                  ? `₹${Number(o.total_amount).toFixed(2)}`
                  : '—'}
              </td>
              <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(o.created_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
