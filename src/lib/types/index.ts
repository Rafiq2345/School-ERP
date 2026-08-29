// Core domain and foundation types

export type UserType = 'ADMIN' | 'EMPLOYEE' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export type SupportedLocale = 'en' | 'ur';

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
  | 'CONFIG'
  | 'SECURITY'
  | 'ADMISSIONS'
  | 'STUDENTS'
  | 'ACADEMICS'
  | 'ATTENDANCE'
  | 'BILLING'
  | 'EXAMS'
  | 'HR_PAYROLL'
  | 'ACCOUNTS'
  | 'LIBRARY'
  | 'INVENTORY'
  | 'COMMUNICATION'
  | 'PUBLISHING'
  | 'AUDIT';

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
