# WashDoor — Supabase Backend Connectivity, Creation & Integration Guide

This document explains how **WashDoor** connects to Supabase, how the PostgreSQL schema and Storage bucket are created and structured, and how every React UI module (Orders, POS, Customers, Garment Inspection, Logistics, Notifications, and Audit Log) integrates with the Supabase backend.

---

## 1. Backend Connectivity & Environment Setup

### 1.1 Client Initialization
Supabase connectivity is centralized in `src/lib/supabaseClient.js` and re-exported by compatibility aliases `src/supabaseClient.js` and `src/utils/supabase.js`.

- **Client SDK:** `@supabase/supabase-js` (`^2.118.0`)
- **Environment Resolution:** Reads `import.meta.env` in Vite browser builds and falls back to `process.env` in Node.js scripts/tests:
  - `VITE_SUPABASE_URL` — Supabase Project REST/Storage/Auth URL (live project: `https://eunguuboxwbblioljwmy.supabase.co`)
  - `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Public anon/publishable key used by frontend browser requests
- **Vite Bridge:** `vite.config.ts` also maps `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` via `loadEnv`.
- **Health Helper:** `isSupabaseConfigured()` verifies that both URL and key are present and not placeholder values before executing queries.

> **Security Note:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in `src/` frontend code or `VITE_*` variables. Only the `anon` / publishable key is safe for browser bundles; `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is strictly for server-side admin/seed tasks.

### 1.2 Live Connection Status UI
`src/App.jsx` displays a **Supabase Live** indicator pill in the top bar whenever `isSupabaseConfigured()` returns `true`, linking directly to the Supabase Table Editor.

---

## 2. Database Creation & Schema Architecture

### 2.1 SQL Source Files in `supabase/`
| File | Responsibility |
|---|---|
| `supabase/schema.sql` | Core v2.1 PostgreSQL architecture: sequences, `customers`, `customer_works`, 13 relational tables (`washdoor_*`), triggers, `process_wallet_transaction` RPC, views, and RLS policies |
| `supabase/customer_works.sql` | Standalone DDL for `customer_works` and `customer_works_summary` view |
| `supabase/notification_templates.sql` | `notification_templates` and `notification_logs` schema & indexes |
| `supabase/washdoor_orders_master.sql` | Legacy single-table master schema (optional fallback; not deployed on live DB) |
| `supabase/order_pos_integration_migration.sql` | Incremental migration adding `washdoor_factory_orders`, `washdoor_pickup_delivery_schedules`, `washdoor_customer_addresses`, `washdoor_held_orders`, `washdoor_products`/`washdoor_order_items` DDL parity, `notification_*` tables, `get_next_order_number()`, and missing GST/inspection/photo columns |

### 2.2 End-to-End Architecture Flow
1. **React UI Modules** (`App.jsx`, `POSModule.jsx`, `CustomerManagement.jsx`, `SideEditPanel.jsx`, `EditOrderModal.jsx`, `GarmentInspectionSection.jsx`, `OrderReviewCard.jsx`, `AuditLogModule.jsx`) capture user input in React state.
2. **Service Layer** (`src/services/customerService.js`, `src/services/notificationTemplateService.js`, `src/services/columnPreferenceService.js`) normalizes payloads to match PostgreSQL constraints and dispatches API calls to:
   - **Supabase PostgREST** (`customers`, `customer_works`, `washdoor_*`, `notification_*`)
   - **Supabase Storage** (`washdoor-garment-photos` bucket)
   - **Supabase Auth** (`user_metadata` for 17-column visibility preferences)
3. **PostgreSQL Triggers & Generated Columns** automatically compute `balance_due`, sync `washdoor_payment_ledger` totals onto `customer_works`, sync `washdoor_live_status_actions` to `work_status`, and enforce immutability on audit/wallet ledgers.

### 2.3 Standardized Business Identifiers & Sequences
| Identifier | Format | Sequence / Function |
|---|---|---|
| Order Number | `ORD00001` | `seq_washdoor_order_number` / `generate_order_number()` / `get_next_order_number()` |
| Customer Code | `CUS00001` / `CUST-00001` | `seq_washdoor_customer_number` / `generate_customer_number()` / `getNextCustomerId()` |
| Payment Number | `PAY00001` | `seq_washdoor_payment_number` / `generate_payment_number()` |
| Message Number | `MSG00001` | `seq_washdoor_message_number` / `generate_message_number()` |
| Note Number | `NOTE00001` | `seq_washdoor_note_number` / `generate_note_number()` |
| Audit Number | `AUD00001` | `seq_washdoor_audit_number` / `generate_audit_number()` |
| Factory Order Number | `FAC00001` | `seq_washdoor_factory_number` / `generate_factory_order_number()` |
| Held Order Number | `HLD00001` | `seq_washdoor_hold_number` / `generate_hold_order_number()` |

