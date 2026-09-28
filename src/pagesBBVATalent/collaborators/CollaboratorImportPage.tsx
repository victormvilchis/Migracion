import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ISLookupField } from '../../componentsBBVATalent/ISLookupField';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { parseFirstExcelSheet, parseTabularFile } from '../lib/xlsxFirstSheet';
import { enrichImportRows, type ImportEnrichmentSummary } from '../lib/collaboratorImportEnrichment';
import { useApplyCollaboratorImport, usePreviewCollaboratorImport } from '../hooks/useCollaboratorImport';
import { useDeliveryManagers } from '../hooks/useAdminUsers';
import type {
  ImportApplyResult,
  ImportCertificationPreview,
  ImportChangeDecision,
  ImportLowDecision,
  ImportPreviewResponse,
  ImportSourceRow,
} from '../types/collaboratorImport';

type TabKey = 'new' | 'changed' | 'attention' | 'lows' | 'resolved';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lowOptions = [
  { value: 'REVIEW', label: 'Revisar manualmente' },
  { value: 'DEACTIVATE', label: 'Desactivar' },
  { value: 'KEEP_ACTIVE', label: 'Mantener activo' },
  { value: 'IGNORE', label: 'Ignorar' },
];

function summaryCard(label: string, value: number, caption: string, icon: React.ReactNode, active: boolean, onClick?: () => void) {
  return (
    <button type="button" onClick={onClick} className={`min-w-0 rounded-2xl border p-3 text-left transition ${active ? 'border-blue-300 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[8.5px] font-semibold uppercase tracking-[0.055em] text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{value}</div>
          <div className="mt-0.5 truncate text-[9px] text-slate-400">{caption}</div>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600">{icon}</span>
      </div>
    </button>
  );
}

function formatValue(value: string | null | undefined) { return value?.trim() || '—'; }
function normalizeComparable(value: string | null | undefined) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(); }

function readableImportError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'No fue posible analizar el archivo. Revisa el formato e inténtalo nuevamente.';
}

function different(current: string | null, excel: string | null, calculated: string | null) {
  const normalize = (value: string | null) => (value ?? '').trim().toUpperCase();
  return new Set([normalize(current), normalize(excel), normalize(calculated)].filter(Boolean)).size > 1;
}


function solutionForImportIssue(code: string | undefined, message: string): string {
  const value = String(code ?? '').toUpperCase();
  const text = message.toUpperCase();
  if (value.includes('DUPLICATE_BBVA_EMAIL_OMITTED')) return 'Se importará el resto de la información. El correo BBVA repetido no se sobrescribirá; si la persona ya tiene uno registrado se conservará y, si no, quedará pendiente para completarlo después.';
  if (value.includes('DUPLICATE_BBVA_EMAIL') || text.includes('CORREO BBVA') && text.includes('REPETIDO')) return 'Corrige el correo BBVA en las filas indicadas: cada correo debe pertenecer a una sola persona. Después usa “Cambiar archivo” y vuelve a validar.';
  if (value.includes('DUPLICATE_SOFTTEK_EMAIL') || text.includes('CORREO SOFTTEK') && text.includes('REPETIDO')) return 'Corrige el correo Softtek en las filas indicadas. Debe ser único por persona y coincidir con el colaborador correspondiente.';
  if (value.includes('DUPLICATE_SOFTTEK_CODE') || text.includes('IS') && text.includes('REPETIDO')) return 'Revisa el IS de las filas indicadas. El IS identifica a una sola persona; conserva el correcto y corrige los demás.';
  if (value.includes('DUPLICATE_CORPORATE_USER') || text.includes('USUARIO BBVA') && text.includes('REPETIDO')) return 'Revisa el usuario BBVA/XM de las filas indicadas. Debe identificar a una sola persona.';
  if (value.includes('ATTEMPT_WITHOUT_EVIDENCE')) return 'Si la certificación no aplica, deja intento, fecha y resultado vacíos. Si sí aplica, agrega la fecha o el resultado que corresponde y vuelve a validar.';
  if (value.includes('CATALOG') || text.includes('CATÁLOGO') || text.includes('CATALOGO')) return 'Revisa el catálogo de certificaciones. Si el registro debe usarse, actívalo o configura el equivalente correcto; si está inactivo y no aplica, no se modificará.';
  if (value.includes('INVALID_EMAIL')) return 'Corrige el formato del correo en el archivo y vuelve a validar.';
  if (value.includes('MISSING_')) return 'Completa el dato obligatorio desde esta pantalla cuando esté disponible o corrígelo en el archivo y vuelve a validar.';
  if (text.includes('YA PERTENECE')) return 'Revisa el identificador indicado y asígnalo únicamente a la persona correcta. Luego vuelve a validar.';
  return 'Corrige el dato indicado en el archivo y vuelve a validar. Los registros que ya estén listos pueden aplicarse sin repetirlos.';
}
function applyStageLabel(stage: ImportApplyResult['errors'][number]['stage']) {
  return stage === 'VALIDATION' ? 'Validación'
    : stage === 'CORE' ? 'Datos generales'
      : stage === 'CERTIFICATION' ? 'Certificación'
        : stage === 'LIFECYCLE' ? 'Ciclo de vida'
          : 'Aplicación';
}

function CertificationBlock({
  certification,
  decisions,
  setDecisions,
  onDecision,
}: {
  certification: ImportCertificationPreview;
  decisions: Record<string, ImportChangeDecision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<string, ImportChangeDecision>>>;
  onDecision?: (resolutionKey: string, decision: ImportChangeDecision, label: string) => void;
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
  const conflictIssues = certification.issues.filter((issue) => issue.category === 'CONFLICT');
  const errorIssues = certification.issues.filter((issue) => issue.category === 'ERROR');
  const warnings = certification.issues.filter((issue) => issue.category === 'WARNING');

  return (
    <div className={`rounded-xl border p-3 ${errorIssues.length || conflictIssues.length ? 'border-amber-200 bg-amber-50/25' : 'border-slate-200 bg-slate-50/55'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-semibold text-slate-900">{certification.label.toLocaleUpperCase('es-MX')}</span>
            {certification.certificationName && certification.certificationName !== certification.label ? <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-slate-500">{certification.certificationName.toLocaleUpperCase('es-MX')}</span> : null}
            {lifecycle ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-semibold text-blue-700">{lifecycle === 'RECERTIFICATION' ? 'Recertificación' : lifecycle === 'INITIAL' ? 'Inicial' : lifecycle === 'STATUS_ONLY' ? 'Solo estado' : 'No aplica'}</span> : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-500">
            <span>Excel: <b className="font-semibold text-slate-700">{formatValue(certification.excelStatus)}</b></span>
            {exam ? <span>Examen: <b className="font-semibold text-slate-700">{exam}</b></span> : null}
            {date ? <span>Fecha: <b className="font-semibold text-slate-700">{date}{score ? ` · ${score}` : ''}</b></span> : null}
            <span>Resultado: <b className="font-semibold text-slate-700">{formatValue(certification.calculatedStatus)}{expiration ? ` · vence ${expiration}` : initialDue ? ` · límite ${initialDue}` : ''}</b></span>
          </div>
          {attempt === '0' ? <div className="mt-1.5 text-[8.5px] font-medium text-emerald-700">Aprobación histórica sin crear intento formal #0.</div> : attempt ? <div className="mt-1.5 text-[8.5px] text-slate-400">Intento administrativo: {attempt}</div> : null}
        </div>

        {certification.hasChanges && !errorIssues.length ? (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => { setDecisions((current) => ({ ...current, [certification.resolutionKey]: 'APPLY_EXCEL' })); onDecision?.(certification.resolutionKey, 'APPLY_EXCEL', certification.label); }} className={`h-7 rounded-lg px-2.5 text-[8.5px] font-semibold ${decision === 'APPLY_EXCEL' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{decision === 'APPLY_EXCEL' ? 'Excel seleccionado ✓' : 'Usar Excel'}</button>
            <button type="button" onClick={() => { setDecisions((current) => ({ ...current, [certification.resolutionKey]: 'KEEP_CURRENT' })); onDecision?.(certification.resolutionKey, 'KEEP_CURRENT', certification.label); }} className={`h-7 rounded-lg px-2.5 text-[8.5px] font-semibold ${decision === 'KEEP_CURRENT' ? 'bg-slate-700 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{decision === 'KEEP_CURRENT' ? 'Actual seleccionado ✓' : 'Mantener actual'}</button>
          </div>
        ) : null}
      </div>

      {errorIssues.length ? <div className="mt-2 space-y-1">{errorIssues.map((issue) => <div key={issue.code} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10.5px] font-medium leading-5 text-rose-700">{issue.message}</div>)}</div> : null}
      {conflictIssues.length ? <div className="mt-2 space-y-1">{conflictIssues.map((issue) => <div key={issue.code} className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10.5px] font-medium leading-5 text-amber-800">{issue.message}</div>)}</div> : null}
      {warnings.length ? <details className="mt-2"><summary className="cursor-pointer text-[10px] font-semibold text-amber-700">{warnings.length} aviso{warnings.length === 1 ? '' : 's'}</summary><div className="mt-1 space-y-1">{warnings.map((issue) => <div key={issue.code} className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-5 text-amber-700">{issue.message}</div>)}</div></details> : null}

      {fields.length ? (
        <details className="mt-2 group">
          <summary className="cursor-pointer select-none text-[8.5px] font-semibold text-blue-700 hover:underline">Ver detalle</summary>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-[9px]">
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
  const supplementInputRef = useRef<HTMLInputElement>(null);
  const previewMutation = usePreviewCollaboratorImport();
  const applyMutation = useApplyCollaboratorImport();
  const deliveryManagersQuery = useDeliveryManagers();
  const deliveryManagerOptions = useMemo(() => deliveryManagersQuery.data?.items ?? [], [deliveryManagersQuery.data]);
  const canonicalDeliveryManager = (value: string | null | undefined) => deliveryManagerOptions.find((item) => normalizeComparable(item.fullName) === normalizeComparable(value))?.fullName ?? '';
  const [file, setFile] = useState<File | null>(null);
  const [supplementFile, setSupplementFile] = useState<File | null>(null);
  const [enrichmentSummary, setEnrichmentSummary] = useState<ImportEnrichmentSummary | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [ignoredRows, setIgnoredRows] = useState(0);
  const [rows, setRows] = useState<ImportSourceRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [softtekCodes, setSofttekCodes] = useState<Record<string, string>>({});
  const [deliveryManagers, setDeliveryManagers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, ImportChangeDecision>>({});
  const [lowDecisions, setLowDecisions] = useState<Record<string, ImportLowDecision>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);
  const [applyErrors, setApplyErrors] = useState<ImportApplyResult['errors']>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const decisionsForPreview = (result: ImportPreviewResponse) => Object.fromEntries([
    ...result.changedItems.flatMap((item) => item.changes.map((change) => [change.resolutionKey, change.decision] as const)),
    ...result.newItems.flatMap((item) => item.certifications.filter((cert) => cert.hasChanges).map((cert) => [cert.resolutionKey, cert.decision] as const)),
    ...result.changedItems.flatMap((item) => item.certifications.filter((cert) => cert.hasChanges).map((cert) => [cert.resolutionKey, cert.decision] as const)),
  ]);

  const resetPreview = () => {
    setPreview(null); setRows([]); setSheetName(''); setIgnoredRows(0); setEmails({}); setSofttekCodes({}); setDeliveryManagers({}); setEnrichmentSummary(null); setDecisions({}); setLowDecisions({}); setSuccess(null); setDecisionNotice(null); setApplyErrors([]);
  };
  const chooseFile = (next: File | null) => { setFile(next); resetPreview(); setError(null); };
  const clearMainFile = () => { setFile(null); setSupplementFile(null); resetPreview(); setError(null); if (inputRef.current) inputRef.current.value = ''; if (supplementInputRef.current) supplementInputRef.current.value = ''; };
  const chooseSupplementFile = (next: File | null) => { setSupplementFile(next); resetPreview(); setError(null); };

  const validate = async () => {
    if (!file) return;
    setError(null); setSuccess(null); setApplyErrors([]);
    try {
      const parsed = await parseFirstExcelSheet(file);
      let effectiveRows: ImportSourceRow[] = parsed.rows;
      let summary: ImportEnrichmentSummary | null = null;
      if (supplementFile) {
        const supplementary = await parseTabularFile(supplementFile);
        const enrichment = enrichImportRows(parsed.rows, supplementary.rows);
        effectiveRows = enrichment.rows;
        summary = enrichment.summary;
      }
      setSheetName(parsed.sheetName); setIgnoredRows(parsed.ignoredRows); setRows(effectiveRows); setEnrichmentSummary(summary);
      const result = await previewMutation.mutateAsync(effectiveRows);
      setPreview(result);
      setEmails(Object.fromEntries(result.newItems.map((item) => [item.rowKey, item.email ?? ''])));
      setSofttekCodes(Object.fromEntries(result.newItems.map((item) => [item.rowKey, item.softtekCode ?? ''])));
      setDeliveryManagers(Object.fromEntries(result.newItems.map((item) => [item.rowKey, canonicalDeliveryManager(item.deliveryManager)])));
      setDecisions(decisionsForPreview(result));
      setLowDecisions(Object.fromEntries(result.possibleLows.map((item) => [item.collaboratorId, item.decision])));
      const hasAttention = result.conflicts.length + result.errors.length > 0;
      const firstAvailable: TabKey = hasAttention ? 'attention' : result.newItems.length ? 'new' : result.changedItems.length ? 'changed' : result.possibleLows.length ? 'lows' : 'resolved';
      setActiveTab(firstAvailable);
    } catch (validationError) {
      console.error('[BBVA:CollaboratorImport] Error al validar archivo', validationError);
      setError(readableImportError(validationError));
    }
  };

  const invalidNewEmails = useMemo(() => preview?.newItems.filter((item) => !emailRe.test((emails[item.rowKey] ?? '').trim())) ?? [], [emails, preview]);
  const missingNewIs = useMemo(() => preview?.newItems.filter((item) => !(softtekCodes[item.rowKey] ?? '').trim()) ?? [], [preview, softtekCodes]);
  const missingNewDm = useMemo(() => preview?.newItems.filter((item) => !(deliveryManagers[item.rowKey] ?? '').trim()) ?? [], [deliveryManagers, preview]);
  const unresolvedConflicts = useMemo(() => preview?.conflicts.filter((item) => !item.resolutionKey || !decisions[item.resolutionKey]) ?? [], [decisions, preview]);
  const groupedConflicts = useMemo(() => {
    const groups = new Map<string, typeof unresolvedConflicts>();
    for (const item of unresolvedConflicts) groups.set(item.rowKey, [...(groups.get(item.rowKey) ?? []), item]);
    return [...groups.values()];
  }, [unresolvedConflicts]);
  const requiredFieldRowKeys = useMemo(() => new Set([...invalidNewEmails, ...missingNewIs, ...missingNewDm].map((item) => item.rowKey)), [invalidNewEmails, missingNewDm, missingNewIs]);
  const blockingPreviewErrors = useMemo(() => preview?.errors.filter((item) => item.severity !== 'WARNING') ?? [], [preview]);
  const previewWarnings = useMemo(() => preview?.errors.filter((item) => item.severity === 'WARNING') ?? [], [preview]);
  const validationAttentionCount = blockingPreviewErrors.length + unresolvedConflicts.length + requiredFieldRowKeys.size;
  const attentionCount = validationAttentionCount + previewWarnings.length + applyErrors.length;
  const actionable = Boolean(preview && (preview.newItems.length || preview.changedItems.length || preview.certificationChanges || preview.resolvedPreviously.length || Object.values(lowDecisions).some((decision) => decision === 'DEACTIVATE')));
  const readyCount = preview ? Math.max(0, preview.newItems.length + preview.changedItems.length - requiredFieldRowKeys.size) : 0;


  const groupedPreviewErrors = useMemo(() => {
    const groups = new Map<string, ImportPreviewResponse['errors']>();
    for (const item of blockingPreviewErrors) {
      const key = `${item.code ?? ''}|${item.certificationLabel ?? ''}|${item.message}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.values()];
  }, [blockingPreviewErrors]);

  const groupedPreviewWarnings = useMemo(() => {
    const groups = new Map<string, ImportPreviewResponse['errors']>();
    for (const item of previewWarnings) {
      const key = `${item.code ?? ''}|${item.certificationLabel ?? ''}|${item.message}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.values()];
  }, [previewWarnings]);

  const groupedApplyErrors = useMemo(() => {
    const groups = new Map<string, ImportApplyResult['errors']>();
    for (const item of applyErrors) {
      const key = `${item.stage}|${item.code ?? ''}|${item.message}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.values()];
  }, [applyErrors]);

  const chooseDecision = (resolutionKey: string, decision: ImportChangeDecision, label: string) => {
    setDecisions((current) => ({ ...current, [resolutionKey]: decision }));
    setDecisionNotice(`${label}: ${decision === 'APPLY_EXCEL' ? 'se usarán los datos del Excel' : 'se conservará el valor actual'}. Esta decisión se aplicará cuando confirmes la importación.`);
  };

  const apply = async () => {
    if (!preview) return;
    setConfirmOpen(false); setError(null); setSuccess(null); setDecisionNotice(null); setApplyErrors([]);
    try {
      const result = await applyMutation.mutateAsync({ rows, emails, softtekCodes, deliveryManagers, decisions, lowDecisions });
      const parts = [
        result.created ? `${result.created} creado${result.created === 1 ? '' : 's'}` : '',
        result.updated ? `${result.updated} actualizado${result.updated === 1 ? '' : 's'}` : '',
        result.reactivated ? `${result.reactivated} reactivado${result.reactivated === 1 ? '' : 's'}` : '',
        result.certificationUpdated ? `${result.certificationUpdated} certificación${result.certificationUpdated === 1 ? '' : 'es'} actualizada${result.certificationUpdated === 1 ? '' : 's'}` : '',
        result.resultsRegistered ? `${result.resultsRegistered} resultado${result.resultsRegistered === 1 ? '' : 's'} registrado${result.resultsRegistered === 1 ? '' : 's'}` : '',
        result.movedToTalentBank ? `${result.movedToTalentBank} movido${result.movedToTalentBank === 1 ? '' : 's'} a Banco de talento` : '',
      ].filter(Boolean);
      const message = parts.length ? `Importación aplicada: ${parts.join(' · ')}.` : 'La importación no generó cambios aplicables.';
      setSuccess(message);
      setApplyErrors(result.errors);

      const refreshed = await previewMutation.mutateAsync(rows);
      setPreview(refreshed);
      setEmails(Object.fromEntries(refreshed.newItems.map((item) => [item.rowKey, item.email ?? emails[item.rowKey] ?? ''])));
      setSofttekCodes(Object.fromEntries(refreshed.newItems.map((item) => [item.rowKey, item.softtekCode ?? softtekCodes[item.rowKey] ?? ''])));
      setDeliveryManagers(Object.fromEntries(refreshed.newItems.map((item) => [item.rowKey, canonicalDeliveryManager(item.deliveryManager) || deliveryManagers[item.rowKey] || ''])));
      setDecisions(decisionsForPreview(refreshed));
      setLowDecisions(Object.fromEntries(refreshed.possibleLows.map((item) => [item.collaboratorId, 'REVIEW'])));

      const refreshedBlockingErrors = refreshed.errors.filter((item) => item.severity !== 'WARNING');
      const stillPending = result.errors.length > 0 || refreshedBlockingErrors.length > 0 || refreshed.conflicts.length > 0;
      if (stillPending) {
        setActiveTab('attention');
        const pending = result.errors.length + refreshedBlockingErrors.length + refreshed.conflicts.length;
        setError(`Importación actualizada. Quedan ${pending} elemento${pending === 1 ? '' : 's'} por resolver.`);
        return;
      }
      navigate('/bbva/collaborators', { state: { message } });
    } catch (applyError) {
      console.error('[BBVA:CollaboratorImport] Error al aplicar importación', applyError);
      setError(readableImportError(applyError));
    }
  };

  const tabButton = (key: TabKey, label: string, count: number) => (
    <button type="button" onClick={() => setActiveTab(key)} className={`inline-flex h-8 items-center gap-2 rounded-xl px-3 text-[10px] font-semibold transition ${activeTab === key ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
      {label}<span className={`rounded-full px-1.5 py-0.5 text-[8.5px] ${activeTab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );

  return (
    <div className="space-y-3 animate-fade-in">
      <BBVAButton variant="secondary" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate('/bbva/collaborators')}>Regresar</BBVAButton>
      {applyMutation.isPending ? <BBVAAlert tone="info" persistent>Aplicando importación en el servidor. Espera la confirmación antes de continuar.</BBVAAlert> : null}
      {decisionNotice ? <BBVAAlert tone="info" onClose={() => setDecisionNotice(null)}>{decisionNotice}</BBVAAlert> : null}
      {success ? <BBVAAlert tone="success" onClose={() => setSuccess(null)}>{success}</BBVAAlert> : null}
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-blue-600">Importación masiva</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">1. Carga y valida el archivo</div>
          <div className="mt-0.5 text-[10px] text-slate-500">Valida el archivo y revisa únicamente los registros que necesitan una decisión.</div>
        </div>
        <div className="p-4">
          <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0] ?? null); }} className={`flex min-h-[112px] items-center justify-between gap-4 rounded-2xl border border-dashed px-5 py-4 transition ${dragging ? 'border-blue-400 bg-blue-50' : 'border-emerald-300 bg-emerald-50/30'}`}>
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-white text-emerald-600"><Upload className="h-5 w-5" /></span><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{file ? file.name : 'Arrastra un Excel o selecciónalo'}</div><div className="mt-1 text-[10px] text-slate-500">.xlsx · primera hoja útil · encabezados flexibles</div>{sheetName ? <div className="mt-1 text-[9.5px] font-medium text-slate-500">Hoja: {sheetName}{ignoredRows ? ` · ${ignoredRows} fila${ignoredRows === 1 ? '' : 's'} sin nombre ignorada${ignoredRows === 1 ? '' : 's'}` : ''}</div> : null}</div></div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2"><input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />{file ? <BBVAButton variant="secondary" onClick={clearMainFile}>Quitar archivo</BBVAButton> : null}<BBVAButton variant="secondary" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => inputRef.current?.click()}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}</BBVAButton><BBVAButton variant="primary" onClick={() => void validate()} disabled={!file || previewMutation.isPending} icon={previewMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}>Validar</BBVAButton></div>
          </div>

          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[10px] font-semibold text-slate-700">Archivo complementario <span className="flex items-center gap-1 font-normal text-slate-400">Opcional <ChevronDown className="h-3.5 w-3.5" /></span></summary>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3">
              <div className="min-w-0"><div className="text-[9.5px] text-slate-500">Completa IS, XM, DM, correos y fechas faltantes sin reemplazar valores ya presentes.</div>{supplementFile ? <div className="mt-1 text-[9.5px] font-medium text-blue-700">{supplementFile.name}</div> : null}</div>
              <div className="flex gap-2"><input ref={supplementInputRef} type="file" accept=".xlsx,.csv,.tsv,.txt" className="hidden" onChange={(event) => chooseSupplementFile(event.target.files?.[0] ?? null)} />{supplementFile ? <button type="button" onClick={() => chooseSupplementFile(null)} className="h-8 rounded-xl border border-slate-300 bg-white px-3 text-[9px] font-semibold text-slate-600">Quitar</button> : null}<button type="button" onClick={() => supplementInputRef.current?.click()} className="h-8 rounded-xl border border-slate-300 bg-white px-3 text-[9px] font-semibold text-blue-700">{supplementFile ? 'Cambiar' : 'Seleccionar'}</button></div>
            </div>
          </details>
        </div>
      </section>

      {enrichmentSummary ? <BBVAAlert tone={enrichmentSummary.ambiguous > 0 ? 'warning' : 'info'}>Complemento: {enrichmentSummary.matched} coincidencia{enrichmentSummary.matched === 1 ? '' : 's'} · {enrichmentSummary.fieldsAdded} dato{enrichmentSummary.fieldsAdded === 1 ? '' : 's'} agregado{enrichmentSummary.fieldsAdded === 1 ? '' : 's'} · {enrichmentSummary.unmatched} sin coincidencia · {enrichmentSummary.ambiguous} ambiguo{enrichmentSummary.ambiguous === 1 ? '' : 's'}.</BBVAAlert> : null}

      {preview ? <>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-blue-600">2. Revisa el resultado</div><div className="mt-0.5 text-sm font-semibold text-slate-900">Resumen de la importación</div><div className="mt-0.5 text-[9.5px] text-slate-500">Revisa los pendientes y aplica los registros listos.</div></div>
            <BBVAButton variant="primary" onClick={() => setConfirmOpen(true)} disabled={!actionable || applyMutation.isPending} icon={applyMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}>{applyMutation.isPending ? 'Aplicando...' : 'Aplicar lo válido'}</BBVAButton>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCard('Filas del archivo', preview.totalRowsAnalyzed, 'registros analizados', <Users className="h-4 w-4" />, false)}
            {summaryCard('Listos para aplicar', readyCount, `${preview.newItems.length} nuevos · ${preview.changedItems.length} con cambios`, <CheckCircle2 className="h-4 w-4" />, activeTab === 'new' || activeTab === 'changed', () => setActiveTab(preview.newItems.length ? 'new' : 'changed'))}
            {summaryCard('Por revisar', attentionCount, attentionCount ? 'requieren una acción' : 'sin pendientes', <AlertTriangle className="h-4 w-4" />, activeTab === 'attention', () => setActiveTab('attention'))}
            {summaryCard('Posibles bajas', preview.possibleLows.length, 'requieren decisión explícita', <XCircle className="h-4 w-4" />, activeTab === 'lows', () => setActiveTab('lows'))}
          </div>

          <details className="mt-3 rounded-xl border border-blue-100 bg-blue-50/30">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-semibold text-blue-800">Doble check de calidad de datos</summary>
            <div className="grid gap-2 border-t border-blue-100 p-3 sm:grid-cols-3 xl:grid-cols-6">
              {[['Personas homologadas',preview.qualitySummary.homologatedPeople],['Personas enriquecidas',preview.qualitySummary.enrichedPeople],['Datos nuevos',preview.qualitySummary.newDataFields],['Datos preservados',preview.qualitySummary.preservedExistingFields],['Diferencias',preview.qualitySummary.differences],['Conflictos de identidad',preview.qualitySummary.identityConflicts]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-blue-100 bg-white px-3 py-2"><div className="text-[8.5px] font-semibold uppercase tracking-[.04em] text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</div></div>)}
            </div>
          </details>

          {(requiredFieldRowKeys.size || unresolvedConflicts.length || blockingPreviewErrors.length || previewWarnings.length) ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[9.5px] text-amber-900">
              <b>Revisión previa:</b> {requiredFieldRowKeys.size ? `${requiredFieldRowKeys.size} fila${requiredFieldRowKeys.size === 1 ? '' : 's'} nueva${requiredFieldRowKeys.size === 1 ? '' : 's'} requiere${requiredFieldRowKeys.size === 1 ? '' : 'n'} IS, correo o DM. ` : ''}{blockingPreviewErrors.length ? `${blockingPreviewErrors.length} dato${blockingPreviewErrors.length === 1 ? '' : 's'} requiere${blockingPreviewErrors.length === 1 ? '' : 'n'} corrección. ` : ''}{unresolvedConflicts.length ? `${unresolvedConflicts.length} conflicto${unresolvedConflicts.length === 1 ? '' : 's'} necesita${unresolvedConflicts.length === 1 ? '' : 'n'} decisión. ` : ''}{previewWarnings.length ? `${previewWarnings.length} aviso${previewWarnings.length === 1 ? '' : 's'} se resolverá${previewWarnings.length === 1 ? '' : 'n'} automáticamente.` : ''}
              <button type="button" onClick={() => setActiveTab('attention')} className="ml-1 font-semibold text-blue-700 underline">Abrir revisión</button>
            </div>
          ) : <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[9.5px] font-medium text-emerald-800">No hay bloqueos pendientes. Puedes aplicar la importación.</div>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-3 py-2.5">
            {tabButton('new', 'Nuevos', preview.newItems.length)}
            {tabButton('changed', 'Cambios', preview.changedItems.length)}
            {tabButton('attention', 'Revisión', attentionCount)}
            {tabButton('lows', 'Posibles bajas', preview.possibleLows.length)}
            {preview.resolvedPreviously.length ? tabButton('resolved', 'Ya resueltos', preview.resolvedPreviously.length) : null}
          </div>

          <div className="max-h-[650px] overflow-auto">
            {activeTab === 'new' ? <div className="divide-y divide-slate-100">{preview.newItems.map((item) => {
              const rowNeedsAttention = requiredFieldRowKeys.has(item.rowKey);
              const certChanges = item.certifications.filter((cert) => cert.hasChanges);
              return <div key={item.rowKey} className="p-3">
                <div className="mb-2 flex items-center justify-between gap-2"><div><div className="text-[10.5px] font-semibold text-slate-900">{item.fullName}</div><div className="text-[8.5px] text-slate-400">Fila {item.rowNumber} · {item.profile || 'Sin perfil'} · {item.currentTechnology || 'Sin tecnología'}</div></div>{rowNeedsAttention ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700">Completar datos</span> : <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">Listo</span>}</div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div><div className="mb-1 text-[8px] font-semibold uppercase text-slate-400">IS</div><ISLookupField value={softtekCodes[item.rowKey] ?? ''} onChange={(value) => setSofttekCodes((current) => ({ ...current, [item.rowKey]: value }))} onResolved={(record) => { setSofttekCodes((current) => ({ ...current, [item.rowKey]: record.is })); if (record.email) setEmails((current) => ({ ...current, [item.rowKey]: record.email ?? current[item.rowKey] ?? '' })); }} disabled={applyMutation.isPending} /></div>
                  <div><div className="mb-1 text-[8px] font-semibold uppercase text-slate-400">Correo Softtek</div><input value={emails[item.rowKey] ?? ''} onChange={(event) => setEmails((current) => ({ ...current, [item.rowKey]: event.target.value }))} className={`h-9 w-full rounded-xl border px-2.5 text-[10px] outline-none ${emailRe.test((emails[item.rowKey] ?? '').trim()) ? 'border-slate-300 focus:border-blue-500' : 'border-amber-300 bg-amber-50 focus:border-amber-500'}`} placeholder="correo@softtek.com" /></div>
                  <div><div className="mb-1 text-[8px] font-semibold uppercase text-slate-400">Delivery Manager</div><BBVASearchableSelect value={deliveryManagers[item.rowKey] ?? ''} onChange={(value) => setDeliveryManagers((current) => ({ ...current, [item.rowKey]: value }))} options={[{ value: '', label: 'Seleccionar Delivery Manager' }, ...deliveryManagerOptions.map((dm) => ({ value: dm.fullName, label: dm.fullName, description: [dm.email, dm.corporateUser].filter(Boolean).join(' · ') || undefined }))]} disabled={deliveryManagersQuery.isLoading || applyMutation.isPending} ariaLabel={`Delivery Manager de ${item.fullName}`} searchPlaceholder="Buscar Delivery Manager" emptyMessage="No hay Delivery Managers activos." /></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[8.5px] text-slate-500"><span>XM: <b className="font-medium text-slate-700">{formatValue(item.corporateUser)}</b></span>{item.bbvaEmail ? <span>Correo BBVA: <b className="font-medium text-slate-700">{item.bbvaEmail}</b></span> : null}<span>Perfil tecnológico: <b className="font-medium text-slate-700">{formatValue(item.technologyProfile)}</b></span>{item.startDate ? <span>Alta BBVA: <b className="font-medium text-slate-700">{item.startDate}</b></span> : null}</div>
                {certChanges.length ? <details className="mt-2 rounded-xl border border-slate-200 bg-slate-50/40"><summary className="cursor-pointer px-3 py-2 text-[9px] font-semibold text-blue-700">Certificaciones a actualizar ({certChanges.length})</summary><div className="space-y-2 border-t border-slate-200 p-2">{certChanges.map((cert) => <CertificationBlock key={cert.resolutionKey} certification={cert} decisions={decisions} setDecisions={setDecisions} onDecision={chooseDecision} />)}</div></details> : null}
              </div>;
            })}</div> : null}

            {activeTab === 'changed' ? <div className="divide-y divide-slate-100">{preview.changedItems.map((item) => {
              const certChanges = item.certifications.filter((cert) => cert.hasChanges);
              return <details key={item.rowKey} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 hover:bg-slate-50">
                  <div><div className="text-[10.5px] font-semibold text-slate-900">{item.fullName}</div><div className="mt-0.5 text-[8.5px] text-slate-400">Fila {item.rowNumber} · {item.changes.length} dato{item.changes.length === 1 ? '' : 's'} · {certChanges.length} certificación{certChanges.length === 1 ? '' : 'es'}{item.reactivationRequired ? ' · reactivar' : ''}</div></div>
                  <span className="flex items-center gap-1 text-[8.5px] font-semibold text-blue-700">Revisar <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></span>
                </summary>
                <div className="border-t border-slate-100 p-3">
                  {item.changes.length ? <><div className="mb-2 flex justify-end gap-1"><button type="button" onClick={() => { setDecisions((current) => ({ ...current, ...Object.fromEntries(item.changes.map((change) => [change.resolutionKey, 'APPLY_EXCEL'])) })); setDecisionNotice(`${item.fullName}: se seleccionó Excel para ${item.changes.length} cambio${item.changes.length === 1 ? '' : 's'}. Se aplicará al confirmar la importación.`); }} className="h-7 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[8.5px] font-semibold text-blue-700">Aplicar todos</button><button type="button" onClick={() => { setDecisions((current) => ({ ...current, ...Object.fromEntries(item.changes.map((change) => [change.resolutionKey, 'KEEP_CURRENT'])) })); setDecisionNotice(`${item.fullName}: se conservarán ${item.changes.length} valor${item.changes.length === 1 ? '' : 'es'} actual${item.changes.length === 1 ? '' : 'es'}. Se aplicará al confirmar la importación.`); }} className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[8.5px] font-semibold text-slate-600">Mantener todos</button></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-[9px]"><thead className="bg-slate-50 text-[8px] uppercase text-slate-400"><tr><th className="px-2 py-1.5">Campo</th><th className="px-2 py-1.5">Actual</th><th className="px-2 py-1.5">Excel</th><th className="px-2 py-1.5">Decisión</th></tr></thead><tbody>{item.changes.map((change) => <tr key={change.resolutionKey} className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold">{change.label}</td><td className="px-2 py-1.5 text-slate-500">{formatValue(change.currentValue)}</td><td className="px-2 py-1.5 text-slate-800">{formatValue(change.excelValue)}</td><td className="px-2 py-1.5"><div className="flex gap-1"><button type="button" onClick={() => chooseDecision(change.resolutionKey, 'APPLY_EXCEL', change.label)} className={`h-6 rounded-md px-2 text-[8px] font-semibold ${(decisions[change.resolutionKey] ?? change.decision) === 'APPLY_EXCEL' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Aplicar</button><button type="button" onClick={() => chooseDecision(change.resolutionKey, 'KEEP_CURRENT', change.label)} className={`h-6 rounded-md px-2 text-[8px] font-semibold ${(decisions[change.resolutionKey] ?? change.decision) === 'KEEP_CURRENT' ? 'bg-slate-700 text-white' : 'border border-slate-200 text-slate-600'}`}>Mantener</button></div></td></tr>)}</tbody></table></div></> : null}
                  {certChanges.length ? <div className="mt-2 space-y-2">{certChanges.map((cert) => <CertificationBlock key={cert.resolutionKey} certification={cert} decisions={decisions} setDecisions={setDecisions} onDecision={chooseDecision} />)}</div> : null}
                </div>
              </details>;
            })}</div> : null}

            {activeTab === 'attention' ? <div className="space-y-4 p-3">
              {requiredFieldRowKeys.size ? <div><div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.05em] text-amber-700">Datos obligatorios pendientes · {requiredFieldRowKeys.size}</div><div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] text-amber-800">Completa IS, correo Softtek o Delivery Manager desde la pestaña <button type="button" onClick={() => setActiveTab('new')} className="font-semibold text-blue-700 underline">Nuevos</button>. El resto del lote puede aplicarse.</div></div> : null}

              {previewWarnings.length ? <div><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-blue-700">Ajustes automáticos · {previewWarnings.length}</div><div className="space-y-3">{groupedPreviewWarnings.map((group, index) => { const first=group[0]; return <details key={`warning-group-${first.code ?? index}-${first.message}`} className="rounded-2xl border border-blue-200 bg-blue-50/35"><summary className="cursor-pointer list-none p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-blue-700">{group.length} fila{group.length===1?'':'s'}</span><div className="mt-2 text-[13px] font-medium leading-5 text-slate-800">{first.message}</div><div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-[12px] leading-5 text-emerald-950"><b>Qué hará BFS:</b> {solutionForImportIssue(first.code, first.message)}</div></div><ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" /></div></summary><div className="border-t border-blue-100 px-4 py-3 text-[11px] leading-5 text-slate-700">{group.map((item)=><div key={`warning-${item.rowKey}-${item.rowNumber}`} className="py-0.5"><b>Fila {item.rowNumber}</b> · {item.fullName || 'Sin nombre'}</div>)}</div></details>; })}</div></div> : null}

              {blockingPreviewErrors.length ? <div><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-rose-700">Datos por corregir · {blockingPreviewErrors.length}</div><div className="space-y-3">{groupedPreviewErrors.map((group, index) => { const first=group[0]; return <details open={group.length <= 3} key={`preview-group-${first.code ?? index}-${first.message}`} className="rounded-2xl border border-rose-200 bg-rose-50/45"><summary className="cursor-pointer list-none p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{first.certificationLabel ? <span className="text-[11px] font-semibold text-blue-700">{first.certificationLabel}</span> : null}<span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-rose-700">{group.length} fila{group.length===1?'':'s'}</span></div><div className="mt-2 text-[13px] font-medium leading-5 text-slate-800">{first.message}</div><div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2.5 text-[12px] leading-5 text-blue-950"><b>Solución:</b> {solutionForImportIssue(first.code, first.message)}</div></div><ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" /></div></summary><div className="border-t border-rose-100 px-4 py-3 text-[11px] leading-5 text-slate-700">{group.map((item)=><div key={`preview-${item.rowKey}-${item.rowNumber}`} className="py-0.5"><b>Fila {item.rowNumber}</b> · {item.fullName || 'Sin nombre'}</div>)}</div></details>; })}</div></div> : null}

              {groupedConflicts.length ? <div><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-amber-700">Decisiones pendientes · {unresolvedConflicts.length}</div><div className="space-y-2">{groupedConflicts.map((items) => { const first = items[0]; return <div key={first.rowKey} className="rounded-xl border border-amber-200 bg-amber-50/25"><div className="flex flex-wrap items-center gap-2 border-b border-amber-100 px-3 py-2"><span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-amber-700">Fila {first.rowNumber}</span><span className="text-[10px] font-semibold text-slate-900">{first.fullName || 'Sin nombre'}</span><span className="text-[8.5px] text-slate-500">{items.length} decisión{items.length === 1 ? '' : 'es'}</span></div><div className="divide-y divide-amber-100">{items.map((item) => <div key={`${item.rowKey}-${item.issueCode ?? item.message}`} className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0">{item.certificationLabel ? <div className="text-[8.5px] font-semibold text-blue-700">{item.certificationLabel}</div> : null}<div className="mt-0.5 text-[11px] leading-5 text-slate-700">{item.message}</div><div className="mt-1.5 text-[10px] leading-4 text-blue-800"><b>Solución:</b> {item.resolutionKey ? 'elige “Usar Excel” o “Conservar actual”.' : solutionForImportIssue(item.issueCode, item.message)}</div>{item.currentValue || item.excelValue || item.calculatedValue ? <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[8px] text-slate-500"><span>Actual <b className="text-slate-700">{formatValue(item.currentValue)}</b></span><span>Excel <b className="text-slate-700">{formatValue(item.excelValue)}</b></span><span>Resultado <b className="text-slate-700">{formatValue(item.calculatedValue)}</b></span></div> : null}</div>{item.resolutionKey ? <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => chooseDecision(item.resolutionKey as string, 'APPLY_EXCEL', item.certificationLabel ?? 'Conflicto')} className="h-7 rounded-lg border border-blue-200 bg-white px-2.5 text-[8px] font-semibold text-blue-700 hover:bg-blue-50">Usar Excel</button><button type="button" onClick={() => chooseDecision(item.resolutionKey as string, 'KEEP_CURRENT', item.certificationLabel ?? 'Conflicto')} className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[8px] font-semibold text-slate-600 hover:bg-slate-50">Conservar actual</button></div> : <span className="w-fit rounded-full bg-rose-50 px-2 py-1 text-[8px] font-semibold text-rose-700">Requiere corrección</span>}</div>)}</div></div>; })}</div></div> : null}

              {groupedApplyErrors.length ? <div><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-rose-700">Incidencias durante la aplicación · {applyErrors.length}</div><div className="space-y-2">{groupedApplyErrors.map((group, index) => { const first = group[0]; return <details key={`${first.stage}-${first.code ?? index}-${first.message}`} className="rounded-xl border border-rose-200 bg-rose-50/35"><summary className="cursor-pointer list-none p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-[11.5px] font-semibold text-slate-900">{first.message}</div><div className="mt-1 text-[10px] text-slate-500">{applyStageLabel(first.stage)} · {group.length} fila{group.length === 1 ? '' : 's'}</div><div className="mt-1.5 text-[10px] leading-4 text-blue-800"><b>Cómo resolverlo:</b> {solutionForImportIssue(first.code, first.message)}</div></div><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></div></summary><div className="border-t border-rose-100 px-3 py-2 text-[10px] text-slate-600">{group.map((item) => <div key={`${item.rowKey ?? item.rowNumber}-${item.name}`} className="py-0.5">Fila {item.rowNumber ?? '—'} · <b>{item.name || 'Sin nombre'}</b></div>)}</div></details>; })}</div></div> : null}

              {!attentionCount ? <div className="p-10 text-center text-[10px] text-slate-400">No hay elementos que requieran atención.</div> : null}
            </div> : null}

            {activeTab === 'lows' ? <table className="w-full min-w-[820px] text-left text-[10px]"><thead className="sticky top-0 bg-slate-50 text-[8.5px] uppercase text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2">Qué hacer</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.possibleLows.map((item) => <tr key={item.collaboratorId}><td className="px-3 py-2"><div className="font-semibold text-slate-900">{item.fullName}</div><div className="text-[8.5px] text-slate-400">{item.email}</div></td><td className="px-3 py-2">{formatValue(item.profile)}</td><td className="px-3 py-2">{formatValue(item.currentTechnology)}</td><td className="w-[230px] px-3 py-2"><BBVASearchableSelect value={lowDecisions[item.collaboratorId] ?? 'REVIEW'} onChange={(value) => setLowDecisions((current) => ({ ...current, [item.collaboratorId]: value as ImportLowDecision }))} options={lowOptions} ariaLabel={`Decisión para ${item.fullName}`} /></td></tr>)}</tbody></table> : null}

            {activeTab === 'resolved' ? <div className="divide-y divide-slate-100">{preview.resolvedPreviously.map((item, index) => <div key={`${item.rowKey}-${item.change?.resolutionKey ?? item.certification?.resolutionKey ?? index}`} className="grid gap-2 px-3 py-2 text-[9px] md:grid-cols-[minmax(180px,1fr)_160px_1fr_120px]"><div className="font-semibold text-slate-900">{item.fullName}</div><div>{item.change?.label ?? item.certification?.label ?? 'Certificación'}</div><div className="text-slate-500">{item.change ? `${formatValue(item.change.currentValue)} → ${formatValue(item.change.excelValue)}` : `${formatValue(item.certification?.excelStatus)} · ${formatValue(item.certification?.calculatedStatus)}`}</div><span className="w-fit rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">{(item.change?.decision ?? item.certification?.decision) === 'APPLY_EXCEL' ? 'Aplicar Excel' : 'Mantener'}</span></div>)}</div> : null}

            {((activeTab === 'new' && !preview.newItems.length) || (activeTab === 'changed' && !preview.changedItems.length) || (activeTab === 'lows' && !preview.possibleLows.length) || (activeTab === 'resolved' && !preview.resolvedPreviously.length)) ? <div className="p-10 text-center text-[10px] text-slate-400">No hay registros en esta sección.</div> : null}
          </div>
        </section>
      </> : null}

      <ConfirmDialog open={confirmOpen} title="Aplicar importación" message={preview ? `Listos: ${readyCount}. Pendientes: ${validationAttentionCount}. Avisos automáticos: ${previewWarnings.length}. Posibles bajas a desactivar: ${Object.values(lowDecisions).filter((value) => value === 'DEACTIVATE').length}.` : ''} confirmLabel="Aplicar lo válido" tone="primary" busy={applyMutation.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => void apply()} />
    </div>
  );
};
