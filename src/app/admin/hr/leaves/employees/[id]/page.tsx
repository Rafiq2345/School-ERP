import { EmployeeLeaveDetailView } from '@/components/admin/leaves/EmployeeLeaveDetailView';

export default async function EmployeeLeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeLeaveDetailView employeeId={id} />;
}
