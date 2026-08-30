// Core domain and foundation types

export type UserType = 'ADMIN' | 'EMPLOYEE' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export type SupportedLocale = 'en' | 'ur';

export type ProductTier = 'BASE' | 'STANDARD' | 'FULL' | 'ENTERPRISE';

export type PermissionAction =
  | 'VIEW'
  | 'CREATE'
  | 'EDIT'
  | 'DELETE'
  | 'APPROVE'
  | 'PRINT'
  | 'EXPORT'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'REVERSE';

export type ModuleCode =
  // Base ERP Core Modules
  | 'CONFIG'
  | 'SECURITY'
  | 'STUDENTS'
  | 'BILLING'
  | 'ATTENDANCE'
  | 'HOMEWORK'
  | 'EXAMS'
  | 'HR_PAYROLL'
  | 'COMMUNICATION'
  | 'REPORTS'
  | 'PUBLISHING'
  | 'AUDIT'
  // Optional / Advanced Enterprise Modules
  | 'ADMISSIONS'
  | 'ADVANCED_HR'
  | 'ADVANCED_PAYROLL'
  | 'ACCOUNTS'
  | 'BUDGET'
  | 'LIBRARY'
  | 'DIGITAL_LIBRARY'
  | 'INVENTORY'
  | 'FIXED_ASSETS'
  | 'PROCUREMENT'
  | 'SCHOOL_STORE'
  | 'BIOMETRIC_INTEGRATION'
  | 'CUSTOM_REPORT_DESIGNER';

export type ModuleCategory =
  | 'CORE'
  | 'ACADEMIC'
  | 'ADMINISTRATION'
  | 'FINANCE'
  | 'RESOURCES'
  | 'SYSTEM';

export interface FeatureDefinition {
  key: string;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  isBaseFeature: boolean;
  dependsOn?: string[];
}

export interface ModuleDefinition {
  code: ModuleCode;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  category: ModuleCategory;
  isBaseModule: boolean; // Always enabled in Base ERP
  defaultTiers: ProductTier[];
  basePath?: string;
  iconName?: string;
  dependsOn?: ModuleCode[];
  features?: FeatureDefinition[];
}

export type PublishingStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'ARCHIVED';

export type TargetAudience = 'ALL' | 'ADMIN' | 'TEACHER' | 'EMPLOYEE' | 'STUDENT' | 'PARENT';

export interface TenantContext {
  tenantId: string;
  tenantCode: string;
  schoolName: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  username: string;
  email: string | null;
  userType: UserType;
  preferredLocale: SupportedLocale;
  roles: string[];
  permissions: string[];
}

export interface SessionContext {
  sessionId: string;
  user: AuthenticatedUser;
  tenant: TenantContext;
}

/**
 * Unified Central Data Scope Architecture
 * Defines WHERE a request/query is permitted to operate.
 * Seamlessly handles single-campus today and multi-campus hierarchy in the future.
 */
export interface DataScope {
  // Current primary single-school / campus identifier
  tenantId: string;

  // Future enterprise hierarchy extension points (Optional / Nullable)
  organizationId?: string;
  headOfficeId?: string;
  regionId?: string;
  campusId?: string;

  // Active academic context
  academicSessionId?: string;

  // Scope permissions
  isGlobalAdmin?: boolean;
  permittedCampusIds?: string[];
}

export interface FeatureToggleConfig {
  moduleCode: ModuleCode;
  isEnabled: boolean;
  configOverrides?: Record<string, any>;
}
