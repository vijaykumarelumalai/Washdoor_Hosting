# Orders v2 Functional Workflows & User Experience Guide

This document provides a comprehensive operational guide to the **Orders v2** module in the Washdoor POS system. It details the end-to-end workflows for order intake (Step 1 & Step 2), garment selection, staff assignment, order saving, orders list management, the 7-tab Horizontal Stepper Inline Edit, slide-over editing, and child modals.

---

## 1. Overview of Orders v2 Module

Orders v2 is the next-generation order management and POS intake engine for Washdoor Laundry. Designed with a clean, high-density interface, it combines:
- A **Two-Step Modal Wizard** (`OrdersV2CreateOrder.jsx`) for customer registration, On-Call schedule validation, staff assignment, catalog garment selection, and financial ledger calculations.
- A **Real-Time DataGrid Table** (`OrdersV2List.jsx`) with dynamic service badges, garment popovers, and sticky pagination.
- A **7-Tab Horizontal Stepper Inline Edit** embedded directly inside expandable table rows.
- A **Fast Slide-Over Edit Drawer** (`OrdersV2EditDrawer.jsx`) for quick adjustments without expanding rows.
- A **POS-Style 4-Tab Lifecycle Drawer** (`OrderStatusDrawer.jsx`) for auditing order history, payments, and dispatch.
- An **80mm Thermal Receipt Generator** (`ThermalReceiptModal.jsx`) for counter printing.

---

## 2. Step-by-Step Order Intake Wizard (`OrdersV2CreateOrder.jsx`)

When the user clicks the **`+ Create Order`** button in the top header, the application launches `OrdersV2CreateOrder.jsx` in a full-screen responsive dialog. The creation process is organized into two sequential stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ORDERS v2 CREATE ORDER WIZARD                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  STEP 1: Order Basics                                                       │
│  ├── Customer Selection: [Existing Customer (Autocomplete) | New Customer]  │
│  ├── Order Type: [Walk-In (Store Drop) | On-Call (Pickup & Delivery)]       │
│  ├── On-Call Schedule: [Pickup Date/Time & Delivery Date/Time Validation]   │
│  ├── Staff Allocation: [Attend Staff (Counter) & Pickup Driver]             │
│  └── Actions: [Cancel] ── [Create Order Directly] ── [Next: Build Order ──►]│
├─────────────────────────────────────────────────────────────────────────────┤
│  STEP 2: Build the Order                                                    │
│  ├── Header Summary: [Order ID, Customer Chip, Type Chip, Staff Chip]       │
│  ├── Left Column: Garment Catalog (Category Pills, Search, Add to Cart)     │
│  ├── Right Column: Order Cart (Services, Qty Stepper, Line Totals, Clear)   │
│  ├── Accordions: [Additional Details, Payment / Billing, Review & Actions]  │
│  ├── Sticky Footer: [Item Count, Pieces, Subtotal, Discount, Tax, Total]    │
│  └── Actions: [◄── Back to Step 1] ──────────────── [Save & Place Order]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1 Step 1 – Order Basics Workflow

#### 1. Customer Selection & Mode
Operators choose between two distinct modes:
- **Mode A: Existing Customer (Default)**
  - An interactive `Autocomplete` component searches the database via `searchCustomers(query)`.
  - Input is **debounced by 300ms** (`useDebounce.js`) to eliminate unnecessary network traffic.
  - Queries search across Customer Name, 10-digit Mobile Number, Address, and Customer Code (`CUS00001`).
  - Selecting a customer automatically pre-fills:
    - Customer Name and normalized 10-digit Mobile Number.
    - Delivery Address and Address Type (`Home`, `Work`, `Other`).
    - Stored customer default discount percentage (e.g. 5% or 10%).
  - If a typed query does not match, the dropdown offers a one-click option: `Add "<query>" as a new customer`, which instantly switches to New Customer mode with pre-filled inputs.
- **Mode B: New Customer**
  - Displays input fields: Customer Name, 10-digit Mobile Number, Delivery Address, Address Type, Pincode, and Email.
  - Validates that the customer name is non-empty and the mobile number conforms to Indian telecommunication standards (`/^[6-9]\d{9}$/`).
  - Address is optional for Walk-In customers, including newly registered ones; an empty address is stored as `NULL`. It is required only for On-Call (Pickup) orders.

#### 2. Order Type Selection
Operators select the intake channel:
- **Walk-In (Store Drop)**: The customer dropped garments off at the counter. No pickup logistics required.
- **On-Call (Pickup & Delivery)**: Customer requested a pickup from their address.

