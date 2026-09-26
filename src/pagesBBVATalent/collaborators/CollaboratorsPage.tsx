import React, { useEffect, useMemo, useState } from 'react';
import { Award, Briefcase, Eye, FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVAStatusBadge, certificationStatusLabel, type CertificationStatus } from '../../componentsBBVATalent/BBVAStatusBadge';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useCollaborators, useDeleteCollaborator } from '../hooks/useCollaborators';
import { useCatalogOptions } from '../hooks/useCatalog';
import type { Collaborator } from '../types/collaborator';

function roleDisplay(profile?: string | null, technologyProfile?: string | null) {
  const values = [profile, technologyProfile].filter(Boolean);
  return values.length ? values.join(' - ') : 'N/A';
}

function technologyDisplay(technology?: string | null, expertise?: string | null) {
  if (!technology) return 'N/A';
  return expertise ? `${technology} - ${expertise}` : technology;
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function certificationStatus(endDate?: string | null): CertificationStatus {
  if (!endDate) return 'NA';
  const end = new Date(`${endDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return 'NA';
  const now = new Date();
  if (end.getTime() < now.getTime()) return 'EXPIRED';
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return days <= 90 ? 'EXPIRING' : 'OK';
}

export const CollaboratorsPage: React.FC = () => {
  const query = useCollaborators();
  const profilesQuery = useCatalogOptions('profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const deleteMutation = useDeleteCollaborator();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [technologyFilter, setTechnologyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CertificationStatus>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);
  const [deleteTarget, setDeleteTarget] = useState<Collaborator | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const items = query.data?.items ?? [];
  const roleOptions = profilesQuery.data?.items ?? [];
  const technologyOptions = technologiesQuery.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const role = roleDisplay(item.profile, item.technologyProfile);
      const cert = certificationStatus(item.endDate);
      const matchesSearch = !term || [item.fullName, item.email, item.softtekCode, item.corporateUser, role, item.currentTechnology, item.expertise]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesSearch
        && (roleFilter === 'ALL' || item.profileCatalogId === roleFilter)
        && (technologyFilter === 'ALL' || item.currentTechnologyCatalogId === technologyFilter)
        && (statusFilter === 'ALL' || cert === statusFilter);
    });
  }, [items, roleFilter, search, statusFilter, technologyFilter]);

  useEffect(() => setPage(0), [search, roleFilter, technologyFilter, statusFilter, size]);
  const paged = useMemo(() => filtered.slice(page * size, page * size + size), [filtered, page, size]);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => navigate('/bbva/collaborators/import')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800">
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 [.bbva-dark_&]:text-emerald-400" /> Cargar Excel
        </button>
        <button type="button" onClick={() => navigate('/bbva/collaborators/new')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500">
          <Plus className="h-3.5 w-3.5" /> Agregar colaborador
        </button>
      </div>

      {message && <BBVAAlert tone="success" onClose={() => setMessage(null)}>{message}</BBVAAlert>}
      {actionError && <BBVAAlert tone="error" onClose={() => setActionError(null)}>{actionError}</BBVAAlert>}

      <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_minmax(230px,0.58fr)_minmax(220px,0.52fr)_minmax(220px,0.48fr)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo, IS o usuario" className="h-8 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100" />
        </div>
        <BBVASearchableSelect value={roleFilter} onChange={setRoleFilter} options={[{ value: 'ALL', label: 'Todos los roles' }, ...roleOptions.map((option) => ({ value: option.id, label: option.name }))]} ariaLabel="Filtrar por rol" />
        <BBVASearchableSelect value={technologyFilter} onChange={setTechnologyFilter} options={[{ value: 'ALL', label: 'Todas las tecnologías' }, ...technologyOptions.map((option) => ({ value: option.id, label: option.name }))]} ariaLabel="Filtrar por tecnología" />
        <BBVASearchableSelect value={statusFilter} onChange={(value) => setStatusFilter(value as 'ALL' | CertificationStatus)} options={[{ value: 'ALL', label: 'Todos los estatus' }, ...(['OK', 'EXPIRING', 'EXPIRED', 'NA'] as CertificationStatus[]).map((status) => ({ value: status, label: certificationStatusLabel[status] }))]} ariaLabel="Filtrar por estatus de certificación" />
      </div>

      {query.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando colaboradores...</div>
      ) : query.error ? (
        <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[1120px] table-fixed text-left text-[10.5px]">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[0.035em] text-slate-600 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/55 [.bbva-dark_&]:text-slate-400">
                <tr>
                  <th className="w-[29%] px-2 py-1.5">Colaborador</th>
                  <th className="w-[25%] px-2 py-1.5">Rol</th>
                  <th className="w-[15%] px-2 py-1.5">Tecnología actual</th>
                  <th className="w-[9%] px-2 py-1.5">Fecha de alta</th>
                  <th className="w-[8%] px-2 py-1.5">Vencimiento</th>
                  <th className="w-[9%] px-2 py-1.5">Status certificación</th>
                  <th className="w-[5%] px-2 py-1.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 [.bbva-dark_&]:divide-slate-800">
                {paged.map((item) => {
                  const certStatus = certificationStatus(item.endDate);
                  return (
                    <tr key={item.id} className="h-[39px] transition hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/60">
                      <td className="px-2 py-1.5"><div className="truncate font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.fullName}</div><div className="truncate text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{item.email}</div></td>
                      <td className="px-2 py-1.5"><div className="line-clamp-2 leading-[1.15] text-slate-700 [.bbva-dark_&]:text-slate-300">{roleDisplay(item.profile, item.technologyProfile)}</div></td>
                      <td className="px-2 py-1.5 text-slate-700 [.bbva-dark_&]:text-slate-300">{technologyDisplay(item.currentTechnology, item.expertise)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-700 [.bbva-dark_&]:text-slate-300">{formatDate(item.startDate)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-700 [.bbva-dark_&]:text-slate-300">{formatDate(item.endDate)}</td>
                      <td className="px-2 py-1.5"><BBVAStatusBadge status={certStatus} /></td>
                      <td className="px-2 py-1.5 text-right">
                        <BBVAActionMenu items={[
                          { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`/bbva/collaborators/${item.id}`) },
                          { id: 'edit', label: 'Editar', icon: Pencil, onClick: () => navigate(`/bbva/collaborators/${item.id}/edit`) },
                          { id: 'manage', label: 'Gestionar', icon: Briefcase, onClick: () => navigate(`/bbva/collaborators/${item.id}/manage`) },
                          { id: 'certifications', label: 'Certificaciones', icon: Award, onClick: () => navigate(`/bbva/collaborators/${item.id}/certifications`) },
                          { id: 'delete', label: 'Eliminar definitivamente', icon: Trash2, tone: 'danger', onClick: () => setDeleteTarget(item) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? <div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:text-slate-400">No hay colaboradores que coincidan con los filtros.</div> : <BBVAPagination total={filtered.length} page={page} size={size} onPageChange={setPage} onSizeChange={(next) => { setSize(next); setPage(0); }} />}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar definitivamente"
        message={`Se eliminará ${deleteTarget?.fullName ?? 'este colaborador'} y su información asociada. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => { setDeleteTarget(null); setMessage('El colaborador fue eliminado definitivamente.'); },
            onError: (error) => setActionError((error as Error).message),
          });
        }}
      />
    </div>
  );
};
