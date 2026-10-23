# Washdoor – Create Order UI & Counter Intake POS

Washdoor Counter Intake and Create Order management system built with **React.js + Supabase PostgreSQL**, styled exactly according to the dark navy & purple accent design specification (`washdoor_create_order_updated.html`).

---

## 1. Features & Architecture

- **Visual Fidelity:** Full replication of the dark navy (`#070d19`), elevated panel (`#0b1425`), purple gradient buttons (`#5141f5` - `#4230d9`), badges, and status pills.
- **Dynamic Customer Lookup:**
  - Initial empty state: *“Search Existing Customer or Register New”*.
  - Debounced search (300ms) querying Supabase PostgreSQL for matching names, phone numbers, or addresses.
  - Interactive customer cards with avatar, name, phone, tier (e.g. *PLATINUM ELITE*), address, order count, and wallet balance.
  - *No matching customer found* state leading into registration.
- **Create Order Workflow:**
  1. Open dialog via **＋ Create Order** button or keyboard shortcut **N**.
  2. Search existing customer or select **♙ New Customer (2B)**.
  3. Validate required fields (Customer name, 10-digit mobile number, optional 6-digit pincode, optional alternate phone, email, and map link).
  4. Select intake method: **Walk-In (Store Drop)** or **On-Call (Pickup)**.
  5. Configure order preference (Fold, Hang, Gentle wash, Fragrance-free, Stain treatment) and instructions.
  6. Expandable accordion (*Additional Customer Details*) containing Communication Preferences, Customer & Membership settings, Profile & Service Settings, Read-only Customer Insights, Customer History, and Contact details.
  7. Atomic transactional order creation using a PostgreSQL stored procedure / RPC (`create_order_with_customer`), ensuring customers and linked orders are saved together without partial state.
- **Full Customer CRUD:**
  - Create: via the Create Order modal.
  - Read: Search and browse existing records.
  - Update: Edit customer details directly in the Customer Master Records tab.
  - Delete: Delete customers with safety confirmation (enforced by DB `RESTRICT` foreign key).

---

## 2. Supabase Database Setup

1. Open your [Supabase Dashboard](https://app.supabase.com) and navigate to **SQL Editor**.
2. Run the SQL script located in [`supabase/schema.sql`](./supabase/schema.sql).
3. The script configures:
   - `customers` table with constraints for 10-digit mobile uniqueness (`^[0-9]{10}$`), 6-digit pincode, valid URLs, and emails.
   - `orders` table linked via foreign key `customer_id` (`ON DELETE RESTRICT`).
   - Sequence and function for order numbers (`WD-112016`, etc.).
   - `set_updated_at()` trigger for both tables.
   - `create_order_with_customer` transactional `SECURITY DEFINER` function.
   - Row Level Security (RLS) policies for counter intake operations.
   - Seed data matching the sample customers and orders from the UI mock.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your project credentials from **Supabase Dashboard → Project Settings → API**:

```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key
```

*(Note: Vite automatically supports both `REACT_APP_*` and `VITE_*` prefixes through the configured `vite.config.js`).*

---

## 4. Run & Test Instructions

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
# or: npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Unit Tests
```bash
npm test
```
Executes the test suite covering customer validation, 10-digit phone enforcement, 6-digit pincode format, email validation, URL validation, and Supabase constraint translations.

### Production Build
```bash
npm run build
```

---

## 5. Keyboard Shortcuts
- **N**: Open the Create Order dialog from anywhere on the orders screen.
- **Escape**: Close the Create Order dialog without saving changes.
