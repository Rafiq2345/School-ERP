import React from 'react';
import { StudentFormView } from '@/components/admin/students/StudentFormView';

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentFormView initialStudentId={id} />;
}
