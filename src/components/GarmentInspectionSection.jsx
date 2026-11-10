// src/components/GarmentInspectionSection.jsx
// Dynamic Garment-by-Garment Inspection & Care Component
// High-fidelity interactive UI with centralized icon map, perfect input alignment, and full mobile responsiveness

import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../styles/GarmentInspection.css';

export const FABRIC_OPTIONS = [
  'Select fabric',
  'Cotton',
  'Silk',
  'Wool',
  'Polyester',
  'Linen',
  'Denim',
  'Blended',
  'Rayon',
  'Chiffon',
  'Georgette',
  'Other',
];

export const MAKE_OPTIONS = [
  'Manufacturer / make',
  'Readymade',
  'Tailored / Custom',
  'Designer / Boutique',
  'Imported',
  'Branded Retail',
  'Handloom / Handcrafted',
];

export const GARMENT_OPTIONS = [
  'T-Shirt',
  'Shirt',
  'Formal Pant',
  'Jeans',
  'Saree',
  'Chudidar / Salwar',
  'Kurti',
  'Shorts',
  'Bedsheet',
  'Pillow Cover',
  'Towel',
  'Jacket',
  'Blazer / Suit',
  'Sweater',
  'Cap',
  'Curtain',
  'Shoe',
];

export const CONDITION_OPTIONS = [
  'Good',
  'Delicate',
  'Torn / Damaged',
  'Faded',
  'Missing Button',
  'Color Bleed Risk',
];

export const FINISH_OPTIONS = [
  'Standard Fold',
  'Hanger',
  'Medium Starch',
  'Heavy Starch',
  'Vacuum Pack',
];

export const DEFECT_LOCATION_OPTIONS = [
  '',
  'Collar',
  'Cuff',
  'Sleeve',
  'Front / Body',
  'Back',
  'Pallu',
  'Zari Border',
  'Hem',
  'Pocket',
  'Button / Zip',
  'Sole / Upper',
];

export const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export const ACTION_PLAN_OPTIONS = [
  { value: 'Proceed', label: 'Proceed Normal Wash' },
  { value: 'Spot_Treat', label: 'Spot Treat Stain/Defect' },
  { value: 'Customer_Approval', label: 'Needs Customer Approval' },
  { value: 'Reject', label: 'Reject / Return Unwashed' },
];

