// src/__tests__/mobileSidebarResponsiveness.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPath = path.resolve(__dirname, '../App.jsx');
const cssPath = path.resolve(__dirname, '../styles/washdoor.css');

test('1. App.jsx enforces mobile responsiveness below/at 768px and desktop collapse', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  // isMobile detection at <= 768px
  assert.match(content, /isMobile[\s\S]*?768/);
  // Full sidebar content for mobile drawer
  assert.match(content, /showFullSidebarContent\s*=\s*isMobile\s*\?\s*true\s*:\s*!isNavCollapsed/);
  // Collapsed class applied only on desktop
  assert.match(content, /!isMobile\s*&&\s*isNavCollapsed\s*\?\s*['"]\s*collapsed['"]/);
});

test('2. App.jsx always shows full expanded sidebar components on mobile', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  // Brand Name and Subtitle
  assert.match(content, /showFullSidebarContent\s*&&[\s\S]*?sidebar-brand-name[\s\S]*?Washdoor/);
  assert.match(content, /showFullSidebarContent\s*&&[\s\S]*?sidebar-brand-sub[\s\S]*?Ranipet/);

  // Complete Navigation labels
  assert.match(content, /showFullSidebarContent\s*&&[\s\S]*?nav-label/);

  // Store card name and live status
  assert.match(content, /showFullSidebarContent\s*&&[\s\S]*?Ranipet Store #1/);
  assert.match(content, /showFullSidebarContent\s*&&[\s\S]*?Live Counter Active/);

  // Sign Out button with full text label (supports i18n)
  assert.match(content, /showFullSidebarContent\s*&&[\s\S]*?<span>(?:Sign Out|\{t\([^)]*['"]Sign Out['"][^)]*\)\})<\/span>/);
});

test('3. App.jsx implements desktop hamburger button in topbar when collapsed (Image 5 style)', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /topbar-desktop-toggle-btn/);
  assert.match(content, /!isMobile\s*&&\s*isNavCollapsed/);
  assert.match(content, /onClick=\{toggleNavCollapse\}/);
});

test('4. App.jsx implements 280px drawer close functionality (backdrop, header toggle, nav click, signout)', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  // Backdrop overlay click closes drawer
  assert.match(content, /sidebar-overlay[\s\S]*?onClick=\{\(\)\s*=>\s*setSidebarOpen\(false\)\}/);

  // Close toggle inside drawer header
  assert.match(content, /sidebar-hamburger-btn[\s\S]*?setSidebarOpen\(false\)/);

  // Navigation tab click closes drawer
  assert.match(content, /navigateToTab[\s\S]*?setSidebarOpen\(false\)/);

  // Sign out closes drawer
  assert.match(content, /sidebar-signout-btn[\s\S]*?setSidebarOpen\(false\)/);
});

test('5. washdoor.css implements 280px slide-in drawer with backdrop for <= 768px', () => {
  const content = fs.readFileSync(cssPath, 'utf8');

  // Check 768px media query
  assert.match(content, /@media\s*\(max-width:\s*768px\)/);

  // Drawer width 280px
  assert.match(content, /width:\s*280px\s*!important/);

  // Off-screen drawer when closed
  assert.match(content, /transform:\s*translateX\(-100%\)\s*!important/);

  // Slide-in drawer when mobile-open
  assert.match(content, /\.sidebar\.mobile-open[\s\S]*?transform:\s*translateX\(0\)\s*!important/);

  // Backdrop overlay styles
  assert.match(content, /\.sidebar-overlay\.open[\s\S]*?backdrop-filter/);
});

test('6. washdoor.css styles avatar button "A" prominently in Light and Dark themes', () => {
  const content = fs.readFileSync(cssPath, 'utf8');

  // Avatar button must have defined visible background and white text in both themes
  assert.match(content, /\.top-admin-avatar-btn\s*\{[\s\S]*?border-radius:\s*50%/);
  assert.match(content, /\.top-admin-avatar-btn\s*\{[\s\S]*?background:/);
  assert.match(content, /\.top-admin-avatar-btn\s*\{[\s\S]*?color:\s*#ffffff/);

  // Explicit light theme styling for avatar button "A"
  assert.match(content, /body\.light-theme\s*\.top-admin-avatar-btn/);

  // Explicit dark theme styling for avatar button "A"
  assert.match(content, /body\.dark-theme\s*\.top-admin-avatar-btn/);
});

test('7. washdoor.css provides desktop toggle button styles (Image 5 style)', () => {
  const content = fs.readFileSync(cssPath, 'utf8');

  assert.match(content, /\.topbar-desktop-toggle-btn\s*\{/);
  assert.match(content, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.topbar-desktop-toggle-btn[\s\S]*?display:\s*none\s*!important/);
});

test('8. Mobile device hides marked fields (search, notification bell, currency, reports, language) with prominent Admin Account (Image 2 style)', () => {
  const appContent = fs.readFileSync(appPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // App.jsx: hides on mobile via !isMobile check
  assert.match(appContent, /!isMobile\s*&&\s*\(\s*<div\s+className="topbar-search-wrap"/);
  assert.match(appContent, /!isMobile\s*&&\s*\(\s*<button[\s\S]*?topbar-notification-btn/);
  assert.match(appContent, /!isMobile\s*&&\s*\(\s*<div[\s\S]*?top-currency-dropdown-wrap/);
  assert.match(appContent, /!isMobile\s*&&\s*\(\s*<div[\s\S]*?top-language-dropdown-wrap/);
  assert.match(appContent, /!isMobile\s*&&\s*\(\s*<button[\s\S]*?topbar-reports-btn/);

  // App.jsx: renders professional mobile brand header on mobile
  assert.match(appContent, /isMobile\s*&&\s*\(\s*<div\s+className="topbar-mobile-left"/);
  assert.match(appContent, /topbar-mobile-brand/);
  assert.match(appContent, /topbar-mobile-name[\s\S]*?Washdoor/);

  // washdoor.css: hides marked fields under max-width 768px
  assert.match(cssContent, /\.topbar-search-wrap[\s\S]*?display:\s*none\s*!important/);
  assert.match(cssContent, /\.topbar-notification-btn[\s\S]*?display:\s*none\s*!important/);
  assert.match(cssContent, /\.top-currency-dropdown-wrap[\s\S]*?display:\s*none\s*!important/);
  assert.match(cssContent, /\.top-language-dropdown-wrap[\s\S]*?display:\s*none\s*!important/);
  assert.match(cssContent, /\.topbar-reports-btn[\s\S]*?display:\s*none\s*!important/);

  // washdoor.css: ensures Admin Account avatar is prominent on mobile
  assert.match(cssContent, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.top-admin-avatar-btn\s*\{[\s\S]*?width:\s*34px\s*!important/);
});

test('9. Admin Account dropdown is visible and not clipped on mobile screens', () => {
  const appContent = fs.readFileSync(appPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // App.jsx: ensures avatar click toggles admin dropdown and stops propagation
  assert.match(appContent, /className=\{`top-admin-avatar-btn[\s\S]*?activeDropdown\s*===\s*['"]admin['"]/);
  assert.match(appContent, /onClick=\{\(e\)\s*=>\s*\{[\s\S]*?e\.stopPropagation\(\);[\s\S]*?setActiveDropdown/);
  assert.match(appContent, /activeDropdown\s*===\s*['"]admin['"]\s*&&\s*\([\s\S]*?top-admin-dropdown/);

  // App.jsx: handles outside click & touch to dismiss
  assert.match(appContent, /document\.addEventListener\(['"]click['"],\s*handleGlobalClick\)/);
  assert.match(appContent, /document\.addEventListener\(['"]touchstart['"],\s*handleGlobalClick/);

  // washdoor.css: mobile topbar MUST have overflow: visible so popovers are not clipped
  assert.match(cssContent, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.topbar[\s\S]*?overflow:\s*visible\s*!important/);

  // washdoor.css: mobile top-admin-dropdown has proper absolute popover styling with high z-index
  assert.match(cssContent, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.top-admin-dropdown\s*\{[\s\S]*?position:\s*absolute\s*!important/);
  assert.match(cssContent, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.top-admin-dropdown\s*\{[\s\S]*?z-index:\s*1050\s*!important/);
});

