import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string().min(8, 'Confirm password is required.'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();
    const parseResult = resetPasswordSchema.safeParse(body);

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

    const tenantContext = resolveTenantFromRequest(req.headers);
    const tenantId = tenantContext.tenantId || 'tenant-sch-001';

    const result = await PasswordRecoveryService.resetPasswordWithToken(
      tenantId,
      parseResult.data.token,
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
          code: err.code || 'RESET_PASSWORD_ERROR',
          message: err.message || 'Failed to reset password.',
        },
      },
      { status: err.statusCode || 400 }
    );
  }
}
