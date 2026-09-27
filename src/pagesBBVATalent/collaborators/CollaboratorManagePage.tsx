import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  Award,
  Briefcase,
  FileText,
  History,
  User,
  Mail,
  Pencil,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { PersonLifecycleTimeline } from '../../componentsBBVATalent/PersonLifecycleTimeline';
import { useCollaborator } from '../hooks/useCollaborators';
import { useCollaboratorLifecycle } from '../hooks/useLifecycle';
import { useCollaboratorCertifications } from '../hooks/useCollaboratorCertifications';
import {
  COLLABORATOR_CERTIFICATION_STATUS_LABELS,
  type CollaboratorCertification,
  type CollaboratorCertificationStatus,
} from '../types/collaboratorCertification';

function formatDate(value?: string | null): string {
  if (!value) return 'No disponible';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DataItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-[11px] font-medium leading-4 text-slate-800 [.bbva-dark_&]:text-slate-200">
        {value || 'No disponible'}
      </div>
    </div>
  );
}

const certificationTone: Record<CollaboratorCertificationStatus, string> = {
  VALID: 'bg-emerald-50 text-emerald-700 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300',
  EXPIRING: 'bg-amber-50 text-amber-700 [.bbva-dark_&]:bg-amber-500/10 [.bbva-dark_&]:text-amber-300',
  EXPIRED: 'bg-rose-50 text-rose-700 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-300',
  RECERTIFICATION_PENDING: 'bg-orange-50 text-orange-700 [.bbva-dark_&]:bg-orange-500/10 [.bbva-dark_&]:text-orange-300',
  FAILED: 'bg-rose-50 text-rose-700 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-300',
  PENDING: 'bg-slate-100 text-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300',
  SCHEDULED: 'bg-blue-50 text-blue-700 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300',
  APPLIED: 'bg-indigo-50 text-indigo-700 [.bbva-dark_&]:bg-indigo-500/10 [.bbva-dark_&]:text-indigo-300',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-400',
};

