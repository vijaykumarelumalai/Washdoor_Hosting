// src/components/ClothIllustration.jsx
// High-fidelity vector illustrations of all 16 laundry items matching POS UI

import React from 'react';

export default function ClothIllustration({ itemId, size = 64 }) {
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
          {/* Pockets */}
          <path d="M26 21 C30 22 34 26 34 30" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
          <path d="M54 21 C50 22 46 26 46 30" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
        </svg>
      );

    case 'saree':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Traditional Silk Saree in Red/Magenta & Gold */}
          <path d="M30 18 L50 18 L56 74 L24 74 Z" fill="#db2777" stroke="#be185d" strokeWidth="2" />
          {/* Diagonal Pleats / Pallu */}
          <path d="M26 26 L54 44" stroke="#f59e0b" strokeWidth="3" />
          <path d="M24 36 L55 54" stroke="#f59e0b" strokeWidth="2.5" />
          <path d="M24 46 L55 64" stroke="#f59e0b" strokeWidth="2.5" />
          {/* Zari Gold Border */}
          <rect x="24" y="68" width="32" height="6" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
          <line x1="24" y1="71" x2="56" y2="71" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="2 2" />
          {/* Blouse top */}
          <path d="M32 18 L48 18 L46 26 L34 26 Z" fill="#b91c1c" />
        </svg>
      );

    case 'chudidar':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Green Designer Salwar Kameez */}
          <path d="M28 16 L52 16 L58 56 L46 56 L48 74 L42 74 L40 60 L38 74 L32 74 L34 56 L22 56 Z" fill="#059669" stroke="#047857" strokeWidth="2" strokeLinejoin="round" />
          {/* Dupatta Scarf */}
          <path d="M24 18 C28 32 32 44 26 62" stroke="#fde047" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M54 22 C50 36 50 48 54 62" stroke="#fde047" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* Gold Neck Embroidery */}
          <path d="M35 16 C37 24 43 24 45 16" stroke="#f59e0b" strokeWidth="2" fill="none" />
        </svg>
      );

    case 'kurti':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Pink Embroidered Kurti */}
          <path d="M26 16 L54 16 L64 30 L56 34 L52 30 L54 68 L48 70 L48 54 L44 54 L44 70 L26 68 L28 30 L24 34 L16 30 Z" fill="#ec4899" stroke="#db2777" strokeWidth="2" strokeLinejoin="round" />
          {/* Yoke Work */}
          <path d="M34 16 C36 24 44 24 46 16" stroke="#fef08a" strokeWidth="2" fill="none" />
          <line x1="40" y1="24" x2="40" y2="44" stroke="#fef08a" strokeWidth="1.5" />
          <circle cx="40" cy="28" r="1.2" fill="#f59e0b" />
          <circle cx="40" cy="34" r="1.2" fill="#f59e0b" />
          <circle cx="40" cy="40" r="1.2" fill="#f59e0b" />
        </svg>
      );

    case 'shorts':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Grey Athletic Drawstring Shorts */}
          <path d="M22 24 L58 24 L62 56 L44 56 L40 40 L36 56 L18 56 Z" fill="#64748b" stroke="#475569" strokeWidth="2" strokeLinejoin="round" />
          {/* Elastic Waist */}
          <rect x="22" y="24" width="36" height="6" fill="#475569" rx="1" />
          {/* Drawstring ties */}
          <line x1="38" y1="30" x2="36" y2="38" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="42" y1="30" x2="44" y2="38" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'bedsheet':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Stacked Folded Bedsheets */}
          {/* Bottom sheet - White */}
          <rect x="18" y="52" width="44" height="14" rx="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          {/* Middle sheet - Soft Slate */}
          <rect x="16" y="38" width="48" height="14" rx="4" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
          {/* Top sheet - Sky Blue */}
          <rect x="14" y="24" width="52" height="14" rx="4" fill="#60a5fa" stroke="#3b82f6" strokeWidth="2" />
          <path d="M14 31 Q40 34 66 31" stroke="#93c5fd" strokeWidth="1.5" />
        </svg>
      );

    case 'pillow_cover':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Plush White Pillow */}
          <rect x="16" y="26" width="48" height="32" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          {/* Flange Stitching Border */}
          <rect x="21" y="31" width="38" height="22" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
          {/* Depth crease */}
          <path d="M26 42 Q40 45 54 42" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'towel':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Royal Blue Neatly Folded Towel */}
          <rect x="16" y="30" width="48" height="30" rx="6" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
          <rect x="20" y="24" width="44" height="14" rx="4" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
          {/* Ribbed Borders */}
          <line x1="22" y1="48" x2="58" y2="48" stroke="#60a5fa" strokeWidth="2" />
          <line x1="22" y1="52" x2="58" y2="52" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
      );

    case 'jacket':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Black Zip-Up Insulated Jacket */}
          <path d="M24 18 L34 22 L46 22 L56 18 L68 32 L60 42 L54 36 L55 70 L25 70 L26 36 L20 42 L12 32 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
          {/* Collar Stand */}
          <path d="M34 22 L34 16 L46 16 L46 22" stroke="#0f172a" strokeWidth="2" fill="#334155" />
          {/* Center Silver Zipper */}
          <line x1="40" y1="16" x2="40" y2="70" stroke="#94a3b8" strokeWidth="2" />
          <rect x="38" y="26" width="4" height="6" rx="1" fill="#f1f5f9" />
          {/* Horizontal Baffles */}
          <line x1="26" y1="46" x2="54" y2="46" stroke="#334155" strokeWidth="1.5" />
          <line x1="26" y1="58" x2="54" y2="58" stroke="#334155" strokeWidth="1.5" />
        </svg>
      );

    case 'blazer_suit':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Navy Tailored Suit Blazer */}
          <path d="M24 18 L34 24 L46 24 L56 18 L68 32 L60 42 L55 36 L56 72 L24 72 L25 36 L20 42 L12 32 Z" fill="#1e3a8a" stroke="#172554" strokeWidth="2" strokeLinejoin="round" />
          {/* White Shirt Collar & Red Tie */}
          <polygon points="36,24 44,24 40,32" fill="#ffffff" />
          <polygon points="39,32 41,32 42,48 40,52 38,48" fill="#dc2626" />
          {/* Lapels */}
          <polygon points="32,24 40,46 36,46 28,32" fill="#1d4ed8" stroke="#172554" strokeWidth="1" />
          <polygon points="48,24 40,46 44,46 52,32" fill="#1d4ed8" stroke="#172554" strokeWidth="1" />
          {/* Gold Buttons */}
          <circle cx="40" cy="54" r="1.8" fill="#f59e0b" />
          <circle cx="40" cy="62" r="1.8" fill="#f59e0b" />
        </svg>
      );

    case 'sweater':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Heather Grey Knit Sweater */}
          <path d="M25 20 C33 24 47 24 55 20 L70 32 L62 44 L54 36 L54 70 L26 70 L26 36 L18 44 L10 32 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
          {/* Ribbed Hem & Cuffs */}
          <rect x="26" y="66" width="28" height="4" fill="#64748b" />
          <path d="M32 20 C36 23 44 23 48 20" stroke="#475569" strokeWidth="2" fill="none" />
        </svg>
      );

    case 'cap':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Black Baseball Cap */}
          <path d="M22 46 C22 28 58 28 58 46 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          {/* Curved Visor */}
          <path d="M16 46 Q38 43 62 46 C66 48 64 54 58 54 Q38 50 16 50 Z" fill="#0f172a" />
          {/* Top Button */}
          <circle cx="40" cy="28" r="2.5" fill="#475569" />
          {/* Panel Seam */}
          <path d="M40 30 Q40 40 40 46" stroke="#475569" strokeWidth="1.2" />
        </svg>
      );

    case 'kurta':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Ethnic Long Kurta */}
          <path d="M26 18 L34 24 L46 24 L54 18 L68 28 L60 38 L54 34 L55 74 L25 74 L26 34 L20 38 L12 28 Z" fill="#fed7aa" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="34,24 40,32 30,28" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.5" />
          <polygon points="46,24 40,32 50,28" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="40" y1="32" x2="40" y2="52" stroke="#ea580c" strokeWidth="1.5" />
          <circle cx="40" cy="38" r="1.5" fill="#c2410c" />
          <circle cx="40" cy="46" r="1.5" fill="#c2410c" />
        </svg>
      );

    case 'frock':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Kids / Girl's Flared Frock */}
          <path d="M30 18 C35 22 45 22 50 18 L60 26 L54 34 L50 30 L52 42 L66 72 L14 72 L28 42 L30 30 L26 34 L20 26 Z" fill="#fbcfe8" stroke="#ec4899" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 42 C36 45 44 45 52 42" stroke="#db2777" strokeWidth="2" fill="none" />
          <circle cx="40" cy="42" r="3" fill="#be185d" />
        </svg>
      );

    case 'shoes':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Athletic Sneaker / Shoe */}
          <path d="M14 52 C14 42 22 36 30 36 L44 36 L56 46 L68 50 C70 54 68 62 62 64 L16 64 C13 64 12 58 14 52 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
          {/* Sole */}
          <path d="M12 60 L68 60 C70 60 72 63 70 66 L66 68 L14 68 C12 68 10 65 12 60 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Shoe laces */}
          <line x1="36" y1="38" x2="44" y2="44" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="34" y1="44" x2="42" y2="50" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'curtain':
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          {/* Beige Window Curtain on Wooden Rod */}
          {/* Curtain Rod */}
          <rect x="12" y="14" width="56" height="4" rx="2" fill="#78350f" stroke="#451a03" strokeWidth="1" />
          <circle cx="12" cy="16" r="3" fill="#92400e" />
          <circle cx="68" cy="16" r="3" fill="#92400e" />
          {/* Draped Curtains */}
          <path d="M20 18 C24 24 24 68 20 74 L34 74 C38 68 38 24 34 18 Z" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
          <path d="M46 18 C50 24 50 68 46 74 L60 74 C64 68 64 24 60 18 Z" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
          {/* Curtain Tie Backs */}
          <line x1="18" y1="46" x2="34" y2="46" stroke="#b45309" strokeWidth="2" />
          <line x1="46" y1="46" x2="62" y2="46" stroke="#b45309" strokeWidth="2" />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        </svg>
      );
  }
}
