import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Download, Eye, FileText, Save, UploadCloud, X } from 'lucide-react';
import { talentSchema, type TalentFormValues } from '../pagesBBVATalent/schemas/talentSchema';
import {
  ACADEMY_PROFILES,
  EXPERTISE_LEVELS,
  TALENT_STAGES,
  TALENT_STAGE_LABELS,
  TALENT_TYPE_LABELS,
  type Talent,
  type TalentCvMetadata,
  type TalentPayload,
  type TalentType,
} from '../pagesBBVATalent/types/talent';
import { formatBytes } from '../pagesBBVATalent/lib/talentDisplay';
import { validateCvFile } from '../pagesBBVATalent/lib/talentCv';

const today = () => new Date().toISOString().slice(0, 10);

function defaultStage(type: TalentType) {
  return type === 'ACADEMY' ? 'ACADEMY' : 'REGISTERED';
}

function toFormValues(talent?: Talent | null, initialType: TalentType = 'ACADEMY'): TalentFormValues {
  return {
    talentType: talent?.talentType ?? initialType,
    softtekCode: talent?.softtekCode ?? '',
    corporateUser: talent?.corporateUser ?? '',
    email: talent?.email ?? '',
    firstName: talent?.firstName ?? '',
    lastName: talent?.lastName ?? '',
    profile: talent?.profile ?? '',
    technologyProfile: talent?.technologyProfile ?? '',
    currentTechnology: talent?.currentTechnology ?? '',
    expertise: talent?.expertise ?? '',
    stage: talent?.stage ?? defaultStage(initialType),
    active: talent?.active ?? true,
    platformStartDate: talent?.platformStartDate ?? '',
    platformEndDate: talent?.platformEndDate ?? '',
    hireDate: talent?.hireDate ?? '',
    entryDate: talent?.entryDate ?? today(),
    notes: talent?.notes ?? '',
  };
}

interface TalentFormProps {
  selected?: Talent | null;
  initialTalentType?: TalentType;
  currentCv?: TalentCvMetadata | null;
  saving?: boolean;
  onSubmit: (payload: TalentPayload, cvFile: File | null) => void;
  onCancel: () => void;
  onViewCv?: () => void;
  onDownloadCv?: () => void;
}

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500';
const labelClass = 'mb-1.5 block text-[11px] font-medium text-slate-500';

