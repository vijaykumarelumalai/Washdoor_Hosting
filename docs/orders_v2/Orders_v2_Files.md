# Orders v2 Architecture – Complete Files & Component Directory

This document provides a comprehensive index of all frontend components, styles, utility modules, hooks, types, configuration files, API/service modules, and Supabase SQL schema migrations powering the **Orders v2** module in the Washdoor Laundry POS & Customer Management System.

---

## 1. Frontend Core Components (`src/components/`)

| Filename & Relative Path | Exact Path | Primary Purpose & Role in Orders v2 |
| :--- | :--- | :--- |
| **`OrdersV2.jsx`** | `src/components/OrdersV2.jsx` | **Main Orders v2 Shell & Controller.** Houses the top navigation header with blue cart icon, search & filter toolbar (Order ID / Customer / Mobile search, Status dropdown, Service Category dropdown, Time range dropdown, reset button), 6 status filter chips (`All`, `Order Received`, `In Progress`, `Ready`, `Delivered`, `Cancelled`), 4 KPI summary cards (`Total Orders`, `Total Revenue`, `Pending Balance`, `Ready for Pickup`), service types synchronization with Supabase, loading indicators, and orchestrates child dialogs (Create Order, View Order, Side Edit, Slide Drawer, Thermal Receipt). |
| **`OrdersV2CreateOrder.jsx`** | `src/components/OrdersV2CreateOrder.jsx` | **Two-Step Order Intake Modal Dialog.** Implements the complete order creation wizard: **Step 1 (Order Basics)** manages customer selection (existing autocomplete search with 300ms debounce or new customer registration), order type selection (Walk-In vs On-Call), date/time scheduling validation for pickups/deliveries, and attend staff / pickup person assignments. **Step 2 (Build the Order)** provides the garment catalog filterable by category, price availability checks, per-item service type selection, quantity stepper, real-time cart ledger, care notes, discount % input, tax exemption toggle, payment collection (method, advance, reference ID), real-time order summary calculation, and single-transaction order persistence. |
| **`OrdersV2List.jsx`** | `src/components/OrdersV2List.jsx` | **Core Orders Table & 7-Tab Horizontal Stepper.** Renders the primary tabular orders list with sticky headers, column width resize handlers, dynamic Services column with single badge + `+N More` counter, `ServicesPopover` garment viewer, canonical status badges, and expandable row for the **7 Horizontal Stepper Inline Edit tabs** (`Customer Details`, `Order Details` with blue theme, `Garment Inspection`, `Laundry Processing`, `Payments & Billing`, `Customer Messages`, `Review & Messages`). Also hosts DataGrid-style sticky footer pagination (10 default, 10/20/50/100 rows per page, compact First/Prev/Next/Last navigation with no numbered buttons). |
| **`OrdersV2EditDrawer.jsx`** | `src/components/OrdersV2EditDrawer.jsx` | **Fast Slide-over Edit Drawer.** Slide-out panel from the right edge for rapid order modification without expanding table rows. Enables updating customer contact information, order status, pickup/delivery schedules, garment line items (adding, updating quantities, deleting), recalculating taxes, and updating payment notes. |
| **`OrdersV2Counter.jsx`** | `src/components/OrdersV2Counter.jsx` | **High-Fidelity POS Counter Intake Panel.** Rapid-intake counter view optimized for high-volume store drop-offs, featuring quick garment taps, category filters, fast customer search, advance payment capture, and driver dispatch scheduling. |
| **`SideEditPanel.jsx`** | `src/components/SideEditPanel.jsx` | **Comprehensive Side Order Editing Panel.** Deep inspection and order modification side drawer with responsive tabbed sections covering Order Details, Logistics, Staff Assignment, Garment Inspection, Payments, and Activity History. |
| **`pos/OrderStatusDrawer.jsx`** | `src/components/pos/OrderStatusDrawer.jsx` | **POS-Style 4-Tab Lifecycle View Modal.** Launched via the "View" action button in Orders v2. Displays complete order lifecycle details partitioned into 4 distinct tabs: `Order Details` (type, intake, staff, services breakdown), `Activity History` (immutable audit timeline), `Payment Info` (subtotal, tax, advance, balance due, payment mode), and `Collection Info` (scheduled pickup/delivery slots, assigned driver, vehicle). |
| **`ThermalReceiptModal.jsx`** | `src/components/ThermalReceiptModal.jsx` | **80mm Thermal Receipt Generator & Print Modal.** Launched via the "Bill" action button in Orders v2. Generates print-ready 80mm thermal receipts with store branding, GSTIN, receipt number, barcode/QR code, itemized garment table, GST tax breakdown, payment status, and terms & conditions. |
| **`GarmentInspectionSection.jsx`** | `src/components/GarmentInspectionSection.jsx` | **Garment Defect & Care Inspection Module.** Embedded in both the Inline Edit stepper and Side Edit panel. Manages per-garment inspections, fabric types, manufacturing make, existing stains, fabric tears/damage, finish preferences (Hanger, Standard Fold), extra charges, and customer acknowledgment tracking. |
| **`ClothIllustration.jsx` / `.tsx`** | `src/components/ClothIllustration.jsx` | **Vector Garment Illustrations Component.** Renders high-fidelity SVG vector icons for 16 standard laundry categories (Shirt, T-Shirt, Formal Pant, Jeans, Saree, Chudidar, Kurti, Shorts, Bedsheet, Pillow Cover, Towel, Jacket, Blazer/Suit, Sweater, Cap, Curtain, Shoes). Used in garment catalog cards, cart rows, and popovers. |
| **`ClothSelectionCart.jsx`** | `src/components/ClothSelectionCart.jsx` | **Interactive Garment Catalog & Cart Widget.** Reusable garment grid selector and cart ledger used in legacy modals and intake screens. |
| **`ServiceTypeSelect.jsx`** | `src/components/ServiceTypeSelect.jsx` | **Dynamic Service Dropdown with Custom Type Creator.** Select component providing service types (Laundry, Dry Cleaning, Washing, Shoe Cleaning, Ironing Only, Custom Category). Includes an inline "+ Add New Service Type" creator that immediately persists new service types into Supabase `washdoor_service_types`. |
| **`StaffSearchDropdown.jsx`** | `src/components/StaffSearchDropdown.jsx` | **Searchable Staff Selector Dropdown.** Fetches and filters active staff records from `washdoor_staff_master` and `washdoor_pickup_delivery_master` with role, zone, and unique staff ID display. |
| **`StaffMasterManager.jsx`** | `src/components/StaffMasterManager.jsx` | **Staff Roster Management Modal.** Administrative CRUD interface for creating, updating, and toggling Active/Inactive status of counter staff and delivery drivers. |
| **`CustomerSearchPanel.jsx` / `.tsx`** | `src/components/CustomerSearchPanel.jsx` | **Customer 360 Search Panel.** Fast search bar for locating customers across name, mobile, address, and customer code with customer profile drawer launch. |
| **`CustomerDetailDrawer.jsx`** | `src/components/CustomerDetailDrawer.jsx` | **Customer 360 Profile Drawer.** Detailed slide-out drawer presenting customer classification, lifetime order history, outstanding balance, addresses, and loyalty metrics. |
| **`pos/ServicesPopover.jsx`** | `src/components/pos/ServicesPopover.jsx` | **Interactive Services & Garments Breakdown Popover.** Triggered when clicking the primary service badge or the `+N More` button in the Orders v2 Services table column. Renders grouped garments per service with expand/collapse accordions, garment thumbnails, and counts. |
| **`pos/PaginationBar.jsx`** | `src/components/pos/PaginationBar.jsx` | **Reusable DataGrid-Style Sticky Footer Pagination.** Sticky bottom navigation bar with page size selector (5, 10, 20, 50, All), current row range display (`X–Y of N`), and First, Previous, Next, Last buttons. |
| **`pos/QRPaymentDialog.jsx`** | `src/components/pos/QRPaymentDialog.jsx` | **Dynamic UPI QR Code Dialog.** Generates dynamic Bharat QR / UPI payment intent strings (`upi://pay?pa=...`) for instant POS screen scanning and payment collection. |
| **`common/LoadingState.jsx`** | `src/components/common/LoadingState.jsx` | **Loading Indicator Component.** Displays animated spinner and contextual status text (`Syncing Orders...`) during data fetching. |
| **`common/StatusChip.jsx`** | `src/components/common/StatusChip.jsx` | **Canonical Status Badge Component.** Consistent status pill rendering with background and text color tokens matching canonical order states. |

