import React, { useEffect, useState } from 'react';
import { BBVAButton } from './BBVAButton';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, X } from 'lucide-react';
import { BBVASearchableSelect } from './BBVASearchableSelect';
import type { AdminUserOption } from '../pagesBBVATalent/types/adminUser';

export const BBVAReassignDeliveryManagerDialog:React.FC<{
  open:boolean;
  sourceName:string;
  collaboratorCount:number;
  options:AdminUserOption[];
  busy?:boolean;
  actionLabel:string;
  onCancel:()=>void;
  onConfirm:(targetUserId:string)=>void;
}>=({open,sourceName,collaboratorCount,options,busy=false,actionLabel,onCancel,onConfirm})=>{
  const [target,setTarget]=useState('');
  useEffect(()=>{if(open)setTarget('');},[open]);
  if(!open||typeof document==='undefined')return null;
  return createPortal(<div className="fixed inset-0 z-[2800] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[2px]" onMouseDown={(e)=>{if(e.target===e.currentTarget&&!busy)onCancel();}}>
    <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,.35)]">
      <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ArrowRightLeft className="h-5 w-5"/></span><div><h3 className="text-lg font-semibold text-slate-950">Reasignar colaboradores</h3><p className="mt-1 text-[11px] leading-5 text-slate-500"><b>{sourceName}</b> tiene {collaboratorCount} colaborador{collaboratorCount===1?'':'es'} asignado{collaboratorCount===1?'':'s'}. Selecciona quién continuará con su seguimiento.</p></div></div><button type="button" onClick={onCancel} disabled={busy} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button></div>
      <div className="mt-5"><div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[.05em] text-slate-500">Nuevo Delivery Manager</div><BBVASearchableSelect value={target} onChange={setTarget} options={[{value:'',label:'Seleccionar Delivery Manager'},...options.map((item)=>({value:item.id,label:item.fullName,description:[item.email,item.corporateUser].filter(Boolean).join(' · ')||undefined}))]} ariaLabel="Nuevo Delivery Manager" searchPlaceholder="Buscar Delivery Manager" emptyMessage="No hay otro Delivery Manager activo disponible." disabled={busy}/></div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><BBVAButton type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</BBVAButton><BBVAButton type="button" variant="primary" onClick={()=>target&&onConfirm(target)} disabled={!target||busy}>{busy?'Reasignando...':`${actionLabel} después de reasignar`}</BBVAButton></div>
    </div>
  </div>,document.body);
};
