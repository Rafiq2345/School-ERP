import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveAuthContext } from '@/lib/auth/server-auth';

const STANDARD_PROGRAMS = [
  { id: 'MATRIC', name: 'Matriculation (SSC / Matric)', board: 'BISE / National Boards' },
  { id: 'CAMBRIDGE', name: 'Cambridge International (CAIE - O/A Levels)', board: 'Cambridge Assessment' },
  { id: 'OXFORD_EDEXCEL', name: 'Oxford / Edexcel (Pearson)', board: 'Pearson Edexcel' },
  { id: 'AKU_EB', name: 'Aga Khan University Examination Board (AKU-EB)', board: 'AKU-EB' },
  { id: 'FBISE', name: 'Federal Board (FBISE)', board: 'FBISE Islamabad' },
  { id: 'INTERMEDIATE', name: 'Intermediate (HSSC / FSc / ICS / ICom / FA)', board: 'BIEK / BISE' },
  { id: 'IB', name: 'International Baccalaureate (IB - PYP / MYP / DP)', board: 'IB Organization' },
  { id: 'PRIMARY_ONLY', name: 'Early Childhood & Primary Foundation', board: 'Institutional' },
];

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const [categories, classes, sessions] = await Promise.all([
      prisma.classCategory.findMany({
        where: { tenantId: auth.tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.schoolClass.findMany({
        where: { tenantId: auth.tenantId, isActive: true },
        include: {
          classCategory: true,
          sections: { where: { isActive: true }, select: { id: true, name: true, capacity: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.academicSession.findMany({
        where: { tenantId: auth.tenantId },
        select: { id: true, name: true, code: true, isCurrent: true, status: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        academicPrograms: STANDARD_PROGRAMS,
        classCategories: categories,
        schoolClasses: classes,
        academicSessions: sessions,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch academic masters' } },
      { status: 500 }
    );
  }
}