---

## 2. Stylesheets (`src/styles/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`OrdersV2.css`** | `src/styles/OrdersV2.css` | Styling definitions for Orders v2 main container, header layout, search toolbar, status filter pills, 4 KPI cards, DataGrid table container, custom scrollbars, and responsive media queries. |
| **`SideEditPanel.css`** | `src/styles/SideEditPanel.css` | Side edit drawer styling, layout grids, inspection fields, tabbed headers, and slide-in/slide-out animations. |
| **`GarmentInspection.css`** | `src/styles/GarmentInspection.css` | Inspection section card grid, defect tagging inputs, photo thumbnails, and severity indicators. |
| **`POSModule.css`** | `src/styles/POSModule.css` | POS styling, order status drawer styles, timeline event icons, and thermal receipt print layout. |
| **`theme.css`** | `src/styles/theme.css` | Global color palette tokens, typography scales, elevation shadows, and input border styles. |

---

## 3. Configuration & Business Rules (`src/config/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`orderColumnsConfig.js`** | `src/config/orderColumnsConfig.js` | Centralized definition of the **9 default table columns** (`order_id`, `customer`, `address`, `services`, `status`, `payment`, `order_details`, `pickup_delivery`, `actions`) and **8 dynamic/optional columns** (`driver`, `comments`, `pincode`, `email`, `gst_number`, `weight`, `rack_location`, `delivery_date`). Specifies column labels, widths, alignment, and visibility rules. |
| **`businessRules.js`** | `src/config/businessRules.js` | Centralized business configuration: default GST rate (5%), currency symbol (`₹`), default services list, tax calculation helpers (`calculateOrderTotals`), notification templates (WhatsApp & SMS), and stored store settings fallback. |
| **`posConstants.ts`** | `src/config/posConstants.ts` | TypeScript constants for POS payment modes, workflow statuses, inspection categories, and default limits. |

