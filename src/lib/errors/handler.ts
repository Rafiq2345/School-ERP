import { AppError } from './app-error';

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function formatErrorResponse(error: unknown): { status: number; body: StandardErrorResponse } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  // Generic/Unknown Error: Never leak internal stack trace, SQL, or filesystem paths
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd
    ? 'An unexpected server error occurred. Please try again later.'
    : error instanceof Error
    ? error.message
    : 'Unknown internal error';

  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    },
  };
}
