import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACatalogHeader } from '../../componentsBBVATalent/BBVACatalogHeader';
import { useEngineeringSpecialty } from '../hooks/useEngineeringSpecialties';

export const EngineeringSpecialtyDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useEngineeringSpecialty(id);
  if (query.isLoading) return <div className="p-8 text-xs text-slate-500">Cargando...</div>;
  if (!query.data?.item) return <BBVAAlert tone="error">Especialidad no encontrada.</BBVAAlert>;
  const item = query.data.item;
  const row = (label: string, value: string | null) => <div><div className="text-[9px] uppercase text-slate-400">{label}</div><div className="mt-1 font-semibold">{value || '—'}</div></div>;
  return <div className="space-y-3 animate-fade-in">
    <BBVAButton variant="secondary" onClick={() => navigate('/bbva/admin/catalogs/engineering-specialties')}>Regresar</BBVAButton>
    <BBVACatalogHeader title="ESPECIALIDAD" description={item.specialty.toUpperCase()} />
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{row('Estructura nivel 2', item.n3)}{row('Gremio / nivel 3', item.guild)}{row('Especialidad', item.specialty)}{row('Staffer', item.staffer)}{row('Líder de gremio', item.guildLeader)}{row('Responsable de especialidad', item.specialtyOwner)}{row('Portfolio & Staffing', item.portfolioStaffing)}{row('Estado', item.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO')}</div></section>
  </div>;
};