function CertificationRow({ item, onOpen }: { item: CollaboratorCertification; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full gap-2 border-t border-slate-100 px-3 py-2.5 text-left transition first:border-t-0 hover:bg-slate-50/80 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:hover:bg-slate-950/35 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="truncate text-[10.5px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.certificationName}</div>
        <div className="mt-0.5 truncate text-[9.5px] text-slate-500">{[item.technologyName, item.provider].filter(Boolean).join(' · ') || 'General'}</div>
      </div>
      <span className={`w-fit rounded-full px-2 py-0.5 text-[8.5px] font-semibold ${certificationTone[item.status]}`}>
        {COLLABORATOR_CERTIFICATION_STATUS_LABELS[item.status]}
      </span>
      <div className="flex items-center gap-1 text-[9.5px] font-semibold text-blue-700 [.bbva-dark_&]:text-blue-300">
        Abrir <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

export const CollaboratorManagePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const collaboratorQuery = useCollaborator(id);
  const lifecycleQuery = useCollaboratorLifecycle(id);
  const certificationsQuery = useCollaboratorCertifications(id);
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);
  const item = collaboratorQuery.data?.item;

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const certificationData = certificationsQuery.data;
  const certificationItems = certificationData?.items ?? [];
  const attentionItems = useMemo(
    () => certificationItems.filter((cert) => cert.applicable && ['EXPIRING', 'EXPIRED', 'FAILED', 'PENDING', 'RECERTIFICATION_PENDING'].includes(cert.status)).slice(0, 4),
    [certificationItems],
  );
  const relevantCertifications = useMemo(() => {
    if (attentionItems.length) return attentionItems;
    return certificationItems.filter((cert) => cert.status !== 'NOT_APPLICABLE').slice(0, 4);
  }, [attentionItems, certificationItems]);

  const latestLifecycle = lifecycleQuery.data?.items?.[0];
  const attentionCount = certificationData
    ? certificationData.summary.expiring
      + certificationData.summary.expired
      + certificationData.summary.failed
      + certificationData.summary.pending
      + certificationData.summary.recertificationPending
    : 0;

  if (collaboratorQuery.isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">Cargando colaborador...</div>;
  }
  if (collaboratorQuery.error || !item) {
    return <BBVAAlert tone="error">{(collaboratorQuery.error as Error)?.message || 'Colaborador no encontrado.'}</BBVAAlert>;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start">
        <BBVAFormBackButton onBack={() => navigate('/bbva/collaborators')} />
      </div>

      {message ? <BBVAAlert tone="success" onClose={() => setMessage(null)}>{message}</BBVAAlert> : null}
      {lifecycleQuery.error ? <BBVAAlert tone="error">{(lifecycleQuery.error as Error).message}</BBVAAlert> : null}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <header className="border-b border-slate-200 bg-slate-50/65 px-4 py-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/40">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[17px] font-semibold text-slate-950 [.bbva-dark_&]:text-white">{item.fullName}</h1>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300' : 'bg-slate-100 text-slate-600 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300'}`}>
                  {item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">
                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />IS {item.softtekCode || 'No disponible'}</span>
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{item.email}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{[item.currentTechnology, item.expertise].filter(Boolean).join(' · ') || 'Tecnología no disponible'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/edit`)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[10.5px] font-semibold text-slate-700 transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" />Editar</button>
              <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications`)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[10.5px] font-semibold text-slate-700 transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><Award className="h-3.5 w-3.5" />Certificaciones</button>
              <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/move-to-talent`)} disabled={item.status !== 'ACTIVE'} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[10.5px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Mover a Banco de talento</button>
            </div>
          </div>

          <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70">
            <div className="border-b border-slate-100 px-3 py-2.5 sm:border-r xl:border-b-0 [.bbva-dark_&]:border-slate-800">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Perfil actual</div>
              <div className="mt-1 truncate text-[10.5px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{item.profile || 'No disponible'}</div>
              <div className="mt-0.5 truncate text-[9.5px] text-slate-500">{item.technologyProfile || 'Perfil tecnológico no disponible'}</div>
            </div>
            <div className="border-b border-slate-100 px-3 py-2.5 xl:border-b-0 xl:border-r [.bbva-dark_&]:border-slate-800">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Cobertura de certificación</div>
              <div className="mt-1 text-[15px] font-semibold text-blue-700 [.bbva-dark_&]:text-blue-300">{certificationData?.summary.coveragePercent ?? 100}%</div>
              <div className="text-[9.5px] text-slate-500">{certificationData?.summary.valid ?? 0} vigentes de {certificationData?.summary.applicable ?? 0} aplicables</div>
            </div>
            <div className="border-b border-slate-100 px-3 py-2.5 sm:border-r sm:border-b-0 [.bbva-dark_&]:border-slate-800">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Atención requerida</div>
              <div className={`mt-1 text-[15px] font-semibold ${attentionCount ? 'text-amber-700 [.bbva-dark_&]:text-amber-300' : 'text-emerald-700 [.bbva-dark_&]:text-emerald-300'}`}>{attentionCount}</div>
              <div className="text-[9.5px] text-slate-500">{attentionCount ? 'certificaciones por revisar' : 'sin alertas de certificación'}</div>
            </div>
            <div className="px-3 py-2.5">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Último movimiento</div>
              <div className="mt-1 truncate text-[10.5px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{latestLifecycle?.description || 'Sin movimientos registrados'}</div>
              <div className="mt-0.5 text-[9.5px] text-slate-500">{latestLifecycle ? formatDate(latestLifecycle.effectiveDate || latestLifecycle.createdAt?.slice(0, 10)) : '—'}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-3">
            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100"><Briefcase className="h-4 w-4 text-blue-600" />Resumen profesional</div>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <DataItem label="Perfil" value={item.profile} />
                <DataItem label="Perfil tecnológico" value={item.technologyProfile} />
                <DataItem label="Tecnología principal" value={item.currentTechnology} />
                <DataItem label="Nivel de experiencia" value={item.expertise} />
                <DataItem label="Usuario corporativo" value={item.corporateUser} />
                <DataItem label="Fecha de alta" value={formatDate(item.startDate)} />
                <DataItem label="Fecha de contratación" value={formatDate(item.hireDate)} />
                <DataItem label="Estado" value={item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 [.bbva-dark_&]:border-slate-800">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 [.bbva-dark_&]:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100"><Award className="h-4 w-4 text-emerald-600" />Certificaciones</div>
                  <div className="mt-0.5 text-[9.5px] text-slate-500">Primero se muestran las certificaciones que requieren atención.</div>
                </div>
                <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications`)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:underline [.bbva-dark_&]:text-blue-300">Gestionar todas <ArrowRight className="h-3 w-3" /></button>
              </div>
              {certificationsQuery.isLoading ? (
                <div className="px-4 py-6 text-center text-[10.5px] text-slate-500">Cargando certificaciones...</div>
              ) : certificationsQuery.error ? (
                <div className="px-4 py-5 text-[10.5px] text-rose-600">{(certificationsQuery.error as Error).message}</div>
              ) : relevantCertifications.length ? (
                relevantCertifications.map((cert) => <CertificationRow key={cert.id} item={cert} onOpen={() => navigate(`/bbva/collaborators/${item.id}/certifications/${cert.id}`)} />)
              ) : (
                <div className="px-4 py-6 text-center text-[10.5px] text-slate-500">Sin certificaciones aplicables registradas.</div>
              )}
            </section>

            <details className="rounded-2xl border border-slate-200 bg-white [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">
                <span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-slate-500" />Historial de la persona</span>
                <span className="text-[9.5px] font-normal text-slate-500">{lifecycleQuery.data?.items?.length ?? 0} movimientos</span>
              </summary>
              <div className="border-t border-slate-100 p-3 [.bbva-dark_&]:border-slate-800"><PersonLifecycleTimeline items={lifecycleQuery.data?.items ?? []} loading={lifecycleQuery.isLoading} /></div>
            </details>
          </main>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">Currículum</div>
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-[10.5px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{item.hasCv ? 'Disponible' : 'No disponible'}</div>
              <div className="mt-1 text-[9.5px] leading-4 text-slate-500">{item.hasCv ? 'El documento está asociado a la identidad de la persona.' : 'No existe un archivo registrado para esta persona.'}</div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">Observaciones</div>
              <div className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[10.5px] leading-5 text-slate-600 [.bbva-dark_&]:text-slate-300">{item.notes || 'Sin observaciones.'}</div>
            </section>

          </aside>
        </div>
      </section>
    </div>
  );
};
