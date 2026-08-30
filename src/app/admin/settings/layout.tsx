import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';

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

export default function AdministrationSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell user={mockAdminUser} tenant={mockTenant} activePath="/admin/settings">
      {children}
    </AppShell>
  );
}
