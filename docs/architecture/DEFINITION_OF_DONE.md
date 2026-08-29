# Definition of Done (DoD)

For every module, feature, sub-feature, or bug fix in **School-ERP**, development is NOT complete until all items in this checklist are verified and fulfilled:

- [ ] **1. UI Completed**: Responsive on Mobile, Tablet, and Desktop; accessible; clean semantic markup.
- [ ] **2. Backend Completed**: Clean service/controller architecture, type-safe API endpoints, robust business logic.
- [ ] **3. Database Completed**: Schema migrations defined, referential integrity enforced, indexes placed on search/foreign keys, ACID transactions applied.
- [ ] **4. Permissions Implemented**: Granular backend enforcement of `View`, `Create`, `Edit`, `Delete`, `Approve`, `Print`, `Export`, `Publish`, `Unpublish`, `Reverse`. UI controls adaptively rendered based on authorized permissions.
- [ ] **5. Validation Implemented**: Strict schema validation (Zod) on client inputs and backend request payloads.
- [ ] **6. Audit Logging Implemented**: Critical CRUD and financial/publishing changes record `user_id`, `timestamp`, `module`, `entity_type`, `entity_id`, `action`, `old_value`, and `new_value`.
- [ ] **7. English/Urdu & RTL Considered**: All UI labels, error messages, and reports have translation keys; RTL layout rendering verified.
- [ ] **8. Error Handling Completed**: Structured API error responses, graceful UI error boundaries, localized user-friendly messages.
- [ ] **9. Tests Passed**: Unit tests for domain logic/calculations and integration tests for API endpoints written and passing.
- [ ] **10. Technical Documentation Updated**: Architecture, API contracts, schema models, and service interfaces documented in `/docs/modules/<module>/TECHNICAL_DOC.md`.
- [ ] **11. Admin / User Manual Updated**: Step-by-step workflow guide documented in `/docs/modules/<module>/ADMIN_GUIDE.md` and `USER_MANUAL.md`.
- [ ] **12. Screenshots Updated**: UI screenshots or layout mockups placed in `/docs/modules/<module>/screenshots/`.
- [ ] **13. Change Log Updated**: Changes recorded in `/docs/modules/<module>/CHANGELOG.md`.
- [ ] **14. No Unintended Regression**: Existing test suites run cleanly without regressions.
- [ ] **15. Git Working Tree Reviewed**: Clean commit history, no unnecessary files or secrets committed, branches aligned.
