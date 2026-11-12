// src/components/ServiceTypeSelect.jsx
// Shared Service Type selector & inline "Add New Service Type" control used across Create, Edit, and Side Panel flows.

import React, { useState, useEffect } from 'react';
import {
  getServiceTypes,
  addCustomServiceType,
} from '../config/businessRules';
import '../styles/ServiceTypeSelect.css';

export const ADD_NEW_SERVICE_SENTINEL = '__add_new_service__';

/**
 * React hook returning the synchronized list of default + custom Service Types.
 */
export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState(() => getServiceTypes());

  useEffect(() => {
    const sync = () => {
      setServiceTypes(getServiceTypes());
    };
    window.addEventListener('washdoor_service_types_updated', sync);
    window.addEventListener('washdoor_settings_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('washdoor_service_types_updated', sync);
      window.removeEventListener('washdoor_settings_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return serviceTypes;
}

export default function ServiceTypeSelect({
  value,
  onChange,
  label = null,
  labelClassName = '',
  required = false,
  selectId = undefined,
  selectClassName = '',
  selectStyle = undefined,
  title = undefined,
  allowAdd = true,
  onServiceAdded = undefined,
}) {
  const serviceTypes = useServiceTypes();
  const [isAdding, setIsAdding] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');

  // Preserve any existing legacy value on an older order without losing selection
  const optionsList = React.useMemo(() => {
    const val = String(value || '').trim();
    if (!val || val === ADD_NEW_SERVICE_SENTINEL) return serviceTypes;
    const exists = serviceTypes.some((s) => s.toLowerCase() === val.toLowerCase());
    return exists ? serviceTypes : [...serviceTypes, val];
  }, [serviceTypes, value]);

  const matchedValue = React.useMemo(() => {
    const val = String(value || '').trim();
    if (!val) return optionsList[0] || 'Laundry';
    const match = optionsList.find((s) => s.toLowerCase() === val.toLowerCase());
    return match || val;
  }, [optionsList, value]);

  const handleSelectChange = (e) => {
    const nextVal = e.target.value;
    if (nextVal === ADD_NEW_SERVICE_SENTINEL) {
      setIsAdding(true);
      return;
    }
    onChange?.(nextVal);
  };

  const handleConfirmAdd = () => {
    const trimmed = newServiceName.trim();
    if (!trimmed) return;
    const { added, isNew } = addCustomServiceType(trimmed);
    if (added) {
      onChange?.(added);
      onServiceAdded?.(added, isNew);
    }
    setNewServiceName('');
    setIsAdding(false);
  };

  return (
    <>
      {label !== null && (
        <div className="wd-service-label-row">
          <label className={labelClassName} htmlFor={selectId}>
            {label}
            {required ? <span className="req"> *</span> : null}
          </label>
          {allowAdd && !isAdding && (
            <button
              type="button"
              className="wd-service-add-link"
              onClick={() => setIsAdding(true)}
              title="Add a new service type to all dropdowns"
            >
              + Add Service
            </button>
          )}
        </div>
      )}

      <select
        id={selectId}
        className={selectClassName}
        style={selectStyle}
        title={title}
        value={matchedValue}
        onChange={handleSelectChange}
      >
        {optionsList.map((srv) => (
          <option key={srv} value={srv}>
            {srv}
          </option>
        ))}
        {allowAdd && (
          <option value={ADD_NEW_SERVICE_SENTINEL}>+ Add New Service Type...</option>
        )}
      </select>

      {allowAdd && isAdding && (
        <div className="wd-add-service-inline">
          <input
            type="text"
            className="wd-add-service-input"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmAdd();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsAdding(false);
                setNewServiceName('');
              }
            }}
            placeholder="New service name (e.g. Steam Press)"
            maxLength={60}
            autoFocus
          />
          <div className="wd-add-service-actions">
            <button
              type="button"
              className="wd-add-service-save"
              onClick={handleConfirmAdd}
              disabled={!newServiceName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className="wd-add-service-cancel"
              onClick={() => {
                setIsAdding(false);
                setNewServiceName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
