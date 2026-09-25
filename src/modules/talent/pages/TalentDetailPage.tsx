import React, { useState } from 'react';
import { ArrowLeft, Download, Eye, FileText, History, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { TalentStageBadge } from '../components/TalentStageBadge';
import { TalentTypeBadge } from '../components/TalentTypeBadge';
import { downloadCvDocument, viewCvDocument } from '../components/talentCv';
import { formatBytes, formatDate, roleDisplay, technologyDisplay } from '../components/talentDisplay';
import { useTalent, useTalentHistory } from '../hooks/useTalent';
import { talentApi } from '../services/talentApi';

const Info: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-sm text-slate-900">{value || 'N/A'}</div></div>
);

export const TalentDetailPage: React.FC = () => {
  const { id } = useParams();
  const talentQuery = useTalent(id);
  const historyQuery = useTalentHistory(id);
  const [error, setError] = useState<string | null>(null);
  const talent = talentQuery.data?.item;

  const openCv = async (download: boolean) => {
    if (!id) return;
    try {
      setError(null);
      const response = await talentApi.getCv(id);
      if (download) downloadCvDocument(response.document);
      else viewCvDocument(response.document);
    } catch (cvError) {
      setError((cvError as Error).message);
    }
  };

  if (talentQuery.isLoading) return <div className="p-10 text-center text-sm text-slate-500">Cargando detalle...</div>;
  if (talentQuery.error || !talent) return <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-slate-200 pb-5">
        <Link to="/talent" className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"><ArrowLeft className="h-3.5 w-3.5" />Regresar</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-blue-400" /><h2 className="text-2xl font-bold text-slate-950">{talent.fullName}</h2></div><p className="mt-1 text-xs text-slate-500">{talent.email}</p></div>
          <div className="flex gap-2"><TalentTypeBadge type={talent.talentType} /><TalentStageBadge stage={talent.stage} /></div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Información general</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Código Softtek" value={talent.softtekCode} />
              <Info label="Usuario corporativo" value={talent.corporateUser} />
              <Info label="Correo electrónico" value={talent.email} />
              <Info label="Rol" value={roleDisplay(talent)} />
              <Info label="Tecnología actual" value={technologyDisplay(talent)} />
              <Info label="Estado" value={talent.active ? 'Activo' : 'Inactivo'} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Fechas</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Inicio de vigencia" value={formatDate(talent.platformStartDate)} />
              <Info label="Vencimiento" value={formatDate(talent.platformEndDate)} />
              <Info label="Fecha de contratación" value={formatDate(talent.hireDate)} />
              <Info label="Alta en Talent Bank" value={formatDate(talent.entryDate)} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Observaciones</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500">{talent.notes || 'N/A'}</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-400" /><h3 className="text-sm font-semibold text-slate-900">Currículum</h3></div>
            {talent.cv ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="truncate text-sm text-slate-900">{talent.cv.fileName}</div><div className="mt-1 text-[11px] text-slate-500">{formatBytes(talent.cv.fileSizeBytes)} · actualizado {formatDate(talent.cv.updatedAt)}</div></div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => void openCv(false)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" />Ver CV</button>
                  <button onClick={() => void openCv(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"><Download className="h-3.5 w-3.5" />Descargar</button>
                </div>
              </div>
            ) : <p className="mt-4 text-sm text-slate-500">N/A</p>}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><History className="h-4 w-4 text-blue-400" /><h3 className="text-sm font-semibold text-slate-900">Historial</h3></div>
            <div className="mt-4 space-y-3">
              {historyQuery.isLoading ? <p className="text-xs text-slate-500">Cargando historial...</p> : (historyQuery.data?.items ?? []).length === 0 ? <p className="text-xs text-slate-500">Sin eventos registrados.</p> : historyQuery.data?.items.map((item) => (
                <div key={item.id} className="border-l border-slate-300 pl-3"><div className="text-xs leading-5 text-slate-700">{item.description}</div><div className="mt-1 text-[10px] text-slate-500">{formatDate(item.createdAt)} · {item.createdByEmail}</div></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
