import React from 'react';
import { LeaveManagementNav } from '@/components/admin/leaves/LeaveManagementNav';
import { LeaveWorkflowsView } from '@/components/admin/leaves/LeaveWorkflowsView';

export const metadata = {
  title: 'Leave Approval Workflows | Admin ERP',
};

export default function LeaveWorkflowsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LeaveManagementNav />
      <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8">
        <LeaveWorkflowsView />
      </main>
    </div>
  );
}
