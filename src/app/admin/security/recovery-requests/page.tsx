import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { RecoveryRequestsView } from '@/components/admin/security/RecoveryRequestsView';

export const metadata = {
  title: 'Password Recovery Requests | School-ERP Admin',
};

const mockAdminUser: AuthenticatedUser = {
  id: 'usr-admin-01',
  tenantId: 'tenant-sch-001',
  username: 'Principal Office',
  email: 'principal@greenwood.edu.pk',
  userType: 'ADMIN',
  preferredLocale: 'en',
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
};

const mockTenant: TenantContext = {
  tenantId: 'tenant-sch-001',
  tenantCode: 'SCH-001',
  schoolName: 'Greenwood International School',
};

export default function AdminRecoveryRequestsPage() {
  return (
    <AppShell user={mockAdminUser} tenant={mockTenant} activePath="/admin/security/recovery-requests">
      <div className="space-y-6">
        <RecoveryRequestsView />
      </div>
    </AppShell>
  );
}
