import React, { useEffect, useState } from 'react';
import type { CatalogConfig, CatalogPayload, CatalogRecord } from '../pagesBBVATalent/types/catalog';

interface CatalogFormProps {
  config: CatalogConfig;
  selected?: CatalogRecord | null;
  saving?: boolean;
  onSubmit: (payload: CatalogPayload) => void;
  onCancel: () => void;
}

export const CatalogForm: React.FC<CatalogFormProps> = ({ config, selected, saving, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [seniority, setSeniority] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    setName(selected?.name ?? '');
    setCode(selected?.code ?? '');
    setDescription(selected?.description ?? '');
    setSeniority(selected?.seniority ?? '');
    setValidation(null);
  }, [selected, config.type]);

  const inputClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
  const labelClass = 'mb-1 block text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-300';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setValidation(`El nombre de ${config.singular} es obligatorio.`);
      return;
    }
    setValidation(null);
    onSubmit({
      name: normalizedName,
      code: config.supportsCode ? (code.trim() || null) : null,
      description: description.trim() || null,
      seniority: config.supportsSeniority ? (seniority.trim() || null) : null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {validation && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 [.bbva-dark_&]:border-rose-500/25 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-200">{validation}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        <label className={config.supportsCode ? '' : 'md:col-span-2'}>
          <span className={labelClass}>Nombre <span className="text-rose-500">*</span></span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={180} placeholder={config.namePlaceholder} autoFocus />
        </label>
        {config.supportsCode && (
          <label>
            <span className={labelClass}>Código <span className="font-normal text-slate-400">(opcional)</span></span>
            <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} maxLength={80} placeholder={config.codePlaceholder} />
          </label>
        )}
        {config.supportsSeniority && (
          <label>
            <span className={labelClass}>Seniority de referencia <span className="font-normal text-slate-400">(opcional)</span></span>
            <select className={inputClass} value={seniority} onChange={(event) => setSeniority(event.target.value)}>
              <option value="">Sin definir</option>
              <option value="JR">JR</option>
              <option value="STD">STD</option>
              <option value="SR">SR</option>
            </select>
          </label>
        )}
        <label className={config.supportsSeniority ? '' : 'md:col-span-2'}>
          <span className={labelClass}>Descripción <span className="font-normal text-slate-400">(opcional)</span></span>
          <textarea className="min-h-[72px] w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={config.descriptionPlaceholder} />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <button type="button" onClick={onCancel} disabled={saving} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-8 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">{saving ? 'Guardando...' : selected ? 'Guardar cambios' : `Agregar ${config.singular}`}</button>
      </div>
    </form>
  );
};
