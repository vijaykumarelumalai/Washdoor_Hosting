# Orders v2 Database Architecture – Supabase Schema Reference

This document provides a comprehensive technical reference for the Supabase PostgreSQL database architecture powering **Orders v2** in the Washdoor POS & Customer Management System. It details all tables, columns, data types, primary keys, foreign keys, constraints, default values, sequences, RPC functions, indexes, and recent schema migrations.

---

## 1. Entity-Relationship Overview

```
                          ┌──────────────────────────┐
                          │    public.customers      │
                          │──────────────────────────│
                          │ PK: id (BIGINT)          │
                          │ UK: customer_code (CUS..)│
                          │ UK: mobile_number        │
                          └─────────────┬────────────┘
                                        │ 1:N
                                        ▼
┌───────────────────────────────┬───────────────────────────────┐
│ public.washdoor_staff_master  │    public.customer_works      │ ◄─── public.washdoor_pickup_delivery_master
│───────────────────────────────│───────────────────────────────│     ───────────────────────────────────────
│ PK: id (UUID)                 │ PK: work_id (UUID)            │     PK: id (UUID)
│ UK: staff_id (STF...)         │ UK: work_number (ORD...)      │     UK: employee_id (PUD...)
└───────────────┬───────────────┤ FK: customer_id               ├──────────────────┬─────────────────┘
                │               │ FK: attend_staff_id           │                  │
                └──────────────►│ FK: assigned_pickup_person_id │◄─────────────────┘
                                └───────────────┬───────────────┘
                                                │
       ┌────────────────────────┬───────────────┼────────────────┬──────────────────────┐
       │ 1:N                    │ 1:N           │ 1:N            │ 1:N                  │ 1:N
       ▼                        ▼               ▼                ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  ┌────────────────┐  ┌──────────────────────┐
│  washdoor_order_ │  │ washdoor_garment_│  │  washdoor_  │  │  washdoor_     │  │  washdoor_pickup_    │
│      items       │  │      cards       │  │   status_   │  │ payment_ledger │  │  delivery_schedules  │
│──────────────────│  │──────────────────│  │   history   │  │────────────────│  │──────────────────────│
│ PK: item_id      │  │ PK: card_id      │  │ PK: history_│  │ PK: ledger_id  │  │ PK: schedule_id      │
│ FK: work_id      │  │ FK: work_id      │  │     id      │  │ FK: work_id    │  │ FK: work_id          │
└──────────────────┘  └────────┬─────────┘  │ FK: work_id │  └────────────────┘  └──────────────────────┘
                               │            └─────────────┘
                               │ 1:N
                               ▼
                      ┌──────────────────┐
                      │ washdoor_garment_│
                      │   inspections    │
                      │──────────────────│
                      │ PK: inspection_id│
                      │ FK: card_id      │
                      │ FK: work_id      │
                      └────────┬─────────┘
                               │ 1:N
                               ▼
                      ┌──────────────────┐
                      │ washdoor_garment_│
                      │     photos       │
                      │──────────────────│
                      │ PK: photo_id     │
                      │ FK: card_id      │
                      │ FK: work_id      │
                      └──────────────────┘
```

---

## 2. Table Specifications

### 2.1 `public.customer_works` (Primary Service Orders Table)
The primary transactional table for laundry intake, processing, and delivery in Orders v2.

