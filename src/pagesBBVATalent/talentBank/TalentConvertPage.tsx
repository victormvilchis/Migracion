import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useConvertTalent, useTalent, useUpdateTalent } from '../hooks/useTalent';
import type { Talent, TalentPayload } from '../types/talent';

const fieldClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const labelClass = 'mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';

function toPayload(talent: Talent, values: { profile: string; technologyProfile: string; currentTechnology: string; expertise: string; corporateUser: string }): TalentPayload {
  return {
    talentType: talent.talentType,
    softtekCode: talent.softtekCode ?? '',
    corporateUser: values.corporateUser,
    email: talent.email,
    firstName: talent.firstName,
    lastName: talent.lastName ?? '',
    profile: values.profile,
    technologyProfile: values.technologyProfile,
    currentTechnology: values.currentTechnology,
    expertise: values.expertise,
    stage: talent.stage,
    active: talent.active,
    platformStartDate: talent.platformStartDate ?? '',
    platformEndDate: talent.platformEndDate ?? '',
    hireDate: talent.hireDate ?? '',
    entryDate: talent.entryDate,
    notes: talent.notes ?? '',
  };
}

export const TalentConvertPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const talentQuery = useTalent(id);
  const updateMutation = useUpdateTalent();
  const convertMutation = useConvertTalent();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const talent = talentQuery.data?.item;

  const initial = useMemo(() => ({
    profile: talent?.profile ?? '',
    technologyProfile: talent?.technologyProfile ?? '',
    currentTechnology: talent?.currentTechnology ?? '',
    expertise: talent?.expertise ?? '',
    corporateUser: talent?.corporateUser ?? '',
  }), [talent]);

  const [values, setValues] = useState(initial);
  React.useEffect(() => setValues(initial), [initial]);

  const requestConfirmation = () => {
    if (!values.profile.trim()) return setError('El Perfil es obligatorio para convertir a colaborador.');
    if (!values.technologyProfile.trim()) return setError('El Perfil tecnológico es obligatorio para convertir a colaborador.');
    if (!values.currentTechnology.trim()) return setError('La Tecnología actual es obligatoria para convertir a colaborador.');
    setError(null);
    setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!talent || !id) return;
    try {
      setError(null);
      await updateMutation.mutateAsync({ id, payload: toPayload(talent, values) });
      await convertMutation.mutateAsync(id);
      navigate('/bbva/collaborators', { state: { message: 'El talento se convirtió correctamente en colaborador.' } });
    } catch (conversionError) {
      setConfirmOpen(false);
      setError((conversionError as Error).message);
    }
  };

  if (talentQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando talento...</div>;
  if (talentQuery.error || !talent) return <BBVAAlert tone="error">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</BBVAAlert>;

  const busy = updateMutation.isPending || convertMutation.isPending;

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/50 sm:grid-cols-2">
          <div><span className="font-semibold text-slate-500 [.bbva-dark_&]:text-slate-400">Persona</span><div className="mt-1 font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{talent.fullName}</div><div className="text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">{talent.email}</div></div>
          <div><span className="font-semibold text-slate-500 [.bbva-dark_&]:text-slate-400">Origen</span><div className="mt-1 text-slate-900 [.bbva-dark_&]:text-slate-100">{talent.talentType === 'ACADEMY' ? 'Academia' : talent.talentType === 'PROSPECT' ? 'Prospecto' : 'Baja de BBVA'}</div></div>
        </div>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-4"><span className={labelClass}>Perfil *</span><input value={values.profile} onChange={(e) => setValues((v) => ({ ...v, profile: e.target.value }))} className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Perfil tecnológico *</span><input value={values.technologyProfile} onChange={(e) => setValues((v) => ({ ...v, technologyProfile: e.target.value }))} className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Tecnología actual *</span><input value={values.currentTechnology} onChange={(e) => setValues((v) => ({ ...v, currentTechnology: e.target.value }))} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Expertise</span><select value={values.expertise} onChange={(e) => setValues((v) => ({ ...v, expertise: e.target.value }))} className={fieldClass}><option value="">—</option><option value="TR">TR</option><option value="JR">JR</option><option value="STD">STD</option><option value="SR">SR</option></select></label>
          <label className="md:col-span-4"><span className={labelClass}>Usuario corporativo</span><input value={values.corporateUser} onChange={(e) => setValues((v) => ({ ...v, corporateUser: e.target.value }))} className={fieldClass} /></label>
        </div>
        <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
          <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800">Cancelar</button>
          <button type="button" disabled={busy} onClick={requestConfirmation} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Continuar</button>
        </div>
      </div>
      <ConfirmDialog open={confirmOpen} title="Convertir a colaborador" message="Esta persona dejará Talent Bank y será incorporada a Colaboradores conservando su identidad e historial. ¿Deseas continuar?" confirmLabel="Confirmar conversión" busy={busy} onConfirm={() => void confirm()} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
};
