# School-ERP: Hosted / SaaS Deployment Guide (Internal)

## 1. Overview & Scope
This guide provides the internal DevOps and platform engineering procedures for deploying, maintaining, and scaling School-ERP on our multi-tenant cloud infrastructure.

> [!CAUTION]
> **Confidential & Internal**: This document is for our internal platform engineering team. It must not be shared with client organizations.

---

## 2. Infrastructure Architecture
- **Web & API Tier**: Clustered Next.js 15+ Node.js runtime instances behind Cloudflare / NGINX reverse proxy with SSL termination (TLS 1.3).
- **Database Tier**: Managed PostgreSQL 16+ cluster with primary-replica streaming replication, automated daily snapshots, and WAL archiving for Point-In-Time Recovery (PITR).
- **Object Storage**: Tenant-segregated persistent storage volumes or S3-compatible bucket storage (`/storage/tenants/:tenant_id/`).
- **Caching & Queues**: Redis cluster for distributed session cache, rate-limiting counters, and background asynchronous jobs.

---

## 3. Deployment Pipeline & Environment Setup
1. **Environment Variables**: Managed via HashiCorp Vault / AWS Secrets Manager / Secure Environment Injectors.
2. **Database Migrations**: Executed in zero-downtime rolling fashion using Prisma migrate (`npx prisma migrate deploy`).
3. **Health Checks**: Automated liveness and readiness probes (`/api/health`) verifying database response time, Redis heartbeat, and disk capacity.
4. **Monitoring & Telemetry**: Pino structured JSON logs forwarded to centralized observability (Grafana Loki / Datadog) with PII sanitization enabled.

