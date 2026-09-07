'use client';

import React, { Suspense } from 'react';
import { BranchesView } from '@/components/admin/organization/BranchesView';
import { RefreshCw } from 'lucide-react';

export default function BranchesSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading Branches & Campuses...</p>
        </div>
      }
    >
      <BranchesView />
    </Suspense>
  );
}