#### 3. On-Call Schedule Validation (`validateOnCallSchedule`)
When `On-Call` is selected, the modal dynamically displays scheduling inputs:
- `Pickup Date` (`<input type="date">`) and `Pickup Time` (`<input type="time">`).
- `Delivery Date` (`<input type="date">`) and `Delivery Time` (`<input type="time">`).
- **Validation Engine Rules (`onCallScheduling.js`):**
  - Both Pickup Date and Time are mandatory for On-Call orders.
  - Both Delivery Date and Time are mandatory for On-Call orders.
  - **No Past Pickups**: For new orders, the pickup date/time cannot be earlier than the current local clock time.
  - **Sequential Delivery**: The scheduled delivery date/time must be strictly chronologically after the pickup date/time.
  - If validation fails, red helper text highlights the invalid fields and displays an error alert.

#### 4. Staff & Driver Allocation
Operators assign staff responsible for the order lifecycle:
- **Attend Staff Name**: Dropdown loaded dynamically from `washdoor_staff_master`. Represents the counter staff receiving the order (e.g., `Sakthi (STF001) • Zone A`, `Balaji (STF002) • Zone B`).
- **Assigned Pickup & Delivery Person**: Dropdown loaded dynamically from `washdoor_pickup_delivery_master`. Represents the driver/rider dispatched for pickup or delivery (e.g., `Ramesh (PUD001) • Zone A`, `Venkat (PUD002) • Zone B`).

#### 5. "Create Order Directly" Option
Step 1 includes a secondary action button: **`Create Order Directly`**.
- Enables counter operators to place a preliminary or zero-garment intake order immediately (useful when garments will be counted or tagged later in the processing area).
- Validates Step 1 customer details and schedule, generates the order number, persists the record, and exits without requiring Step 2.

#### 6. Step 1 Validation & Transition
Clicking **`Next: Build Order`** triggers `validateStageOne()`:
- Verifies that all customer required fields are satisfied.
- Verifies that On-Call dates and times are valid.
- If valid, sets `stage = 2` and transitions the modal to Step 2.

---

### 2.2 Step 2 – Build the Order Workflow

#### 1. Header Summary & Quick Edit
The top of Step 2 displays a persistent status banner with active metadata chips:
- `Order ORD0000X` (Auto-generated preview order number).
- Customer Name chip.
- Order Type chip (`Walk-In` or `On-Call`).
- Attend Staff chip.
- **`Edit Customer Details`** button: Allows operators to step back to Step 1 at any moment to change customer info, staff, or schedule without losing added cart garments.

#### 2. Garment Catalog (Left Column)
The left pane features the product master catalog:
- **Category Filter Tabs**: Horizontal pill buttons allowing instant filtering: `All`, `Men`, `Women`, `Kids`, `Home Linen`, `Accessories`.
- **Garment Search Bar**: Real-time filtering by garment title (e.g. `Shirt`, `Saree`, `Bedsheet`) or product item code.
- **Product Card Grid**: Each garment is displayed as an individual card:
  - Apparel Vector Illustration (`ClothIllustration` SVG).
  - Garment Title and category tag.
  - Unit Price Display: Formatted as `₹XX.00 / piece`.
  - **Price Availability Guard**: If a garment lacks a valid unit price in `washdoor_products`, the card displays `Price unavailable` in red and disables the `Add` button, preventing invalid billing.
  - **Service Selector Dropdown**: Defaults to `'Laundry'` (or the first available service). Operators can select `Laundry`, `Dry Cleaning`, `Washing`, `Shoe Cleaning`, `Ironing Only`, or custom services per item *before* adding it to the cart.
  - **Quantity Stepper**: Minus (`-`), count display, and plus (`+`) buttons to configure quantity.
  - **`+ Add` Button**: Appends the item to the cart ledger.

#### 3. Order Cart Ledger (Right Column)
The right pane maintains the active order cart:
- **Empty State**: Visual icon indicating an empty cart with guidance to add garments.
- **Cart Line Items**: Each item card includes:
  - Garment title, selected service type, and unit rate.
  - **Dynamic Service Modifier**: An inline dropdown on each cart row allows switching the service category directly inside the cart, automatically updating prices.
  - **Quantity Adjustment Stepper**: Interactive `-` and `+` buttons. Decreasing below 1 automatically removes the item.
  - **Line Item Total**: Real-time `rate * qty` display.
  - **Delete Icon**: One-click removal of the garment line.
