import React from 'react';
import type { CollaboratorCertificationStatus } from '../pagesBBVATalent/types/collaboratorCertification';
import { COLLABORATOR_CERTIFICATION_STATUS_LABELS } from '../pagesBBVATalent/types/collaboratorCertification';
import { cn } from '../lib/utils';

const styles: Record<CollaboratorCertificationStatus, string> = {
  VALID: 'border-emerald-200 bg-emerald-50 text-emerald-700 [.bbva-dark_&]:border-emerald-400/20 [.bbva-dark_&]:bg-emerald-400/10 [.bbva-dark_&]:text-emerald-300',
  EXPIRING: 'border-amber-200 bg-amber-50 text-amber-700 [.bbva-dark_&]:border-amber-400/20 [.bbva-dark_&]:bg-amber-400/10 [.bbva-dark_&]:text-amber-300',
  EXPIRED: 'border-rose-200 bg-rose-50 text-rose-700 [.bbva-dark_&]:border-rose-400/20 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-300',
  RECERTIFICATION_PENDING: 'border-orange-200 bg-orange-50 text-orange-700 [.bbva-dark_&]:border-orange-400/20 [.bbva-dark_&]:bg-orange-400/10 [.bbva-dark_&]:text-orange-300',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-700 [.bbva-dark_&]:border-rose-400/20 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-300',
  PENDING: 'border-slate-200 bg-slate-100 text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300',
  SCHEDULED: 'border-blue-200 bg-blue-50 text-blue-700 [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-blue-300',
  APPLIED: 'border-indigo-200 bg-indigo-50 text-indigo-700 [.bbva-dark_&]:border-indigo-400/20 [.bbva-dark_&]:bg-indigo-400/10 [.bbva-dark_&]:text-indigo-300',
  NOT_APPLICABLE: 'border-slate-200 bg-slate-100 text-slate-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-400',
};

export const BBVACertificationStatusBadge: React.FC<{ status: CollaboratorCertificationStatus; className?: string }> = ({ status, className }) => (
  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold', styles[status], className)}>
    {COLLABORATOR_CERTIFICATION_STATUS_LABELS[status]}
  </span>
);
