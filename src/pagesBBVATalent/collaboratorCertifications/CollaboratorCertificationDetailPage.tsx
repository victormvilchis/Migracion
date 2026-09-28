import React, { useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVAFormActions, BBVAFormBackButton, type BBVAFormMode, isBBVAFormReadOnly } from '../../componentsBBVATalent/BBVACrudForm';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { CertificationCommunicationDialog } from '../../componentsBBVATalent/CertificationCommunicationDialog';
import { useCollaboratorCertification, useGenerateCertificationCommunication, useMarkCertificationNotApplicable, usePrepareCertificationCommunicationEmail, useUpdateCollaboratorCertification } from '../hooks/useCollaboratorCertifications';
import { COLLABORATOR_CERTIFICATION_STATUS_LABELS, type CertificationAttempt, type CertificationCommunication } from '../types/collaboratorCertification';

interface Props { mode?: Extract<BBVAFormMode, 'view' | 'edit' | 'delete'>; }

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const CollaboratorCertificationDetailPage: React.FC<Props> = ({ mode = 'view' }) => {
  const { id, certificationRecordId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { returnTo?: string; rootReturnTo?: string } | null) ?? {};
  const returnTo = navState.returnTo ?? `/bbva/collaborators/${id}/certifications`;
  const rootReturnTo = navState.rootReturnTo ?? '/bbva/collaborators';
  const backToList = () => navigate(returnTo, returnTo.includes('/certifications') ? { state: { returnTo: rootReturnTo } } : undefined);
  const query = useCollaboratorCertification(id, certificationRecordId);
  const updateMutation = useUpdateCollaboratorCertification(id ?? '');
  const deleteMutation = useMarkCertificationNotApplicable(id ?? '');
  const generateMutation = useGenerateCertificationCommunication(id ?? '');
  const prepareEmailMutation = usePrepareCertificationCommunicationEmail(id ?? '');
  const readOnly = isBBVAFormReadOnly(mode);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communicationAttempt, setCommunicationAttempt] = useState<CertificationAttempt | null>(null);
  const [communication, setCommunication] = useState<CertificationCommunication | null>(null);
  const detail = query.data;

  useEffect(() => {
    if (!detail?.item) return;
    setScheduledDate(detail.item.scheduledDate ?? '');
    setNotes(detail.item.notes ?? '');
    setMandatory(detail.item.mandatory);
  }, [detail]);

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificación...</div>;
  if (query.error || !detail) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Certificación no encontrada.'}</BBVAAlert>;

  const item = detail.item;

  if (mode === 'view') {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex justify-start"><BBVAFormBackButton onBack={() => backToList()} /></div>
        {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">Certificación</div>
              <h1 className="mt-1 text-[16px] font-semibold text-slate-950">{item.certificationName}</h1>
              <div className="mt-1 text-[10px] text-slate-500">{[item.technologyName, item.provider].filter(Boolean).join(' · ') || 'General'}</div>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-700">{COLLABORATOR_CERTIFICATION_STATUS_LABELS[item.status]}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[8.5px] font-semibold uppercase text-slate-400">Última aprobación</div><div className="mt-1 text-[11px] font-semibold">{formatDate(item.approvedDate)}</div></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[8.5px] font-semibold uppercase text-slate-400">Vencimiento</div><div className="mt-1 text-[11px] font-semibold">{formatDate(item.expirationDate)}</div></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[8.5px] font-semibold uppercase text-slate-400">Ciclo actual</div><div className="mt-1 text-[11px] font-semibold">{item.currentCycle}</div></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[8.5px] font-semibold uppercase text-slate-400">Intentos del ciclo</div><div className="mt-1 text-[11px] font-semibold">{item.attemptCount}{item.maxAttempts ? ` / ${item.maxAttempts}` : ''}</div></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[8.5px] font-semibold uppercase text-slate-400">Próxima presentación</div><div className="mt-1 text-[11px] font-semibold">{formatDate(item.scheduledDate)}</div></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[8.5px] font-semibold uppercase text-slate-400">Calificación actual</div><div className="mt-1 text-[11px] font-semibold">{item.lastScore10 == null ? '—' : item.lastScore10.toFixed(2)}</div></div>
          </div>
          {item.softtekManagement ? <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-[10.5px] text-slate-700"><span className="font-semibold text-blue-700">Gestión Softtek: </span>{item.softtekManagement}</div> : null}
          {item.notes ? <div className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-[10.5px] text-slate-600"><span className="font-semibold text-slate-700">Observaciones: </span>{item.notes}</div> : null}
        </section>

        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold text-slate-800">Intentos ({detail.attempts.length})</summary>
          <div className="border-t border-slate-100 p-4">
            <div className="space-y-2">{detail.attempts.length ? detail.attempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"><div><div className="text-[10.5px] font-semibold">Ciclo {attempt.cycleNumber} · Intento {attempt.attemptNumber}</div><div className="mt-0.5 text-[9.5px] text-slate-500">{formatDate(attempt.applicationDate)} · {attempt.result === 'APPROVED' ? 'Aprobado' : attempt.result === 'FAILED' ? 'Reprobado' : 'Pendiente'}</div></div><button type="button" onClick={async () => { if (!id || !certificationRecordId) return; try { setError(null); setCommunicationAttempt(attempt); const response = await generateMutation.mutateAsync({ recordId: certificationRecordId, attemptId: attempt.id }); setCommunication(response.item); } catch (e) { setCommunicationAttempt(null); setError((e as Error).message); } }} disabled={generateMutation.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[9.5px] font-semibold text-slate-700 disabled:opacity-50"><ImagePlus className="h-3.5 w-3.5" />Postal</button></div>) : <div className="text-[10.5px] text-slate-500">Aún no hay intentos registrados.</div>}</div>
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold text-slate-800">Historial técnico ({detail.history.length})</summary>
          <div className="border-t border-slate-100 p-4"><div className="space-y-2">{detail.history.length ? detail.history.map((history) => <div key={history.id} className="border-l-2 border-blue-200 pl-3"><div className="text-[10px] font-medium text-slate-700">{history.description}</div><div className="mt-0.5 text-[9px] text-slate-400">{new Date(history.createdAt).toLocaleString('es-MX')}</div></div>) : <div className="text-[10.5px] text-slate-500">Sin movimientos registrados.</div>}</div></div>
        </details>
        <CertificationCommunicationDialog
          open={Boolean(communication)}
          communication={communication}
          certificationName={item.certificationName}
          busy={generateMutation.isPending || prepareEmailMutation.isPending}
          onClose={() => { setCommunication(null); setCommunicationAttempt(null); }}
          onPrepareEmail={async (payload) => {
            if (!certificationRecordId || !communication) throw new Error('Primero genera la postal.');
            const response = await prepareEmailMutation.mutateAsync({ recordId: certificationRecordId, communicationId: communication.id, payload });
            setCommunication(response.item);
            return response.item;
          }}
          onRegenerate={async () => {
            if (!certificationRecordId || !communicationAttempt) throw new Error('No se encontró el intento.');
            const response = await generateMutation.mutateAsync({ recordId: certificationRecordId, attemptId: communicationAttempt.id, regenerate: true });
            setCommunication(response.item);
            return response.item;
          }}
        />
      </div>
    );
  }

  const save = async () => {
    if (!id || !certificationRecordId) return;
    try {
      setError(null);
      await updateMutation.mutateAsync({ recordId: certificationRecordId, payload: { scheduledDate, notes, mandatory } });
      navigate(returnTo, { state: returnTo.includes('/certifications') ? { returnTo: rootReturnTo, message: 'La certificación fue actualizada correctamente.' } : { message: 'La certificación fue actualizada correctamente.' } });
    } catch (e) { setError((e as Error).message); }
  };

  const deleteRecord = async () => {
    if (!id || !certificationRecordId) return;
    try {
      setError(null);
      await deleteMutation.mutateAsync(certificationRecordId);
      navigate(returnTo, { state: returnTo.includes('/certifications') ? { returnTo: rootReturnTo, message: 'La certificación fue quitada correctamente.' } : { message: 'La certificación fue quitada correctamente.' } });
    } catch (e) { setConfirmDelete(false); setError((e as Error).message); }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => backToList()} /></div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <form onSubmit={(event) => { event.preventDefault(); if (mode === 'edit') void save(); }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-5"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Certificación</span><input value={item.certificationName} disabled className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700" /></label>
          <label className="md:col-span-3"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Estado</span><input value={COLLABORATOR_CERTIFICATION_STATUS_LABELS[item.status]} disabled className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700" /></label>
          <label className="md:col-span-2"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Ciclo</span><input value={item.currentCycle} disabled className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700" /></label>
          <label className="md:col-span-2"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Obligatoria</span><span className="flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-[11px]"><input type="checkbox" checked={mandatory} disabled={readOnly || mode === 'delete'} onChange={(e) => setMandatory(e.target.checked)} className="accent-blue-600" />Sí</span></label>

          <label className="md:col-span-3"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fecha programada</span><BBVADatePicker value={scheduledDate} onChange={setScheduledDate} disabled={readOnly || mode === 'delete'} ariaLabel="Fecha programada" /></label>
          <label className="md:col-span-3"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fecha de aprobación</span><input value={formatDate(item.approvedDate)} disabled className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700" /></label>
          <label className="md:col-span-3"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Vencimiento</span><input value={formatDate(item.expirationDate)} disabled className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700" /></label>
          <label className="md:col-span-3"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Intentos del ciclo</span><input value={item.attemptCount} disabled className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700" /></label>

          <label className="md:col-span-12"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Observaciones</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={readOnly || mode === 'delete'} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-blue-500 disabled:bg-slate-50" /></label>
        </div>

        <BBVAFormActions mode={mode} busy={updateMutation.isPending || deleteMutation.isPending} onBack={() => backToList()} onDelete={() => setConfirmDelete(true)} editLabel="Guardar cambios" deleteLabel="Quitar certificación" />
      </form>

      <ConfirmDialog open={confirmDelete} title="Quitar certificación" message="La certificación dejará de participar en el seguimiento actual. Sus intentos y su historial se conservarán." confirmLabel="Quitar certificación" tone="danger" busy={deleteMutation.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteRecord()} />
    </div>
  );
};
