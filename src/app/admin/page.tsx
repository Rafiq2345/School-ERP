import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { AdminDashboardView } from '@/components/admin/dashboard/AdminDashboardView';

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

export const metadata = {
  title: 'School Dashboard | Admin ERP',
  description: 'Enterprise school management and administration overview',
};

export default function AdminDashboardPage() {
  return (
    <AppShell user={mockAdminUser} tenant={mockTenant} activePath="/admin">
      <AdminDashboardView />
    </AppShell>
  );
}
