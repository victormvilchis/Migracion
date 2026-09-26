import React from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { useCatalogItem } from '../hooks/useCatalog';
import { catalogConfigs, type CatalogType } from '../types/catalog';

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const CatalogDetailPage: React.FC<{ type: CatalogType }> = ({ type }) => {
  const config = catalogConfigs[type];
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCatalogItem(type, id);
  const item = query.data?.item;

  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando registro...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Registro no encontrado.'}</BBVAAlert>;

  const fieldClass = 'rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/45';
  const labelClass = 'text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';
  const valueClass = 'mt-1 text-[11px] font-medium text-slate-900 [.bbva-dark_&]:text-slate-100';

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(config.route)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
        <button type="button" onClick={() => navigate(`${config.route}/${item.id}/edit`)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-500"><Pencil className="h-3.5 w-3.5" />Editar</button>
      </div>
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <div className={`${fieldClass} lg:col-span-2`}><div className={labelClass}>Nombre</div><div className={valueClass}>{item.name}</div></div>
        {config.supportsCode && <div className={fieldClass}><div className={labelClass}>Código</div><div className={valueClass}>{item.code || 'N/A'}</div></div>}
        {config.supportsSeniority && <div className={fieldClass}><div className={labelClass}>Seniority</div><div className={valueClass}>{item.seniority || 'N/A'}</div></div>}
        <div className={fieldClass}><div className={labelClass}>Estado</div><div className={valueClass}>{item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</div></div>
        <div className={fieldClass}><div className={labelClass}>Cantidad de usos</div><div className={valueClass}>{item.usageCount}</div></div>
        <div className={fieldClass}><div className={labelClass}>Última actualización</div><div className={valueClass}>{formatDateTime(item.updatedAt)}</div></div>
        <div className={`${fieldClass} sm:col-span-2 lg:col-span-4`}><div className={labelClass}>Descripción</div><div className={`${valueClass} whitespace-pre-wrap`}>{item.description || 'Sin descripción.'}</div></div>
      </div>
    </div>
  );
};
