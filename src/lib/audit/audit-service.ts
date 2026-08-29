import { getRequiredTenantContext } from '../tenant/context';
import { ModuleCode, PermissionAction } from '../types';

export interface AuditRecordInput {
  userId?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  module: ModuleCode;
  entityType: string;
  entityId: string;
  action: PermissionAction;
  oldValues?: unknown;
  newValues?: unknown;
  changeSummary?: string;
  requestId?: string;
}

const REDACTED_FIELDS = new Set([
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'secret',
  'mfasecret',
  'creditcard',
  'cardnumber',
]);

/**
 * Sanitizes and strips sensitive authentication secrets before logging to the audit trail.
 */
export function sanitizeAuditData(data: unknown): string | null {
  if (data === undefined || data === null) return null;

  try {
    const cleanObject = (val: unknown): unknown => {
      if (val === null || typeof val !== 'object') {
        return val;
      }

      if (Array.isArray(val)) {
        return val.map(cleanObject);
      }

      const copy: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        const normKey = k.toLowerCase().replace(/[-_]/g, '');
        if (REDACTED_FIELDS.has(normKey)) {
          copy[k] = '[REDACTED]';
        } else if (typeof v === 'object' && v !== null) {
          copy[k] = cleanObject(v);
        } else {
          copy[k] = v;
        }
      }
      return copy;
    };

    return JSON.stringify(cleanObject(data));
  } catch {
    return '[UNSERIALIZABLE]';
  }
}

/**
 * Audit Service: Prepares structured audit records for database insertion.
 */
export class AuditService {
  /**
   * Prepares a tenant-scoped sanitized audit log entry payload.
   */
  public static createAuditPayload(input: AuditRecordInput) {
    const { tenantId } = getRequiredTenantContext();

    return {
      tenantId,
      userId: input.userId || null,
      userRole: input.userRole || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValues: sanitizeAuditData(input.oldValues),
      newValues: sanitizeAuditData(input.newValues),
      changeSummary: input.changeSummary || null,
      requestId: input.requestId || null,
      timestamp: new Date(),
    };
  }
}
