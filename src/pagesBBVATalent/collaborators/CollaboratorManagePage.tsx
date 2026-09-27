import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Award, Briefcase, FileText, Pencil } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { PersonLifecycleTimeline } from '../../componentsBBVATalent/PersonLifecycleTimeline';
import { useCollaborator } from '../hooks/useCollaborators';
import { useCollaboratorLifecycle } from '../hooks/useLifecycle';

function formatDate(value?: string | null): string {
  if (!value) return 'No disponible';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DataItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-slate-800 [.bbva-dark_&]:text-slate-200">{value || 'No disponible'}</div>
    </div>
  );
}

export const CollaboratorManagePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const collaboratorQuery = useCollaborator(id);
  const lifecycleQuery = useCollaboratorLifecycle(id);
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);
  const item = collaboratorQuery.data?.item;

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

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
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/40 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold text-slate-950 [.bbva-dark_&]:text-white">{item.fullName}</h1>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300' : 'bg-slate-100 text-slate-600 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300'}`}>{item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">
              <span>IS: {item.softtekCode || 'No disponible'}</span>
              <span>{item.email}</span>
              <span>{[item.currentTechnology, item.expertise].filter(Boolean).join(' · ') || 'Tecnología no disponible'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/edit`)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[10.5px] font-semibold text-slate-700 transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" />Editar</button>
            <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications`)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[10.5px] font-semibold text-slate-700 transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><Award className="h-3.5 w-3.5" />Certificaciones</button>
            <button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/move-to-talent`)} disabled={item.status !== 'ACTIVE'} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[10.5px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Mover a Banco de talento</button>
          </div>
        </div>

        <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100"><Briefcase className="h-4 w-4 text-blue-600" />Información actual</div>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <DataItem label="Perfil" value={item.profile} />
                <DataItem label="Perfil tecnológico" value={item.technologyProfile} />
                <DataItem label="Tecnología actual" value={item.currentTechnology} />
                <DataItem label="Nivel de experiencia" value={item.expertise} />
                <DataItem label="Usuario corporativo" value={item.corporateUser} />
                <DataItem label="Fecha de alta" value={formatDate(item.startDate)} />
                <DataItem label="Fecha de contratación" value={formatDate(item.hireDate)} />
                <DataItem label="Vencimiento" value={formatDate(item.endDate)} />
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Historial de la persona</div>
              <PersonLifecycleTimeline items={lifecycleQuery.data?.items ?? []} loading={lifecycleQuery.isLoading} />
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/30">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">Documento</div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.hasCv ? 'bg-blue-50 text-blue-600 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300' : 'bg-slate-100 text-slate-400 [.bbva-dark_&]:bg-slate-800'}`}><FileText className="h-4 w-4" /></span>
                <div>
                  <div className="text-[11px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">Currículum</div>
                  <div className="text-[10px] text-slate-500">{item.hasCv ? 'Disponible en la identidad de la persona' : 'Sin archivo registrado'}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 [.bbva-dark_&]:border-slate-800">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">Observaciones</div>
              <div className="mt-2 whitespace-pre-wrap text-[10.5px] leading-5 text-slate-600 [.bbva-dark_&]:text-slate-300">{item.notes || 'Sin observaciones.'}</div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
};
