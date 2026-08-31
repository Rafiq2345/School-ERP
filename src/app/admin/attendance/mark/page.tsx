import React, { Suspense } from 'react';
import { DailyAttendanceMarkingView } from '@/components/admin/attendance/DailyAttendanceMarkingView';

export default function MarkAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading attendance marking workspace...</div>}>
      <DailyAttendanceMarkingView />
    </Suspense>
  );
}
