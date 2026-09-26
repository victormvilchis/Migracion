import React, { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import { useCatalogOptions } from '../pagesBBVATalent/hooks/useCatalog';
import { BBVAAlert } from './BBVAAlert';
import {
  CERTIFICATION_LEVEL_LABELS,
  CERTIFICATION_LEVELS,
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_TYPES,
  type CertificationCatalogPayload,
  type CertificationCatalogRecord,
  type CertificationLevel,
  type CertificationProfileRulePayload,
  type CertificationType,
} from '../pagesBBVATalent/types/certificationCatalog';

interface Props {
  selected?: CertificationCatalogRecord | null;
  saving?: boolean;
  onSubmit: (payload: CertificationCatalogPayload) => void;
  onCancel: () => void;
}

const fieldClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15';
const areaClass = 'min-h-[64px] w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15';
const labelClass = 'mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500';
const sectionClass = 'rounded-lg border border-slate-200 bg-white p-3 shadow-sm';

const initialPayload = (selected?: CertificationCatalogRecord | null): CertificationCatalogPayload => ({
  code: selected?.code ?? '',
  name: selected?.name ?? '',
  description: selected?.description ?? '',
  certificationType: selected?.certificationType ?? 'TECHNOLOGICAL',
  provider: selected?.provider ?? '',
  technologyId: selected?.technologyId ?? '',
  validityMonths: selected?.validityMonths ?? 24,
  initialCompletionMonths: selected?.initialCompletionMonths ?? null,
  expiringSoonDays: selected?.expiringSoonDays ?? null,
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
  profileRules: selected?.profileRules.map((rule) => ({ profileId: rule.profileId, mandatory: rule.mandatory })) ?? [],
});

export const CertificationCatalogForm: React.FC<Props> = ({ selected, saving, onSubmit, onCancel }) => {
  const technologiesQuery = useCatalogOptions('technologies');
  const profilesQuery = useCatalogOptions('profiles');
  const technologies = technologiesQuery.data?.items ?? [];
  const profiles = profilesQuery.data?.items ?? [];
  const [values, setValues] = useState<CertificationCatalogPayload>(() => initialPayload(selected));
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => setValues(initialPayload(selected)), [selected]);

  const profileRules = useMemo(() => new Map(values.profileRules.map((rule) => [rule.profileId, rule])), [values.profileRules]);

  const updateType = (type: CertificationType) => {
    setValues((current) => {
      if (type === 'TECHNOLOGICAL') {
        return { ...current, certificationType: type, validityMonths: 24, initialCompletionMonths: null, expiringSoonDays: null, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true, defaultMandatory: true, requirementGroup: '', requirementGroupMinimum: null, allowedLevels: ['JR', 'STD', 'SR'] };
      }
      if (type === 'METHODOLOGICAL') {
        return { ...current, certificationType: type, technologyId: '', validityMonths: null, initialCompletionMonths: null, expiringSoonDays: null, recertificationEnabled: false, requiresAttempts: true, requiresApplicationDate: true, defaultMandatory: true, requirementGroup: 'METHODOLOGICAL', requirementGroupMinimum: 1, allowedLevels: ['GENERIC'] };
      }
      if (type === 'DEVELOPMENT_SECURITY') {
        return { ...current, certificationType: type, technologyId: '', validityMonths: 12, initialCompletionMonths: null, expiringSoonDays: null, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true, defaultMandatory: true, requirementGroup: '', requirementGroupMinimum: null, allowedLevels: ['GENERIC'] };
      }
      return { ...current, certificationType: type, technologyId: '', validityMonths: null, initialCompletionMonths: null, expiringSoonDays: null, recertificationEnabled: false, requiresAttempts: false, requiresApplicationDate: false, defaultMandatory: false, requirementGroup: '', requirementGroupMinimum: null, allowedLevels: ['GENERIC'] };
    });
  };

  const toggleLevel = (level: CertificationLevel) => {
    setValues((current) => ({
      ...current,
      allowedLevels: current.allowedLevels.includes(level)
        ? current.allowedLevels.filter((item) => item !== level)
        : [...current.allowedLevels, level],
    }));
  };

  const toggleProfile = (profileId: string, checked: boolean) => {
    setValues((current) => {
      const existing = current.profileRules.find((rule) => rule.profileId === profileId);
      const next = checked
        ? [...current.profileRules.filter((rule) => rule.profileId !== profileId), existing ?? { profileId, mandatory: current.defaultMandatory }]
        : current.profileRules.filter((rule) => rule.profileId !== profileId);
      return { ...current, profileRules: next };
    });
  };

  const toggleProfileMandatory = (profileId: string, mandatory: boolean) => {
    setValues((current) => ({ ...current, profileRules: current.profileRules.map((rule) => rule.profileId === profileId ? { ...rule, mandatory } : rule) }));
  };

  const selectProfilesByLevel = () => {
    const selectedLevels = new Set(values.allowedLevels);
    const generic = selectedLevels.has('GENERIC');
    const rules: CertificationProfileRulePayload[] = profiles
      .filter((profile) => generic || (profile.seniority && selectedLevels.has(profile.seniority as CertificationLevel)))
      .map((profile) => ({ profileId: profile.id, mandatory: values.defaultMandatory }));
    setValues((current) => ({ ...current, profileRules: rules }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.code.trim()) return setValidation('El código es obligatorio.');
    if (!values.name.trim()) return setValidation('El nombre es obligatorio.');
    if (values.certificationType === 'TECHNOLOGICAL' && !values.technologyId) return setValidation('Selecciona la tecnología desde el catálogo.');
    if (values.certificationType === 'TECHNOLOGICAL' && values.allowedLevels.length === 0) return setValidation('Selecciona al menos un nivel permitido.');
    if (values.recertificationEnabled && !values.validityMonths) return setValidation('La vigencia es obligatoria cuando existe recertificación.');
    if ((values.firstAttemptCost !== null || values.subsequentAttemptCost !== null) && !values.costCurrency) return setValidation('Selecciona la moneda de los costos.');
    setValidation(null);
    onSubmit({ ...values, code: values.code.trim().toUpperCase(), name: values.name.trim(), provider: values.provider.trim(), description: values.description.trim(), requirementGroup: values.requirementGroup.trim().toUpperCase() });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {validation && <BBVAAlert tone="error" onClose={() => setValidation(null)}>{validation}</BBVAAlert>}

      <section className={sectionClass}>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Código *</span><input className={fieldClass} value={values.code} maxLength={80} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} /></label>
          <label className="md:col-span-4"><span className={labelClass}>Certificación *</span><input className={fieldClass} value={values.name} maxLength={180} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Tipo *</span><select className={fieldClass} value={values.certificationType} onChange={(e) => updateType(e.target.value as CertificationType)}>{CERTIFICATION_TYPES.map((type) => <option key={type} value={type}>{CERTIFICATION_TYPE_LABELS[type]}</option>)}</select></label>
          <label className="md:col-span-3"><span className={labelClass}>Certificadora</span><input className={fieldClass} value={values.provider} maxLength={120} onChange={(e) => setValues((v) => ({ ...v, provider: e.target.value }))} placeholder="Ej. NETEC" /></label>
          <label className="md:col-span-5"><span className={labelClass}>Tecnología {values.certificationType === 'TECHNOLOGICAL' ? '*' : ''}</span><select className={fieldClass} value={values.technologyId} disabled={values.certificationType !== 'TECHNOLOGICAL'} onChange={(e) => setValues((v) => ({ ...v, technologyId: e.target.value }))}><option value="">Sin tecnología</option>{technologies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="md:col-span-7"><span className={labelClass}>Descripción</span><textarea className={areaClass} value={values.description} maxLength={1000} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Vigencia (meses)</span><input className={fieldClass} type="number" min={1} max={240} value={values.validityMonths ?? ''} onChange={(e) => setValues((v) => ({ ...v, validityMonths: e.target.value ? Number(e.target.value) : null }))} placeholder="Sin vencimiento" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Tiempo para completar</span><input className={fieldClass} type="number" min={1} max={240} value={values.initialCompletionMonths ?? ''} onChange={(e) => setValues((v) => ({ ...v, initialCompletionMonths: e.target.value ? Number(e.target.value) : null }))} placeholder="Meses" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Grupo de requisito</span><input className={fieldClass} value={values.requirementGroup} onChange={(e) => setValues((v) => ({ ...v, requirementGroup: e.target.value }))} placeholder="Opcional" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Mínimo del grupo</span><input className={fieldClass} type="number" min={1} max={20} value={values.requirementGroupMinimum ?? ''} onChange={(e) => setValues((v) => ({ ...v, requirementGroupMinimum: e.target.value ? Number(e.target.value) : null }))} /></label>
          <div className="md:col-span-3"><span className={labelClass}>Niveles permitidos</span><div className="flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-2">{CERTIFICATION_LEVELS.map((level) => <label key={level} className="flex items-center gap-1 text-[10px] text-slate-700"><input type="checkbox" className="h-3 w-3 accent-blue-600" checked={values.allowedLevels.includes(level)} onChange={() => toggleLevel(level)} />{CERTIFICATION_LEVEL_LABELS[level]}</label>)}</div></div>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Próxima a vencer (días)</span><input className={fieldClass} type="number" min={1} max={240} value={values.expiringSoonDays ?? ''} disabled={!values.validityMonths} onChange={(e) => setValues((v) => ({ ...v, expiringSoonDays: e.target.value ? Number(e.target.value) : null }))} placeholder="90" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Costo 1er intento</span><input className={fieldClass} type="number" min={0} step="0.01" value={values.firstAttemptCost ?? ''} onChange={(e) => setValues((v) => ({ ...v, firstAttemptCost: e.target.value ? Number(e.target.value) : null }))} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Costo sig. intento</span><input className={fieldClass} type="number" min={0} step="0.01" value={values.subsequentAttemptCost ?? ''} onChange={(e) => setValues((v) => ({ ...v, subsequentAttemptCost: e.target.value ? Number(e.target.value) : null }))} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Moneda</span><select className={fieldClass} value={values.costCurrency} onChange={(e) => setValues((v) => ({ ...v, costCurrency: e.target.value }))}><option value="">—</option><option value="USD">USD</option><option value="MXN">MXN</option></select></label>
          <label className="md:col-span-4"><span className={labelClass}>Insumo</span><span className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] text-slate-700"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={values.includesTraining} onChange={(e) => setValues((v) => ({ ...v, includesTraining: e.target.checked }))} />Incluye entrenamiento / curso</span></label>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] text-slate-700"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={values.recertificationEnabled} onChange={(e) => setValues((v) => ({ ...v, recertificationEnabled: e.target.checked }))} />Recertificación</label>
          <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] text-slate-700"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={values.requiresAttempts} onChange={(e) => setValues((v) => ({ ...v, requiresAttempts: e.target.checked }))} />Controlar intentos</label>
          <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] text-slate-700"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={values.requiresApplicationDate} onChange={(e) => setValues((v) => ({ ...v, requiresApplicationDate: e.target.checked }))} />Fecha de aplicación</label>
          <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] text-slate-700"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={values.defaultMandatory} onChange={(e) => setValues((v) => ({ ...v, defaultMandatory: e.target.checked }))} />Obligatoria por defecto</label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-2 flex items-center justify-between gap-2"><div><div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500">Perfiles aplicables</div><div className="text-[10px] text-slate-400">La regla por perfil determina si esta certificación entra en los cálculos del colaborador.</div></div><button type="button" onClick={selectProfilesByLevel} className="h-7 rounded-md border border-slate-300 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">Seleccionar por nivel</button></div>
        <div className="max-h-52 overflow-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[620px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-[0.04em] text-slate-500"><tr><th className="w-20 px-2 py-1.5">Aplica</th><th className="px-2 py-1.5">Perfil</th><th className="w-24 px-2 py-1.5">Seniority</th><th className="w-28 px-2 py-1.5">Obligatoria</th></tr></thead><tbody className="divide-y divide-slate-100">{profiles.map((profile) => { const rule = profileRules.get(profile.id); return <tr key={profile.id} className="h-8"><td className="px-2"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={Boolean(rule)} onChange={(e) => toggleProfile(profile.id, e.target.checked)} /></td><td className="px-2 font-medium text-slate-800">{profile.name}</td><td className="px-2 text-slate-500">{profile.seniority || '—'}</td><td className="px-2"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" disabled={!rule} checked={Boolean(rule?.mandatory)} onChange={(e) => toggleProfileMandatory(profile.id, e.target.checked)} /></td></tr>; })}</tbody></table>
          {profiles.length === 0 && <div className="p-5 text-center text-[10.5px] text-slate-500">No hay perfiles activos disponibles.</div>}
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><X className="h-3.5 w-3.5" />Cancelar</button>
        <button type="submit" disabled={saving || technologiesQuery.isLoading || profilesQuery.isLoading} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? 'Guardando...' : selected ? 'Guardar cambios' : 'Agregar certificación'}</button>
      </div>
    </form>
  );
};
