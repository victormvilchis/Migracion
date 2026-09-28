import React, { useMemo } from 'react';
import { ArrowRight, Award, Briefcase, FileText, Mail, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACertificationStatusBadge } from '../../componentsBBVATalent/BBVACertificationStatusBadge';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { useCollaboratorCertifications } from '../hooks/useCollaboratorCertifications';
import { useCollaborator } from '../hooks/useCollaborators';
import { useCollaboratorLifecycle } from '../hooks/useLifecycle';
import type { CollaboratorCertification } from '../types/collaboratorCertification';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOpenCritical(item: CollaboratorCertification) {
  return item.baseStatus === 'FAILED'
    && item.requiresAttempts
    && item.maxAttempts === 2
    && item.attemptCount >= 2
    && ['DEVELOPMENT_SECURITY', 'TECHNOLOGICAL', 'NORMATIVE_TESTING'].includes(item.certificationType)
    && (!item.criticalResolutionStatus || item.criticalResolutionStatus === 'PENDING_REVIEW' || item.criticalResolutionStatus === 'LOW_REQUESTED');
}

function certificationPriority(item: CollaboratorCertification) {
  if (isOpenCritical(item)) return 0;
  if (item.status === 'EXPIRED') return 1;
  if (item.status === 'RECERTIFICATION_PENDING') return 2;
  if (item.status === 'EXPIRING') return 3;
  if (item.status === 'FAILED') return 4;
  if (item.status === 'SCHEDULED') return 5;
  if (item.status === 'PENDING') return 6;
  return 7;
}

const DetailValue: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="text-[8px] font-semibold uppercase tracking-[.06em] text-slate-400">{label}</div>
    <div className="mt-1 break-words text-[10.5px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100">{value || 'No disponible'}</div>
  </div>
);

