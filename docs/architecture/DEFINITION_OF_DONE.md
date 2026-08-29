# Definition of Done (DoD) & Security Quality Gate

Every module, feature, sub-feature, or bug fix in **School-ERP** is NOT complete until all items in this checklist are verified and fulfilled:

---

## 1. Feature Development & Security Quality Gate

### A. Commercial Security & Tenant Isolation
- [ ] **1. Authentication & Authorization Reviewed**: Granular backend enforcement of permissions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `PRINT`, `EXPORT`, `PUBLISH`, `UNPUBLISH`, `REVERSE`). School Super Admin restricted from Platform Owner APIs.
- [ ] **2. Tenant Isolation Reviewed**: Strict database/service-level `tenant_id` scoping verified. Zero cross-tenant data leakage or query bypass.
- [ ] **3. Input Validation & Sanitization Reviewed**: Strict Zod schema validation on client and server; XSS escaping and SQL parametrization verified.
- [ ] **4. Sensitive Data Exposure Checked**: No credentials, secrets, stack traces, or unmasked sensitive data leaked in API responses or logs.
- [ ] **5. Audit Requirements Checked**: Universal audit log interceptor verified for all create, update, delete, approve, publish, and reverse events.
- [ ] **6. Financial Integrity Checked (If Applicable)**: Decimal precision enforced, immutable realized receipts, two-phase safe voucher deletion verified, zero-balance settlement without fake cash inflow.

### B. Functional & Platform Standards
- [ ] **7. UI Completed & Responsive**: Mobile, tablet, desktop responsive views finalized and visually polished.
- [ ] **8. Backend & Database Completed**: Type-safe service logic, Prisma schema migrations, indexes, and ACID transactions implemented.
- [ ] **9. Localization & RTL Verified**: Bilingual translation keys (English / Urdu) implemented and RTL layout rendering tested.
- [ ] **10. Error Handling & Boundaries**: Standardized error codes and graceful UI error states implemented.
- [ ] **11. Tests Passed**: Unit tests for calculations/rules and integration tests for API endpoints written and passing.

---

## 2. Documentation & User Manual Workflow Rule

Every completed feature must follow this strict sequential delivery workflow:

$$\text{Develop} \longrightarrow \text{Test} \longrightarrow \text{Finalize UI} \longrightarrow \text{Capture Screenshot} \longrightarrow \text{Update User Manual} \longrightarrow \text{Update Tech Doc} \longrightarrow \text{Changelog} \longrightarrow \text{Review} \longrightarrow \text{Commit}$$

### Documentation Separation Mandate
- [ ] **12. Internal Technical Documentation Updated**: Updated in `/docs/modules/<module>/TECHNICAL_DOC.md` (for developers & product owner; never exposed to ERP UI).
- [ ] **13. Client User Manual Updated**: Created/updated in `/docs/user_manuals/<module>/USER_MANUAL.md` as a **separate, printable client deliverable** with step-by-step instructions and actual finalized screenshots. *(The User Manual is NOT embedded as an in-app module/page in the ERP).*
- [ ] **14. Screenshots Updated**: Actual, finalized UI screenshots placed in `/docs/user_manuals/<module>/screenshots/`.
- [ ] **15. Change Log & Git Working Tree Reviewed**: `/docs/modules/<module>/CHANGELOG.md` updated, clean git tree with zero secrets or unnecessary files.
