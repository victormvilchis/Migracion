import React, { useMemo, useState } from 'react';
import {
  Bot,
  BrainCircuit,
  ChevronRight,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { findBbvaGroupByPath, findBbvaNavigationMatch } from './bbvaNavigation';

const suggestionLabels = [
  'Resume lo más importante de esta vista',
  'Detecta riesgos o pendientes',
  'Ayúdame a interpretar los datos',
  '¿Qué debería revisar después?',
];

export const BBVAAssistant: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const contextLabel = useMemo(() => {
    const match = findBbvaNavigationMatch(location.pathname);
    if (match) return match.module.label;
    return findBbvaGroupByPath(location.pathname)?.label ?? 'BBVA Workspace';
  }, [location.pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[950] inline-flex min-h-11 items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-[0_14px_36px_-16px_rgba(37,99,235,0.45)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/25 [.bbva-dark_&]:border-cyan-400/20 [.bbva-dark_&]:bg-[#0b1728] [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:shadow-[0_16px_42px_-18px_rgba(34,211,238,0.42)] [.bbva-dark_&]:hover:border-cyan-300/35 [.bbva-dark_&]:hover:bg-[#101f33]"
        aria-label="Abrir asistente de IA"
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white [.bbva-dark_&]:bg-cyan-300 [.bbva-dark_&]:text-slate-950">
          <Bot className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-400 [.bbva-dark_&]:border-[#0b1728]" />
        </span>
        <span>Inteligencia BBVA</span>
        <Sparkles className="h-3.5 w-3.5 text-blue-500 [.bbva-dark_&]:text-cyan-300" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[1200]">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] [.bbva-dark_&]:bg-black/55"
            aria-label="Cerrar asistente"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute bottom-0 right-0 top-16 flex w-full max-w-[430px] flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-[#07111f] [.bbva-dark_&]:text-slate-100">
            <header className="border-b border-slate-200 px-4 py-4 [.bbva-dark_&]:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 [.bbva-dark_&]:border-cyan-400/20 [.bbva-dark_&]:bg-cyan-400/10 [.bbva-dark_&]:text-cyan-300">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-bold">Inteligencia BBVA</h2>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700 [.bbva-dark_&]:border-violet-400/20 [.bbva-dark_&]:bg-violet-400/10 [.bbva-dark_&]:text-violet-200">
                        Vista previa
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 [.bbva-dark_&]:text-slate-400">
                      Contexto actual: {contextLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 [.bbva-dark_&]:hover:bg-white/10 [.bbva-dark_&]:hover:text-white"
                  aria-label="Cerrar asistente"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 [.bbva-dark_&]:border-cyan-400/15 [.bbva-dark_&]:from-[#0d1c2d] [.bbva-dark_&]:via-[#0a1625] [.bbva-dark_&]:to-[#14132a]">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600 [.bbva-dark_&]:text-cyan-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Asistente contextual
                </div>
                <h3 className="mt-3 text-lg font-bold leading-tight text-slate-950 [.bbva-dark_&]:text-white">
                  ¿En qué te ayudo dentro de {contextLabel}?
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 [.bbva-dark_&]:text-slate-300">
                  La interfaz ya está preparada para consultar datos, explicar resultados, detectar pendientes y asistir flujos del espacio de trabajo. La conexión al servicio de IA se habilitará en una siguiente entrega.
                </p>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Sugerencias
                </div>
                <div className="space-y-2">
                  {suggestionLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setDraft(label)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/70 hover:text-slate-950 [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-white/[0.025] [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:border-cyan-300/20 [.bbva-dark_&]:hover:bg-cyan-300/[0.06] [.bbva-dark_&]:hover:text-white"
                    >
                      <span>{label}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <footer className="border-t border-slate-200 bg-white p-4 [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-[#07111f]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xs focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/10 [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-[#0b1728] [.bbva-dark_&]:focus-within:border-cyan-300/30 [.bbva-dark_&]:focus-within:ring-cyan-300/10">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  placeholder="Pregunta sobre esta vista, un colaborador, una certificación..."
                  className="w-full resize-none border-0 bg-transparent px-2 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:placeholder:text-slate-500"
                />
                <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-2">
                  <span className="text-[10px] text-slate-400 [.bbva-dark_&]:text-slate-500">Interfaz lista · integración IA pendiente</span>
                  <button
                    type="button"
                    disabled={!draft.trim()}
                    title="La conexión de IA se habilitará posteriormente"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 [.bbva-dark_&]:bg-cyan-300 [.bbva-dark_&]:text-slate-950 [.bbva-dark_&]:hover:bg-cyan-200"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </button>
                </div>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
};
