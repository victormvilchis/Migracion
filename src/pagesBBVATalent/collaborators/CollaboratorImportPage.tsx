import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Users,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ISLookupField } from '../../componentsBBVATalent/ISLookupField';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { parseFirstExcelSheet } from '../lib/xlsxFirstSheet';
import { useApplyCollaboratorImport, usePreviewCollaboratorImport } from '../hooks/useCollaboratorImport';
import type {
  ImportCertificationPreview,
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

function formatValue(value: string | null | undefined) { return value?.trim() || 'No disponible'; }

function different(current: string | null, excel: string | null, calculated: string | null) {
  const normalize = (value: string | null) => (value ?? '').trim().toUpperCase();
  return new Set([normalize(current), normalize(excel), normalize(calculated)].filter(Boolean)).size > 1;
}

function CertificationBlock({
  certification,
  decisions,
  setDecisions,
}: {
  certification: ImportCertificationPreview;
  decisions: Record<string, ImportChangeDecision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<string, ImportChangeDecision>>>;
}) {
  const decision = decisions[certification.resolutionKey] ?? certification.decision;
  const fields = certification.fields.filter((field) => different(field.currentValue, field.excelValue, field.calculatedValue) || Boolean(field.excelValue) || Boolean(field.calculatedValue));
  const byField = Object.fromEntries(certification.fields.map((field) => [field.field, field]));
  const exam = byField.examStatus?.excelValue;
  const date = byField.applicationDate?.excelValue;
  const score = byField.score10?.excelValue;
  const attempt = byField.administrativeAttempt?.excelValue;
  const lifecycle = byField.lifecycle?.calculatedValue;
  const expiration = byField.expirationDate?.calculatedValue;
  const initialDue = byField.initialDueDate?.calculatedValue;
  const blockingIssues = certification.issues.filter((issue) => issue.blocking);

  return (
    <div className={`rounded-xl border p-3 ${blockingIssues.length ? 'border-rose-200 bg-rose-50/35' : 'border-slate-200 bg-slate-50/55'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-900">{certification.label}</span>
            {certification.certificationName && certification.certificationName !== certification.label ? <span className="rounded-full bg-white px-2 py-0.5 text-[8.5px] font-semibold text-slate-500">{certification.certificationName}</span> : null}
            {lifecycle ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8.5px] font-semibold text-blue-700">{lifecycle === 'RECERTIFICATION' ? 'Recertificación' : lifecycle === 'INITIAL' ? 'Inicial' : lifecycle === 'STATUS_ONLY' ? 'Solo estado' : 'No aplica'}</span> : null}
          </div>

          <div className="mt-2 grid gap-2 text-[9.5px] sm:grid-cols-2 xl:grid-cols-4">
            <div><span className="text-slate-400">Excel</span><div className="mt-0.5 font-medium text-slate-700">{formatValue(certification.excelStatus)}</div></div>
            {exam ? <div><span className="text-slate-400">Examen</span><div className="mt-0.5 font-medium text-slate-700">{exam}</div></div> : null}
            {date ? <div><span className="text-slate-400">Aplicación</span><div className="mt-0.5 font-medium text-slate-700">{date}{score ? ` · ${score}` : ''}</div></div> : null}
            <div><span className="text-slate-400">Resultado</span><div className="mt-0.5 font-semibold text-slate-800">{formatValue(certification.calculatedStatus)}{expiration ? ` · vence ${expiration}` : initialDue ? ` · límite ${initialDue}` : ''}</div></div>
          </div>

          {attempt === '0' ? <div className="mt-2 text-[9px] font-medium text-emerald-700">Aprobación histórica sin crear intento formal #0.</div> : attempt ? <div className="mt-2 text-[9px] text-slate-500">Intento administrativo informado: {attempt}</div> : null}
        </div>

        {certification.hasChanges ? (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => setDecisions((current) => ({ ...current, [certification.resolutionKey]: 'APPLY_EXCEL' }))} className={`h-7 rounded-lg px-2.5 text-[9px] font-semibold ${decision === 'APPLY_EXCEL' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Aplicar</button>
            <button type="button" onClick={() => setDecisions((current) => ({ ...current, [certification.resolutionKey]: 'KEEP_CURRENT' }))} className={`h-7 rounded-lg px-2.5 text-[9px] font-semibold ${decision === 'KEEP_CURRENT' ? 'bg-slate-700 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Mantener actual</button>
          </div>
        ) : null}
      </div>

      {certification.ruleGap ? <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] text-amber-800">{certification.ruleGap}</div> : null}
      {certification.issues.length ? <div className="mt-2 space-y-1">{certification.issues.map((issue) => <div key={issue.code} className={`rounded-lg px-2 py-1.5 text-[9px] font-medium ${issue.blocking ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{issue.blocking ? 'Revisión requerida: ' : ''}{issue.message}</div>)}</div> : null}

      {fields.length ? (
        <details className="mt-2 group">
          <summary className="cursor-pointer select-none text-[9px] font-semibold text-blue-700 hover:underline">Ver detalle de comparación</summary>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-[9.5px]">
              <thead className="bg-slate-50 text-[8px] uppercase tracking-[0.04em] text-slate-400"><tr><th className="px-2 py-1.5">Campo</th><th className="px-2 py-1.5">Actual</th><th className="px-2 py-1.5">Excel</th><th className="px-2 py-1.5">Calculado</th><th className="px-2 py-1.5">Origen</th></tr></thead>
              <tbody>{fields.map((field) => <tr key={field.field} className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold text-slate-700">{field.label}</td><td className="px-2 py-1.5 text-slate-500">{formatValue(field.currentValue)}</td><td className="px-2 py-1.5 text-slate-700">{formatValue(field.excelValue)}</td><td className="px-2 py-1.5 text-slate-700">{formatValue(field.calculatedValue)}</td><td className="px-2 py-1.5 text-slate-400">{formatValue(field.origin)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}

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
  const [softtekCodes, setSofttekCodes] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, ImportChangeDecision>>({});
  const [lowDecisions, setLowDecisions] = useState<Record<string, ImportLowDecision>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const decisionsForPreview = (result: ImportPreviewResponse) => Object.fromEntries([
    ...result.changedItems.flatMap((item) => item.changes.map((change) => [change.resolutionKey, change.decision] as const)),
    ...result.newItems.flatMap((item) => item.certifications.filter((cert) => cert.hasChanges).map((cert) => [cert.resolutionKey, cert.decision] as const)),
    ...result.changedItems.flatMap((item) => item.certifications.filter((cert) => cert.hasChanges).map((cert) => [cert.resolutionKey, cert.decision] as const)),
  ]);

  const resetPreview = () => {
    setPreview(null); setRows([]); setSheetName(''); setIgnoredRows(0); setEmails({}); setSofttekCodes({}); setDecisions({}); setLowDecisions({}); setSuccess(null);
  };
  const chooseFile = (next: File | null) => { setFile(next); resetPreview(); setError(null); };

  const validate = async () => {
    if (!file) return;
    setError(null); setSuccess(null);
    try {
      const parsed = await parseFirstExcelSheet(file);
      setSheetName(parsed.sheetName); setIgnoredRows(parsed.ignoredRows); setRows(parsed.rows);
      const result = await previewMutation.mutateAsync(parsed.rows);
      setPreview(result);
      setEmails(Object.fromEntries(result.newItems.map((item) => [item.rowKey, item.email ?? ''])));
      setSofttekCodes(Object.fromEntries(result.newItems.map((item) => [item.rowKey, item.softtekCode ?? ''])));
      setDecisions(decisionsForPreview(result));
      setLowDecisions(Object.fromEntries(result.possibleLows.map((item) => [item.collaboratorId, item.decision])));
      const firstAvailable: TabKey = result.newItems.length ? 'new' : result.changedItems.length ? 'changed' : result.conflicts.length ? 'conflicts' : result.possibleLows.length ? 'lows' : result.errors.length ? 'errors' : 'resolved';
      setActiveTab(firstAvailable);
    } catch (validationError) { setError((validationError as Error).message); }
  };

  const invalidNewEmails = useMemo(() => preview?.newItems.filter((item) => !emailRe.test((emails[item.rowKey] ?? '').trim())) ?? [], [emails, preview]);
  const missingNewIs = useMemo(() => preview?.newItems.filter((item) => !(softtekCodes[item.rowKey] ?? '').trim()) ?? [], [preview, softtekCodes]);
  const unresolvedConflicts = useMemo(() => preview?.conflicts.filter((item) => !item.resolutionKey || !decisions[item.resolutionKey]) ?? [], [decisions, preview]);
  const actionable = Boolean(preview && (preview.newItems.length || preview.changedItems.length || preview.certificationChanges || preview.resolvedPreviously.length || Object.values(lowDecisions).some((decision) => decision === 'DEACTIVATE')));

  const apply = async () => {
    if (!preview) return;
    setConfirmOpen(false); setError(null);
    try {
      const result = await applyMutation.mutateAsync({ rows, emails, softtekCodes, decisions, lowDecisions });
      const parts = [
        result.created ? `${result.created} creado${result.created === 1 ? '' : 's'}` : '',
        result.updated ? `${result.updated} actualizado${result.updated === 1 ? '' : 's'}` : '',
        result.reactivated ? `${result.reactivated} reactivado${result.reactivated === 1 ? '' : 's'}` : '',
        result.certificationUpdated ? `${result.certificationUpdated} certificación${result.certificationUpdated === 1 ? '' : 'es'} actualizada${result.certificationUpdated === 1 ? '' : 's'}` : '',
        result.resultsRegistered ? `${result.resultsRegistered} resultado${result.resultsRegistered === 1 ? '' : 's'} registrado${result.resultsRegistered === 1 ? '' : 's'}` : '',
        result.movedToTalentBank ? `${result.movedToTalentBank} movido${result.movedToTalentBank === 1 ? '' : 's'} a Banco de talento` : '',
      ].filter(Boolean);
      const message = parts.length ? `Importación aplicada: ${parts.join(' · ')}.` : 'La importación no generó cambios.';
      if (result.errors.length) {
        setSuccess(message);
        setError(`${result.errors.length} registro${result.errors.length === 1 ? '' : 's'} no pudieron aplicarse. Revisa los datos y vuelve a validar.`);
        const refreshed = await previewMutation.mutateAsync(rows);
        setPreview(refreshed);
        setEmails(Object.fromEntries(refreshed.newItems.map((item) => [item.rowKey, item.email ?? emails[item.rowKey] ?? ''])));
        setSofttekCodes(Object.fromEntries(refreshed.newItems.map((item) => [item.rowKey, item.softtekCode ?? softtekCodes[item.rowKey] ?? ''])));
        setDecisions(decisionsForPreview(refreshed));
        setLowDecisions(Object.fromEntries(refreshed.possibleLows.map((item) => [item.collaboratorId, 'REVIEW'])));
        return;
      }
      navigate('/bbva/collaborators', { state: { message } });
    } catch (applyError) { setError((applyError as Error).message); }
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
        <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0] ?? null); }} className={`flex min-h-[126px] items-center justify-between gap-4 rounded-2xl border border-dashed px-5 py-4 transition ${dragging ? 'border-blue-400 bg-blue-50' : 'border-emerald-300 bg-emerald-50/30'}`}>
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-white text-emerald-600"><Upload className="h-5 w-5" /></span><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{file ? file.name : 'Arrastra un archivo Excel o selecciónalo'}</div><div className="mt-1 text-[10.5px] text-slate-500">.xlsx · primera hoja · encabezados por nombre · filas válidas con NOMBRE EXTERNO</div>{sheetName ? <div className="mt-1 text-[10px] font-medium text-slate-500">Hoja analizada: {sheetName}{ignoredRows ? ` · ${ignoredRows} fila${ignoredRows === 1 ? '' : 's'} ignorada${ignoredRows === 1 ? '' : 's'} sin nombre` : ''}</div> : null}</div></div>
          <div className="flex shrink-0 gap-2"><input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="h-3.5 w-3.5" />Seleccionar</button><button type="button" onClick={() => void validate()} disabled={!file || previewMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">{previewMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Validar y comparar</button></div>
        </div>
      </section>

      {preview ? <>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {summaryCard('Filas analizadas', preview.totalRowsAnalyzed, <Users className="h-4 w-4" />, false)}
          {summaryCard('Nuevos', preview.newItems.length, <UserPlus className="h-4 w-4" />, activeTab === 'new', () => setActiveTab('new'))}
          {summaryCard('Con cambios', preview.changedItems.length, <RefreshCw className="h-4 w-4" />, activeTab === 'changed', () => setActiveTab('changed'))}
          {summaryCard('Certificaciones', preview.certificationChanges, <CheckCircle2 className="h-4 w-4" />, activeTab === 'changed', () => setActiveTab('changed'))}
          {summaryCard('Conflictos', preview.conflicts.length, <AlertTriangle className="h-4 w-4" />, activeTab === 'conflicts', () => setActiveTab('conflicts'))}
          {summaryCard('Errores', preview.errors.length, <XCircle className="h-4 w-4" />, activeTab === 'errors', () => setActiveTab('errors'))}
        </div>

        {preview.certificationRuleGaps.length ? <BBVAAlert tone="warning">{preview.certificationRuleGaps.join(' · ')}</BBVAAlert> : null}
        {unresolvedConflicts.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-800">Hay {unresolvedConflicts.length} conflicto{unresolvedConflicts.length === 1 ? '' : 's'} obligatorio{unresolvedConflicts.length === 1 ? '' : 's'} sin resolver. La importación no se puede aplicar hasta tomar una decisión.</div> : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
            <div className="flex flex-wrap gap-1.5">{tabButton('new','Nuevos',preview.newItems.length)}{tabButton('changed','Con cambios',preview.changedItems.length)}{tabButton('lows','Posibles bajas',preview.possibleLows.length)}{tabButton('conflicts','Conflictos',preview.conflicts.length)}{tabButton('errors','Errores',preview.errors.length)}{tabButton('resolved','Resueltos previamente',preview.resolvedPreviously.length)}</div>
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={!actionable || invalidNewEmails.length > 0 || missingNewIs.length > 0 || unresolvedConflicts.length > 0 || applyMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />Aplicar importación</button>
          </div>
          {invalidNewEmails.length > 0 || missingNewIs.length > 0 ? <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] text-amber-800">{missingNewIs.length ? `Captura el IS para ${missingNewIs.length} colaborador${missingNewIs.length === 1 ? '' : 'es'} nuevo${missingNewIs.length === 1 ? '' : 's'}. ` : ''}{invalidNewEmails.length ? `Captura un correo válido para ${invalidNewEmails.length} colaborador${invalidNewEmails.length === 1 ? '' : 'es'} nuevo${invalidNewEmails.length === 1 ? '' : 's'}.` : ''}</div> : null}

          <div className="max-h-[620px] overflow-auto">
            {activeTab === 'new' ? <div className="divide-y divide-slate-100">{preview.newItems.map((item) => <div key={item.rowKey} className="p-3"><div className="grid gap-2 xl:grid-cols-[52px_minmax(180px,1fr)_190px_240px_150px_150px_150px]"><div className="pt-2 text-[9.5px] text-slate-500">Fila {item.rowNumber}</div><div className="pt-2 text-[10.5px] font-semibold text-slate-900">{item.fullName}</div><ISLookupField value={softtekCodes[item.rowKey] ?? ''} onChange={(value) => setSofttekCodes((current) => ({ ...current, [item.rowKey]: value }))} onResolved={(record) => { setSofttekCodes((current) => ({ ...current, [item.rowKey]: record.is })); if (record.email) setEmails((current) => ({ ...current, [item.rowKey]: record.email ?? current[item.rowKey] ?? '' })); }} disabled={applyMutation.isPending} /><input value={emails[item.rowKey] ?? ''} onChange={(event) => setEmails((current) => ({ ...current, [item.rowKey]: event.target.value }))} className={`h-9 rounded-xl border px-2.5 text-[10px] outline-none ${emailRe.test((emails[item.rowKey] ?? '').trim()) ? 'border-slate-300 focus:border-blue-500' : 'border-amber-300 bg-amber-50 focus:border-amber-500'}`} placeholder="correo@softtek.com" /><div className="pt-2 text-[9.5px] text-slate-600">{formatValue(item.profile)}</div><div className="pt-2 text-[9.5px] text-slate-600">{formatValue(item.technologyProfile)}</div><div className="pt-2 text-[9.5px] text-slate-600">{formatValue(item.currentTechnology)}</div></div>{item.certifications.length ? <div className="mt-2 space-y-2">{item.certifications.filter((cert) => cert.hasChanges).map((cert) => <CertificationBlock key={cert.resolutionKey} certification={cert} decisions={decisions} setDecisions={setDecisions} />)}</div> : null}</div>)}</div> : null}

            {activeTab === 'changed' ? <div className="divide-y divide-slate-100">{preview.changedItems.map((item) => <div key={item.rowKey} className="p-3"><div className="mb-2 flex items-center justify-between"><div><div className="text-[11px] font-semibold text-slate-900">{item.fullName}</div><div className="text-[9.5px] text-slate-500">Fila {item.rowNumber}{item.reactivationRequired ? ' · requiere reactivación' : ''}</div></div>{item.changes.length ? <div className="flex gap-1"><button type="button" onClick={() => setDecisions((current) => ({ ...current, ...Object.fromEntries(item.changes.map((change) => [change.resolutionKey,'APPLY_EXCEL'])) }))} className="h-7 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[9.5px] font-semibold text-blue-700">Aplicar datos</button><button type="button" onClick={() => setDecisions((current) => ({ ...current, ...Object.fromEntries(item.changes.map((change) => [change.resolutionKey,'KEEP_CURRENT'])) }))} className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[9.5px] font-semibold text-slate-600">Mantener datos</button></div> : null}</div>{item.changes.length ? <table className="mb-2 w-full min-w-[850px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] uppercase text-slate-500"><tr><th className="px-2 py-1.5">Campo</th><th className="px-2 py-1.5">Valor actual</th><th className="px-2 py-1.5">Valor Excel</th><th className="px-2 py-1.5">Decisión</th></tr></thead><tbody>{item.changes.map((change) => <tr key={change.resolutionKey} className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold">{change.label}</td><td className="px-2 py-1.5 text-slate-500">{formatValue(change.currentValue)}</td><td className="px-2 py-1.5 text-slate-900">{formatValue(change.excelValue)}</td><td className="px-2 py-1.5"><div className="flex gap-1"><button type="button" onClick={() => setDecisions((current) => ({ ...current, [change.resolutionKey]:'APPLY_EXCEL' }))} className={`h-7 rounded-lg px-2 text-[9px] font-semibold ${(decisions[change.resolutionKey] ?? change.decision) === 'APPLY_EXCEL' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Aplicar Excel</button><button type="button" onClick={() => setDecisions((current) => ({ ...current, [change.resolutionKey]:'KEEP_CURRENT' }))} className={`h-7 rounded-lg px-2 text-[9px] font-semibold ${(decisions[change.resolutionKey] ?? change.decision) === 'KEEP_CURRENT' ? 'bg-slate-700 text-white' : 'border border-slate-200 text-slate-600'}`}>Mantener actual</button></div></td></tr>)}</tbody></table> : null}<div className="space-y-2">{item.certifications.filter((cert) => cert.hasChanges).map((cert) => <CertificationBlock key={cert.resolutionKey} certification={cert} decisions={decisions} setDecisions={setDecisions} />)}</div></div>)}</div> : null}

            {activeTab === 'lows' ? <table className="w-full min-w-[850px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2">Decisión</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.possibleLows.map((item) => <tr key={item.collaboratorId}><td className="px-3 py-2"><div className="font-semibold text-slate-900">{item.fullName}</div><div className="text-[9.5px] text-slate-500">{item.email}</div></td><td className="px-3 py-2">{formatValue(item.profile)}</td><td className="px-3 py-2">{formatValue(item.currentTechnology)}</td><td className="w-[230px] px-3 py-2"><BBVASearchableSelect value={lowDecisions[item.collaboratorId] ?? 'REVIEW'} onChange={(value) => setLowDecisions((current) => ({ ...current, [item.collaboratorId]:value as ImportLowDecision }))} options={lowOptions} ariaLabel={`Decisión para ${item.fullName}`} /></td></tr>)}</tbody></table> : null}

            {activeTab === 'conflicts' ? <table className="w-full min-w-[980px] text-left text-[10px]"><thead className="sticky top-0 bg-slate-50 text-[8.5px] uppercase text-slate-500"><tr><th className="w-16 px-3 py-2">Fila</th><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Conflicto</th><th className="px-3 py-2">Actual</th><th className="px-3 py-2">Excel</th><th className="px-3 py-2">Calculado</th><th className="px-3 py-2">Decisión</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.conflicts.map((item) => <tr key={`${item.rowKey}-${item.issueCode ?? item.message}`}><td className="px-3 py-2 text-slate-500">{item.rowNumber}</td><td className="px-3 py-2"><div className="font-semibold">{item.fullName || 'Sin nombre'}</div>{item.certificationLabel ? <div className="text-[8.5px] text-blue-600">{item.certificationLabel}</div> : null}</td><td className="px-3 py-2 text-slate-600">{item.message}</td><td className="px-3 py-2 text-slate-500">{formatValue(item.currentValue)}</td><td className="px-3 py-2">{formatValue(item.excelValue)}</td><td className="px-3 py-2">{formatValue(item.calculatedValue)}</td><td className="px-3 py-2">{item.resolutionKey ? <div className="flex gap-1"><button type="button" onClick={() => setDecisions((current) => ({ ...current,[item.resolutionKey as string]:'APPLY_EXCEL' }))} className={`h-7 rounded-lg px-2 text-[8.5px] font-semibold ${decisions[item.resolutionKey] === 'APPLY_EXCEL' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Aplicar Excel</button><button type="button" onClick={() => setDecisions((current) => ({ ...current,[item.resolutionKey as string]:'KEEP_CURRENT' }))} className={`h-7 rounded-lg px-2 text-[8.5px] font-semibold ${decisions[item.resolutionKey] === 'KEEP_CURRENT' ? 'bg-slate-700 text-white' : 'border border-slate-200 text-slate-600'}`}>Mantener actual</button></div> : <span className="text-[9px] font-semibold text-rose-600">Revisión manual obligatoria</span>}</td></tr>)}</tbody></table> : null}

            {activeTab === 'errors' ? <table className="w-full min-w-[720px] text-left text-[10.5px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="w-20 px-3 py-2">Fila</th><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Detalle</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.errors.map((item) => <tr key={`${item.rowKey}-${item.message}`}><td className="px-3 py-2 text-slate-500">{item.rowNumber}</td><td className="px-3 py-2 font-semibold">{item.fullName || 'Sin nombre'}</td><td className="px-3 py-2 text-slate-600">{item.message}</td></tr>)}</tbody></table> : null}

            {activeTab === 'resolved' ? <div className="divide-y divide-slate-100">{preview.resolvedPreviously.map((item, index) => <div key={`${item.rowKey}-${item.change?.resolutionKey ?? item.certification?.resolutionKey ?? index}`} className="grid gap-2 px-3 py-2 text-[10px] md:grid-cols-[minmax(180px,1fr)_160px_1fr_130px]"><div className="font-semibold text-slate-900">{item.fullName}</div><div>{item.change?.label ?? item.certification?.label ?? 'Certificación'}</div><div className="text-slate-500">{item.change ? `${formatValue(item.change.currentValue)} → ${formatValue(item.change.excelValue)}` : `${formatValue(item.certification?.excelStatus)} · ${formatValue(item.certification?.calculatedStatus)}`}</div><span className="w-fit rounded-full bg-emerald-50 px-2 py-1 text-[8.5px] font-semibold text-emerald-700">{(item.change?.decision ?? item.certification?.decision) === 'APPLY_EXCEL' ? 'Aplicar Excel' : 'Mantener actual'}</span></div>)}</div> : null}

            {((activeTab === 'new' && !preview.newItems.length) || (activeTab === 'changed' && !preview.changedItems.length) || (activeTab === 'lows' && !preview.possibleLows.length) || (activeTab === 'conflicts' && !preview.conflicts.length) || (activeTab === 'errors' && !preview.errors.length) || (activeTab === 'resolved' && !preview.resolvedPreviously.length)) ? <div className="p-10 text-center text-[11px] text-slate-400">No hay registros en esta sección.</div> : null}
          </div>
        </section>
      </> : null}

      <ConfirmDialog open={confirmOpen} title="Aplicar importación" message={preview ? `Se crearán ${preview.newItems.length} colaboradores, se procesarán ${preview.changedItems.length} colaboradores con cambios, se actualizarán hasta ${preview.certificationChanges} certificaciones, se registrarán hasta ${preview.certificationResults} resultados, se reutilizarán ${preview.resolvedPreviously.length} decisiones y se moverán ${Object.values(lowDecisions).filter((value) => value === 'DEACTIVATE').length} posibles bajas. Conflictos pendientes: ${unresolvedConflicts.length}. Errores: ${preview.errors.length}.` : ''} confirmLabel="Aplicar" tone="primary" busy={applyMutation.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => void apply()} />
    </div>
  );
};
