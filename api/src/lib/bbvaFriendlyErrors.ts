export function isSqlDuplicate(error: unknown): boolean {
  const value = error as { number?: number; message?: string };
  const message = value?.message || String(error ?? '');
  return value?.number === 2601 || value?.number === 2627 || /duplicate|unique|duplicad/i.test(message);
}

function duplicateValue(message: string): string | null {
  const match = message.match(/duplicate key value is \((.*?)\)/i) || message.match(/valor de clave duplicada[^()]*\((.*?)\)/i);
  const value = match?.[1]?.trim();
  return value ? value.replace(/^N?'|'$/g, '') : null;
}

const uniqueFields: Array<{ patterns: RegExp[]; label: string }> = [
  { patterns: [/SofttekEmail/i, /Person_Email/i, /SystemUser_Email/i], label: 'correo Softtek' },
  { patterns: [/BbvaEmail/i], label: 'correo BBVA' },
  { patterns: [/SofttekCode/i], label: 'IS' },
  { patterns: [/BbvaUser/i, /CorporateUser/i], label: 'usuario BBVA / XM' },
  { patterns: [/CertificationCatalog_Name/i], label: 'nombre de certificación' },
  { patterns: [/CatalogCategory_Name/i], label: 'nombre de categoría' },
  { patterns: [/CatalogTechnologyProfile_Name/i], label: 'nombre de perfil tecnológico' },
  { patterns: [/CatalogTechnology_Name/i], label: 'nombre de tecnología' },
  { patterns: [/CatalogProfile_Name/i], label: 'nombre de perfil' },
  { patterns: [/SystemRole_Code/i], label: 'código de rol' },
  { patterns: [/SystemUserRole/i], label: 'rol asignado al usuario' },
];

export function friendlyDuplicateMessage(error: unknown, fallbackEntity = 'registro'): string {
  const value = error as { message?: string };
  const message = value?.message || String(error ?? '');
  const field = uniqueFields.find((item) => item.patterns.some((pattern) => pattern.test(message)))?.label;
  const duplicated = duplicateValue(message);
  if (field) {
    return duplicated
      ? `El ${field} “${duplicated}” ya está registrado. Revisa el registro existente o captura un valor diferente.`
      : `El ${field} ya está registrado en otro ${fallbackEntity}. Revisa el registro existente o captura un valor diferente.`;
  }
  return `Hay un identificador ya registrado en otro ${fallbackEntity}. Revisa IS, usuario BBVA / XM y correos para identificar el valor repetido.`;
}
