// src/__tests__/ordersV2ServicesColumn.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');
const appJsx = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8').replace(/\r\n/g, '\n');
const ordersV2 = fs.readFileSync(path.join(srcDir, 'components/OrdersV2.jsx'), 'utf8').replace(/\r\n/g, '\n');
const ordersV2List = fs.readFileSync(path.join(srcDir, 'components/OrdersV2List.jsx'), 'utf8').replace(/\r\n/g, '\n');
const ordersV2Css = fs.readFileSync(path.join(srcDir, 'styles/OrdersV2.css'), 'utf8').replace(/\r\n/g, '\n');

test('Orders v2 removes the Items column and keeps the remaining table intact', () => {
  assert.ok(!ordersV2List.includes("renderTableHeader('items', 'Items')"));
  assert.ok(!ordersV2List.includes("getColumnWidthSx('items')"));
  assert.ok(!ordersV2List.includes('items: { default:'));
  assert.ok(!ordersV2List.includes('const itemCount ='));
  assert.ok(ordersV2List.includes('<TableCell colSpan={7}'));
  assert.ok(ordersV2List.includes("renderTableHeader('services', 'Services')"));
  assert.ok(ordersV2List.includes('services: { default: 190, min: 150, max: 280 }'));
});

test('Orders v2 Services column renders one service badge and a dynamic +N More button', () => {
  assert.ok(ordersV2List.includes('getOrderServiceColumnGroups(order, serviceTypes)'));
  assert.ok(ordersV2List.includes('const firstService = serviceGroups[0]'));
  assert.ok(!ordersV2List.includes("order.service_category || 'Laundry'"));
  assert.ok(ordersV2List.includes('icon={renderServiceIcon(firstService.iconType)}'));
  assert.ok(ordersV2List.includes('label={firstService.name}'));
  assert.ok(ordersV2List.includes('aria-label={`View garments for ${firstService.name}`}'));
  assert.ok(ordersV2List.includes('onClick={(event) => openServicesPopup(event, order, firstService.key)}'));
  assert.ok(ordersV2List.includes('{serviceGroups.length > 1 && ('));
  assert.ok(ordersV2List.includes('+{serviceGroups.length - 1} More'));
  assert.ok(ordersV2List.includes('flexWrap: \'nowrap\''));
  assert.ok(ordersV2List.includes('whiteSpace: \'nowrap\''));
});

test('Services popup groups real order garments and supports expand/collapse', () => {
  assert.ok(ordersV2List.includes('const openServicesPopup = (event, order, selectedServiceKey) => {'));
  assert.ok(ordersV2List.includes('groups.some((group) => group.key === selectedServiceKey)'));
  assert.ok(ordersV2List.includes('acc[group.key] = hasSelectedService ? group.key === selectedServiceKey : idx === 0;'));
  assert.ok(ordersV2List.includes('Services &amp; Garments'));
  assert.ok(ordersV2List.includes("Order ID: {servicesPopupOrder?.order_number || servicesPopupOrder?.id || '—'}"));
  assert.ok(ordersV2List.includes('<Popover'));
  assert.ok(ordersV2List.includes('onClose={closeServicesPopup}'));
  assert.ok(ordersV2List.includes('aria-label="Close services and garments"'));
  assert.ok(ordersV2List.includes('<ButtonBase'));
  assert.ok(ordersV2List.includes('onClick={() => toggleServiceGroup(group.key)}'));
  assert.ok(ordersV2List.includes('<Collapse in={expanded}'));
  assert.ok(ordersV2List.includes('<ClothIllustration itemId={garment.iconId} size={22} />'));
  assert.ok(ordersV2List.includes('label={`×${garment.qty}`}'));
  assert.ok(ordersV2List.includes('No garments assigned.'));
});

test('Service grouping derives from Supabase order records without hardcoded garments', () => {
  assert.ok(ordersV2List.includes('const items = Array.isArray(order?.items) ? order.items : []'));
  assert.ok(ordersV2List.includes('order?.__serviceFilterValues'));
  assert.ok(ordersV2List.includes('rawServiceKeys.includes(columnKey(name))'));
  assert.ok(ordersV2List.includes('item.serviceType || item.service_type || item.service || item.category || fallbackServiceNames[0]'));
  assert.ok(ordersV2List.includes('const groups = new Map()'));
  assert.ok(ordersV2List.includes('const key = columnKey(serviceName)'));
  assert.ok(ordersV2List.includes('group.garmentMap.get(garmentKey)'));
  assert.ok(ordersV2List.includes('existingGarment.qty += qty'));
  assert.ok(ordersV2List.includes('group.garmentCount += qty'));
  assert.ok(ordersV2List.includes('Array.from(groups.values()).map(({ garmentMap, ...group }) => group)'));
});

