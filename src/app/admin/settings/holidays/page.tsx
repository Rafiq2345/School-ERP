import React, { Suspense } from 'react';
import { SchoolHolidaysView } from '@/components/admin/config/SchoolHolidaysView';

export default function HolidaysSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading school calendar & holidays...</div>}>
      <SchoolHolidaysView />
    </Suspense>
  );
}
