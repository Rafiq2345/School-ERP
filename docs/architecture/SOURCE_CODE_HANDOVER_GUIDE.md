# School-ERP: Authorized Source-Code Handover & Deployment Guide

## 1. Welcome & Licensing Notice
This document is provided to authorized enterprise clients who have acquired a commercial source-code license for **School-ERP**.

> [!IMPORTANT]
> **Licensing Scope**:
> - The source code is licensed under the specific commercial contract executed between the client organization and the software licensor.
> - The software is self-contained and clean. It contains zero hardcoded secrets, no hidden backdoors, and no dependencies on proprietary licensor cloud infrastructure.

---

## 2. Technical Prerequisites
To build and operate the application, the client infrastructure requires:
- **Runtime**: Node.js v24.x LTS or higher
- **Package Manager**: npm 11.x+
- **Database**: PostgreSQL 16.x or higher
- **Operating System**: Linux (Ubuntu 22.04/24.04 LTS recommended), Windows Server, or macOS
- **Optional**: NGINX / Caddy for reverse proxy and SSL (TLS 1.3) termination.

---

## 3. Environment Configuration & Secret Setup

1. **Create Environment File**:
   Copy the provided `.env.example` template to `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. **Configure Required Variables**:
   Ensure all placeholder values are populated with client-generated secure secrets:
   ```env
   # Application Environment
   NODE_ENV=production
   PORT=3000
   APP_URL=https://school.yourdomain.com

   # Database Connection (PostgreSQL)
   DATABASE_URL="postgresql://db_user:YOUR_STRONG_PASSWORD@localhost:5432/school_erp_db?schema=public"

   # Security & Session Secrets (Generate with `openssl rand -base64 32`)
   SESSION_SECRET="YOUR_GENERATED_SESSION_SECRET_32_BYTES"
   CSRF_SECRET="YOUR_GENERATED_CSRF_SECRET_32_BYTES"
   JWT_SIGNING_KEY="YOUR_GENERATED_JWT_SIGNING_KEY_32_BYTES"

   # Storage Configuration
   STORAGE_LOCAL_PATH="./storage"
   MAX_UPLOAD_SIZE_MB=10

   # Default School Locale
   DEFAULT_LOCALE="en"
   ```

---

## 4. Build & Installation Runbook

### Step 1: Install Dependencies
```bash
npm ci --production=false
```

### Step 2: Run Database Migrations & Initial Setup
```bash
# Apply Prisma database schema to PostgreSQL
npx prisma migrate deploy

# (Optional) Seed initial system roles and permissions catalog
npx prisma db seed
```

### Step 3: Build Application
```bash
npm run build
```

### Step 4: Start Production Server
```bash
npm run start
```
*(Or use process managers such as PM2, Docker, or systemd services).*

---

## 5. Security & Operational Best Practices
1. **Database Backups**: Schedule automated daily `pg_dump` backups with encrypted offsite archiving.
2. **File Storage**: Ensure the `/storage` directory has appropriate OS-level write permissions for the application process and is included in regular backup routines.
3. **MFA Enablement**: Recommend enabling Time-based One-Time Password (TOTP) MFA for the initial School Super Admin account.
4. **SSL / TLS**: Always enforce HTTPS in production using an SSL certificate.
