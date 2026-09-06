import React, { Suspense } from 'react';
import { HeadOfficesView } from '@/components/admin/organization/HeadOfficesView';
import { RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Head Office Management | School ERP Administration',
  description: 'Manage institutional Head Offices, executive secretariats, and governing leadership.',
};

export default function HeadOfficesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
          <p className="text-xs font-semibold">Loading Head Office Management...</p>
        </div>
      }
    >
      <HeadOfficesView />
    </Suspense>
  );
}