- **`Clear Cart` Button**: Prompts a confirmation dialog to safely wipe all cart items.

#### 4. Additional Accordions
Located below the cart items:
- **Additional Details Accordion**:
  - `Care / Service Notes`: Customer-specific instructions (e.g. "Starch shirts", "Delicate silk saree").
  - `Internal Comments`: Private staff remarks not visible to the customer.
  - `Discount %`: Numeric input (0% to 100%). Pre-filled from customer defaults if available.
  - `Apply Tax Exemption` Toggle Button: One-click button that toggles GST between 5% and 0%.
- **Payment / Billing Accordion**:
  - `Payment Method`: Configurable dropdown (Cash, UPI, Card, Wallet, Net Banking, Credit).
  - `Advance Collected`: Numeric field capturing partial or full intake payments.
  - `Reference / Transaction ID`: Input for bank transaction numbers, UPI UTR, or card approval codes.
- **Review & Actions Accordion**:
  - Collapsible checklist displaying green checkmarks verifying Customer, Order Type, Assigned Staff, Item Count, and Pickup Schedule.

#### 5. Real-Time Order Summary Bar (Sticky Footer)
At the bottom of Step 2, a persistent 6-column financial summary calculates in real-time:
1. **Total Items**: Number of distinct garment lines.
2. **Total Pieces**: Sum of physical garment quantities (`itemCount`).
3. **Subtotal**: Base sum of all line item amounts (`rate * qty`).
4. **Discount (`X%`)**: Deducted discount amount.
5. **GST / Tax (`5%` or `0%`)**: Tax calculated on the taxable amount (`Subtotal - Discount`).
6. **Grand Total**: Final payable amount highlighted in prominent bold blue text.

---

### 2.3 Order Saving & Persistence Workflow (`persistOrder`)

When the operator clicks **`Save Order`**:
1. **Guard Validations**:
   - Validates that Step 1 fields and On-Call schedules remain valid.
   - Verifies that the cart contains at least 1 garment item (or displays a warning alert).
2. **Data Assembly (`buildCustomerData`)**:
   - Formats address with address type prefix (`Home: No. 7, MBT Road`).
   - Combines care notes and internal comments.
   - Computes financial ledger: subtotal, discount %, discount amount, taxable amount, tax amount (5% GST), grand total, advance paid, and balance due.
   - Resolves attend staff ID, staff name, pickup driver ID, and driver name.
3. **API Execution (`createOrderWithCustomer`)**:
   - Dispatches a single unified payload to `customerService.js`.
   - If New Customer mode: Inserts a new customer record into `public.customers` and retrieves the assigned customer ID.
   - Generates the next order number via database sequence (`ORD0000X`).
   - Inserts the order row into `public.customer_works` (or `washdoor_orders_master`).
   - Inserts normalized line items into `public.washdoor_order_items`.
   - If On-Call: Inserts the logistics record into `public.washdoor_pickup_delivery_schedules`.
   - If advance payment was captured: Records the entry in `public.washdoor_payment_ledger`.
   - Records the creation event in `public.washdoor_status_history` and `public.washdoor_audit_logs`.
4. **Post-Save UI Updates**:
   - Displays a success Toast notification: `✅ Order ORD0000X created for [Customer Name]!`.
   - Emits the created order object to `onOrderSuccess`.
   - Closes the creation modal.
   - Automatically triggers `onRefreshOrders()` to reload the table with the new order at the top.

---

## 3. Orders List Table Features (`OrdersV2List.jsx`)

The main Orders v2 workspace displays all store orders in a responsive, DataGrid-style table with real-time analytics.

### 3.1 Top Toolbar & Filters
- **Multi-Field Search Input**: Instant live filter matching against Order ID, Customer Name, Mobile Number, or Delivery Address.
- **Status Dropdown**: Filters orders by status (`All Statuses`, `Order Received`, `In Progress`, `Ready`, `Delivered`, `Cancelled`).
- **Dynamic Service Category Dropdown**: Populated directly from Supabase `washdoor_service_types`. Filters orders by service category (`All Services`, `Laundry`, `Dry Cleaning`, `Washing`, `Shoe Cleaning`, `Ironing Only`, custom types).
- **Time Range Dropdown**: Filters orders by intake date (`All Time`, `Today`, `This Week`, `This Month`).
- **Reset Filters Button**: One-click icon button resetting all dropdowns and search inputs to default.

