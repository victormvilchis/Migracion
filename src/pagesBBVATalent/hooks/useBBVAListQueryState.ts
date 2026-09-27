import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type ListState = Record<string, string>;

export function useBBVAListQueryState<T extends ListState>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => {
    const next = { ...defaults } as T;
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const value = params.get(String(key));
      if (value !== null) next[key] = value as T[keyof T];
    }
    return next;
  }, [defaults, params]);

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

  const reset = useCallback(() => setParams({}, { replace: true }), [setParams]);
  return { state, update, reset, search: params.toString() };
}
