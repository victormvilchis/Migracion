import { useEffect, useState } from 'react';

export function useBBVAListMemory<T extends object>(key: string, defaults: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = window.sessionStorage.getItem(`bbva:list:${key}`);
      return raw ? { ...defaults, ...JSON.parse(raw) } as T : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try { window.sessionStorage.setItem(`bbva:list:${key}`, JSON.stringify(state)); } catch { /* sessionStorage puede estar deshabilitado */ }
  }, [key, state]);

  const patch = (next: Partial<T>) => setState((current) => ({ ...current, ...next }));
  const reset = () => setState(defaults);
  return { state, patch, reset };
}
