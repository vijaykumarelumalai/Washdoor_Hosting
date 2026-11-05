// src/components/ClothIllustration.tsx
// High-fidelity vector illustrations of all 16 laundry items matching POS UI

import React from 'react';

export interface ClothIllustrationProps {
  itemId: string;
  size?: number | string;
}

export default function ClothIllustration({ itemId, size = 64 }: ClothIllustrationProps): React.ReactElement {
  switch (itemId) {
    case 'shirt':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Light Blue Dress Shirt */}
          <path d="M26 18 L34 26 L46 26 L54 18 L68 28 L60 38 L54 34 L54 72 L26 72 L26 34 L20 38 L12 28 Z" fill="#93c5fd" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" />
          {/* Collar */}
          <polygon points="34,26 40,36 30,30" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.5" />
          <polygon points="46,26 40,36 50,30" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.5" />
          {/* Button Placket */}
          <line x1="40" y1="36" x2="40" y2="72" stroke="#60a5fa" strokeWidth="2" />
          <circle cx="40" cy="44" r="1.5" fill="#1e40af" />
          <circle cx="40" cy="52" r="1.5" fill="#1e40af" />
          <circle cx="40" cy="60" r="1.5" fill="#1e40af" />
          {/* Chest Pocket */}
          <rect x="29" y="38" width="8" height="9" rx="1" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="1" />
        </svg>
      );

    case 'tshirt':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Black Crewneck T-Shirt */}
          <path d="M24 20 C32 26 48 26 56 20 L72 30 L64 42 L55 36 L55 72 L25 72 L25 36 L16 42 L8 30 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
          {/* Neck Rib */}
          <path d="M30 20 C36 25 44 25 50 20" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Subtle Fabric Highlight */}
          <path d="M28 36 L28 68" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );

    case 'formal_pant':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Charcoal Formal Trousers */}
          <path d="M25 14 L55 14 L57 74 L42 74 L40 38 L38 74 L23 74 Z" fill="#334155" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
          {/* Waistband & Creases */}
          <rect x="25" y="14" width="30" height="5" fill="#1e293b" />
          <line x1="32" y1="20" x2="32" y2="72" stroke="#475569" strokeWidth="1.2" />
          <line x1="48" y1="20" x2="48" y2="72" stroke="#475569" strokeWidth="1.2" />
        </svg>
      );

    case 'jeans':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Blue Denim Jeans */}
          <path d="M24 14 L56 14 L58 74 L43 74 L40 36 L37 74 L22 74 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
          {/* Denim fade */}
          <path d="M28 26 Q30 52 30 68" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <path d="M52 26 Q50 52 50 68" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          {/* Waistband & Fly */}
          <rect x="24" y="14" width="32" height="6" fill="#1d4ed8" />
          <line x1="40" y1="20" x2="40" y2="34" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Rivets */}
          <circle cx="28" cy="20" r="1.5" fill="#f59e0b" />
          <circle cx="52" cy="20" r="1.5" fill="#f59e0b" />
        </svg>
      );

    case 'saree':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Traditional Silk Saree Draped Form */}
          <path d="M20 18 L60 18 L62 72 C50 75 30 75 18 72 Z" fill="#e11d48" stroke="#be123c" strokeWidth="2" strokeLinejoin="round" />
          {/* Golden Zari Border */}
          <rect x="18" y="66" width="44" height="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          {/* Diagonal Pleats */}
          <path d="M26 18 Q36 44 24 66" stroke="#fbbf24" strokeWidth="1.8" fill="none" />
          <path d="M34 18 Q44 44 32 66" stroke="#fda4af" strokeWidth="1.5" fill="none" />
          <path d="M42 18 Q52 44 40 66" stroke="#fbbf24" strokeWidth="1.8" fill="none" />
          {/* Pallu Motif */}
          <circle cx="50" cy="30" r="5" fill="#fbbf24" opacity="0.8" />
          <circle cx="50" cy="46" r="5" fill="#fbbf24" opacity="0.8" />
        </svg>
      );

    case 'suit_blazer':
    case 'blazer':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Navy Executive Blazer */}
          <path d="M20 16 L34 22 L46 22 L60 16 L74 30 L64 42 L58 36 L58 72 L22 72 L22 36 L16 42 L6 30 Z" fill="#1e3a8a" stroke="#172554" strokeWidth="2" strokeLinejoin="round" />
          {/* Lapels */}
          <polygon points="34,22 40,48 26,30" fill="#1d4ed8" stroke="#172554" strokeWidth="1.5" />
          <polygon points="46,22 40,48 54,30" fill="#1d4ed8" stroke="#172554" strokeWidth="1.5" />
          {/* Tie & Inner Shirt */}
          <polygon points="36,22 40,28 44,22" fill="#ffffff" />
          <polygon points="39,26 41,26 42,42 40,46 38,42" fill="#dc2626" />
          {/* Gold Buttons */}
          <circle cx="40" cy="52" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
          <circle cx="40" cy="60" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
        </svg>
      );

    case 'jacket':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Warm Winter Puffer Jacket */}
          <path d="M20 18 L32 24 L48 24 L60 18 L72 32 L64 44 L56 38 L56 72 L24 72 L24 38 L16 44 L8 32 Z" fill="#0d9488" stroke="#115e59" strokeWidth="2" strokeLinejoin="round" />
          {/* Horizontal Puffer Quilting */}
          <line x1="24" y1="36" x2="56" y2="36" stroke="#14b8a6" strokeWidth="2.5" />
          <line x1="24" y1="46" x2="56" y2="46" stroke="#14b8a6" strokeWidth="2.5" />
          <line x1="24" y1="56" x2="56" y2="56" stroke="#14b8a6" strokeWidth="2.5" />
          <line x1="24" y1="64" x2="56" y2="64" stroke="#14b8a6" strokeWidth="2.5" />
          {/* Central Zip */}
          <line x1="40" y1="24" x2="40" y2="72" stroke="#f1f5f9" strokeWidth="1.8" strokeDasharray="2 2" />
        </svg>
      );

    case 'bedsheet':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Folded Home Linen / Bed Sheet Stack */}
          <rect x="16" y="46" width="48" height="14" rx="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
          <rect x="20" y="32" width="44" height="14" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <rect x="24" y="18" width="40" height="14" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Fold accent lines */}
          <line x1="24" y1="25" x2="60" y2="25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="39" x2="60" y2="39" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="53" x2="60" y2="53" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'shoes':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Modern Sneaker / Athletic Footwear */}
          <path d="M14 54 C14 42 22 36 34 36 L46 40 L60 48 L66 54 C68 56 68 62 64 64 L18 64 C14 64 14 58 14 54 Z" fill="#6366f1" stroke="#4338ca" strokeWidth="2" strokeLinejoin="round" />
          {/* White Rubber Sole */}
          <rect x="14" y="60" width="52" height="6" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Toe cap and heel cup */}
          <path d="M54 50 L64 58" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
          {/* Eyelets and Laces */}
          <circle cx="38" cy="42" r="1.5" fill="#ffffff" />
          <circle cx="44" cy="45" r="1.5" fill="#ffffff" />
          <circle cx="50" cy="49" r="1.5" fill="#ffffff" />
          <line x1="36" y1="41" x2="48" y2="47" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'curtain':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Hanging Drapery / Window Curtain */}
          <rect x="12" y="14" width="56" height="4" rx="2" fill="#78716c" stroke="#44403c" strokeWidth="1.5" />
          {/* Rings */}
          <circle cx="20" cy="16" r="3" stroke="#eab308" strokeWidth="1.5" fill="none" />
          <circle cx="34" cy="16" r="3" stroke="#eab308" strokeWidth="1.5" fill="none" />
          <circle cx="48" cy="16" r="3" stroke="#eab308" strokeWidth="1.5" fill="none" />
          <circle cx="62" cy="16" r="3" stroke="#eab308" strokeWidth="1.5" fill="none" />
          {/* Wavy pleats */}
          <path d="M18 20 C22 45 16 65 18 72 L32 72 C30 65 34 45 32 20 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
          <path d="M32 20 C36 45 30 65 32 72 L46 72 C44 65 48 45 46 20 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          <path d="M46 20 C50 45 44 65 46 72 L60 72 C58 65 62 45 60 20 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
        </svg>
      );

    case 'kurta':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Traditional Indian Kurta */}
          <path d="M26 16 L35 22 L45 22 L54 16 L68 28 L60 38 L54 34 L54 74 L26 74 L26 34 L20 38 L12 28 Z" fill="#10b981" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
          {/* Mandarin Collar */}
          <path d="M35 22 C37 18 43 18 45 22" stroke="#047857" strokeWidth="2" fill="none" />
          {/* Embroidered Placket */}
          <rect x="38" y="22" width="4" height="26" fill="#a7f3d0" stroke="#059669" strokeWidth="1" />
          <circle cx="40" cy="28" r="1.2" fill="#065f46" />
          <circle cx="40" cy="35" r="1.2" fill="#065f46" />
          <circle cx="40" cy="42" r="1.2" fill="#065f46" />
          {/* Side Slits */}
          <line x1="26" y1="56" x2="26" y2="74" stroke="#047857" strokeWidth="2.5" />
          <line x1="54" y1="56" x2="54" y2="74" stroke="#047857" strokeWidth="2.5" />
        </svg>
      );

    case 'salwar':
    case 'salwar_suit':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Salwar Kameez Ethnic Set */}
          <path d="M26 16 L35 22 L45 22 L54 16 L66 26 L58 36 L52 32 L54 62 L26 62 L28 32 L22 36 L14 26 Z" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="2" strokeLinejoin="round" />
          {/* Bottom gathered salwar */}
          <path d="M28 62 L24 74 L38 74 L40 64 L42 74 L56 74 L52 62 Z" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.5" />
          {/* Dupatta drape accent */}
          <path d="M22 22 Q40 40 58 22" stroke="#f43f5e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'dhoti':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Traditional South Indian Dhoti / Veshti with Gold Border */}
          <path d="M22 18 L58 18 L60 74 L20 74 Z" fill="#fffbeb" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
          {/* Gold Jari Border at side and bottom */}
          <rect x="20" y="68" width="40" height="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          <rect x="52" y="18" width="6" height="50" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          {/* Center pleat folds */}
          <line x1="38" y1="18" x2="38" y2="68" stroke="#d97706" strokeWidth="1.5" />
          <line x1="44" y1="18" x2="44" y2="68" stroke="#fcd34d" strokeWidth="1.5" />
        </svg>
      );

    case 'towel':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Plush Cotton Bath Towel */}
          <rect x="22" y="16" width="36" height="52" rx="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          {/* Terry cloth texture bars */}
          <line x1="22" y1="26" x2="58" y2="26" stroke="#bae6fd" strokeWidth="3" />
          <line x1="22" y1="34" x2="58" y2="34" stroke="#bae6fd" strokeWidth="1.5" />
          <line x1="22" y1="58" x2="58" y2="58" stroke="#bae6fd" strokeWidth="3" />
          {/* Fringe at bottom */}
          <line x1="24" y1="68" x2="24" y2="72" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="30" y1="68" x2="30" y2="72" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="36" y1="68" x2="36" y2="72" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="42" y1="68" x2="42" y2="72" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="48" y1="68" x2="48" y2="72" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="54" y1="68" x2="54" y2="72" stroke="#0284c7" strokeWidth="1.5" />
        </svg>
      );

    case 'blanket':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Heavy Winter Comforter / Quilt */}
          <rect x="16" y="24" width="48" height="42" rx="6" fill="#f43f5e" stroke="#be123c" strokeWidth="2" />
          {/* Diamond Stitched Quilting */}
          <path d="M40 24 L64 45 L40 66 L16 45 Z" stroke="#fda4af" strokeWidth="1.8" fill="none" />
          <circle cx="40" cy="45" r="3" fill="#ffe4e6" />
          <line x1="16" y1="24" x2="64" y2="66" stroke="#fda4af" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="64" y1="24" x2="16" y2="66" stroke="#fda4af" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );

    default:
      // Generic Laundry Hanger / Garment
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="24" r="6" stroke="#94a3b8" strokeWidth="2" fill="none" />
          <path d="M40 30 L40 36 L18 52 C16 54 18 58 22 58 L58 58 C62 58 64 54 62 52 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
          <line x1="22" y1="58" x2="58" y2="58" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}
