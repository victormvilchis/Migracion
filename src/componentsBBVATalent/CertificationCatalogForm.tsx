import React, { useEffect, useState } from 'react';
import { useCatalogOptions } from '../pagesBBVATalent/hooks/useCatalog';
import { BBVAAlert } from './BBVAAlert';
import { BBVAFormActions, type BBVAFormMode, isBBVAFormReadOnly } from './BBVACrudForm';
import { BBVASearchableSelect } from './BBVASearchableSelect';
import {
  CERTIFICATION_LEVEL_LABELS,
  CERTIFICATION_LEVELS,
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_TYPES,
  type CertificationCatalogPayload,
  type CertificationCatalogRecord,
  type CertificationLevel,
  type CertificationType,
} from '../pagesBBVATalent/types/certificationCatalog';

interface Props {
  selected?: CertificationCatalogRecord | null;
  saving?: boolean;
  mode?: BBVAFormMode;
  onSubmit: (payload: CertificationCatalogPayload) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const fieldClass = 'h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
const areaClass = 'min-h-[90px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';
const sectionClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75';

const initialPayload = (selected?: CertificationCatalogRecord | null): CertificationCatalogPayload => ({
  name: selected?.name ?? '',
  description: selected?.description ?? '',
  certificationType: selected?.certificationType ?? 'TECHNOLOGICAL',
  provider: selected?.provider ?? '',
  technologyId: selected?.technologyId ?? '',
  validityMonths: selected?.validityMonths ?? 24,
  initialCompletionMonths: selected?.initialCompletionMonths ?? null,
  expiringSoonDays: selected ? (selected.expiringSoonDays ?? null) : 90,
  firstAttemptCost: selected?.firstAttemptCost ?? null,
  subsequentAttemptCost: selected?.subsequentAttemptCost ?? null,
  costCurrency: selected?.costCurrency ?? '',
  includesTraining: selected?.includesTraining ?? false,
  recertificationEnabled: selected?.recertificationEnabled ?? true,
  requiresAttempts: selected?.requiresAttempts ?? true,
  requiresApplicationDate: selected?.requiresApplicationDate ?? true,
  defaultMandatory: selected?.defaultMandatory ?? true,
  requirementGroup: selected?.requirementGroup ?? '',
  requirementGroupMinimum: selected?.requirementGroupMinimum ?? null,
  allowedLevels: selected?.allowedLevels ?? ['JR', 'STD', 'SR'],
});

export const CertificationCatalogForm: React.FC<Props> = ({ selected, saving, mode = selected ? 'edit' : 'create', onSubmit, onCancel, onDelete }) => {
  const readOnly = isBBVAFormReadOnly(mode);
  const technologiesQuery = useCatalogOptions('technologies');
  const technologies = technologiesQuery.data?.items ?? [];
  const technologyOptions = [
    { value: '', label: 'Sin tecnología' },
    ...(selected?.technologyId && selected.technologyName && !technologies.some((item) => item.id === selected.technologyId)
      ? [{ value: selected.technologyId, label: selected.technologyName }]
      : []),
    ...technologies.map((item) => ({ value: item.id, label: item.name })),
  ];
  const [values, setValues] = useState<CertificationCatalogPayload>(() => initialPayload(selected));
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => setValues(initialPayload(selected)), [selected]);