### 2.4 Database Triggers, Generated Columns & RPCs
- **Generated Column (`customer_works.balance_due`):** `GENERATED ALWAYS AS (GREATEST(0.00, total_amount - advance_paid)) STORED` — omitted from `INSERT` and `UPDATE` payloads.
- **Payment Auto-Sync (`trg_sync_payment_ledger_to_work`):** Recalculates `SUM(amount)` on `washdoor_payment_ledger` changes and updates `customer_works.advance_paid` and `payment_status` (`Unpaid` / `Partially Paid` / `Paid`).
- **Live Status Auto-Sync (`trg_sync_live_action_to_work`):** Automatically transitions `customer_works.work_status` on `washdoor_live_status_actions` inserts (`Processing` -> `In Progress`; `Delivery` + `DELIVERED_SUCCESS` -> `Delivered`).
- **Audit & Ledger Immutability (`fn_prevent_audit_tampering`):** Blocks `UPDATE` and `DELETE` on `washdoor_status_history`, `washdoor_wallet_transactions`, and `washdoor_audit_logs`.
- **Concurrency-Safe Wallet RPC (`process_wallet_transaction`):** Uses `SELECT ... FOR UPDATE` row locking on `washdoor_wallets` to prevent race conditions during top-ups, debits, and refunds.

### 2.5 Live Deployment Inventory (`eunguuboxwbblioljwmy.supabase.co`)
- **20 Live Tables Deployed:** `customers`, `customer_works`, `washdoor_products`, `washdoor_order_items`, `washdoor_garment_cards`, `washdoor_garment_inspections`, `washdoor_inspection_categories`, `washdoor_garment_photos`, `washdoor_status_history`, `washdoor_live_status_actions`, `washdoor_payment_ledger`, `washdoor_payment_gateway_transactions`, `washdoor_wallets`, `washdoor_wallet_transactions`, `washdoor_wallet_customer_monitor`, `washdoor_driver_schedules`, `washdoor_driver_assignments`, `washdoor_customer_messages`, `washdoor_order_notes`, `washdoor_audit_logs`.
- **1 Live Storage Bucket Created:** `washdoor-garment-photos` (public bucket).
- **Pending SQL Execution:** Run `supabase/order_pos_integration_migration.sql` once in **Supabase Dashboard -> SQL Editor** to activate the new tables (`washdoor_factory_orders`, `washdoor_pickup_delivery_schedules`, `washdoor_customer_addresses`, `washdoor_held_orders`, `notification_templates`, `notification_logs`), `get_next_order_number()`, and the extended columns on `customer_works`, `washdoor_garment_cards`, and `washdoor_garment_photos`.

---

## 3. Supabase Storage Integration (Garment Photos)

Photos attached in `src/components/GarmentInspectionSection.jsx` are handled by `uploadGarmentPhotos()` in `src/services/customerService.js`:
1. Converts base64 `data:` URIs to binary bytes and uploads to bucket `washdoor-garment-photos` at path `{workNumber}/{cardId}/{timestamp}_{idx}_{filename}.{ext}`.
2. Resolves the public URL via `supabase.storage.from('washdoor-garment-photos').getPublicUrl(storagePath)`.
3. Inserts photo metadata (`card_id`, `work_id`, `work_number`, `photo_type`, `storage_bucket`, `storage_path`, `photo_url`, `file_name`, `file_size_kb`, `mime_type`, `caption`, `captured_by`, `is_customer_visible`) into `washdoor_garment_photos`.

---

## 4. Application Integration Flows

### 4.1 Customer Module CRUD (`src/components/CustomerManagement.jsx` + `src/services/customerService.js`)
- **Create (`createCustomer`):** Inserts normalized master row into `customers` (`customer_code`, `preferred_language`, `company_name`, `gst_number`, `service_zone`, `price_list`, etc.), inserts registration profile row into `customer_works`, and saves additional addresses into `washdoor_customer_addresses`.
- **Read (`getAllCustomers` & `searchCustomers`):** Queries `customers` first via `mapCustomersTableRow`, merges legacy/extra records from `customer_works` and `washdoor_orders_master`, and deduplicates by `customer_code` and `mobile_number`.
- **Update (`updateCustomer`):** Updates `customers` directly, updates contact columns on `customer_works` **without overwriting `internal_notes` JSON on existing orders**, updates `items[0]` profile JSONB on registration rows, and syncs `washdoor_customer_addresses`.
- **Delete (`deleteCustomer`):** Deletes matching records from `customers`, `customer_works`, and `washdoor_orders_master`.

