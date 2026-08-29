# School-ERP: Localization & RTL Architecture

## 1. Bilingual Architecture Principles
- **Languages**: English (`en`) and Urdu (`ur`) treated as first-class citizens across all UI portals, notifications, and generated documents.
- **Directionality**: Dynamic switching between Left-to-Right (`dir="ltr"`) for English and Right-to-Left (`dir="rtl"`) for Urdu.
- **Typography & Font Stacks**:
  - English: Inter / Geist Sans / System UI.
  - Urdu: Noto Nastaliq Urdu / Jameel Noori Nastaleeq for headings and certificates; Noto Sans Arabic for dense data tables and numeric entry.
- **Data Model Bilingualism**: All user-facing master entities include both `_en` and `_ur` fields (e.g. `school_name_en`, `school_name_ur`, `name_en`, `name_ur`, `remarks_en`, `remarks_ur`).

---

## 2. Localization Structure & Translation Dictionaries
Translation dictionaries are organized modularly under `/locales/`:

```
/locales
  ├── en/
  │   ├── common.json
  │   ├── auth.json
  │   ├── billing.json
  │   ├── academics.json
  │   ├── exams.json
  │   ├── hr.json
  │   └── errors.json
  └── ur/
      ├── common.json
      ├── auth.json
      ├── billing.json
      ├── academics.json
      ├── exams.json
      ├── hr.json
      └── errors.json
```

### Sample Dictionary Entry: `billing.json`
**English (`/locales/en/billing.json`)**:
```json
{
  "fee_voucher": "Fee Voucher",
  "voucher_no": "Voucher No",
  "issue_date": "Issue Date",
  "due_date": "Due Date",
  "payable_amount": "Payable Amount",
  "paid_amount": "Paid Amount",
  "balance": "Balance",
  "zero_settlement": "Zero-Balance Scholarship Settlement",
  "status": {
    "unpaid": "Unpaid",
    "partially_paid": "Partially Paid",
    "paid": "Paid",
    "overdue": "Overdue",
    "settled": "Settled (Scholarship)"
  }
}
```

**Urdu (`/locales/ur/billing.json`)**:
```json
{
  "fee_voucher": "فیس واؤچر",
  "voucher_no": "واؤچر نمبر",
  "issue_date": "تاریخ اجراء",
  "due_date": "آخری تاریخ",
  "payable_amount": "قابل ادائیگی رقم",
  "paid_amount": "ادا شدہ رقم",
  "balance": "بقایا جات",
  "zero_settlement": "اسکالرشپ زیرو بیلنس سیٹلمنٹ",
  "status": {
    "unpaid": "غیر ادا شدہ",
    "partially_paid": "جزوی ادا شدہ",
    "paid": "ادا شدہ",
    "overdue": "میعاد ختم",
    "settled": "سیٹلڈ (اسکالرشپ)"
  }
}
```

---

## 3. RTL UI Guidelines & CSS Standards
1. **Logical CSS Properties**:
   - Use `ms-*` / `me-*` (margin-start / margin-end) instead of `ml-*` / `mr-*`.
   - Use `ps-*` / `pe-*` (padding-start / padding-end) instead of `pl-*` / `pr-*`.
   - Use `start-*` / `end-*` for positioning instead of `left-*` / `right-*`.
   - Use `text-start` / `text-end` instead of `text-left` / `text-right`.
2. **Icon Mirroring**:
   - Directional icons (arrows, chevrons, next/prev icons) mirror automatically in RTL (`rtl:rotate-180`).
   - Universal icons (search, calendar, money, print, checkmark) do not mirror.
3. **Number & Currency Formatting**:
   - Currency display: `Rs. 4,500.00` or `روپے 4,500.00` with standard international numerals (`0-9`) or Eastern Arabic numerals based on school preference settings.
   - Date display: Dual calendar formatting supporting Gregorian dates with optional Hijri equivalent.
