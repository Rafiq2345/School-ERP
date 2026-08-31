import { NextRequest, NextResponse } from 'next/server';
import { FormAnalyzerService } from '@/lib/services/form-analyzer-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const { fileName, fileType, rawContentText, templatePreset } = body;

    const result = await FormAnalyzerService.analyzeFormDocument(
      auth.tenantId,
      {
        fileName: fileName || 'Uploaded_School_Admission_Form.pdf',
        fileType: fileType || 'application/pdf',
        rawContentText,
        templatePreset,
      },
      auth.userId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to analyze school form' } },
      { status: 400 }
    );
  }
}
