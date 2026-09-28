import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { useAdminRole, useCreateAdminRole, useUpdateAdminRole } from '../hooks/useAdminUsers';
import { sentenceCaseData } from '../lib/bbvaDisplayFormat';
import type { AdminRolePayload } from '../types/adminUser';

const empty:AdminRolePayload={name:'',description:'',isDeliveryManager:false};

export const AdminRoleEditorPage:React.FC=()=>{
  const {id}=useParams(); const edit=Boolean(id); const navigate=useNavigate();
  const q=useAdminRole(id); const create=useCreateAdminRole(); const update=useUpdateAdminRole();
  const [form,setForm]=useState(empty); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{if(q.data?.item){const r=q.data.item;setForm({name:r.name,description:r.description??'',isDeliveryManager:r.isDeliveryManager});}},[q.data]);
  const busy=create.isPending||update.isPending;
  const save=async()=>{try{setError(null);const payload={...form,name:sentenceCaseData(form.name,''),description:form.description?sentenceCaseData(form.description,''):''};if(edit)await update.mutateAsync({id:id!,payload});else await create.mutateAsync(payload);navigate('/bbva/admin/roles');}catch(e){setError((e as Error).message);}};
  return <div className="w-full space-y-3"><button onClick={()=>navigate('/bbva/admin/roles')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold"><ArrowLeft className="h-3.5 w-3.5"/>Regresar</button>{error?<BBVAAlert tone="error">{error}</BBVAAlert>:null}<section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><div className="text-[9px] font-semibold uppercase tracking-[.06em] text-blue-600">Administración de roles</div><h1 className="mt-1 text-lg font-semibold">{edit?'Editar rol':'Nuevo rol'}</h1><p className="mt-1 text-[10px] text-slate-500">Los catálogos BBVA se administran por nombre y descripción; los identificadores técnicos son internos.</p></div><div className="grid gap-4 p-5 md:grid-cols-12"><label className="block md:col-span-12"><span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Nombre *</span><input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="h-9 w-full rounded-xl border border-slate-300 px-3 text-[11px] text-slate-900"/></label><label className="block md:col-span-12"><span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Descripción</span><textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[11px] text-slate-900"/></label><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-[10.5px] font-medium text-slate-700 md:col-span-12"><input type="checkbox" checked={form.isDeliveryManager} onChange={(e)=>setForm({...form,isDeliveryManager:e.target.checked})}/>Disponible para asignación como Delivery Manager</label></div><div className="flex justify-end border-t border-slate-100 px-5 py-4"><button disabled={busy} onClick={()=>void save()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4"/>{busy?'Guardando...':'Guardar'}</button></div></section></div>;
};
