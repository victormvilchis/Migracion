export const TALENT_TYPES = ['ACADEMY', 'PROSPECT', 'FORMER_COLLABORATOR', 'BBVA_EXIT'] as const;
export type TalentType = (typeof TALENT_TYPES)[number];

export const TALENT_TYPE_LABELS: Record<TalentType, string> = {
  ACADEMY: 'Academia',
  PROSPECT: 'Prospecto de colaborador',
  FORMER_COLLABORATOR: 'Excolaborador',
  BBVA_EXIT: 'Excolaborador',
};

export const TALENT_AFFILIATIONS = ['INTERNAL', 'EXTERNAL'] as const;
export type TalentAffiliation = (typeof TALENT_AFFILIATIONS)[number];
export const TALENT_AFFILIATION_LABELS: Record<TalentAffiliation, string> = { INTERNAL: 'Interno', EXTERNAL: 'Externo' };
export type TalentRecordStatus = 'ACTIVE' | 'DELETED';

export const TALENT_STAGES = [
  'REGISTERED',
  'ACADEMY',
  'TRAINING',
  'EVALUATION',
  'AVAILABLE',
  'UNASSIGNED',
  'CONVERTED',
] as const;

export type TalentStage = (typeof TALENT_STAGES)[number];

export const TALENT_STAGE_LABELS: Record<TalentStage, string> = {
  REGISTERED: 'Registrado',
  ACADEMY: 'Academia',
  TRAINING: 'Capacitación',
  EVALUATION: 'Evaluación',
  AVAILABLE: 'Disponible',
  UNASSIGNED: 'Desasignado',
  CONVERTED: 'Convertido',
};

export const EXPERTISE_LEVELS = ['TR', 'JR', 'STD', 'SR'] as const;

export interface TalentCvMetadata {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  updatedAt: string;
}

export interface Talent {
  id: string;
  personId: string;
  talentType: TalentType;
  affiliationType: TalentAffiliation;
  recordStatus: TalentRecordStatus;
  deletedAt: string | null;
  deletedByEmail: string | null;
  softtekCode: string | null;
  bbvaUser: string | null;
  softtekEmail: string;
  bbvaEmail: string | null;
  corporateUser: string | null;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  profile: string | null;
  profileCatalogId: string | null;
  technologyProfile: string | null;
  technologyProfileCatalogId: string | null;
  currentTechnology: string | null;
  currentTechnologyCatalogId: string | null;
  expertise: string | null;
  bbvaStructureLevel2: string | null;
  bbvaStructureLevel3: string | null;
  stage: TalentStage;
  active: boolean;
  bbvaStartDate: string | null;
  softtekHireDate: string | null;
  platformStartDate: string | null;
  hireDate: string | null;
  entryDate: string;
  daysInTalentBank: number;
  talentBankEntryCount: number;
  urgentAssignment: boolean;
  notes: string | null;
  lifecycleReasonCode: string | null;
  lifecycleReasonName: string | null;
  lifecycleEffectiveDate: string | null;
  lifecycleNotes: string | null;
  convertedAt: string | null;
  cv: TalentCvMetadata | null;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface TalentPayload {
  talentType: TalentType;
  affiliationType: TalentAffiliation;
  softtekCode: string;
  bbvaUser: string;
  softtekEmail: string;
  bbvaEmail: string;
  corporateUser?: string;
  email?: string;
  firstName: string;
  lastName: string;
  profile: string;
  profileCatalogId: string;
  technologyProfile: string;
  technologyProfileCatalogId: string;
  currentTechnology: string;
  currentTechnologyCatalogId: string;
  expertise: string;
  stage: TalentStage;
  active: boolean;
  bbvaStartDate: string;
  softtekHireDate: string;
  platformStartDate?: string;
  hireDate?: string;
  entryDate: string;
  notes: string;
  expectedUpdatedAt?: string;
}


export interface TalentConversionPayload {
  deliveryManager: string;
  profileCatalogId: string;
  technologyProfileCatalogId: string;
  currentTechnologyCatalogId: string;
  expertise: string;
  bbvaUser: string;
  expectedUpdatedAt: string;
}


export interface TalentCvPayload {
  fileName: string;
  contentType: string;
  base64: string;
}

export interface TalentCvDownload extends TalentCvMetadata {
  base64: string;
}
