import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { MODULE_NAV_CONFIGS } from '@/lib/navigation/module-nav';
import { ChevronRight, ArrowRight } from 'lucide-react';

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

interface PageProps {
  params: Promise<{ module: string }>;
}

export default async function AdminModulePage({ params }: PageProps) {
  const resolvedParams = await params;
  const moduleParam = (resolvedParams?.module || '').toLowerCase();
  const config = MODULE_NAV_CONFIGS[moduleParam] || MODULE_NAV_CONFIGS['admissions'];
  const activePath = `/admin/${moduleParam}`;

  return (
    <AppShell user={mockAdminUser} tenant={mockTenant} activePath={activePath}>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600">
                Admin Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              <span className="font-semibold text-slate-800">{config.moduleName}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {config.moduleName} Management Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage operational workflows, view module audit trail, and generate {config.moduleName.toLowerCase()} reports.
            </p>
          </div>
        </div>

        {/* Workflow Action Grid */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            {config.moduleName} Workflows & Sub-Navigation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {config.items.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === config.items.length - 1;

              let cardStyle = 'border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40';
              let iconStyle = 'bg-blue-100/80 text-blue-700 group-hover:bg-blue-600 group-hover:text-white';
              let textStyle = 'text-slate-800 group-hover:text-blue-700';
              let arrowStyle = 'text-slate-400 group-hover:text-blue-600';

              if (isLast) {
                cardStyle = 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/60';
                iconStyle = 'bg-indigo-600 text-white';
                textStyle = 'text-indigo-900';
                arrowStyle = 'text-indigo-600';
              } else if (item.isAudit) {
                cardStyle = 'border-amber-200 bg-amber-50/30 hover:bg-amber-100/50';
                iconStyle = 'bg-amber-500 text-white';
                textStyle = 'text-amber-900';
                arrowStyle = 'text-amber-600';
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-3 group ${cardStyle}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${iconStyle}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${textStyle}`}>
                      {item.label}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {isLast
                        ? `Categorized & filterable ${config.moduleName.toLowerCase()} analytics`
                        : item.isAudit
                        ? `Complete activity & audit log for ${config.moduleName.toLowerCase()}`
                        : `Access ${item.label.toLowerCase()} actions and records`}
                    </p>
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 mt-0.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 ${arrowStyle}`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
