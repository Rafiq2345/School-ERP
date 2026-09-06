import { Metadata } from 'next';
import { RegionsView } from '@/components/admin/organization/RegionsView';

export const metadata: Metadata = {
  title: 'Region Management | School ERP',
  description: 'Manage territorial regions, geographical jurisdictions, leadership, and branch oversight.',
};

export default function RegionsPage() {
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <RegionsView />
    </div>
  );
}
