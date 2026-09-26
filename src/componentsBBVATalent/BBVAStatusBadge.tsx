import React from 'react';

export type CertificationStatus = 'OK' | 'EXPIRING' | 'EXPIRED' | 'NA';

export const certificationStatusLabel: Record<CertificationStatus, string> = {
  OK: 'En regla',
  EXPIRING: 'Próxima a vencer',
  EXPIRED: 'Vencida',
  NA: 'No aplica',
};

const styles: Record<CertificationStatus, string> = {
  OK: 'bg-emerald-50 text-emerald-700 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300',
  EXPIRING: 'bg-amber-50 text-amber-700 [.bbva-dark_&]:bg-amber-500/10 [.bbva-dark_&]:text-amber-300',
  EXPIRED: 'bg-rose-50 text-rose-700 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-300',
  NA: 'bg-slate-100 text-slate-600 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300',
};

export const BBVAStatusBadge: React.FC<{ status: CertificationStatus }> = ({ status }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${styles[status]}`}>{certificationStatusLabel[status]}</span>
);
