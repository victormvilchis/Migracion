import React, { useState } from 'react';
import { ArrowLeft, GraduationCap, UserRoundCheck } from 'lucide-react';
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
      <div className="space-y-3 animate-fade-in">
        <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
        <div className="grid max-w-3xl gap-3 md:grid-cols-2">
          <button type="button" onClick={() => setCreationType('ACADEMY')} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:hover:border-blue-500/30 [.bbva-dark_&]:hover:bg-blue-500/5">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300"><GraduationCap className="h-5 w-5" /></span><span><strong className="block text-sm text-slate-900 [.bbva-dark_&]:text-slate-100">Academia</strong><span className="mt-1 block text-[11px] leading-5 text-slate-500 [.bbva-dark_&]:text-slate-400">Registro simplificado para participantes en academias y capacitación.</span></span>
          </button>
          <button type="button" onClick={() => setCreationType('PROSPECT')} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:hover:border-blue-500/30 [.bbva-dark_&]:hover:bg-blue-500/5">
            <span className="rounded-lg bg-violet-50 p-2 text-violet-600 [.bbva-dark_&]:bg-violet-500/10 [.bbva-dark_&]:text-violet-300"><UserRoundCheck className="h-5 w-5" /></span><span><strong className="block text-sm text-slate-900 [.bbva-dark_&]:text-slate-100">Prospecto</strong><span className="mt-1 block text-[11px] leading-5 text-slate-500 [.bbva-dark_&]:text-slate-400">Información profesional completa previa a su incorporación como colaborador.</span></span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error && <BBVAAlert tone="error">{error}</BBVAAlert>}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <TalentForm selected={selected} initialTalentType={creationType ?? selected?.talentType ?? 'ACADEMY'} currentCv={selected?.cv} saving={saving} onSubmit={(payload, cvFile) => void submit(payload, cvFile)} onCancel={() => navigate('/bbva/talent-bank')} onViewCv={() => void openCv(false)} onDownloadCv={() => void openCv(true)} />
      </div>
    </div>
  );
};
