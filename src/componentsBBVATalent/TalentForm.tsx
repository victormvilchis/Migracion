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
import { BBVADatePicker } from './BBVADatePicker';
import { BBVASearchableSelect, type BBVASearchableSelectOption } from './BBVASearchableSelect';
import { ISLookupField } from './ISLookupField';
import type { IdentityDirectoryRecord } from '../pagesBBVATalent/types/identityDirectory';

const today = () => new Date().toISOString().slice(0, 10);
const defaultStage = (type: TalentType) => type === 'ACADEMY' ? 'ACADEMY' : 'REGISTERED';
const fieldClass = 'h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const areaClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';
const sectionClass = 'space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75';

function optionId(options: CatalogOption[], currentId: string | null | undefined, currentName: string | null | undefined): string {
  if (currentId && options.some((option) => option.id === currentId)) return currentId;
  const name = (currentName ?? '').trim().toLocaleUpperCase('es-MX');
  return options.find((option) => option.name.trim().toLocaleUpperCase('es-MX') === name)?.id ?? '';
}

function optionName(options: CatalogOption[], id: string): string {
  return options.find((option) => option.id === id)?.name ?? '';
}

function toSelectOptions(options: CatalogOption[], emptyLabel = 'Seleccionar'): BBVASearchableSelectOption[] {
  return [{ value: '', label: emptyLabel }, ...options.map((option) => ({ value: option.id, label: option.name }))];
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
  const { register, handleSubmit, reset, watch, setValue } = useForm<TalentFormValues>({ defaultValues: toFormValues(selected, initialTalentType, [], [], []) });
  const talentType = watch('talentType');
  const isValue = watch('softtekCode');
  const profileCatalogId = watch('profileCatalogId');
  const technologyProfileCatalogId = watch('technologyProfileCatalogId');
  const currentTechnologyCatalogId = watch('currentTechnologyCatalogId');
  const expertise = watch('expertise');
  const stage = watch('stage');
  const platformStartDate = watch('platformStartDate');
  const platformEndDate = watch('platformEndDate');
  const hireDate = watch('hireDate');
  const entryDate = watch('entryDate');
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

  const hydrateFromDirectory = (record: IdentityDirectoryRecord) => {
    if (record.corporateUser) setValue('corporateUser', record.corporateUser, { shouldDirty: true, shouldValidate: true });
    if (record.email) setValue('email', record.email, { shouldDirty: true, shouldValidate: true });
    if (record.firstName) setValue('firstName', record.firstName, { shouldDirty: true, shouldValidate: true });
    if (record.lastName) setValue('lastName', record.lastName, { shouldDirty: true, shouldValidate: true });
    if (record.expertise) setValue('expertise', record.expertise, { shouldDirty: true, shouldValidate: true });
    if (record.hireDate) setValue('hireDate', record.hireDate, { shouldDirty: true, shouldValidate: true });
    if (record.profile) setValue('profileCatalogId', optionId(profiles, null, record.profile), { shouldDirty: true, shouldValidate: true });
    if (record.technologyProfile) setValue('technologyProfileCatalogId', optionId(technologyProfiles, null, record.technologyProfile), { shouldDirty: true, shouldValidate: true });
    if (record.currentTechnology) setValue('currentTechnologyCatalogId', optionId(technologies, null, record.currentTechnology), { shouldDirty: true, shouldValidate: true });
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

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <input type="hidden" {...register('talentType')} />
      <input type="hidden" {...register('profile')} />
      <input type="hidden" {...register('technologyProfile')} />
      <input type="hidden" {...register('currentTechnology')} />
      <input type="hidden" {...register('profileCatalogId')} />
      <input type="hidden" {...register('technologyProfileCatalogId')} />
      <input type="hidden" {...register('currentTechnologyCatalogId')} />
      <input type="hidden" {...register('expertise')} />
      <input type="hidden" {...register('stage')} />
      <input type="hidden" {...register('platformStartDate')} />
      <input type="hidden" {...register('platformEndDate')} />
      <input type="hidden" {...register('hireDate')} />
      <input type="hidden" {...register('entryDate')} />

      {selected?.talentType === 'BBVA_EXIT' ? <BBVAAlert tone="info">Registro proveniente de una baja de BBVA. Conserva el formulario profesional completo.</BBVAAlert> : null}
      {formError ? <BBVAAlert tone="error" onClose={() => setFormError(null)}>{formError}</BBVAAlert> : null}

      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Identificación</h3>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300">{TALENT_TYPE_LABELS[talentType]}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>IS</span><ISLookupField value={isValue ?? ''} onChange={(value) => setValue('softtekCode', value, { shouldDirty: true })} onResolved={hydrateFromDirectory} disabled={saving} /></label>
          {fullForm ? <label className="md:col-span-2"><span className={labelClass}>Usuario corporativo</span><input {...register('corporateUser')} className={fieldClass} /></label> : null}
          <label className={fullForm ? 'md:col-span-3' : 'md:col-span-4'}><span className={labelClass}>Correo electrónico</span><input {...register('email')} type="email" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nombre</span><input {...register('firstName')} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Apellidos</span><input {...register('lastName')} className={fieldClass} /></label>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Información profesional</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4">
            <span className={labelClass}>Perfil {talentType === 'ACADEMY' ? '*' : ''}</span>
            <BBVASearchableSelect value={profileCatalogId ?? ''} onChange={(value) => setValue('profileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(profiles)} disabled={catalogsLoading} ariaLabel="Perfil" />
          </label>
          {fullForm ? (
            <label className="md:col-span-3">
              <span className={labelClass}>Perfil tecnológico *</span>
              <BBVASearchableSelect value={technologyProfileCatalogId ?? ''} onChange={(value) => setValue('technologyProfileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologyProfiles)} disabled={catalogsLoading} ariaLabel="Perfil tecnológico" />
            </label>
          ) : null}
          <label className={fullForm ? 'md:col-span-3' : 'md:col-span-5'}>
            <span className={labelClass}>Tecnología actual {talentType === 'ACADEMY' ? '*' : ''}</span>
            <BBVASearchableSelect value={currentTechnologyCatalogId ?? ''} onChange={(value) => setValue('currentTechnologyCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologies)} disabled={catalogsLoading} ariaLabel="Tecnología actual" />
          </label>
          {fullForm ? (
            <label className="md:col-span-2">
              <span className={labelClass}>Nivel de experiencia</span>
              <BBVASearchableSelect value={expertise ?? ''} onChange={(value) => setValue('expertise', value, { shouldDirty: true, shouldValidate: true })} options={[{ value: '', label: '—' }, ...EXPERTISE_LEVELS.map((level) => ({ value: level, label: level }))]} ariaLabel="Nivel de experiencia" />
            </label>
          ) : null}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Fechas y estado</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Inicio vigencia</span><BBVADatePicker value={platformStartDate} onChange={(value) => setValue('platformStartDate', value, { shouldDirty: true, shouldValidate: true })} ariaLabel="Inicio de vigencia" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Vencimiento</span><BBVADatePicker value={platformEndDate} onChange={(value) => setValue('platformEndDate', value, { shouldDirty: true, shouldValidate: true })} ariaLabel="Vencimiento" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Contratación</span><BBVADatePicker value={hireDate} onChange={(value) => setValue('hireDate', value, { shouldDirty: true, shouldValidate: true })} ariaLabel="Fecha de contratación" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Alta Banco de talento</span><BBVADatePicker value={entryDate} onChange={(value) => setValue('entryDate', value, { shouldDirty: true, shouldValidate: true })} ariaLabel="Fecha de alta en Banco de talento" /></label>
          <label className="md:col-span-2">
            <span className={labelClass}>Etapa</span>
            <BBVASearchableSelect value={stage ?? ''} onChange={(value) => setValue('stage', value as TalentFormValues['stage'], { shouldDirty: true, shouldValidate: true })} options={TALENT_STAGES.filter((item) => item !== 'CONVERTED').map((item) => ({ value: item, label: TALENT_STAGE_LABELS[item] }))} ariaLabel="Etapa" />
          </label>
          <label className="md:col-span-2"><span className={labelClass}>Estado</span><span className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-300"><input {...register('active')} type="checkbox" className="h-3.5 w-3.5 rounded accent-blue-600" /> Activo</span></label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
          <div><span className={labelClass}>Observaciones</span><textarea {...register('notes')} rows={4} className={areaClass} /></div>
          <div>
            <span className={labelClass}>Currículum</span>
            <div className="flex min-h-[92px] items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950/50">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <UploadCloud className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="min-w-0 truncate text-[10.5px] text-slate-600 [.bbva-dark_&]:text-slate-300">{cvFile ? cvFile.name : currentCv ? `${currentCv.fileName} · ${formatBytes(currentCv.fileSizeBytes)}` : 'Seleccionar CV (.pdf, .docx, .pptx)'}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(event) => onFileSelected(event.target.files?.[0])} />
              </label>
              {currentCv ? <div className="flex shrink-0 gap-1"><button type="button" onClick={onViewCv} className="rounded-xl p-2 text-blue-600 hover:bg-blue-50 [.bbva-dark_&]:text-blue-300 [.bbva-dark_&]:hover:bg-blue-500/10" title="Ver CV"><Eye className="h-3.5 w-3.5" /></button><button type="button" onClick={onDownloadCv} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:bg-slate-800" title="Descargar CV"><Download className="h-3.5 w-3.5" /></button></div> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><X className="h-3.5 w-3.5" />Cancelar</button>
        <button type="submit" disabled={saving || catalogsLoading} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
};
