import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Download, Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { TalentTypeBadge } from '../../componentsBBVATalent/TalentTypeBadge';
import { downloadCvDocument, viewCvDocument } from '../lib/talentCv';
import { roleDisplay, technologyDisplay } from '../lib/talentDisplay';
import { useTalentList } from '../hooks/useTalent';
import { useCatalogOptions } from '../hooks/useCatalog';
import { talentApi } from '../api/talentApi';
import { TALENT_TYPES, TALENT_TYPE_LABELS, type Talent, type TalentType } from '../types/talent';

interface LocationState { message?: string; }

export const TalentPage: React.FC = () => {
  const listQuery = useTalentList();
  const profilesQuery = useCatalogOptions('profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TalentType>('ALL');
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
      const values = [item.fullName, item.email, item.softtekCode, item.corporateUser, item.profile, item.technologyProfile, item.currentTechnology, item.expertise];
      const matchesSearch = !term || values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesSearch
        && (typeFilter === 'ALL' || item.talentType === typeFilter)
        && (profileFilter === 'ALL' || item.profileCatalogId === profileFilter)
        && (technologyFilter === 'ALL' || item.currentTechnologyCatalogId === technologyFilter);
    });
  }, [items, profileFilter, search, technologyFilter, typeFilter]);

  useEffect(() => setPage(0), [search, typeFilter, profileFilter, technologyFilter, size]);
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

      <div className="grid gap-2 lg:grid-cols-[minmax(280px,1fr)_minmax(220px,0.32fr)_minmax(240px,0.42fr)_minmax(220px,0.4fr)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o IS" className="h-8 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100" />
        </div>
        <BBVASearchableSelect value={typeFilter} onChange={(value) => setTypeFilter(value as 'ALL' | TalentType)} options={[{ value: 'ALL', label: 'Todos los tipos' }, ...TALENT_TYPES.map((type) => ({ value: type, label: TALENT_TYPE_LABELS[type] }))]} ariaLabel="Filtrar por tipo" />
        <BBVASearchableSelect value={profileFilter} onChange={setProfileFilter} options={[{ value: 'ALL', label: 'Todos los perfiles' }, ...profileOptions.map((option) => ({ value: option.id, label: option.name }))]} ariaLabel="Filtrar por perfil" />
        <BBVASearchableSelect value={technologyFilter} onChange={setTechnologyFilter} options={[{ value: 'ALL', label: 'Todas las tecnologías' }, ...technologyOptions.map((option) => ({ value: option.id, label: option.name }))]} ariaLabel="Filtrar por tecnología" />
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando Banco de talento...</div>
      ) : listQuery.error ? (
        <BBVAAlert tone="error">{(listQuery.error as Error).message}</BBVAAlert>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[1020px] table-fixed text-left text-[10.5px]">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[0.035em] text-slate-600 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/55 [.bbva-dark_&]:text-slate-400">
                <tr>
                  <th className="w-[31%] px-2 py-1.5">Persona</th>
                  <th className="w-[11%] px-2 py-1.5">Tipo</th>
                  <th className="w-[24%] px-2 py-1.5">Perfil</th>
                  <th className="w-[19%] px-2 py-1.5">Tecnología</th>
                  <th className="w-[7%] px-2 py-1.5">CV</th>
                  <th className="w-[8%] px-2 py-1.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 [.bbva-dark_&]:divide-slate-800">
                {paged.map((item) => (
                  <tr key={item.id} className="h-[39px] transition hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/60">
                    <td className="px-2 py-1.5"><div className="truncate font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.fullName}</div><div className="truncate text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{item.email}</div></td>
                    <td className="px-2 py-1.5"><TalentTypeBadge type={item.talentType} /></td>
                    <td className="px-2 py-1.5 text-slate-700 [.bbva-dark_&]:text-slate-300"><div className="line-clamp-2 leading-[1.15]">{roleDisplay(item)}</div></td>
                    <td className="px-2 py-1.5 text-slate-700 [.bbva-dark_&]:text-slate-300">{technologyDisplay(item)}</td>
                    <td className="px-2 py-1.5">
                      {item.cv ? <button type="button" onClick={() => void openCv(item, false)} className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 [.bbva-dark_&]:text-blue-300 [.bbva-dark_&]:hover:bg-blue-500/10"><FileText className="h-3 w-3" /> Ver</button> : <span className="text-slate-400">No disponible</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <BBVAActionMenu items={[
                        { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`/bbva/talent-bank/${item.id}`) },
                        { id: 'edit', label: 'Editar', icon: Pencil, onClick: () => navigate(`/bbva/talent-bank/${item.id}/edit`) },
                        { id: 'convert', label: 'Convertir a colaborador', icon: ArrowRightLeft, onClick: () => navigate(`/bbva/talent-bank/${item.id}/convert`) },
                        { id: 'view-cv', label: 'Ver CV', icon: FileText, disabled: !item.cv, onClick: () => void openCv(item, false) },
                        { id: 'download-cv', label: 'Descargar CV', icon: Download, disabled: !item.cv, onClick: () => void openCv(item, true) },
                        { id: 'delete', label: 'Eliminar', icon: Trash2, tone: 'danger', onClick: () => navigate(`/bbva/talent-bank/${item.id}/delete`) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? <div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:text-slate-400">No hay registros que coincidan con los filtros.</div> : <BBVAPagination total={filtered.length} page={page} size={size} onPageChange={setPage} onSizeChange={(next) => { setSize(next); setPage(0); }} />}
        </div>
      )}

    </div>
  );
};