| Column Name | Data Type | Nullable | Default Value | Constraints & References | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `work_id` | `UUID` | No | `gen_random_uuid()` | **Primary Key** | Unique internal order identifier |
| `work_number` | `VARCHAR(30)` | No | `generate_customer_work_number()` | **Unique** | Formatted business identifier (`ORD00001`) |
| `customer_id` | `VARCHAR(50)` | No | — | Reference to `customers.customer_code` | Customer code or identifier |
| `customer_name` | `VARCHAR(150)` | No | — | — | Customer display name |
| `mobile_number` | `VARCHAR(15)` | No | — | — | 10-digit primary contact number |
| `alternate_phone`| `VARCHAR(15)` | Yes | `NULL` | — | Secondary contact number |
| `email` | `VARCHAR(255)` | Yes | `NULL` | — | Customer email address |
| `delivery_address`| `TEXT` | Yes | `NULL` | — | Full delivery street address |
| `service_type` | `VARCHAR(60)` | No | `'Wash & Steam Press'` | — | Primary allocated service |
| `work_status` | `VARCHAR(40)` | No | `'Received'` | `CHECK (work_status IN ('Received', 'In Progress', 'Washing', 'Steam Pressing', 'Dry Cleaning', 'Quality Check', 'Ready', 'Ready for Delivery', 'Delivered', 'Cancelled'))` | Operational stage |
| `priority` | `VARCHAR(20)` | No | `'Normal'` | `CHECK (priority IN ('Normal', 'Express', 'Urgent', 'Express 24H', 'Yes', 'No'))` | Priority tag |
| `intake_method` | `VARCHAR(30)` | No | `'Walk-In'` | `CHECK (intake_method IN ('Walk-In', 'On-Call', 'Pickup & Delivery', 'walk-in', 'on-call'))` | Order channel |
| `items` | `JSONB` | No | `'[]'::jsonb` | — | Array of line item objects |
| `total_pieces` | `INTEGER` | No | `1` | `CHECK (total_pieces >= 0)` | Total garment quantity |
| `weight_kg` | `NUMERIC(6,2)` | Yes | `NULL` | `CHECK (weight_kg IS NULL OR weight_kg >= 0)` | Total laundry weight |
| `special_instructions`| `TEXT` | Yes | `NULL` | — | Customer handling requests |
| `rack_shelf_location` | `VARCHAR(50)` | Yes | `NULL` | — | Shop rack tag location (e.g. `Rack B-14`) |
| `subtotal` | `NUMERIC(10,2)`| No | `0.00` | `CHECK (subtotal >= 0)` | Net items total before tax & discounts |
| `discount_pct` | `NUMERIC(5,2)` | No | `0.00` | `CHECK (discount_pct >= 0 AND discount_pct <= 100)` | Discount percentage applied |
| `discount_amount`| `NUMERIC(10,2)`| No | `0.00` | `CHECK (discount_amount >= 0)` | Deducted discount amount |
| `taxable_amount`| `NUMERIC(10,2)`| No | `0.00` | `CHECK (taxable_amount >= 0)` | Subtotal minus discount |
| `tax_exemption` | `BOOLEAN` | No | `FALSE` | — | Flag to exempt order from GST |
| `gst_percentage`| `NUMERIC(5,2)` | No | `5.00` | — | Applicable GST rate (5%) |
| `tax_amount` | `NUMERIC(10,2)`| No | `0.00` | `CHECK (tax_amount >= 0)` | Total calculated GST |
| `cgst_amount` | `NUMERIC(10,2)`| No | `0.00` | — | Central GST (2.5%) |
| `sgst_amount` | `NUMERIC(10,2)`| No | `0.00` | — | State GST (2.5%) |
| `igst_amount` | `NUMERIC(10,2)`| No | `0.00` | — | Integrated GST |
| `total_amount` | `NUMERIC(10,2)`| No | `0.00` | `CHECK (total_amount >= 0)` | Final grand total payable |
| `advance_paid` | `NUMERIC(10,2)`| No | `0.00` | `CHECK (advance_paid >= 0)` | Advance payment collected at intake |
| `balance_due` | `NUMERIC(10,2)`| No | **STORED GENERATED** | `ALWAYS AS (GREATEST(0.00, total_amount - advance_paid)) STORED` | Outstanding balance |
| `refund_amount` | `NUMERIC(10,2)`| No | `0.00` | — | Total refunded amount |
| `payment_status`| `VARCHAR(30)` | No | `'Unpaid'` | `CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid', 'Refunded'))` | Settlement status |
| `payment_method`| `VARCHAR(30)` | Yes | `'Cash'` | `CHECK (payment_method IN ('Cash', 'UPI / QR', 'Card', 'Wallet', 'Net Banking', 'PaymentLink'))` | Intake payment mode |
| `invoice_number`| `VARCHAR(40)` | Yes | `NULL` | — | Formatted GST tax invoice number |
| `invoice_date` | `TIMESTAMPTZ` | Yes | `NULL` | — | Tax invoice generation timestamp |
| `handling_flags`| `JSONB` | No | `'{}'::jsonb` | — | Flags (delicate, bleach, stain risk) |
| `intake_date` | `TIMESTAMPTZ` | No | `now()` | — | Order entry timestamp |
| `target_delivery_date` | `TIMESTAMPTZ` | Yes | `NULL` | — | Promised delivery date |
| `completed_at` | `TIMESTAMPTZ` | Yes | `NULL` | — | Completion timestamp |
| `delivered_at` | `TIMESTAMPTZ` | Yes | `NULL` | — | Final customer delivery timestamp |
| `attend_staff_id`| `VARCHAR(30)` | Yes | `NULL` | FK reference to `washdoor_staff_master(staff_id)` | Intake staff unique ID |
| `attend_staff_name`| `VARCHAR(120)` | Yes | `NULL` | — | Intake staff name (`Sakthi`, `Balaji`) |
| `assigned_pickup_person_id`| `VARCHAR(30)` | Yes | `NULL` | FK reference to `washdoor_pickup_delivery_master(employee_id)` | Pickup driver ID |
| `assigned_pickup_delivery_person`| `VARCHAR(120)`| Yes | `NULL` | — | Pickup/Delivery driver name (`Ramesh`) |
| `assigned_staff`| `VARCHAR(100)` | Yes | `NULL` | — | Assigned processing operator |
| `assigned_driver`| `VARCHAR(100)` | Yes | `NULL` | — | Delivery driver name |
| `internal_notes`| `TEXT` | Yes | `NULL` | — | Internal staff notes |
| `staff_notes` | `TEXT` | Yes | `NULL` | — | Logistics / counter instructions |
| `created_by` | `UUID` | Yes | `NULL` | References `auth.users(id)` | Creator user ID |
| `updated_by` | `UUID` | Yes | `NULL` | References `auth.users(id)` | Last updater user ID |
| `created_by_name`| `VARCHAR(100)`| Yes | `'POS Counter'` | — | Operator name who created record |
| `updated_by_name`| `VARCHAR(100)`| Yes | `'POS Counter'` | — | Operator name who updated record |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | — | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated via trigger | Record modification timestamp |

