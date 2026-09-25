import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { talentSchema, type TalentFormValues } from '../schemas/talentSchema';
import { TALENT_STAGES, TALENT_STAGE_LABELS, type Talent, type TalentPayload } from '../types/talent';

const today = () => new Date().toISOString().slice(0, 10);

function toFormValues(talent?: Talent | null): TalentFormValues {
  return {
    fullName: talent?.fullName ?? '',
    email: talent?.email ?? '',
    profile: talent?.profile ?? '',
    technologyProfile: talent?.technologyProfile ?? '',
    targetTechnology: talent?.targetTechnology ?? '',
    stage: talent?.stage ?? 'PROSPECT',
    active: talent?.active ?? true,
    entryDate: talent?.entryDate ?? today(),
    notes: talent?.notes ?? '',
  };
}

interface TalentFormProps {
  selected?: Talent | null;
  saving?: boolean;
  onSubmit: (payload: TalentPayload) => void;
  onCancelEdit: () => void;
}

export const TalentForm: React.FC<TalentFormProps> = ({ selected, saving, onSubmit, onCancelEdit }) => {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<TalentFormValues>({ defaultValues: toFormValues(selected) });

  useEffect(() => {
    reset(toFormValues(selected));
    setFormError(null);
  }, [selected, reset]);

  const submit = (values: TalentFormValues) => {
    const parsed = talentSchema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Revisa los campos capturados.');
      return;
    }
    setFormError(null);
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{selected ? 'Editar Talent' : 'Nuevo Talent'}</h3>
          <p className="text-[11px] text-slate-500">Datos base del prospecto o talento disponible.</p>
        </div>
        {selected && (
          <button type="button" onClick={onCancelEdit} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {formError && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">{formError}</div>}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Nombre completo *</label>
        <input {...register('fullName')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Correo</label>
        <input type="email" {...register('email')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Perfil</label>
          <input {...register('profile')} placeholder="Ej. Backend" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Perfil tecnológico</label>
          <input {...register('technologyProfile')} placeholder="Ej. Java" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Tecnología objetivo</label>
        <input {...register('targetTechnology')} placeholder="Ej. APX / Java / Salesforce" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Etapa</label>
          <select {...register('stage')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500">
            {TALENT_STAGES.map((stage) => <option key={stage} value={stage}>{TALENT_STAGE_LABELS[stage]}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Fecha de ingreso</label>
          <input type="date" {...register('entryDate')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Notas</label>
        <textarea rows={3} {...register('notes')} className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" {...register('active')} className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
        Registro activo
      </label>

      <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
        <Save className="h-4 w-4" />
        {saving ? 'Guardando...' : selected ? 'Guardar cambios' : 'Crear Talent'}
      </button>
    </form>
  );
};
