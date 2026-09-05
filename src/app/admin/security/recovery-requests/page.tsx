import React from 'react';
import { RecoveryRequestsView } from '@/components/admin/security/RecoveryRequestsView';

export const metadata = {
  title: 'Password Recovery Requests | School-ERP Admin',
};

export default function AdminRecoveryRequestsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <RecoveryRequestsView />
    </div>
  );
}