export const CollaboratorDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const collaboratorQuery = useCollaborator(id);
  const certificationsQuery = useCollaboratorCertifications(id);
  const lifecycleQuery = useCollaboratorLifecycle(id);
  const item = collaboratorQuery.data?.item;
  const certifications = certificationsQuery.data?.items ?? [];
  const summary = certificationsQuery.data?.summary;
  const latestMovement = lifecycleQuery.data?.items?.[0] ?? null;

  const visibleCertifications = useMemo(() => certifications
    .filter((certification) => certification.status !== 'NOT_APPLICABLE')
    .sort((a, b) => certificationPriority(a) - certificationPriority(b) || a.certificationName.localeCompare(b.certificationName, 'es-MX'))
    .slice(0, 6), [certifications]);

  if (collaboratorQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando colaborador...</div>;
  if (collaboratorQuery.error || !item) return <BBVAAlert tone="error">{collaboratorQuery.error ? (collaboratorQuery.error as Error).message : 'Colaborador no encontrado.'}</BBVAAlert>;

  const covered = (summary?.valid ?? item.certificationValid) + (summary?.expiring ?? item.certificationExpiring);
  const applicable = summary?.applicable ?? item.certificationApplicable;
  const coverage = summary?.coveragePercent ?? (applicable ? Math.round((covered / applicable) * 10000) / 100 : 100);
  const attention = certifications.filter((certification) => certification.status !== 'NOT_APPLICABLE'
    && (isOpenCritical(certification) || ['EXPIRED', 'RECERTIFICATION_PENDING', 'PENDING', 'FAILED', 'APPLIED', 'SCHEDULED'].includes(certification.status))).length;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => navigate('/bbva/collaborators')} /></div>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 [.bbva-dark_&]:border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[17px] font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">{item.fullName}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300' : 'bg-slate-100 text-slate-600 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300'}`}>{item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">
              <span>{item.softtekCode || 'Sin IS'}</span>
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{item.softtekEmail}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{item.currentTechnology || 'Sin tecnología'} · {item.expertise || 'Sin nivel'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BBVAButton variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => navigate(`/bbva/collaborators/${item.id}/edit`)}>Editar</BBVAButton>
            <BBVAButton variant="secondary" size="sm" icon={<Award className="h-3.5 w-3.5" />} onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications`, { state: { returnTo: `/bbva/collaborators/${item.id}` } })}>Certificaciones</BBVAButton>
            
          </div>
        </div>

        <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4 [.bbva-dark_&]:border-slate-800">
          <div className="border-b border-slate-100 px-4 py-3 sm:border-r xl:border-b-0 [.bbva-dark_&]:border-slate-800"><div className="text-[8px] font-semibold uppercase tracking-[.06em] text-slate-400">Perfil actual</div><div className="mt-1 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.profile || 'Sin perfil'}</div><div className="text-[9px] text-slate-500">{item.technologyProfile || 'Sin perfil tecnológico'}</div></div>
          <div className="border-b border-slate-100 px-4 py-3 xl:border-b-0 xl:border-r [.bbva-dark_&]:border-slate-800"><div className="text-[8px] font-semibold uppercase tracking-[.06em] text-slate-400">Cobertura de certificación</div><div className="mt-1 text-[18px] font-semibold text-blue-700 [.bbva-dark_&]:text-cyan-300">{coverage}%</div><div className="text-[9px] text-slate-500">{covered} cubiertas de {applicable} aplicables</div></div>
          <div className="border-b border-slate-100 px-4 py-3 sm:border-r xl:border-b-0 [.bbva-dark_&]:border-slate-800"><div className="text-[8px] font-semibold uppercase tracking-[.06em] text-slate-400">Atención requerida</div><div className={`mt-1 text-[18px] font-semibold ${attention ? 'text-amber-700 [.bbva-dark_&]:text-amber-300' : 'text-emerald-700 [.bbva-dark_&]:text-emerald-300'}`}>{attention}</div><div className="text-[9px] text-slate-500">{attention ? 'pendientes, vencidas, críticas o por recertificar' : 'sin alertas de certificación'}</div></div>
          <div className="px-4 py-3"><div className="text-[8px] font-semibold uppercase tracking-[.06em] text-slate-400">Último movimiento</div><div className="mt-1 line-clamp-2 text-[10px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100">{latestMovement?.description || 'Sin movimientos registrados.'}</div><div className="text-[9px] text-slate-500">{latestMovement ? formatDateTime(latestMovement.createdAt) : '—'}</div></div>
        </div>

        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
            <div className="mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-600" /><h2 className="text-[12px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Resumen profesional</h2></div>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailValue label="Perfil" value={item.profile} />
              <DetailValue label="Perfil tecnológico" value={item.technologyProfile} />
              <DetailValue label="Tecnología principal" value={item.currentTechnology} />
              <DetailValue label="Nivel de experiencia" value={item.expertise} />
              <DetailValue label="DM" value={item.deliveryManager} />
              <DetailValue label="Usuario BBVA" value={item.bbvaUser || item.corporateUser} />
              <DetailValue label="Fecha de alta BBVA" value={formatDate(item.bbvaStartDate)} />
              <DetailValue label="Contratación Softtek" value={formatDate(item.softtekHireDate)} />
              <DetailValue label="Correo Softtek" value={item.softtekEmail} />
              <DetailValue label="Correo BBVA" value={item.bbvaEmail} />
              <DetailValue label="Estado" value={item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} />
              <DetailValue label="IS Softtek" value={item.softtekCode} />
            </div>
          </section>

          <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.05em] text-slate-500">Currículum</div><div className="mt-2 text-[11px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100">{item.hasCv ? 'Disponible' : 'No disponible'}</div><div className="mt-1 text-[9.5px] text-slate-500">{item.hasCv ? 'Existe un archivo registrado para esta persona.' : 'No existe un archivo registrado para esta persona.'}</div></div><FileText className="h-5 w-5 text-blue-600" /></div>
            </section>
            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="text-[9px] font-semibold uppercase tracking-[.05em] text-slate-500">Observaciones</div><div className="mt-2 whitespace-pre-wrap text-[10.5px] leading-5 text-slate-700 [.bbva-dark_&]:text-slate-200">{item.notes || 'Sin observaciones.'}</div>
            </section>
          </div>
        </div>

        <section className="border-t border-slate-200 [.bbva-dark_&]:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 [.bbva-dark_&]:border-slate-800">
            <div><div className="flex items-center gap-2"><Award className="h-4 w-4 text-emerald-600" /><h2 className="text-[12px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Certificaciones</h2></div><div className="mt-0.5 text-[9.5px] text-slate-500">Primero se muestran las certificaciones que requieren atención.</div></div>
            <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications`, { state: { returnTo: `/bbva/collaborators/${item.id}` } })} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-500 [.bbva-dark_&]:text-cyan-300">Ver todas <ArrowRight className="h-3 w-3" /></button>
          </div>
          {certificationsQuery.isLoading ? <div className="px-4 py-6 text-center text-[10px] text-slate-500">Cargando certificaciones...</div> : visibleCertifications.length ? <div className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{visibleCertifications.map((certification) => (
            <button key={certification.id} type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications/${certification.id}`, { state: { returnTo: `/bbva/collaborators/${item.id}` } })} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/45">
              <div className="min-w-0"><div className="truncate text-[10.5px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{certification.certificationName}</div><div className="mt-0.5 truncate text-[9px] text-slate-500">{[certification.technologyName, certification.certificationLevel && certification.certificationLevel !== 'GENERIC' ? certification.certificationLevel : null].filter(Boolean).join(' · ') || 'General'}</div></div>
              <div className="flex shrink-0 items-center gap-3">{isOpenCritical(certification) ? <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[8.5px] font-bold uppercase text-white">Crítico</span> : <BBVACertificationStatusBadge status={certification.status} />}<span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-blue-700 [.bbva-dark_&]:text-cyan-300">Abrir <ArrowRight className="h-3 w-3" /></span></div>
            </button>
          ))}</div> : <div className="px-4 py-6 text-center text-[10px] text-slate-500">No hay certificaciones activas para esta persona.</div>}
        </section>
      </section>
    </div>
  );
};
