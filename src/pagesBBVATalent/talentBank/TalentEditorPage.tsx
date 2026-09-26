import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, GraduationCap, UserRoundCheck } from 'lucide-react';
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

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
          <div className="mb-5 border-b border-slate-200 pb-4 [.bbva-dark_&]:border-slate-800">
            <h1 className="text-xl font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">Selecciona el tipo de registro</h1>
            <p className="mt-1 text-[12px] text-slate-500 [.bbva-dark_&]:text-slate-400">Elige el flujo de alta que corresponda.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <button type="button" onClick={() => setCreationType('ACADEMY')} className="group flex min-h-[170px] items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-[0_16px_32px_rgba(37,99,235,0.08)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:hover:bg-blue-500/5">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300"><GraduationCap className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[16px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Academia</strong>
                <span className="mt-2 block text-[12px] leading-5 text-slate-500 [.bbva-dark_&]:text-slate-400">Alta simplificada para participantes de academias y capacitación.</span>
                <span className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 [.bbva-dark_&]:text-blue-300">Continuar<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
              </span>
            </button>

            <button type="button" onClick={() => setCreationType('PROSPECT')} className="group flex min-h-[170px] items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-[0_16px_32px_rgba(139,92,246,0.08)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:hover:bg-violet-500/5">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 [.bbva-dark_&]:bg-violet-500/10 [.bbva-dark_&]:text-violet-300"><UserRoundCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[16px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Prospecto</strong>
                <span className="mt-2 block text-[12px] leading-5 text-slate-500 [.bbva-dark_&]:text-slate-400">Alta con información profesional completa previa a la incorporación.</span>
                <span className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 [.bbva-dark_&]:text-violet-300">Continuar<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
              </span>
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
