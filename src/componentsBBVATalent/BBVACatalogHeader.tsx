import React from 'react';

interface BBVACatalogHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const BBVACatalogHeader: React.FC<BBVACatalogHeaderProps> = ({ title, description, action }) => (
  <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-blue-600 [.bbva-dark_&]:text-cyan-300">ADMINISTRACIÓN · CATÁLOGOS</div>
        <h1 className="mt-0.5 text-[17px] font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">{title}</h1>
        {description ? <p className="mt-0.5 text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  </section>
);
