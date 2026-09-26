import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useConvertTalent, useTalent, useUpdateTalent } from '../hooks/useTalent';
import type { Talent, TalentPayload } from '../types/talent';

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500';
const labelClass = 'mb-1.5 block text-[11px] font-medium text-slate-500';

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
      navigate('/collaborators', { state: { message: 'El talento se convirtió correctamente en colaborador.' } });
    } catch (conversionError) {
      setConfirmOpen(false);
      setError((conversionError as Error).message);
    }
  };

  if (talentQuery.isLoading) return <div className="p-10 text-center text-sm text-slate-500">Cargando talento...</div>;
  if (talentQuery.error || !talent) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</div>;

  const busy = updateMutation.isPending || convertMutation.isPending;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-slate-200 pb-5">
        <Link to="/talent" className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"><ArrowLeft className="h-3.5 w-3.5" />Regresar</Link>
        <div className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-emerald-600" /><h2 className="text-2xl font-bold text-slate-950">Convertir a colaborador</h2></div>
        <p className="mt-1 text-xs text-slate-500">Se reutilizará la misma persona, su CV y su información histórica. Completa únicamente la información profesional necesaria.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <Card className="p-5 sm:p-6">
        <div className="mb-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Persona</div><div className="mt-1 text-sm font-semibold text-slate-900">{talent.fullName}</div><div className="text-xs text-slate-500">{talent.email}</div></div>
          <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Origen</div><div className="mt-1 text-sm text-slate-900">{talent.talentType === 'ACADEMY' ? 'Academia' : talent.talentType === 'PROSPECT' ? 'Prospecto de colaborador' : 'Baja de BBVA'}</div></div>
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <label className="md:col-span-6"><span className={labelClass}>Perfil *</span><input value={values.profile} onChange={(e) => setValues((v) => ({ ...v, profile: e.target.value }))} className={fieldClass} /></label>
          <label className="md:col-span-6"><span className={labelClass}>Perfil tecnológico *</span><input value={values.technologyProfile} onChange={(e) => setValues((v) => ({ ...v, technologyProfile: e.target.value }))} className={fieldClass} placeholder="Ej. DESARROLLADOR" /></label>
          <label className="md:col-span-5"><span className={labelClass}>Tecnología actual *</span><input value={values.currentTechnology} onChange={(e) => setValues((v) => ({ ...v, currentTechnology: e.target.value }))} className={fieldClass} placeholder="Ej. JAVA / APX" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Expertise</span><select value={values.expertise} onChange={(e) => setValues((v) => ({ ...v, expertise: e.target.value }))} className={fieldClass}><option value="">—</option><option value="TR">TR</option><option value="JR">JR</option><option value="STD">STD</option><option value="SR">SR</option></select></label>
          <label className="md:col-span-4"><span className={labelClass}>Usuario corporativo</span><input value={values.corporateUser} onChange={(e) => setValues((v) => ({ ...v, corporateUser: e.target.value }))} className={fieldClass} placeholder="Opcional" /></label>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
          <button type="button" onClick={() => navigate('/talent')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={busy} onClick={requestConfirmation} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"><ArrowRightLeft className="h-4 w-4" />Continuar</button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Convertir a colaborador"
        message="Esta persona dejará de formar parte de Talent Bank y será incorporada al módulo Colaboradores. A partir de ese momento comenzará a contabilizarse en los procesos e indicadores correspondientes. ¿Deseas continuar?"
        confirmLabel="Confirmar conversión"
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
