import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronDown, ChevronUp, Plus, RefreshCw, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { operationalQuarterApi, type OperationalQuarterDraft, type OperationalQuarterItem } from '../api/operationalQuarterApi';

const dateLabel=(value:string)=>{const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});};
const draftOf=(item:OperationalQuarterItem):OperationalQuarterDraft=>({sourceStartDate:item.sourceStartDate,sourceEndDate:item.sourceEndDate});
const validIso=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const derivedPreview=(sourceStartDate:string,sourceEndDate:string)=>{
  if(!validIso(sourceStartDate)||!validIso(sourceEndDate))return null;
  const start=new Date(`${sourceStartDate.slice(0,7)}-01T00:00:00Z`);
  if(!sourceStartDate.endsWith('-01'))start.setUTCMonth(start.getUTCMonth()+1);
  const end=new Date(`${sourceEndDate.slice(0,7)}-01T00:00:00Z`);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
  return {startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)};
};

export const OperationalQuarterCatalogPage:React.FC=()=>{
  const client=useQueryClient();
  const query=useQuery({queryKey:['bbva-operational-quarters'],queryFn:operationalQuarterApi.list});
  const [drafts,setDrafts]=useState<Record<string,OperationalQuarterDraft>>({});
  const [expandedYears,setExpandedYears]=useState<Set<number>>(new Set());
  const [newYear,setNewYear]=useState<number>(new Date().getFullYear()+1);
  const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);
  useEffect(()=>{if(!query.data?.items)return;setDrafts(Object.fromEntries(query.data.items.map((item)=>[item.code,draftOf(item)])));const years=[...new Set(query.data.items.map((item)=>item.year))];setExpandedYears((current)=>current.size?current:new Set(years));const max=Math.max(...years,new Date().getFullYear());setNewYear(max+1);},[query.data?.items]);
  const refreshAll=async()=>{await client.invalidateQueries({queryKey:['bbva-operational-quarters']});await client.invalidateQueries({queryKey:['bbva-dashboard']});await client.invalidateQueries({queryKey:['certification-tracking']});};
  const update=useMutation({mutationFn:({code,draft}:{code:string;draft:OperationalQuarterDraft})=>operationalQuarterApi.update(code,draft),onSuccess:async()=>{await refreshAll();setMessage('Periodo actualizado. El calendario operativo se recalculó automáticamente desde las fechas Vendors.');}});
  const createYear=useMutation({mutationFn:(year:number)=>operationalQuarterApi.createYear(year),onSuccess:async(result)=>{await refreshAll();setExpandedYears((current)=>new Set([...current,result.year]));setNewYear(result.year+1);setMessage(`Año ${result.year} agregado. Ajusta y confirma las fechas reales de Vendors cuando estén disponibles.`);}});
  const busy=update.isPending||createYear.isPending;const items=useMemo(()=>query.data?.items??[],[query.data?.items]);
  const byYear=useMemo(()=>{const map=new Map<number,OperationalQuarterItem[]>();for(const item of items){const bucket=map.get(item.year)??[];bucket.push(item);map.set(item.year,bucket);}for(const bucket of map.values())bucket.sort((a,b)=>a.quarter-b.quarter);return [...map.entries()].sort((a,b)=>b[0]-a[0]);},[items]);
  const save=async(item:OperationalQuarterItem)=>{const draft=drafts[item.code];if(!draft)return;try{setError(null);setMessage(null);await update.mutateAsync({code:item.code,draft});}catch(e){setError((e as Error).message);}};
  const addYear=async()=>{try{setError(null);setMessage(null);await createYear.mutateAsync(newYear);}catch(e){setError((e as Error).message);}};
  const toggleYear=(year:number)=>setExpandedYears((current)=>{const next=new Set(current);if(next.has(year))next.delete(year);else next.add(year);return next;});
  return <div className="space-y-3 animate-fade-in">
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[9px] font-semibold uppercase tracking-[.08em] text-blue-600">Configuración de periodos</div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg font-semibold text-slate-950">PERIODOS OPERATIVOS (Q)</h1><p className="mt-1 max-w-4xl text-[10.5px] text-slate-500">Las fechas Vendors son la fuente de verdad. El sistema extiende automáticamente el Q hasta el último día de su mes de cierre y el siguiente Q comienza el día 1 del mes siguiente.</p></div><div className="flex flex-wrap items-center gap-2"><input type="number" min={2020} max={2100} value={newYear} onChange={(event)=>setNewYear(Number(event.target.value))} className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-[10.5px] font-semibold outline-none focus:border-blue-500" aria-label="Año a agregar"/><BBVAButton variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5"/>} disabled={busy} onClick={()=>void addYear()}>Agregar año</BBVAButton><BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching?'animate-spin':''}`}/>} onClick={()=>void query.refetch()}>Actualizar</BBVAButton></div></div>
    </section>
    {message?<BBVAAlert tone="success" onClose={()=>setMessage(null)}>{message}</BBVAAlert>:null}{error?<BBVAAlert tone="error" onClose={()=>setError(null)}>{error}</BBVAAlert>:null}{query.error?<BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>:null}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold text-slate-950">Calendario BBVA</h2></div><p className="mt-1 text-[9.5px] text-slate-500">Ejemplo: si Q3 termina el 23 de septiembre, septiembre completo sigue siendo Q3; Q4 inicia operativamente el 1 de octubre. Esta regla gobierna Seguimiento, Métricas, Panel y readiness.</p></div>
      {query.isLoading?<div className="p-8 text-center text-xs text-slate-500">Cargando periodos...</div>:<div>{byYear.map(([year,yearItems])=>{const open=expandedYears.has(year);const current=yearItems.some((item)=>item.current);return <div key={year} className="border-b border-slate-100 last:border-b-0"><button type="button" onClick={()=>toggleYear(year)} className="flex w-full items-center justify-between bg-slate-50/70 px-4 py-2.5 text-left hover:bg-slate-50"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-900">{year}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8.5px] font-semibold text-slate-600">{yearItems.length} periodos</span>{current?<span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8.5px] font-semibold text-blue-700">Año actual</span>:null}</div>{open?<ChevronUp className="h-4 w-4 text-slate-500"/>:<ChevronDown className="h-4 w-4 text-slate-500"/>}</button>{open?<div className="divide-y divide-slate-100">{yearItems.map((item)=>{const draft=drafts[item.code]??draftOf(item);const changed=draft.sourceStartDate!==item.sourceStartDate||draft.sourceEndDate!==item.sourceEndDate;const preview=derivedPreview(draft.sourceStartDate,draft.sourceEndDate);return <div key={item.code} className="grid gap-3 p-4 2xl:grid-cols-[160px_minmax(420px,1fr)_minmax(320px,.8fr)_auto] 2xl:items-end">
        <div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-950">Periodo {item.quarter}</span>{item.current?<span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8.5px] font-semibold text-blue-700">Actual</span>:null}{!item.sourceConfigured?<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8.5px] font-semibold text-amber-700">Vendors por confirmar</span>:null}{!item.synchronized?<span className="rounded-full bg-rose-50 px-2 py-0.5 text-[8.5px] font-semibold text-rose-700">Sincronización pendiente</span>:null}</div><div className="mt-1 text-[9px] text-slate-400">{item.code}</div></div>
        <div><div className="mb-1 text-[8.5px] font-semibold uppercase tracking-[.05em] text-slate-500">Ventana Vendors · editable</div><div className="grid gap-2 sm:grid-cols-2"><BBVADatePicker value={draft.sourceStartDate} onChange={(value)=>setDrafts((currentDrafts)=>({...currentDrafts,[item.code]:{...draft,sourceStartDate:value}}))} disabled={busy} ariaLabel={`Inicio Vendors ${item.code}`}/><BBVADatePicker value={draft.sourceEndDate} onChange={(value)=>setDrafts((currentDrafts)=>({...currentDrafts,[item.code]:{...draft,sourceEndDate:value}}))} disabled={busy} ariaLabel={`Fin Vendors ${item.code}`}/></div><div className="mt-1 text-[9px] text-slate-400">Referencia guardada: {dateLabel(item.sourceStartDate)} → {dateLabel(item.sourceEndDate)}</div></div>
        <div><div className="mb-1 text-[8.5px] font-semibold uppercase tracking-[.05em] text-slate-500">Ventana operativa · automática</div><div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2"><div className="text-[10.5px] font-semibold text-blue-900">{preview?`${dateLabel(preview.startDate)} → ${dateLabel(preview.endDate)}`:`${dateLabel(item.operationalStartDate)} → ${dateLabel(item.operationalEndDate)}`}</div><div className="mt-0.5 text-[8.5px] text-blue-700">Se deriva de Vendors; no se edita manualmente.</div></div></div>
        <div className="flex justify-end"><BBVAButton variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5"/>} disabled={busy||!changed} onClick={()=>void save(item)}>Guardar</BBVAButton></div>
      </div>;})}</div>:null}</div>;})}</div>}
    </section>
  </div>;
};
