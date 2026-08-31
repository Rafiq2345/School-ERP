# School-ERP: Client User Manual - Attendance Management & Work Schedules

> [!IMPORTANT]
> **Client Deliverable**:
> This user manual is a standalone guide for School Administrators, Principals, Attendance Officers, and HR Managers. It describes the complete operational procedures for Student and Employee Attendance.

---

## 1. Module Overview & Navigation

The **Attendance Management** module provides institutional control over student roll calls and staff duty schedules:

- **Student Attendance** (`/admin/attendance`): Daily classroom roll call, section monthly register, and correction audits.
- **Employee Attendance** (`/admin/attendance/employees`): Multi-shift employee roll call, check-in/out tracking, dynamic worked hours calculation, and staff registers.
- **Work Shift Management** (`/admin/attendance/employees/shifts`): Configuration of reusable time blocks (Morning, Afternoon, Evening, Full Day, Friday Special).
- **Work Schedule Management** (`/admin/attendance/employees/schedules`): Weekly duty schedules defining which shifts are worked on each weekday (Monday–Sunday).
- **Schedule Assignments** (`/admin/attendance/employees/schedules/assignments`): Bulk assignment of duty schedules to departments or individual employees with effective-dating.
- **Audit & Corrections** (`/admin/attendance/employees/corrections`): Complete history of attendance modifications with mandatory justifications.

---

## 2. A. Implemented & Verified Procedures

### 2.1. Daily Student Attendance (Roll Call)
1. Navigate to **Attendance** ➔ **Student Attendance** (`/admin/attendance`).
2. Select the **Academic Session**, **Class**, **Section**, and **Date**.
3. The system loads the student roster with all students defaulted to **Present**.
4. For any absent or delayed student, select the appropriate status (**Absent**, **Late**, **Half Day**, or **Excused**) and enter optional remarks.
5. Click **Save Attendance**.
   - *First-time entry*: The roll call is saved immediately.
   - *Subsequent edits*: An **Attendance Correction Modal** will prompt for a mandatory **Correction Reason / Justification**.

---

### 2.2. Student Monthly Attendance Register
1. Navigate to **Attendance** ➔ **Monthly Register** (`/admin/attendance/register`).
2. Filter by Academic Session, Class, Section, and Month.
3. The matrix displays day-by-day status columns ($1\dots31$) and monthly aggregate totals (Present Days, Absent Days, Late Count, and Attendance Percentage).

---

### 2.3. Work Shift Management (Time Blocks)
1. Navigate to **Employee Attendance** ➔ **Shift Management** (`/admin/attendance/employees/shifts`).
2. Click **Create New Shift** to define a reusable time block:
   - **Shift Name & Code**: e.g. `Morning Shift` (`SHIFT-MRN`).
   - **Start & End Times**: e.g. `07:00 AM` to `11:00 AM`.
   - **Grace Periods**: Late grace minutes (e.g. 10m) and early departure grace minutes.
   - **Break Duration**: Break minutes (e.g. 30m deducted automatically if worked $\ge 4$ hours).
   - **Working Days**: Select active weekdays for this shift.

---

### 2.4. Work Schedule Management (Weekly Duty Patterns)
1. Navigate to **Employee Attendance** ➔ **Work Schedules** (`/admin/attendance/employees/schedules`).
2. Click **Create Work Schedule**:
   - Provide a **Schedule Name** (e.g. `Part-Time Teaching Schedule`) and **Code** (`WS-PT`).
   - For each day (Monday–Sunday), toggle whether it is a **Working Day** or **Off Day**.
   - For working days, select the active shift(s) (e.g. Morning + Afternoon for double shift days, or Morning only for single shift days).
   - The system automatically validates time intersections and alerts you if any shifts overlap.
3. Click **Create Schedule** to save.

---

### 2.5. Bulk Schedule Assignment & Individual Overrides
1. Navigate to **Employee Attendance** ➔ **Schedule Assignments** (`/admin/attendance/employees/schedules/assignments`).
2. Select the **Target Work Schedule**.
3. Choose the **Assignment Scope**:
   - **By Department**: Assigns schedule to all staff in a department (e.g. Teaching Faculty).
   - **By Designation**: Assigns schedule to specific designations.
   - **By Employment Type**: Assigns schedule to Full-Time / Part-Time contracts.
   - **Selected Individual Employees**: Assigns schedule to specific staff members.
4. Set the **Effective From Date** (e.g. `2026-10-01`).
5. *(Optional)* Check **Mark as Individual Employee Custom Exception / Override** if this assignment represents a personal override for a specific staff member.
6. Click **Preview Affected Staff** to verify the staff list, current schedule, and proposed new schedule.
7. Click **Confirm & Apply Schedule Assignment**.

---

### 2.6. Daily Employee Multi-Shift Attendance
1. Navigate to **Employee Attendance** (`/admin/attendance/employees`).
2. Select the target **Date**. The system automatically resolves the scheduled shift segments for each employee from their active Work Schedule:
   - **Single-Shift Staff**: Displays 1 shift segment row.
   - **Double-Shift Staff**: Displays 2 shift segment rows (e.g. Morning & Afternoon).
   - **Triple-Shift Staff**: Displays 3 shift segment rows.
3. Enter or adjust **Check-In** and **Check-Out** times for each segment.
4. The system calculates:
   - **Segment Worked Hours**: Calculated from actual check-in/out.
   - **Gap Time Exclusion**: Intervals between non-overlapping shifts (e.g. `11:00 → 12:00`) are **NOT** counted as worked hours.
   - **Late Minutes**: Calculated based on the shift's grace threshold.
   - **Consolidated Status**: Automatically marks `PRESENT`, `LATE`, `HALF_DAY` (if 1 shift present and 1 absent), `ABSENT`, `OFF_DAY`, or `HOLIDAY`.
5. Click **Save Attendance**.

---

### 2.7. Attendance Corrections & Audit Trail
1. Any modification to saved employee attendance requires an explicit **Correction Reason**.
2. To audit past corrections, navigate to **Employee Attendance** ➔ **Audit & Corrections** (`/admin/attendance/employees/corrections`).
3. The audit log displays the employee name, shift title, previous vs new status, previous vs new check-in/out timestamps, user who authorized the change, and mandatory reason.

---

### 2.8. School Calendar & Holiday Integration
1. Configure institutional holidays and weekly offs in **School Settings** ➔ **School Calendar / Holidays** (`/admin/settings/holidays`).
2. On public holidays and scheduled off-days, daily roll call displays the non-working status (`HOLIDAY` / `OFF_DAY`) without generating false employee or student absences.

---

## 3. B. Future Roadmap (Not-Yet-Implemented)

The following capabilities are reserved for future development:
- **Direct Biometric & RFID Device Integration**: Automated live stream of punch logs from biometric wall devices.
- **Mobile Geofenced Self Check-In**: GPS-gated check-in from employee mobile portal.
- **Automated Payroll Salary Deductions**: Automated generation of monthly salary deduction penalties (the data interface `getPayrollAttendanceSummary` is ready for future integration).
