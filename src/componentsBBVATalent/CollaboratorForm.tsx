import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCatalogOptions } from '../pagesBBVATalent/hooks/useCatalog';
import type { CatalogOption } from '../pagesBBVATalent/types/catalog';
import type { Collaborator, CollaboratorPayload } from '../pagesBBVATalent/types/collaborator';
import type { IdentityDirectoryRecord } from '../pagesBBVATalent/types/identityDirectory';
import { BBVAFormActions, type BBVAFormMode, isBBVAFormReadOnly } from './BBVACrudForm';
import { BBVAAlert } from './BBVAAlert';
import { BBVASearchableSelect, type BBVASearchableSelectOption } from './BBVASearchableSelect';
import { BBVADatePicker } from './BBVADatePicker';
import { ISLookupField } from './ISLookupField';

const fieldClass = 'h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
const areaClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';

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

const expertiseOptions: BBVASearchableSelectOption[] = [
  { value: '', label: '—' },
  { value: 'TR', label: 'TR' },
  { value: 'JR', label: 'JR' },
  { value: 'STD', label: 'STD' },
  { value: 'SR', label: 'SR' },
];

function values(item: Collaborator | null | undefined, profiles: CatalogOption[], technologyProfiles: CatalogOption[], technologies: CatalogOption[]): CollaboratorPayload {
  return {
    softtekCode: item?.softtekCode ?? '',
    bbvaUser: item?.bbvaUser ?? item?.corporateUser ?? '',
    softtekEmail: item?.softtekEmail ?? item?.email ?? '',
    bbvaEmail: item?.bbvaEmail ?? '',
    firstName: item?.firstName ?? '', lastName: item?.lastName ?? '',
    profile: item?.profile ?? '', profileCatalogId: optionId(profiles, item?.profileCatalogId, item?.profile),
    technologyProfile: item?.technologyProfile ?? '', technologyProfileCatalogId: optionId(technologyProfiles, item?.technologyProfileCatalogId, item?.technologyProfile),
    currentTechnology: item?.currentTechnology ?? '', currentTechnologyCatalogId: optionId(technologies, item?.currentTechnologyCatalogId, item?.currentTechnology),
    expertise: item?.expertise ?? '',
    bbvaStartDate: item?.bbvaStartDate ?? item?.startDate ?? '',
    softtekHireDate: item?.softtekHireDate ?? item?.hireDate ?? '',
    notes: item?.notes ?? '',
    expectedUpdatedAt: item?.updatedAt,
  };
}

interface CollaboratorFormProps {
  selected?: Collaborator | null;
  saving?: boolean;
  mode?: Exclude<BBVAFormMode, 'delete'>;
  onSubmit: (payload: CollaboratorPayload) => void;
  onCancel: () => void;
}

