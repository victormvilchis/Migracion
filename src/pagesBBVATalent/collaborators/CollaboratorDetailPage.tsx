import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { useCollaborator } from '../hooks/useCollaborators';

function value(value?: string | null) { return value?.trim() || 'No disponible'; }
function dateValue(raw?: string | null) {
  if (!raw) return 'No disponible';
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const CollaboratorDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCollaborator(id);
  const item = query.data?.item;

  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando colaborador...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{query.error ? (query.error as Error).message : 'Colaborador no encontrado.'}</BBVAAlert>;

  const rows = [
    ['Nombre completo', item.fullName], ['Correo electrónico', item.email], ['IS', item.softtekCode], ['Usuario corporativo', item.corporateUser],
    ['Perfil', item.profile], ['Perfil tecnológico', item.technologyProfile], ['Tecnología actual', item.currentTechnology], ['Nivel de experiencia', item.expertise],
    ['Fecha de alta', dateValue(item.startDate)], ['Vencimiento', dateValue(item.endDate)], ['Fecha de contratación', dateValue(item.hireDate)], ['Estado', item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'],
  ];

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/collaborators')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Regresar
      </button>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <div className="grid md:grid-cols-2">
          {rows.map(([label, raw], index) => (
            <div key={label} className={`grid grid-cols-[145px_minmax(0,1fr)] gap-3 border-slate-200 px-3 py-2 text-[11px] [.bbva-dark_&]:border-slate-800 ${index % 2 === 0 ? 'md:border-r' : ''} ${index < rows.length - 2 ? 'border-b' : ''}`}>
              <span className="font-semibold text-slate-500 [.bbva-dark_&]:text-slate-400">{label}</span>
              <span className="min-w-0 break-words font-medium text-slate-900 [.bbva-dark_&]:text-slate-100">{value(raw)}</span>
            </div>
          ))}
        </div>
        {item.notes && <div className="border-t border-slate-200 px-3 py-3 text-[11px] [.bbva-dark_&]:border-slate-800"><div className="mb-1 font-semibold text-slate-500 [.bbva-dark_&]:text-slate-400">Observaciones</div><div className="text-slate-800 [.bbva-dark_&]:text-slate-200">{item.notes}</div></div>}
      </div>
    </div>
  );
};
