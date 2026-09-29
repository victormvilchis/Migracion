import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCatalogOptions } from '../pagesBBVATalent/hooks/useCatalog';
import { useDeliveryManagers } from '../pagesBBVATalent/hooks/useAdminUsers';
import { useStructureOptions } from '../pagesBBVATalent/hooks/useStructureCatalog';
import type { CatalogOption } from '../pagesBBVATalent/types/catalog';
import type { Collaborator, CollaboratorPayload } from '../pagesBBVATalent/types/collaborator';
import type { IdentityDirectoryRecord } from '../pagesBBVATalent/types/identityDirectory';
import { BBVAFormActions, type BBVAFormMode, isBBVAFormReadOnly } from './BBVACrudForm';
import { BBVAAlert } from './BBVAAlert';
import { BBVASearchableSelect, type BBVASearchableSelectOption } from './BBVASearchableSelect';
import { BBVADatePicker } from './BBVADatePicker';
import { ISLookupField } from './ISLookupField';
import { BBVARequiredMark } from './BBVARequiredMark';

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
    deliveryManager: item?.deliveryManager ?? '',
    firstName: item?.firstName ?? '', lastName: item?.lastName ?? '',
    profile: item?.profile ?? '', profileCatalogId: optionId(profiles, item?.profileCatalogId, item?.profile),
    technologyProfile: item?.technologyProfile ?? '', technologyProfileCatalogId: optionId(technologyProfiles, item?.technologyProfileCatalogId, item?.technologyProfile),
    currentTechnology: item?.currentTechnology ?? '', currentTechnologyCatalogId: optionId(technologies, item?.currentTechnologyCatalogId, item?.currentTechnology),
    expertise: item?.expertise ?? '',
    bbvaStartDate: item?.bbvaStartDate ?? item?.startDate ?? '',
    softtekHireDate: item?.softtekHireDate ?? item?.hireDate ?? '',
    originalFullName: item?.originalFullName ?? item?.fullName ?? '',
    bbvaStructureLevel2: item?.bbvaStructureLevel2 ?? '',
    bbvaStructureLevel3: item?.bbvaStructureLevel3 ?? '',
    bbvaAccessEndDate: item?.bbvaAccessEndDate ?? '',
    bbvaAccessAuthorizer: item?.bbvaAccessAuthorizer ?? '',
    bbvaAccessStatus: item?.bbvaAccessStatus ?? '',
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
  const deliveryManagersQuery = useDeliveryManagers();
  const structuresQuery = useStructureOptions();
  const profiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const technologyProfiles = useMemo(() => technologyProfilesQuery.data?.items ?? [], [technologyProfilesQuery.data]);
  const technologies = useMemo(() => technologiesQuery.data?.items ?? [], [technologiesQuery.data]);
  const deliveryManagers = useMemo(() => deliveryManagersQuery.data?.items ?? [], [deliveryManagersQuery.data]);
  const structures = useMemo(() => structuresQuery.data?.items ?? [], [structuresQuery.data]);
  const structureLevel2 = useMemo(() => structures.filter((item) => item.level === 2), [structures]);
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

  const catalogsLoading = profilesQuery.isLoading || technologyProfilesQuery.isLoading || technologiesQuery.isLoading || deliveryManagersQuery.isLoading || structuresQuery.isLoading;
  const isValue = watch('softtekCode');
  const profileCatalogId = watch('profileCatalogId');
  const technologyProfileCatalogId = watch('technologyProfileCatalogId');
  const currentTechnologyCatalogId = watch('currentTechnologyCatalogId');
  const expertise = watch('expertise');
  const deliveryManager = watch('deliveryManager');
  const bbvaStartDate = watch('bbvaStartDate');
  const softtekHireDate = watch('softtekHireDate');
  const bbvaAccessEndDate = watch('bbvaAccessEndDate');
  const bbvaStructureLevel2 = watch('bbvaStructureLevel2');
  const bbvaStructureLevel3 = watch('bbvaStructureLevel3');
  const structureLevel3 = useMemo(() => structures.filter((item) => item.level === 3 && item.parentName === bbvaStructureLevel2), [bbvaStructureLevel2, structures]);
  const structure2SelectOptions = useMemo(() => [{ value: '', label: 'Seleccionar nivel 2' }, ...structureLevel2.map((item) => ({ value: item.name, label: item.name })), ...(bbvaStructureLevel2 && !structureLevel2.some((item) => item.name === bbvaStructureLevel2) ? [{ value: bbvaStructureLevel2, label: `${bbvaStructureLevel2} · histórico` }] : [])], [bbvaStructureLevel2, structureLevel2]);
  const structure3SelectOptions = useMemo(() => [{ value: '', label: 'Seleccionar nivel 3' }, ...structureLevel3.map((item) => ({ value: item.name, label: item.name })), ...(bbvaStructureLevel3 && !structureLevel3.some((item) => item.name === bbvaStructureLevel3) ? [{ value: bbvaStructureLevel3, label: `${bbvaStructureLevel3} · histórico` }] : [])], [bbvaStructureLevel3, structureLevel3]);

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
          <label className="md:col-span-2"><span className={labelClass}>Usuario BBVA</span><input {...register('bbvaUser')} disabled={readOnly || saving} className={fieldClass} placeholder="Ej. XMK4244, XL..., T... o EC..." /></label>
          <label className="md:col-span-2"><span className={labelClass}>Correo Softtek <BBVARequiredMark/></span><input {...register('softtekEmail', { required: true })} type="email" disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Correo BBVA</span><input {...register('bbvaEmail')} type="email" disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nombre <BBVARequiredMark/></span><input {...register('firstName', { required: true })} disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Apellidos <BBVARequiredMark/></span><input {...register('lastName', { required: true })} disabled={readOnly || saving} className={fieldClass} /></label>
        </div>
      </section>
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Información profesional</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4">
            <span className={labelClass}>Perfil <BBVARequiredMark/></span>
            <BBVASearchableSelect value={profileCatalogId ?? ''} onChange={(value) => setValue('profileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(profiles, 'Seleccionar')} disabled={catalogsLoading || readOnly || saving} ariaLabel="Perfil" />
            <input type="hidden" {...register('profileCatalogId', { required: true })} />
            <input type="hidden" {...register('profile')} />
          </label>
          <label className="md:col-span-3">
            <span className={labelClass}>Perfil tecnológico <BBVARequiredMark/></span>
            <BBVASearchableSelect value={technologyProfileCatalogId ?? ''} onChange={(value) => setValue('technologyProfileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologyProfiles, 'Seleccionar')} disabled={catalogsLoading || readOnly || saving} ariaLabel="Perfil tecnológico" />
            <input type="hidden" {...register('technologyProfileCatalogId', { required: true })} />
            <input type="hidden" {...register('technologyProfile')} />
          </label>
          <label className="md:col-span-3">
            <span className={labelClass}>Tecnología actual <BBVARequiredMark/></span>
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
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Gestión</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Fecha de alta BBVA</span><BBVADatePicker value={bbvaStartDate} onChange={(value) => setValue('bbvaStartDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha de alta BBVA" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Fecha de contratación Softtek</span><BBVADatePicker value={softtekHireDate} onChange={(value) => setValue('softtekHireDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha de contratación Softtek" /></label>
          <label className="md:col-span-4">
            <span className={labelClass}>Delivery Manager <BBVARequiredMark/></span>
            <BBVASearchableSelect
              value={deliveryManager ?? ''}
              onChange={(value) => setValue('deliveryManager', value, { shouldDirty: true, shouldValidate: true })}
              options={[{ value: '', label: 'Seleccionar Delivery Manager' }, ...deliveryManagers.map((item) => ({ value: item.fullName, label: item.fullName, description: [item.email, item.corporateUser].filter(Boolean).join(' · ') || undefined }))]}
              disabled={readOnly || saving || deliveryManagersQuery.isLoading}
              ariaLabel="Delivery Manager"
              searchPlaceholder="Buscar Delivery Manager"
              emptyMessage="No hay Delivery Managers activos. Regístralos en Administración > Usuarios."
            />
            <input type="hidden" {...register('deliveryManager', { required: true })} />
          </label>
        </div>
      </section>
      <details open={Boolean(selected?.bbvaStructureLevel2 || selected?.bbvaStructureLevel3 || selected?.bbvaAccessStatus || selected?.bbvaAccessEndDate || selected?.bbvaAccessAuthorizer)} className="group rounded-2xl border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[11px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden [.bbva-dark_&]:text-slate-100"><span>Información BBVA y accesos</span><span className="text-[9px] font-medium text-slate-400 group-open:hidden">Mostrar</span><span className="hidden text-[9px] font-medium text-slate-400 group-open:inline">Ocultar</span></summary>
        <div className="grid gap-3 border-t border-slate-100 px-4 pb-4 pt-3 md:grid-cols-12 [.bbva-dark_&]:border-slate-800">
          <label className="md:col-span-4"><span className={labelClass}>Estructura nivel 2</span><BBVASearchableSelect value={bbvaStructureLevel2 ?? ''} onChange={(value) => { setValue('bbvaStructureLevel2', value, { shouldDirty: true }); if (value !== bbvaStructureLevel2) setValue('bbvaStructureLevel3', '', { shouldDirty: true }); }} options={structure2SelectOptions} disabled={readOnly || saving || structuresQuery.isLoading} ariaLabel="Estructura nivel 2"/><input type="hidden" {...register('bbvaStructureLevel2')} /></label>
          <label className="md:col-span-4"><span className={labelClass}>Estructura nivel 3</span><BBVASearchableSelect value={bbvaStructureLevel3 ?? ''} onChange={(value) => setValue('bbvaStructureLevel3', value, { shouldDirty: true })} options={structure3SelectOptions} disabled={readOnly || saving || structuresQuery.isLoading || !bbvaStructureLevel2} ariaLabel="Estructura nivel 3"/><input type="hidden" {...register('bbvaStructureLevel3')} /></label>
          <label className="md:col-span-4"><span className={labelClass}>Status accesos</span><input {...register('bbvaAccessStatus')} disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-4"><span className={labelClass}>Fecha fin de accesos</span><BBVADatePicker value={bbvaAccessEndDate} onChange={(value) => setValue('bbvaAccessEndDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha fin de accesos BBVA" /></label>
          <label className="md:col-span-8"><span className={labelClass}>Nombre autorizador</span><input {...register('bbvaAccessAuthorizer')} disabled={readOnly || saving} className={fieldClass} /></label>
          <input type="hidden" {...register('originalFullName')} />
        </div>
      </details>
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
