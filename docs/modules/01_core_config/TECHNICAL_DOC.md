# Core & Administration Configuration - Technical Documentation

## 1. Overview
The Administration Configuration master data layer establishes the academic foundation, HR organizational structures, exam rule frameworks, document numbering sequences, and dynamic custom field definitions for School-ERP.

---

## 2. Standard PostgreSQL Multi-Tenant Architecture
- **Database Engine**: PostgreSQL 16+ standardized across development, testing, staging, and production environments.
- **Tenant Context**: Injected at the HTTP request edge via `src/lib/tenant/context.ts` using Node.js `AsyncLocalStorage`.
- **Tenant Repository**: `TenantRepository` auto-injects `tenantId` into every database read, write, update, and delete operation.
- **PostgreSQL Row-Level Security (RLS)**: Defense-in-depth supported via `TenantRepository.executeWithTenantRLS` using PostgreSQL session variables (`SET LOCAL app.current_tenant_id`).

---

## 3. Database Schema Models (PostgreSQL)

### 3.1. Foundation Models
- **`Tenant`**: Root tenant model with status (`ACTIVE`, `TRIAL`, `SUSPENDED`, `DEACTIVATED`).
- **`SchoolProfile`**: One-to-one relation with `Tenant`, storing bilingual school name (`name_en`, `name_ur`), registration number, contact email/phone, timezone, date format, and currency metadata.
- **`TenantSetting`**: Key-value configuration store per tenant with optional encryption.
- **`ModuleFeatureToggle`**: Per-tenant feature flag controller for commercial tier differentiation.
- **`AuditLog`**: Stores JSONB snapshots (`old_values`, `new_values`) natively in PostgreSQL.

### 3.2. Academic Structure Master Models
- **`AcademicSession`**: Academic sessions with status lifecycle (`DRAFT` ➔ `ACTIVE` ➔ `CLOSED` ➔ `LOCKED`). Includes `is_current` boolean with PostgreSQL partial unique index (`unique_current_academic_session_per_tenant`) ensuring only one active/current session per tenant.
- **`ClassCategory`**: Organizational grouping (Pre-Primary, Primary, Middle, Secondary, Higher Secondary) with `sort_order`.
- **`SchoolClass`**: Standard school classes (Grade 1, Class 9, etc.) linked to optional `ClassCategory`.
- **`Section`**: Class sections with optional student capacity and sort order.
- **`Subject`**: Academic subjects classified by `subjectType` (`THEORY`, `PRACTICAL`, `BOTH`, `ACTIVITY`).
- **`ClassSubject`**: Many-to-many junction assigning subjects to classes per academic session. Enforces unique `(tenantId, academicSessionId, classId, subjectId)` preventing duplicate curriculum assignments.
- **`StudentCategory`**: Student organizational categories (General, Staff Child, Orphan, Scholarship, Special Needs).
- **`House`**: Student activity houses with configurable color and description.
- **`AcademicCalendarEvent`**: Unified calendar and holiday event model with `is_holiday` flag, date range, and role applicability (`ALL`, `STUDENTS`, `TEACHERS`, `EMPLOYEES`).

### 3.3. HR Master Configuration Models
- **`Department`**: School administrative and academic departments.
- **`Designation`**: Staff and faculty job titles linked to departments.
- **`EmployeeCategory`**: Staff groupings (Teaching Faculty, Administrative Staff, Support Staff).
- **`EmploymentType`**: Dynamic employment contract definitions (Full Time, Part Time, Contract, Hourly, Daily Wage, Temporary) with optional `salary_basis`.
- **`LeaveType`**: Leave policies with paid status, annual entitlement limits, carry-forward limits, and approval requirements.
- **`Shift`**: Work shift timings (`start_time`, `end_time` in 24hr format) with grace and break periods.
- **`WorkingDayPolicy`**: Weekday policy configurations stored as native PostgreSQL JSONB arrays.

### 3.4. Exam Rule Configuration Models
- **`GradingScheme`**: Defines grading calculation modes (`PERCENTAGE`, `GRADE`, `GPA`, `GRADE_AND_GPA`).
- **`GradeBand`**: Min/max score boundaries, grade labels, GPA values, and remarks.
- **`PassingRule`**: Configurable overall pass criteria (min percentage, max failed subjects, theory/practical strategy).
- **`SubjectPassingRule`**: Subject-level passing thresholds (total, theory, practical marks) and combined/separate pass logic.
- **`ExamRuleAssignment`**: Assigns grading and passing rules to an academic session + class context.

### 3.5. System Master Configuration Models
- **`DocumentSequence`**: Concurrency-safe atomic sequence numbering engine supporting prefixes, suffixes, padding, and reset policies (`NEVER`, `ANNUAL_SESSION`, `FISCAL_YEAR`, `MONTHLY`).
- **`CustomFieldDefinition`**: Dynamic custom field definitions across entities (`STUDENT`, `EMPLOYEE`, `ADMISSION`, `GUARDIAN`) supporting types `TEXT`, `NUMBER`, `DATE`, `DROPDOWN`, `MULTISELECT`, `CHECKBOX`, `RADIO`, `FILE`, `IMAGE`, `TEXTAREA`.
- **`CustomFieldOption`**: Dropdown and radio options for custom field definitions.

---

## 4. Deactivation vs. Deletion Invariants
1. **Preservation of History**: Administration master data referenced by historical transactions must never be hard-deleted.
2. **Soft Deactivation**: Models feature `is_active` flags or status indicators (`DRAFT`, `ACTIVE`, `CLOSED`, `LOCKED`) to prevent accidental deletion while allowing historical record integrity.
3. **Session Immutability**: Once an `AcademicSession` is marked `LOCKED`, its curriculum and records are immutable.

---

## 5. Security & Isolation Invariants
- Direct access to another tenant's records throws `TenantIsolationError` (HTTP 403/404).
- All queries automatically include `WHERE tenant_id = :current_tenant_id`.
- Composite unique indexes on all tenant models begin with `tenant_id`.
