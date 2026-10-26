# MARUTI TRADERS — ENTERPRISE ERP & KHATA MANAGEMENT SYSTEM

A complete, production-grade, responsive business management application built specifically for **Maruti Traders** (Wholesale & Retail Trading | Hardware, Electricals & Industrial Supplies, Gujarat).

This application is fully functional with a real database, complete atomic transactions, role-based access control, GST calculations, multi-godown stock transfers, invoice generation, WhatsApp sharing, and Khata Book ledgers.

---

## 🌟 Key Modules & Features

### 1. User Roles & Access Control (RBAC)
- **Admin**: Complete access to all modules, financial P&L, salary management, company settings, and user provisioning.
- **Manager**: Day-to-day operations, inventory, stock transfers, sales, purchases, and godowns.
- **Accountant**: Sales & purchase invoices, customer/supplier ledgers, payment vouchers, daily collections, and GST reports.
- **Staff**: Sales entries, billing counter, stock inquiry, and authorized customer balances. Restricted from salaries and administrative settings.
- **Live Role Switcher**: Interactive switcher in the header to effortlessly test live permissions between all 4 roles.

### 2. Inventory & Product Management
- Complete catalog with Product Name, SKU, Barcode, Category, Subcategory, Brand, Size, Unit (PCS, BOX, KG, MTR, BUCKET), and Description.
- Purchase Price, Selling Price, Wholesale Price, HSN Code, and GST Rates (0%, 5%, 12%, 18%, 28%).
- Multi-godown opening stock allocation and real-time total stock across all depots.
- Automated low-stock and out-of-stock alert levels.
- Permanent `StockMovement` audit logs tracking every In/Out/Transfer/Adjustment.
- Barcode tag generation and preview.
- 1-click Excel/CSV export of entire product catalog with valuation.

### 3. Multiple Godowns & Inter-Godown Logistics
- Branch depots: **Main Central Godown (GIDC)**, **Market Yard Depot (Katargam)**, and **Highway Logistics Hub (Kadodara)**.
- Consolidated inventory view and per-godown stock distribution.
- Inter-godown transfers with unique tracking code (`TRF-YYYY-XXXX`).
- Transfer workflow: `DRAFT` → `DISPATCHED` (stock deducted from source godown) → `RECEIVED` (stock added to destination depot) or `CANCELLED` (stock restored).
- Prevents negative stock and guarantees stock is never duplicated or lost in transit.

### 4. Sales Billing Counter & Invoicing
- Fast billing counter optimized for quick customer checkout.
- Customer autocomplete with mobile search + inline "+ Quick Add Customer" modal.
- Line items with real-time stock availability check, quantity, price, discount, and GST calculation.
- Supports Gujarat Intra-State (CGST 9% + SGST 9%) and Inter-State (IGST 18%).
- Multi-mode settlements: Cash, UPI (with QR/VPA), Bank Transfer, Card, Cheque, or Udhaar (Credit).
- Automatic synchronization with Godown Stock and Customer Khata Ledger.

### 5. Invoice Generation (A4 & 80mm Thermal Receipt)
- **A4 GST Tax Invoice**: Compliant with Indian GST standards with Maruti Traders header, customer details, HSN codes, tax breakdown, amount in words, bank NEFT/RTGS details, and authorized signature.
- **80mm POS Thermal Slip**: Compact receipt format for POS counter printing.
- **1-Click PDF Generation**: Downloadable vector PDF files using jsPDF.
- **1-Click Print**: Direct browser print formatting with `@media print` stylesheets.

### 6. WhatsApp Business Integration
- Direct WhatsApp sharing button on finalized invoices, payment receipts, and customer statements.
- Pre-fills clean, formatted messages in Gujarati/Hindi/English with customer name, bill number, amounts, balance due, and UPI payment details.
- 1-click **Overdue Khata Payment Reminders** opening `wa.me/{phone}?text=...` directly.

