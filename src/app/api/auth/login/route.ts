import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { getAuthorizedDashboardRoute } from '@/lib/auth/router';
import { generateSessionToken, hashSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_HOURS } from '@/lib/auth/session';
import { UserType } from '@/lib/types';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or Email is required').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

// Demo/Seed User Registry for Phase 2 Foundation Authentication
// (Maps credentials to canonical user records and backend userType)
const MOCK_USER_REGISTRY: Record<
  string,
  { password: string; userType: UserType; name: string }
> = {
  admin: { password: 'password123', userType: 'ADMIN', name: 'Principal Office' },
  'principal@greenwood.edu.pk': { password: 'password123', userType: 'ADMIN', name: 'Principal Office' },
  teacher: { password: 'password123', userType: 'TEACHER', name: 'Ms. Fatima Tariq' },
  'fatima.tariq@greenwood.edu.pk': { password: 'password123', userType: 'TEACHER', name: 'Ms. Fatima Tariq' },
  staff: { password: 'password123', userType: 'EMPLOYEE', name: 'Ahmed Khan' },
  'ahmed.khan@greenwood.edu.pk': { password: 'password123', userType: 'EMPLOYEE', name: 'Ahmed Khan' },
  student: { password: 'password123', userType: 'STUDENT', name: 'Ali Rafiq' },
  'ali.rafiq@student.greenwood.edu.pk': { password: 'password123', userType: 'STUDENT', name: 'Ali Rafiq' },
  parent: { password: 'password123', userType: 'PARENT', name: 'Choudhary Rafiq' },
  'choudharyrafiq79@gmail.com': { password: 'password123', userType: 'PARENT', name: 'Choudhary Rafiq' },
};

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`login:${ip}`, 5, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many login attempts. Please wait ${Math.ceil(rateLimit.resetTimeMs / 1000)} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid input payload',
          },
        },
        { status: 422 }
      );
    }

    const { usernameOrEmail, password } = parseResult.data;

    // 1. Resolve tenant securely from server context (never from user input)
    const tenantContext = resolveTenantFromRequest(req.headers);

    // 2. Authenticate user credentials
    const lookupKey = usernameOrEmail.toLowerCase().trim();
    const userRecord = MOCK_USER_REGISTRY[lookupKey];

    if (!userRecord || userRecord.password !== password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username/email or password.',
          },
        },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(`login:${ip}`);

    // 3. Determine authorized dashboard route strictly from server-side user record
    const redirectUrl = getAuthorizedDashboardRoute(userRecord.userType);

    // 4. Generate session token
    const rawSessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawSessionToken);

    const response = NextResponse.json({
      success: true,
      data: {
        username: userRecord.name,
        userType: userRecord.userType,
        tenant: tenantContext,
        redirectUrl,
      },
    });

    // 5. Set secure HttpOnly session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: rawSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION_HOURS * 3600,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during authentication.',
        },
      },
      { status: 500 }
    );
  }
}

