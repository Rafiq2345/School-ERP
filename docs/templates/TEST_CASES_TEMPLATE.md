# [Module/Feature Name] - Test Cases & Verification Plan

## 1. Test Overview
Summary of test scope, test environment requirements, and tenant-scoped mock data setups.

## 2. Automated Test Matrix

| Test ID | Test Scenario | Type (Unit / Integration / E2E) | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `TC-001` | Valid input payload creation | Unit / API | `201 Created` with valid schema | Planned |
| `TC-002` | Unauthorized user access attempt | Security | `403 Forbidden` | Planned |
| `TC-003` | Cross-tenant data access attempt | Tenant Isolation | `404 Not Found` / `403 Forbidden` | Planned |
| `TC-004` | Financial integrity invariant check | Domain Logic | Invariant strictly preserved | Planned |
| `TC-005` | Publishing visibility boundary | Integration | Draft invisible to portal users | Planned |

## 3. Manual Verification Checklist
- [ ] Responsive layout check across Desktop, Tablet, and Mobile.
- [ ] Language toggle verification (English LTR ↔ Urdu RTL).
- [ ] Financial calculation & rounding validation.
- [ ] Audit log entry verification upon record changes.
- [ ] Finalized screenshots captured and placed in `/docs/user_manuals/<module>/screenshots/`.
