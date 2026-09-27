import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVAFormActions, BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { useAddCertificationAttempt, useCollaboratorCertification } from '../hooks/useCollaboratorCertifications';
import type { CertificationAttemptResult } from '../types/collaboratorCertification';

export const CertificationAttemptPage: React.FC = () => {
  const { id, certificationRecordId } = useParams();
  const navigate = useNavigate();
  const query = useCollaboratorCertification(id, certificationRecordId);
  const mutation = useAddCertificationAttempt(id ?? '');
  const [applicationDate, setApplicationDate] = useState('');
  const [result, setResult] = useState<CertificationAttemptResult>('PENDING');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.data?.item.applicationDate) setApplicationDate(query.data.item.applicationDate);
  }, [query.data]);

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificación...</div>;
  if (query.error || !query.data) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Certificación no encontrada.'}</BBVAAlert>;

  const item = query.data.item;
  const submit = async () => {
    if (!certificationRecordId) return;
    try {
      setError(null);
      await mutation.mutateAsync({ recordId: certificationRecordId, payload: { applicationDate, result, notes } });
      navigate(`/bbva/collaborators/${id}/certifications/${certificationRecordId}`, { state: { message: 'El intento fue registrado correctamente.' } });
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => navigate(`/bbva/collaborators/${id}/certifications`)} /></div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Registrar intento</div><h1 className="mt-1 text-base font-semibold text-slate-950">{item.certificationName}</h1><div className="mt-1 text-[10px] text-slate-500">Ciclo {item.currentCycle} · Intento {item.attemptCount + 1}</div></div>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fecha de aplicación {item.requiresApplicationDate ? '*' : ''}</span><BBVADatePicker value={applicationDate} onChange={setApplicationDate} ariaLabel="Fecha de aplicación" /></label>
          <label className="md:col-span-4"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Resultado</span><BBVASearchableSelect value={result} onChange={(value) => setResult(value as CertificationAttemptResult)} options={[{ value: 'PENDING', label: 'Pendiente' }, { value: 'APPROVED', label: 'Aprobado' }, { value: 'FAILED', label: 'Reprobado' }]} ariaLabel="Resultado" /></label>
          <label className="md:col-span-12"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Observaciones</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-blue-500" /></label>
        </div>
        <BBVAFormActions mode="create" busy={mutation.isPending} onBack={() => navigate(`/bbva/collaborators/${id}/certifications`)} createLabel="Registrar intento" />
      </form>
    </div>
  );
};
