import React from 'react';

export const BBVAMetricsSkeleton: React.FC<{ cards?: number }> = ({ cards = 6 }) => (
  <div className="space-y-3" aria-label="Cargando métricas" aria-busy="true">
    <div className="grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] gap-2">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="min-h-[132px] animate-pulse rounded-2xl border border-slate-200 bg-white p-3 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
          <div className="h-9 w-9 rounded-xl bg-slate-100 [.bbva-dark_&]:bg-slate-800" />
          <div className="mt-3 h-2.5 w-2/3 rounded bg-slate-100 [.bbva-dark_&]:bg-slate-800" />
          <div className="mt-3 h-6 w-1/2 rounded bg-slate-100 [.bbva-dark_&]:bg-slate-800" />
          <div className="mt-3 h-2.5 w-3/4 rounded bg-slate-100 [.bbva-dark_&]:bg-slate-800" />
        </div>
      ))}
    </div>
    <div className="grid gap-3 xl:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
          <div className="h-3 w-40 rounded bg-slate-100 [.bbva-dark_&]:bg-slate-800" />
          <div className="mt-6 h-36 rounded-xl bg-slate-50 [.bbva-dark_&]:bg-slate-800/70" />
        </div>
      ))}
    </div>
  </div>
);
