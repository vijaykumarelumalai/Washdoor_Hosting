import React, { useState } from 'react';
import { createPortal } from 'react-dom';

// Moved from POSModule.jsx - groupServicesByType
function groupServicesByType(services = [], ord = {}) {
  const groups = {};
  const orderDefaultService = ord.service_category || ord.service_type || ord.preference || 'Standard Services';

  services.forEach((item) => {
    let group = item.serviceType || item.service || item.category;
    if (!group) {
      const lower = (item.name || '').toLowerCase();
      if (lower.includes('dry clean') || lower.includes('drycleaning')) {
        group = 'Dry Cleaning';
      } else if (lower.includes('steam press') || lower.includes('iron') || lower.includes('press')) {
        group = 'Steam Press & Ironing';
      } else if (lower.includes('wash') || lower.includes('laundry')) {
        group = 'Laundry / Normal Wash';
      } else if (lower.includes('starch') || lower.includes('softener') || lower.includes('finish') || lower.includes('perfume') || lower.includes('addon')) {
        group = 'Finishes & Add-ons';
      } else if (lower.includes('curtain') || lower.includes('bedsheet') || lower.includes('towel') || lower.includes('linen') || lower.includes('blanket')) {
        group = 'Home Linen & Bedding';
      } else if (lower.includes('shoe') || lower.includes('bag') || lower.includes('leather')) {
        group = 'Shoe & Special Care';
      } else {
        group = orderDefaultService || 'Standard Services';
      }
    }
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  });

  return groups;
}

// Moved from POSModule.jsx - getServiceItemIcon
function getServiceItemIcon(item = {}) {
  if (item.icon) return item.icon;
  const lower = (item.name || '').toLowerCase();
  if (lower.includes('steam press') || lower.includes('iron') || lower.includes('press')) return '♨️';
  if (lower.includes('dry clean') || lower.includes('drycleaning')) return '✨';
  if (lower.includes('wash') || lower.includes('laundry')) return '🧺';
  if (lower.includes('starch') || lower.includes('finish')) return '👔';
  if (lower.includes('softener') || lower.includes('fragrance') || lower.includes('perfume')) return '🌸';
  if (lower.includes('saree')) return '🥻';
  if (lower.includes('curtain')) return '🪟';
  if (lower.includes('bed') || lower.includes('pillow')) return '🛏️';
  if (lower.includes('shoe')) return '👟';
  if (lower.includes('towel')) return '🧼';
  if (lower.includes('pant') || lower.includes('jeans')) return '👖';
  return '👕';
}

function ServicesPopoverPortal({ popoverData, onClose, popoverRef }) {
  if (!popoverData || typeof document === 'undefined') return null;

  const [activeTab, setActiveTab] = useState('hidden'); // 'hidden' | 'all'
  const [positionStyle, setPositionStyle] = useState({});

  const {
    orderNum,
    anchorRect,
    services = [],
    totalPieces = 0,
    orderServiceCategory,
  } = popoverData;

  const hiddenServices = services.slice(1);
  const displayedServices = activeTab === 'all' ? services : (hiddenServices.length > 0 ? hiddenServices : services);
  const grouped = groupServicesByType(displayedServices, { service_category: orderServiceCategory });

  useEffect(() => {
    if (!anchorRect) return;
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      setPositionStyle({});
      return;
    }

    const { top, bottom, left, right } = anchorRect;
    const popoverWidth = 320;
    const popoverHeight = popoverRef?.current ? popoverRef.current.offsetHeight : 240;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Position directly below button if space permits; otherwise flip above
    const spaceBelow = viewportHeight - bottom;
    const fitsBelow = spaceBelow >= popoverHeight + 8;

    let calculatedTop = fitsBelow ? (bottom + 6) : Math.max(12, top - popoverHeight - 6);

    let calculatedLeft = left;
    if (calculatedLeft + popoverWidth > viewportWidth - 16) {
      calculatedLeft = (right || left) - popoverWidth;
    }
    if (calculatedLeft < 16) calculatedLeft = 16;
    if (calculatedLeft + popoverWidth > viewportWidth - 16) {
      calculatedLeft = viewportWidth - popoverWidth - 16;
    }

    setPositionStyle({
      top: `${Math.round(calculatedTop)}px`,
      left: `${Math.round(calculatedLeft)}px`,
      width: `${popoverWidth}px`,
    });
  }, [anchorRect, activeTab, displayedServices.length]);

  const displayedPieceCount = displayedServices.reduce(
    (acc, it) => acc + (Number(it.count || it.qty || it.quantity) || 1),
    0
  );

  return createPortal(
    <>
      {/* Backdrop for mobile bottom sheet */}
      <div
        className="pos-services-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover / Bottom Sheet Container */}
      <div
        ref={popoverRef}
        className="pos-services-popover-container"
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Services breakdown for Order ${orderNum}`}
      >
        {/* Mobile Drag Handle */}
        <div className="pos-services-popover-drag-handle" />

        {/* Header */}
        <div className="pos-services-popover-header">
          <div className="pos-services-popover-title-wrap">
            <div className="pos-services-popover-title">
              <span>Services & Garments</span>
            </div>
            <div className="pos-services-popover-order-badge">
              Order #{orderNum}
            </div>
          </div>
          <div className="pos-services-popover-header-actions">
            <span className="pos-services-popover-pcs-badge" title="Total Pieces in Order">
              🏷️ {totalPieces} pcs
            </span>
            <button
              type="button"
              className="pos-services-popover-close-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close popover"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab switcher: Hidden vs All */}
        {services.length > 1 && (
          <div className="pos-services-popover-tabs">
            <button
              type="button"
              className={`pos-services-tab-btn ${activeTab === 'hidden' ? 'active' : ''}`}
              onClick={() => setActiveTab('hidden')}
            >
              <span>Hidden Services (+{hiddenServices.length})</span>
            </button>
            <button
              type="button"
              className={`pos-services-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All Services ({services.length})</span>
            </button>
          </div>
        )}

        {/* Grouped Services Body */}
        <div className="pos-services-popover-body">
          {Object.keys(grouped).length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              No services to display
            </div>
          ) : (
            Object.entries(grouped).map(([groupTitle, itemsList]) => {
              const groupPieces = itemsList.reduce(
                (acc, it) => acc + (Number(it.count || it.qty || it.quantity) || 1),
                0
              );
              return (
                <div key={groupTitle} className="pos-services-group">
                  <div className="pos-services-group-header">
                    <span>{groupTitle}</span>
                    <span className="pos-services-group-count">
                      {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'} • {groupPieces} pcs
                    </span>
                  </div>
                  <div className="pos-services-items-list">
                    {itemsList.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="pos-services-item-row">
                        <div className="pos-services-item-left">
                          <span className="pos-services-item-icon">{getServiceItemIcon(item)}</span>
                          <span className="pos-services-item-name" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="pos-services-item-badge">
                          x{item.count || item.qty || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pos-services-popover-footer">
          <span>{displayedServices.length} {displayedServices.length === 1 ? 'service' : 'services'} ({displayedPieceCount} pcs)</span>
          <span className="pos-services-popover-footer-total">
            Total Order: {totalPieces} pieces
          </span>
        </div>
      </div>
    </>,
    document.body
  );
}

export default ServicesPopoverPortal;