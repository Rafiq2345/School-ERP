import { TenantContext } from '../types';

/**
 * Resolves the active tenant context securely from the request headers/host or deployment configuration.
 * Users NEVER manually type their tenant/school ID on the login form.
 */
export function resolveTenantFromRequest(headers?: Headers | Record<string, string | string[] | undefined>): TenantContext {
  // 1. Check custom domain or subdomain from host header
  if (headers) {
    const hostHeader = typeof headers.get === 'function' 
      ? headers.get('host') 
      : (headers as Record<string, string | string[] | undefined>)['host'];

    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

    if (host && typeof host === 'string') {
      const cleanHost = host.split(':')[0].toLowerCase();
      
      // Example: greenwood.schoolerp.com -> slug "greenwood"
      const parts = cleanHost.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        const subdomain = parts[0];
        return {
          tenantId: `tenant-${subdomain}`,
          tenantCode: subdomain.toUpperCase(),
          schoolName: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} School`,
        };
      }
    }
  }

  // 2. Default deployment fallback for single-tenant installation or standard development
  return {
    tenantId: 'tenant-default-001',
    tenantCode: 'SCH-001',
    schoolName: 'Greenwood International School',
  };
}
