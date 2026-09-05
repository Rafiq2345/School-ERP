import { randomInt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateSessionToken, hashSessionToken } from '@/lib/auth/session';
import { ValidationError, NotFoundError, UnauthorizedError, ConflictError, RateLimitError } from '@/lib/errors/app-error';
import { CommunicationGatewayService, RecoveryChannelType } from './communication-gateway-service';
import { validatePakistanMobile, validateEmail, validateAccountIdentifier } from '@/lib/validation/auth-validation';

export interface MaskedChannelDto {
  channel: RecoveryChannelType;
  recipientMasked: string;
  isAvailable: boolean;
  statusNote?: string;
}

export interface AccountLookupResultDto {
  success: boolean;
  message: string;
  maskedChannels: MaskedChannelDto[];
  canRequestAdminVerification: boolean;
  recoveryUserId?: string; // Masked/omitted in public responses or passed via encrypted/hashed intent
}

export interface GenerateOtpResultDto {
  otpId: string;
  channel: RecoveryChannelType;
  recipientMasked: string;
  expiresAt: Date;
  resendCooldownUntil: Date;
  providerStatus: string;
  message: string;
  testOtp?: string; // ONLY populated in NODE_ENV === 'test'
}

export interface VerifyOtpResultDto {
  success: boolean;
  resetToken: string;
  expiresAt: Date;
  message: string;
}

