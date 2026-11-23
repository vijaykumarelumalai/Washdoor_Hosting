# Orders v2 Architecture – Data Flow & Integration Pipeline

This document details the end-to-end data flow in **Orders v2** across the Frontend UI components, the Service/API layer, and the Supabase PostgreSQL database tables. It covers all lifecycle operations including order creation, querying, normalization, inline editing, dynamic service synchronization, photo uploads, and cascading deletion.

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    subgraph UI["1. Frontend Presentation Layer"]
        A1["OrdersV2.jsx<br/>(Shell & Filters)"]
        A2["OrdersV2CreateOrder.jsx<br/>(2-Step Wizard)"]
        A3["OrdersV2List.jsx<br/>(Table & 7-Tab Stepper)"]
        A4["OrdersV2EditDrawer.jsx<br/>(Slide-over Edit)"]
        A5["GarmentInspectionSection.jsx<br/>(Inspection & Photos)"]
    end

    subgraph Service["2. Service & API Layer"]
        B1["customerService.js<br/>(Orders & Customers API)"]
        B2["serviceTypeService.js<br/>(Service Master API)"]
        B3["normalizeOrder.ts<br/>(Data Normalizer)"]
        B4["onCallScheduling.js<br/>(Schedule Validator)"]
        B5["supabaseClient.js<br/>(Supabase JS Client)"]
    end

    subgraph DB["3. Supabase Database & Storage"]
        C1[("public.customer_works<br/>(Primary Orders Table)")]
        C2[("public.customers<br/>(Customer Directory)")]
        C3[("public.washdoor_order_items<br/>(Line Items)")]
        C4[("public.washdoor_service_types<br/>(Service Master)")]
        C5[("public.washdoor_garment_cards<br/>& inspections")]
        C6[("storage.objects<br/>(washdoor-garment-photos)")]
        C7[("public.washdoor_status_history<br/>& audit_logs")]
        C8[("public.washdoor_payment_ledger<br/>(Financial Records)")]
    end

    A2 -->|Form State & Cart| B1
    A1 -->|Fetch & Filter| B1
    A3 -->|Inline Edits| B1
    A4 -->|Quick Edits| B1
    A3 -->|Dynamic Services| B2
    A5 -->|Garment Photos| B1
    
    B1 -->|Normalize Rows| B3
    B1 -->|Validate Schedules| B4
    B1 & B2 -->|Supabase Queries| B5

    B5 --> C1
    B5 --> C2
    B5 --> C3
    B5 --> C4
    B5 --> C5
    B5 --> C6
    B5 --> C7
    B5 --> C8
```

---

## 2. Order Intake & Creation Pipeline (Step 1 & Step 2)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Counter Operator
    participant UI as OrdersV2CreateOrder.jsx
    participant Val as onCallScheduling.js / validation.js
    participant Calc as businessRules.js (calculateOrderTotals)
    participant API as customerService.js (createOrderWithCustomer)
    participant DB as Supabase PostgreSQL
    participant Parent as OrdersV2.jsx

    Staff->>UI: Fills Step 1 (Customer, Order Type, Schedule, Staff)
    UI->>Val: validateCustomer() & validateOnCallSchedule()
    Val-->>UI: Validation Results (valid / field errors)
    Staff->>UI: Proceeds to Step 2 & selects garments from catalog
    UI->>Calc: calculateOrderTotals(cart, 5% GST, taxExemption)
    Calc-->>UI: Totals (Subtotal, Discount, Tax, Grand Total)
    Staff->>UI: Clicks "Save Order"
    UI->>API: createOrderWithCustomer(payload)
    
    rect rgb(240, 248, 255)
        Note over API,DB: Supabase Transaction Sequence
        API->>DB: If New Customer: INSERT INTO public.customers RETURNING customer_code
        API->>DB: SELECT get_next_order_number() / nextval('customer_work_seq')
        API->>DB: INSERT INTO public.customer_works (Order & Financial Details)
        API->>DB: INSERT INTO public.washdoor_order_items (Line Items Array)
        opt If On-Call Order
            API->>DB: INSERT INTO public.washdoor_pickup_delivery_schedules
        end
        opt If Advance Paid > 0
            API->>DB: INSERT INTO public.washdoor_payment_ledger
        end
        API->>DB: INSERT INTO public.washdoor_status_history ('Order Received')
        API->>DB: INSERT INTO public.washdoor_audit_logs ('INSERT')
    end
    
    DB-->>API: Returns created order record (ORD0000X)
    API-->>UI: { data: orderPayload, error: null }
    UI->>Parent: onOrderSuccess(createdOrderPayload)
    UI->>Staff: Displays Success Toast ("Order ORD0000X created!")
    Parent->>API: onRefreshOrders() -> reload table
```

### Detailed Execution Steps:
1. **Intake Data Gathering (`OrdersV2CreateOrder.jsx`)**: Collects customer selection/mode, order type, scheduled dates/times, attend staff name/ID, pickup driver name/ID, garment cart items, care notes, discount %, tax exemption flag, and advance payment.
2. **Client Validation**:
   - `validateCustomer()` verifies mobile format (`/^[6-9]\d{9}$/`) and required customer name.
   - `validateOnCallSchedule()` ensures pickup is not in the past and delivery is strictly after pickup.
