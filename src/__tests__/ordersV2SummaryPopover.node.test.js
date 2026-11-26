 import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');
const ordersV2 = fs.readFileSync(path.join(srcDir, 'components/OrdersV2.jsx'), 'utf8').replace(/\r\n/g, '\n');
const ordersV2List = fs.readFileSync(path.join(srcDir, 'components/OrdersV2List.jsx'), 'utf8').replace(/\r\n/g, '\n');
const ordersV2Css = fs.readFileSync(path.join(srcDir, 'styles/OrdersV2.css'), 'utf8').replace(/\r\n/g, '\n');

const summaryButtonStart = ordersV2.indexOf('<Button\n              className="orders-v2-summary-button"');
const summaryButtonBlock = ordersV2.slice(summaryButtonStart, ordersV2.indexOf('</Button>', summaryButtonStart));
const summaryPopoverStart = ordersV2.indexOf('<Popover\n              open={Boolean(overallDetailsAnchorEl)}');
const summaryPopoverBlock = ordersV2.slice(summaryPopoverStart, ordersV2.indexOf('</Popover>', summaryPopoverStart));
const summaryRowsStart = ordersV2.indexOf('const overallSummaryRows = [');
const summaryRowsBlock = ordersV2.slice(summaryRowsStart, ordersV2.indexOf('];', summaryRowsStart) + 2);

test('Orders v2 removes the four KPI cards but keeps the dynamic calculations', () => {
  assert.ok(!ordersV2.includes('orders-v2-kpi-section'));
  assert.ok(!ordersV2.includes('<Card'));
  assert.ok(!ordersV2.includes('minHeight: { xs: 72, sm: 78 }'));
  assert.ok(!ordersV2.includes('AccessTime'));

  assert.ok(ordersV2.includes('const totalRevenue = useMemo(() => {'));
  assert.ok(ordersV2.includes('filteredOrders.reduce((acc, o) => acc + (Number(o.total_amount || 0) || 0), 0)'));
  assert.ok(ordersV2.includes('const pendingBalance = useMemo(() => {'));
  assert.ok(ordersV2.includes('filteredOrders.reduce((acc, o) => acc + (Number(o.balance_due || 0) || 0), 0)'));
  assert.ok(ordersV2.includes("normalizeOrdersV2Status(o.order_status || o.status) === 'Ready'"));
  assert.ok(ordersV2.includes('orders={filteredOrders}'));
});

test('Orders v2 Overall Order Details button matches the Columns button styling and order', () => {
  assert.ok(summaryButtonStart > -1);
  assert.ok(ordersV2.indexOf('className="orders-v2-summary-button"') < ordersV2.indexOf('className="orders-v2-columns-button"'));

  assert.ok(ordersV2.includes('className="orders-v2-toolbar-actions"'));
  assert.ok(ordersV2.includes('gap: 1, flexShrink: 0'));
  assert.ok(summaryButtonBlock.includes('aria-label="Overall Order Details"'));
  assert.ok(summaryButtonBlock.includes('startIcon={<BarChartRounded sx={{ fontSize: 16 }} />}'));
  assert.ok(summaryButtonBlock.includes('height: 28,'));
  assert.ok(summaryButtonBlock.includes("fontSize: '0.72rem'"));
  assert.ok(summaryButtonBlock.includes('fontWeight: 700'));
  assert.ok(summaryButtonBlock.includes('borderRadius: 2'));
  assert.ok(summaryButtonBlock.includes("borderColor: '#bfdbfe'"));
  assert.ok(summaryButtonBlock.includes("bgcolor: '#eff6ff'"));
  assert.ok(summaryButtonBlock.includes("color: '#2563eb'"));
  assert.ok(ordersV2Css.includes('.orders-v2-summary-button.MuiButton-root'));
});

test('Orders v2 Overall Order Details popover is closed by default and uses MUI close behaviour', () => {
  assert.ok(ordersV2.includes('const [overallDetailsAnchorEl, setOverallDetailsAnchorEl] = useState(null);'));
  assert.ok(ordersV2.includes('const handleToggleOverallDetails = (event) => {'));
  assert.ok(ordersV2.includes('setOverallDetailsAnchorEl((current) => (current ? null : event.currentTarget));'));
  assert.ok(ordersV2.includes('const handleCloseOverallDetails = () => {'));
  assert.ok(ordersV2.includes('setOverallDetailsAnchorEl(null);'));
  assert.ok(summaryButtonBlock.includes('onClick={handleToggleOverallDetails}'));
  assert.ok(summaryButtonBlock.includes('aria-expanded={Boolean(overallDetailsAnchorEl)}'));
  assert.ok(summaryButtonBlock.includes('aria-controls="orders-v2-overall-details-popover"'));
  assert.ok(summaryButtonBlock.includes('aria-haspopup="dialog"'));

  assert.ok(summaryPopoverStart > -1);
  assert.ok(summaryPopoverBlock.includes('open={Boolean(overallDetailsAnchorEl)}'));
  assert.ok(summaryPopoverBlock.includes('onClose={handleCloseOverallDetails}'));
  assert.ok(summaryPopoverBlock.includes("anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}"));
  assert.ok(summaryPopoverBlock.includes("transformOrigin={{ vertical: 'top', horizontal: 'right' }}"));
  assert.ok(summaryPopoverBlock.includes('slotProps={{ paper: { className: \'orders-v2-summary-popover-paper\', id: \'orders-v2-overall-details-popover\' } }}'));
  assert.ok(!summaryPopoverBlock.includes('disablePortal={true}'));
  assert.ok(!summaryPopoverBlock.includes('container={'));
  assert.ok(summaryPopoverBlock.includes('aria-label="Close overall order details"'));
  assert.ok(summaryPopoverBlock.includes('<CloseRounded sx={{ fontSize: 18 }} />'));
});

