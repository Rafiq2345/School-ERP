import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthContext } from '@/lib/auth/server-auth';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
  confirmPassword: z.string().min(8, 'Confirm password is required.'),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await resolveAuthContext(req);
    if (!authContext) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to change your password.',
          },
        },
        { status: 401 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();
    const parseResult = changePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid input.',
          },
        },
        { status: 422 }
      );
    }

    const result = await PasswordRecoveryService.changePassword(
      authContext.tenantId,
      authContext.userId,
      parseResult.data.currentPassword,
      parseResult.data.newPassword,
      parseResult.data.confirmPassword,
      ip
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
          code: err.code || 'CHANGE_PASSWORD_ERROR',
          message: err.message || 'Failed to change password.',
        },
      },
      { status: err.statusCode || 400 }
    );
  }
}
