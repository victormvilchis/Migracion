import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { StructureOption } from '../pagesBBVATalent/types/structureCatalog';

interface Props {
  items: StructureOption[];
  level2?: string | null;
  level3?: string | null;
  onChange: (value: { level2: string; level3: string }) => void;
  ariaLabel?: string;
  className?: string;
}

export const BBVAStructureFilter: React.FC<Props> = ({ items, level2 = '', level3 = '', onChange, ariaLabel = 'Estructura BBVA', className }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 330, maxHeight: 350 });

  const groups = useMemo(() => {
    const parents = items.filter((item) => item.level === 2).sort((a,b)=>a.name.localeCompare(b.name,'es-MX',{sensitivity:'base'}));
    const children = items.filter((item) => item.level === 3);
    return parents.map((parent) => ({
      parent,
      children: children.filter((child) => child.parentName === parent.name).sort((a,b)=>a.name.localeCompare(b.name,'es-MX',{sensitivity:'base'})),
    }));
  }, [items]);

  const normalized = query.trim().toLocaleUpperCase('es-MX');
  const visibleGroups = useMemo(() => {
    if (!normalized) return groups;
    return groups.map((group) => {
      const parentMatches = group.parent.name.toLocaleUpperCase('es-MX').includes(normalized);
      const children = parentMatches ? group.children : group.children.filter((child) => child.name.toLocaleUpperCase('es-MX').includes(normalized));
      return { ...group, children, parentMatches };
    }).filter((group) => group.parentMatches || group.children.length);
  }, [groups, normalized]);

  const label = level3 && level2 ? `${level2} · ${level3}` : level2 || 'Todas las estructuras';

  const updatePosition = (measuredHeight?: number) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 8;
    const desiredHeight = 380;
    const estimatedHeight = Math.min(desiredHeight, 80 + Math.max(1, visibleGroups.length) * 54);
    const panelHeight = measuredHeight && measuredHeight > 0 ? measuredHeight : estimatedHeight;
    const below = window.innerHeight - rect.bottom - pad;
    const above = rect.top - pad;
    const opensUp = below < Math.min(panelHeight, 250) && above > below;
    const maxHeight = Math.max(210, Math.min(desiredHeight, (opensUp ? above : below) - 6));
    const visiblePanelHeight = Math.min(panelHeight, maxHeight);
    const width = Math.max(rect.width, 330);
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, window.innerWidth - width - pad));
    const top = opensUp ? Math.max(pad, rect.top - visiblePanelHeight - 6) : rect.bottom + 6;
    setPosition((current) => {
      const next = { left, top, width, maxHeight };
      return Math.abs(current.left-next.left)<0.5 && Math.abs(current.top-next.top)<0.5 && Math.abs(current.width-next.width)<0.5 && Math.abs(current.maxHeight-next.maxHeight)<0.5 ? current : next;
    });
  };

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const height = panelRef.current.getBoundingClientRect().height;
    if (height > 0) updatePosition(height);
  }, [open, visibleGroups.length]);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    updatePosition();
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const update = () => updatePosition();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);

  useEffect(() => {
    const pointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', pointer);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', pointer); document.removeEventListener('keydown', key); };
  }, []);

  const choose = (next: { level2: string; level3: string }) => { onChange(next); setOpen(false); };

  return <div className={cn('relative min-w-0', className)}>
    <button ref={buttonRef} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={()=>{if(open){setOpen(false);return;}updatePosition();setOpen(true);}} className={cn('flex h-9 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-[11px] text-slate-900 outline-none transition hover:border-blue-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500/25', open && 'border-blue-400 ring-2 ring-blue-500/15')}>
      <span className={cn('min-w-0 flex-1 truncate', !level2 && 'text-slate-500')}>{label}</span>
      {(level2 || level3) ? <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">1</span> : null}
      <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', open && 'rotate-180 text-blue-500')}/>
    </button>

    {open && createPortal(<div ref={panelRef} className="fixed z-[2200] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]" style={{left:position.left,top:position.top,width:position.width,maxHeight:position.maxHeight}}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/90 p-2">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input ref={searchRef} value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar nivel 2 o nivel 3" aria-label="Buscar estructura BBVA" className="h-8 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"/></div>
        {(level2 || level3) ? <button type="button" onClick={()=>choose({level2:'',level3:''})} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[9.5px] font-semibold text-blue-700 hover:bg-blue-50"><X className="h-3 w-3"/>Limpiar</button> : null}
      </div>
      <div className="overflow-y-auto py-1 [scrollbar-width:thin]" style={{maxHeight:Math.max(130,position.maxHeight-52)}} role="listbox">
        <button type="button" role="option" aria-selected={!level2&&!level3} onClick={()=>choose({level2:'',level3:''})} className={cn('flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-[10.5px] font-semibold',!level2&&!level3?'bg-blue-50 text-blue-800':'text-slate-700 hover:bg-slate-50')}><span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-md border',!level2&&!level3?'border-blue-500 bg-blue-500 text-white':'border-slate-200 bg-white')}>{!level2&&!level3?<Check className="h-3 w-3"/>:null}</span>Todas las estructuras</button>
        {visibleGroups.map(({parent,children})=><div key={parent.id} className="border-b border-slate-100 last:border-b-0">
          <button type="button" role="option" aria-selected={level2===parent.name&&!level3} onClick={()=>choose({level2:parent.name,level3:''})} className={cn('flex w-full items-center gap-2 px-3 py-2 text-left',level2===parent.name&&!level3?'bg-blue-50 text-blue-900':'text-slate-800 hover:bg-slate-50')}>
            <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-md border',level2===parent.name&&!level3?'border-blue-500 bg-blue-500 text-white':'border-slate-200 bg-white')}>{level2===parent.name&&!level3?<Check className="h-3 w-3"/>:null}</span>
            <span className="min-w-0 flex-1 truncate text-[10.5px] font-bold">{parent.name.toUpperCase()}</span><span className="text-[8px] font-semibold uppercase text-slate-400">Nivel 2</span>
          </button>
          {children.length ? <div className="ml-[22px] border-l border-slate-200">{children.map((child)=><button key={child.id} type="button" role="option" aria-selected={level3===child.name} onClick={()=>choose({level2:parent.name,level3:child.name})} className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left',level3===child.name?'bg-blue-50 font-semibold text-blue-800':'text-slate-600 hover:bg-slate-50')}><span className="text-slate-300">↳</span><span className="min-w-0 flex-1 truncate text-[10px]">{child.name.toUpperCase()}</span></button>)}</div> : null}
        </div>)}
        {!visibleGroups.length ? <div className="px-3 py-6 text-center text-[11px] text-slate-500">No se encontraron estructuras.</div> : null}
      </div>
    </div>, document.body)}
  </div>;
};
