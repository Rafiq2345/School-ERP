import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';
import { checkRateLimit } from '@/lib/security/rate-limit';

const sendOtpSchema = z.object({
  userId: z.string().uuid('Invalid user ID.'),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`otp-send:${ip}`, 6, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many OTP requests. Please wait a moment before trying again.',
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = sendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid request payload.',
          },
        },
        { status: 422 }
      );
    }

    const tenantContext = resolveTenantFromRequest(req.headers);
    const tenantId = tenantContext.tenantId || 'tenant-sch-001';

    const result = await PasswordRecoveryService.generateOtp(
      tenantId,
      parseResult.data.userId,
      parseResult.data.channel,
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
          code: err.code || 'OTP_GENERATE_ERROR',
          message: err.message || 'Failed to generate verification code.',
        },
      },
      { status: err.statusCode || 400 }
    );
  }
}
