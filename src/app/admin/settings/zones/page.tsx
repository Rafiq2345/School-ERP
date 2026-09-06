import React from 'react';
import { Metadata } from 'next';
import { ZonesView } from '@/components/admin/organization/ZonesView';

export const metadata: Metadata = {
  title: 'Zone / Area Management | School ERP',
  description: 'Cluster-level academic and operational zone management across regions or head offices.',
};

export default function ZonesPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ZonesView />
    </div>
  );
}
