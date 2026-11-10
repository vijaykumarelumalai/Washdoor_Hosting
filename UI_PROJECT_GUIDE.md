# WashDoor UI Project Documentation

**Project:** `washdoor` v1.0.0 — Laundry & Dry Cleaning POS & Order Management Frontend  
**Stack:** React 18 (`^18.3.1`), Vite 5 (`^5.4.11`), TypeScript 7 (`^7.0.2`, hybrid JS/JSX + TS/TSX), Supabase (`@supabase/supabase-js@^2.118.0`)  
**Exports:** Excel (`xlsx@^0.18.5`) & PDF (`jspdf@^4.2.1`)

---

## 1. Tech Stack & Build Configuration

| Layer | Technology / Version | Purpose |
| :--- | :--- | :--- |
| UI Framework | React `^18.3.1`, React DOM `^18.3.1` | Component rendering & interactive state |
| Build Tooling | Vite `^5.4.11`, `@vitejs/plugin-react@^4.3.4` | Fast HMR dev server & production bundling |
| Type Checking | TypeScript `^7.0.2` (`@types/react`, `@types/react-dom`, `@types/node`) | Strict static type checking with JS interop |
| Backend Client | `@supabase/supabase-js@^2.118.0` | Live database sync & Storage photo uploads |
| Document Export | `jspdf@^4.2.1`, `xlsx@^0.18.5` | PDF & Excel workbook generation |

### Entry & Configuration Files
- **`index.html`**: Loads Google Font `Inter`, runs an inline FOUC-prevention theme bootstrap checking `washdoor_theme_manual` and `washdoor_theme` in `localStorage` before paint, and mounts `/src/main.tsx` into `#root`.
- **`src/main.tsx`**: Wraps `<App />` in a typed `ErrorBoundary` and `LanguageProvider`; imports global stylesheets `styles/theme.css` and `styles/washdoor.css`.
- **`tsconfig.json`**: Targets `ES2022` with `jsx: "react-jsx"`, `strict: true`, `allowJs: true`, `noEmit: true`, scoped to `include: ["src"]`.
- **`vite.config.ts`**: Configures `@vitejs/plugin-react`, defines `REACT_APP_SUPABASE_*` env mappings, runs dev server on `port: 3000`, and splits vendor chunks into `vendor` (`react`, `react-dom`) and `supabase` (`@supabase/supabase-js`).

### Source File Inventory (`washdoor/src/`)
- **79 total files**: `24 .jsx`, `28 .js`, `5 .tsx`, `6 .ts`, `14 .css`, `2 .json`.
- **Duplicate JS/TS migration pairs** present in the codebase:
  - `ClothIllustration.jsx` / `ClothIllustration.tsx`
  - `CustomerSearchPanel.jsx` / `CustomerSearchPanel.tsx`
  - `ThermalReceiptModal.jsx` / `ThermalReceiptModal.tsx`
  - `LanguageContext` (`.js` / `.ts` pair)
  - `validation` (`.js` / `.ts` pair)

---

## 2. Application Shell & Global UX (`src/App.jsx`)

`App.jsx` (1,254 lines) acts as the top-level shell orchestrating navigation, global shortcuts, localization, theming, live sync status, and top-level order modals.

### Primary Navigation Modules (`NAV_ITEMS` — 7 Views)
1. `dashboard` — Executive KPI overview & revenue pipeline
2. `order` — Orders Register & Counter POS intake (`POSModule.jsx`)
3. `customer` — Customer Master directory & profiles (`CustomerManagement.jsx`)
4. `report` — Reports & Audit Download Center (`ReportsModule.jsx`)
5. `apps` — Connected Apps configuration (hosted in `SettingsModule.jsx`)
6. `account` — Store Settings & Account (`SettingsModule.jsx`)
7. `audit` — System & Order Audit Trail (`AuditLogModule.jsx`)

### Shell Features & Global Controls
- **Responsive Navigation:** Collapsible desktop sidebar and a `280px` slide-out mobile drawer at viewport widths `<= 768px`.
- **Keyboard Shortcuts:**
  - `Ctrl+K`: Focuses/opens Global Search across orders and customers.
  - `N`: Opens `CreateOrderModal` from anywhere outside active text inputs.