  const updateType = (type: CertificationType) => {
    if (readOnly) return;
    setValues((current) => {
      if (type === 'TECHNOLOGICAL') {
        return { ...current, certificationType: type, validityMonths: 24, initialCompletionMonths: null, expiringSoonDays: 90, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true, defaultMandatory: true, requirementGroup: '', requirementGroupMinimum: null, allowedLevels: ['JR', 'STD', 'SR'] };
      }
      if (type === 'METHODOLOGICAL') {
        return { ...current, certificationType: type, technologyId: '', validityMonths: null, initialCompletionMonths: null, expiringSoonDays: null, recertificationEnabled: false, requiresAttempts: true, requiresApplicationDate: true, defaultMandatory: true, requirementGroup: 'METHODOLOGICAL', requirementGroupMinimum: 1, allowedLevels: ['GENERIC'] };
      }
      if (type === 'DEVELOPMENT_SECURITY') {
        return { ...current, certificationType: type, technologyId: '', validityMonths: 12, initialCompletionMonths: null, expiringSoonDays: 90, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true, defaultMandatory: true, requirementGroup: '', requirementGroupMinimum: null, allowedLevels: ['GENERIC'] };
      }
      return { ...current, certificationType: type, technologyId: '', validityMonths: null, initialCompletionMonths: null, expiringSoonDays: null, recertificationEnabled: false, requiresAttempts: false, requiresApplicationDate: false, defaultMandatory: false, requirementGroup: '', requirementGroupMinimum: null, allowedLevels: ['GENERIC'] };
    });
  };