---

### 2.2 `public.customers` (Customer Master Directory)
Stores permanent customer profiles, contact info, pricing tiers, and credit controls.

| Column Name | Data Type | Nullable | Constraints & Details |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | No | **Primary Key** (`GENERATED ALWAYS AS IDENTITY`) |
| `customer_code` | `VARCHAR(30)` | No | **Unique**, default `generate_customer_number()` (`CUS00001`) |
| `customer_name` | `VARCHAR(150)`| No | `CHECK (char_length(trim(customer_name)) >= 1)` |
| `mobile_number` | `VARCHAR(15)` | No | **Unique**, `CHECK (mobile_number ~ '^(\+91)?[6-9][0-9]{9}$')` |
| `alternate_phone`| `VARCHAR(15)` | Yes | `CHECK (alternate_phone IS NULL OR alternate_phone ~ '^(\+91)?[6-9][0-9]{9}$')` |
| `email` | `VARCHAR(255)`| Yes | Valid email format check |
| `address` | `TEXT` | Yes | Primary delivery address |
| `city` | `VARCHAR(100)`| Yes | Default `'Vellore'` |
| `state` | `VARCHAR(100)`| Yes | Default `'Tamil Nadu'` |
| `pincode` | `VARCHAR(6)` | Yes | `CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$')` |
| `date_of_birth` | `DATE` | Yes | Customer birth date |
| `anniversary_date`| `DATE` | Yes | Customer wedding anniversary date |
| `map_link` | `TEXT` | Yes | Google Maps navigation URL |
| `gst_number` | `VARCHAR(15)` | Yes | Customer GSTIN (for B2B billing) |
| `company_name` | `VARCHAR(150)`| Yes | Corporate account name |
| `tax_exemption` | `BOOLEAN` | No | Default `FALSE` |
| `customer_classification`| `VARCHAR(50)`| No | `CHECK (customer_classification IN ('Regular Customer', 'VIP Customer', 'Corporate / B2B', 'Student / Senior', 'regular', 'vip', 'fraud', 'corporate'))` |
| `customer_status` | `VARCHAR(30)`| No | `CHECK (customer_status IN ('Active', 'Inactive', 'Blacklisted', 'active', 'inactive', 'archived'))` |
| `price_list` | `VARCHAR(50)` | No | Default `'Standard'` |
| `service_zone` | `VARCHAR(50)` | Yes | Default `'Zone 1'` |
| `credit_limit` | `NUMERIC(10,2)`| No | Default `0.00`, `CHECK (credit_limit >= 0)` |
| `wallet_balance`| `NUMERIC(10,2)`| No | Default `0.00` |
| `default_discount`| `NUMERIC(5,2)` | Yes | Default `0.00`, `CHECK (default_discount >= 0 AND default_discount <= 100)` |
| `communication_pref`| `VARCHAR(30)`| Yes | `CHECK (communication_pref IN ('WhatsApp', 'SMS', 'Call', 'Email', 'whatsapp', 'sms', 'email', 'phone', 'none'))` |
| `preferred_language`| `VARCHAR(30)`| Yes | Default `'ta'` (Tamil), `'en'` (English) |
| `dnd` | `BOOLEAN` | No | Default `FALSE` |
| `internal_comments`| `TEXT` | Yes | Staff notes |
| `notes` | `TEXT` | Yes | Customer preference remarks |
| `created_by` / `updated_by`| `UUID` | Yes | FK `auth.users(id)` |
| `created_at` / `updated_at`| `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.3 `public.washdoor_staff_master` (Counter Staff Roster)
Stores active staff members authorized to perform order intake and counter operations.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `staff_id` | `VARCHAR(30)` | No | **Unique** (`STF001`, `STF002`) |
| `staff_name` | `VARCHAR(120)` | No | Staff member name |
| `zone` | `VARCHAR(100)` | No | Assigned store zone (`Zone A`, `Zone B`) |
| `city` | `VARCHAR(100)` | Yes | City location |
| `phone` | `VARCHAR(20)` | Yes | Mobile contact |
| `role` | `VARCHAR(60)` | Yes | Default `'Counter Staff'` |
| `status` | `VARCHAR(20)` | No | Default `'Active'`, `CHECK (status IN ('Active', 'Inactive'))` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `now()` |

---

### 2.4 `public.washdoor_pickup_delivery_master` (Drivers & Riders Roster)
Stores delivery personnel, vehicles, and assigned operational zones.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `employee_id` | `VARCHAR(30)` | No | **Unique** (`PUD001`, `PUD002`) |
| `employee_name` | `VARCHAR(120)` | No | Rider / driver name |
| `zone` | `VARCHAR(100)` | No | Assigned delivery zone |
| `city` | `VARCHAR(100)` | Yes | City location |
| `phone` | `VARCHAR(20)` | Yes | Mobile contact |
| `vehicle_info` | `VARCHAR(100)` | Yes | Vehicle model & registration number |
| `status` | `VARCHAR(20)` | No | Default `'Active'`, `CHECK (status IN ('Active', 'Inactive'))` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `now()` |

---

### 2.5 `public.washdoor_service_types` (Dynamic Service Categories Master)
Stores dynamic laundry service categories displayed in Orders v2 table filters, Step 2 garment intake, and the Order Details tab.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `service_name` | `VARCHAR(80)` | No | Unique service name (case-insensitive unique index on `lower(service_name)`) |
| `icon_type` | `VARCHAR(40)` | No | Default `'custom'` (`laundry`, `dry_cleaning`, `washing`, `shoe`, `iron`, `category`) |
| `is_default` | `BOOLEAN` | No | Default `FALSE` (True for 6 seeded services) |
| `is_active` | `BOOLEAN` | No | Default `TRUE` |
| `display_order`| `INTEGER` | No | Default `0` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `now()` |

**Built-in Seeded Services:**
1. `Laundry` (`icon_type`: `'laundry'`)
2. `Dry Cleaning` (`icon_type`: `'dry_cleaning'`)
3. `Washing` (`icon_type`: `'washing'`)
4. `Shoe Cleaning` (`icon_type`: `'shoe'`)
5. `Ironing Only` (`icon_type`: `'iron'`)
6. `Custom Category` (`icon_type`: `'category'`)

---

### 2.6 `public.washdoor_order_items` (Normalized Order Line Items)
Relational line items table normalized per order for granular reporting and indexing.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `item_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `order_number` | `VARCHAR(30)` | No | Order identifier (`ORD00001`) |
| `work_id` | `UUID` | Yes | **Foreign Key** references `customer_works(work_id)` ON DELETE CASCADE |
| `product_id` | `VARCHAR(80)` | Yes | Reference to product master |
| `product_name` | `VARCHAR(150)` | No | Garment title (`Shirt`, `Saree`, `Jeans`) |
| `service_type` | `VARCHAR(60)` | No | Default `'Ironing'` |
| `rate` | `NUMERIC(10,2)`| No | Default `0.00`, unit price |
| `quantity` | `INTEGER` | No | Default `1`, garment count |
| `line_amount` | `NUMERIC(10,2)`| No | Default `0.00`, `rate * quantity` |
| `care_instructions`| `TEXT` | Yes | Garment-specific handling notes |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.7 `public.washdoor_products` (Garment Catalog Master)
Stores product master catalog items and per-service rates.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `product_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `item_code` | `VARCHAR(40)` | No | **Unique** product code |
| `name` | `VARCHAR(150)` | No | Garment name |
| `category` | `VARCHAR(60)` | No | Primary category (`Men`, `Women`, `Home Linen`, `Accessories`) |
| `secondary_category`| `VARCHAR(60)`| Yes | Secondary grouping tag |
| `base_price` | `NUMERIC(10,2)`| No | Base unit price |
| `iron_price` | `NUMERIC(10,2)`| No | Pressing price |
| `wash_price` | `NUMERIC(10,2)`| No | Washing price |
| `dry_clean_price`| `NUMERIC(10,2)`| No | Dry cleaning price |
| `unit` | `VARCHAR(30)` | No | Default `'piece'` |
| `is_active` | `BOOLEAN` | No | Default `TRUE` |
| `display_order`| `INTEGER` | No | Default `99` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.8 `public.washdoor_garment_cards` (Garment Unit Tracking)
Tracks each physical garment unit individually through tagging and processing stages.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `card_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `work_id` | `UUID` | No | **Foreign Key** `customer_works(work_id)` ON DELETE CASCADE |
| `work_number` | `VARCHAR(30)` | No | Order identifier |
| `unit_index` | `INTEGER` | No | Sequential piece index within order (`1`, `2`, `3`...) |
| `garment_tag_number`| `VARCHAR(50)`| No | **Unique** barcode / RFID tag number |
| `garment_name` | `VARCHAR(100)` | No | Apparel name |
| `service_type` | `VARCHAR(60)` | No | Assigned service category |
| `color` | `VARCHAR(50)` | Yes | Garment color |
| `brand` | `VARCHAR(50)` | Yes | Brand label |
| `fabric_type` | `VARCHAR(50)` | Yes | Cotton, Silk, Wool, Denim, Linen, etc. |
| `make` | `VARCHAR(100)` | Yes | Readymade, Tailored, Boutique, Imported |
| `stains` | `TEXT` | Yes | Existing stains description |
| `damage` | `TEXT` | Yes | Existing fabric tear / damage description |
| `finish_preference`| `VARCHAR(50)`| Yes | Default `'Standard Fold'`, `'Hanger'` |
| `size` | `VARCHAR(30)` | Yes | Garment size |
| `assigned_staff`| `VARCHAR(100)` | Yes | Operator inspecting garment |
| `qc_passed` | `BOOLEAN` | No | Default `FALSE` |
| `customer_ack` | `BOOLEAN` | No | Default `FALSE` |
| `customer_ack_at`| `TIMESTAMPTZ` | Yes | Timestamp customer acknowledged defect |
| `processing_stage`| `VARCHAR(40)` | No | `CHECK (processing_stage IN ('Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'QC', 'Ready', 'Packed', 'Delivered'))` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.9 `public.washdoor_garment_inspections` (Defect & Stain Logs)
Logs specific defect findings, severity ratings, customer approvals, and spot treatment charges.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `inspection_id`| `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `card_id` | `UUID` | No | **Foreign Key** `washdoor_garment_cards(card_id)` ON DELETE CASCADE |
| `work_id` | `UUID` | No | **Foreign Key** `customer_works(work_id)` ON DELETE CASCADE |
| `category_id` | `UUID` | Yes | References `washdoor_inspection_categories(category_id)` |
| `category_name`| `VARCHAR(100)` | No | Stain, Damage, Color Bleed, etc. |
| `defect_location`| `VARCHAR(100)`| Yes | Collar, Cuff, Front Pocket, Hem |
| `severity` | `VARCHAR(15)` | No | Default `'Low'`, `CHECK (severity IN ('Low', 'Medium', 'High', 'Critical'))` |
| `action_plan` | `VARCHAR(50)` | No | Default `'Proceed'`, `CHECK (action_plan IN ('Proceed', 'Spot_Treat', 'Customer_Approval', 'Reject'))` |
| `extra_charge` | `NUMERIC(10,2)`| No | Default `0.00`, extra treatment fee |
| `customer_approval`| `VARCHAR(20)`| No | Default `'Not_Required'`, `CHECK (customer_approval IN ('Not_Required', 'Pending', 'Approved', 'Rejected'))` |
| `customer_notes`| `TEXT` | Yes | Customer instruction notes |
| `inspection_notes`| `TEXT` | Yes | QC inspector notes |
| `inspected_by` | `VARCHAR(100)` | No | Staff name |
| `inspected_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.10 `public.washdoor_garment_photos` (Inspection Photo Evidence)
Stores uploaded photographic proof of garment stains or pre-existing defects.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `photo_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `card_id` | `UUID` | Yes | References `washdoor_garment_cards(card_id)` ON DELETE CASCADE |
| `work_id` | `UUID` | No | References `customer_works(work_id)` ON DELETE CASCADE |
| `work_number` | `VARCHAR(30)` | Yes | Order identifier |
| `inspection_id`| `UUID` | Yes | References inspection record |
| `photo_type` | `VARCHAR(30)` | No | `CHECK (photo_type IN ('Before_Wash', 'Stain', 'Damage', 'After_Wash', 'After_Press', 'Packed', 'Delivery_Proof'))` |
| `storage_bucket`| `VARCHAR(100)`| Yes | Default `'washdoor-garment-photos'` |
| `storage_path` | `TEXT` | No | Supabase storage relative path |
| `photo_url` | `TEXT` | No | Publicly accessible photo URL |
| `caption` | `TEXT` | Yes | Photo description |
| `file_name` | `VARCHAR(255)` | Yes | Original file name |
| `file_size_kb` | `INTEGER` | Yes | File size |
| `mime_type` | `VARCHAR(100)` | Yes | Image MIME type (`image/jpeg`, `image/png`) |
| `is_customer_visible`| `BOOLEAN` | No | Default `TRUE` |
| `captured_by` | `VARCHAR(100)` | No | Staff name |
| `captured_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.11 `public.washdoor_pickup_delivery_schedules` (Logistics Time Slots)
Manages driver dispatch, scheduled pickup/delivery slots, and route zone allocation.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `schedule_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `work_id` | `UUID` | No | **Foreign Key** `customer_works(work_id)` ON DELETE CASCADE |
| `work_number` | `VARCHAR(30)` | No | Order identifier |
| `schedule_type` | `VARCHAR(20)` | No | Default `'Pickup'`, `CHECK (schedule_type IN ('Pickup', 'Delivery'))` |
| `scheduled_date`| `DATE` | No | Target date |
| `slot_label` | `VARCHAR(80)` | No | Slot time window (`Morning (09:00 AM - 12:00 PM)`) |
| `pickup_time_display`| `VARCHAR(80)`| Yes | Human-readable pickup time |
| `delivery_slot_display`| `VARCHAR(80)`| Yes | Human-readable delivery time |
| `assigned_driver_name`| `VARCHAR(120)`| Yes | Rider name |
| `assigned_driver_full`| `VARCHAR(200)`| Yes | Driver name + vehicle details |
| `driver_phone` | `VARCHAR(20)` | Yes | Rider phone number |
| `vehicle_number`| `VARCHAR(50)` | Yes | Vehicle registration |
| `route_zone` | `VARCHAR(100)` | Yes | Operational route zone |
| `address_text` | `TEXT` | Yes | Delivery location |
| `landmark` | `TEXT` | Yes | Nearby landmark |
| `status` | `VARCHAR(30)` | No | Default `'Scheduled'` |
| `notes` | `TEXT` | Yes | Delivery instructions |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.12 `public.washdoor_payment_ledger` (Double-Entry Financial Transactions)
Maintains an immutable record of all incoming customer payments, advances, wallet debits, and balance settlements.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `ledger_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `payment_number`| `VARCHAR(30)` | No | **Unique**, default `generate_payment_number()` (`PAY00001`) |
| `work_id` | `UUID` | No | **Foreign Key** `customer_works(work_id)` ON DELETE CASCADE |
| `work_number` | `VARCHAR(30)` | No | Order identifier |
| `customer_id` | `VARCHAR(50)` | No | Customer code |
| `entry_type` | `VARCHAR(30)` | No | `CHECK (entry_type IN ('Initial_Advance', 'Partial_Payment', 'Full_Payment', 'Due_Settlement', 'Wallet_Debit', 'Refund', 'Discount_Adjustment'))` |
| `payment_mode` | `VARCHAR(30)` | No | `CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Razorpay', 'PhonePe', 'Credit'))` |
| `amount` | `NUMERIC(10,2)`| No | `CHECK (amount > 0)` |
| `reference_txn_id`| `UUID` | Yes | References `washdoor_payment_gateway_transactions(txn_id)` |
| `reference_number`| `VARCHAR(100)`| Yes | Bank reference / UPI UTR / Card approval code |
| `notes` | `TEXT` | Yes | Payment remarks |
| `collected_by` | `VARCHAR(100)` | No | Default `'Store Admin'` |
| `collected_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.13 `public.washdoor_status_history` (Immutable Audit Trail)
Maintains an append-only timeline of every order status transition, actor attribution, and customer notifications.

| Column Name | Data Type | Nullable | Details |
| :--- | :--- | :--- | :--- |
| `history_id` | `UUID` | No | **Primary Key** (`gen_random_uuid()`) |
| `work_id` | `UUID` | No | **Foreign Key** `customer_works(work_id)` ON DELETE CASCADE |
| `work_number` | `VARCHAR(30)` | No | Order identifier |
| `entity_type` | `VARCHAR(30)` | No | Default `'Order'`, `CHECK (entity_type IN ('Order', 'Garment_Unit', 'Batch', 'Driver_Assignment'))` |
| `old_status` | `VARCHAR(50)` | Yes | Previous status string |
| `new_status` | `VARCHAR(50)` | No | New status string |
| `changed_by_name`| `VARCHAR(100)`| No | Operator / staff name |
| `changed_by_role`| `VARCHAR(30)` | No | Default `'Staff'` (`Admin`, `Staff`, `Driver`, `QC_Inspector`, `Customer`, `System`) |
| `change_source`| `VARCHAR(30)` | No | Default `'POS_Web'` (`POS_Web`, `Driver_App`, `Plant_App`, `WhatsApp_Bot`) |
| `remarks` | `TEXT` | Yes | Status change comments |
| `notify_customer`| `BOOLEAN` | No | Default `FALSE` |
| `notification_sent`| `BOOLEAN` | No | Default `FALSE` |
| `changed_at` | `TIMESTAMPTZ` | No | `NOW()` |

---

### 2.14 `public.washdoor_orders_master` (Unified Master Table)
A single-table unified master covering all customer and order fields with constraints, full-text search, and automated sequences. Used for rapid intake testing and backward compatibility.

- **Primary Key:** `order_id` (UUID, default `gen_random_uuid()`)
- **Unique:** `order_number` (VARCHAR(30), default `generate_order_number()`)
- **Key Columns:** `customer_id`, `customer_name`, `mobile_number` (`CHECK ~ '^[6-9]\d{9}$'`), `order_status`, `order_type`, `subtotal_amount`, `tax_amount`, `discount_amount`, `total_amount`, `payment_status`, `payment_method`, `item_count`, `customer_history` (JSONB), `customer_insights` (JSONB).

---

## 3. Database Sequences & RPC Functions

### 3.1 Sequences
1. `public.customer_work_seq`: Increments sequentially from `1` for `customer_works.work_number`.
2. `public.order_number_seq`: Increments sequentially from `1` for `washdoor_orders_master.order_number`.
3. `public.seq_washdoor_order_number`: Increments sequentially for standard order IDs.
4. `public.seq_washdoor_customer_number`: Increments sequentially for customer codes (`CUS00001`).
5. `public.seq_washdoor_payment_number`: Increments sequentially for payment transaction numbers (`PAY00001`).
6. `public.seq_washdoor_audit_number`: Increments sequentially for audit trail records (`AUD00001`).

### 3.2 Key RPC & PL/pgSQL Functions
- **`generate_customer_work_number()`**: Returns `'ORD' || lpad(nextval('customer_work_seq')::text, 5, '0')`.
- **`get_next_order_number()`**: Inspects the highest existing numeric suffix across `customer_works` and returns the next formatted string (e.g. `'ORD00015'`).
- **`generate_order_number()`**: Returns `'ORD' || lpad(nextval('seq_washdoor_order_number')::text, 5, '0')`.
- **`generate_customer_number()`**: Returns `'CUS' || lpad(nextval('seq_washdoor_customer_number')::text, 5, '0')`.
- **`generate_payment_number()`**: Returns `'PAY' || lpad(nextval('seq_washdoor_payment_number')::text, 5, '0')`.
- **`handle_customer_works_updated_at()`**: Trigger function setting `NEW.updated_at = now()` before every update on `customer_works`.

---

## 4. Row Level Security (RLS) & Access Policies

All tables in the schema have RLS enabled with permissive policies granted to `anon`, `authenticated`, and `service_role` to support direct POS operations:
- **`customer_works`:** `allow_all_read_customer_works`, `allow_all_insert_customer_works`, `allow_all_update_customer_works`, `allow_all_delete_customer_works`.
- **`washdoor_service_types`:** Read, Insert, Update, Delete allowed for counter apps.
- **`washdoor_staff_master` & `washdoor_pickup_delivery_master`:** Permissive read/write policies.
- **Storage Bucket `washdoor-garment-photos`:** Permissive policy on `storage.objects` allowing anonymous and authenticated uploads and reads where `bucket_id = 'washdoor-garment-photos'`.
- **Audit Logs:** Explicit insert and select grants for POS counter terminals.

---

## 5. Recent Schema Updates & Migrations

1. **Staff & Driver Foreign Keys on `customer_works`:**
   - Added `attend_staff_id VARCHAR(30)` referencing `washdoor_staff_master(staff_id)`.
   - Added `attend_staff_name VARCHAR(120)`.
   - Added `assigned_pickup_person_id VARCHAR(30)` referencing `washdoor_pickup_delivery_master(employee_id)`.
   - Added `assigned_pickup_delivery_person VARCHAR(120)`.
2. **Tax & Financial Columns on `customer_works`:**
   - Added `tax_exemption BOOLEAN DEFAULT FALSE`.
   - Added `discount_pct NUMERIC(5,2) DEFAULT 0.00`.
   - Added `taxable_amount NUMERIC(10,2) DEFAULT 0.00`.
   - Added `gst_percentage NUMERIC(5,2) DEFAULT 5.00`.
   - Added `cgst_amount`, `sgst_amount`, `igst_amount NUMERIC(10,2) DEFAULT 0.00`.
   - Added `invoice_number VARCHAR(40)` and `invoice_date TIMESTAMPTZ`.
3. **Dynamic Service Types Table:**
   - Introduced `washdoor_service_types` with case-insensitive uniqueness index on `lower(service_name)`.
4. **Relational Order Items Foreign Key:**
   - Added `work_id UUID REFERENCES customer_works(work_id) ON DELETE CASCADE` on `washdoor_order_items`.
5. **Garment Photos Bucket Integration:**
   - Provisioned dedicated `washdoor-garment-photos` bucket in Supabase Storage with metadata columns (`file_name`, `file_size_kb`, `mime_type`, `is_customer_visible`).