- **Theme Switcher:** Toggles Light/Dark themes persisted via `washdoor_theme` / `washdoor_theme_manual`.
- **Supabase Indicator:** Displays a live `Supabase Live` status pill in the topbar.
- **Currency Selector (`SAMPLE_CURRENCIES` — 8 Regions):** `INR`, `USD`, `AE/AED`, `UK/GBP`, `EU/EUR`, `SG/SGD`, `CA/CAD`, `AU/AUD`.
- **Language Selector (`SAMPLE_LANGUAGES` — 9 Languages):** `en` (English), `ta` (Tamil), `hi` (Hindi), `te` (Telugu), `kn` (Kannada), `ml` (Malayalam), `ar` (Arabic, with RTL layout support), `fr` (French), `es` (Spanish), defined in `src/i18n/translations.js`.
- **Global Modals:** Mounts `CreateOrderModal` and `EditOrderModal` at the shell level so order creation and editing can be triggered from any view.

---

## 3. UI Modules & Component Architecture

### 3.1 Dashboard (`src/components/DashboardModule.jsx`, 657 lines)
Organizes store health into four core visual sections:
1. **Welcome Banner:** Contextual store summary header.
2. **5 KPI Cards:** Today's Revenue, Orders Today, Collected Today, Outstanding Balance, Ready for Pickup.
3. **Order Pipeline:** Live stage breakdown across `Received`, `In Progress`, `Ready`, and `Delivered`.
4. **Charts:** Revenue Trend (Last 7 Days — Booked vs. Collected) and Payment Mix Donut Chart.

### 3.2 Orders & POS Register (`src/components/POSModule.jsx`, 6,035 lines)
Core operational workspace supporting two primary workflows plus integrated drawers/modals:

- **Orders List Register:**
  - Search bar, date range filter, order status pills, and service filter.
  - 17-column configurable table via `src/config/orderColumnsConfig.js` (9 default + 8 optional columns; `order_id`, `customer`, and `actions` are fixed required columns).
  - Multi-format exports (Excel, PDF, CSV) and configurable pagination (`5`, `10`, `20`, `50`, `All`).
  - Inline Edit Accordion featuring 6 tabs, integrated Garment Cart, and `GarmentInspectionSection`.
- **Counter Intake Register (3-Column POS Layout):**
  - **Left Column:** Garment/service catalog selector.
  - **Center Column:** Active garment cart, GST calculations, and care notes.
  - **Right Column:** Customer lookup (`CustomerSearchPanel`), walk-in quick creation, service mode (Store / On-Call / Pickup & Delivery), payment mode, and hold/park support.
- **POS Sub-Modals & Portals:**
  - `ScheduleDeliveryModal` (126 lines) — Pickup/delivery date & time slot scheduling.
  - `DriverAssignModal` (113 lines) — Pickup/delivery rider assignment.
  - `SideEditPanel` (1,811 lines) — Slide-over full order editor.
  - `ViewOrderModal` (581 lines) — Read-only inspection and itemized breakdown modal.
  - `ThermalReceiptModal` (289 lines `.jsx` / 296 lines `.tsx`) — 80mm thermal receipt print preview.
  - `ServicesPopoverPortal` — Floating service quick-selector portal.

### 3.3 Order Creation, Review & Inspection Components
| Component | Lines | Role in Workflow |
| :--- | :--- | :--- |
| `CreateOrderModal.jsx` | 215 | Modal shell coordinating customer selection, cart, and order creation |
| `EditOrderModal.jsx` | 808 | Standalone modal for editing order metadata, garments, payments, and riders |
| `ClothSelectionCart.jsx` | 523 | Interactive garment catalog, quantity steppers, service types, and line pricing |
| `GarmentInspectionSection.jsx` | 1,000 | Per-garment condition checklist, fabric notes, tags, and Supabase photo upload |
| `OrderReviewCard.jsx` | 432 | Pre-submission order summary, advance payment entry, and breakdown card |
| `OrdersTable.jsx` | 109 | Tabular order list renderer consuming `orderColumnsConfig` |
| `ClothIllustration.jsx` / `.tsx` | 280 / 257 | Vector garment illustrations |
| `NoOrdersGraphic.jsx` | 275 | Empty-state SVG illustration when zero orders match filters |

