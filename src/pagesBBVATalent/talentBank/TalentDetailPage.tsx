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
      navigate('/bbva/talent-bank', { state: { message: 'El talento fue eliminado correctamente.' } });
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