test('Orders v2 list defaults to ten rows with compact pagination options', () => {
  assert.ok(ordersV2.includes("const [pageSize, setPageSize] = useState('10');"));
  assert.ok(ordersV2List.includes("pageSize = '10',"));
  assert.ok(ordersV2List.includes('const showAllRows = pageSize === \'All\';'));
  assert.ok(ordersV2List.includes('showAllRows ? Math.max(filtered.length, 1) : Number(pageSize) || 10'));
  assert.ok(ordersV2List.includes('const end = showAllRows ? filtered.length : safePage * pageNum;'));
  assert.ok(ordersV2List.includes('const paginated = filtered.slice(start, end);'));
  assert.ok(!ordersV2List.includes('TablePagination'));
  assert.ok(ordersV2List.includes('component="footer"'));
  assert.ok(ordersV2List.includes('Rows per page:'));
  assert.ok(ordersV2List.includes('value={showAllRows ? \'All\' : String(pageNum)}'));
  assert.ok(ordersV2List.includes('[10, 20, 50, 100]'));
  assert.ok(!ordersV2List.includes('[5, 10, 20, 50]'));
  assert.ok(!ordersV2List.includes('<MenuItem value="All">All</MenuItem>'));
  assert.ok(ordersV2List.includes('{showingStart}–{showingEnd} of {filtered.length}'));
  assert.ok(!ordersV2List.includes('getOrdersV2PageItems'));
  assert.ok(!ordersV2List.includes('pageItems.map'));
  assert.ok(!ordersV2List.includes('aria-current={item === safePage ? \'page\' : undefined}'));
});

test('Orders v2 footer uses four compact First/Previous/Next/Last controls with no numbered buttons', () => {
  assert.ok(ordersV2List.includes('FirstPage, LastPage'));
  assert.ok(ordersV2List.includes('const ORDERS_PAGINATION_ICON_SX = {'));
  assert.ok(ordersV2List.includes("color: '#2563eb'"));
  assert.ok(ordersV2List.includes("'&:hover': { bgcolor: '#eff6ff' }"));
  assert.ok(ordersV2List.includes("position: 'sticky',\n            bottom: 0,\n            zIndex: 7,"));
  assert.ok(ordersV2List.includes("justifyContent: 'flex-end',"));
  assert.ok(ordersV2List.includes('aria-label="First page"'));
  assert.ok(ordersV2List.includes('aria-label="Previous page"'));
  assert.ok(ordersV2List.includes('aria-label="Next page"'));
  assert.ok(ordersV2List.includes('aria-label="Last page"'));
  assert.ok(ordersV2List.includes('onClick={() => onPageChange(1)}'));
  assert.ok(ordersV2List.includes('onClick={() => onPageChange(safePage - 1)}'));
  assert.ok(ordersV2List.includes('onClick={() => onPageChange(safePage + 1)}'));
  assert.ok(ordersV2List.includes('onClick={() => onPageChange(totalPages)}'));
  assert.ok(ordersV2List.includes('className="orders-v2-pagination-nav"'));
  assert.ok(ordersV2List.includes("gap: 0.75,\n              flexWrap: 'nowrap',"));
  assert.ok(!ordersV2List.includes('getOrdersV2PageItems'));
  assert.ok(!ordersV2List.includes('pageItems.map'));
});

test('Orders v2 table uses a fixed five-row viewport with internal scrolling and a sticky header', () => {
  assert.ok(ordersV2List.includes('const ORDERS_TABLE_VISIBLE_ROWS = 5;'));
  assert.ok(ordersV2List.includes('const ORDERS_TABLE_HEADER_HEIGHT = 40;'));
  assert.ok(ordersV2List.includes('const ORDERS_TABLE_ROW_HEIGHT = 56;'));
  assert.ok(ordersV2List.includes('const ORDERS_TABLE_VIEWPORT_HEIGHT = ORDERS_TABLE_HEADER_HEIGHT + (ORDERS_TABLE_VISIBLE_ROWS * ORDERS_TABLE_ROW_HEIGHT);'));
  assert.ok(ordersV2List.includes('const ORDERS_TABLE_SCROLLBAR_SX = {'));
  assert.ok(ordersV2List.includes("scrollbarColor: '#cbd5e1 transparent'"));
  assert.ok(ordersV2List.includes("'&::-webkit-scrollbar': { width: 6 }"));
  assert.ok(ordersV2List.includes("'&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 6, border: '1px solid #ffffff' }"));
  assert.ok(ordersV2List.includes('height: ORDERS_TABLE_VIEWPORT_HEIGHT,'));
  assert.ok(ordersV2List.includes('minHeight: ORDERS_TABLE_VIEWPORT_HEIGHT,'));
  assert.ok(ordersV2List.includes('maxHeight: ORDERS_TABLE_VIEWPORT_HEIGHT,'));
  assert.ok(ordersV2List.includes("overflowY: 'auto'"));
  assert.ok(!ordersV2List.includes("overflowY: 'scroll'"));
  assert.ok(ordersV2List.includes("overscrollBehavior: 'contain'"));
  assert.ok(ordersV2List.includes('className="orders-v2-header-cell"'));
  assert.ok(ordersV2List.includes('className="orders-v2-data-row"'));
  assert.ok(ordersV2List.includes("'& .orders-v2-data-row > td': {"));
  assert.ok(ordersV2List.includes("<TableHead sx={{ bgcolor: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>"));
  assert.ok(ordersV2List.includes("position: 'sticky',\n          top: 0,\n          zIndex: 6,"));
});

