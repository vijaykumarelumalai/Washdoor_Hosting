// src/components/NoOrdersGraphic.jsx
// Pure Vector SVG Illustration matching the Washdoor 3D Laundry Basket empty state

import React from 'react';

export default function NoOrdersGraphic({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 340 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        width: '100%',
        maxWidth: '300px',
        height: 'auto',
        display: 'block',
        margin: '0 auto 16px',
        overflow: 'visible',
        ...style,
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Ambient background glow */}
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22427a" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#13274a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#070d19" stopOpacity="0" />
        </radialGradient>

        {/* Shadow under basket */}
        <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#02050c" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#050a17" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#050a17" stopOpacity="0" />
        </radialGradient>

        {/* T-shirt gradients */}
        <linearGradient id="shirtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b95ea" />
          <stop offset="100%" stopColor="#326ec4" />
        </linearGradient>

        {/* Folded white towel */}
        <linearGradient id="whiteTowel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8faff" />
          <stop offset="70%" stopColor="#e1ebf9" />
          <stop offset="100%" stopColor="#b4cbef" />
        </linearGradient>

        {/* Folded blue garment */}
        <linearGradient id="blueTowel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d7fe3" />
          <stop offset="100%" stopColor="#1d4fa4" />
        </linearGradient>

        {/* Laundry basket front */}
        <linearGradient id="basketFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5294f3" />
          <stop offset="40%" stopColor="#3e7de0" />
          <stop offset="100%" stopColor="#255bb5" />
        </linearGradient>

        {/* Laundry basket rim */}
        <linearGradient id="basketRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7cb1fb" />
          <stop offset="100%" stopColor="#4f8ce8" />
        </linearGradient>

        {/* Receipt card */}
        <linearGradient id="receiptCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8eff9" />
        </linearGradient>

        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── 1. Soft Backdrop Glow ── */}
      <ellipse cx="170" cy="115" rx="145" ry="95" fill="url(#bgGlow)" />

      {/* ── 2. Ground Shadow ── */}
      <ellipse cx="168" cy="182" rx="115" ry="18" fill="url(#groundShadow)" />

      {/* ── 3. Sparkles / Stars ── */}
      {/* Top Left Major Sparkle */}
      <g transform="translate(98, 48)">
        <path
          d="M 10 0 Q 10 10 0 10 Q 10 10 10 20 Q 10 10 20 10 Q 10 10 10 0 Z"
          fill="#8ec0ff"
          filter="url(#softGlow)"
        />
        <circle cx="10" cy="10" r="2.5" fill="#ffffff" />
      </g>
      {/* Small Left Sparkle */}
      <g transform="translate(85, 76) scale(0.65)">
        <path
          d="M 10 0 Q 10 10 0 10 Q 10 10 10 20 Q 10 10 20 10 Q 10 10 10 0 Z"
          fill="#6daaff"
        />
        <circle cx="10" cy="10" r="2" fill="#ffffff" />
      </g>
      {/* Tiny Accent Sparkle */}
      <circle cx="118" cy="80" r="1.5" fill="#a8cfff" opacity="0.8" />

      {/* ── 4. Hanging Shirt (Behind basket) ── */}
      <g id="hangingShirt">
        {/* Hanger Hook */}
        <path
          d="M 215 54 C 215 47 219 44 223 44 C 227 44 230 47 229 51 C 228 55 224 57 222 59 L 222 66"
          stroke="#9dc2f5"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Hanger Triangle */}
        <path
          d="M 198 76 L 222 65 L 246 76 Z"
          stroke="#7ca6e3"
          strokeWidth="2.2"
          fill="#1c3761"
          opacity="0.85"
        />
        {/* Shirt Body */}
        <path
          d="M 207 72 
             C 214 77 230 77 237 72 
             L 255 83 L 246 102 L 238 98 
             L 238 152 
             L 194 152 
             L 194 98 L 186 102 L 177 83 Z"
          fill="url(#shirtGrad)"
        />
        {/* Shirt Collar / Neckline */}
        <path
          d="M 213 72 C 217 76 227 76 231 72"
          stroke="#325ea3"
          strokeWidth="2"
          fill="none"
        />
        {/* Shirt side crease */}
        <path d="M 201 106 L 201 150" stroke="#2b599f" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* ── 5. Folded Laundry Inside Basket ── */}
      <g id="foldedClothes">
        {/* Back Dark Blue Towel */}
        <rect
          x="142"
          y="84"
          width="48"
          height="28"
          rx="12"
          fill="#1c478e"
        />
        {/* Mid Royal Blue Folded Towel */}
        <rect
          x="128"
          y="90"
          width="58"
          height="32"
          rx="13"
          fill="url(#blueTowel)"
        />
        {/* Blue Towel Highlight */}
        <path
          d="M 132 94 C 145 91 168 91 182 94"
          stroke="#6ba3fa"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Front Fluffy White Folded Towel */}
        <rect
          x="106"
          y="99"
          width="56"
          height="30"
          rx="13"
          fill="url(#whiteTowel)"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"
        />
        <path
          d="M 112 103 C 122 101 146 101 156 103"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* ── 6. Laundry Basket ── */}
      <g id="laundryBasket">
        {/* Basket Rim */}
        <rect
          x="92"
          y="118"
          width="118"
          height="14"
          rx="7"
          fill="url(#basketRim)"
          filter="drop-shadow(0 3px 4px rgba(0,0,0,0.3))"
        />
        {/* Basket Body (tapered) */}
        <path
          d="M 98 126 L 108 174 C 109 178 113 181 117 181 L 185 181 C 189 181 193 178 194 174 L 204 126 Z"
          fill="url(#basketFront)"
        />

        {/* Basket Perforations (grid of rounded pill slots) */}
        <g fill="#173e80" opacity="0.9">
          {/* Row 1 */}
          <rect x="110" y="134" width="7" height="15" rx="3.5" />
          <rect x="123" y="134" width="7" height="15" rx="3.5" />
          <rect x="136" y="134" width="7" height="15" rx="3.5" />
          <rect x="149" y="134" width="7" height="15" rx="3.5" />
          <rect x="162" y="134" width="7" height="15" rx="3.5" />
          <rect x="175" y="134" width="7" height="15" rx="3.5" />
          <rect x="188" y="134" width="6" height="15" rx="3" />

          {/* Row 2 */}
          <rect x="115" y="156" width="7" height="15" rx="3.5" />
          <rect x="127" y="156" width="7" height="15" rx="3.5" />
          <rect x="139" y="156" width="7" height="15" rx="3.5" />
          <rect x="151" y="156" width="7" height="15" rx="3.5" />
          <rect x="163" y="156" width="7" height="15" rx="3.5" />
          <rect x="175" y="156" width="7" height="15" rx="3.5" />
          <rect x="186" y="156" width="6" height="15" rx="3" />
        </g>

        {/* Basket Base Highlight */}
        <path
          d="M 118 178 L 184 178"
          stroke="#4e8ee9"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>

      {/* ── 7. Order Document / Receipt Card ── */}
      <g id="receiptDoc" transform="translate(216, 134) rotate(-3)">
        {/* Receipt Sheet */}
        <rect
          x="0"
          y="0"
          width="32"
          height="42"
          rx="6"
          fill="url(#receiptCard)"
          filter="drop-shadow(0 6px 12px rgba(0,0,0,0.35))"
        />
        {/* Top Header Circle */}
        <circle cx="8" cy="9" r="3" fill="#3273dc" />
        {/* Top Header Line */}
        <rect x="14" y="7.5" width="12" height="3" rx="1.5" fill="#3273dc" />
        {/* Text Lines */}
        <rect x="6" y="17" width="20" height="2" rx="1" fill="#759bcf" />
        <rect x="6" y="23" width="16" height="2" rx="1" fill="#9dbbe3" />
        <rect x="6" y="29" width="18" height="2" rx="1" fill="#9dbbe3" />
        {/* Checkmark icon */}
        <path
          d="M 8 35 L 11 37.5 L 16 32"
          stroke="#26a269"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
