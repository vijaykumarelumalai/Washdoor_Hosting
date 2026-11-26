// src/__tests__/ordersV2ActionsColumn.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');
const ordersV2List = fs.readFileSync(path.join(srcDir, 'components/OrdersV2List.jsx'), 'utf8').replace(/\r\n/g, '\n');
const ordersV2Css = fs.readFileSync(path.join(srcDir, 'styles/OrdersV2.css'), 'utf8').replace(/\r\n/g, '\n');
const columnsConfig = fs.readFileSync(path.join(srcDir, 'config/ordersV2ColumnsConfig.js'), 'utf8').replace(/\r\n/g, '\n');

const actionsStart = ordersV2List.indexOf("{isColumnVisible('actions') && (");
const actionsBlock = ordersV2List.slice(
  actionsStart,
  ordersV2List.indexOf('</TableCell>', actionsStart) + '</TableCell>'.length
);

test('Orders v2 Actions renders exactly four circular buttons in the required order', () => {
  assert.equal((actionsBlock.match(/className="orders-v2-action-button"/g) || []).length, 4);
  assert.equal((actionsBlock.match(/event\.stopPropagation\(\);/g) || []).length, 4);

  const inlineIndex = actionsBlock.indexOf('aria-label={`Inline edit order ${orderId}`}');
  const sideIndex = actionsBlock.indexOf('aria-label={`Open Side Edit Panel for order ${orderId}`}');
  const deleteIndex = actionsBlock.indexOf('aria-label={`Delete order ${orderId}`}');
  const moreIndex = actionsBlock.indexOf('aria-label={`More actions for order ${orderId}`}');

  assert.ok(inlineIndex > -1);
  assert.ok(sideIndex > inlineIndex);
  assert.ok(deleteIndex > sideIndex);
  assert.ok(moreIndex > deleteIndex);

  assert.ok(actionsBlock.includes('<EditOutlined sx={{ fontSize: 18 }} />'));
  assert.ok(actionsBlock.includes('<ViewSidebarOutlined sx={{ fontSize: 18 }} />'));
  assert.ok(actionsBlock.includes('<DeleteOutlined sx={{ fontSize: 18 }} />'));
  assert.ok(actionsBlock.includes('<MoreVertOutlined sx={{ fontSize: 18 }} />'));

  assert.ok(!actionsBlock.includes('aria-label={`View order ${orderId}`}'));
  assert.ok(!actionsBlock.includes('aria-label={`View invoice for order ${orderId}`}'));
  assert.ok(!actionsBlock.includes("getOrdersV2ActionButtonSx('green')"));
});

test('Orders v2 Actions keeps compact 180px sizing with 165px minimum', () => {
  assert.ok(ordersV2List.includes('actions: { default: 180, min: 165, max: 240 }'));
  assert.ok(ordersV2List.includes('minWidth: 165,'));
  assert.ok(ordersV2List.includes("gap: '6px'"));
  assert.ok(ordersV2List.includes('minWidth: 146,'));
  assert.ok(ordersV2Css.includes('min-width: 165px !important'));
  assert.ok(ordersV2Css.includes('white-space: nowrap;'));
  assert.ok(columnsConfig.includes("minWidth: '165px'"));
  assert.ok(columnsConfig.includes("align: 'center'"));
  assert.ok(columnsConfig.includes('required: true'));
});

test('Orders v2 Actions uses the exact circular button tones', () => {
  assert.ok(ordersV2List.includes("color: '#2563EB',"));
  assert.ok(ordersV2List.includes("background: '#EFF6FF',"));
  assert.ok(ordersV2List.includes("color: '#DC2626',"));
  assert.ok(ordersV2List.includes("background: '#FEF2F2',"));
  assert.ok(ordersV2List.includes("color: '#475569',"));
  assert.ok(ordersV2List.includes("background: '#F8FAFC',"));
  assert.ok(ordersV2List.includes("borderRadius: '50%'"));
  assert.ok(ordersV2List.includes('width: 32,'));
  assert.ok(ordersV2List.includes('height: 32,'));
  assert.ok(ordersV2List.includes('padding: 0,'));
  assert.ok(ordersV2List.includes('transition: \'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease\''));
  assert.ok(ordersV2List.includes("outline: `2px solid ${colors.color}`"));
  assert.ok(ordersV2Css.includes('.orders-v2-actions-cell .orders-v2-action-button'));
});

