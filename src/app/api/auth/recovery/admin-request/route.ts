import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';
import { checkRateLimit } from '@/lib/security/rate-limit';

const adminRequestSchema = z.object({
  identifierProvided: z.string().min(1, 'Please provide your account identifier.'),
  contactType: z.enum(['MOBILE', 'EMAIL', 'OTHER']).optional(),
  contactValue: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`admin-recovery-req:${ip}`, 5, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests submitted. Please wait a few minutes.',
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = adminRequestSchema.safeParse(body);

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

    const result = await PasswordRecoveryService.createAdminVerificationRequest(
      tenantId,
      parseResult.data,
      {
        ip,
        userAgent: req.headers.get('user-agent') || 'Unknown',
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
          code: err.code || 'ADMIN_REQUEST_ERROR',
          message: err.message || 'Failed to submit verification request.',
        },
      },
      { status: err.statusCode || 422 }
    );
  }
}