test('Orders v2 header, filters, tabs, and summary cards use compact spacing', () => {
  assert.ok(ordersV2.includes("pt: { xs: 1.25, sm: 1.5 },"));
  assert.ok(ordersV2.includes("mb: { xs: 1, sm: 1.25 },"));
  assert.ok(ordersV2.includes("width: 40,\n                height: 40,"));
  assert.ok(ordersV2.includes("p: { xs: 1, sm: 1.25 },"));
  assert.ok(ordersV2.includes("'& .MuiInputBase-input': { py: '8px' },"));
  assert.ok(ordersV2.includes("md: 'minmax(0, 2fr) repeat(3, minmax(0, 1.2fr)) 36px',"));
  assert.ok(ordersV2.includes('minHeight: 28,'));
  assert.ok(ordersV2.includes('minHeight: { xs: 72, sm: 78 },'));
  assert.match(ordersV2, /width: 42,[\s\S]{0,60}height: 42,/);
  assert.ok(ordersV2.includes("fontSize: '1.35rem'"));
});

test('Orders v2 page ends at the pagination footer without trailing page spacing', () => {
  assert.ok(!ordersV2.includes("minHeight: '100vh'"));
  assert.ok(!ordersV2.includes('pb: { xs: 4, sm: 6 },'));
  assert.ok(ordersV2.includes("pt: { xs: 1.25, sm: 1.5 },"));
  assert.ok(ordersV2.includes('pb: 0,'));
  assert.ok(appJsx.includes("activeTab === 'orders-v2' ? 'orders-v2-main' : ''"));
  assert.ok(ordersV2Css.includes('.main.orders-v2-main {'));
  assert.ok(ordersV2Css.includes('min-height: 0 !important;'));
  assert.ok(ordersV2Css.includes('padding-bottom: 0 !important;'));
  assert.ok(!ordersV2Css.includes('min-height: 100vh;'));
  assert.ok(!ordersV2Css.includes('padding-bottom: 60px;'));
  assert.ok(ordersV2List.includes('component="footer"'));
  assert.ok(ordersV2List.includes("position: 'sticky',\n            bottom: 0,\n            zIndex: 7,"));
  assert.ok(ordersV2List.includes('height: ORDERS_TABLE_VIEWPORT_HEIGHT,'));
});

test('Orders v2 pagination alignment is compact and responsive', () => {
  assert.ok(ordersV2List.includes('className="orders-v2-pagination-footer"'));
  assert.ok(ordersV2List.includes('className="orders-v2-pagination-size"'));
  assert.ok(ordersV2List.includes('className="orders-v2-pagination-range"'));
  assert.ok(ordersV2List.includes('className="orders-v2-pagination-nav"'));
  assert.ok(ordersV2List.includes("flexWrap: { xs: 'wrap', sm: 'nowrap' },"));
  assert.ok(ordersV2List.includes("width: { xs: '100%', sm: 'auto' },"));
  assert.ok(ordersV2List.includes('order: { xs: 1, sm: 0 }'));
  assert.ok(ordersV2List.includes("order: { xs: 2, sm: 0 },"));
  assert.ok(ordersV2List.includes("order: { xs: 3, sm: 0 },"));
  assert.ok(ordersV2Css.includes('.orders-v2-pagination-nav > span {'));
  assert.ok(ordersV2Css.includes('.orders-v2-pagination-nav .MuiIconButton-root {'));
  assert.ok(ordersV2Css.includes('@media (max-width: 599.95px) {'));
});

test('Orders v2 table uses professional header, row, and badge styling', () => {
  assert.ok(ordersV2List.includes("letterSpacing: '0.02em',"));
  assert.ok(ordersV2List.includes("whiteSpace: 'nowrap',\n          borderBottom: '1px solid #e2e8f0',"));
  assert.ok(ordersV2List.includes("'&.MuiTableRow-hover:hover': { bgcolor: isInlineOpen ? '#eff6ff' : '#f8fbff' },"));
  assert.ok(ordersV2List.includes('<Typography noWrap variant="body2" fontWeight={700} color="#0f172a">'));
  assert.ok(ordersV2List.includes('<Typography noWrap variant="body2" fontWeight={600} color="#0f172a">'));
  assert.ok(ordersV2List.includes('<Typography noWrap variant="body2" fontWeight={800} color="#0f172a">'));
  assert.ok(ordersV2List.includes('+{serviceGroups.length - 1} More'));
  assert.ok(ordersV2List.includes('border: `1px solid ${stStyle.border}`,'));
});