  const toggleLevel = (level: CertificationLevel) => {
    if (readOnly) return;
    setValues((current) => ({
      ...current,
      allowedLevels: current.allowedLevels.includes(level)
        ? current.allowedLevels.filter((item) => item !== level)
        : [...current.allowedLevels, level],
    }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    if (!values.name.trim()) return setValidation('El nombre es obligatorio.');
    if (values.certificationType === 'TECHNOLOGICAL' && !values.technologyId) return setValidation('Selecciona la tecnología desde el catálogo.');
    if (values.certificationType === 'TECHNOLOGICAL' && values.allowedLevels.length === 0) return setValidation('Selecciona al menos un nivel permitido.');
    if (values.recertificationEnabled && !values.validityMonths) return setValidation('La vigencia es obligatoria cuando existe recertificación.');
    if ((values.firstAttemptCost !== null || values.subsequentAttemptCost !== null) && !values.costCurrency) return setValidation('Selecciona la moneda de los costos.');
    setValidation(null);
    onSubmit({
      ...values,
      name: values.name.trim(),
      provider: values.provider.trim(),
      description: values.description.trim(),
      requirementGroup: values.requirementGroup.trim().toUpperCase(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {validation ? <BBVAAlert tone="error" onClose={() => setValidation(null)}>{validation}</BBVAAlert> : null}

      <section className={sectionClass}>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-5"><span className={labelClass}>Certificación *</span><input disabled={readOnly || saving} className={fieldClass} value={values.name} maxLength={180} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Tipo *</span><BBVASearchableSelect value={values.certificationType} onChange={(value) => updateType(value as CertificationType)} options={CERTIFICATION_TYPES.map((type) => ({ value: type, label: CERTIFICATION_TYPE_LABELS[type] }))} disabled={readOnly || saving} ariaLabel="Tipo de certificación" /></label>
          <label className="md:col-span-4"><span className={labelClass}>Certificadora</span><input disabled={readOnly || saving} className={fieldClass} value={values.provider} maxLength={120} onChange={(e) => setValues((v) => ({ ...v, provider: e.target.value }))} placeholder="Ej. NETEC" /></label>
          <label className="md:col-span-5"><span className={labelClass}>Tecnología {values.certificationType === 'TECHNOLOGICAL' ? '*' : ''}</span><BBVASearchableSelect value={values.technologyId} onChange={(value) => setValues((v) => ({ ...v, technologyId: value }))} options={technologyOptions} disabled={readOnly || saving || values.certificationType !== 'TECHNOLOGICAL'} ariaLabel="Tecnología" /></label>
          <label className="md:col-span-7"><span className={labelClass}>Descripción</span><textarea disabled={readOnly || saving} className={areaClass} value={values.description} maxLength={1000} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Vigencia (meses)</span><input disabled={readOnly || saving} className={fieldClass} type="number" min={1} max={240} value={values.validityMonths ?? ''} onChange={(e) => setValues((v) => ({ ...v, validityMonths: e.target.value ? Number(e.target.value) : null }))} placeholder="Sin vencimiento" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Tiempo para completar</span><input disabled={readOnly || saving} className={fieldClass} type="number" min={1} max={240} value={values.initialCompletionMonths ?? ''} onChange={(e) => setValues((v) => ({ ...v, initialCompletionMonths: e.target.value ? Number(e.target.value) : null }))} placeholder="Meses" /></label>
          <div className="md:col-span-8"><span className={labelClass}>Niveles permitidos</span><div className="grid min-h-9 grid-cols-2 gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 sm:grid-cols-4 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70">{CERTIFICATION_LEVELS.map((level) => <label key={level} className="flex items-center gap-1.5 text-[10px] text-slate-700 [.bbva-dark_&]:text-slate-300"><input type="checkbox" disabled={readOnly || saving} className="h-3.5 w-3.5 accent-blue-600" checked={values.allowedLevels.includes(level)} onChange={() => toggleLevel(level)} />{CERTIFICATION_LEVEL_LABELS[level]}</label>)}</div></div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Próxima a vencer (días)</span><input disabled={readOnly || saving || !values.validityMonths} className={fieldClass} type="number" min={1} max={240} value={values.expiringSoonDays ?? ''} onChange={(e) => setValues((v) => ({ ...v, expiringSoonDays: e.target.value ? Number(e.target.value) : null }))} placeholder="90" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Costo 1er intento</span><input disabled={readOnly || saving} className={fieldClass} type="number" min={0} step="0.01" value={values.firstAttemptCost ?? ''} onChange={(e) => setValues((v) => ({ ...v, firstAttemptCost: e.target.value ? Number(e.target.value) : null }))} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Costo sig. intento</span><input disabled={readOnly || saving} className={fieldClass} type="number" min={0} step="0.01" value={values.subsequentAttemptCost ?? ''} onChange={(e) => setValues((v) => ({ ...v, subsequentAttemptCost: e.target.value ? Number(e.target.value) : null }))} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Moneda</span><BBVASearchableSelect value={values.costCurrency} onChange={(value) => setValues((v) => ({ ...v, costCurrency: value }))} options={[{ value: '', label: '—' }, { value: 'USD', label: 'USD' }, { value: 'MXN', label: 'MXN' }]} disabled={readOnly || saving} ariaLabel="Moneda" /></label>
          <label className="md:col-span-4"><span className={labelClass}>Insumo</span><span className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[10.5px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:text-slate-300"><input type="checkbox" disabled={readOnly || saving} className="h-3.5 w-3.5 accent-blue-600" checked={values.includesTraining} onChange={(e) => setValues((v) => ({ ...v, includesTraining: e.target.checked }))} />Incluye entrenamiento / curso</span></label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[10.5px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:text-slate-300"><input type="checkbox" disabled={readOnly || saving} className="h-3.5 w-3.5 accent-blue-600" checked={values.recertificationEnabled} onChange={(e) => setValues((v) => ({ ...v, recertificationEnabled: e.target.checked }))} />Recertificación</label>
          <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[10.5px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:text-slate-300"><input type="checkbox" disabled={readOnly || saving} className="h-3.5 w-3.5 accent-blue-600" checked={values.requiresAttempts} onChange={(e) => setValues((v) => ({ ...v, requiresAttempts: e.target.checked }))} />Controlar intentos</label>
          <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[10.5px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:text-slate-300"><input type="checkbox" disabled={readOnly || saving} className="h-3.5 w-3.5 accent-blue-600" checked={values.requiresApplicationDate} onChange={(e) => setValues((v) => ({ ...v, requiresApplicationDate: e.target.checked }))} />Fecha de aplicación</label>
          <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[10.5px] text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:text-slate-300"><input type="checkbox" disabled={readOnly || saving} className="h-3.5 w-3.5 accent-blue-600" checked={values.defaultMandatory} onChange={(e) => setValues((v) => ({ ...v, defaultMandatory: e.target.checked }))} />Obligatoria por defecto</label>
        </div>
      </section>

      <BBVAFormActions
        mode={mode}
        busy={saving}
        submitDisabled={technologiesQuery.isLoading}
        onBack={onCancel}
        onDelete={onDelete}
        createLabel="Agregar certificación"
        editLabel="Guardar cambios"
        deleteLabel="Eliminar certificación"
      />
    </form>
  );
};
