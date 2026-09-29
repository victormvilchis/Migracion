import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVARequiredMark } from '../../componentsBBVATalent/BBVARequiredMark';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { bbvaBusinessDate } from '../../lib/bbvaBusinessDate';
import { useCollaborator } from '../hooks/useCollaborators';
import { useLifecycleReasons, useMoveCollaboratorToTalent } from '../hooks/useLifecycle';
import type { LifecycleReasonOption, MoveCollaboratorToTalentPayload } from '../types/lifecycle';

const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';
const areaClass = 'min-h-[100px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';

type ReasonGroup = LifecycleReasonOption['reasonGroup'];
const GROUP_LABELS: Record<ReasonGroup, string> = {
  AVAILABLE: 'Sin proyecto / disponible',
  UNASSIGNED: 'Desasignación / otra cuenta',
  BBVA_EXIT: 'Baja de BBVA',
  OTHER: 'Otro',
};


export const CollaboratorMoveToTalentPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const criticalState = (location.state as { criticalCertification?: string; criticalMessage?: string; preferredReasonGroup?: ReasonGroup } | null) ?? {};
  const collaboratorQuery = useCollaborator(id);
  const reasonsQuery = useLifecycleReasons();
  const moveMutation = useMoveCollaboratorToTalent();
  const [reasonGroup, setReasonGroup] = useState<ReasonGroup | ''>('');
  const [values, setValues] = useState<MoveCollaboratorToTalentPayload>({ reasonCode: '', effectiveDate: bbvaBusinessDate(), talentStage: 'UNASSIGNED', affiliationType: 'INTERNAL', notes: '', expectedUpdatedAt: '' });
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const item = collaboratorQuery.data?.item;
  const reasons = useMemo(() => reasonsQuery.data?.items ?? [], [reasonsQuery.data]);
  const groupedReasons = useMemo(() => reasons.filter((reason) => reason.reasonGroup === reasonGroup), [reasonGroup, reasons]);
  const availableGroups = useMemo(() => Array.from(new Set(reasons.map((reason) => reason.reasonGroup))), [reasons]);

  useEffect(() => {
    const preferred = criticalState.preferredReasonGroup;
    if (!preferred || reasonGroup || !reasons.length || !reasons.some((reason) => reason.reasonGroup === preferred)) return;
    const candidates = reasons.filter((reason) => reason.reasonGroup === preferred);
    const auto = candidates.length === 1 ? candidates[0] : undefined;
    setReasonGroup(preferred);
    setValues((current) => ({
      ...current,
      reasonCode: auto?.code ?? current.reasonCode,
      talentStage: auto?.defaultTalentStage ?? (preferred === 'AVAILABLE' ? 'AVAILABLE' : 'UNASSIGNED'),
    }));
  }, [criticalState.preferredReasonGroup, reasonGroup, reasons]);

  const selectGroup = (groupValue: string) => {
    const group = groupValue as ReasonGroup;
    setReasonGroup(group);
    const candidates = reasons.filter((reason) => reason.reasonGroup === group);
    const auto = candidates.length === 1 ? candidates[0] : undefined;
    setValues((current) => ({
      ...current,
      reasonCode: auto?.code ?? '',
      talentStage: auto?.defaultTalentStage ?? (group === 'AVAILABLE' ? 'AVAILABLE' : 'UNASSIGNED'),
    }));
  };

  const selectReason = (reasonCode: string) => {
    const selected = reasons.find((reason) => reason.code === reasonCode);
    setValues((current) => ({ ...current, reasonCode, talentStage: selected?.defaultTalentStage ?? current.talentStage }));
  };

  const requestConfirmation = () => {
    if (!reasonGroup) return setError('Selecciona la situación de la persona.');
    if (!values.reasonCode) return setError(reasonGroup === 'BBVA_EXIT' ? 'Selecciona el motivo de baja de BBVA.' : 'Selecciona el motivo del movimiento.');
    if (!values.effectiveDate) return setError('Selecciona la fecha efectiva.');
    setError(null);
    setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!id || !item) return;
    try {
      setError(null);
      const result = await moveMutation.mutateAsync({ id, payload: { ...values, expectedUpdatedAt: item.updatedAt } });
      navigate('/bbva/talent-bank', { state: { message: result.message } });
    } catch (moveError) {
      setConfirmOpen(false);
      setError((moveError as Error).message);
    }
  };

  if (collaboratorQuery.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando colaborador...</div>;
  if (collaboratorQuery.error || !item) return <BBVAAlert tone="error">{(collaboratorQuery.error as Error)?.message || 'Colaborador no encontrado.'}</BBVAAlert>;

  const selectedReason = reasons.find((reason) => reason.code === values.reasonCode);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => navigate('/bbva/collaborators')} disabled={moveMutation.isPending} /></div>
      {criticalState.criticalMessage ? <BBVAAlert tone="warning" persistent title="Revisión crítica de certificación">{criticalState.criticalCertification ? `${criticalState.criticalCertification}: ` : ''}{criticalState.criticalMessage}</BBVAAlert> : null}
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      {reasonsQuery.error ? <BBVAAlert tone="error">{(reasonsQuery.error as Error).message}</BBVAAlert> : null}

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-[11px] sm:grid-cols-3">
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Persona</div><div className="mt-1 font-semibold">{item.fullName}</div><div className="text-[10px] text-slate-500">{item.email}</div></div>
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Perfil</div><div className="mt-1 font-medium">{item.profile || 'No disponible'}</div><div className="text-[10px] text-slate-500">{item.technologyProfile || 'Sin perfil tecnológico'}</div></div>
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Tecnología</div><div className="mt-1 font-medium">{item.currentTechnology || 'No disponible'}</div><div className="text-[10px] text-slate-500">{item.expertise || 'Sin nivel de experiencia'}</div></div>
        </div>

        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4"><span className={labelClass}>Situación <BBVARequiredMark/></span><BBVASearchableSelect value={reasonGroup} onChange={selectGroup} options={[{ value: '', label: 'Seleccionar' }, ...availableGroups.map((group) => ({ value: group, label: GROUP_LABELS[group] }))]} disabled={reasonsQuery.isLoading || moveMutation.isPending} ariaLabel="Situación" /></label>
          <label className="md:col-span-4"><span className={labelClass}>{reasonGroup === 'BBVA_EXIT' ? 'Motivo de baja' : 'Motivo'} <BBVARequiredMark/></span><BBVASearchableSelect value={values.reasonCode} onChange={selectReason} options={[{ value: '', label: 'Seleccionar' }, ...groupedReasons.map((reason) => ({ value: reason.code, label: reason.name }))]} disabled={!reasonGroup || moveMutation.isPending} ariaLabel="Motivo" /></label>
          <label className="md:col-span-4"><span className={labelClass}>Vinculación <BBVARequiredMark/></span><BBVASearchableSelect value={values.affiliationType} onChange={(affiliationType) => setValues((current) => ({ ...current, affiliationType: affiliationType as 'INTERNAL' | 'EXTERNAL' }))} options={[{ value: 'INTERNAL', label: 'Interno · Softtek' }, { value: 'EXTERNAL', label: 'Externo' }]} disabled={moveMutation.isPending} ariaLabel="Vinculación" /></label>
          <label className="md:col-span-4"><span className={labelClass}>Estatus en Banco de talento <BBVARequiredMark/></span><BBVASearchableSelect value={values.talentStage} onChange={(talentStage) => setValues((current) => ({ ...current, talentStage: talentStage as MoveCollaboratorToTalentPayload['talentStage'] }))} options={[{ value: 'AVAILABLE', label: 'Disponible' }, { value: 'UNASSIGNED', label: 'Desasignado' }]} disabled={moveMutation.isPending} ariaLabel="Estatus en Banco de talento" /></label>
          <label className="md:col-span-4"><span className={labelClass}>Fecha efectiva <BBVARequiredMark/></span><BBVADatePicker value={values.effectiveDate} onChange={(effectiveDate) => setValues((current) => ({ ...current, effectiveDate }))} disabled={moveMutation.isPending} ariaLabel="Fecha efectiva" /></label>
          <label className="md:col-span-12"><span className={labelClass}>Observaciones</span><textarea value={values.notes} maxLength={1000} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} disabled={moveMutation.isPending} className={areaClass} placeholder="Opcional" /></label>
        </div>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4"><BBVAButton type="button" variant="primary" onClick={requestConfirmation} disabled={moveMutation.isPending || reasonsQuery.isLoading} icon={<ArrowRightLeft className="h-3.5 w-3.5" />}>Mover a Banco de talento</BBVAButton></div>
      </section>

      <ConfirmDialog open={confirmOpen} title="Mover a Banco de talento" message={`La persona pasará a Banco de talento como ${values.affiliationType === 'INTERNAL' ? 'interna' : 'externa'}, con motivo “${selectedReason?.name ?? values.reasonCode}” y estatus “${values.talentStage === 'AVAILABLE' ? 'Disponible' : 'Desasignado'}”. Su identidad, CV, certificaciones e historial se conservarán.`} confirmLabel="Confirmar movimiento" tone="primary" busy={moveMutation.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => void confirm()} />
    </div>
  );
};
