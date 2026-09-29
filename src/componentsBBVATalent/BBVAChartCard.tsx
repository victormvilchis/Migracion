import React from 'react';
import { BBVACard } from './BBVACard';
import { BBVADataHelp, type BBVADataHelpContent } from './BBVADataHelp';

interface BBVAChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  help?: BBVADataHelpContent;
  children: React.ReactNode;
  className?: string;
}

export const BBVAChartCard: React.FC<BBVAChartCardProps> = ({ title, description, action, help, children, className = '' }) => (
  <BBVACard className={`rounded-2xl p-4 ${className}`.trim()}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">{title}</h2>
        {description ? <p className="mt-0.5 text-[9.5px] leading-4 text-slate-500 [.bbva-dark_&]:text-slate-400">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5"><BBVADataHelp label={title} content={help ?? { what: description || `Visualización operativa de ${title}.`, calculation: 'Agrupa datos reales del contexto activo para facilitar comparación y detectar concentraciones o cambios.', interpretation: 'Úsala para identificar patrones; abre los registros relacionados antes de tomar una acción operativa.', scope: 'La visualización responde a los filtros activos, al periodo y al universo seleccionado en el módulo.' }} />{action}</div>
    </div>
    {children}
  </BBVACard>
);
