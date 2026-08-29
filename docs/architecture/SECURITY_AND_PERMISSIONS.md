# School-ERP: Security, Authentication & Authorization Architecture

## 1. Authentication Architecture

### 1.1. Multi-Portal Identity & Session Management
The ERP serves 5 primary user personas with distinct access scopes and dedicated portal experiences:
- **Admin**: Full administrative, operational, and financial control.
- **Employee / Staff**: Personal HR records, leave requests, payroll payslips.
- **Teacher**: Assigned classes, daily/subject attendance, timetable, exam marks entry.
- **Student**: Personal attendance, class timetable, published fee vouchers, report cards.
- **Parent**: Multi-child profile switcher, fee payments, attendance notifications, report cards.

### 1.2. Password & Credential Security
- **Hashing**: Argon2id (`m=65536, t=3, p=4`) with cryptographically secure random per-user salt.
- **Session Tokens**: Cryptographically random 256-bit session tokens stored in HttpOnly, Secure, SameSite=Strict cookies with server-side session revocation in `UserSession`.
- **Brute-Force Protection**: Max 5 failed login attempts triggers an exponential lockout period (15 min, 1 hr, 24 hr).
- **Password Reset**: Ephemeral single-use cryptographically signed tokens (15-minute validity window) sent via registered email/SMS.

---

## 2. Authorization Architecture: RBAC + PBAC

### 2.1. 10 Core Action Permissions
Every module enforces up to 10 granular actions:

| Action | Description | Typical Privilege Level |
| :--- | :--- | :--- |
| `VIEW` | View list and detail pages; read-only access. | Basic / All permitted roles |
| `CREATE` | Generate new records or initiate workflows. | Operators / Teachers / Staff |
| `EDIT` | Modify mutable fields on draft or unapproved records. | Operators / Authors |
| `DELETE` | Safely remove unlinked, eligible draft records. | Module Admins |
| `APPROVE` | Review and formally approve draft records. | Department Heads / Principals |
| `PRINT` | Render official print templates (Challans, Payslips, Result Cards). | Accounts / Office Staff |
| `EXPORT` | Export data to CSV, Excel, or PDF formats. | Admins / Managers |
| `PUBLISH` | Make approved records visible to external portals (Student/Parent). | Principals / Admins |
| `UNPUBLISH`| Withdraw records from portal visibility back to draft/review. | Principals / Admins |
| `REVERSE` | Execute financial reversals or adjustments with audit justification. | Senior Finance Admin |

### 2.2. Backend Permission Enforcement
Authorization is strictly enforced on the backend via type-safe middleware guards before any business logic executes. UI button visibility is an auxiliary convenience, never a security barrier.

```typescript
// Example: Backend Permission Guard
export async function requirePermission(
  req: AuthenticatedRequest,
  module: ModuleName,
  action: ActionName
) {
  const user = req.user;
  if (user.isSuperAdmin) return true;

  const hasPermission = await checkUserPermission(user.id, `${module}:${action}`);
  if (!hasPermission) {
    throw new ForbiddenError(`User lacks required permission: ${module}:${action}`);
  }
}
```

---

## 3. Data Privacy & Isolation
- **Data Migration Tool Isolation**: By design, no migration scripts, data pump tools, or private legacy ETL scripts are stored in or accessible from this repository, web routes, API endpoints, or user interfaces.
- **Portal Data Scoping**:
  - `Student Portal`: Automatically filtered by `student.user_id == current_user.id`.
  - `Parent Portal`: Automatically filtered to only students where `guardian.user_id == current_user.id` and `is_primary == true`.
  - `Teacher Portal`: Automatically filtered to assigned classes and sections in `TeacherSubjectAssignment`.