---

## 4. Custom Hooks & State Utilities (`src/hooks/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`useOrdersPagination.ts`** | `src/hooks/useOrdersPagination.ts` | Custom React hook managing client-side pagination state, calculating total pages, valid page slices, and handling page changes safely. |
| **`useDebounce.js`** | `src/hooks/useDebounce.js` | Input debouncing hook (configured to 300ms) used in `OrdersV2CreateOrder` to prevent redundant customer lookup queries while typing. |

---

## 5. TypeScript Types & Data Contracts (`src/types/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`order.ts`** | `src/types/order.ts` | TypeScript interfaces for `Order`, `OrderItem`, `CanonicalOrderStatus`, `PropertyStatus`, and `ServiceCategory`. Defines the canonical order data contract across the application. |
| **`order.types.ts`** | `src/types/order.types.ts` | Additional type definitions for `OrderStatus`, `PaymentStatus`, `PaymentMode`, `GarmentInspection`, and `ActivityEvent`. |
| **`pos.types.ts`** | `src/types/pos.types.ts` | TypeScript types for POS transactions, counter intake payloads, payment intents, and printer options. |
| **`customer.ts`** | `src/types/customer.ts` | Customer directory type interfaces: personal details, classification, credit limit, and communication preferences. |
| **`settings.ts`** | `src/types/settings.ts` | Store settings, tax rates, receipt formatting, and payment gateway configuration types. |

---

## 6. Utilities & Data Normalizers (`src/utils/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`normalizeOrder.ts`** | `src/utils/normalizeOrder.ts` | **Single Source of Truth Order Normalizer.** Safely transforms raw, heterogeneous Supabase rows (from `customer_works` or `washdoor_orders_master`) into a standardized `NormalizedOrder` shape. Prevents runtime `null`/`undefined` errors by defaulting numbers to `0` and strings to `''`. |
| **`orderStatus.ts`** | `src/utils/orderStatus.ts` | Canonical order status normalizer (`normalizeOrderStatus`) and status badge color mapping tokens. Normalizes variations into 5 canonical statuses: `Order Received`, `In Progress`, `Ready`, `Delivered`, `Cancelled`. |
| **`onCallScheduling.js`** | `src/utils/onCallScheduling.js` | On-Call pickup and delivery scheduling logic. Provides `isOnCallOrderType`, `splitIsoToLocalDateAndTime`, `combineLocalDateAndTimeToIso`, `formatScheduledDateTime`, and `validateOnCallSchedule` (enforces pickup date/time rules, delivery date/time sequence, and business hours). |
| **`validation.js` / `.ts`** | `src/utils/validation.js` | Indian mobile number normalization (`normalizeMobileNumber`), 10-digit validation (`/^[6-9]\d{9}$/`), customer validation (`validateCustomer`), and user-friendly error string formatting (`friendlySupabaseError`). |
| **`dateFormat.ts`** | `src/utils/dateFormat.ts` | Consistent date and time formatting utility using Indian locale (`en-IN`) and British format (`DD MMM YYYY, hh:mm A`). |
| **`money.ts`** | `src/utils/money.ts` | Currency formatting helper using Indian Numbering System (`en-IN`) with 2 decimal places and currency symbol prefix. |
| **`supabase.js` / `lib/supabaseClient.js`** | `src/lib/supabaseClient.js` | Supabase JavaScript client initialization (`createClient`), environment variable loading (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), and `isSupabaseConfigured` health check. |

---

