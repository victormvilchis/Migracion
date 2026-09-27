import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Users,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { parseFirstExcelSheet } from '../lib/xlsxFirstSheet';
import { useApplyCollaboratorImport, usePreviewCollaboratorImport } from '../hooks/useCollaboratorImport';
import type {
  ImportChangeDecision,
  ImportLowDecision,
  ImportPreviewResponse,
  ImportSourceRow,
} from '../types/collaboratorImport';

type TabKey = 'new' | 'changed' | 'lows' | 'conflicts' | 'errors' | 'resolved';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lowOptions = [
  { value: 'REVIEW', label: 'Revisar manualmente' },
  { value: 'DEACTIVATE', label: 'Desactivar' },
  { value: 'KEEP_ACTIVE', label: 'Mantener activo' },
  { value: 'IGNORE', label: 'Ignorar' },
];

function summaryCard(label: string, value: number, icon: React.ReactNode, active: boolean, onClick?: () => void) {
  return (
    <button type="button" onClick={onClick} className={`min-w-0 rounded-2xl border p-3 text-left transition ${active ? 'border-blue-300 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="truncate text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{value}</div></div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600">{icon}</span>
      </div>
    </button>
  );
}

function formatValue(value: string | null) { return value?.trim() || 'No disponible'; }

export const CollaboratorImportPage: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewMutation = usePreviewCollaboratorImport();
  const applyMutation = useApplyCollaboratorImport();
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [ignoredRows, setIgnoredRows] = useState(0);
  const [rows, setRows] = useState<ImportSourceRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, ImportChangeDecision>>({});
  const [lowDecisions, setLowDecisions] = useState<Record<string, ImportLowDecision>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const resetPreview = () => {
    setPreview(null);
    setRows([]);
    setSheetName('');
    setIgnoredRows(0);
    setEmails({});
    setDecisions({});
    setLowDecisions({});
    setSuccess(null);
  };

  const chooseFile = (next: File | null) => {
    setFile(next);
    resetPreview();
    setError(null);
  };

  const validate = async () => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const parsed = await parseFirstExcelSheet(file);
      setSheetName(parsed.sheetName);
      setIgnoredRows(parsed.ignoredRows);
      setRows(parsed.rows);
      const result = await previewMutation.mutateAsync(parsed.rows);
      setPreview(result);
      setEmails(Object.fromEntries(result.newItems.map((item) => [item.rowKey, item.email ?? ''])));
      setDecisions(Object.fromEntries(result.changedItems.flatMap((item) => item.changes.map((change) => [change.resolutionKey, change.decision]))));
      setLowDecisions(Object.fromEntries(result.possibleLows.map((item) => [item.collaboratorId, item.decision])));
      const firstAvailable: TabKey = result.newItems.length ? 'new' : result.changedItems.length ? 'changed' : result.possibleLows.length ? 'lows' : result.conflicts.length ? 'conflicts' : result.errors.length ? 'errors' : 'resolved';
      setActiveTab(firstAvailable);
    } catch (validationError) {
      setError((validationError as Error).message);
    }
  };

  const invalidNewEmails = useMemo(() => preview?.newItems.filter((item) => !emailRe.test((emails[item.rowKey] ?? '').trim())) ?? [], [emails, preview]);
  const actionable = Boolean(preview && (preview.newItems.length || preview.changedItems.length || preview.resolvedPreviously.length || Object.values(lowDecisions).some((decision) => decision === 'DEACTIVATE')));

  const apply = async () => {
    if (!preview) return;
    setConfirmOpen(false);
    setError(null);
    try {
      const result = await applyMutation.mutateAsync({ rows, emails, decisions, lowDecisions });
      const parts = [
        result.created ? `${result.created} creado${result.created === 1 ? '' : 's'}` : '',
        result.updated ? `${result.updated} actualizado${result.updated === 1 ? '' : 's'}` : '',
        result.reactivated ? `${result.reactivated} reactivado${result.reactivated === 1 ? '' : 's'}` : '',
        result.movedToTalentBank ? `${result.movedToTalentBank} movido${result.movedToTalentBank === 1 ? '' : 's'} a Banco de talento` : '',
      ].filter(Boolean);
      setSuccess(parts.length ? `Importación aplicada: ${parts.join(' · ')}.` : 'La importación no generó cambios.');
      if (result.errors.length) setError(`${result.errors.length} registro${result.errors.length === 1 ? '' : 's'} no pudieron aplicarse. Revisa los datos y vuelve a validar.`);
      const refreshed = await previewMutation.mutateAsync(rows);
      setPreview(refreshed);
      setEmails(Object.fromEntries(refreshed.newItems.map((item) => [item.rowKey, item.email ?? emails[item.rowKey] ?? ''])));
      setDecisions(Object.fromEntries(refreshed.changedItems.flatMap((item) => item.changes.map((change) => [change.resolutionKey, change.decision]))));
      setLowDecisions(Object.fromEntries(refreshed.possibleLows.map((item) => [item.collaboratorId, 'REVIEW'])));
    } catch (applyError) {
      setError((applyError as Error).message);
    }
  };

  const tabButton = (key: TabKey, label: string, count: number) => (
    <button type="button" onClick={() => setActiveTab(key)} className={`inline-flex h-8 items-center gap-2 rounded-xl px-3 text-[10.5px] font-semibold transition ${activeTab === key ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
      {label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${activeTab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/collaborators')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>

      {success ? <BBVAAlert tone="success" onClose={() => setSuccess(null)}>{success}</BBVAAlert> : null}
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0] ?? null); }}
          className={`flex min-h-[126px] items-center justify-between gap-4 rounded-2xl border border-dashed px-5 py-4 transition ${dragging ? 'border-blue-400 bg-blue-50' : 'border-emerald-300 bg-emerald-50/30'}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-white text-emerald-600"><Upload className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{file ? file.name : 'Arrastra un archivo Excel o selecciónalo'}</div>
              <div className="mt-1 text-[10.5px] text-slate-500">.xlsx · primera hoja · encabezados por nombre · filas válidas con NOMBRE EXTERNO</div>
              {sheetName ? <div className="mt-1 text-[10px] font-medium text-slate-500">Hoja analizada: {sheetName}{ignoredRows ? ` · ${ignoredRows} fila${ignoredRows === 1 ? '' : 's'} ignorada${ignoredRows === 1 ? '' : 's'} sin nombre` : ''}</div> : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="h-3.5 w-3.5" />Seleccionar</button>
            <button type="button" onClick={() => void validate()} disabled={!file || previewMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">{previewMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Validar y comparar</button>
          </div>
        </div>
      </section>

      {preview ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {summaryCard('Filas analizadas', preview.totalRowsAnalyzed, <Users className="h-4 w-4" />, false)}
            {summaryCard('Nuevos', preview.newItems.length, <UserPlus className="h-4 w-4" />, activeTab === 'new', () => setActiveTab('new'))}
            {summaryCard('Con cambios', preview.changedItems.length, <RefreshCw className="h-4 w-4" />, activeTab === 'changed', () => setActiveTab('changed'))}
            {summaryCard('Posibles bajas', preview.possibleLows.length, <UserMinus className="h-4 w-4" />, activeTab === 'lows', () => setActiveTab('lows'))}
            {summaryCard('Conflictos', preview.conflicts.length, <AlertTriangle className="h-4 w-4" />, activeTab === 'conflicts', () => setActiveTab('conflicts'))}
            {summaryCard('Errores', preview.errors.length, <XCircle className="h-4 w-4" />, activeTab === 'errors', () => setActiveTab('errors'))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
              <div className="flex flex-wrap gap-1.5">
                {tabButton('new', 'Nuevos', preview.newItems.length)}
                {tabButton('changed', 'Con cambios', preview.changedItems.length)}
                {tabButton('lows', 'Posibles bajas', preview.possibleLows.length)}
                {tabButton('conflicts', 'Conflictos', preview.conflicts.length)}
                {tabButton('errors', 'Errores', preview.errors.length)}
                {tabButton('resolved', 'Resueltos previamente', preview.resolvedPreviously.length)}
              </div>
              <button type="button" onClick={() => setConfirmOpen(true)} disabled={!actionable || invalidNewEmails.length > 0 || applyMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />Aplicar importación</button>
            </div>

            {invalidNewEmails.length > 0 ? <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] text-amber-800">Captura un correo válido para {invalidNewEmails.length} colaborador{invalidNewEmails.length === 1 ? '' : 'es'} nuevo{invalidNewEmails.length === 1 ? '' : 's'} antes de aplicar.</div> : null}

            <div className="max-h-[520px] overflow-auto">
              {activeTab === 'new' ? (
                <table className="w-full min-w-[1050px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-[0.04em] text-slate-500"><tr><th className="px-3 py-2">Fila</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Correo *</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Perfil tecnológico</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2">Catálogos</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.newItems.map((item) => <tr key={item.rowKey}><td className="px-3 py-2 text-slate-500">{item.rowNumber}</td><td className="px-3 py-2 font-semibold text-slate-900">{item.fullName}</td><td className="px-3 py-2"><input value={emails[item.rowKey] ?? ''} onChange={(event) => setEmails((current) => ({ ...current, [item.rowKey]: event.target.value }))} className={`h-8 w-[250px] rounded-lg border px-2.5 outline-none ${emailRe.test((emails[item.rowKey] ?? '').trim()) ? 'border-slate-300 focus:border-blue-500' : 'border-amber-300 bg-amber-50 focus:border-amber-500'}`} placeholder="correo@softtek.com" /></td><td className="px-3 py-2">{formatValue(item.profile)}</td><td className="px-3 py-2">{formatValue(item.technologyProfile)}</td><td className="px-3 py-2">{formatValue(item.currentTechnology)}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-1">{item.catalogActions.filter((action) => action.action === 'CREATE').map((action) => <span key={`${action.type}-${action.value}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700">Crear {action.value}</span>)}{item.catalogActions.every((action) => action.action === 'USE_EXISTING') ? <span className="text-slate-400">Sin altas</span> : null}</div></td></tr>)}</tbody></table>
              ) : null}

              {activeTab === 'changed' ? (
                <div className="divide-y divide-slate-100">{preview.changedItems.map((item) => <div key={item.rowKey} className="p-3"><div className="mb-2 flex items-center justify-between"><div><div className="text-[11px] font-semibold text-slate-900">{item.fullName}</div><div className="text-[9.5px] text-slate-500">Fila {item.rowNumber}{item.reactivationRequired ? ' · requiere reactivación' : ''}</div></div><div className="flex gap-1"><button type="button" onClick={() => setDecisions((current) => ({ ...current, ...Object.fromEntries(item.changes.map((change) => [change.resolutionKey, 'APPLY_EXCEL'])) }))} className="h-7 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[9.5px] font-semibold text-blue-700">Aplicar todos</button><button type="button" onClick={() => setDecisions((current) => ({ ...current, ...Object.fromEntries(item.changes.map((change) => [change.resolutionKey, 'KEEP_CURRENT'])) }))} className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[9.5px] font-semibold text-slate-600">Mantener actuales</button></div></div><table className="w-full min-w-[850px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] uppercase text-slate-500"><tr><th className="px-2 py-1.5">Campo</th><th className="px-2 py-1.5">Valor actual</th><th className="px-2 py-1.5">Valor del Excel</th><th className="px-2 py-1.5">Decisión</th></tr></thead><tbody>{item.changes.map((change) => <tr key={change.resolutionKey} className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold">{change.label}</td><td className="px-2 py-1.5 text-slate-500">{formatValue(change.currentValue)}</td><td className="px-2 py-1.5 text-slate-900">{formatValue(change.excelValue)}</td><td className="px-2 py-1.5"><div className="flex gap-1"><button type="button" onClick={() => setDecisions((current) => ({ ...current, [change.resolutionKey]: 'APPLY_EXCEL' }))} className={`h-7 rounded-lg px-2 text-[9px] font-semibold ${(decisions[change.resolutionKey] ?? change.decision) === 'APPLY_EXCEL' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Aplicar Excel</button><button type="button" onClick={() => setDecisions((current) => ({ ...current, [change.resolutionKey]: 'KEEP_CURRENT' }))} className={`h-7 rounded-lg px-2 text-[9px] font-semibold ${(decisions[change.resolutionKey] ?? change.decision) === 'KEEP_CURRENT' ? 'bg-slate-700 text-white' : 'border border-slate-200 text-slate-600'}`}>Mantener actual</button></div></td></tr>)}</tbody></table></div>)}</div>
              ) : null}

              {activeTab === 'lows' ? (
                <table className="w-full min-w-[850px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2">Decisión</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.possibleLows.map((item) => <tr key={item.collaboratorId}><td className="px-3 py-2"><div className="font-semibold text-slate-900">{item.fullName}</div><div className="text-[9.5px] text-slate-500">{item.email}</div></td><td className="px-3 py-2">{formatValue(item.profile)}</td><td className="px-3 py-2">{formatValue(item.currentTechnology)}</td><td className="w-[230px] px-3 py-2"><BBVASearchableSelect value={lowDecisions[item.collaboratorId] ?? 'REVIEW'} onChange={(value) => setLowDecisions((current) => ({ ...current, [item.collaboratorId]: value as ImportLowDecision }))} options={lowOptions} ariaLabel={`Decisión para ${item.fullName}`} /></td></tr>)}</tbody></table>
              ) : null}

              {activeTab === 'conflicts' || activeTab === 'errors' ? (
                <table className="w-full min-w-[720px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="w-20 px-3 py-2">Fila</th><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Detalle</th></tr></thead><tbody className="divide-y divide-slate-100">{(activeTab === 'conflicts' ? preview.conflicts : preview.errors).map((item) => <tr key={`${item.rowKey}-${item.message}`}><td className="px-3 py-2 text-slate-500">{item.rowNumber}</td><td className="px-3 py-2 font-semibold">{item.fullName || 'Sin nombre'}</td><td className="px-3 py-2 text-slate-600">{item.message}</td></tr>)}</tbody></table>
              ) : null}

              {activeTab === 'resolved' ? (
                <table className="w-full min-w-[900px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Campo</th><th className="px-3 py-2">Actual</th><th className="px-3 py-2">Excel</th><th className="px-3 py-2">Decisión reutilizada</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.resolvedPreviously.map((item) => <tr key={item.change.resolutionKey}><td className="px-3 py-2 font-semibold">{item.fullName}</td><td className="px-3 py-2">{item.change.label}</td><td className="px-3 py-2 text-slate-500">{formatValue(item.change.currentValue)}</td><td className="px-3 py-2">{formatValue(item.change.excelValue)}</td><td className="px-3 py-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">{item.change.decision === 'APPLY_EXCEL' ? 'Aplicar Excel' : 'Mantener actual'}</span></td></tr>)}</tbody></table>
              ) : null}

              {((activeTab === 'new' && !preview.newItems.length) || (activeTab === 'changed' && !preview.changedItems.length) || (activeTab === 'lows' && !preview.possibleLows.length) || (activeTab === 'conflicts' && !preview.conflicts.length) || (activeTab === 'errors' && !preview.errors.length) || (activeTab === 'resolved' && !preview.resolvedPreviously.length)) ? <div className="p-10 text-center text-[11px] text-slate-400">No hay registros en esta sección.</div> : null}
            </div>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Aplicar importación"
        message={preview ? `Se crearán ${preview.newItems.length} colaboradores, se procesarán ${preview.changedItems.length + preview.resolvedPreviously.length} cambios y se moverán ${Object.values(lowDecisions).filter((value) => value === 'DEACTIVATE').length} posibles bajas a Banco de talento. Los conflictos y errores se omitirán.` : ''}
        confirmLabel="Aplicar"
        tone="primary"
        busy={applyMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void apply()}
      />
    </div>
  );
};
