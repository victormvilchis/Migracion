/**
 * Configuración de usuario para desarrollo local (BaseBFS).
 * Permite simular diferentes identidades sin requerir Azure Active Directory / SWA localmente.
 */

export const DEV_USERS = {
  FRANCISCO: 'francisco.barrera@softtek.com',
  DEVELOPER: 'developer@softtek.com',
  GUEST: 'guest@softtek.com',
};

// Usuario activo por defecto para pruebas en local
export const CURRENT_DEV_USER = DEV_USERS.FRANCISCO;

/**
 * Obtiene el email efectivo del usuario para enviar en las solicitudes locales.
 */
export function getEffectiveUserEmail(): string {
  const savedUser = typeof window !== 'undefined' ? localStorage.getItem('bfs_dev_user') : null;
  return savedUser || CURRENT_DEV_USER;
}

/**
 * Permite alternar el usuario simulado en runtime.
 */
export function setEffectiveUserEmail(email: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bfs_dev_user', email);
  }
}