export const CollaboratorForm: React.FC<CollaboratorFormProps> = ({ selected, saving, mode = selected ? 'edit' : 'create', onSubmit, onCancel }) => {
  const readOnly = isBBVAFormReadOnly(mode);
  const profilesQuery = useCatalogOptions('profiles');
  const technologyProfilesQuery = useCatalogOptions('technology-profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const profiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const technologyProfiles = useMemo(() => technologyProfilesQuery.data?.items ?? [], [technologyProfilesQuery.data]);
  const technologies = useMemo(() => technologiesQuery.data?.items ?? [], [technologiesQuery.data]);
  const { register, handleSubmit, reset, setValue, watch } = useForm<CollaboratorPayload>({ defaultValues: values(selected, [], [], []) });

  useEffect(() => reset(values(selected, profiles, technologyProfiles, technologies)), [profiles, reset, selected, technologies, technologyProfiles]);

  const submit = (payload: CollaboratorPayload) => {
    if (readOnly) return;
    onSubmit({
    ...payload,
    profile: optionName(profiles, payload.profileCatalogId),
    technologyProfile: optionName(technologyProfiles, payload.technologyProfileCatalogId),
    currentTechnology: optionName(technologies, payload.currentTechnologyCatalogId),
    });
  };

  const catalogsLoading = profilesQuery.isLoading || technologyProfilesQuery.isLoading || technologiesQuery.isLoading;
  const isValue = watch('softtekCode');
  const profileCatalogId = watch('profileCatalogId');
  const technologyProfileCatalogId = watch('technologyProfileCatalogId');
  const currentTechnologyCatalogId = watch('currentTechnologyCatalogId');
  const expertise = watch('expertise');
  const bbvaStartDate = watch('bbvaStartDate');
  const softtekHireDate = watch('softtekHireDate');

  const hydrateFromDirectory = (record: IdentityDirectoryRecord) => {
    if (record.bbvaUser || record.corporateUser) setValue('bbvaUser', record.bbvaUser || record.corporateUser || '', { shouldDirty: true, shouldValidate: true });
    if (record.softtekEmail || record.email) setValue('softtekEmail', record.softtekEmail || record.email || '', { shouldDirty: true, shouldValidate: true });
    if (record.firstName) setValue('firstName', record.firstName, { shouldDirty: true, shouldValidate: true });
    if (record.lastName) setValue('lastName', record.lastName, { shouldDirty: true, shouldValidate: true });
    if (record.expertise) setValue('expertise', record.expertise, { shouldDirty: true, shouldValidate: true });
    if (record.softtekHireDate || record.hireDate) setValue('softtekHireDate', record.softtekHireDate || record.hireDate || '', { shouldDirty: true, shouldValidate: true });
    if (record.profile) setValue('profileCatalogId', optionId(profiles, null, record.profile), { shouldDirty: true, shouldValidate: true });
    if (record.technologyProfile) setValue('technologyProfileCatalogId', optionId(technologyProfiles, null, record.technologyProfile), { shouldDirty: true, shouldValidate: true });
    if (record.currentTechnology) setValue('currentTechnologyCatalogId', optionId(technologies, null, record.currentTechnology), { shouldDirty: true, shouldValidate: true });
  };

  const hasInactiveReference = Boolean(selected && (
    (selected.profileCatalogId && !profiles.some((option) => option.id === selected.profileCatalogId)) ||
    (selected.technologyProfileCatalogId && !technologyProfiles.some((option) => option.id === selected.technologyProfileCatalogId)) ||
    (selected.currentTechnologyCatalogId && !technologies.some((option) => option.id === selected.currentTechnologyCatalogId))
  ));

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <input type="hidden" {...register('expectedUpdatedAt')} />
      {hasInactiveReference ? <BBVAAlert tone="warning">Este colaborador conserva referencias históricas a catálogos inactivos. No se ofrecen como opciones seleccionables; elige un registro activo antes de guardar.</BBVAAlert> : null}
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Identificación</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>IS</span><ISLookupField value={isValue ?? ''} onChange={(value) => setValue('softtekCode', value, { shouldDirty: true })} onResolved={hydrateFromDirectory} disabled={saving || readOnly} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Usuario BBVA</span><input {...register('bbvaUser')} disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Correo Softtek *</span><input {...register('softtekEmail', { required: true })} type="email" disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Correo BBVA</span><input {...register('bbvaEmail')} type="email" disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nombre *</span><input {...register('firstName', { required: true })} disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Apellidos *</span><input {...register('lastName', { required: true })} disabled={readOnly || saving} className={fieldClass} /></label>
        </div>
      </section>
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Información profesional</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4">
            <span className={labelClass}>Perfil *</span>
            <BBVASearchableSelect value={profileCatalogId ?? ''} onChange={(value) => setValue('profileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(profiles, 'Seleccionar')} disabled={catalogsLoading || readOnly || saving} ariaLabel="Perfil" />
            <input type="hidden" {...register('profileCatalogId', { required: true })} />
            <input type="hidden" {...register('profile')} />
          </label>
          <label className="md:col-span-3">
            <span className={labelClass}>Perfil tecnológico *</span>
            <BBVASearchableSelect value={technologyProfileCatalogId ?? ''} onChange={(value) => setValue('technologyProfileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologyProfiles, 'Seleccionar')} disabled={catalogsLoading || readOnly || saving} ariaLabel="Perfil tecnológico" />
            <input type="hidden" {...register('technologyProfileCatalogId', { required: true })} />
            <input type="hidden" {...register('technologyProfile')} />
          </label>
          <label className="md:col-span-3">
            <span className={labelClass}>Tecnología actual *</span>
            <BBVASearchableSelect value={currentTechnologyCatalogId ?? ''} onChange={(value) => setValue('currentTechnologyCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologies, 'Seleccionar')} disabled={catalogsLoading || readOnly || saving} ariaLabel="Tecnología actual" />
            <input type="hidden" {...register('currentTechnologyCatalogId', { required: true })} />
            <input type="hidden" {...register('currentTechnology')} />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass}>Nivel de experiencia</span>
            <BBVASearchableSelect value={expertise ?? ''} onChange={(value) => setValue('expertise', value, { shouldDirty: true, shouldValidate: true })} options={expertiseOptions} disabled={readOnly || saving} ariaLabel="Nivel de experiencia" />
            <input type="hidden" {...register('expertise')} />
          </label>
        </div>
      </section>
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Fechas</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Fecha de alta BBVA</span><BBVADatePicker value={bbvaStartDate} onChange={(value) => setValue('bbvaStartDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha de alta BBVA" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Fecha de contratación Softtek</span><BBVADatePicker value={softtekHireDate} onChange={(value) => setValue('softtekHireDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha de contratación Softtek" /></label>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75"><label><span className={labelClass}>Observaciones</span><textarea {...register('notes')} rows={4} disabled={readOnly || saving} className={areaClass} /></label></section>
      <BBVAFormActions
        mode={mode}
        busy={saving}
        submitDisabled={catalogsLoading}
        onBack={onCancel}
        createLabel="Guardar"
        editLabel="Guardar cambios"
      />
    </form>
  );
};
