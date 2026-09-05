import { LeaveManagementNav } from '@/components/admin/leaves/LeaveManagementNav';
import { LeaveApplicationsListView } from '@/components/admin/leaves/LeaveApplicationsListView';

export const metadata = {
  title: 'Employee Leave Applications | School ERP',
  description: 'Manage employee leave requests, multi-shift duty scheduling, and balance tracking',
};

export default function LeaveApplicationsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeaveApplicationsListView />
      </main>
    </div>
  );
}