### 4.2 Order & POS Creation Flow (`createOrderWithCustomer`)
Triggered from `src/components/CreateOrderModal.jsx` or Counter Intake in `src/components/POSModule.jsx`:
1. Resolves or registers the customer in `customers` (using `customer_code`).
2. Inserts the primary order in `customer_works` (with `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `advance_paid`, `payment_status`, `payment_method`, `intake_date`, `target_delivery_date`, `items` JSONB, and `internal_notes` JSON).
3. Syncs line items (`saveOrderItems` -> `washdoor_order_items`).
4. Expands each item by quantity into individual piece cards (`syncGarmentCardsAndInspections` -> `washdoor_garment_cards`, `washdoor_garment_inspections`, `washdoor_garment_photos`).
5. Upserts factory/transit metadata (`upsertFactoryOrder` -> `washdoor_factory_orders`).
6. If `advance_paid > 0`, records an initial ledger transaction (`recordPaymentLedger` -> `washdoor_payment_ledger`).
7. Logs initial status & milestone (`recordStatusHistory` -> `washdoor_status_history` & `washdoor_live_status_actions`), customer instructions (`washdoor_order_notes`), notification logs (`washdoor_customer_messages` & `notification_logs`), and audit entry (`washdoor_audit_logs`).

### 4.3 Order Update & Read Flow (`getOrders`, `updateOrder`, `updateOrderStatus`)
- **Read (`getOrders`):** Queries `customer_works` (excluding pure registration rows), batch-hydrates `washdoor_factory_orders` and `washdoor_pickup_delivery_schedules`, and maps every row via `mapCustomerWorkRowToOrder`.
- **Update (`updateOrder` / `updateOrderInSupabase`):** Used by `POSModule.jsx`, `SideEditPanel.jsx`, `EditOrderModal.jsx`, `OrderReviewCard.jsx`, and `App.jsx`:
  - Fetches the existing `customer_works` row and merges `internal_notes` instead of overwriting existing inspection/logistics keys.
  - Normalizes `work_status`, `priority`, `intake_method`, `payment_status`, and `payment_method` to match PostgreSQL `CHECK` constraints.
  - Syncs `washdoor_order_items`, `washdoor_garment_cards`, `washdoor_garment_inspections`, `washdoor_garment_photos`, `washdoor_factory_orders`, `washdoor_pickup_delivery_schedules`, incremental `washdoor_payment_ledger` entries, `washdoor_status_history`, and `washdoor_audit_logs`.
- **Fallbacks:** Extended columns on `customer_works` and `washdoor_garment_cards` automatically strip unmigrated fields on `PGRST204` errors so the app remains operational before and after running `supabase/order_pos_integration_migration.sql`.

### 4.4 Notifications, Preferences & Audit Log Integration
- **Notifications (`src/services/notificationTemplateService.js`):** Reads/writes `notification_templates` and `notification_logs` (with `localStorage` fallback) and records manual dispatches from `POSModule`, `SideEditPanel`, and `OrderReviewCard` to `washdoor_customer_messages`.
- **Column Preferences (`src/services/columnPreferenceService.js`):** Persists visible Order table columns (17 columns) to `supabase.auth.updateUser({ data: { order_table_columns } })` and `localStorage`.
- **Audit Log (`src/components/AuditLogModule.jsx`):** Queries `washdoor_audit_logs` and `washdoor_status_history` via `getSupabaseAuditLogs()`, merging them with order lifecycle events and report export logs (`src/services/auditService.js`).

---

## 5. Setup Checklist for New Environments

1. **Configure Environment:** Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Apply Base Schema:** Execute `supabase/schema.sql` in **Supabase Dashboard -> SQL Editor**.
3. **Apply Order & POS Integration Migration:** Execute `supabase/order_pos_integration_migration.sql` in **Supabase Dashboard -> SQL Editor**.
4. **Provision Storage Bucket:** Create a public Storage bucket named `washdoor-garment-photos` in **Supabase Dashboard -> Storage** (already created on the current live project).
5. **Verify Build & Connectivity:** Run `npm run build` (`tsc --noEmit && vite build`) and start the app with `npm run dev`.

---

## 6. Live Verified Records & Checks

- **Customer CRUD Verified Live:** `createCustomer` -> `getAllCustomers` & `searchCustomers` -> `updateCustomer` -> `deleteCustomer` tested against `eunguuboxwbblioljwmy.supabase.co` with full persistence and cleanup.
- **Sample Order `ORD00010` (`Lakshmi` / `CUST-00003`):** On-Call order, 19 garment cards & inspections (`5 Shirts, 4 Pants, 9 Sarees, 1 Shoe`), pickup rider `Ramesh Kumar`, ₹50 advance in `washdoor_payment_ledger` (`PAY00005`), total `₹887.25`.
- **Sample Order `ORD00012` (`Anand Kumar` / `CUST-00005`):** Pickup & Delivery VIP order, 7 garment cards, ₹200 UPI advance (`PAY00006`), total `₹378.75`, and 2 real PNG photos uploaded to `washdoor-garment-photos` and linked in `washdoor_garment_photos`.
- **Production Build:** `tsc --noEmit && vite build` passed (`exit code 0`, 502 modules built).
