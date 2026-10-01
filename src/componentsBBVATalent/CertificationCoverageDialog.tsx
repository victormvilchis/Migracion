import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers3, Plus, Trash2, X } from 'lucide-react';
import { displayCertificationName } from '../pagesBBVATalent/lib/bbvaDisplayFormat';
import type { CollaboratorCertification } from '../pagesBBVATalent/types/collaboratorCertification';

interface CertificationCoverageDialogProps {
  open: boolean;
  anchor: CollaboratorCertification | null;
  items: CollaboratorCertification[];
  busy?: boolean;
  onCancel: () => void;
  onSave: (memberRecordIds: string[]) => Promise<void> | void;
  onClear: () => Promise<void> | void;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin vencimiento';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const CertificationCoverageDialog: React.FC<CertificationCoverageDialogProps> = ({ open, anchor, items, busy = false, onCancel, onSave, onClear }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const technologicalItems = useMemo(() => items.filter((item) => item.applicable && item.status !== 'NOT_APPLICABLE' && item.certificationType === 'TECHNOLOGICAL'), [items]);

  useEffect(() => {
    if (!open || !anchor) return;
    if (anchor.coverageGroupId) {
      const members = technologicalItems
        .filter((item) => item.coverageGroupId === anchor.coverageGroupId)
        .sort((a, b) => a.coveragePriority - b.coveragePriority || a.certificationName.localeCompare(b.certificationName, 'es-MX'));
      setSelectedIds(members.map((item) => item.id));
    } else {
      setSelectedIds([anchor.id]);
    }
  }, [anchor, open, technologicalItems]);

  if (!open || !anchor) return null;

  const selectedItems = selectedIds.map((id) => technologicalItems.find((item) => item.id === id)).filter((item): item is CollaboratorCertification => Boolean(item));
  const availableItems = technologicalItems
    .filter((item) => !selectedIds.includes(item.id))
    .sort((a, b) => a.certificationName.localeCompare(b.certificationName, 'es-MX', { sensitivity: 'base', numeric: true }));

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedIds.length) return;
    setSelectedIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const add = (item: CollaboratorCertification) => {
    if (item.coverageGroupId && item.coverageGroupId !== anchor.coverageGroupId) return;
    setSelectedIds((current) => current.includes(item.id) ? current : [...current, item.id]);
  };

  const remove = (item: CollaboratorCertification) => {
    if (item.id === anchor.id) return;
    setSelectedIds((current) => current.filter((id) => id !== item.id));
  };

  return <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Configurar cobertura tecnológica">
    <button type="button" className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" aria-label="Cerrar cobertura tecnológica" onClick={onCancel} />
    <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-[#111c2e]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 [.bbva-dark_&]:border-slate-700">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-cyan-500" /><h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-white">Cobertura tecnológica</h2></div>
          <p className="mt-1.5 max-w-2xl text-[10.5px] leading-4 text-slate-500 [.bbva-dark_&]:text-slate-400">Agrupa dos o más certificaciones tecnológicas del colaborador. Solo una impacta métricas a la vez. El relevo sigue el orden configurado: cuando la que está activa vence, entra la siguiente usando su propia fecha de expiración.</p>
          <p className="mt-1 text-[9.5px] font-medium text-cyan-700 [.bbva-dark_&]:text-cyan-300">Desarrollo Seguro, Normativa y cualquier certificación no tecnológica quedan fuera de este modelo.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-100"><X className="h-4 w-4" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500">Orden de relevo</div>
        <div className="mt-2 space-y-2">
          {selectedItems.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-[#020617]">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-bold text-cyan-700 [.bbva-dark_&]:bg-cyan-500/10 [.bbva-dark_&]:text-cyan-300">{index + 1}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[10.5px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{displayCertificationName(item.certificationName)}</div><div className="mt-0.5 text-[9px] text-slate-500">{item.technologyName ?? 'Tecnológica'} · vence {formatDate(item.expirationDate)}{item.metricActive ? ' · actualmente en métrica' : ''}</div></div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" disabled={index === 0 || busy} onClick={() => move(index, -1)} className="rounded-lg border border-slate-300 p-1.5 text-slate-500 disabled:opacity-30 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:text-slate-300" aria-label="Subir en orden"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={index === selectedItems.length - 1 || busy} onClick={() => move(index, 1)} className="rounded-lg border border-slate-300 p-1.5 text-slate-500 disabled:opacity-30 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:text-slate-300" aria-label="Bajar en orden"><ChevronDown className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={item.id === anchor.id || busy} onClick={() => remove(item)} className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:text-slate-300" aria-label="Quitar del grupo"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>)}
        </div>

        <div className="mt-5 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500">Agregar certificaciones tecnológicas</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {availableItems.length ? availableItems.map((item) => {
            const belongsToAnotherGroup = Boolean(item.coverageGroupId && item.coverageGroupId !== anchor.coverageGroupId);
            return <button key={item.id} type="button" disabled={belongsToAnotherGroup || busy} onClick={() => add(item)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-cyan-300 hover:bg-cyan-50/50 disabled:cursor-not-allowed disabled:opacity-45 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:hover:border-cyan-500/40 [.bbva-dark_&]:hover:bg-cyan-500/5">
              <Plus className="h-3.5 w-3.5 shrink-0 text-cyan-500" /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100">{displayCertificationName(item.certificationName)}</span><span className="mt-0.5 block text-[8.5px] text-slate-500">{belongsToAnotherGroup ? 'Ya pertenece a otro grupo' : `Vence ${formatDate(item.expirationDate)}`}</span></span>
            </button>;
          }) : <div className="col-span-full rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-[9.5px] text-slate-500 [.bbva-dark_&]:border-slate-700">No hay otras certificaciones tecnológicas disponibles para agregar.</div>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3.5 [.bbva-dark_&]:border-slate-700">
        <div>{anchor.coverageGroupId ? <button type="button" disabled={busy} onClick={() => void onClear()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-300 px-3 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 [.bbva-dark_&]:border-rose-500/30 [.bbva-dark_&]:hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" />Eliminar grupo</button> : null}</div>
        <div className="flex items-center gap-2"><button type="button" onClick={onCancel} disabled={busy} className="h-9 rounded-xl border border-slate-300 px-3.5 text-[10.5px] font-semibold text-slate-600 disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:text-slate-300">Cancelar</button><button type="button" onClick={() => void onSave(selectedIds)} disabled={busy || selectedIds.length < 2} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 text-[10.5px] font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"><Layers3 className="h-3.5 w-3.5" />Guardar grupo ({selectedIds.length})</button></div>
      </div>
    </div>
  </div>;
};