3. **Financial Calculations (`calculateOrderTotals`)**: Computes subtotal, applies discount percentage, computes taxable base, calculates 5% GST (unless tax-exempt), and produces the grand total.
4. **API Invocation (`customerService.createOrderWithCustomer`)**:
   - If a new customer was entered, registers them into `public.customers` and captures the generated customer code.
   - Invokes `get_next_order_number()` to obtain the next sequential order number (`ORD0000X`).
   - Inserts order into `public.customer_works`.
   - Inserts each garment item into `public.washdoor_order_items` with a foreign key back to `work_id`.
   - If On-Call, creates a schedule slot in `public.washdoor_pickup_delivery_schedules`.
   - If advance payment was made, creates an entry in `public.washdoor_payment_ledger`.
   - Appends an immutable lifecycle log in `public.washdoor_status_history` and `public.washdoor_audit_logs`.
5. **Callback & Refresh**: Dispatches `onOrderSuccess`, closes the dialog, displays toast feedback, and triggers `onRefreshOrders()` to reload the live dataset.

---

## 3. Order Query, Normalization & Filtering Pipeline

```mermaid
flowchart LR
    A[("Supabase<br/>customer_works")] -->|getOrders()| B["customerService.js<br/>mapCustomerWorkRow()"]
    B --> C["normalizeOrder.ts<br/>normalizeOrder()"]
    C --> D["OrdersV2List.jsx<br/>restoreOrderPricing()"]
    D --> E["orderStatus.ts<br/>normalizeOrdersV2Status()"]
    E --> F["Filter Engine<br/>(Search, Status, Service, Date)"]
    F --> G["useOrdersPagination.ts<br/>(5, 10, 20, 50, All)"]
    G --> H["Render Table &<br/>4 KPI Summary Cards"]
```

### Detailed Execution Steps:
1. **Query Execution (`getOrders` in `customerService.js`)**:
   - Executes `SELECT * FROM public.customer_works ORDER BY intake_date DESC`.
   - If `customer_works` is unavailable, gracefully falls back to `public.washdoor_orders_master`.
2. **Row Mapping (`mapCustomerWorkRow`)**: Formats DB column names into unified frontend properties (`work_number` -> `order_number`, `work_status` -> `order_status`, `advance_paid` -> `advance_paid`).
3. **Data Normalization (`normalizeOrder.ts`)**:
   - Defensively parses each order object.
   - Coerces missing or `null` values: numbers default to `0`, strings default to `''`.
   - Normalizes customer object, contact details, and items array.
4. **Pricing Restoration (`restoreOrderPricing` in `OrdersV2List.jsx`)**: Ensures item unit prices, quantities, and line amounts match the raw database records without distortion.
5. **Canonical Status Mapping (`normalizeOrderStatus` in `orderStatus.ts`)**: Maps legacy and raw status strings to the 5 canonical UI states:
   - `Order Received`
   - `In Progress`
   - `Ready`
   - `Delivered`
   - `Cancelled`
6. **Multi-Stage Filter Pipeline**:
   - **Status Filter**: Matches against canonical status pills (`All`, `Order Received`, etc.).
   - **Service Filter**: Matches against dynamic keys from `washdoor_service_types`.
   - **Time Range Filter**: Evaluates timestamp against `Today`, `This Week`, `This Month`, or `All Time`.
   - **Search Filter**: Case-insensitive substring match across Order ID, Customer Name, Mobile Number, and Address.
7. **Pagination Slice (`useOrdersPagination.ts`)**: Slices the filtered array into active pages based on `pageSize` (`5`, `10`, `20`, `50`, or `All`).

---

## 4. 7-Tab Horizontal Stepper Inline Edit & Update Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Counter Operator
    participant List as OrdersV2List.jsx (Inline Stepper)
    participant Svc as customerService.js (updateOrderInSupabase)
    participant DB as Supabase PostgreSQL
    participant Parent as OrdersV2.jsx

    Staff->>List: Expands order row & selects tab (1-7)
    Staff->>List: Edits Customer, Garments, Inspections, or Billing
    Staff->>List: Clicks "Save Changes"
    List->>Svc: updateOrderInSupabase(orderNumber, updatedPayload)
    
    rect rgb(255, 250, 240)
        Note over Svc,DB: Database Update Operations
        Svc->>DB: UPDATE public.customer_works SET customer_name, mobile_number, address, items, subtotal, tax_amount, total_amount, advance_paid, work_status WHERE work_number = ...
        Svc->>DB: DELETE FROM public.washdoor_order_items WHERE work_id = ...
        Svc->>DB: INSERT INTO public.washdoor_order_items (Updated Line Items)
        opt If Garment Inspection Updated
            Svc->>DB: UPSERT INTO public.washdoor_garment_cards
            Svc->>DB: UPSERT INTO public.washdoor_garment_inspections
        end
        Svc->>DB: INSERT INTO public.washdoor_status_history (New Status & Timestamp)
        Svc->>DB: INSERT INTO public.washdoor_audit_logs ('UPDATE')
    end
    
    DB-->>Svc: Success acknowledgment
    Svc-->>List: { success: true }
    List->>Parent: onUpdateOrder(updated)
    List->>Parent: onRefreshOrders()
    List->>Staff: Displays Success Snackbar ("Order updated successfully")
