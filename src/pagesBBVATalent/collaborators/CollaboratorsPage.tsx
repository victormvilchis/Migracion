import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserRoundCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCollaborators } from '../hooks/useCollaborators';

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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX');
}

export const CollaboratorsPage: React.FC = () => {
  const query = useCollaborators();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [message] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);
  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.fullName, item.email, item.softtekCode, item.corporateUser, item.profile, item.technologyProfile, item.currentTechnology, item.expertise]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [items, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <UserRoundCheck className="h-5 w-5 text-blue-500" />
          <h2 className="text-2xl font-bold text-slate-950">Colaboradores</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">Personas activas que participan en métricas, certificaciones y seguimiento.</p>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, correo, código o usuario corporativo..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-blue-500"
        />
      </div>

      {query.isLoading ? (
        <div className="p-10 text-center text-sm text-slate-500">Cargando colaboradores...</div>
      ) : query.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{(query.error as Error).message}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No hay colaboradores registrados.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Tecnología actual</th>
                  <th className="px-4 py-3">Usuario corporativo</th>
                  <th className="px-4 py-3">Fecha de alta</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><div className="font-semibold text-slate-900">{item.fullName}</div><div className="mt-0.5 text-[11px] text-slate-500">{item.email}</div></td>
                    <td className="px-4 py-3 text-slate-600">{roleDisplay(item.profile, item.technologyProfile)}</td>
                    <td className="px-4 py-3 text-slate-600">{technologyDisplay(item.currentTechnology, item.expertise)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.corporateUser || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.startDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.endDate)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
