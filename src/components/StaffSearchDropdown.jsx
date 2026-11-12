// src/components/StaffSearchDropdown.jsx
// Database-driven searchable dropdown for Staff Master & Pickup/Delivery Person Master

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

const PICKUP_ACCENTS = ['accent-blue', 'accent-green', 'accent-amber'];

function StaffIcon({ className = '' }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function DeliveryTruckIcon({ className = '' }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="15" height="13" rx="1.5" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export function formatStaffDisplayLabel(item) {
  if (!item) return '';
  const name = item.name || '';
  const id = item.uniqueId || '';
  const zone = item.zone || '';
  if (name && id && zone) return `${name} (${id}) – ${zone}`;
  if (name && id) return `${name} (${id})`;
  return name || id;
}

export default function StaffSearchDropdown({
  id,
  variant = 'staff',
  options = [],
  value = '',
  fallbackName = '',
  onChange,
  loading = false,
  error = null,
  onRetry,
  placeholder = 'Search by name or ID...',
  emptyMessage = 'No active records found.',
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 12);
    const spaceAbove = Math.max(0, rect.top - 12);
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      right: 'auto',
      zIndex: 9999,
      ...(openUpward
        ? {
            bottom: window.innerHeight - rect.top + 5,
            top: 'auto',
            maxHeight: Math.min(220, Math.max(110, spaceAbove)),
          }
        : {
            top: rect.bottom + 5,
            bottom: 'auto',
            maxHeight: Math.min(220, Math.max(120, spaceBelow)),
          }),
    });
  }, []);

  const selectedOption = useMemo(() => {
    if (value) {
      const byId = options.find((opt) => String(opt.uniqueId) === String(value));
      if (byId) return byId;
    }
    if (!value && fallbackName) {
      const byName = options.find(
        (opt) => String(opt.name).toLowerCase() === String(fallbackName).trim().toLowerCase()
      );
      if (byName) return byName;
    }
    return null;
  }, [options, value, fallbackName]);

  const selectedDisplayLabel = useMemo(() => {
    if (selectedOption) return formatStaffDisplayLabel(selectedOption);
    if (value && fallbackName) return `${fallbackName} (${value})`;
    if (value) return String(value);
    if (fallbackName) return String(fallbackName);
    return '';
  }, [selectedOption, value, fallbackName]);

  const filteredOptions = useMemo(() => {
    const q = isSearching ? searchQuery.trim().toLowerCase() : '';
    if (!q) return options;
    return options.filter((opt) => {
      const nameMatch = String(opt.name || '').toLowerCase().includes(q);
      const idMatch = String(opt.uniqueId || '').toLowerCase().includes(q);
      return nameMatch || idMatch;
    });
  }, [options, isSearching, searchQuery]);

  // Close dropdown on outside click and restore display state
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const inContainer = containerRef.current && containerRef.current.contains(event.target);
      const inMenu = listRef.current && listRef.current.contains(event.target);
      if (!inContainer && !inMenu) {
        setIsOpen(false);
        setIsSearching(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keep portaled menu anchored to input box on open, resize, or ancestor scroll
  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const handleReposition = () => updateMenuPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    if (!isOpen) return;
    if (filteredOptions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const activeIdx = selectedOption
      ? filteredOptions.findIndex((opt) => opt.uniqueId === selectedOption.uniqueId)
      : 0;
    setHighlightedIndex(activeIdx >= 0 ? activeIdx : 0);
  }, [isOpen, filteredOptions, selectedOption]);

  const handleSelect = (option) => {
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    onChange?.(option);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSearching(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    onChange?.(null);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setIsSearching(false);
      setSearchQuery('');
    } else {
      setIsOpen(true);
      setIsSearching(false);
      setSearchQuery('');
      inputRef.current?.focus();
    }
  };

  const handleInputFocus = (e) => {
    setIsOpen(true);
    if (!isSearching && selectedDisplayLabel) {
      e.target.select();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setIsOpen(true);
    setIsSearching(true);
    setSearchQuery(val);
    if (!val.trim() && (value || fallbackName)) {
      onChange?.(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
        setIsOpen(false);
        setIsSearching(false);
        setSearchQuery('');
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
      return;
    }

    if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    }
  };

  const inputValue = isSearching ? searchQuery : selectedDisplayLabel;
  const hasValue = Boolean(inputValue || value || fallbackName);
  const LeadingIcon = variant === 'pickup' ? DeliveryTruckIcon : StaffIcon;

  return (
    <div className="staff-dropdown-wrap" ref={containerRef}>
      <div className={`staff-dropdown-box ${isOpen ? 'open' : ''}`}>
        <span className={`staff-dropdown-leading-icon ${variant === 'pickup' ? 'is-pickup' : 'is-staff'}`}>
          <LeadingIcon />
        </span>

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          autoComplete="off"
          className="staff-dropdown-input"
          placeholder={placeholder}
          value={inputValue}
          onFocus={handleInputFocus}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        {hasValue && (
          <button
            type="button"
            className="staff-dropdown-clear-btn"
            aria-label="Clear selection"
            title="Clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="staff-dropdown-toggle-btn"
          aria-label={isOpen ? 'Close dropdown' : 'Open dropdown'}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleToggle}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.16s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {isOpen && createPortal(
        <div
          id={`${id}-listbox`}
          role="listbox"
          ref={listRef}
          className="staff-dropdown-menu"
          style={menuStyle || undefined}
        >
          {loading ? (
            <div className="staff-dropdown-state">
              <span className="staff-dropdown-spinner" aria-hidden="true" />
              <span>Loading active records...</span>
            </div>
          ) : error ? (
            <div className="staff-dropdown-state is-error">
              <span>{error}</span>
              {onRetry && (
                <button
                  type="button"
                  className="staff-dropdown-action-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onRetry}
                >
                  Retry
                </button>
              )}
            </div>
          ) : options.length === 0 ? (
            <div className="staff-dropdown-state">
              <span>{emptyMessage}</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="staff-dropdown-state">
              <span>No matches for &ldquo;{searchQuery}&rdquo;</span>
              <button
                type="button"
                className="staff-dropdown-action-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
              >
                Show all
              </button>
            </div>
          ) : (
            filteredOptions.map((item, idx) => {
              const isSelected = selectedOption
                ? selectedOption.uniqueId === item.uniqueId
                : String(value) === String(item.uniqueId);
              const isHighlighted = idx === highlightedIndex;
              const accentClass = variant === 'pickup'
                ? PICKUP_ACCENTS[idx % PICKUP_ACCENTS.length]
                : (isSelected ? 'accent-primary' : 'accent-staff');
              const zoneMeta = item.city ? `${item.zone} • ${item.city}` : item.zone;

              return (
                <button
                  key={item.uniqueId || item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`staff-dropdown-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(item)}
                >
                  <span className={`staff-dropdown-avatar ${accentClass}`}>
                    <LeadingIcon />
                  </span>
                  <span className="staff-dropdown-option-text">
                    <span className="staff-dropdown-option-title">
                      {item.name} ({item.uniqueId})
                    </span>
                    <span className="staff-dropdown-option-sub">
                      {zoneMeta || 'Active'}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