```

### Detailed Execution Steps:
1. **User Edit**: The operator makes updates across any of the 7 tabs:
   - Tab 1: Updates customer name, phone, or delivery address.
   - Tab 2: Adds/removes garments, changes services, adjusts rates/quantities.
   - Tab 3: Logs garment defects, stains, fabric make, or finish preferences.
   - Tab 4: Changes laundry processing stage or rack location.
   - Tab 5: Records payments, adjusts discounts, or changes payment modes.
2. **Save Request (`updateOrderInSupabase`)**: Dispatches the modified payload to `customerService.js`.
3. **Database Mutation**:
   - Executes an `UPDATE` on `public.customer_works` matching by `work_number` or `work_id`.
   - Re-synchronizes `public.washdoor_order_items` to reflect updated garment quantities and amounts.
   - If garment inspection cards exist, upserts records in `public.washdoor_garment_cards` and `public.washdoor_garment_inspections`.
   - Records audit entries in `public.washdoor_status_history` and `public.washdoor_audit_logs`.
4. **UI Synchronization**: Triggers `onUpdateOrder`, collapses/maintains row state, displays a success snackbar, and refreshes the order table.

---

## 5. Dynamic Service Types Synchronization Data Flow

Orders v2 allows operators to create new service categories on-the-fly from the Order Details tab. The application synchronizes dynamic services using Supabase database triggers and browser CustomEvents:

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Counter Operator
    participant UI as ServiceTypeSelect.jsx / OrdersV2List.jsx
    participant Svc as serviceTypeService.js
    participant DB as Supabase (washdoor_service_types)
    participant Win as DOM Window Event Bus
    participant Main as OrdersV2.jsx

    Staff->>UI: Types "Shoe Polishing" & clicks "+ Add New Service Type"
    UI->>Svc: createServiceType("Shoe Polishing", "shoe")
    Svc->>DB: INSERT INTO public.washdoor_service_types (service_name, icon_type)
    DB-->>Svc: Returns new row { id, service_name, icon_type }
    Svc->>Win: dispatchEvent(new CustomEvent('washdoor_service_types_updated'))
    Win->>Main: Event Listener catches 'washdoor_service_types_updated'
    Main->>Svc: fetchServiceTypes()
    Svc->>DB: SELECT * FROM public.washdoor_service_types WHERE is_active = true
    DB-->>Svc: Active service types list
    Svc-->>Main: Returns deduped service types
    Main->>Main: Updates toolbar Service Category dropdown & table badges
    Main->>Staff: Instant UI refresh without page reload
```

---

## 6. Garment Inspection & Photo Upload Data Flow

When taking photos of damaged garments or stubborn stains in Tab 3 (Garment Inspection):

```mermaid
sequenceDiagram
    autonumber
    actor Staff as QC Inspector
    participant Comp as GarmentInspectionSection.jsx
    participant Svc as customerService.js (uploadGarmentPhotos)
    participant Storage as Supabase Storage (washdoor-garment-photos)
    participant DB as Supabase (washdoor_garment_photos)

    Staff->>Comp: Uploads garment defect photo (JPEG/PNG)
    Comp->>Svc: uploadGarmentPhotos(workId, workNumber, cardId, photos)
    Svc->>Storage: upload(`orders/${workNumber}/${file_name}`, blob)
    Storage-->>Svc: Returns public URL / storage path
    Svc->>DB: INSERT INTO public.washdoor_garment_photos (photo_type, storage_path, photo_url, caption)
    DB-->>Svc: Returns photo record
    Svc-->>Comp: Resolves uploaded photo metadata
    Comp->>Staff: Displays photo thumbnail with customer visibility badge
```

---

## 7. Order Deletion Data Flow

When an operator clicks the Delete icon in the Actions column:
1. **User Confirmation**: Displays browser confirmation dialog: `"Are you sure you want to delete this order?"`.
2. **API Execution (`deleteOrderFromSupabase`)**: Calls `customerService.js` with order ID/work number.
3. **Database Cascade**:
   - `DELETE FROM public.customer_works WHERE work_id = ... OR work_number = ...`.
   - PostgreSQL `ON DELETE CASCADE` foreign keys automatically delete associated records in `washdoor_order_items`, `washdoor_garment_cards`, `washdoor_garment_inspections`, `washdoor_pickup_delivery_schedules`, and `washdoor_payment_ledger`.
4. **Audit Logging**: Appends a `DELETE` operation entry to `public.washdoor_audit_logs`.
5. **State Update**: Calls `onDeleteOrder(id)`, displays `"Order deleted successfully"` snackbar, and calls `onRefreshOrders()` to update table counts and KPI cards.
