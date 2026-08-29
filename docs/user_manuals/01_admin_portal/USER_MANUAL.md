# School-ERP: Client User Manual - Foundation & Authentication

> [!IMPORTANT]
> **Client Deliverable**:
> This user manual is a standalone, printable guide for school administrative personnel and end-users. It is not embedded within the School-ERP web application.

---

## 1. Introduction
Welcome to **School-ERP**, the comprehensive enterprise management system for your institution. This manual provides step-by-step instructions for getting started, logging in, selecting your portal, switching languages, and navigating the top-bar interface.

---

## 2. Accessing the System & Logging In

### Step 1: Navigate to the Login Page
Open your web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari) and visit your school's designated ERP address (e.g. `https://school.yourdomain.com/login`).

```text
[SCREENSHOT PLACEHOLDER: 01_login_screen.png - Login Page with School Code, Username, and Portal Selector]
```

### Step 2: Select Your Target Portal
Choose your designated role from the portal selector tabs:
- **Admin**: For School Principals, Administrators, and Accounts Managers.
- **Staff**: For general administrative and operational staff.
- **Teacher**: For instructional faculty.
- **Student**: For enrolled students.
- **Parent**: For parents and guardians.

### Step 3: Enter Your Credentials
1. **School Code**: Enter your institution's unique identifier (e.g. `SCH-001`).
2. **Username / Email**: Enter your assigned username or registered email.
3. **Password**: Enter your secure password.
4. Click **Sign In**.

> [!NOTE]
> For security, accounts are locked for 15 minutes after 5 consecutive failed login attempts.

---

## 3. Switching Language (English LTR ↔ Urdu RTL)

The ERP natively supports bilingual operation in English and Urdu:

```text
[SCREENSHOT PLACEHOLDER: 02_language_switch.png - Header Language Toggle in English LTR and Urdu RTL]
```

- To switch to **Urdu (اردو)**: Click the **اردو** button in the top-right header. The interface will instantly transition to Right-to-Left (RTL) layout with Nastaliq typography.
- To switch to **English**: Click the **English** button in the header.

---

## 4. Navigating the Top-Bar Interface

School-ERP utilizes an efficient **Top-Navigation Bar** (no permanent left sidebar), providing maximum screen real estate for your data tables and forms:

```text
[SCREENSHOT PLACEHOLDER: 03_top_navigation_bar.png - Top Header and Horizontal Module Navigation Tabs]
```

### Key Elements:
1. **School Brand & Title**: Located in the top-left corner, displaying your school name.
2. **Global Search**: Quick search bar for students, staff, classes, and vouchers.
3. **Notifications**: Bell icon indicating unread notices and workflow approvals.
4. **User Profile & Tenant Badge**: Click your avatar in the top-right to view your role, assigned tenant, and profile settings.
5. **Module Tabs**: Horizontally scrollable navigation tabs allowing direct access to all authorized modules.

---

## 5. Signing Out

To securely end your session:
1. Click your **User Profile Avatar** in the top-right corner.
2. Click **Sign Out**.
3. Your session token will be immediately revoked on the server and you will be returned to the login screen.

```text
[SCREENSHOT PLACEHOLDER: 04_logout_dropdown.png - User Profile Dropdown and Sign Out Option]
```
