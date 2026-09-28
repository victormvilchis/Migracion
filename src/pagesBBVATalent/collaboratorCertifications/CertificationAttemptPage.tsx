import { bbvaBusinessDate } from '../../lib/bbvaBusinessDate';
import React, { useState } from 'react';
import { ImagePlus, MoveLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVAFormActions, BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { CertificationCommunicationDialog } from '../../componentsBBVATalent/CertificationCommunicationDialog';
import {
  useAddCertificationAttempt,
  useCollaboratorCertification,
  useGenerateCertificationCommunication,
  usePrepareCertificationCommunicationEmail,
} from '../hooks/useCollaboratorCertifications';
import type { CertificationAttempt, CertificationAttemptResult, CertificationCommunication } from '../types/collaboratorCertification';

export const CertificationAttemptPage: React.FC = () => {
  const { id, certificationRecordId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { returnTo?: string; rootReturnTo?: string } | null) ?? {};
  const returnTo = navState.returnTo ?? `/bbva/collaborators/${id}/certifications`;
  const rootReturnTo = navState.rootReturnTo ?? '/bbva/collaborators';
  const detailPath = `/bbva/collaborators/${id}/certifications/${certificationRecordId}`;
  const backToList = () => navigate(returnTo, returnTo.includes('/certifications') ? { state: { returnTo: rootReturnTo } } : undefined);
  const query = useCollaboratorCertification(id, certificationRecordId);
  const mutation = useAddCertificationAttempt(id ?? '');
  const generateMutation = useGenerateCertificationCommunication(id ?? '');
  const prepareEmailMutation = usePrepareCertificationCommunicationEmail(id ?? '');
  const [applicationDate, setApplicationDate] = useState(() => bbvaBusinessDate());
  const [result, setResult] = useState<CertificationAttemptResult>('PENDING');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedAttempt, setSavedAttempt] = useState<CertificationAttempt | null>(null);
  const [communication, setCommunication] = useState<CertificationCommunication | null>(null);

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificación...</div>;
  if (query.error || !query.data) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Certificación no encontrada.'}</BBVAAlert>;

  const item = query.data.item;
  const submit = async () => {
    if (!certificationRecordId) return;
    try {
      setError(null);
      const detail = await mutation.mutateAsync({ recordId: certificationRecordId, payload: { applicationDate, result, notes } });
      const attempt = detail.attempts.find((candidate) => candidate.cycleNumber === item.currentCycle && candidate.attemptNumber === item.attemptCount + 1) ?? detail.attempts[0] ?? null;
      setSavedAttempt(attempt);
    } catch (e) { setError((e as Error).message); }
  };
  const generate = async (regenerate = false) => {
    if (!certificationRecordId || !savedAttempt) return null;
    const response = await generateMutation.mutateAsync({ recordId: certificationRecordId, attemptId: savedAttempt.id, regenerate });
    setCommunication(response.item);
    return response.item;
  };
  const prepare = async (payload: { subject?: string; body?: string }) => {
    if (!certificationRecordId || !communication) throw new Error('Primero genera la postal.');
    const response = await prepareEmailMutation.mutateAsync({ recordId: certificationRecordId, communicationId: communication.id, payload });
    setCommunication(response.item);
    return response.item;
  };

  if (savedAttempt) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex justify-start"><BBVAFormBackButton onBack={() => backToList()} /></div>
        {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="text-[9px] font-semibold uppercase tracking-[.06em] text-emerald-700">Intento registrado</div>
          <h1 className="mt-1 text-[17px] font-semibold text-slate-950">{item.certificationName}</h1>
          <p className="mt-2 text-[11px] text-slate-600">Ciclo {savedAttempt.cycleNumber} · Intento {savedAttempt.attemptNumber} · {savedAttempt.result === 'APPROVED' ? 'Aprobado' : savedAttempt.result === 'FAILED' ? 'No aprobado' : 'Pendiente'}</p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => void generate(false)} disabled={generateMutation.isPending} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white disabled:opacity-50"><ImagePlus className="h-4 w-4" />{generateMutation.isPending ? 'Generando...' : 'Generar postal'}</button>
            <button type="button" onClick={() => navigate(detailPath, { state: { returnTo, rootReturnTo, message: 'El intento fue registrado correctamente.' } })} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700"><MoveLeft className="h-3.5 w-3.5" />Ver detalle</button>
          </div>
        </section>
        <CertificationCommunicationDialog
          open={Boolean(communication)}
          communication={communication}
          certificationName={item.certificationName}
          busy={generateMutation.isPending || prepareEmailMutation.isPending}
          onClose={() => setCommunication(null)}
          onPrepareEmail={prepare}
          onRegenerate={async () => (await generate(true)) as CertificationCommunication}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => backToList()} /></div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Registrar intento</div><h1 className="mt-1 text-base font-semibold text-slate-950">{item.certificationName}</h1><div className="mt-1 text-[10px] text-slate-500">Ciclo {item.currentCycle} · Intento {item.attemptCount + 1}{item.maxAttempts ? ` de ${item.maxAttempts}` : ''}</div></div>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fecha de aplicación {item.requiresApplicationDate ? '*' : ''}</span><BBVADatePicker value={applicationDate} onChange={setApplicationDate} ariaLabel="Fecha de aplicación" /></label>
          <label className="md:col-span-4"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Resultado</span><BBVASearchableSelect value={result} onChange={(value) => setResult(value as CertificationAttemptResult)} options={[{ value: 'PENDING', label: 'Pendiente' }, { value: 'APPROVED', label: 'Aprobado' }, { value: 'FAILED', label: 'Reprobado' }]} ariaLabel="Resultado" /></label>
          <label className="md:col-span-12"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Observaciones</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-blue-500" /></label>
        </div>
        <BBVAFormActions mode="create" busy={mutation.isPending} onBack={() => backToList()} createLabel="Registrar intento" />
      </form>
    </div>
  );
};
