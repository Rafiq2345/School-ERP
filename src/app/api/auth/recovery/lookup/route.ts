import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';
import { checkRateLimit } from '@/lib/security/rate-limit';

const lookupSchema = z.object({
  identifier: z.string().min(1, 'Please enter your username, email, or mobile number.').max(100),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`recovery-lookup:${ip}`, 10, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many recovery attempts. Please wait a minute before trying again.',
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = lookupSchema.safeParse(body);

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

    const result = await PasswordRecoveryService.lookupAccount(tenantId, parseResult.data.identifier);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code || 'RECOVERY_LOOKUP_ERROR',
          message: err.message || 'An error occurred during account lookup.',
        },
      },
      { status: err.statusCode || 422 }
    );
  }
}