### 3.2 Status Filter Pills
A horizontal bar of quick-filter badges displaying canonical statuses with live counts:
- `All (N)`
- `Order Received (N)`
- `In Progress (N)`
- `Ready (N)`
- `Delivered (N)`
- `Cancelled (N)`
Clicking any pill filters the table and resets pagination to page 1.

### 3.3 4 KPI Summary Cards
Positioned above the table, four cards summarize the active filtered dataset:
1. **Total Orders**: Total count of active filtered orders.
2. **Total Revenue**: Sum of `total_amount` formatted with currency symbol (`₹XX,XXX.00`).
3. **Pending Balance**: Sum of `balance_due` across all filtered orders.
4. **Ready for Pickup**: Count of orders currently in the `Ready` status awaiting delivery.

### 3.4 Table Columns & Interactive Features
The table renders the following columns:
1. **Order ID**: Displays formatted order number (`ORD00001`), order type tag (`Walk-In` or `On-Call`), priority indicator, and intake date/time.
2. **Customer**: Customer display name, normalized phone number with call/copy action, and truncated address.
3. **Services Column (Enhanced Feature)**:
   - Displays the primary service category badge with an icon and total garments count.
   - If an order includes multiple services, a **`+N More`** badge appears (e.g. `+2 More`).
   - Clicking either the service badge or `+N More` opens the **`ServicesPopover`**:
     - Shows order ID in the popover header.
     - Displays an expandable accordion for every service in the order.
     - Lists all garments under that service with vector thumbnails (`ClothIllustration`), garment titles, and piece count multipliers (`×2`).
4. **Total**: Grand total amount, advance paid, balance due, and color-coded payment badge (`Paid`, `Partially Paid`, `Unpaid`).
5. **Status**: Canonical status pill with color-coded dot indicator matching canonical states:
   - `Order Received`: Blue theme (`#2563eb`)
   - `In Progress`: Amber/Yellow theme (`#f59e0b`)
   - `Ready`: Emerald Green theme (`#10b981`)
   - `Delivered`: Green theme (`#16a34a`)
   - `Cancelled`: Red theme (`#ef4444`)
6. **Date**: Formatted intake timestamp.
7. **Actions**:
   - **Bill Icon (`ReceiptLongOutlined`)**: Opens `ThermalReceiptModal` (80mm thermal receipt).
   - **View Icon (`VisibilityOutlined`)**: Opens `OrderStatusDrawer` (4-tab POS lifecycle view).
   - **Inline Edit Arrow (`KeyboardArrowDown` / `Right`)**: Expands row to reveal the 7-tab Horizontal Stepper.
   - **Slide Drawer Edit (`EditOutlined`)**: Opens `OrdersV2EditDrawer` from the right edge.
   - **Delete Icon (`DeleteOutlined`)**: Prompts user confirmation and deletes the order via `deleteOrderFromSupabase`.

### 3.5 Sticky Footer DataGrid Pagination
A sticky footer at the bottom of the table features:
- **Rows per page selector**: Options for `10` (default), `20`, `50`, and `100`. The `5` and `All` options are not available.
- **Row count display**: Indicates `X–Y of N` for the active page (e.g. `1–10 of 40`).
- **Navigation Buttons**: Only `FirstPage` (`|◄`), `KeyboardArrowLeft` (`◄`), `KeyboardArrowRight` (`►`), `LastPage` (`►|`), with a uniform 6px gap, no numbered page buttons, and correct disabled states on the first and last pages.
- **Viewport**: The table keeps the fixed five-row scroll viewport; the remaining records of the 10-row page are reached by internal vertical scrolling.

---

## 4. The 7-Tab Horizontal Stepper Inline Edit Workflow

Clicking the expand arrow on any table row expands the row into a full-width workspace featuring **7 Horizontal Stepper Tabs**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [1. Customer Details] [2. Order Details] [3. Garment Inspection] [4. Laundry Processing]               │
│ [5. Payments & Billing] [6. Customer Messages] [7. Review & Messages]                                  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Customer Details
- View and edit customer name, primary mobile number, alternate phone, email, and delivery address.
- Change address type (`Home`, `Work`, `Other`).
- Toggle Priority tag (`Normal`, `Express`, `Urgent`).

