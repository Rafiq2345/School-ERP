# Core Configuration & Foundation - Technical Documentation

## 1. Overview
The Core Configuration module establishes the multi-tenant runtime infrastructure, environment variable validation, tenant resolution, and school profile configuration for School-ERP.

## 2. Standard PostgreSQL Architecture & Tenant Scoping
- **Database Engine**: PostgreSQL 16+ standardized across development, testing, staging, and production environments.
- **Tenant Context**: Injected at the HTTP request edge via `src/lib/tenant/context.ts` using Node.js `AsyncLocalStorage`.
- **Database Repository**: `src/lib/db/tenant-prisma.ts` wraps Prisma ORM to assert tenant boundaries and provides PostgreSQL Row-Level Security (RLS) session helpers (`executeWithTenantRLS`).

## 3. Database Schema Models (PostgreSQL)
- **`Tenant`**: Unique `id`, `name`, `code`, `status`.
- **`SchoolProfile`**: One-to-one relation with `Tenant`, storing bilingual school name (`name_en`, `name_ur`), registration number, contact email/phone, timezone, date format, and currency metadata.
- **`TenantSetting`**: Key-value configuration store per tenant with optional encryption.
- **`ModuleFeatureToggle`**: Per-tenant feature flag controller for commercial tier differentiation.
- **`AuditLog`**: Stores JSONB snapshots (`old_values`, `new_values`) natively in PostgreSQL.

## 4. API Endpoints
- `GET /api/health` - Health check verifying system status, mode, and environment.

## 5. Security & Isolation Invariants
- Direct access to another tenant's records throws `TenantIsolationError` (HTTP 403/404).
- All queries automatically include `WHERE tenant_id = :current_tenant_id`.
- PostgreSQL Row-Level Security (RLS) can be enabled on production tables as defense-in-depth without modifying backend service logic.
