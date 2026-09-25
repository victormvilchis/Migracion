export const TALENT_STAGES = [
  'PROSPECT',
  'ACADEMY',
  'TRAINING',
  'EVALUATION',
  'AVAILABLE',
  'UNASSIGNED',
  'CONVERTED',
] as const;

export type TalentStage = (typeof TALENT_STAGES)[number];

export const TALENT_STAGE_LABELS: Record<TalentStage, string> = {
  PROSPECT: 'Prospecto',
  ACADEMY: 'Academia',
  TRAINING: 'Capacitación',
  EVALUATION: 'Evaluación',
  AVAILABLE: 'Disponible',
  UNASSIGNED: 'Desasignado',
  CONVERTED: 'Convertido',
};

export interface Talent {
  id: string;
  fullName: string;
  email: string | null;
  profile: string | null;
  technologyProfile: string | null;
  targetTechnology: string | null;
  stage: TalentStage;
  active: boolean;
  entryDate: string;
  notes: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface TalentPayload {
  fullName: string;
  email: string;
  profile: string;
  technologyProfile: string;
  targetTechnology: string;
  stage: TalentStage;
  active: boolean;
  entryDate: string;
  notes: string;
}
