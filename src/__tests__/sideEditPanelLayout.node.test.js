// src/__tests__/sideEditPanelLayout.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('1. SideEditPanel.css implements single-grid (1 card per row) for garment catalog on desktop', () => {
  const cssPath = path.resolve(__dirname, '../styles/SideEditPanel.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Single-column grid in catalog
  assert.match(css, /\.side-edit-catalog-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/);

  // Horizontal card layout
  assert.match(css, /\.side-edit-prod-card\s*\{[\s\S]*?flex-direction:\s*row/);
  assert.match(css, /\.side-edit-prod-info/);
  assert.match(css, /\.side-edit-prod-add/);
});

test('2. SideEditPanel.css expands side panel lightly on desktop for professional breathing room', () => {
  const cssPath = path.resolve(__dirname, '../styles/SideEditPanel.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /@media\s*\(min-width:\s*1200px\)[\s\S]*?\.side-edit-panel\s*\{[\s\S]*?width:\s*56%/);
  assert.match(css, /@media\s*\(min-width:\s*1440px\)[\s\S]*?\.side-edit-panel\s*\{[\s\S]*?width:\s*60%/);
});

test('3. SideEditPanel.jsx renders 2-grid product cards and cart items with cloth illustrations', () => {
  const jsxPath = path.resolve(__dirname, '../components/SideEditPanel.jsx');
  const jsx = fs.readFileSync(jsxPath, 'utf8');

  // Product cards with image, info and add button
  assert.match(jsx, /side-edit-catalog-grid/);
  assert.match(jsx, /side-edit-prod-card/);
  assert.match(jsx, /side-edit-prod-info/);
  assert.match(jsx, /side-edit-prod-add/);

  // Cart items with ClothIllustration thumbnail and clean title
  assert.match(jsx, /side-edit-cart-item-thumb/);
  assert.match(jsx, /ClothIllustration itemId=\{c\.itemId/);
});

test('4. SideEditPanel.css configures visible, user-friendly scrollbar for cart items list', () => {
  const cssPath = path.resolve(__dirname, '../styles/SideEditPanel.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /\.side-edit-cart-list\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /\.side-edit-cart-list\s*\{[\s\S]*?scrollbar-width:\s*thin/);
  assert.match(css, /\.side-edit-cart-list::-webkit-scrollbar\s*\{[\s\S]*?width:\s*6px/);
  assert.match(css, /\.side-edit-cart-list::-webkit-scrollbar-thumb/);
});
