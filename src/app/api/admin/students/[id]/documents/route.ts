import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/lib/services/student-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { documentType, title, documentUrl, fileSize, mimeType } = body;

    if (!title || !documentUrl) {
      return NextResponse.json(
        { success: false, error: { message: 'Title and document URL are required.' } },
        { status: 400 }
      );
    }

    const doc = await StudentService.addStudentDocument(
      auth.tenantId,
      id,
      {
        documentType: documentType || 'OTHER',
        title,
        documentUrl,
        fileSize,
        mimeType,
      },
      auth.userId
    );

    return NextResponse.json({ success: true, data: doc });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to add student document.' } },
      { status: 400 }
    );
  }
}
