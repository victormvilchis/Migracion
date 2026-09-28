import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { ISLookupField } from '../../componentsBBVATalent/ISLookupField';
import type { IdentityDirectoryRecord } from '../types/identityDirectory';
import { useAdminRoleOptions, useAdminUser, useCreateAdminUser, useUpdateAdminUser } from '../hooks/useAdminUsers';
import type { AdminUserPayload } from '../types/adminUser';

const empty:AdminUserPayload={fullName:'',email:'',corporateUser:'',softtekCode:'',roleIds:[]};
const fieldClass='h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15';
const labelClass='mb-1.5 block text-[9px] font-semibold uppercase tracking-[.04em] text-slate-500';

export const AdminUserEditorPage:React.FC=()=>{
  const {id}=useParams(); const edit=Boolean(id); const navigate=useNavigate(); const query=useAdminUser(id); const roles=useAdminRoleOptions(); const create=useCreateAdminUser(); const update=useUpdateAdminUser();
  const [form,setForm]=useState<AdminUserPayload>(empty); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{if(query.data?.item){const u=query.data.item;setForm({fullName:u.fullName,email:u.email??'',corporateUser:u.corporateUser??'',softtekCode:u.softtekCode??'',roleIds:u.roles.map((r)=>r.id)});}},[query.data]);
  const hydrate=(record:IdentityDirectoryRecord)=>setForm((current)=>({...current,softtekCode:record.is||current.softtekCode,corporateUser:record.bbvaUser||record.corporateUser||current.corporateUser,email:record.softtekEmail||record.email||current.email,fullName:[record.firstName,record.lastName].filter(Boolean).join(' ')||current.fullName}));
  const save=async()=>{try{setError(null);if(edit)await update.mutateAsync({id:id!,payload:form});else await create.mutateAsync(form);navigate('/bbva/admin/users',{state:{message:'Usuario guardado.'}});}catch(e){setError((e as Error).message);}}; const busy=create.isPending||update.isPending;
  return <div className="w-full space-y-3 animate-fade-in">
    <button type="button" onClick={()=>navigate('/bbva/admin/users')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700"><ArrowLeft className="h-3.5 w-3.5"/>Regresar</button>
    {error?<BBVAAlert tone="error">{error}</BBVAAlert>:null}
    <section className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><div className="text-[9px] font-semibold uppercase tracking-[.06em] text-blue-600">Administración de usuarios</div><h1 className="mt-1 text-lg font-semibold text-slate-950">{edit?'Editar usuario':'Nuevo usuario'}</h1></div>
      <div className="grid gap-4 p-5 md:grid-cols-12">
        <label className="md:col-span-3"><span className={labelClass}>IS Softtek</span><ISLookupField value={form.softtekCode} onChange={(v)=>setForm((c)=>({...c,softtekCode:v}))} onResolved={hydrate} disabled={busy}/></label>
        <Field className="md:col-span-3" label="Usuario BBVA / XM" value={form.corporateUser} placeholder="Ej. XMK4244, XL..., T... o EC..." onChange={(v)=>setForm({...form,corporateUser:v.toUpperCase()})}/>
        <Field className="md:col-span-3" label="Nombre completo *" value={form.fullName} onChange={(v)=>setForm({...form,fullName:v})}/>
        <Field className="md:col-span-3" label="Correo" value={form.email} onChange={(v)=>setForm({...form,email:v})}/>
        <div className="md:col-span-12"><div className="mb-2 text-[9px] font-semibold uppercase tracking-[.04em] text-slate-500">Roles *</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{(roles.data?.items??[]).map((role)=>{const checked=form.roleIds.includes(role.id);return <label key={role.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked?'border-blue-300 bg-blue-50/50':'border-slate-200 bg-white'}`}><input type="checkbox" checked={checked} onChange={()=>setForm((current)=>({...current,roleIds:checked?current.roleIds.filter((x)=>x!==role.id):[...current.roleIds,role.id]}))} className="mt-0.5"/><span><span className="block text-[10.5px] font-semibold text-slate-900">{role.name}</span><span className="mt-0.5 block text-[9px] text-slate-500">{role.description||role.code}</span></span></label>;})}</div></div>
      </div><div className="flex justify-end border-t border-slate-100 px-5 py-4"><button type="button" disabled={busy} onClick={()=>void save()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?'Guardando...':'Guardar'}</button></div>
    </section>
  </div>;
};
function Field({label,value,onChange,placeholder,className}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;className?:string}){return <label className={className}><span className={labelClass}>{label}</span><input value={value} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} className={fieldClass}/></label>;}
