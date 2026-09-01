import { LeaveManagementNav } from '@/components/admin/leaves/LeaveManagementNav';
import { CreateLeaveApplicationView } from '@/components/admin/leaves/CreateLeaveApplicationView';

export const metadata = {
  title: 'New Leave Application | School ERP',
  description: 'Create and submit employee leave application with live validation',
};

export default function NewLeaveApplicationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <CreateLeaveApplicationView />
      </main>
    </div>
  );
}