export const TalentForm: React.FC<TalentFormProps> = ({
  selected,
  initialTalentType = 'ACADEMY',
  currentCv,
  saving,
  onSubmit,
  onCancel,
  onViewCv,
  onDownloadCv,
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<TalentFormValues>({ defaultValues: toFormValues(selected, initialTalentType) });
  const talentType = watch('talentType');

  useEffect(() => {
    reset(toFormValues(selected, initialTalentType));
    setCvFile(null);
    setFormError(null);
  }, [initialTalentType, selected, reset]);


  const submit = (values: TalentFormValues) => {
    const parsed = talentSchema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Revisa los campos capturados.');
      return;
    }
    setFormError(null);
    onSubmit(parsed.data, cvFile);
  };

  const onFileSelected = (file?: File) => {
    if (!file) return;
    const error = validateCvFile(file);
    if (error) {
      setCvFile(null);
      setFormError(error);
      return;
    }
    setCvFile(file);
    setFormError(null);
  };

  const fullForm = talentType !== 'ACADEMY';

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <input type="hidden" {...register('talentType')} />

      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Tipo de talento</h3>
          <p className="mt-1 text-xs text-slate-500">{TALENT_TYPE_LABELS[talentType]}</p>
        </div>
        {selected?.talentType === 'BBVA_EXIT' && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
            Registro proveniente de una baja de BBVA. Conserva el formulario profesional completo.
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Identificación</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Código Softtek</span><input {...register('softtekCode')} className={fieldClass} placeholder="Ej. XMF5048" /></label>
          {fullForm && <label className="md:col-span-3"><span className={labelClass}>Usuario corporativo</span><input {...register('corporateUser')} className={fieldClass} placeholder="Usuario BBVA / corporativo" /></label>}
          <label className={fullForm ? 'md:col-span-6' : 'md:col-span-9'}><span className={labelClass}>Correo electrónico</span><input {...register('email')} type="email" className={fieldClass} placeholder="nombre@softtek.com" /></label>
          <label className="md:col-span-5"><span className={labelClass}>Nombre</span><input {...register('firstName')} className={fieldClass} /></label>
          <label className="md:col-span-7"><span className={labelClass}>Apellidos</span><input {...register('lastName')} className={fieldClass} /></label>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Información profesional</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4">
            <span className={labelClass}>Perfil</span>
            {talentType === 'ACADEMY' ? (
              <select {...register('profile')} className={fieldClass}>
                <option value="">Seleccionar</option>
                {ACADEMY_PROFILES.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
              </select>
            ) : (
              <input {...register('profile')} className={fieldClass} placeholder="Ej. Analista Programador SR" />
            )}
          </label>
          {fullForm && <label className="md:col-span-4"><span className={labelClass}>Perfil tecnológico</span><input {...register('technologyProfile')} className={fieldClass} placeholder="Ej. DESARROLLADOR" /></label>}
          <label className={fullForm ? 'md:col-span-3' : 'md:col-span-5'}><span className={labelClass}>Tecnología actual</span><input {...register('currentTechnology')} className={fieldClass} placeholder="Ej. JAVA / APX" /></label>
          {fullForm && (
            <label className="md:col-span-1">
              <span className={labelClass}>Expertise</span>
              <select {...register('expertise')} className={fieldClass}>
                <option value="">—</option>
                {EXPERTISE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Fechas y estado</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Inicio de vigencia</span><input {...register('platformStartDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Vencimiento</span><input {...register('platformEndDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Fecha de contratación</span><input {...register('hireDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Fecha de alta en Talent Bank</span><input {...register('entryDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-4">
            <span className={labelClass}>Etapa</span>
            <select {...register('stage')} className={fieldClass}>
              {TALENT_STAGES.filter((stage) => stage !== 'CONVERTED').map((stage) => <option key={stage} value={stage}>{TALENT_STAGE_LABELS[stage]}</option>)}
            </select>
          </label>
          <label className="md:col-span-4 flex items-end">
            <span className="flex h-[38px] w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
              <input {...register('active')} type="checkbox" className="h-4 w-4 accent-blue-600" /> Registro activo
            </span>
          </label>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Currículum</h3>
          <p className="mt-1 text-xs text-slate-500">Formatos permitidos: PDF, Word y PowerPoint. Máximo 10 MB.</p>
        </div>

        {currentCv && (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-900">{currentCv.fileName}</div><div className="text-[11px] text-slate-500">{formatBytes(currentCv.fileSizeBytes)}</div></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onViewCv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" />Ver CV</button>
              <button type="button" onClick={onDownloadCv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"><Download className="h-3.5 w-3.5" />Descargar</button>
            </div>
          </div>
        )}

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center transition hover:border-blue-500/50 hover:bg-blue-500/5">
          <UploadCloud className="h-6 w-6 text-blue-400" />
          <span className="mt-2 text-sm font-medium text-slate-700">{cvFile ? cvFile.name : currentCv ? 'Seleccionar un CV para sustituir el actual' : 'Seleccionar CV'}</span>
          <span className="mt-1 text-[11px] text-slate-500">.pdf, .doc, .docx, .ppt, .pptx</span>
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(event) => onFileSelected(event.target.files?.[0])} />
        </label>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <label><span className={labelClass}>Observaciones</span><textarea {...register('notes')} rows={4} className={fieldClass} placeholder="Información adicional relevante..." /></label>
      </section>

      {formError && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"><X className="h-4 w-4" />Cancelar</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Guardando...' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
};