export class PasswordRecoveryService {
  /**
   * Helper to mask a mobile number, e.g., '+92-300-1234567' -> '******4567' or '03001234567' -> '******4567'
   */
  static maskPhone(phone: string): string {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length <= 4) return '****';
    const lastFour = cleaned.slice(-4);
    return `******${lastFour}`;
  }

  /**
   * Helper to mask an email address, e.g., 'choudharyrafiq79@gmail.com' -> 'c***9@gmail.com'
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '****@domain.com';
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Step 1: Identifier Lookup
   * Performs a non-enumerating lookup across username, email, phone, recoveryMobile,
   * student admission number, or employee number.
   * ALWAYS returns a neutral, non-disclosing message.
   */
  static async lookupAccount(tenantId: string, identifier: string): Promise<AccountLookupResultDto> {
    const idValidation = validateAccountIdentifier(identifier);
    if (!idValidation.isValid) {
      throw new ValidationError(idValidation.error || 'Please enter a valid account identifier.');
    }

    const cleanId = idValidation.normalized;
    const lowerId = cleanId.toLowerCase();

    // Prepare candidate phone variations for future-proof matching (+923001234567 <-> 03001234567)
    const phoneVariations: string[] = [cleanId];
    if (idValidation.type === 'MOBILE') {
      if (cleanId.startsWith('03')) {
        phoneVariations.push('+92' + cleanId.slice(1));
        phoneVariations.push('92' + cleanId.slice(1));
      } else if (cleanId.startsWith('+923')) {
        phoneVariations.push('0' + cleanId.slice(3));
      }
    }

    // 1. Check User table
    const userOrConditions: any[] = [
      { username: { equals: lowerId, mode: 'insensitive' } },
    ];

    if (idValidation.type === 'EMAIL') {
      userOrConditions.push({ email: { equals: lowerId, mode: 'insensitive' } });
    } else if (idValidation.type === 'MOBILE') {
      for (const p of phoneVariations) {
        userOrConditions.push({ phone: p });
        userOrConditions.push({ recoveryMobile: p });
      }
    } else {
      userOrConditions.push({ email: { equals: lowerId, mode: 'insensitive' } });
    }

    let user = await prisma.user.findFirst({
      where: {
        tenantId,
        OR: userOrConditions,
      },
    });

    // 2. If not directly found, check linked Employee
    if (!user) {
      const empOrConditions: any[] = [
        { employeeNo: { equals: cleanId, mode: 'insensitive' } },
      ];
      if (idValidation.type === 'EMAIL') {
        empOrConditions.push({ email: { equals: lowerId, mode: 'insensitive' } });
      } else if (idValidation.type === 'MOBILE') {
        for (const p of phoneVariations) {
          empOrConditions.push({ phone: p });
        }
      }

      const employee = await prisma.employee.findFirst({
        where: {
          tenantId,
          OR: empOrConditions,
        },
        include: { user: true },
      });
      if (employee?.user) {
        user = employee.user;
      }
    }

    // 3. If not found, check linked Student / Guardian
    if (!user) {
      const stuOrConditions: any[] = [
        { admissionNo: { equals: cleanId, mode: 'insensitive' } },
      ];
      if (idValidation.type === 'MOBILE') {
        for (const p of phoneVariations) {
          stuOrConditions.push({ primaryContactPhone: p });
        }
      }

      const student = await prisma.student.findFirst({
        where: {
          tenantId,
          OR: stuOrConditions,
        },
        include: {
          guardians: {
            include: {
              guardian: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (student?.guardians?.[0]?.guardian?.user) {
        user = student.guardians[0].guardian.user;
      }
    }

    // Neutral Response if no active user exists
    if (!user || user.status === 'INACTIVE') {
      return {
        success: true,
        message: 'If the provided information matches an active account, recovery options are available.',
        maskedChannels: [],
        canRequestAdminVerification: true,
      };
    }

    // Build eligible masked channels from verified / registered contacts
    const maskedChannels: MaskedChannelDto[] = [];

    const mobile = user.recoveryMobile || user.phone;
    if (mobile) {
      const masked = this.maskPhone(mobile);
      maskedChannels.push({
        channel: 'SMS',
        recipientMasked: masked,
        isAvailable: true,
      });

      maskedChannels.push({
        channel: 'WHATSAPP',
        recipientMasked: masked,
        isAvailable: true,
      });
    }

    if (user.email) {
      maskedChannels.push({
        channel: 'EMAIL',
        recipientMasked: this.maskEmail(user.email),
        isAvailable: true,
      });
    }

    return {
      success: true,
      message: 'If the provided information matches an active account, recovery options are available.',
      maskedChannels,
      canRequestAdminVerification: true,
      recoveryUserId: user.id,
    };
  }

  /**
   * Step 2: Generate & Dispatch OTP
   * Only dispatches to contacts already stored against the user account.
   */
  static async generateOtp(
    tenantId: string,
    userId: string,
    channel: RecoveryChannelType,
    ipAddress?: string
  ): Promise<GenerateOtpResultDto> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || user.status === 'INACTIVE') {
      throw new NotFoundError('Account could not be verified for recovery.');
    }

    // Determine target contact
    let rawRecipient = '';
    let maskedRecipient = '';

    if (channel === 'SMS' || channel === 'WHATSAPP') {
      rawRecipient = user.recoveryMobile || user.phone || '';
      if (!rawRecipient) {
        throw new ValidationError(`No registered phone number found for ${channel} recovery.`);
      }
      maskedRecipient = this.maskPhone(rawRecipient);
    } else if (channel === 'EMAIL') {
      rawRecipient = user.email || '';
      if (!rawRecipient) {
        throw new ValidationError('No registered email address found for email recovery.');
      }
      maskedRecipient = this.maskEmail(rawRecipient);
    }

    // Check active cooldown on recent OTP
    const recentOtp = await prisma.passwordRecoveryOtp.findFirst({
      where: {
        tenantId,
        userId,
        isInvalidated: false,
        usedAt: null,
        resendCooldownUntil: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const remainingSeconds = Math.ceil((recentOtp.resendCooldownUntil.getTime() - Date.now()) / 1000);
      throw new RateLimitError(`Please wait ${remainingSeconds} second(s) before requesting a new code.`);
    }

    // Invalidate previous pending OTPs
    await prisma.passwordRecoveryOtp.updateMany({
      where: {
        tenantId,
        userId,
        isInvalidated: false,
        usedAt: null,
      },
      data: { isInvalidated: true },
    });

    // Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = randomInt(100000, 999999).toString();
    const otpHash = hashSessionToken(rawOtp);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds

    const record = await prisma.passwordRecoveryOtp.create({
      data: {
        tenantId,
        userId,
        channel,
        recipientMasked: maskedRecipient,
        otpHash,
        expiresAt,
        resendCooldownUntil,
      },
    });

    // Dispatch via communication gateway
    const dispatchResult = await CommunicationGatewayService.dispatchOtp({
      tenantId,
      channel,
      recipient: rawRecipient,
      maskedRecipient,
      otp: rawOtp,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        module: 'SECURITY',
        entityType: 'PASSWORD_RECOVERY_OTP',
        entityId: record.id,
        action: 'CREATE',
        ipAddress: ipAddress || '127.0.0.1',
        changeSummary: `Generated password recovery OTP via ${channel} for user ${user.username} (${maskedRecipient})`,
      },
    });

    return {
      otpId: record.id,
      channel,
      recipientMasked: maskedRecipient,
      expiresAt,
      resendCooldownUntil,
      providerStatus: dispatchResult.providerStatus,
      message: dispatchResult.message,
      testOtp: process.env.NODE_ENV === 'test' ? rawOtp : undefined,
    };
  }

  /**
   * Step 3: Verify OTP & Exchange for Password Reset Token
   */
  static async verifyOtp(
    tenantId: string,
    otpId: string,
    candidateOtp: string,
    ipAddress?: string
  ): Promise<VerifyOtpResultDto> {
    const cleanOtp = candidateOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new ValidationError('Please enter a valid 6-digit verification code.');
    }

    const otpRecord = await prisma.passwordRecoveryOtp.findFirst({
      where: { id: otpId, tenantId },
      include: { user: true },
    });

    if (!otpRecord || otpRecord.isInvalidated || otpRecord.usedAt) {
      throw new ValidationError('Invalid or expired verification session. Please request a new code.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.passwordRecoveryOtp.update({
        where: { id: otpId },
        data: { isInvalidated: true },
      });
      throw new ValidationError('Verification code has expired. Please request a new code.');
    }

    if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
      await prisma.passwordRecoveryOtp.update({
        where: { id: otpId },
        data: { isInvalidated: true },
      });
      throw new ValidationError('Maximum verification attempts exceeded. Please request a new code.');
    }

    const candidateHash = hashSessionToken(cleanOtp);
    const isValid = candidateHash === otpRecord.otpHash;

    if (!isValid) {
      const newAttempts = otpRecord.attemptsCount + 1;
      const isLockedOut = newAttempts >= otpRecord.maxAttempts;

      await prisma.passwordRecoveryOtp.update({
        where: { id: otpId },
        data: {
          attemptsCount: newAttempts,
          isInvalidated: isLockedOut,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: otpRecord.userId,
          module: 'SECURITY',
          entityType: 'PASSWORD_RECOVERY_OTP',
          entityId: otpRecord.id,
          action: 'UPDATE',
          ipAddress: ipAddress || '127.0.0.1',
          changeSummary: `Failed OTP attempt (${newAttempts}/${otpRecord.maxAttempts}) for user ${otpRecord.user.username}`,
        },
      });

      if (isLockedOut) {
        throw new ValidationError('Maximum verification attempts exceeded. Please request a new code.');
      }

      const remaining = otpRecord.maxAttempts - newAttempts;
      throw new ValidationError(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
    }

    // Generate single-use password reset token
    const rawResetToken = generateSessionToken();
    const resetTokenHash = hashSessionToken(rawResetToken);
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create PasswordResetToken record
    await prisma.passwordResetToken.create({
      data: {
        tenantId,
        userId: otpRecord.userId,
        tokenHash: resetTokenHash,
        expiresAt: tokenExpiresAt,
      },
    });

    // Mark OTP used
    await prisma.passwordRecoveryOtp.update({
      where: { id: otpId },
      data: {
        usedAt: new Date(),
        resetTokenHash,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: otpRecord.userId,
        module: 'SECURITY',
        entityType: 'PASSWORD_RECOVERY_OTP',
        entityId: otpRecord.id,
        action: 'APPROVE',
        ipAddress: ipAddress || '127.0.0.1',
        changeSummary: `OTP successfully verified for user ${otpRecord.user.username}. Reset token issued.`,
      },
    });

    return {
      success: true,
      resetToken: rawResetToken,
      expiresAt: tokenExpiresAt,
      message: 'Code verified successfully. Please set your new password.',
    };
  }

  /**
   * Step 4: Reset Password with Verified Token
   */
  static async resetPasswordWithToken(
    tenantId: string,
    resetToken: string,
    newPassword: string,
    confirmPassword?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    if (confirmPassword && newPassword !== confirmPassword) {
      throw new ValidationError('New password and confirm password do not match.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long.');
    }

    const tokenHash = hashSessionToken(resetToken);

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        tenantId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord || !tokenRecord.user) {
      throw new ValidationError('Invalid or expired password reset token. Please restart password recovery.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Update user password and clear lockout / temp status
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: {
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    // Invalidate reset token immediately
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all active sessions for security
    await prisma.userSession.updateMany({
      where: { userId: tokenRecord.userId, tenantId },
      data: { isRevoked: true },
    });

    // Invalidate any remaining open OTPs
    await prisma.passwordRecoveryOtp.updateMany({
      where: { userId: tokenRecord.userId, tenantId, isInvalidated: false },
      data: { isInvalidated: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: tokenRecord.userId,
        module: 'SECURITY',
        entityType: 'USER_PASSWORD',
        entityId: tokenRecord.userId,
        action: 'UPDATE',
        ipAddress: ipAddress || '127.0.0.1',
        changeSummary: `Password reset successfully completed for user ${tokenRecord.user.username}. All existing sessions revoked.`,
      },
    });

    return {
      success: true,
      message: 'Your password has been successfully reset. Please log in with your new password.',
    };
  }

  /**
   * Step 5: Force Password Change (for accounts with mustChangePassword = true)
   */
  static async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    if (confirmPassword && newPassword !== confirmPassword) {
      throw new ValidationError('New password and confirm password do not match.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long.');
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new ValidationError('Current password is incorrect.');
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from your temporary/current password.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        module: 'SECURITY',
        entityType: 'USER_PASSWORD',
        entityId: userId,
        action: 'UPDATE',
        ipAddress: ipAddress || '127.0.0.1',
        changeSummary: `Password change completed for user ${user.username} (cleared mustChangePassword).`,
      },
    });

    return {
      success: true,
      message: 'Password changed successfully.',
    };
  }

  /**
   * Step 6: Create Admin Verification Fallback Request
   */
  static async createAdminVerificationRequest(
    tenantId: string,
    data: {
      identifierProvided: string;
      contactType?: string;
      contactValue?: string;
      reason?: string;
    },
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; requestId: string; message: string }> {
    const idValidation = validateAccountIdentifier(data.identifierProvided);
    if (!idValidation.isValid) {
      throw new ValidationError(idValidation.error || 'Please provide your username, registration ID, or employee code.');
    }
    const cleanId = idValidation.normalized;

    let cleanContactValue: string | null = null;
    const contactType = data.contactType || 'MOBILE';

    if (data.contactValue && data.contactValue.trim()) {
      const rawVal = data.contactValue.trim();
      if (contactType === 'EMAIL') {
        const emailValidation = validateEmail(rawVal);
        if (!emailValidation.isValid) {
          throw new ValidationError(emailValidation.error || 'Enter a valid email address.');
        }
        cleanContactValue = emailValidation.normalized!;
      } else {
        const mobileValidation = validatePakistanMobile(rawVal);
        if (!mobileValidation.isValid) {
          throw new ValidationError(mobileValidation.error || 'Enter a valid 11-digit mobile number (e.g. 03001234567).');
        }
        cleanContactValue = mobileValidation.normalized!;
      }
    } else if (contactType === 'MOBILE') {
      throw new ValidationError('Enter a valid 11-digit mobile number (e.g. 03001234567).');
    }

    // Non-blocking lookup to link userId if safely resolvable
    const lookup = await this.lookupAccount(tenantId, cleanId);
    const userId = lookup.recoveryUserId || null;

    const request = await prisma.passwordRecoveryRequest.create({
      data: {
        tenantId,
        userId,
        identifierProvided: cleanId,
        contactType,
        contactValue: cleanContactValue,
        reason: data.reason ? data.reason.trim() : 'Unable to access registered recovery contact',
        status: 'PENDING',
        requesterIp: metadata?.ip || '127.0.0.1',
        requesterUserAgent: metadata?.userAgent || 'Unknown',
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || undefined,
        module: 'SECURITY',
        entityType: 'PASSWORD_RECOVERY_REQUEST',
        entityId: request.id,
        action: 'CREATE',
        ipAddress: metadata?.ip || '127.0.0.1',
        changeSummary: `Admin recovery verification request submitted for identifier "${cleanId}" (Ticket #${request.id.slice(0, 8)})`,
      },
    });

    return {
      success: true,
      requestId: request.id,
      message: 'Your verification request has been submitted. The school administration will verify your identity using official school records.',
    };
  }

  /**
   * Step 7: List Admin Recovery Requests
   */
  static async listAdminRecoveryRequests(
    tenantId: string,
    filters?: { status?: string; search?: string }
  ) {
    const whereClause: any = { tenantId };

    if (filters?.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    if (filters?.search) {
      whereClause.OR = [
        { identifierProvided: { contains: filters.search, mode: 'insensitive' } },
        { contactValue: { contains: filters.search, mode: 'insensitive' } },
        { reason: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const requests = await prisma.passwordRecoveryRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            recoveryMobile: true,
            userType: true,
            status: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  /**
   * Step 8: Review Admin Recovery Request
   * Actions: GENERATE_TEMP_PASSWORD | UPDATE_PHONE | APPROVE_RESET_TOKEN | REJECT
   */
  static async reviewAdminVerificationRequest(
    tenantId: string,
    requestId: string,
    action: 'GENERATE_TEMP_PASSWORD' | 'UPDATE_PHONE' | 'APPROVE_RESET_TOKEN' | 'REJECT',
    adminUserId: string,
    options?: {
      newPhone?: string;
      adminComments?: string;
    }
  ) {
    const request = await prisma.passwordRecoveryRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundError('Recovery request not found.');
    }

    if (request.status === 'COMPLETED' || request.status === 'REJECTED') {
      throw new ConflictError(`This recovery request has already been finalized with status: ${request.status}.`);
    }

    // Action 1: Generate Temporary Password
    if (action === 'GENERATE_TEMP_PASSWORD') {
      let targetUser = request.user;

      if (!targetUser) {
        // Try to re-resolve target user
        const lookup = await this.lookupAccount(tenantId, request.identifierProvided);
        if (lookup.recoveryUserId) {
          targetUser = await prisma.user.findFirst({ where: { id: lookup.recoveryUserId, tenantId } });
        }
      }

      if (!targetUser) {
        throw new ValidationError('Cannot generate temporary password: No registered user account is linked to this request identifier.');
      }

      // Generate random temporary password
      const randomSuffix = randomInt(1000, 9999);
      const temporaryPassword = `TempPass@${randomSuffix}`;
      const tempHash = await hashPassword(temporaryPassword);

      // Update user with mustChangePassword = true
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash: tempHash,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockoutUntil: null,
          status: targetUser.status === 'LOCKED' ? 'ACTIVE' : targetUser.status,
          updatedAt: new Date(),
        },
      });

      // Revoke any existing active sessions
      await prisma.userSession.updateMany({
        where: { userId: targetUser.id, tenantId },
        data: { isRevoked: true },
      });

      // Finalize request
      await prisma.passwordRecoveryRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          temporaryPasswordGenerated: true,
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          adminComments: options?.adminComments || 'Identity verified; temporary password generated.',
        },
      });

      // Audit log (NEVER logs plain-text password)
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: adminUserId,
          module: 'SECURITY',
          entityType: 'PASSWORD_RECOVERY_REQUEST',
          entityId: requestId,
          action: 'APPROVE',
          changeSummary: `Admin generated temporary password for user ${targetUser.username} (enforced mustChangePassword=true).`,
        },
      });

      return {
        success: true,
        temporaryPassword,
        username: targetUser.username,
        message: `Temporary password generated for ${targetUser.username}. The user will be required to change it upon next login.`,
      };
    }

    // Action 2: Update Recovery Phone
    if (action === 'UPDATE_PHONE') {
      if (!options?.newPhone || !options.newPhone.trim()) {
        throw new ValidationError('Enter a valid 11-digit mobile number (e.g. 03001234567).');
      }

      const mobileValidation = validatePakistanMobile(options.newPhone);
      if (!mobileValidation.isValid) {
        throw new ValidationError(mobileValidation.error || 'Enter a valid 11-digit mobile number (e.g. 03001234567).');
      }

      const cleanPhone = mobileValidation.normalized!;

      let targetUser = request.user;
      if (!targetUser) {
        const lookup = await this.lookupAccount(tenantId, request.identifierProvided);
        if (lookup.recoveryUserId) {
          targetUser = await prisma.user.findFirst({ where: { id: lookup.recoveryUserId, tenantId } });
        }
      }

      if (!targetUser) {
        throw new ValidationError('Cannot update phone: No registered user account is linked to this request identifier.');
      }

      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          recoveryMobile: cleanPhone,
          phone: cleanPhone,
          isMobileVerified: true,
          updatedAt: new Date(),
        },
      });

      await prisma.passwordRecoveryRequest.update({
        where: { id: requestId },
        data: {
          status: 'VERIFIED',
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          adminComments: options?.adminComments || `Recovery mobile updated to ${cleanPhone}.`,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: adminUserId,
          module: 'SECURITY',
          entityType: 'USER_RECOVERY_CONTACT',
          entityId: targetUser.id,
          action: 'UPDATE',
          changeSummary: `Admin verified identity and updated recovery mobile for user ${targetUser.username} to ${cleanPhone}.`,
        },
      });

      return {
        success: true,
        message: `Recovery mobile number for ${targetUser.username} updated to ${cleanPhone}. The user can now use SMS/WhatsApp OTP recovery.`,
      };
    }

    // Action 3: Approve & Issue Reset Token
    if (action === 'APPROVE_RESET_TOKEN') {
      let targetUser = request.user;
      if (!targetUser) {
        const lookup = await this.lookupAccount(tenantId, request.identifierProvided);
        if (lookup.recoveryUserId) {
          targetUser = await prisma.user.findFirst({ where: { id: lookup.recoveryUserId, tenantId } });
        }
      }

      if (!targetUser) {
        throw new ValidationError('Cannot issue reset token: No registered user account is linked to this request identifier.');
      }

      const rawResetToken = generateSessionToken();
      const resetTokenHash = hashSessionToken(rawResetToken);
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.passwordResetToken.create({
        data: {
          tenantId,
          userId: targetUser.id,
          tokenHash: resetTokenHash,
          expiresAt: tokenExpiresAt,
        },
      });

      await prisma.passwordRecoveryRequest.update({
        where: { id: requestId },
        data: {
          status: 'VERIFIED',
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          adminComments: options?.adminComments || 'Direct password reset link approved.',
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: adminUserId,
          module: 'SECURITY',
          entityType: 'PASSWORD_RECOVERY_REQUEST',
          entityId: requestId,
          action: 'APPROVE',
          changeSummary: `Admin approved recovery request and issued reset token for user ${targetUser.username}.`,
        },
      });

      return {
        success: true,
        resetToken: rawResetToken,
        resetUrl: `/reset-password?token=${rawResetToken}`,
        message: 'Password reset link successfully generated.',
      };
    }

    // Action 4: Reject Request
    if (action === 'REJECT') {
      if (!options?.adminComments) {
        throw new ValidationError('Please provide a mandatory reason note for rejecting the recovery request.');
      }

      await prisma.passwordRecoveryRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          adminComments: options.adminComments,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: adminUserId,
          module: 'SECURITY',
          entityType: 'PASSWORD_RECOVERY_REQUEST',
          entityId: requestId,
          action: 'REJECT',
          changeSummary: `Admin rejected recovery request #${requestId.slice(0, 8)}. Reason: ${options.adminComments}`,
        },
      });

      return {
        success: true,
        message: 'Recovery request rejected.',
      };
    }

    throw new ValidationError('Invalid review action.');
  }
}
