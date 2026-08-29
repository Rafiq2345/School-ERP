// Structured Safe Logger with PII & Secret Redaction

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'secret',
  'session_secret',
  'csrf_secret',
  'mfa_secret',
  'credit_card',
  'cardnumber',
  'authorization',
  'cookie',
]);

function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5 || !obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  context?: unknown;
}

export const logger = {
  log(level: LogLevel, message: string, meta?: { tenantId?: string; userId?: string; requestId?: string; context?: unknown }) {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      tenantId: meta?.tenantId,
      userId: meta?.userId,
      requestId: meta?.requestId,
      context: meta?.context ? redactSensitiveData(meta.context) : undefined,
    };

    const output = JSON.stringify(payload);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  },

  info(message: string, meta?: { tenantId?: string; userId?: string; requestId?: string; context?: unknown }) {
    this.log('info', message, meta);
  },

  warn(message: string, meta?: { tenantId?: string; userId?: string; requestId?: string; context?: unknown }) {
    this.log('warn', message, meta);
  },

  error(message: string, meta?: { tenantId?: string; userId?: string; requestId?: string; context?: unknown }) {
    this.log('error', message, meta);
  },

  debug(message: string, meta?: { tenantId?: string; userId?: string; requestId?: string; context?: unknown }) {
    if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production') {
      this.log('debug', message, meta);
    }
  },
};
