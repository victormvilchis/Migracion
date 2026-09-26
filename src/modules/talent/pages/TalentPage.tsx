import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Download, Eye, FileText, GraduationCap, Pencil, Plus, Search, Trash2, UserRoundCheck, UsersRound, ArrowRightLeft } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TalentStageBadge } from '../components/TalentStageBadge';
import { TalentTypeBadge } from '../components/TalentTypeBadge';
import { downloadCvDocument, viewCvDocument } from '../components/talentCv';
import { roleDisplay, technologyDisplay } from '../components/talentDisplay';
import { useDeleteTalent, useTalentList } from '../hooks/useTalent';
import { talentApi } from '../services/talentApi';
import { TALENT_STAGES, TALENT_STAGE_LABELS, TALENT_TYPES, TALENT_TYPE_LABELS, type Talent, type TalentStage, type TalentType } from '../types/talent';

interface LocationState {
  message?: string;
}

export const TalentPage: React.FC = () => {
  const listQuery = useTalentList();
  const deleteMutation = useDeleteTalent();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TalentType>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | TalentStage>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<Talent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>((location.state as LocationState | null)?.message ?? null);

  useEffect(() => {
    if ((location.state as LocationState | null)?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const items = listQuery.data?.items ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === 'ALL' || item.talentType === typeFilter;
      const matchesStage = stageFilter === 'ALL' || item.stage === stageFilter;
      const values = [item.fullName, item.email, item.softtekCode, item.corporateUser, item.profile, item.technologyProfile, item.currentTechnology, item.expertise];
      const matchesSearch = !term || values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesType && matchesStage && matchesSearch;
    });
  }, [items, search, stageFilter, typeFilter]);

  const stats = {
    total: items.length,
    academy: items.filter((item) => item.talentType === 'ACADEMY').length,
    prospect: items.filter((item) => item.talentType === 'PROSPECT').length,
    available: items.filter((item) => item.stage === 'AVAILABLE' || item.stage === 'UNASSIGNED').length,
  };

  const openCv = async (item: Talent, download: boolean) => {
    try {
      setActionError(null);
      const response = await talentApi.getCv(item.id);
      if (download) downloadCvDocument(response.document);
      else viewCvDocument(response.document);
    } catch (error) {
      setActionError((error as Error).message);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setMessage('El registro y toda su información asociada fueron eliminados definitivamente.');
      },
      onError: (error) => setActionError((error as Error).message),
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-blue-400" />
            <h2 className="text-2xl font-bold text-slate-950">Talent Bank</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Academias, prospectos y personas disponibles fuera de la operación activa de Colaboradores.</p>
        </div>
        <Link to="/talent/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
          <Plus className="h-4 w-4" />Nuevo talento
        </Link>
      </div>

      {message && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {actionError && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{actionError}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total Talent Bank', stats.total, UsersRound],
          ['Academia', stats.academy, GraduationCap],
          ['Prospectos', stats.prospect, UserRoundCheck],
          ['Disponibles / desasignados', stats.available, UserRoundCheck],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)} className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-bold text-slate-950">{String(value)}</p></div>
              {React.createElement(Icon as React.ElementType, { className: 'h-5 w-5 text-blue-400' })}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo, código, usuario, perfil o tecnología..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-blue-500" />
        </div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | TalentType)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500">
          <option value="ALL">Todos los tipos</option>
          {TALENT_TYPES.map((type) => <option key={type} value={type}>{TALENT_TYPE_LABELS[type]}</option>)}
        </select>
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as 'ALL' | TalentStage)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500">
          <option value="ALL">Todas las etapas</option>
          {TALENT_STAGES.filter((stage) => stage !== 'CONVERTED').map((stage) => <option key={stage} value={stage}>{TALENT_STAGE_LABELS[stage]}</option>)}
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="p-10 text-center text-sm text-slate-500">Cargando Talent Bank...</div>
      ) : listQuery.error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700">{(listQuery.error as Error).message}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No hay registros que coincidan con los filtros.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-white text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Talento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Tecnología actual</th>
                  <th className="px-4 py-3">Usuario corporativo</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">CV</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((item) => (
                  <tr key={item.id} className="align-middle hover:bg-slate-50">
                    <td className="px-4 py-3"><div className="font-semibold text-slate-900">{item.fullName}</div><div className="mt-0.5 text-[11px] text-slate-500">{item.email}</div></td>
                    <td className="px-4 py-3"><TalentTypeBadge type={item.talentType} /></td>
                    <td className="px-4 py-3 text-slate-500">{roleDisplay(item)}</td>
                    <td className="px-4 py-3 text-slate-500">{technologyDisplay(item)}</td>
                    <td className="px-4 py-3 text-slate-500">{item.corporateUser || 'N/A'}</td>
                    <td className="px-4 py-3"><TalentStageBadge stage={item.stage} /></td>
                    <td className="px-4 py-3">
                      {item.cv ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => void openCv(item, false)} title="Ver CV" className="rounded-md p-1.5 text-blue-400 hover:bg-blue-500/10"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => void openCv(item, true)} title="Descargar CV" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><Download className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : <span className="inline-flex items-center gap-1 text-slate-500"><FileText className="h-3.5 w-3.5" />N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/talent/${item.id}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" />Ver</Link>
                        <Link to={`/talent/${item.id}/edit`} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-blue-600 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</Link>
                        <Link to={`/talent/${item.id}/convert`} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-emerald-700 hover:bg-emerald-50"><ArrowRightLeft className="h-3.5 w-3.5" />Convertir</Link>
                        <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar definitivamente"
        message={`Se eliminará ${deleteTarget?.fullName ?? 'este talento'}, su historial y su CV. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
        busy={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
