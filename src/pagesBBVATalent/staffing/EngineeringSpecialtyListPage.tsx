import React, { Fragment, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useEngineeringSpecialties, useEngineeringSpecialtyStatus } from '../hooks/useEngineeringSpecialties';
import type { EngineeringSpecialty, EngineeringSpecialtyStatus } from '../types/engineeringSpecialty';

export const EngineeringSpecialtyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EngineeringSpecialtyStatus | 'ALL'>('ACTIVE');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [pending, setPending] = useState<{ item: EngineeringSpecialty; next: EngineeringSpecialtyStatus } | null>(null);
  const query = useEngineeringSpecialties({ search, status, page, size });
  const statusMutation = useEngineeringSpecialtyStatus();

  const groups = useMemo(() => {
    const byN3 = new Map<string, Map<string, EngineeringSpecialty[]>>();
    for (const item of query.data?.items ?? []) {
      if (!byN3.has(item.n3)) byN3.set(item.n3, new Map());
      const byGuild = byN3.get(item.n3)!;
      if (!byGuild.has(item.guild)) byGuild.set(item.guild, []);
      byGuild.get(item.guild)!.push(item);
    }
    return [...byN3.entries()];
  }, [query.data?.items]);

  const confirmStatus = async () => {
    if (!pending) return;
    await statusMutation.mutateAsync({ id: pending.item.id, status: pending.next });
    setPending(null);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">GREMIOS Y ESPECIALIDADES</h1>
          <p className="text-[10px] text-slate-500">Jerarquía N3 → Gremio → Especialidad. Staffer y responsables quedan asociados a la especialidad.</p>
        </div>
        <BBVAButton
          variant="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => navigate('/bbva/admin/catalogs/engineering-specialties/new')}
        >
          Agregar especialidad
        </BBVAButton>
      </div>

      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_180px]">
        <input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          placeholder="Buscar N3, gremio, especialidad o staffer"
          className="h-9 rounded-xl border border-slate-300 px-3 text-[11px]"
        />
        <BBVASearchableSelect
          value={status}
          onChange={(value) => { setStatus(value as EngineeringSpecialtyStatus | 'ALL'); setPage(0); }}
          options={[
            { value: 'ACTIVE', label: 'ACTIVOS' },
            { value: 'INACTIVE', label: 'INACTIVOS' },
            { value: 'ALL', label: 'TODOS' },
          ]}
        />
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-[10px]">
            <thead className="bg-slate-50 text-[8.5px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Jerarquía</th>
                <th className="px-3 py-2">Líder de gremio</th>
                <th className="px-3 py-2">Responsable especialidad</th>
                <th className="px-3 py-2">Portfolio & Staffing</th>
                <th className="px-3 py-2">Staffer</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map(([n3, guilds]) => (
                <Fragment key={n3}>
                  <tr className="bg-blue-50/50">
                    <td colSpan={7} className="px-3 py-2 font-bold text-blue-900">{n3}</td>
                  </tr>
                  {[...guilds.entries()].map(([guild, items]) => (
                    <Fragment key={`${n3}-${guild}`}>
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-2 font-semibold text-slate-700">↳ {guild}</td>
                      </tr>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-10 py-2 font-semibold">↳ {item.specialty}</td>
                          <td className="px-3 py-2">{item.guildLeader || '—'}</td>
                          <td className="px-3 py-2">{item.specialtyOwner || '—'}</td>
                          <td className="px-3 py-2">{item.portfolioStaffing || '—'}</td>
                          <td className="px-3 py-2 font-semibold">{item.staffer || '—'}</td>
                          <td className="px-3 py-2">{item.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}</td>
                          <td className="px-3 py-2 text-right">
                            <BBVAActionMenu
                              items={[
                                { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`/bbva/admin/catalogs/engineering-specialties/${item.id}`) },
                                { id: 'edit', label: 'Editar', icon: Pencil, onClick: () => navigate(`/bbva/admin/catalogs/engineering-specialties/${item.id}/edit`) },
                                {
                                  id: 'status',
                                  label: item.status === 'ACTIVE' ? 'Inactivar' : 'Activar',
                                  icon: item.status === 'ACTIVE' ? Power : RefreshCw,
                                  onClick: () => setPending({ item, next: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <BBVAPagination
          total={query.data?.total ?? 0}
          page={query.data?.page ?? page}
          size={query.data?.size ?? size}
          onPageChange={setPage}
          onSizeChange={(value) => { setSize(value); setPage(0); }}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.next === 'ACTIVE' ? 'Activar especialidad' : 'Inactivar especialidad'}
        message={pending?.item.specialty ?? ''}
        confirmLabel="Confirmar"
        tone="warning"
        busy={statusMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmStatus()}
      />
    </div>
  );
};
