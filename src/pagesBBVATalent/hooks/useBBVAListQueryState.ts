import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bbvaQueryVisitKey, useBBVAFilterPersistenceScope } from './BBVAFilterPersistenceScope';

type ListState = Record<string, string>;

export function useBBVAListQueryState<T extends ListState>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const { scope, visitId, resetOnEntry } = useBBVAFilterPersistenceScope();
  const visitMarker = useMemo(() => bbvaQueryVisitKey(scope, visitId), [scope, visitId]);

  const state = useMemo(() => {
    const next = { ...defaults } as T;
    if (resetOnEntry) return next;
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const value = params.get(String(key));
      if (value !== null) next[key] = value as T[keyof T];
    }
    return next;
  }, [defaults, params, resetOnEntry]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { window.sessionStorage.setItem(visitMarker, '1'); } catch { /* sessionStorage puede estar deshabilitado */ }
    }
    if (!resetOnEntry) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.keys(defaults).forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [defaults, resetOnEntry, setParams, visitMarker]);

  const update = useCallback((patch: Partial<T>, replace = true) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        const normalized = String(value ?? '');
        const fallback = String(defaults[key] ?? '');
        if (!normalized || normalized === fallback) next.delete(key);
        else next.set(key, normalized);
      }
      return next;
    }, { replace });
  }, [defaults, setParams]);

  const reset = useCallback(() => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.keys(defaults).forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [defaults, setParams]);

  return { state, update, reset, search: params.toString() };
}
