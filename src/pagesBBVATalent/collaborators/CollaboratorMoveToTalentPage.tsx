import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useCollaborator } from '../hooks/useCollaborators';
import { useLifecycleReasons, useMoveCollaboratorToTalent } from '../hooks/useLifecycle';
import type { MoveCollaboratorToTalentPayload } from '../types/lifecycle';

const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';
const areaClass = 'min-h-[100px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';

function today(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CollaboratorMoveToTalentPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const collaboratorQuery = useCollaborator(id);
  const reasonsQuery = useLifecycleReasons();
  const moveMutation = useMoveCollaboratorToTalent();
  const [values, setValues] = useState<MoveCollaboratorToTalentPayload>({ reasonCode: '', effectiveDate: today(), talentStage: 'UNASSIGNED', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const item = collaboratorQuery.data?.item;
  const reasons = useMemo(() => reasonsQuery.data?.items ?? [], [reasonsQuery.data]);

  useEffect(() => {
    const selected = reasons.find((reason) => reason.code === values.reasonCode);
    if (!selected) return;
    setValues((current) => current.talentStage === selected.defaultTalentStage ? current : { ...current, talentStage: selected.defaultTalentStage });
  }, [reasons, values.reasonCode]);

  const requestConfirmation = () => {
    if (!values.reasonCode) return setError('Selecciona el motivo del movimiento.');
    if (!values.effectiveDate) return setError('Selecciona la fecha efectiva.');
    setError(null);
    setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!id) return;
    try {
      setError(null);
      const result = await moveMutation.mutateAsync({ id, payload: values });
      navigate('/bbva/talent-bank', { state: { message: result.message } });
    } catch (moveError) {
      setConfirmOpen(false);
      setError((moveError as Error).message);
    }
  };

  if (collaboratorQuery.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando colaborador...</div>;
  if (collaboratorQuery.error || !item) return <BBVAAlert tone="error">{(collaboratorQuery.error as Error)?.message || 'Colaborador no encontrado.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => navigate(`/bbva/collaborators/${item.id}/manage`)} disabled={moveMutation.isPending} /></div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      {reasonsQuery.error ? <BBVAAlert tone="error">{(reasonsQuery.error as Error).message}</BBVAAlert> : null}

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-[11px] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/30 sm:grid-cols-3">
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Persona</div><div className="mt-1 font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.fullName}</div><div className="text-[10px] text-slate-500">{item.email}</div></div>
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Perfil</div><div className="mt-1 font-medium text-slate-800 [.bbva-dark_&]:text-slate-200">{item.profile || 'No disponible'}</div><div className="text-[10px] text-slate-500">{item.technologyProfile || 'Sin perfil tecnológico'}</div></div>
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Tecnología</div><div className="mt-1 font-medium text-slate-800 [.bbva-dark_&]:text-slate-200">{item.currentTechnology || 'No disponible'}</div><div className="text-[10px] text-slate-500">{item.expertise || 'Sin nivel de experiencia'}</div></div>
        </div>

        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4">
            <span className={labelClass}>Motivo *</span>
            <BBVASearchableSelect
              value={values.reasonCode}
              onChange={(reasonCode) => setValues((current) => ({ ...current, reasonCode }))}
              options={[{ value: '', label: 'Seleccionar' }, ...reasons.map((reason) => ({ value: reason.code, label: reason.name }))]}
              disabled={reasonsQuery.isLoading || moveMutation.isPending}
              ariaLabel="Motivo"
            />
          </label>
          <label className="md:col-span-4">
            <span className={labelClass}>Etapa en Banco de talento *</span>
            <BBVASearchableSelect
              value={values.talentStage}
              onChange={(talentStage) => setValues((current) => ({ ...current, talentStage: talentStage as MoveCollaboratorToTalentPayload['talentStage'] }))}
              options={[{ value: 'AVAILABLE', label: 'Disponible' }, { value: 'UNASSIGNED', label: 'Desasignado' }]}
              disabled={moveMutation.isPending}
              ariaLabel="Etapa en Banco de talento"
            />
          </label>
          <label className="md:col-span-4">
            <span className={labelClass}>Fecha efectiva *</span>
            <BBVADatePicker value={values.effectiveDate} onChange={(effectiveDate) => setValues((current) => ({ ...current, effectiveDate }))} disabled={moveMutation.isPending} ariaLabel="Fecha efectiva" />
          </label>
          <label className="md:col-span-12">
            <span className={labelClass}>Observaciones</span>
            <textarea value={values.notes} maxLength={1000} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} disabled={moveMutation.isPending} className={areaClass} placeholder="Opcional" />
          </label>
        </div>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4 [.bbva-dark_&]:border-slate-800">
          <button type="button" onClick={requestConfirmation} disabled={moveMutation.isPending || reasonsQuery.isLoading} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Mover a Banco de talento</button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Mover a Banco de talento"
        message={`La persona dejará Colaboradores y pasará a Banco de talento con motivo "${reasons.find((reason) => reason.code === values.reasonCode)?.name ?? values.reasonCode}" y etapa "${values.talentStage === 'AVAILABLE' ? 'Disponible' : 'Desasignado'}". Se conservarán su identidad, CV, certificaciones e historial. ¿Deseas continuar?`}
        confirmLabel="Confirmar movimiento"
        tone="primary"
        busy={moveMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
};
