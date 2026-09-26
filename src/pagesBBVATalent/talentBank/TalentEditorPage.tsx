import React, { useState } from 'react';
import { ArrowLeft, GraduationCap, UserRoundCheck, UsersRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
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
      if (download) downloadCvDocument(response.document);
      else viewCvDocument(response.document);
    } catch (cvError) {
      setError((cvError as Error).message);
    }
  };

  const submit = async (payload: TalentPayload, cvFile: File | null) => {
    setError(null);
    try {
      const result = editing && id
        ? await updateMutation.mutateAsync({ id, payload })
        : await createMutation.mutateAsync(payload);
      const saved = result.item;

      if (cvFile) {
        const cvPayload = await fileToCvPayload(cvFile);
        await cvMutation.mutateAsync({ id: saved.id, payload: cvPayload });
      }

      navigate('/bbva/talent-bank', {
        state: {
          message: editing
            ? 'La información de Talent Bank se actualizó correctamente.'
            : saved.talentType === 'ACADEMY'
              ? 'El talento de Academia se registró correctamente.'
              : 'El prospecto se registró correctamente en Talent Bank.',
        },
      });
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  if (editing && talentQuery.isLoading) return <div className="p-10 text-center text-sm text-slate-500">Cargando talento...</div>;
  if (editing && (talentQuery.error || !selected)) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</div>;

  if (!editing && !creationType) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="border-b border-slate-200 pb-5">
          <Link to="/bbva/talent-bank" className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"><ArrowLeft className="h-3.5 w-3.5" />Regresar</Link>
          <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-blue-500" /><h2 className="text-2xl font-bold text-slate-950">Nuevo talento</h2></div>
          <p className="mt-1 text-xs text-slate-500">¿Qué tipo de talento deseas registrar?</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" onClick={() => setCreationType('ACADEMY')} className="rounded-xl border border-slate-200 bg-white p-6 text-left transition hover:border-blue-400 hover:shadow-sm">
            <div className="flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-600"><GraduationCap className="h-5 w-5" /></div><div className="text-base font-semibold text-slate-900">Academia</div></div>
            <p className="mt-3 text-sm leading-6 text-slate-500">Formulario simplificado para talentos que ingresan por Academia.</p>
          </button>
          <button type="button" onClick={() => setCreationType('PROSPECT')} className="rounded-xl border border-slate-200 bg-white p-6 text-left transition hover:border-blue-400 hover:shadow-sm">
            <div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><UserRoundCheck className="h-5 w-5" /></div><div className="text-base font-semibold text-slate-900">Prospecto de colaborador</div></div>
            <p className="mt-3 text-sm leading-6 text-slate-500">Utiliza la información profesional completa previa a su incorporación a Colaboradores.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-slate-200 pb-5">
        <Link to="/bbva/talent-bank" className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"><ArrowLeft className="h-3.5 w-3.5" />Regresar</Link>
        <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-blue-500" /><h2 className="text-2xl font-bold text-slate-950">{editing ? 'Editar talento' : 'Nuevo talento'}</h2></div>
        <p className="mt-1 text-xs text-slate-500">{editing ? 'Actualiza únicamente la información necesaria.' : 'Completa la información requerida para el tipo seleccionado.'}</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <Card className="p-5 sm:p-6">
        <TalentForm
          selected={selected}
          initialTalentType={creationType ?? selected?.talentType ?? 'ACADEMY'}
          currentCv={selected?.cv}
          saving={saving}
          onSubmit={(payload, cvFile) => void submit(payload, cvFile)}
          onCancel={() => navigate('/bbva/talent-bank')}
          onViewCv={() => void openCv(false)}
          onDownloadCv={() => void openCv(true)}
        />
      </Card>
    </div>
  );
};
