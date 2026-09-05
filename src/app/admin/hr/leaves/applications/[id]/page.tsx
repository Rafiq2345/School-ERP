import { LeaveManagementNav } from '@/components/admin/leaves/LeaveManagementNav';
import { LeaveApplicationDetailView } from '@/components/admin/leaves/LeaveApplicationDetailView';

export const metadata = {
  title: 'Leave Application Details | School ERP',
  description: 'View leave application details, scheduled shifts, and balance snapshots',
};

export default async function LeaveApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeaveApplicationDetailView applicationId={id} />
      </main>
    </div>
  );
}