export const APPROVAL_OPTIONS = [
  { value: 'Not_Required', label: 'Not Required' },
  { value: 'Pending', label: 'Pending Approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

export const STAGE_OPTIONS = [
  'Received',
  'Sorting',
  'Washing',
  'Drying',
  'Ironing',
  'QC',
  'Ready',
  'Packed',
  'Delivered',
];

export const PHOTO_TYPE_OPTIONS = [
  { value: 'Before_Wash', label: 'Before Wash' },
  { value: 'Stain', label: 'Stain Evidence' },
  { value: 'Damage', label: 'Pre-Existing Damage' },
  { value: 'After_Wash', label: 'After Wash' },
  { value: 'After_Press', label: 'After Press' },
  { value: 'Packed', label: 'Packed' },
  { value: 'Delivery_Proof', label: 'Delivery Proof' },
];

/**
 * Normalizes any garment name string into an icon map key.
 * If unmatched, falls back to 'hanger'.
 */
export function getGarmentIconKey(name = '') {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return 'hanger';
  if (s.includes('t-shirt') || s.includes('tshirt') || s.includes('tee')) return 'tshirt';
  if (s.includes('shirt')) return 'shirt';
  if (s.includes('saree') || s.includes('sari')) return 'saree';
  if (s.includes('sweater') || s.includes('cardigan') || s.includes('pullover')) return 'sweater';
  if (s.includes('blazer') || s.includes('suit')) return 'blazer';
  if (s.includes('jacket') || s.includes('coat')) return 'jacket';
  if (s.includes('jean') || s.includes('denim')) return 'jeans';
  if (s.includes('formal pant') || s.includes('trouser') || s.includes('pant')) return 'pant';
  if (s.includes('short')) return 'shorts';
  if (
    s.includes('kurti') ||
    s.includes('kurta') ||
    s.includes('salwar') ||
    s.includes('chudidar') ||
    s.includes('frock') ||
    s.includes('dress')
  ) {
    return 'kurti';
  }
  if (s.includes('towel') || s.includes('napkin')) return 'towel';
  if (s.includes('bedsheet') || s.includes('bed') || s.includes('pillow') || s.includes('linen')) return 'bedsheet';
  if (s.includes('curtain') || s.includes('drape')) return 'curtain';
  if (s.includes('cap') || s.includes('hat')) return 'cap';
  return 'hanger'; // Generic clothes hanger fallback
}

/**
 * Centralized Garment Icon Map
 * Each entry provides:
 *  - header: (36x36 colored SVG) for card header
 *  - field: (16x16 blue stroke SVG) for dropdown input prefix
 */
export const GARMENT_ICON_MAP = {
  // 1. T-Shirt
  tshirt: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          d="M11 7C12.5 9 14.5 10 18 10C21.5 10 23.5 9 25 7L32 11.5L28.5 17L25 14.8V31C25 31.6 24.6 32 24 32H12C11.4 32 11 31.6 11 31V14.8L7.5 17L4 11.5L11 7Z"
          fill="#22c55e"
        />
        <path
          d="M13.5 7C14.8 9 16.3 9.5 18 9.5C21.7 9.5 22.2 9 22.5 7"
          stroke="#16a34a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
  },

  // 2. Formal Shirt
  shirt: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          d="M11 7C13 8.5 15 9.5 18 9.5C21 9.5 23 8.5 25 7L32 11L28 17L25 15V31C25 31.6 24.6 32 24 32H12C11.4 32 11 31.6 11 31V15L8 17L4 11L11 7Z"
          fill="#3b82f6"
        />
        <polygon points="14,7 18,12 11,9" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1" />
        <polygon points="22,7 18,12 25,9" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1" />
        <line x1="18" y1="12" x2="18" y2="31" stroke="#1d4ed8" strokeWidth="1.5" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
        <polyline points="10 2 12 6 14 2" />
        <line x1="12" y1="6" x2="12" y2="20" />
      </svg>
    ),
  },

  // 3. Saree
  saree: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M13 7H23L27 32H9L13 7Z" fill="#db2777" />
        <path d="M10 13L26 25" stroke="#f59e0b" strokeWidth="3" />
        <path d="M9 19L25 31" stroke="#f59e0b" strokeWidth="2.5" />
        <rect x="9" y="29" width="18" height="3" fill="#f59e0b" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6l3 18H6L9 3z" />
        <path d="M7 8l10 8" />
        <path d="M6 13l11 8" />
      </svg>
    ),
  },

  // 4. Sweater
  sweater: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          d="M10 8C12 9.5 15 10.5 18 10.5C21 10.5 24 9.5 26 8L33 13L29 19L26 16.5V31C26 31.6 25.5 32 25 32H11C10.5 32 10 31.6 10 31V16.5L7 19L3 13L10 8Z"
          fill="#f59e0b"
        />
        <path d="M12 8C14 10 16 10.5 18 10.5C20 10.5 22 10 24 8" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="17" x2="22" y2="17" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="13" y1="22" x2="23" y2="22" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="12" y1="27" x2="24" y2="27" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4a5 5 0 0010 0l4 3-2 5-3-1v9H8v-9L5 12 3 7l4-3z" />
        <path d="M10 4a2 2 0 004 0" />
      </svg>
    ),
  },

  // 5. Blazer / Suit
  blazer: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M10 7L18 10L26 7L32 11.5L28 17L25 15V31H11V15L8 17L4 11.5L10 7Z" fill="#1e3a8a" />
        <polygon points="18,10 14,20 18,24 22,20" fill="#f8fafc" />
        <polygon points="17,14 19,14 18.5,19 17.5,19" fill="#dc2626" />
        <path d="M10 7L14 20L18 24L22 20L26 7" stroke="#3b82f6" strokeWidth="1.2" fill="none" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3l6 4 6-4 3 5-3 3v10H6V11L3 8l3-5z" />
        <polyline points="9 3 12 12 15 3" />
      </svg>
    ),
  },

  // 6. Jacket
  jacket: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M10 7L18 9L26 7L32 11.5L28 18L25 15.5V31H11V15.5L8 18L4 11.5L10 7Z" fill="#4f46e5" />
        <line x1="18" y1="9" x2="18" y2="31" stroke="#a5b4fc" strokeWidth="2" />
        <circle cx="18" cy="14" r="1.5" fill="#ffffff" />
        <rect x="12" y="21" width="4" height="4" rx="1" fill="#4338ca" />
        <rect x="20" y="21" width="4" height="4" rx="1" fill="#4338ca" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l8 3 8-3v14l-8 3-8-3V4z" />
        <line x1="12" y1="7" x2="12" y2="21" />
      </svg>
    ),
  },

  // 7. Jeans
  jeans: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M10 6H26L28 32H20L18 16L16 32H8L10 6Z" fill="#1d4ed8" />
        <rect x="10" y="6" width="16" height="3" fill="#2563eb" />
        <path d="M12 10C14 10 15 12 15 14" stroke="#f59e0b" strokeWidth="1" fill="none" />
        <path d="M24 10C22 10 21 12 21 14" stroke="#f59e0b" strokeWidth="1" fill="none" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h12l2 17h-5l-3-9-3 9H4L6 4z" />
        <line x1="10" y1="4" x2="14" y2="4" strokeWidth="2.5" />
      </svg>
    ),
  },

  // 8. Formal Pant / Trousers
  pant: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M10 6H26L28 32H20L18 16L16 32H8L10 6Z" fill="#334155" />
        <rect x="10" y="6" width="16" height="3" fill="#1e293b" />
        <line x1="13" y1="10" x2="13" y2="31" stroke="#475569" strokeWidth="1" />
        <line x1="23" y1="10" x2="23" y2="31" stroke="#475569" strokeWidth="1" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h12l2 17h-5l-3-9-3 9H4L6 4z" />
      </svg>
    ),
  },

  // 9. Shorts
  shorts: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M10 8H26L27 24H20L18 16L16 24H9L10 8Z" fill="#0284c7" />
        <rect x="10" y="8" width="16" height="3" fill="#0369a1" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5h12l1 11h-5l-2-6-2 6H5L6 5z" />
      </svg>
    ),
  },

  // 10. Kurti / Salwar / Chudidar / Dress
  kurti: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M12 7L18 9L24 7L28 12L25 15L23 13V31H13V13L11 15L8 12L12 7Z" fill="#8b5cf6" />
        <path d="M18 9V20" stroke="#fde047" strokeWidth="1.8" />
        <circle cx="18" cy="12" r="1" fill="#fde047" />
        <circle cx="18" cy="16" r="1" fill="#fde047" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3h8l3 5-2 3-2-1v11H9V10L7 11 5 8l3-5z" />
        <line x1="12" y1="3" x2="12" y2="10" />
      </svg>
    ),
  },

  // 11. Towel
  towel: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="8" y="10" width="20" height="18" rx="2" fill="#0d9488" />
        <path d="M8 15H28" stroke="#5eead4" strokeWidth="2" />
        <path d="M8 20H28" stroke="#5eead4" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <line x1="4" y1="11" x2="20" y2="11" />
        <line x1="4" y1="15" x2="20" y2="15" strokeDasharray="2 2" />
      </svg>
    ),
  },

  // 12. Bedsheet / Pillow Cover
  bedsheet: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="11" width="24" height="16" rx="2" fill="#7c3aed" />
        <path d="M6 16C12 18 20 14 30 17" stroke="#c4b5fd" strokeWidth="2" fill="none" />
        <circle cx="18" cy="19" r="2" fill="#ede9fe" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M3 12h18" />
      </svg>
    ),
  },

  // 13. Curtain
  curtain: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="7" width="24" height="3" fill="#78350f" />
        <path d="M9 10C11 20 7 28 8 32H16C15 28 13 20 14 10Z" fill="#b91c1c" />
        <path d="M22 10C23 20 21 28 20 32H28C29 28 25 20 27 10Z" fill="#991b1b" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="4" x2="21" y2="4" strokeWidth="2.5" />
        <path d="M6 4v16c2-1 4 0 4 0s2-1 2 0V4" />
        <path d="M12 4v16c2-1 4 0 4 0s2-1 2 0V4" />
      </svg>
    ),
  },

  // 14. Cap / Hat
  cap: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M8 20C8 13 14 11 19 11C24 11 28 14 28 20Z" fill="#dc2626" />
        <path d="M6 20C12 21 22 21 31 18C32 20 30 22 26 23C19 24 9 23 6 20Z" fill="#b91c1c" />
        <circle cx="18" cy="11" r="1.5" fill="#fef2f2" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 15a7 7 0 0 1 14 0" />
        <path d="M4 15c4 1 10 1 17-1 1 2-1 3-5 3H5a2 2 0 0 1-1-2z" />
      </svg>
    ),
  },

  // 15. Generic Clothes Hanger Fallback (Clean metallic hook + triangular hanger frame)
  hanger: {
    header: () => (
      <svg className="garment-header-svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 5C16.3 5 15 6.3 15 8C15 9.2 15.7 10.2 16.7 10.7L5 19C4.4 19.4 4 20.2 4 21C4 22.1 4.9 23 6 23H30C31.1 23 32 22.1 32 21C32 20.2 31.6 19.4 31 19L19.3 10.7C20.3 10.2 21 9.2 21 8C21 6.3 19.7 5 18 5Z" fill="#3b82f6" />
        <path d="M18 5C16.3 5 15 6.3 15 8C15 9.2 15.7 10.2 16.7 10.7" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M7 21L18 13L29 21" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="23" x2="30" y2="23" stroke="#1e40af" strokeWidth="1.5" />
      </svg>
    ),
    field: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a3 3 0 0 0-3 3c0 .8.4 1.5 1 2L2 15a2 2 0 0 0 1 3h18a2 2 0 0 0 1-3l-8-7a3 3 0 0 0 1-2 3 3 0 0 0-3-3z" />
      </svg>
    ),
  },
};

