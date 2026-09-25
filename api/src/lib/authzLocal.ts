import { HttpRequest } from '@azure/functions';

export interface CurrentUser {
  email: string;
  name: string;
  roles: string[];
  isDevUser: boolean;
}

/**
 * Obtiene el usuario autenticado. En desarrollo local obtiene el usuario configurado
 * en devConfig o los headers locales (x-dev-user-email / AUTHZ_DEV_FALLBACK_EMAIL).
 */
export function getCurrentUser(request: HttpRequest): CurrentUser {
  const headerEmail = request.headers.get('x-dev-user-email')?.trim();
  const fallbackEmail = process.env.AUTHZ_DEV_FALLBACK_EMAIL || 'developer@softtek.com';

  const email = headerEmail || fallbackEmail;
  const name = email.split('@')[0].replace('.', ' ');

  return {
    email,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    roles: ['admin', 'contributor', 'viewer'],
    isDevUser: true,
  };
}
