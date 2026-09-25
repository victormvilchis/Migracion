import React, { useMemo, useState } from 'react';
import { Search, UsersRound, Pencil, GraduationCap, UserCheck, UserMinus } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { TalentForm } from '../components/TalentForm';
import { TalentStageBadge } from '../components/TalentStageBadge';
import { useCreateTalent, useTalentList, useUpdateTalent, useUpdateTalentStage } from '../hooks/useTalent';
import { TALENT_STAGES, TALENT_STAGE_LABELS, type Talent, type TalentPayload, type TalentStage } from '../types/talent';

export const TalentPage: React.FC = () => {
  const [selected, setSelected] = useState<Talent | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | TalentStage>('ALL');

  const listQuery = useTalentList();
  const createMutation = useCreateTalent();
  const updateMutation = useUpdateTalent();
  const stageMutation = useUpdateTalentStage();

  const items = listQuery.data?.items ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStage = stageFilter === 'ALL' || item.stage === stageFilter;
      const matchesSearch = !term || [item.fullName, item.email, item.profile, item.technologyProfile, item.targetTechnology]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesStage && matchesSearch;
    });
  }, [items, search, stageFilter]);

  const submit = (payload: TalentPayload) => {
    if (selected) {
      updateMutation.mutate({ id: selected.id, payload }, { onSuccess: () => setSelected(null) });
    } else {
      createMutation.mutate(payload);
    }
  };

  const stats = {
    total: items.length,
    academy: items.filter((i) => i.stage === 'ACADEMY' || i.stage === 'TRAINING' || i.stage === 'EVALUATION').length,
    available: items.filter((i) => i.stage === 'AVAILABLE').length,
    unassigned: items.filter((i) => i.stage === 'UNASSIGNED').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-blue-400" />
          <h2 className="text-2xl font-bold text-slate-100">Talent</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">Prospectos, academias, capacitación y talento disponible para incorporación.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Talent total', stats.total, UsersRound],
          ['En formación', stats.academy, GraduationCap],
          ['Disponibles', stats.available, UserCheck],
          ['Desasignados', stats.unassigned, UserMinus],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)} className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-bold text-slate-100">{String(value)}</p></div>
              {React.createElement(Icon as React.ElementType, { className: 'h-5 w-5 text-blue-400' })}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <TalentForm
            selected={selected}
            saving={createMutation.isPending || updateMutation.isPending}
            onSubmit={submit}
            onCancelEdit={() => setSelected(null)}
          />
          {(createMutation.error || updateMutation.error) && (
            <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              {(createMutation.error as Error)?.message || (updateMutation.error as Error)?.message}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, correo, perfil o tecnología..." className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
            </div>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as 'ALL' | TalentStage)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500">
              <option value="ALL">Todas las etapas</option>
              {TALENT_STAGES.map((stage) => <option key={stage} value={stage}>{TALENT_STAGE_LABELS[stage]}</option>)}
            </select>
          </div>

          {listQuery.isLoading ? (
            <div className="p-10 text-center text-sm text-slate-500">Cargando Talent...</div>
          ) : listQuery.error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{(listQuery.error as Error).message}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-500">No hay registros que coincidan con los filtros.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr><th className="px-4 py-3">Talent</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Tecnología</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Ingreso</th><th className="px-4 py-3 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/25">
                        <td className="px-4 py-3"><div className="font-semibold text-slate-200">{item.fullName}</div><div className="mt-0.5 text-[11px] text-slate-500">{item.email || 'Sin correo'}</div></td>
                        <td className="px-4 py-3 text-slate-400"><div>{item.profile || '—'}</div><div className="text-[11px] text-slate-600">{item.technologyProfile || ''}</div></td>
                        <td className="px-4 py-3 text-slate-400">{item.targetTechnology || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-2">
                            <TalentStageBadge stage={item.stage} />
                            <select
                              value={item.stage}
                              disabled={stageMutation.isPending}
                              onChange={(e) => stageMutation.mutate({ id: item.id, stage: e.target.value as TalentStage })}
                              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 outline-none"
                            >
                              {TALENT_STAGES.map((stage) => <option key={stage} value={stage}>{TALENT_STAGE_LABELS[stage]}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(`${item.entryDate}T00:00:00`).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => setSelected(item)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-blue-400 hover:bg-blue-500/10"><Pencil className="h-3.5 w-3.5" />Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
