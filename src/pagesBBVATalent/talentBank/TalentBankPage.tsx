import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Download, Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { TalentStageBadge } from '../../componentsBBVATalent/TalentStageBadge';
import { downloadCvDocument, viewCvDocument } from '../lib/talentCv';
import { roleDisplay, technologyDisplay } from '../lib/talentDisplay';
import { useTalentList } from '../hooks/useTalent';
import { useCatalogOptions } from '../hooks/useCatalog';
import { talentApi } from '../api/talentApi';
import {
  TALENT_AFFILIATION_LABELS,
  TALENT_TYPE_LABELS,
  type Talent,
  type TalentAffiliation,
} from '../types/talent';

interface LocationState { message?: string; }
type TypeFilter = 'ALL' | 'ACADEMY' | 'PROSPECT' | 'FORMER_COLLABORATOR';
type StatusFilter = 'ACTIVE' | 'DELETED' | 'ALL';
type AffiliationFilter = 'ALL' | TalentAffiliation;

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos los tipos' },
  { value: 'ACADEMY', label: 'Academia' },
  { value: 'PROSPECT', label: 'Prospecto' },
  { value: 'FORMER_COLLABORATOR', label: 'Excolaborador' },
];

export const TalentPage: React.FC = () => {
  const listQuery = useTalentList();
  const profilesQuery = useCatalogOptions('profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [affiliationFilter, setAffiliationFilter] = useState<AffiliationFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [profileFilter, setProfileFilter] = useState('ALL');
  const [technologyFilter, setTechnologyFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>((location.state as LocationState | null)?.message ?? null);

  useEffect(() => {
    if ((location.state as LocationState | null)?.message) navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const items = listQuery.data?.items ?? [];
  const profileOptions = profilesQuery.data?.items ?? [];
  const technologyOptions = technologiesQuery.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const normalizedType = item.talentType === 'BBVA_EXIT' ? 'FORMER_COLLABORATOR' : item.talentType;
      const values = [item.fullName, item.softtekEmail, item.bbvaEmail, item.email, item.softtekCode, item.bbvaUser, item.corporateUser, item.profile, item.technologyProfile, item.currentTechnology, item.expertise, item.lifecycleReasonName, item.lifecycleReasonCode];
      const matchesSearch = !term || values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesSearch
        && (typeFilter === 'ALL' || normalizedType === typeFilter)
        && (affiliationFilter === 'ALL' || item.affiliationType === affiliationFilter)
        && (statusFilter === 'ALL' || item.recordStatus === statusFilter)
        && (profileFilter === 'ALL' || item.profileCatalogId === profileFilter)
        && (technologyFilter === 'ALL' || item.currentTechnologyCatalogId === technologyFilter);
    });
  }, [affiliationFilter, items, profileFilter, search, statusFilter, technologyFilter, typeFilter]);

  useEffect(() => setPage(0), [search, typeFilter, affiliationFilter, statusFilter, profileFilter, technologyFilter, size]);
  const paged = useMemo(() => filtered.slice(page * size, page * size + size), [filtered, page, size]);

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

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => navigate('/bbva/talent-bank/new')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500">
          <Plus className="h-3.5 w-3.5" /> Agregar talento
        </button>
      </div>

      {message && <BBVAAlert tone="success" onClose={() => setMessage(null)}>{message}</BBVAAlert>}
      {actionError && <BBVAAlert tone="error" onClose={() => setActionError(null)}>{actionError}</BBVAAlert>}

      <div className="grid gap-2 xl:grid-cols-[minmax(260px,1fr)_170px_160px_160px_200px_200px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o IS" className="h-8 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100" />
        </div>
        <BBVASearchableSelect value={typeFilter} onChange={(value) => setTypeFilter(value as TypeFilter)} options={typeOptions} ariaLabel="Filtrar por tipo" />
        <BBVASearchableSelect value={affiliationFilter} onChange={(value) => setAffiliationFilter(value as AffiliationFilter)} options={[{ value: 'ALL', label: 'Internos y externos' }, { value: 'INTERNAL', label: 'Internos' }, { value: 'EXTERNAL', label: 'Externos' }]} ariaLabel="Filtrar por vinculación" />
        <BBVASearchableSelect value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={[{ value: 'ACTIVE', label: 'Activos' }, { value: 'DELETED', label: 'Eliminados' }, { value: 'ALL', label: 'Todos' }]} ariaLabel="Filtrar por estado" />
        <BBVASearchableSelect value={profileFilter} onChange={setProfileFilter} options={[{ value: 'ALL', label: 'Todos los perfiles' }, ...profileOptions.map((option) => ({ value: option.id, label: option.name }))]} ariaLabel="Filtrar por perfil" />
        <BBVASearchableSelect value={technologyFilter} onChange={setTechnologyFilter} options={[{ value: 'ALL', label: 'Todas las tecnologías' }, ...technologyOptions.map((option) => ({ value: option.id, label: option.name }))]} ariaLabel="Filtrar por tecnología" />
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando Banco de talento...</div>
      ) : listQuery.error ? (
        <BBVAAlert tone="error">{(listQuery.error as Error).message}</BBVAAlert>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[1220px] table-fixed text-left text-[10.5px]">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[0.035em] text-slate-600">
                <tr>
                  <th className="w-[22%] px-2 py-1.5">Persona</th>
                  <th className="w-[10%] px-2 py-1.5">Vinculación</th>
                  <th className="w-[12%] px-2 py-1.5">Estatus</th>
                  <th className="w-[17%] px-2 py-1.5">Motivo / origen</th>
                  <th className="w-[19%] px-2 py-1.5">Perfil</th>
                  <th className="w-[10%] px-2 py-1.5">Tecnología</th>
                  <th className="w-[4%] px-2 py-1.5">CV</th>
                  <th className="w-[6%] px-2 py-1.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paged.map((item) => {
                  const deleted = item.recordStatus === 'DELETED';
                  return (
                    <tr key={item.id} className={`h-[42px] transition hover:bg-slate-50 ${deleted ? 'opacity-70' : ''}`}>
                      <td className="px-2 py-1.5"><div className="truncate font-semibold text-slate-900">{item.fullName}</div><div className="truncate text-[9.5px] text-slate-500">{item.softtekEmail || item.email}</div>{item.bbvaEmail ? <div className="truncate text-[9px] text-slate-400">BBVA: {item.bbvaEmail}</div> : null}</td>
                      <td className="px-2 py-1.5"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9.5px] font-semibold text-slate-700">{TALENT_AFFILIATION_LABELS[item.affiliationType]}</span></td>
                      <td className="px-2 py-1.5">{deleted ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[9.5px] font-semibold text-rose-700">Eliminado</span> : <TalentStageBadge stage={item.stage} />}</td>
                      <td className="px-2 py-1.5"><div className="truncate font-medium text-slate-700">{item.lifecycleReasonName || TALENT_TYPE_LABELS[item.talentType]}</div>{item.lifecycleEffectiveDate ? <div className="mt-0.5 text-[9px] text-slate-400">Desde {item.lifecycleEffectiveDate}</div> : null}</td>
                      <td className="px-2 py-1.5 text-slate-700"><div className="line-clamp-2 leading-[1.15]">{roleDisplay(item)}</div></td>
                      <td className="px-2 py-1.5 text-slate-700">{technologyDisplay(item)}</td>
                      <td className="px-2 py-1.5">{item.cv ? <button type="button" onClick={() => void openCv(item, false)} className="inline-flex h-6 items-center gap-1 rounded-md px-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50"><FileText className="h-3 w-3" /> Ver</button> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-2 py-1.5 text-right">
                        <BBVAActionMenu items={[
                          { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`/bbva/talent-bank/${item.id}`) },
                          { id: 'edit', label: 'Editar', icon: Pencil, disabled: deleted, onClick: () => navigate(`/bbva/talent-bank/${item.id}/edit`) },
                          { id: 'convert', label: 'Convertir a colaborador', icon: ArrowRightLeft, disabled: deleted, onClick: () => navigate(`/bbva/talent-bank/${item.id}/convert`) },
                          { id: 'view-cv', label: 'Ver CV', icon: FileText, disabled: !item.cv, onClick: () => void openCv(item, false) },
                          { id: 'download-cv', label: 'Descargar CV', icon: Download, disabled: !item.cv, onClick: () => void openCv(item, true) },
                          { id: 'delete', label: 'Eliminar', icon: Trash2, tone: 'danger', disabled: deleted, onClick: () => navigate(`/bbva/talent-bank/${item.id}/delete`) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? <div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500">No hay registros que coincidan con los filtros.</div> : <BBVAPagination total={filtered.length} page={page} size={size} onPageChange={setPage} onSizeChange={(next) => { setSize(next); setPage(0); }} />}
        </div>
      )}
    </div>
  );
};
