import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, GraduationCap, Sparkles, UserRoundCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { TalentForm } from '../../componentsBBVATalent/TalentForm';
import { downloadCvDocument, fileToCvPayload, viewCvDocument } from '../lib/talentCv';
import { useCreateTalent, useSaveTalentCv, useTalent, useUpdateTalent } from '../hooks/useTalent';
import { talentApi } from '../api/talentApi';
import type { TalentPayload, TalentType } from '../types/talent';

export const TalentEditorPage: React.FC = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const talentQuery = useTalent(id);
  const createMutation = useCreateTalent();
  const updateMutation = useUpdateTalent();
  const cvMutation = useSaveTalentCv();
  const [error, setError] = useState<string | null>(null);
  const [creationType, setCreationType] = useState<TalentType | null>(null);
  const selected = talentQuery.data?.item ?? null;
  const saving = createMutation.isPending || updateMutation.isPending || cvMutation.isPending;

  const openCv = async (download: boolean) => {
    if (!id) return;
    try {
      const response = await talentApi.getCv(id);
      if (download) downloadCvDocument(response.document); else viewCvDocument(response.document);
    } catch (cvError) { setError((cvError as Error).message); }
  };

  const submit = async (payload: TalentPayload, cvFile: File | null) => {
    setError(null);
    try {
      const result = editing && id ? await updateMutation.mutateAsync({ id, payload }) : await createMutation.mutateAsync(payload);
      const saved = result.item;
      if (cvFile) await cvMutation.mutateAsync({ id: saved.id, payload: await fileToCvPayload(cvFile) });
      navigate('/bbva/talent-bank', { state: { message: editing ? 'La información se actualizó correctamente.' : 'El talento se registró correctamente.' } });
    } catch (submitError) { setError((submitError as Error).message); }
  };

  if (editing && talentQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando talento...</div>;
  if (editing && (talentQuery.error || !selected)) return <BBVAAlert tone="error">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</BBVAAlert>;

  if (!editing && !creationType) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-5 py-6 text-white [.bbva-dark_&]:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"><Sparkles className="h-3.5 w-3.5" />BBVA Talent Workspace</div>
                <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-[30px]">Selecciona el tipo de alta para iniciar el registro.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Diseñamos una experiencia más amplia, clara e inteligente para que el flujo de captura se sienta moderno, dinámico y preparado para futuras integraciones.</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.12em] text-blue-100">Vista de trabajo</div>
                <div className="mt-1 text-sm font-semibold">Alta de talento</div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <button type="button" onClick={() => setCreationType('ACADEMY')} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_20px_40px_rgba(37,99,235,0.10)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-white opacity-90 [.bbva-dark_&]:from-blue-500/10 [.bbva-dark_&]:via-slate-900 [.bbva-dark_&]:to-slate-900" aria-hidden="true" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 [.bbva-dark_&]:text-blue-300"><GraduationCap className="h-6 w-6" /></span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700 [.bbva-dark_&]:border-blue-500/20 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-200">Flujo ágil</span>
                </div>
                <div>
                  <strong className="block text-lg text-slate-900 [.bbva-dark_&]:text-slate-100">Academia</strong>
                  <span className="mt-2 block text-[13px] leading-6 text-slate-500 [.bbva-dark_&]:text-slate-300">Registro simplificado para participantes en academias y capacitación. Ideal para altas rápidas con los datos más importantes.</span>
                </div>
                <ul className="grid gap-2 text-[11px] text-slate-600 [.bbva-dark_&]:text-slate-300">
                  <li>• Menos fricción para capturar rápidamente.</li>
                  <li>• Enfoque en talento de formación y seguimiento inicial.</li>
                  <li>• Preparado para evolucionar hacia colaborador.</li>
                </ul>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 [.bbva-dark_&]:text-blue-200">Iniciar alta<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
              </div>
            </button>
            <button type="button" onClick={() => setCreationType('PROSPECT')} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_20px_40px_rgba(139,92,246,0.10)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-white opacity-90 [.bbva-dark_&]:from-violet-500/10 [.bbva-dark_&]:via-slate-900 [.bbva-dark_&]:to-slate-900" aria-hidden="true" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 [.bbva-dark_&]:text-violet-300"><UserRoundCheck className="h-6 w-6" /></span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-700 [.bbva-dark_&]:border-violet-500/20 [.bbva-dark_&]:bg-violet-500/10 [.bbva-dark_&]:text-violet-200">Flujo completo</span>
                </div>
                <div>
                  <strong className="block text-lg text-slate-900 [.bbva-dark_&]:text-slate-100">Prospecto</strong>
                  <span className="mt-2 block text-[13px] leading-6 text-slate-500 [.bbva-dark_&]:text-slate-300">Información profesional completa previa a su incorporación como colaborador. Perfecto para una evaluación más detallada.</span>
                </div>
                <ul className="grid gap-2 text-[11px] text-slate-600 [.bbva-dark_&]:text-slate-300">
                  <li>• Incluye contexto profesional y técnico completo.</li>
                  <li>• Mejor preparado para filtros y seguimiento posterior.</li>
                  <li>• Base sólida para un workspace responsivo y dinámico.</li>
                </ul>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 [.bbva-dark_&]:text-violet-200">Iniciar alta<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
              </div>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error && <BBVAAlert tone="error">{error}</BBVAAlert>}
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <TalentForm selected={selected} initialTalentType={creationType ?? selected?.talentType ?? 'ACADEMY'} currentCv={selected?.cv} saving={saving} onSubmit={(payload, cvFile) => void submit(payload, cvFile)} onCancel={() => navigate('/bbva/talent-bank')} onViewCv={() => void openCv(false)} onDownloadCv={() => void openCv(true)} />
      </div>
    </div>
  );
};
