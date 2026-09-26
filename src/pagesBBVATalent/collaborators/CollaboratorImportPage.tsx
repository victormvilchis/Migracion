import React, { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';

export const CollaboratorImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/collaborators')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      <BBVAAlert tone="info">La vista conserva el flujo de validación previa. La validación masiva se conectará al servicio de importación BBVA en la siguiente iteración.</BBVAAlert>
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <label className="flex min-h-[132px] cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/30 px-5 py-4 transition hover:bg-emerald-50 [.bbva-dark_&]:border-emerald-500/30 [.bbva-dark_&]:bg-emerald-500/5 [.bbva-dark_&]:hover:bg-emerald-500/10">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-200 bg-white text-emerald-600 [.bbva-dark_&]:border-emerald-500/20 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-emerald-300"><Upload className="h-5 w-5" /></span><div><div className="text-sm font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Arrastra tu archivo Excel aquí</div><div className="mt-1 text-[11px] text-slate-500 [.bbva-dark_&]:text-slate-400">o haz clic para seleccionarlo desde tu equipo</div><div className="mt-1 text-[9.5px] text-slate-400">Formato .xlsx · Se procesa la primera hoja</div></div></div>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 text-[11px] font-semibold text-emerald-700 [.bbva-dark_&]:border-emerald-500/30 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-emerald-300"><FileSpreadsheet className="h-3.5 w-3.5" />Seleccionar archivo</span>
          <input type="file" accept=".xlsx" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3"><div className="text-[10.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{file ? `Archivo seleccionado: ${file.name}` : 'Vista previa obligatoria. Ningún cambio se guarda antes de confirmar.'}</div><button type="button" disabled={!file} className="h-8 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Validar y comparar</button></div>
      </div>
    </div>
  );
};
