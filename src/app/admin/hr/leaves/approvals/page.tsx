import React from 'react';
import { LeaveManagementNav } from '@/components/admin/leaves/LeaveManagementNav';
import { LeaveApprovalsInboxView } from '@/components/admin/leaves/LeaveApprovalsInboxView';

export const metadata = {
  title: 'Leave Approval Inbox | Admin ERP',
};

export default function LeaveApprovalsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LeaveManagementNav />
      <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8">
        <LeaveApprovalsInboxView />
      </main>
    </div>
  );
}
