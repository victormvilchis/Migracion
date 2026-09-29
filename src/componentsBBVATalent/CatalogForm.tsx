import React, { useEffect, useState } from 'react';
import type { CatalogConfig, CatalogPayload, CatalogRecord } from '../pagesBBVATalent/types/catalog';
import { BBVAFormActions, type BBVAFormMode, isBBVAFormReadOnly } from './BBVACrudForm';
import { BBVASearchableSelect } from './BBVASearchableSelect';
import { BBVARequiredMark } from './BBVARequiredMark';

interface CatalogFormProps {
  config: CatalogConfig;
  selected?: CatalogRecord | null;
  saving?: boolean;
  mode?: BBVAFormMode;
  onSubmit: (payload: CatalogPayload) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const CatalogForm: React.FC<CatalogFormProps> = ({ config, selected, saving, mode = selected ? 'edit' : 'create', onSubmit, onCancel, onDelete }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [seniority, setSeniority] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const readOnly = isBBVAFormReadOnly(mode);

  useEffect(() => {
    setName(selected?.name ?? '');
    setDescription(selected?.description ?? '');
    setSeniority(selected?.seniority ?? '');
    setValidation(null);
  }, [selected, config.type]);

  const inputClass = 'h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
  const labelClass = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    const normalizedName = name.trim();
    if (!normalizedName) {
      setValidation(`El nombre de ${config.singular} es obligatorio.`);
      return;
    }
    setValidation(null);
    onSubmit({
      name: normalizedName,
      description: description.trim() || null,
      seniority: config.supportsSeniority ? (seniority.trim() || null) : null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {validation && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 [.bbva-dark_&]:border-rose-500/25 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-200">{validation}</div>}

      <fieldset disabled={readOnly || saving} className="grid gap-3 md:grid-cols-2">
        <label className={config.supportsSeniority ? '' : 'md:col-span-2'}>
          <span className={labelClass}>Nombre <BBVARequiredMark/></span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={180} placeholder={config.namePlaceholder} autoFocus={!readOnly} />
        </label>
        {config.supportsSeniority && (
          <label>
            <span className={labelClass}>Nivel de referencia <span className="font-normal normal-case tracking-normal text-slate-400">(opcional)</span></span>
            <BBVASearchableSelect value={seniority} onChange={setSeniority} options={[{ value: '', label: 'Sin definir' }, { value: 'TR', label: 'TR' }, { value: 'JR', label: 'JR' }, { value: 'STD', label: 'STD' }, { value: 'SR', label: 'SR' }]} disabled={readOnly || saving} ariaLabel="Nivel de referencia" />
          </label>
        )}
        <label className="md:col-span-2">
          <span className={labelClass}>Descripción <span className="font-normal normal-case tracking-normal text-slate-400">(opcional)</span></span>
          <textarea disabled={readOnly || saving} className="min-h-[96px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={config.descriptionPlaceholder} />
        </label>
      </fieldset>

      <BBVAFormActions
        mode={mode}
        busy={saving}
        onBack={onCancel}
        onDelete={onDelete}
        createLabel={`Agregar ${config.singular}`}
        editLabel="Guardar cambios"
        deleteLabel={`Eliminar ${config.singular}`}
      />
    </form>
  );
};
