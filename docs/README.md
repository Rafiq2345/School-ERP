# School-ERP Documentation Architecture

Welcome to the **School-ERP** documentation repository.

Documentation is strictly organized into two separate categories:

---

## Category A: Internal & Commercial Technical Documentation
*(For Developers, Platform Owners & Authorized Source Handover — Kept in version control, never exposed through the ERP user interface).*

```
/docs
  ├── architecture/            # Enterprise Architecture, Database Design, Security & Standards
  │   ├── SYSTEM_ARCHITECTURE.md
  │   ├── COMMERCIAL_DELIVERY_MODES.md
  │   ├── TENANT_ISOLATION_AND_PLATFORM_CONTROL.md
  │   ├── HOSTED_DEPLOYMENT_GUIDE.md
  │   ├── SOURCE_CODE_HANDOVER_GUIDE.md
  │   ├── DATABASE_SCHEMA.md
  │   ├── SECURITY_AND_PERMISSIONS.md
  │   ├── PUBLISHING_ENGINE.md
  │   ├── FINANCIAL_SAFETY_RULES.md
  │   ├── LOCALIZATION_RTL.md
  │   └── DEFINITION_OF_DONE.md
  ├── modules/                 # Modular Internal Technical Specifications & Change Logs
  │   ├── 01_core_config/
  │   ├── 02_security_rbac/
  │   ├── 03_admissions_students/
  │   ├── 04_academics_timetable/
  │   ├── 05_attendance/
  │   ├── 06_billing_fee_management/
  │   ├── 07_publishing_engine/
  │   ├── 08_exams_results/
  │   ├── 09_hr_payroll/
  │   ├── 10_accounts_ledger/
  │   ├── 11_library/
  │   ├── 12_inventory_store/
  │   └── 13_communication_notices/
  └── templates/               # Standard Templates for future features
      ├── FEATURE_DOC_TEMPLATE.md
      ├── ADMIN_GUIDE_TEMPLATE.md
      ├── USER_MANUAL_TEMPLATE.md
      ├── TEST_CASES_TEMPLATE.md
      └── CHANGELOG_TEMPLATE.md
```

---

## Category B: Client User Manuals (Printable Deliverables)
*(Separate printable documentation containing step-by-step instructions and actual finalized screenshots. This is NOT embedded as an in-app page/module inside the ERP).*

```
/docs
  └── user_manuals/            # Client-facing printable manuals and finalized UI screenshots
      ├── 01_admin_portal/
      ├── 02_employee_staff_portal/
      ├── 03_teacher_portal/
      ├── 04_student_portal/
      └── 05_parent_portal/
```

---

## User Manual Development Rule & Definition of Done
Every feature development must follow the workflow rule:
$$\text{Develop} \longrightarrow \text{Test} \longrightarrow \text{Finalize UI} \longrightarrow \text{Capture Screenshot} \longrightarrow \text{Update User Manual} \longrightarrow \text{Update Tech Doc} \longrightarrow \text{Changelog} \longrightarrow \text{Review} \longrightarrow \text{Commit}$$

Refer to [DEFINITION_OF_DONE.md](file:///d:/School%20Management/docs/architecture/DEFINITION_OF_DONE.md) for full quality requirements.
