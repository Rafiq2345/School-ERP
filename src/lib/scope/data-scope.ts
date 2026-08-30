import { DataScope } from '../types';

/**
 * Central Data Scope Layer
 * Ensures queries across all business modules obtain their permitted scope centrally.
 */
export class DataScopeManager {
  /**
   * Creates a normalized DataScope instance.
   * Defaults to simple single-campus mode.
   */
  public static createScope(params: {
    tenantId: string;
    organizationId?: string;
    headOfficeId?: string;
    regionId?: string;
    campusId?: string;
    academicSessionId?: string;
    isGlobalAdmin?: boolean;
    permittedCampusIds?: string[];
  }): DataScope {
    return {
      tenantId: params.tenantId,
      campusId: params.campusId || params.tenantId, // in single-school mode, campusId == tenantId
      organizationId: params.organizationId,
      headOfficeId: params.headOfficeId,
      regionId: params.regionId,
      academicSessionId: params.academicSessionId,
      isGlobalAdmin: params.isGlobalAdmin ?? false,
      permittedCampusIds: params.permittedCampusIds || [params.tenantId],
    };
  }

  /**
   * Applies the DataScope boundary to a Prisma 'where' clause.
   * In single-school mode: sets { tenantId: scope.tenantId }.
   * In future multi-campus mode: sets { tenantId: scope.tenantId, campusId: ... } centrally.
   */
  public static applyScopeFilter<T extends Record<string, any>>(
    scope: DataScope,
    additionalFilters?: T
  ): { tenantId: string } & T {
    return {
      tenantId: scope.tenantId,
      ...(additionalFilters || ({} as T)),
    };
  }

  /**
   * Checks if an entity belonging to a specific tenant/campus is accessible within the current scope.
   */
  public static isEntityInScope(
    scope: DataScope,
    entity: { tenantId: string; campusId?: string | null }
  ): boolean {
    if (scope.isGlobalAdmin) return true;
    if (entity.tenantId !== scope.tenantId) return false;

    if (scope.campusId && entity.campusId && entity.campusId !== scope.campusId) {
      return false;
    }

    return true;
  }
}
