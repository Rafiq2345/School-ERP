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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        <LeaveWorkflowsView />
      </main>
    </div>
  );
}
