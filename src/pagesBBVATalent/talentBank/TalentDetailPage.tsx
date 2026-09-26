import React, { useState } from 'react';
import { ArrowLeft, Download, Eye, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { TalentStageBadge } from '../../componentsBBVATalent/TalentStageBadge';
import { TalentTypeBadge } from '../../componentsBBVATalent/TalentTypeBadge';
import { downloadCvDocument, viewCvDocument } from '../lib/talentCv';
import { formatBytes, formatDate, roleDisplay, technologyDisplay } from '../lib/talentDisplay';
import { useTalent, useTalentHistory } from '../hooks/useTalent';
import { talentApi } from '../api/talentApi';

export const TalentDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const talentQuery = useTalent(id);
  const historyQuery = useTalentHistory(id);
  const [error, setError] = useState<string | null>(null);
  const talent = talentQuery.data?.item;

  const openCv = async (download: boolean) => {
    if (!id) return;
    try {
      setError(null);
      const response = await talentApi.getCv(id);
      if (download) downloadCvDocument(response.document); else viewCvDocument(response.document);
    } catch (cvError) { setError((cvError as Error).message); }
  };

  if (talentQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando detalle...</div>;
  if (talentQuery.error || !talent) return <BBVAAlert tone="error">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</BBVAAlert>;

  const rows: Array<[string, React.ReactNode]> = [
    ['Nombre completo', talent.fullName], ['Correo electrónico', talent.email], ['Código Softtek', talent.softtekCode || 'N/A'], ['Usuario corporativo', talent.corporateUser || 'N/A'],
    ['Tipo', <TalentTypeBadge type={talent.talentType} />], ['Etapa', <TalentStageBadge stage={talent.stage} />], ['Rol', roleDisplay(talent)], ['Tecnología actual', technologyDisplay(talent)],
    ['Inicio de vigencia', formatDate(talent.platformStartDate)], ['Vencimiento', formatDate(talent.platformEndDate)], ['Fecha de contratación', formatDate(talent.hireDate)], ['Alta en Talent Bank', formatDate(talent.entryDate)],
  ];

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
          <div className="grid md:grid-cols-2">
            {rows.map(([label, raw], index) => <div key={label} className={`grid grid-cols-[145px_minmax(0,1fr)] items-center gap-3 border-slate-200 px-3 py-2 text-[11px] [.bbva-dark_&]:border-slate-800 ${index % 2 === 0 ? 'md:border-r' : ''} ${index < rows.length - 2 ? 'border-b' : ''}`}><span className="font-semibold text-slate-500 [.bbva-dark_&]:text-slate-400">{label}</span><span className="min-w-0 break-words font-medium text-slate-900 [.bbva-dark_&]:text-slate-100">{raw || 'N/A'}</span></div>)}
          </div>
          <div className="border-t border-slate-200 px-3 py-3 text-[11px] [.bbva-dark_&]:border-slate-800"><div className="mb-1 font-semibold text-slate-500 [.bbva-dark_&]:text-slate-400">Observaciones</div><div className="whitespace-pre-wrap text-slate-800 [.bbva-dark_&]:text-slate-200">{talent.notes || 'N/A'}</div></div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400">Currículum</div>
            {talent.cv ? <><div className="mt-2 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /><div className="min-w-0"><div className="truncate text-[11px] font-medium text-slate-900 [.bbva-dark_&]:text-slate-100">{talent.cv.fileName}</div><div className="text-[9.5px] text-slate-400">{formatBytes(talent.cv.fileSizeBytes)}</div></div></div><div className="mt-2 flex gap-1.5"><button type="button" onClick={() => void openCv(false)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 text-[10px] text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><Eye className="h-3 w-3" />Ver</button><button type="button" onClick={() => void openCv(true)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 text-[10px] text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><Download className="h-3 w-3" />Descargar</button></div></> : <div className="mt-2 text-[11px] text-slate-400">N/A</div>}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400">Historial</div>
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
              {historyQuery.isLoading ? <p className="text-[10px] text-slate-400">Cargando historial...</p> : (historyQuery.data?.items ?? []).length === 0 ? <p className="text-[10px] text-slate-400">Sin eventos registrados.</p> : historyQuery.data?.items.map((item) => <div key={item.id} className="border-l-2 border-slate-200 pl-2 [.bbva-dark_&]:border-slate-700"><div className="text-[10.5px] leading-4 text-slate-700 [.bbva-dark_&]:text-slate-300">{item.description}</div><div className="mt-0.5 text-[9px] text-slate-400">{formatDate(item.createdAt)} · {item.createdByEmail}</div></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
