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
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef}
            className="search"
            id="customerSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by phone number, customer name and customer id…"
            autoComplete="off"
            autoFocus
            style={{ paddingRight: query ? '50px' : '18px' }}
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
          ♙ New Customer <span className="key">2B</span>
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
          <span>ⓘ Click Select on any customer to create order</span>
        </div>
      )}

      {/* ── Customers List (Only shown when searched) ── */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="customer-list" id="customerList">
          {results.map((c, index) => {
            const custId = c.customerId || c.customer_code || c.id || 'CUST-00001';
            const intakeType = c.intakeType || c.intake_type || 'Walk-In';
            const commPref = c.communicationPreference || c.communication_pref || 'WhatsApp';
            const commLang = c.preferredCommunicationLanguage || 'English';
            const discount = c.defaultDiscountPercentage ?? c.default_discount ?? 0;
            const zone = c.areaServiceZone || 'Zone 1';
            const isDnd = Boolean(c.doNotDisturb || c.dnd);

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
                    <span className="tier">{c.tier || 'SILVER'}</span>
                    {c.membership_id && (
                      <span style={{ fontSize: '11px', color: '#8a55ff', background: '#21133c', padding: '2px 7px', borderRadius: '10px' }}>
                        💳 {c.membership_id}
                      </span>
                    )}
                  </div>

                  <div className="address" style={{ marginTop: '5px' }}>
                    ♧ {c.address || c.streetArea || 'Address not registered'}
                    {c.city ? `, ${c.city}` : ''}
                    {c.pincode ? ` - ${c.pincode}` : ''}
                    {c.email && ` • ✉️ ${c.email}`}
                  </div>

                  {/* ── Badges Row ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    <span className="badge-tag badge-intake">📥 {intakeType}</span>
                    <span className="badge-tag badge-comm">💬 {commPref} ({commLang})</span>
                    {isDnd && <span className="badge-tag badge-dnd">🔕 DND</span>}
                    {discount > 0 && <span className="badge-tag badge-discount">🏷️ {discount}% Off</span>}
                    <span className="badge-tag badge-zone">🗺️ {zone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="select"
                  onClick={() => onSelect(c)}
                >
                  Select →
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
