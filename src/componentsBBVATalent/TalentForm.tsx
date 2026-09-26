import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Save, UploadCloud, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { talentSchema, type TalentFormValues } from '../pagesBBVATalent/schemas/talentSchema';
import { useCatalogOptions } from '../pagesBBVATalent/hooks/useCatalog';
import type { CatalogOption } from '../pagesBBVATalent/types/catalog';
import {
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
import { BBVAAlert } from './BBVAAlert';

const today = () => new Date().toISOString().slice(0, 10);
const defaultStage = (type: TalentType) => type === 'ACADEMY' ? 'ACADEMY' : 'REGISTERED';
const fieldClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const areaClass = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const labelClass = 'mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';
const sectionClass = 'space-y-2 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0 [.bbva-dark_&]:border-slate-800';

function optionId(options: CatalogOption[], currentId: string | null | undefined, currentName: string | null | undefined): string {
  if (currentId && options.some((option) => option.id === currentId)) return currentId;
  const name = (currentName ?? '').trim().toLocaleUpperCase('es-MX');
  return options.find((option) => option.name.trim().toLocaleUpperCase('es-MX') === name)?.id ?? '';
}

function optionName(options: CatalogOption[], id: string): string {
  return options.find((option) => option.id === id)?.name ?? '';
}

function toFormValues(
  talent: Talent | null | undefined,
  initialType: TalentType,
  profiles: CatalogOption[],
  technologyProfiles: CatalogOption[],
  technologies: CatalogOption[],
): TalentFormValues {
  return {
    talentType: talent?.talentType ?? initialType,
    softtekCode: talent?.softtekCode ?? '', corporateUser: talent?.corporateUser ?? '', email: talent?.email ?? '', firstName: talent?.firstName ?? '', lastName: talent?.lastName ?? '',
    profile: talent?.profile ?? '', profileCatalogId: optionId(profiles, talent?.profileCatalogId, talent?.profile),
    technologyProfile: talent?.technologyProfile ?? '', technologyProfileCatalogId: optionId(technologyProfiles, talent?.technologyProfileCatalogId, talent?.technologyProfile),
    currentTechnology: talent?.currentTechnology ?? '', currentTechnologyCatalogId: optionId(technologies, talent?.currentTechnologyCatalogId, talent?.currentTechnology),
    expertise: talent?.expertise ?? '', stage: talent?.stage ?? defaultStage(initialType), active: talent?.active ?? true,
    platformStartDate: talent?.platformStartDate ?? '', platformEndDate: talent?.platformEndDate ?? '', hireDate: talent?.hireDate ?? '', entryDate: talent?.entryDate ?? today(), notes: talent?.notes ?? '',
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

export const TalentForm: React.FC<TalentFormProps> = ({ selected, initialTalentType = 'ACADEMY', currentCv, saving, onSubmit, onCancel, onViewCv, onDownloadCv }) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const profilesQuery = useCatalogOptions('profiles');
  const technologyProfilesQuery = useCatalogOptions('technology-profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const profiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const technologyProfiles = useMemo(() => technologyProfilesQuery.data?.items ?? [], [technologyProfilesQuery.data]);
  const technologies = useMemo(() => technologiesQuery.data?.items ?? [], [technologiesQuery.data]);
  const { register, handleSubmit, reset, watch } = useForm<TalentFormValues>({ defaultValues: toFormValues(selected, initialTalentType, [], [], []) });
  const talentType = watch('talentType');
  const fullForm = talentType !== 'ACADEMY';
  const catalogsLoading = profilesQuery.isLoading || technologyProfilesQuery.isLoading || technologiesQuery.isLoading;

  useEffect(() => {
    reset(toFormValues(selected, initialTalentType, profiles, technologyProfiles, technologies));
    setCvFile(null);
    setFormError(null);
  }, [initialTalentType, profiles, reset, selected, technologies, technologyProfiles]);

  const submit = (values: TalentFormValues) => {
    const payload: TalentFormValues = {
      ...values,
      profile: optionName(profiles, values.profileCatalogId),
      technologyProfile: fullForm ? optionName(technologyProfiles, values.technologyProfileCatalogId) : '',
      technologyProfileCatalogId: fullForm ? values.technologyProfileCatalogId : '',
      currentTechnology: optionName(technologies, values.currentTechnologyCatalogId),
    };
    const parsed = talentSchema.safeParse(payload);
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? 'Revisa los campos capturados.');
    setFormError(null);
    onSubmit(parsed.data, cvFile);
  };

  const onFileSelected = (file?: File) => {
    if (!file) return;
    const error = validateCvFile(file);
    if (error) { setCvFile(null); setFormError(error); return; }
    setCvFile(file); setFormError(null);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <input type="hidden" {...register('talentType')} />
      <input type="hidden" {...register('profile')} />
      <input type="hidden" {...register('technologyProfile')} />
      <input type="hidden" {...register('currentTechnology')} />

      {selected?.talentType === 'BBVA_EXIT' && <BBVAAlert tone="info">Registro proveniente de una baja de BBVA. Conserva el formulario profesional completo.</BBVAAlert>}
      {formError && <BBVAAlert tone="error" onClose={() => setFormError(null)}>{formError}</BBVAAlert>}

      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Identificación</h3><span className="text-[10px] text-slate-400">{TALENT_TYPE_LABELS[talentType]}</span></div>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Código Softtek</span><input {...register('softtekCode')} className={fieldClass} placeholder="XMF5048" /></label>
          {fullForm && <label className="md:col-span-2"><span className={labelClass}>Usuario corporativo</span><input {...register('corporateUser')} className={fieldClass} /></label>}
          <label className={fullForm ? 'md:col-span-4' : 'md:col-span-5'}><span className={labelClass}>Correo electrónico</span><input {...register('email')} type="email" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nombre</span><input {...register('firstName')} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Apellidos</span><input {...register('lastName')} className={fieldClass} /></label>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Información profesional</h3>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-4"><span className={labelClass}>Perfil {talentType === 'ACADEMY' ? '*' : ''}</span><select {...register('profileCatalogId')} className={fieldClass} disabled={catalogsLoading}><option value="">Seleccionar</option>{profiles.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          {fullForm && <label className="md:col-span-3"><span className={labelClass}>Perfil tecnológico *</span><select {...register('technologyProfileCatalogId')} className={fieldClass} disabled={catalogsLoading}><option value="">Seleccionar</option>{technologyProfiles.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
          <label className={fullForm ? 'md:col-span-3' : 'md:col-span-5'}><span className={labelClass}>Tecnología actual {talentType === 'ACADEMY' ? '*' : ''}</span><select {...register('currentTechnologyCatalogId')} className={fieldClass} disabled={catalogsLoading}><option value="">Seleccionar</option>{technologies.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          {fullForm && <label className="md:col-span-2"><span className={labelClass}>Expertise</span><select {...register('expertise')} className={fieldClass}><option value="">—</option>{EXPERTISE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Fechas y estado</h3>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Inicio vigencia</span><input {...register('platformStartDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Vencimiento</span><input {...register('platformEndDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Contratación</span><input {...register('hireDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Alta Talent Bank</span><input {...register('entryDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Etapa</span><select {...register('stage')} className={fieldClass}>{TALENT_STAGES.filter((stage) => stage !== 'CONVERTED').map((stage) => <option key={stage} value={stage}>{TALENT_STAGE_LABELS[stage]}</option>)}</select></label>
          <label className="md:col-span-2"><span className={labelClass}>Estado</span><span className="flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-300"><input {...register('active')} type="checkbox" className="h-3.5 w-3.5 accent-blue-600" /> Activo</span></label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
          <div><span className={labelClass}>Observaciones</span><textarea {...register('notes')} rows={3} className={areaClass} /></div>
          <div>
            <span className={labelClass}>Currículum</span>
            <div className="flex min-h-[76px] items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950/50">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <UploadCloud className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="min-w-0 truncate text-[10.5px] text-slate-600 [.bbva-dark_&]:text-slate-300">{cvFile ? cvFile.name : currentCv ? `${currentCv.fileName} · ${formatBytes(currentCv.fileSizeBytes)}` : 'Seleccionar CV (.pdf, .docx, .pptx)'}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(event) => onFileSelected(event.target.files?.[0])} />
              </label>
              {currentCv && <div className="flex shrink-0 gap-1"><button type="button" onClick={onViewCv} className="rounded p-1.5 text-blue-600 hover:bg-blue-50 [.bbva-dark_&]:text-blue-300 [.bbva-dark_&]:hover:bg-blue-500/10" title="Ver CV"><Eye className="h-3.5 w-3.5" /></button><button type="button" onClick={onDownloadCv} className="rounded p-1.5 text-slate-600 hover:bg-slate-100 [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:bg-slate-800" title="Descargar CV"><Download className="h-3.5 w-3.5" /></button></div>}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><X className="h-3.5 w-3.5" />Cancelar</button>
        <button type="submit" disabled={saving || catalogsLoading} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
};
