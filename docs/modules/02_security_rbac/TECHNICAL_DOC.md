# Security & RBAC Foundation - Technical Documentation

## 1. Overview
This module implements the commercial authentication, session management, 10-action RBAC/PBAC authorization engine, universal audit trail, Central Publishing Engine foundation, and financial safety invariant rules.

## 2. Authentication Architecture
- **Password Security**: Uses cryptographic `scrypt` hashing with unique 16-byte random salts (`src/lib/auth/password.ts`).
- **Session Tokens**: 256-bit random tokens hashed with SHA-256 before database storage (`src/lib/auth/session.ts`).
- **Account Lockout**: 5 consecutive failed login attempts automatically lock the account for 15 minutes.
- **Rate Limiting**: Sliding window in-memory rate limiter (`src/lib/security/rate-limit.ts`).

## 3. Authorization (10-Action RBAC & PBAC)
- Supported actions: `VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `PRINT`, `EXPORT`, `PUBLISH`, `UNPUBLISH`, `REVERSE`.
- Enforced at backend service level via `requirePermission(user, module, action)` (`src/lib/auth/permission.ts`).

## 4. Universal Audit Engine
- Captures `tenant_id`, `user_id`, `user_role`, `module`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, and `request_id`.
- Automatically redacts passwords, tokens, API keys, and payment card numbers before storage (`src/lib/audit/audit-service.ts`).

## 5. Central Publishing Engine
- Universal state machine: `DRAFT` ➔ `UNDER_REVIEW` ➔ `APPROVED` ➔ `PUBLISHED` ➔ `UNPUBLISHED` / `ARCHIVED`.
- Enforces audience and portal gating rules (`src/lib/publishing/publishing-service.ts`).

## 6. Financial Safety Engine
- Hard-locks records with paid amounts, payments, or ledger links.
- Two-phase bulk deletion preview classifying records into eligible vs protected (`src/lib/finance/financial-safety.ts`).
- Zero-balance scholarship settlement with $0.00 cash inflow.
