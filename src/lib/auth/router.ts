import { UserType } from '../types';

/**
 * Server-side determination of the authorized dashboard route based on authenticated user record.
 * Never trust client-side parameters for portal routing.
 */
export function getAuthorizedDashboardRoute(userType: UserType): string {
  switch (userType) {
    case 'ADMIN':
      return '/admin';
    case 'TEACHER':
      return '/teacher';
    case 'EMPLOYEE':
      return '/staff';
    case 'STUDENT':
      return '/student';
    case 'PARENT':
      return '/parent';
    default:
      return '/login';
  }
}
