import React, { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { useCollaborators } from '../hooks/useCollaborators';

function status(item: { certificationApplicable: number; certificationValid: number; certificationExpiring: number; certificationExpired: number; certificationPending: number; certificationRecertificationPending: number }) {
  if (item.certificationExpired + item.certificationRecertificationPending > 0) return 'ATTENTION';
  if (item.certificationExpiring > 0) return 'EXPIRING';
  if (item.certificationPending > 0) return 'PENDING';
  if (item.certificationApplicable > 0) return 'OK';
  return 'NONE';
}

const labels: Record<string, string> = { ATTENTION: 'Atención requerida', EXPIRING: 'Próximas a vencer', PENDING: 'Pendientes', OK: 'En regla', NONE: 'Sin aplicables' };
const tones: Record<string, string> = { ATTENTION: 'bg-rose-50 text-rose-700', EXPIRING: 'bg-amber-50 text-amber-700', PENDING: 'bg-blue-50 text-blue-700', OK: 'bg-emerald-50 text-emerald-700', NONE: 'bg-slate-100 text-slate-500' };

export const CertificationTrackingPage: React.FC = () => {
  const query = useCollaborators();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const items = query.data?.items ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX');
    return items.filter((item) => {
      const current = status(item);
      return (!term || `${item.fullName} ${item.profile ?? ''} ${item.currentTechnology ?? ''}`.toLocaleLowerCase('es-MX').includes(term)) && (filter === 'ALL' || current === filter);
    });
  }, [filter, items, search]);

  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_240px]">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador, perfil o tecnología" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500" /></div>
        <BBVASearchableSelect value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'Todos los estados' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} ariaLabel="Estado de seguimiento" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[880px] text-left text-[10.5px]"><thead className="bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2 text-center">Aplicables</th><th className="px-3 py-2 text-center">Vigentes</th><th className="px-3 py-2 text-center">Próximas</th><th className="px-3 py-2 text-center">Vencidas</th><th className="px-3 py-2 text-center">Pendientes</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2 text-right">Acción</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map((item) => { const current = status(item); return <tr key={item.id} className="hover:bg-slate-50"><td className="px-3 py-2"><div className="font-semibold text-slate-900">{item.fullName}</div><div className="text-[9px] text-slate-400">{item.profile || 'Sin perfil'}</div></td><td className="px-3 py-2 text-slate-600">{item.currentTechnology || 'Sin tecnología'}</td><td className="px-3 py-2 text-center font-semibold">{item.certificationApplicable}</td><td className="px-3 py-2 text-center font-semibold text-emerald-700">{item.certificationValid}</td><td className="px-3 py-2 text-center font-semibold text-amber-700">{item.certificationExpiring}</td><td className="px-3 py-2 text-center font-semibold text-rose-700">{item.certificationExpired + item.certificationRecertificationPending}</td><td className="px-3 py-2 text-center font-semibold text-blue-700">{item.certificationPending}</td><td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${tones[current]}`}>{labels[current]}</span></td><td className="px-3 py-2 text-right"><button type="button" onClick={() => navigate(`/bbva/collaborators/${item.id}/certifications`)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[9.5px] font-semibold text-blue-700 hover:bg-blue-50"><Eye className="h-3 w-3" />Revisar</button></td></tr>; })}</tbody></table>
        {!query.isLoading && filtered.length === 0 ? <div className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500">No hay colaboradores que coincidan con los filtros.</div> : null}
        {query.isLoading ? <div className="px-4 py-8 text-center text-xs text-slate-500">Cargando seguimiento...</div> : null}
      </div>
    </div>
  );
};
