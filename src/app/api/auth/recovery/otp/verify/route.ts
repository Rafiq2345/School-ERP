import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';
import { checkRateLimit } from '@/lib/security/rate-limit';

const verifyOtpSchema = z.object({
  otpId: z.string().uuid('Invalid OTP session ID.'),
  otp: z.string().length(6, 'Verification code must be 6 digits.'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`otp-verify:${ip}`, 10, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification attempts. Please wait a minute.',
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid code format.',
          },
        },
        { status: 422 }
      );
    }

    const tenantContext = resolveTenantFromRequest(req.headers);
    const tenantId = tenantContext.tenantId || 'tenant-sch-001';

    const result = await PasswordRecoveryService.verifyOtp(
      tenantId,
      parseResult.data.otpId,
      parseResult.data.otp,
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
          code: err.code || 'OTP_VERIFY_ERROR',
          message: err.message || 'OTP verification failed.',
        },
      },
      { status: err.statusCode || 400 }
    );
  }
}
