import React from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { useCertificationCatalogItem } from '../hooks/useCertificationCatalog';
import { CERTIFICATION_LEVEL_LABELS, CERTIFICATION_TYPE_LABELS } from '../types/certificationCatalog';

const route = '/bbva/admin/catalogs/certifications';
const labelClass = 'text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500';
const valueClass = 'mt-0.5 text-[11px] font-medium text-slate-900';
const fieldClass = 'rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2';

export const CertificationCatalogDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCertificationCatalogItem(id);
  const item = query.data?.item;
  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificación...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Certificación no encontrada.'}</BBVAAlert>;

  return <div className="space-y-3 animate-fade-in">
    <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => navigate(route)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button><button type="button" onClick={() => navigate(`${route}/${item.id}/edit`)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500"><Pencil className="h-3.5 w-3.5" />Editar</button></div>
    <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
      <div className={`${fieldClass} lg:col-span-2`}><div className={labelClass}>Certificación</div><div className={valueClass}>{item.name}</div><div className="text-[9.5px] text-slate-500">{item.code}</div></div>
      <div className={fieldClass}><div className={labelClass}>Tipo</div><div className={valueClass}>{CERTIFICATION_TYPE_LABELS[item.certificationType]}</div></div>
      <div className={fieldClass}><div className={labelClass}>Certificadora</div><div className={valueClass}>{item.provider || 'N/A'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Tecnología</div><div className={valueClass}>{item.technologyName || 'N/A'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Estado</div><div className={valueClass}>{item.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Vigencia</div><div className={valueClass}>{item.validityMonths ? `${item.validityMonths} meses` : 'Sin vencimiento'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Tiempo para completar</div><div className={valueClass}>{item.initialCompletionMonths ? `${item.initialCompletionMonths} meses` : 'N/A'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Próxima a vencer</div><div className={valueClass}>{item.expiringSoonDays ? `${item.expiringSoonDays} días antes` : 'N/A'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Recertificación</div><div className={valueClass}>{item.recertificationEnabled ? 'Sí' : 'No'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Obligatoria por defecto</div><div className={valueClass}>{item.defaultMandatory ? 'Sí' : 'No'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Intentos</div><div className={valueClass}>{item.requiresAttempts ? 'Controlados' : 'No aplica'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Fecha aplicación</div><div className={valueClass}>{item.requiresApplicationDate ? 'Requerida' : 'No aplica'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Costo primer intento</div><div className={valueClass}>{item.firstAttemptCost !== null ? `${item.costCurrency ?? ''} ${item.firstAttemptCost.toFixed(2)}`.trim() : 'N/A'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Costo intentos posteriores</div><div className={valueClass}>{item.subsequentAttemptCost !== null ? `${item.costCurrency ?? ''} ${item.subsequentAttemptCost.toFixed(2)}`.trim() : 'N/A'}</div></div>
      <div className={fieldClass}><div className={labelClass}>Incluye entrenamiento</div><div className={valueClass}>{item.includesTraining ? 'Sí' : 'No'}</div></div>
      <div className={`${fieldClass} lg:col-span-2`}><div className={labelClass}>Niveles</div><div className={valueClass}>{item.allowedLevels.map((level) => CERTIFICATION_LEVEL_LABELS[level]).join(', ') || 'N/A'}</div></div>
      <div className={`${fieldClass} lg:col-span-2`}><div className={labelClass}>Grupo de requisito</div><div className={valueClass}>{item.requirementGroup ? `${item.requirementGroup}${item.requirementGroupMinimum ? ` · mínimo ${item.requirementGroupMinimum}` : ''}` : 'N/A'}</div></div>
      <div className={`${fieldClass} sm:col-span-2 lg:col-span-6`}><div className={labelClass}>Descripción</div><div className={`${valueClass} whitespace-pre-wrap`}>{item.description || 'Sin descripción.'}</div></div>
    </section>
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500">Perfiles aplicables ({item.profileRules.length})</div><div className="max-h-64 overflow-auto"><table className="w-full text-left text-[10.5px]"><thead className="bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="px-3 py-1.5">Perfil</th><th className="w-24 px-3 py-1.5">Seniority</th><th className="w-28 px-3 py-1.5">Obligatoria</th></tr></thead><tbody className="divide-y divide-slate-100">{item.profileRules.map((rule) => <tr key={rule.profileId}><td className="px-3 py-1.5 font-medium text-slate-800">{rule.profileName}</td><td className="px-3 py-1.5 text-slate-500">{rule.profileSeniority || '—'}</td><td className="px-3 py-1.5 text-slate-700">{rule.mandatory ? 'Sí' : 'No'}</td></tr>)}</tbody></table>{item.profileRules.length === 0 && <div className="p-5 text-center text-[10.5px] text-slate-500">Sin perfiles asignados.</div>}</div></section>
  </div>;
};
