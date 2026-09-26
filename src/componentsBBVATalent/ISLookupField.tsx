import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { identityDirectoryApi } from '../pagesBBVATalent/api/identityDirectoryApi';
import type { IdentityDirectoryRecord } from '../pagesBBVATalent/types/identityDirectory';
import { BBVAAlert } from './BBVAAlert';

interface ISLookupFieldProps {
  value: string;
  onChange: (value: string) => void;
  onResolved?: (record: IdentityDirectoryRecord) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const fieldClass =
  'h-9 w-full rounded-xl border border-slate-300 bg-white pl-3 pr-12 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';

export const ISLookupField: React.FC<ISLookupFieldProps> = ({ value, onChange, onResolved, disabled, autoFocus }) => {
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null);

  const lookup = async () => {
    const normalized = value.trim();
    if (!normalized) {
      setMessage({ tone: 'info', text: 'Captura un IS para realizar la búsqueda.' });
      return;
    }

    setSearching(true);
    setMessage(null);
    try {
      const response = await identityDirectoryApi.lookup(normalized);
      onChange(response.item.is || normalized);
      onResolved?.(response.item);
      setMessage({ tone: 'success', text: `IS encontrado en ${response.item.source}. Los datos disponibles fueron recuperados.` });
    } catch (error) {
      setMessage({ tone: 'error', text: (error as Error).message });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-w-0 space-y-1.5">
      {message ? (
        <BBVAAlert tone={message.tone} onClose={() => setMessage(null)}>
          {message.text}
        </BBVAAlert>
      ) : null}

      <div className="relative min-w-0">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void lookup();
            }
          }}
          className={fieldClass}
          placeholder="Ej. XMF5048"
          maxLength={80}
          disabled={disabled || searching}
          autoFocus={autoFocus}
          aria-label="IS"
        />

        <button
          type="button"
          onClick={() => void lookup()}
          disabled={disabled || searching}
          className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:bg-slate-700"
          title="Buscar IS"
          aria-label={searching ? 'Buscando IS' : 'Buscar IS'}
        >
          {searching ? <Sparkles className="h-3.5 w-3.5 animate-pulse" /> : <Search className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};