/**
 * Returns header illustration or field prefix icon for any garment name
 */
export function renderGarmentIcon(name = '', type = 'header') {
  const key = getGarmentIconKey(name);
  const entry = GARMENT_ICON_MAP[key] || GARMENT_ICON_MAP.hanger;
  return type === 'header' ? entry.header() : entry.field();
}

export default function GarmentInspectionSection({
  cart = [],
  inspections = {},
  onChangeInspections,
  showToast,
}) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const fileInputRefs = useRef({});

  // Synchronize cart with inspection records
  useEffect(() => {
    if (!onChangeInspections) return;

    let hasChanges = false;
    const nextInspections = { ...inspections };

    // 1. Ensure inspection record exists for each physical piece in cart
    const validPieceIds = new Set();

    cart.forEach((item) => {
      const qty = Math.max(1, parseInt(item.qty || 1, 10));
      for (let i = 0; i < qty; i++) {
        const pieceNum = i + 1;
        const pieceId = `${item.id}-piece-${pieceNum}`;
        validPieceIds.add(pieceId);

        if (!nextInspections[pieceId]) {
          hasChanges = true;
          nextInspections[pieceId] = {
            id: pieceId,
            cartItemId: item.id,
            productId: item.productId || item.id,
            piece: pieceNum,
            name: item.name || 'Garment',
            tagNumber: '',
            color: '',
            stains: '',
            damage: '',
            make: '',
            brand: '',
            fabric: '',
            condition: 'Good',
            finishPreference: 'Standard Fold',
            size: '',
            defectLocation: '',
            severity: 'Low',
            actionPlan: 'Proceed',
            extraCharge: 0,
            processingStage: 'Received',
            assignedStaff: '',
            qcPassed: false,
            customerAck: false,
            customerApproval: 'Not_Required',
            customerNotes: '',
            notes: '',
            photos: [],
            expanded: true,
          };
        } else {
          // Keep garment name synchronized if empty
          if (!nextInspections[pieceId].name && item.name) {
            hasChanges = true;
            nextInspections[pieceId] = {
              ...nextInspections[pieceId],
              name: item.name,
            };
          }
        }
      }
    });

    // 2. Prune records for items or pieces no longer in cart
    Object.keys(nextInspections).forEach((k) => {
      if (!validPieceIds.has(k)) {
        hasChanges = true;
        delete nextInspections[k];
      }
    });

    if (hasChanges) {
      onChangeInspections(nextInspections);
    }
  }, [cart]);

  // Update specific field of a garment piece
  const handleFieldChange = (pieceId, field, value) => {
    if (!onChangeInspections) return;
    const current = inspections[pieceId] || {};
    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        [field]: value,
      },
    });
  };

  // Toggle expand / collapse of a garment card
  const toggleCardCollapse = (pieceId) => {
    if (!onChangeInspections) return;
    const current = inspections[pieceId] || {};
    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        expanded: current.expanded === false ? true : false,
      },
    });
  };

  // Add photos to a garment piece via FileReader (persistent base64)
  const handleAddPhotos = (pieceId, filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;

    const current = inspections[pieceId] || {};
    const existingPhotos = current.photos || [];
    const remainingSlots = 6 - existingPhotos.length;
    if (remainingSlots <= 0) {
      showToast?.('Maximum 6 photos allowed per garment.');
      return;
    }

    const defaultPhotoType = current.stains ? 'Stain' : current.damage ? 'Damage' : 'Before_Wash';
    const filesToRead = files.slice(0, remainingSlots);
    let loadedCount = 0;
    const newPhotos = [];

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          caption: file.name,
          photo_type: defaultPhotoType,
          size: `${Math.round(file.size / 1024)} KB`,
          timestamp: new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          url: e.target.result,
        });

        loadedCount++;
        if (loadedCount === filesToRead.length) {
          const updatedList = [...existingPhotos, ...newPhotos];
          onChangeInspections({
            ...inspections,
            [pieceId]: {
              ...current,
              photos: updatedList,
            },
          });
          showToast?.(`✓ ${newPhotos.length} photo(s) added to ${current.name} (Piece ${current.piece}).`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Update metadata (photo_type / caption) on a single attached photo
  const handlePhotoFieldChange = (pieceId, photoIndex, field, value) => {
    if (!onChangeInspections) return;
    const current = inspections[pieceId] || {};
    const existingPhotos = current.photos || [];
    const updatedPhotos = existingPhotos.map((ph, idx) => {
      if (idx !== photoIndex) return ph;
      const obj = typeof ph === 'string' ? { url: ph, name: `Photo ${idx + 1}` } : { ...ph };
      obj[field] = value;
      return obj;
    });
    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        photos: updatedPhotos,
      },
    });
  };

  // Remove photo from a garment piece
  const handleRemovePhoto = (pieceId, photoIndex) => {
    const current = inspections[pieceId] || {};
    const existingPhotos = current.photos || [];
    const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        photos: updatedPhotos,
      },
    });
  };

  // Compute pieces list matching cart order
  const pieces = useMemo(() => {
    return cart.flatMap((item) => {
      const qty = Math.max(1, parseInt(item.qty || 1, 10));
      return Array.from({ length: qty }, (_, i) => ({
        item,
        piece: i + 1,
        id: `${item.id}-piece-${i + 1}`,
      }));
    });
  }, [cart]);

  return (
    <section className="inspection-wrap">
      {/* Outer Section Header */}
      <div className="inspection-header">
        <div className="inspection-header-left">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="desktop-inspection-title">Garment-by-Garment Inspection &amp; Care</span>
            <span className="mobile-inspection-title">Garment Inspection</span>
          </h2>
          <p>
            <span className="desktop-inspection-sub">Each physical garment gets its own inspection record, notes and photo evidence.</span>
            <span className="mobile-inspection-sub">Add notes and photos for each garment.</span>
          </p>
        </div>
        <div className="inspection-summary">
          <span className="inspection-badge blue">
            {pieces.length} inspection record{pieces.length === 1 ? '' : 's'}
          </span>
          <span className="inspection-badge green">● Auto-created from cart</span>
        </div>
      </div>

      {/* Garment Cards List */}
      <div className="inspection-list">
        {pieces.length === 0 ? (
          <div className="empty-inspection">
            <span className="empty-inspection-icon">🧺</span>
            <strong>No garments selected</strong>
            <span>Add garments to the cart to create their inspection forms.</span>
          </div>
        ) : (
          pieces.map(({ item, piece, id }) => {
            const data = inspections[id] || {
              name: item.name,
              tagNumber: '',
              color: '',
              stains: '',
              damage: '',
              make: '',
              brand: '',
              fabric: '',
              condition: 'Good',
              finishPreference: 'Standard Fold',
              size: '',
              defectLocation: '',
              severity: 'Low',
              actionPlan: 'Proceed',
              extraCharge: 0,
              processingStage: 'Received',
              assignedStaff: '',
              qcPassed: false,
              customerAck: false,
              customerApproval: 'Not_Required',
              customerNotes: '',
              notes: '',
              photos: [],
              expanded: true,
            };

            const isExpanded = data.expanded !== false;
            const photosCount = data.photos?.length || 0;
            const garmentName = data.name || item.name || 'Garment';
            const serviceName = item.serviceType || item.service || 'Laundry + Iron';
            const extraChargeVal = Number(data.extraCharge || 0);

            return (
              <article key={id} className="garment-card">
                {/* ── Top Bar with Vector Icon, Title, ID, Service, Stage, Photos Pill & Collapse Pill ── */}
                <div className="garment-top">
                  <div className="garment-title">
                    <div className="garment-thumb">
                      {renderGarmentIcon(garmentName, 'header')}
                    </div>
                    <div className="garment-title-info">
                      <strong>
                        {garmentName} – Piece {piece}
                      </strong>
                      <small>
                        <span className="garment-id-label">Tag:</span>
                        <span className="garment-id-value">{data.tagNumber || id}</span>
                        <span className="dot-sep">•</span>
                        <span className="garment-service-label">Service:</span>
                        <span className="garment-service-value">{serviceName}</span>
                        <span className="dot-sep">•</span>
                        <span className="garment-stage-pill">{data.processingStage || 'Received'}</span>
                        {data.qcPassed && <span className="garment-stage-pill qc">✓ QC Passed</span>}
                        {extraChargeVal > 0 && <span className="garment-stage-pill charge">+₹{extraChargeVal.toFixed(0)}</span>}
                      </small>
                    </div>
                  </div>

                  <div className="garment-actions">
                    <button
                      type="button"
                      className="photos-pill-btn"
                      onClick={() => fileInputRefs.current[id]?.click()}
                      title="Add or view photos"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>{photosCount} photos</span>
                    </button>

                    <button
                      type="button"
                      className="collapse-pill-btn"
                      onClick={() => toggleCardCollapse(id)}
                      title={isExpanded ? 'Collapse inspection card' : 'Expand inspection card'}
                    >
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {isExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Card Body with 4-Col Grid & Photo Evidence Card ── */}
                {isExpanded && (
                  <div className="garment-body">
                    <div className="garment-fields">
                      {/* 1. GARMENT */}
                      <div className="field">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
                          </svg>
                          <span>GARMENT</span>
                        </label>
                        <div className="input-wrap">
                          <span className="inner-icon">
                            {renderGarmentIcon(garmentName, 'field')}
                          </span>
                          <select
                            className="field-control has-icon has-chevron"
                            value={garmentName}
                            onChange={(e) => handleFieldChange(id, 'name', e.target.value)}
                          >
                            {(() => {
                              const opts = [...GARMENT_OPTIONS];
                              if (garmentName && !opts.includes(garmentName)) {
                                opts.unshift(garmentName);
                              }
                              return opts.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ));
                            })()}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 2. COLOR */}
                      <div className="field">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
                          </svg>
                          <span>COLOR</span>
                        </label>
                        <div className="input-wrap">
                          <span className="inner-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                              <circle cx="13.5" cy="6.5" r=".5" fill="#2563eb" />
                              <circle cx="17.5" cy="10.5" r=".5" fill="#2563eb" />
                              <circle cx="8.5" cy="7.5" r=".5" fill="#2563eb" />
                              <circle cx="6.5" cy="12.5" r=".5" fill="#2563eb" />
                              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="field-control has-icon"
                            placeholder="e.g. Navy Blue"
                            value={data.color || ''}
                            onChange={(e) => handleFieldChange(id, 'color', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 3. STAINS / MARKS */}
                      <div className="field">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                          </svg>
                          <span>STAINS / MARKS</span>
                        </label>
                        <div className="input-wrap">
                          <span className="inner-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb" stroke="#2563eb" strokeWidth="1">
                              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="field-control has-icon"
                            placeholder="e.g. Oil stain on sleeve"
                            value={data.stains || ''}
                            onChange={(e) => handleFieldChange(id, 'stains', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 4. MAKE */}
                      <div className="field">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 20h20M6 20V10l6 4V8l6 4V4l4 4v12" />
                          </svg>
                          <span>MAKE</span>
                        </label>
                        <div className="input-wrap">
                          <span className="inner-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                              <path d="M2 20h20M6 20V10l6 4V8l6 4V4l4 4v12" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            list={`make-list-${id}`}
                            className="field-control has-icon"
                            placeholder="Manufacturer / make"
                            value={data.make || ''}
                            onChange={(e) => handleFieldChange(id, 'make', e.target.value)}
                          />
                          <datalist id={`make-list-${id}`}>
                            {MAKE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* 5. BRAND */}
                      <div className="field">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                          </svg>
                          <span>BRAND</span>
                        </label>
                        <div className="input-wrap">
                          <span className="inner-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                              <line x1="7" y1="7" x2="7.01" y2="7" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="field-control has-icon"
                            placeholder="e.g. Van Heusen / Raymond"
                            value={data.brand || ''}
                            onChange={(e) => handleFieldChange(id, 'brand', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 6. FABRIC TYPE */}
                      <div className="field">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>FABRIC TYPE</span>
                        </label>
                        <div className="input-wrap">
                          <span className="inner-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                            </svg>
                          </span>
                          <select
                            className="field-control has-icon has-chevron"
                            value={data.fabric || 'Select fabric'}
                            onChange={(e) => handleFieldChange(id, 'fabric', e.target.value)}
                          >
                            {FABRIC_OPTIONS.map((fab) => (
                              <option key={fab} value={fab}>
                                {fab}
                              </option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 7. GARMENT CONDITION */}
                      <div className="field">
                        <label><span>CONDITION</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.condition || 'Good'}
                            onChange={(e) => handleFieldChange(id, 'condition', e.target.value)}
                          >
                            {CONDITION_OPTIONS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 8. PRE-EXISTING DAMAGE */}
                      <div className="field">
                        <label><span>PRE-EXISTING DAMAGE</span></label>
                        <div className="input-wrap">
                          <input
                            type="text"
                            className="field-control"
                            placeholder="e.g. Loose button, small tear"
                            value={data.damage || ''}
                            onChange={(e) => handleFieldChange(id, 'damage', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 9. DEFECT LOCATION */}
                      <div className="field">
                        <label><span>DEFECT / STAIN LOCATION</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.defectLocation || ''}
                            onChange={(e) => handleFieldChange(id, 'defectLocation', e.target.value)}
                          >
                            <option value="">None / Whole Body</option>
                            {DEFECT_LOCATION_OPTIONS.filter(Boolean).map((loc) => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 10. SEVERITY */}
                      <div className="field">
                        <label><span>SEVERITY</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.severity || 'Low'}
                            onChange={(e) => handleFieldChange(id, 'severity', e.target.value)}
                          >
                            {SEVERITY_OPTIONS.map((sev) => (
                              <option key={sev} value={sev}>{sev}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 11. ACTION PLAN */}
                      <div className="field">
                        <label><span>TREATMENT ACTION</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.actionPlan || 'Proceed'}
                            onChange={(e) => handleFieldChange(id, 'actionPlan', e.target.value)}
                          >
                            {ACTION_PLAN_OPTIONS.map((act) => (
                              <option key={act.value} value={act.value}>{act.label}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 12. EXTRA CHARGE */}
                      <div className="field">
                        <label><span>EXTRA TREATMENT CHARGE (₹)</span></label>
                        <div className="input-wrap">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="field-control"
                            placeholder="0"
                            value={data.extraCharge ?? ''}
                            onChange={(e) => handleFieldChange(id, 'extraCharge', Math.max(0, Number(e.target.value) || 0))}
                          />
                        </div>
                      </div>

                      {/* 13. FINISH / FOLDING PREFERENCE */}
                      <div className="field">
                        <label><span>FINISH / PACKING</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.finishPreference || 'Standard Fold'}
                            onChange={(e) => handleFieldChange(id, 'finishPreference', e.target.value)}
                          >
                            {FINISH_OPTIONS.map((fin) => (
                              <option key={fin} value={fin}>{fin}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 14. SIZE */}
                      <div className="field">
                        <label><span>SIZE / MEASURE</span></label>
                        <div className="input-wrap">
                          <input
                            type="text"
                            className="field-control"
                            placeholder="e.g. M / 40 / Free"
                            value={data.size || ''}
                            onChange={(e) => handleFieldChange(id, 'size', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 15. GARMENT TAG NUMBER */}
                      <div className="field">
                        <label><span>GARMENT TAG BARCODE</span></label>
                        <div className="input-wrap">
                          <input
                            type="text"
                            className="field-control"
                            placeholder="Auto (e.g. ORD-TAG-01)"
                            value={data.tagNumber || ''}
                            onChange={(e) => handleFieldChange(id, 'tagNumber', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 16. PROCESSING STAGE */}
                      <div className="field">
                        <label><span>PROCESSING STAGE</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.processingStage || 'Received'}
                            onChange={(e) => handleFieldChange(id, 'processingStage', e.target.value)}
                          >
                            {STAGE_OPTIONS.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* 17. ASSIGNED STAFF & CUSTOMER APPROVAL */}
                      <div className="field">
                        <label><span>ASSIGNED HANDLER</span></label>
                        <div className="input-wrap">
                          <input
                            type="text"
                            className="field-control"
                            placeholder="QC / Pressing staff name"
                            value={data.assignedStaff || ''}
                            onChange={(e) => handleFieldChange(id, 'assignedStaff', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label><span>CUSTOMER APPROVAL</span></label>
                        <div className="input-wrap">
                          <select
                            className="field-control has-chevron"
                            value={data.customerApproval || 'Not_Required'}
                            onChange={(e) => handleFieldChange(id, 'customerApproval', e.target.value)}
                          >
                            {APPROVAL_OPTIONS.map((ap) => (
                              <option key={ap.value} value={ap.value}>{ap.label}</option>
                            ))}
                          </select>
                          <span className="chevron-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      <div className="field span2">
                        <label><span>QC &amp; SIGN-OFF</span></label>
                        <div className="garment-toggles-wrap">
                          <label className="garment-check-pill">
                            <input
                              type="checkbox"
                              checked={Boolean(data.qcPassed)}
                              onChange={(e) => handleFieldChange(id, 'qcPassed', e.target.checked)}
                            />
                            <span>QC Passed</span>
                          </label>
                          <label className="garment-check-pill">
                            <input
                              type="checkbox"
                              checked={Boolean(data.customerAck)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                onChangeInspections?.({
                                  ...inspections,
                                  [id]: {
                                    ...data,
                                    customerAck: checked,
                                    customerApproval: checked ? 'Approved' : (data.customerApproval || 'Not_Required'),
                                  },
                                });
                              }}
                            />
                            <span>Customer Acknowledged Risks</span>
                          </label>
                        </div>
                      </div>

                      {/* 18. GARMENT NOTES (Span 2) */}
                      <div className="field span2">
                        <label>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>GARMENT NOTES</span>
                        </label>
                        <div className="input-wrap is-textarea">
                          <span className="inner-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </span>
                          <textarea
                            className="field-control has-icon"
                            rows={2}
                            placeholder="Damage, special handling, customer instructions..."
                            value={data.notes || ''}
                            onChange={(e) => handleFieldChange(id, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Garment Photos & Visual Evidence Sub-Card ── */}
                    <div className="garment-photos-card">
                      <div className="photos-card-head">
                        <div className="photos-head-left">
                          <div className="photos-icon-badge">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" fill="#ffffff" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                          <div className="photos-head-info">
                            <div className="photos-head-title-row">
                              <strong>Garment Photos &amp; Visual Evidence</strong>
                              <span className="photos-count-badge">{photosCount} / 6 Attached</span>
                            </div>
                            <p className="photos-head-sub">
                              Upload photos, sketches, or notes to provide additional context about the garment.
                            </p>
                          </div>
                        </div>

                        <div className="photos-head-right">
                          <button
                            type="button"
                            className="photos-head-add-btn"
                            onClick={() => fileInputRefs.current[id]?.click()}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Add Photos</span>
                          </button>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              handleAddPhotos(id, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>

                      {/* Photos Gallery & Upload Trigger Box */}
                      <div className="photos-card-gallery">
                        {photosCount < 6 && (
                          <button
                            type="button"
                            className="photos-upload-card"
                            onClick={() => fileInputRefs.current[id]?.click()}
                            title="Add photos"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="16 16 12 12 8 16" />
                              <line x1="12" y1="12" x2="12" y2="21" />
                              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                            </svg>
                            <span>Add photos</span>
                          </button>
                        )}

                        {(data.photos || []).map((photo, pIdx) => {
                          const src = typeof photo === 'string' ? photo : (photo.url || photo.photo_url);
                          const name = typeof photo === 'string' ? `Photo ${pIdx + 1}` : photo.name || `Photo ${pIdx + 1}`;
                          const photoType = typeof photo === 'string' ? 'Before_Wash' : (photo.photo_type || 'Before_Wash');
                          const caption = typeof photo === 'string' ? '' : (photo.caption || '');

                          return (
                            <div key={photo.id || pIdx} className="photo-tile-card">
                              <div className="photo-preview-tile">
                                <img
                                  src={src}
                                  alt={name}
                                  onClick={() => setLightboxPhoto({ src, name: caption || name })}
                                  title="Click to view full photo"
                                />
                                <button
                                  type="button"
                                  className="photo-delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePhoto(id, pIdx);
                                  }}
                                  title="Remove photo"
                                >
                                  ×
                                </button>
                              </div>
                              <select
                                className="photo-meta-select"
                                value={photoType}
                                onChange={(e) => handlePhotoFieldChange(id, pIdx, 'photo_type', e.target.value)}
                                title="Photo Type"
                              >
                                {PHOTO_TYPE_OPTIONS.map((pt) => (
                                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                className="photo-meta-input"
                                placeholder="Caption..."
                                value={caption}
                                onChange={(e) => handlePhotoFieldChange(id, pIdx, 'caption', e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {lightboxPhoto && (
        <div className="garment-lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
          <div className="garment-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="garment-lightbox-head">
              <strong style={{ fontSize: '13px', color: 'var(--text-primary, #1e293b)' }}>
                {lightboxPhoto.name}
              </strong>
              <button
                type="button"
                className="collapse-pill-btn"
                onClick={() => setLightboxPhoto(null)}
              >
                ✕ Close
              </button>
            </div>
            <div className="garment-lightbox-body">
              <img src={lightboxPhoto.src} alt={lightboxPhoto.name} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