test('Orders v2 Overall Order Details popover shows four dynamic summary rows with exact tones', () => {
  assert.ok(summaryRowsStart > -1);
  assert.ok(summaryRowsBlock.includes("value: String(filteredOrders.length)"));
  assert.ok(summaryRowsBlock.includes('value: `${currencySymbol}${MONEY(totalRevenue)}`'));
  assert.ok(summaryRowsBlock.includes('value: `${currencySymbol}${MONEY(pendingBalance)}`'));
  assert.ok(summaryRowsBlock.includes('value: String(readyCount)'));

  assert.ok(summaryRowsBlock.includes("label: 'Total Orders'"));
  assert.ok(summaryRowsBlock.includes("label: 'Total Revenue'"));
  assert.ok(summaryRowsBlock.includes("label: 'Pending Balance'"));
  assert.ok(summaryRowsBlock.includes("label: 'Ready for Pickup'"));
  assert.ok(summaryRowsBlock.includes('Icon: Inventory2Outlined, tone: \'blue\''));
  assert.ok(summaryRowsBlock.includes('Icon: TrendingUp, tone: \'green\''));
  assert.ok(summaryRowsBlock.includes('Icon: AccountBalanceWalletOutlined, tone: \'orange\''));
  assert.ok(summaryRowsBlock.includes('Icon: LocalShippingOutlined, tone: \'purple\''));

  assert.ok(summaryPopoverBlock.includes('orders-v2-summary-row orders-v2-summary-${tone}'));
  assert.ok(summaryPopoverBlock.includes('<Icon sx={{ fontSize: 18 }} />'));
});

test('Orders v2 Overall Order Details popover uses the compact 320px design', () => {
  assert.ok(ordersV2Css.includes('.orders-v2-summary-popover-paper.MuiPaper-root'));
  assert.ok(ordersV2Css.includes('width: 320px !important'));
  assert.ok(ordersV2Css.includes('border-radius: 12px !important'));
  assert.ok(ordersV2Css.includes('box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12) !important'));
  assert.ok(ordersV2Css.includes('.orders-v2-summary-popover {'));
  assert.ok(ordersV2Css.includes('padding: 12px;'));
  assert.ok(ordersV2Css.includes('.orders-v2-summary-rows {'));
  assert.ok(ordersV2Css.includes('gap: 6px;'));
  assert.ok(ordersV2Css.includes('.orders-v2-summary-row {'));
  assert.ok(ordersV2Css.includes('height: 44px;'));
  assert.ok(ordersV2Css.includes('font-size: 13px !important'));
  assert.ok(ordersV2Css.includes('font-size: 15px !important'));
  assert.ok(ordersV2Css.includes('font-weight: 600 !important'));
  assert.ok(ordersV2Css.includes('.orders-v2-summary-blue .orders-v2-summary-icon'));
  assert.ok(ordersV2Css.includes('background: #eff6ff;'));
  assert.ok(ordersV2Css.includes('background: #ecfdf5;'));
  assert.ok(ordersV2Css.includes('background: #fff7ed;'));
  assert.ok(ordersV2Css.includes('background: #f5f3ff;'));
});

test('Orders v2 expanded table fills viewport, keeps five rows, and avoids duplicate scrollbars', () => {
  assert.ok(ordersV2.includes('mb: 1.5,'));
  assert.ok(ordersV2Css.includes('.main.orders-v2-main {'));
  assert.ok(ordersV2Css.includes('overflow-y: hidden !important'));
  assert.ok(ordersV2Css.includes('.main.orders-v2-main:has(.orders-v2-table-container.is-inline-editing) {'));
  assert.ok(ordersV2Css.includes('overflow-y: auto !important'));
  assert.equal((ordersV2Css.match(/min-height: 320px !important;/g) || []).length >= 3, true);
  assert.ok(ordersV2Css.includes('.orders-v2-table-container:not(.is-inline-editing) {'));
  assert.ok(ordersV2Css.includes('height: 100% !important;'));
  assert.ok(ordersV2Css.includes('overflow-y: auto !important;'));
  assert.ok(ordersV2List.includes('component="footer"'));
  assert.ok(ordersV2List.includes('className="orders-v2-pagination-footer"'));
});

test('Orders v2 action column remains unchanged after the summary layout update', () => {
  const actionsStart = ordersV2List.indexOf("{isColumnVisible('actions') && (");
  const actionsBlock = ordersV2List.slice(
    actionsStart,
    ordersV2List.indexOf('</TableCell>', actionsStart) + '</TableCell>'.length
  );

  assert.equal((actionsBlock.match(/className="orders-v2-action-button"/g) || []).length, 4);
  assert.ok(actionsBlock.includes('aria-label={`Inline edit order ${orderId}`}'));
  assert.ok(actionsBlock.includes('aria-label={`Open Side Edit Panel for order ${orderId}`}'));
  assert.ok(actionsBlock.includes('aria-label={`Delete order ${orderId}`}'));
  assert.ok(actionsBlock.includes('aria-label={`More actions for order ${orderId}`}'));

  const menuStart = ordersV2List.indexOf('<Menu\n        anchorEl={ordersV2MoreMenu.anchorEl}');
  const menuBlock = ordersV2List.slice(menuStart, ordersV2List.indexOf('</Menu>', menuStart));
  assert.equal((menuBlock.match(/<MenuItem\b/g) || []).length, 2);
  assert.ok(menuBlock.includes('View Order Details'));
  assert.ok(menuBlock.includes('Generate Invoice'));
});