## 7. Services & API Layer (`src/services/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`customerService.js`** | `src/services/customerService.js` | **Master API & Database Connector.** Contains the comprehensive suite of database queries: `getOrders` (fetches order list with fallback logic), `createOrderWithCustomer` (atomic customer registration + order creation), `updateOrder` / `updateOrderInSupabase` (updates orders and line items), `deleteOrderFromSupabase` (cascading order deletion), `getNextOrderId` / `formatOrderId` (auto-incrementing `ORD0000X` sequence), `fetchActiveStaffMaster`, `fetchActivePickupDeliveryMaster`, `getProducts`, `saveOrderItems`, `getOrderItems`, `recordAuditLogEntry`, `recordPaymentLedger`, `recordStatusHistory`, `recordOrderNote`, and `searchCustomers`. |
| **`serviceTypeService.js`** | `src/services/serviceTypeService.js` | Dedicated service for `washdoor_service_types` in Supabase. Provides `fetchServiceTypes`, `createServiceType`, `updateServiceType`, `deleteServiceType`, and dispatches the `washdoor_service_types_updated` custom event to keep UI components synchronized in real-time. |
| **`columnPreferenceService.js`** | `src/services/columnPreferenceService.js` | Stores and loads user table column preferences (visible columns and custom column widths) from `localStorage`. |
| **`storeSettingsService.js`** | `src/services/storeSettingsService.js` | Fetches and persists store settings from Supabase table `washdoor_store_settings`. |
| **`auditService.js`** | `src/services/auditService.js` | Query and retrieval functions for `washdoor_audit_logs`. |
| **`exportService.js`** | `src/services/exportService.js` | Generates CSV and Excel file exports for filtered order lists and financial audit reports. |
| **`notificationTemplateService.js`** | `src/services/notificationTemplateService.js` | CRUD service for `notification_templates` used for customer communication in the messages tab. |

---

## 8. Supabase SQL Schemas & Migrations (`supabase/`)

| Filename & Relative Path | Exact Path | Primary Purpose |
| :--- | :--- | :--- |
| **`customer_works.sql`** | `supabase/customer_works.sql` | Primary production table DDL for `public.customer_works`. Creates sequence `customer_work_seq`, auto-generation function `generate_customer_work_number()`, table columns, check constraints, stored generated `balance_due`, RLS policies, and triggers. |
| **`washdoor_orders_master.sql`** | `supabase/washdoor_orders_master.sql` | Unified master table schema for `public.washdoor_orders_master`. Creates sequence `order_number_seq`, function `generate_order_number()`, table columns, full-text search indexes, RLS policies, and 10 seed orders for initial testing. |
| **`order_pos_integration_migration.sql`** | `supabase/order_pos_integration_migration.sql` | Complete relational integration migration. Adds missing columns on `customer_works` (`tax_exemption`, `discount_pct`, `taxable_amount`, `gst_percentage`, `invoice_number`, `invoice_date`, `staff_notes`), creates `washdoor_factory_orders`, `washdoor_pickup_delivery_schedules`, `washdoor_customer_addresses`, `washdoor_held_orders`, `washdoor_products`, `washdoor_order_items`, `notification_templates`, `notification_logs`, storage bucket policies for `washdoor-garment-photos`, and RPC `get_next_order_number()`. |
| **`schema.sql`** | `supabase/schema.sql` | Production database architecture v2.1. Contains all 13 core relational tables (`customer_works`, `customers`, `washdoor_payment_gateway_transactions`, `washdoor_inspection_categories`, `washdoor_driver_schedules`, `washdoor_status_history`, `washdoor_payment_ledger`, `washdoor_wallets`, `washdoor_wallet_transactions`, `washdoor_wallet_customer_monitor`, `washdoor_driver_assignments`, `washdoor_live_status_actions`, `washdoor_garment_cards`, `washdoor_garment_inspections`, `washdoor_garment_photos`), business sequences (`ORD`, `CUS`, `PAY`, `MSG`, `NOTE`, `AUD`), secure views, and RLS policies. |
| **`staff_and_pickup_master.sql`** | `supabase/staff_and_pickup_master.sql` | DDL for `washdoor_staff_master` (counter staff roster) and `washdoor_pickup_delivery_master` (riders/drivers roster). Adds foreign key columns (`attend_staff_id`, `assigned_pickup_person_id`) to `customer_works`, auto-update triggers, and sample seed staff. |
| **`service_types.sql`** | `supabase/service_types.sql` | DDL for `washdoor_service_types`. Creates the dynamic service type master table, case-insensitive unique index, auto-update trigger, and seeds 6 default services. |
| **`store_settings.sql`** | `supabase/store_settings.sql` | Schema for `washdoor_store_settings` storing store profile, tax configuration, UPI payment parameters, and receipt styling. |
| **`notification_templates.sql`** | `supabase/notification_templates.sql` | Schema and default seed templates for WhatsApp and SMS customer notifications. |