### 7. Khata Book & Customer/Supplier Ledgers (ખાતાવહી)
- Master Khata Book with color-coded **Debit (નામે / Dr)** and **Credit (જમા / Cr)** audit entries.
- Real-time running balance calculation.
- Big metric cards: **Total Receivables (ઉઘરાણી)** vs **Total Payables (ચૂકવણી)**.
- 1-Click "Record Payment Received (જમા પહોંચ)" and "Pay Supplier (ચૂકવણી)" with mode tracking.
- Filter by Customers, Suppliers, or Date Range.
- Export full ledger to PDF statement.

### 8. Staff Management & Monthly Payroll (Admin Only)
- Employee profiles: designation, assigned branch godown, monthly basic salary, allowances, and deductions.
- Monthly payroll generation calculating attendance, working days, present days, bonus, and advances.
- Official printable/downloadable **Salary Slip PDF**.
- Salary payment status: `PENDING` vs `PAID` with bank UTR tracking.
- Strictly protected from unauthorized staff access.

### 9. Operating Expense Tracker (રોજીંદા ખર્ચ)
- Track expenses across categories: Rent, Electricity, Transport Freight, Tea/Refreshments, Packaging, Repairs, and Office Supplies.
- Integrated into Profit & Loss calculations without distorting trading stock.

### 10. Business Reports & GST Auditing
- **GST Compliance**: GSTR-1 Taxable Value, Output Tax Collected, GSTR-3B Input Tax Credit (ITC), and Net GST Liability.
- **Profit & Loss Statement (P&L)**: Gross Revenue - Cost of Goods - Operating Expenses = Net Trading Profit.
- **Overdue Collection Aging**: Customers with pending balances sorted by amount for fast recovery.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on Node.js v24)
- npm

### 1. Database Setup & Seeding
The project comes pre-configured with SQLite for zero-setup local execution, fully compatible with PostgreSQL.

```bash
# Push schema to SQLite database
npx.cmd prisma db push

# Seed authentic Maruti Traders sample data (Godowns, Products, Invoices, Khata, Users)
node prisma/seed.js
```

### 2. Run the Development Server
```bash
npm.cmd run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 3. Production Build
```bash
npm.cmd run build
npm.cmd run start
```

---

## 🔑 Demo Login Accounts

All user accounts have default password: `admin123`

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin 👑** | `admin@marutitraders.com` | `admin123` | Complete Full Control |
| **Manager 📋** | `manager@marutitraders.com` | `admin123` | Operations, Godowns, Inventory |
| **Accountant 📊** | `accountant@marutitraders.com` | `admin123` | Invoices, Khata Book, Expenses |
| **Staff 👤** | `staff@marutitraders.com` | `admin123` | Sales Billing & Inward Entries |

*Note: You can also use the **One-Click Role Switcher** on the login page or in the top header navigation bar to test live permissions instantly!*

---

## 🗄️ Switching to PostgreSQL (Supabase / Neon / AWS RDS)

To migrate from SQLite to PostgreSQL for production:
1. Open `prisma/schema.prisma`
2. Change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set your `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
   ```
4. Run `npx prisma db push` and `node prisma/seed.js`.

---

## 💼 Maruti Traders Business Defaults
- **Business Name**: Maruti Traders (મારુતિ ટ્રેડર્સ)
- **Tagline**: Wholesale & Retail Trading | Hardware, Electricals & Industrial Supplies
- **Address**: Plot No. 42-45, Phase 2, GIDC Industrial Estate, Ring Road, Surat, Gujarat - 395002
- **GSTIN**: `24AABCM1234P1Z8`
- **State Code**: `24` (Gujarat)
- **Bank**: State Bank of India | A/C: `394857291039` | IFSC: `SBIN0004123`
- **UPI ID**: `marutitraders@sbi`
- **Timezone**: Asia/Kolkata (IST)
- **Currency**: INR (₹) with Indian Numbering (Lakhs & Crores)