### Tab 2: Order Details (Blue-Themed Workspace)
- **Primary Service Selector**: Change the order's primary service category.
- **Service Types Manager**: Includes the **`+ Add New Service Type`** action, allowing operators to create new custom service categories that persist directly into Supabase `washdoor_service_types` without leaving the edit view.
- **Garment Catalog & Cart**: Add additional garments, adjust unit prices, change item quantities, and specify item-level care instructions.

### Tab 3: Garment Inspection (`GarmentInspectionSection.jsx`)
- Inspect each garment unit individually.
- Specify **Fabric Type** (Cotton, Silk, Wool, Denim, Linen, Polyester, Rayon, Blended).
- Specify **Manufacturer / Make** (Readymade, Tailored, Boutique, Imported, Branded).
- Log **Garment Condition** (Good, Delicate, Torn, Faded, Missing Button, Color Bleed Risk).
- Tag existing **Stains** (Tea/Coffee, Oil/Grease, Ink, Blood, Wine, Food, Rust, Mud).
- Record **Damage Location** (Collar, Cuff, Hem, Pocket, Zipper, Seam).
- Select **Finish Preference** (Standard Fold, Hanger, Crease, Soft Finish).
- Upload photographic evidence to Supabase Storage bucket `washdoor-garment-photos`.

### Tab 4: Laundry Processing
- Track internal processing stations: `Sorting` → `Washing` → `Drying` → `Ironing` → `Quality Check` → `Ready for Packing`.
- Assign washing machine / dryer unit number.
- Record shop storage location (e.g. `Rack B-14`, `Shelf 3`).
- Assign processing staff operator.

### Tab 5: Payments & Billing
- View real-time recalculated subtotal, GST tax amount, discount amount, and grand total.
- Record new payments: enter collected advance or balance payment amount.
- Select payment mode (Cash, UPI, Card, Net Banking, Wallet).
- Enter transaction / UTR reference number.
- Automatically recalculates `balance_due` and updates payment status (`Paid`, `Partially Paid`, `Unpaid`).

### Tab 6: Customer Messages
- Customer notification hub for WhatsApp and SMS messages.
- Select from pre-configured message templates:
  - *Order Received Template*
  - *Garments Ready for Pickup Template*
  - *Out for Delivery Notification*
  - *Payment Receipt Template*
- Live message preview displaying dynamic variables (`{customer_name}`, `{order_id}`, `{total_amount}`, `{balance_due}`).
- "Send via WhatsApp" and "Send SMS" buttons that trigger notifications and record delivery logs in `notification_logs`.

### Tab 7: Review & Messages
- Comprehensive fact-check overview of all modified fields.
- Itemized summary table with pieces, services, and amounts.
- Activity history audit timeline showing timestamps and staff names.
- Action Buttons:
  - **`Save Changes`**: Commits all edits across customer details, items, inspections, and billing to Supabase via `updateOrderInSupabase`.
  - **`Cancel`**: Discards uncommitted draft changes and collapses the inline edit row.

---

## 5. Slide-Over Edit Drawer & Additional Modals

### 5.1 Orders v2 Edit Drawer (`OrdersV2EditDrawer.jsx`)
Launched via the `Edit` button in the table actions column:
- Slides smoothly over the screen from the right edge.
- Allows editing customer info, order status, pickup and delivery dates, and line items without expanding table rows.
- Recalculates subtotal, 5% GST, and balance due in real-time.
- Saves changes directly to Supabase via `updateOrderInSupabase`.

### 5.2 POS Order Status Drawer (`OrderStatusDrawer.jsx`)
Launched via the `View` button:
- Displays 4 tabbed sections:
  1. **Order Details**: Order type (Walk-In vs On-Call), intake date, attend staff, and complete service breakdown.
  2. **Activity History**: Immutable timeline of every status transition with staff attribution.
  3. **Payment Info**: Itemized financial breakdown, payment mode, advance received, and outstanding balance.
  4. **Collection Info**: Scheduled pickup and delivery slots, assigned driver, vehicle number, and route zone.
- Includes a direct "Reprint Thermal Receipt" button.

### 5.3 Thermal Receipt Modal (`ThermalReceiptModal.jsx`)
Launched via the `Bill` button:
- Generates standard **80mm thermal receipts** formatted for ESC/POS receipt printers.
- Includes: Store title (`Washdoor`), branch address, contact phone, customer details, barcode, QR code for tracking, itemized garment table, GST tax breakdown (CGST + SGST), payment status, and terms & conditions.
- Features a one-click `Print Receipt` action triggering standard browser and hardware printing dialogs.
