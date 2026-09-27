import React from 'react';
import { Info } from 'lucide-react';

export interface BBVADataHelpContent {
  what: string;
  calculation?: string;
  interpretation?: string;
}

interface BBVADataHelpProps {
  label: string;
  content: BBVADataHelpContent;
}

export const BBVADataHelp: React.FC<BBVADataHelpProps> = ({ label, content }) => (
  <details className="group/help relative">
    <summary
      className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 [&::-webkit-details-marker]:hidden [.bbva-dark_&]:text-slate-500 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-200"
      aria-label={`Más información sobre ${label}`}
      title={`Más información sobre ${label}`}
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </summary>
    <div className="absolute right-0 z-40 mt-2 w-[min(310px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900">
      <div className="text-[10px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{label}</div>
      <dl className="mt-2 space-y-2 text-[9.5px] leading-4">
        <div>
          <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Qué mide</dt>
          <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.what}</dd>
        </div>
        {content.calculation ? (
          <div>
            <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Cómo se calcula</dt>
            <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.calculation}</dd>
          </div>
        ) : null}
        {content.interpretation ? (
          <div>
            <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Cómo interpretarlo</dt>
            <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.interpretation}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  </details>
);
