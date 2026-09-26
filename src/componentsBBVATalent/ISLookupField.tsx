import React, { useState } from 'react';
import { Search } from 'lucide-react';
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

const fieldClass = 'h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';

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
    <div className="min-w-0">
      {message && <BBVAAlert tone={message.tone} onClose={() => setMessage(null)}>{message.text}</BBVAAlert>}
      <div className="flex min-w-0 gap-1.5">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[10px] font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"
          title="Buscar IS en el directorio corporativo configurado"
        >
          <Search className="h-3.5 w-3.5" />
          {searching ? 'Buscando...' : 'Buscar IS'}
        </button>
      </div>
    </div>
  );
};
