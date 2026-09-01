// Application Error Hierarchy

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden: Insufficient permissions', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class TenantIsolationError extends AppError {
  constructor(message = 'Cross-tenant access violation', details?: unknown) {
    super(message, 403, 'TENANT_ISOLATION_VIOLATION', details);
  }
}

export class FinancialInvariantError extends AppError {
  constructor(message = 'Financial safety rule violation', details?: unknown) {
    super(message, 409, 'FINANCIAL_INVARIANT_VIOLATION', details);
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account is locked due to consecutive failed attempts', details?: unknown) {
    super(message, 423, 'ACCOUNT_LOCKED', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}
