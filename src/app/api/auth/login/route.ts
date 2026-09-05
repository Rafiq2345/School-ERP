import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import { resolveTenantFromRequest } from '@/lib/tenant/resolver';
import { getAuthorizedDashboardRoute } from '@/lib/auth/router';
import { generateSessionToken, hashSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_HOURS, computeFailedLoginState, checkAccountLockout } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';
import { UserType } from '@/lib/types';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or Email is required').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

// Demo/Seed User Registry for fallback/seed authentication
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
    const lookupKey = usernameOrEmail.toLowerCase().trim();

    // 1. Resolve tenant securely from server context
    const tenantContext = resolveTenantFromRequest(req.headers);
    const tenantId = tenantContext.tenantId || 'tenant-sch-001';

    // 2. Check Database Users first
    let dbUser = await prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          { username: { equals: lookupKey, mode: 'insensitive' } },
          { email: { equals: lookupKey, mode: 'insensitive' } },
          { phone: usernameOrEmail.trim() },
        ],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (dbUser) {
      // Check lockout status
      try {
        checkAccountLockout({
          status: dbUser.status,
          lockoutUntil: dbUser.lockoutUntil,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ACCOUNT_LOCKED',
              message: err.message || 'Account is currently locked.',
            },
          },
          { status: 403 }
        );
      }

      // Verify Password Hash
      const isPasswordValid = await verifyPassword(password, dbUser.passwordHash);

      if (!isPasswordValid) {
        // Failed attempt handling
        const lockoutState = computeFailedLoginState(dbUser.failedLoginAttempts);
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            failedLoginAttempts: lockoutState.newAttempts,
            status: lockoutState.newStatus,
            lockoutUntil: lockoutState.lockoutUntil,
          },
        });

        const remaining = 5 - lockoutState.newAttempts;
        const msg = lockoutState.newStatus === 'LOCKED'
          ? 'Account is locked due to too many failed attempts. Try again in 15 minutes.'
          : `Invalid credentials. ${remaining > 0 ? remaining + ' attempt(s) remaining.' : ''}`;

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: msg,
            },
          },
          { status: 401 }
        );
      }

      // Successful password match -> reset failed attempts
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastLoginAt: new Date(),
        },
      });

      resetRateLimit(`login:${ip}`);

      // Determine redirect URL
      let redirectUrl = getAuthorizedDashboardRoute(dbUser.userType as UserType);
      if (dbUser.mustChangePassword) {
        redirectUrl = '/change-password';
      }

      // Generate session token and store in DB
      const rawSessionToken = generateSessionToken();
      const tokenHash = hashSessionToken(rawSessionToken);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000);

      await prisma.userSession.create({
        data: {
          tenantId,
          userId: dbUser.id,
          tokenHash,
          expiresAt,
          ipAddress: ip,
          userAgent: req.headers.get('user-agent') || 'Unknown',
        },
      });

      const response = NextResponse.json({
        success: true,
        data: {
          userId: dbUser.id,
          username: dbUser.username,
          userType: dbUser.userType,
          mustChangePassword: dbUser.mustChangePassword,
          tenant: tenantContext,
          redirectUrl,
        },
      });

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
    }

    // 3. Fallback for mock/seed demo users when not in DB
    const mockUser = MOCK_USER_REGISTRY[lookupKey];
    if (!mockUser || mockUser.password !== password) {
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

    resetRateLimit(`login:${ip}`);
    const redirectUrl = getAuthorizedDashboardRoute(mockUser.userType);
    const rawSessionToken = generateSessionToken();

    const response = NextResponse.json({
      success: true,
      data: {
        username: mockUser.name,
        userType: mockUser.userType,
        mustChangePassword: false,
        tenant: tenantContext,
        redirectUrl,
      },
    });

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
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'An unexpected error occurred during authentication.',
        },
      },
      { status: 500 }
    );
  }
}
