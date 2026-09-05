import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthContext } from '@/lib/auth/server-auth';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';

const reviewSchema = z.object({
  action: z.enum(['GENERATE_TEMP_PASSWORD', 'UPDATE_PHONE', 'APPROVE_RESET_TOKEN', 'REJECT']),
  newPhone: z.string().optional(),
  adminComments: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await resolveAuthContext(req);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const requestId = resolvedParams.id;

    const body = await req.json();
    const parseResult = reviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid input payload.',
          },
        },
        { status: 422 }
      );
    }

    const result = await PasswordRecoveryService.reviewAdminVerificationRequest(
      authContext.tenantId,
      requestId,
      parseResult.data.action,
      authContext.userId,
      {
        newPhone: parseResult.data.newPhone,
        adminComments: parseResult.data.adminComments,
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code || 'REVIEW_ERROR',
          message: err.message || 'Failed to review recovery request.',
        },
      },
      { status: err.statusCode || 422 }
    );
  }
}