test('Orders v2 More Actions menu has one order-scoped anchor and closes on toggle or close handlers', () => {
  assert.ok(ordersV2List.includes('const [ordersV2MoreMenu, setOrdersV2MoreMenu] = useState({ anchorEl: null, orderId: null });'));
  assert.ok(ordersV2List.includes('const ordersV2MoreMenuOrder = useMemo(() => {'));
  assert.ok(ordersV2List.includes('setOrdersV2MoreMenu({ anchorEl: event.currentTarget, orderId });'));
  assert.ok(ordersV2List.includes('setOrdersV2MoreMenu({ anchorEl: null, orderId: null });'));
  assert.ok(ordersV2List.includes('if (String(ordersV2MoreMenu.orderId) === String(orderId)) {'));
  assert.ok(actionsBlock.includes('closeOrdersV2MoreMenu();'));
  assert.ok(actionsBlock.includes('openOrdersV2MoreMenu(event, orderId);'));
  assert.ok(actionsBlock.includes('aria-haspopup="true"'));
  assert.ok(actionsBlock.includes('aria-expanded={ordersV2MoreMenu.anchorEl != null && String(ordersV2MoreMenu.orderId) === String(orderId)}'));
});

test('Orders v2 More Actions dropdown contains only View Order Details and Generate Invoice', () => {
  const menuStart = ordersV2List.indexOf('<Menu\n        anchorEl={ordersV2MoreMenu.anchorEl}');
  const menuBlock = ordersV2List.slice(menuStart, ordersV2List.indexOf('</Menu>', menuStart));

  assert.ok(menuStart > -1);
  assert.equal((menuBlock.match(/<MenuItem\b/g) || []).length, 2);
  assert.ok(menuBlock.includes('<VisibilityOutlined />'));
  assert.ok(menuBlock.includes('View Order Details'));
  assert.ok(menuBlock.includes('<ReceiptLongOutlined />'));
  assert.ok(menuBlock.includes('Generate Invoice'));
  assert.ok(!menuBlock.includes('Delete order'));
  assert.ok(!menuBlock.includes('Inline edit order'));
  assert.ok(!menuBlock.includes('Open Side Edit Panel'));
});

test('Orders v2 More Actions menu is portaled to the anchor document body and follows its anchor', () => {
  const menuStart = ordersV2List.indexOf('<Menu\n        anchorEl={ordersV2MoreMenu.anchorEl}');
  const menuBlock = ordersV2List.slice(menuStart, ordersV2List.indexOf('</Menu>', menuStart));

  assert.ok(menuBlock.includes('disablePortal={false}'));
  assert.ok(!menuBlock.includes('disablePortal={true}'));
  assert.ok(!menuBlock.includes('container={'));
  assert.ok(menuBlock.includes('open={Boolean(ordersV2MoreMenu.anchorEl)}'));
  assert.ok(menuBlock.includes('onClose={closeOrdersV2MoreMenu}'));
  assert.ok(menuBlock.includes("anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}"));
  assert.ok(menuBlock.includes("transformOrigin={{ vertical: 'top', horizontal: 'right' }}"));
  assert.ok(menuBlock.includes('minWidth: 190'));
  assert.ok(menuBlock.includes('height: 36'));
  assert.ok(menuBlock.includes('minHeight: 36'));
  assert.ok(menuBlock.includes("bgcolor: '#ffffff'"));
  assert.ok(menuBlock.includes("border: '1px solid #e2e8f0'"));
  assert.ok(menuBlock.includes("boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)'"));
  assert.ok(menuBlock.includes("bgcolor: '#EFF6FF'"));
});

test('Orders v2 Actions passes the selected order to every existing handler', () => {
  const menuStart = ordersV2List.indexOf('<Menu\n        anchorEl={ordersV2MoreMenu.anchorEl}');
  const menuBlock = ordersV2List.slice(menuStart, ordersV2List.indexOf('</Menu>', menuStart));

  assert.ok(actionsBlock.includes('handleToggleInlineEdit(order);'));
  assert.ok(actionsBlock.includes('onOpenSideEdit?.(order);'));
  assert.ok(actionsBlock.includes('onDelete?.(orderId);'));
  assert.ok(menuBlock.includes('const selectedOrder = ordersV2MoreMenuOrder;'));
  assert.ok(menuBlock.includes('closeOrdersV2MoreMenu();'));
  assert.ok(menuBlock.includes('if (selectedOrder) onOpenViewOrder(selectedOrder);'));
  assert.ok(menuBlock.includes('if (selectedOrder) onOpenReceipt(selectedOrder);'));
  assert.ok(menuBlock.includes('disabled={!onOpenViewOrder || !ordersV2MoreMenuOrder}'));
  assert.ok(menuBlock.includes('disabled={!onOpenReceipt || !ordersV2MoreMenuOrder}'));
  assert.ok(actionsBlock.includes('disabled={!onDelete}'));
});
