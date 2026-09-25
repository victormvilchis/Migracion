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

export interface TalentRecord {
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

export interface TalentInput {
  fullName: string;
  email?: string | null;
  profile?: string | null;
  technologyProfile?: string | null;
  targetTechnology?: string | null;
  stage?: TalentStage;
  active?: boolean;
  entryDate?: string | null;
  notes?: string | null;
}
