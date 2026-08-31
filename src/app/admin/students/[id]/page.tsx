import React from 'react';
import { StudentProfile360View } from '@/components/admin/students/StudentProfile360View';

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentProfile360View studentId={id} />;
}
