import type { CurrentUser } from './authzLocal.js';

export type BbvaPermission =
  | 'CATALOG_READ'
  | 'CATALOG_WRITE'
  | 'CERTIFICATION_CATALOG_READ'
  | 'CERTIFICATION_CATALOG_WRITE'
  | 'IDENTITY_DIRECTORY_READ'
  | 'TALENT_READ'
  | 'TALENT_WRITE'
  | 'COLLABORATOR_READ'
  | 'COLLABORATOR_WRITE'
  | 'USER_ADMIN_READ'
  | 'USER_ADMIN_WRITE'
  | 'ROLE_ADMIN_READ'
  | 'ROLE_ADMIN_WRITE';

type HttpError = Error & { statusCode?: number };

const READ_ROLES = new Set([
  'admin', 'administrator', 'administrador', 'supervisor', 'gestor', 'contributor', 'viewer', 'service manager', 'service_manager',
]);
const WRITE_ROLES = new Set(['admin', 'administrator', 'administrador', 'supervisor']);

function normalizedRoles(user: CurrentUser): string[] {
  return (user.roles ?? []).map((role) => role.trim().toLowerCase()).filter(Boolean);
}

function denied(message: string): never {
  const error = new Error(message) as HttpError;
  error.statusCode = 403;
  throw error;
}

export function assertBbvaPermission(user: CurrentUser, permission: BbvaPermission): void {
  const roles = normalizedRoles(user);
  const write = permission.endsWith('_WRITE');
  const allowed = write ? roles.some((role) => WRITE_ROLES.has(role)) : roles.some((role) => READ_ROLES.has(role));

  if (!allowed) {
    denied(write
      ? 'No tienes permisos para modificar este recurso.'
      : 'No tienes permisos para consultar este recurso.');
  }
}
