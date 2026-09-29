import { useEffect, useMemo, useState } from 'react';
import { bbvaFilterStorageKey, useBBVAFilterPersistenceScope } from './BBVAFilterPersistenceScope';

export function useBBVAListMemory<T extends object>(key: string, defaults: T) {
  const { scope, visitId } = useBBVAFilterPersistenceScope();
  const storageKey = useMemo(() => bbvaFilterStorageKey(scope, visitId, key), [key, scope, visitId]);
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      return raw ? { ...defaults, ...JSON.parse(raw) } as T : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* sessionStorage puede estar deshabilitado */ }
  }, [state, storageKey]);

  const patch = (next: Partial<T>) => setState((current) => ({ ...current, ...next }));
  const reset = () => setState(defaults);
  return { state, patch, reset };
}
