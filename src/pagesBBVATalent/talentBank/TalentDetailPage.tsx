import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { TalentForm } from '../../componentsBBVATalent/TalentForm';
import { PersonLifecycleTimeline } from '../../componentsBBVATalent/PersonLifecycleTimeline';
import { useDeleteTalent, useTalent } from '../hooks/useTalent';
import { useTalentLifecycle } from '../hooks/useLifecycle';

interface TalentDetailPageProps {
  mode?: 'view' | 'delete';
}

export const TalentDetailPage: React.FC<TalentDetailPageProps> = ({ mode = 'view' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const talentQuery = useTalent(id);
  const deleteMutation = useDeleteTalent();
  const lifecycleQuery = useTalentLifecycle(mode === 'view' ? id : undefined);
  const [error, setError] = useState<string | null>(null);
  const talent = talentQuery.data?.item;

  const remove = async () => {
    if (!id || !talent) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/bbva/talent-bank', { state: { message: 'El registro fue eliminado lógicamente. Su identidad e historial se conservaron.' } });
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  };

  if (talentQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando detalle...</div>;
  if (talentQuery.error || !talent) return <BBVAAlert tone="error">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start">
        <BBVAFormBackButton onBack={() => navigate('/bbva/talent-bank')} disabled={deleteMutation.isPending} />
      </div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      {talent.recordStatus === 'DELETED' ? <BBVAAlert tone="warning">Registro eliminado lógicamente. Se conserva únicamente para consulta y trazabilidad.</BBVAAlert> : null}
      {mode === 'delete' ? <BBVAAlert tone="warning">La eliminación será lógica: la persona, CV, certificaciones e historial no se borrarán.</BBVAAlert> : null}
      {mode === 'view' && (talent.talentType === 'FORMER_COLLABORATOR' || talent.talentType === 'BBVA_EXIT') ? (
        <section className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/45 p-3 text-[10.5px] [.bbva-dark_&]:border-blue-500/20 [.bbva-dark_&]:bg-blue-500/5 sm:grid-cols-4">
          <div><div className="text-[8.5px] font-semibold uppercase tracking-[0.05em] text-slate-400">Motivo del movimiento</div><div className="mt-1 font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{talent.lifecycleReasonName || 'No disponible'}</div></div>
          <div><div className="text-[8.5px] font-semibold uppercase tracking-[0.05em] text-slate-400">Etapa actual</div><div className="mt-1 font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{talent.stage === 'AVAILABLE' ? 'Disponible' : talent.stage === 'UNASSIGNED' ? 'Desasignado' : talent.stage}</div></div>
          <div><div className="text-[8.5px] font-semibold uppercase tracking-[0.05em] text-slate-400">Fecha efectiva</div><div className="mt-1 font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{talent.lifecycleEffectiveDate || talent.entryDate || 'No disponible'}</div></div>
          <div><div className="text-[8.5px] font-semibold uppercase tracking-[0.05em] text-slate-400">Observaciones del movimiento</div><div className="mt-1 whitespace-pre-wrap text-slate-700 [.bbva-dark_&]:text-slate-300">{talent.lifecycleNotes || 'Sin observaciones.'}</div></div>
        </section>
      ) : null}
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <TalentForm
          selected={talent}
          initialTalentType={talent.talentType}
          currentCv={talent.cv}
          mode={mode}
          saving={deleteMutation.isPending}
          onSubmit={() => undefined}
          onCancel={() => navigate('/bbva/talent-bank')}
          onDelete={mode === 'delete' ? () => void remove() : undefined}
        />
      </div>
      {mode === 'view' ? (
        <section>
          <div className="mb-2 text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Historial de la persona</div>
          {lifecycleQuery.error ? <BBVAAlert tone="error">{(lifecycleQuery.error as Error).message}</BBVAAlert> : <PersonLifecycleTimeline items={lifecycleQuery.data?.items ?? []} loading={lifecycleQuery.isLoading} />}
        </section>
      ) : null}
    </div>
  );
};
