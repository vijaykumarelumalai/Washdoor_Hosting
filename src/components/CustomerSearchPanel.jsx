// src/components/CustomerSearchPanel.jsx
// Step 1: Customer Lookup connected to live Supabase database

import React, { useState, useEffect, useRef } from 'react';
import { searchCustomers } from '../services/customerService';
import { useDebounce } from '../hooks/useDebounce';
import { formatPhoneDisplay } from '../utils/validation';

export default function CustomerSearchPanel({ onSelect, onNewCustomer }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef(null);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    searchCustomers(debouncedQuery).then(({ data, error }) => {
      if (!isCancelled) {
        setLoading(false);
        if (!error && data) {
          setResults(data);
        } else {
          setResults([]);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  const hasSearched = query.trim().length > 0;

  return (
    <div id="lookupPanel">
      {/* ── Search Row ── */}
      <div className="search-row">
        <div className="search-wrap">
          <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            className="search"
            id="customerSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by phone number, customer name or customer ID..."
            autoComplete="off"
            autoFocus
            style={{ paddingLeft: '40px', paddingRight: query ? '46px' : '16px' }}
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className="new-customer"
          id="newCustomer"
          onClick={onNewCustomer}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New Customer</span>
        </button>
      </div>

      {/* ── Initial Empty State (Default when not searching) ── */}
      {!hasSearched && (
        <div className="lookup-empty" id="lookupEmpty">
          <div className="lookup-empty-icon" aria-hidden="true">⌕</div>
          <div className="lookup-empty-title">Search Existing Customer or Register New</div>
          <p>
            Type a phone number or customer name above, or click{' '}
            <strong style={{ cursor: 'pointer' }} onClick={onNewCustomer}>
              + New Customer
            </strong>{' '}
            to begin.
          </p>
        </div>
      )}

      {/* ── Loading indicator ── */}
      {hasSearched && loading && (
        <div style={{ textAlign: 'center', padding: '36px', color: '#9aacc5' }}>
          Searching Supabase records…
        </div>
      )}

      {/* ── Customer List Header ── */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="matches-head" id="matchesHead">
          <strong>
            Matching Customers ({results.length})
          </strong>
        </div>
      )}

      {/* ── Disambiguation Callout (when multiple profiles share a number) ── */}
      {hasSearched && !loading && (() => {
        const counts = {};
        let sharedPhone = null;
        for (const r of results) {
          if (r.mobile_number) {
            counts[r.mobile_number] = (counts[r.mobile_number] || 0) + 1;
            if (counts[r.mobile_number] > 1) {
              sharedPhone = r.mobile_number;
              break;
            }
          }
        }
        if (!sharedPhone) return null;
        return (
          <div className="shared-family-callout">
            <div className="shared-family-callout-text">
              <strong>👥 Shared Household Phone: {formatPhoneDisplay(sharedPhone)}</strong>
              <span>Multiple customer profiles share this contact number. Select the individual below or register another family member:</span>
            </div>
            <button
              type="button"
              className="shared-family-add-btn"
              onClick={() => onNewCustomer && onNewCustomer({ mobile_number: sharedPhone })}
            >
              + Add Family Member
            </button>
          </div>
        );
      })()}

      {/* ── Customers List (Only shown when searched) ── */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="customer-list" id="customerList">
          {results.map((c, index) => {
            const custId = c.customerId || c.customer_code || c.id || 'CUST-00001';
            const isSharedNumber = results.filter((r) => r.mobile_number && r.mobile_number === c.mobile_number).length > 1;

            const initials = c.customer_name
              ? c.customer_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'CU';

            return (
              <article key={c.id || custId} className="customer" style={{ minHeight: 'auto', padding: '16px 20px' }}>
                <div className={`avatar ${index % 2 === 1 ? 'purple' : ''}`}>
                  {initials}
                </div>
                <div className="customer-content">
                  <div className="customer-top">
                    <span className="cust-id-pill" style={{ marginRight: '4px' }}>{custId}</span>
                    <span className="customer-name">{c.customer_name}</span>
                    <span className="phone">{formatPhoneDisplay(c.mobile_number)}</span>
                    {isSharedNumber && (
                      <span className="shared-family-tag" title="Multiple customer profiles share this contact number">
                        👥 Shared Family
                      </span>
                    )}
                    <span className="tier">{c.tier || 'SILVER'}</span>
                  </div>

                  <div className="address" style={{ marginTop: '5px' }}>
                    📍 {c.address || c.streetArea || 'Address not registered'}
                    {c.city ? `, ${c.city}` : ''}
                    {c.pincode ? ` - ${c.pincode}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="select"
                  onClick={() => onSelect(c)}
                >
                  <span>Select</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* ── No Match Footer ── */}
      {hasSearched && !loading && results.length === 0 && (
        <div className="footer" id="lookupFooter">
          No matching customer found for "{query}". Click{' '}
          <strong onClick={onNewCustomer}>“New Customer”</strong> to register and create order.
        </div>
      )}
    </div>
  );
}