### 3.4 Customer Management (`src/components/CustomerManagement.jsx`, 1,296 lines & `CustomerForm.jsx`, 1,387 lines)
- **Customer Master Directory:** Searchable, paginated customer list with one-click clipboard copy for phone/ID details.
- **Expandable Bento Profile Cards:** Displays contact info, DOB/age calculation, communication preference & DND flag, commercial profile (GST number, credit limit, discount tier), primary + additional delivery addresses, and garment/care preferences & notes.
- **CRUD Modals:** Register Customer, Edit Customer, and Delete confirmation modals backed by `customerService.js` and `CustomerForm.jsx`.
- **Quick Lookup (`CustomerSearchPanel.jsx` / `.tsx`):** Reusable typeahead search component shared across POS intake and order modals.

### 3.5 Reports & Audit Center
- **Reports Module (`src/components/ReportsModule.jsx`, 1,021 lines):**
  - Switches between `reports` and `audit` views.
  - Filters by date preset (`today`, `7d`, `30d`, `month`, `all`), service type, order status, and payment status.
  - Generates downloadable spreadsheets and PDFs via `exportService.js`.
- **Audit Log Module (`src/components/AuditLogModule.jsx`, 582 lines):**
  - Displays 4 summary KPI cards and 6 category filter pills (`all`, `export`, `lifecycle`, `driver`, `payment`, `system`).
  - Supports text search, chronological sort toggle, and Excel/PDF/CSV export.
  - Merges entries from `getSupabaseAuditLogs()`, `getStoredAuditLogs()` (`washdoor_audit_trail_v1` via `auditService.js`), and live `orders` props.

### 3.6 Settings & Notification Templates (`src/components/SettingsModule.jsx`, 2,177 lines)
Covers store configuration across modular sections:
- Business Profile (logo upload & store map location)
- Tax & Currency Settings
- Bank & Payment Methods
- Operations & Thermal Receipt Settings
- Notifications (`TemplateManagementSection.jsx`, 1,519 lines + `notificationTemplateService.js`): manages **18 templates** (6 categories x 3 channels: SMS, WhatsApp, Email) with **14 dynamic template variables**
- Language & Regional Settings
- Connected Apps Configuration Modal, Help/Support, Account Details, and Sign Out

---

## 4. Styling Architecture (`washdoor/src/styles/`)

The UI uses modular, component-scoped CSS stylesheets paired with global design tokens (14 CSS files total):
- **Global & Tokens:** `theme.css` (Light/Dark CSS variables), `washdoor.css` (layout primitives, typography, buttons, badges)
- **Module & Component Stylesheets:** `Dashboard.css`, `POSModule.css`, `CreateOrderModal.css`, `EditOrderModal.css`, `SideEditPanel.css`, `ViewOrderModal.css`, `ClothSelectionCart.css`, `GarmentInspection.css`, `ReportsModule.css`, `AuditLog.css`, `Settings.css`, `TemplateManagement.css`

---

## 5. Configuration, State, Services & Testing

### Configuration & Persistence Keys
- **`src/config/orderColumnsConfig.js`**: Defines 17 table columns (`9` default visible + `8` optional toggleable; `order_id`, `customer`, `actions` locked).
- **Primary `localStorage` Keys:**
  - `washdoor_theme`, `washdoor_theme_manual` — Theme mode persistence
  - `washdoor_audit_trail_v1` — Local audit trail cache synced alongside Supabase audit logs
- **Services Layer (`src/services/`):** Integrates Supabase CRUD & Storage uploads (`customerService.js`, order/garment photo services), audit logging (`auditService.js`), multi-format reporting (`exportService.js`), and notification templates (`notificationTemplateService.js`).

### NPM Scripts & Verification
| Command | Action | Observed Baseline |
| :--- | :--- | :--- |
| `npm run dev` / `npm start` | Starts Vite dev server (`port: 3000`) | Hot module reload enabled |
| `npm run typecheck` | Runs `tsc --noEmit` | Enforces strict TypeScript check |
| `npm run build` | Runs `tsc --noEmit && vite build` | **Passing** (`502` modules bundled cleanly) |
| `npm test` | Runs `node --test src/__tests__/*.node.test.js` | `95/96` passing (1 pre-existing CSS regex check in `sideEditPanelLayout.node.test.js`) |
