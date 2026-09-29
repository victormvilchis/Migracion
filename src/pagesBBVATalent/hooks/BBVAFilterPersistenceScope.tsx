import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { findBbvaGroupByPath, findBbvaNavigationMatch } from '../../componentsBBVATalent/bbvaNavigation';

interface BBVAFilterPersistenceValue {
  scope: string;
  visitId: string;
  resetOnEntry: boolean;
}

const DEFAULT_SCOPE: BBVAFilterPersistenceValue = { scope: 'outside', visitId: 'outside', resetOnEntry: false };
const BBVAFilterPersistenceContext = createContext<BBVAFilterPersistenceValue>(DEFAULT_SCOPE);

const ACTIVE_SCOPE_KEY = 'bbva:filters:active-module:v29';
const FILTER_MEMORY_PREFIX = 'bbva:list:';
const QUERY_VISIT_PREFIX = 'bbva:query-visit:';

interface StoredScope {
  scope: string;
  visitId: string;
}

interface InitialVisit extends StoredScope {
  isNewVisit: boolean;
}

const parseStoredScope = (raw: string | null): StoredScope | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredScope>;
    return parsed.scope && parsed.visitId ? { scope: parsed.scope, visitId: parsed.visitId } : null;
  } catch {
    return null;
  }
};

const createVisitId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const resolveInitialVisit = (scope: string): InitialVisit => {
  if (typeof window === 'undefined') return { scope, visitId: `ssr:${scope}`, isNewVisit: false };
  try {
    const active = parseStoredScope(window.sessionStorage.getItem(ACTIVE_SCOPE_KEY));
    if (active?.scope === scope) return { ...active, isNewVisit: false };
  } catch {
    // sessionStorage puede estar deshabilitado.
  }
  return { scope, visitId: createVisitId(), isNewVisit: true };
};

const rememberActiveVisit = (visit: StoredScope) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ACTIVE_SCOPE_KEY, JSON.stringify(visit));
    const currentListToken = `:${visit.visitId}:`;
    const currentQuerySuffix = `:${visit.visitId}`;
    const obsoleteKeys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (key.startsWith(FILTER_MEMORY_PREFIX) && !key.includes(currentListToken)) obsoleteKeys.push(key);
      if (key.startsWith(QUERY_VISIT_PREFIX) && !key.endsWith(currentQuerySuffix)) obsoleteKeys.push(key);
    }
    obsoleteKeys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Sin sessionStorage la persistencia queda limitada a la vida del componente.
  }
};

/**
 * Alcance operativo de filtros BBVA.
 *
 * - Lista/detalle/edición/acciones de un mismo módulo comparten la misma visita.
 * - Cambiar a otro módulo cierra la visita; al regresar, los filtros parten de defaults.
 * - Recargar la página dentro del mismo módulo conserva la visita durante la sesión del navegador.
 * - Salir de BBVA también cierra la visita del módulo anterior.
 */
export const resolveBBVAFilterModuleScope = (pathname: string): string => {
  const moduleMatch = findBbvaNavigationMatch(pathname);
  if (moduleMatch) return `bbva:${moduleMatch.group.id}:${moduleMatch.module.id}`;

  const directGroup = findBbvaGroupByPath(pathname);
  if (directGroup) return `bbva:${directGroup.id}`;

  return pathname.startsWith('/bbva/') ? 'bbva:unmatched' : 'outside';
};

const BBVAFilterVisit: React.FC<{ scope: string; children: React.ReactNode }> = ({ scope, children }) => {
  const [visit] = useState<InitialVisit>(() => resolveInitialVisit(scope));
  const [resetOnEntry, setResetOnEntry] = useState(visit.isNewVisit);

  useEffect(() => {
    rememberActiveVisit({ scope: visit.scope, visitId: visit.visitId });
    if (visit.isNewVisit) setResetOnEntry(false);
  }, [visit.isNewVisit, visit.scope, visit.visitId]);

  const value = useMemo(
    () => ({ scope: visit.scope, visitId: visit.visitId, resetOnEntry }),
    [resetOnEntry, visit.scope, visit.visitId],
  );
  return <BBVAFilterPersistenceContext.Provider value={value}>{children}</BBVAFilterPersistenceContext.Provider>;
};

export const BBVAFilterPersistenceBoundary: React.FC<{ pathname: string; children: React.ReactNode }> = ({ pathname, children }) => {
  const scope = resolveBBVAFilterModuleScope(pathname);
  return <BBVAFilterVisit key={scope} scope={scope}>{children}</BBVAFilterVisit>;
};

export const useBBVAFilterPersistenceScope = () => useContext(BBVAFilterPersistenceContext);

export const bbvaFilterStorageKey = (scope: string, visitId: string, key: string) =>
  `${FILTER_MEMORY_PREFIX}v29:${scope}:${visitId}:${key}`;

export const bbvaQueryVisitKey = (scope: string, visitId: string) =>
  `${QUERY_VISIT_PREFIX}v29:${scope}:${visitId}`;
