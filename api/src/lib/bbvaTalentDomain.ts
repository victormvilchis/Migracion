export const TALENT_TYPES = ['ACADEMY', 'PROSPECT', 'FORMER_COLLABORATOR', 'BBVA_EXIT'] as const;
export type TalentType = (typeof TALENT_TYPES)[number];

export const TALENT_AFFILIATIONS = ['INTERNAL', 'EXTERNAL'] as const;
export type TalentAffiliation = (typeof TALENT_AFFILIATIONS)[number];
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

export interface TalentCvMetadata {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  updatedAt: string;
}

export interface TalentRecord {
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
  stage: TalentStage;
  active: boolean;
  bbvaStartDate: string | null;
  softtekHireDate: string | null;
  platformStartDate: string | null;
  hireDate: string | null;
  entryDate: string;
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

export interface TalentInput {
  talentType: TalentType;
  affiliationType: TalentAffiliation;
  softtekCode?: string | null;
  bbvaUser?: string | null;
  softtekEmail: string;
  bbvaEmail?: string | null;
  firstName: string;
  lastName?: string | null;
  profile?: string | null;
  profileCatalogId?: string | null;
  technologyProfile?: string | null;
  technologyProfileCatalogId?: string | null;
  currentTechnology?: string | null;
  currentTechnologyCatalogId?: string | null;
  expertise?: string | null;
  stage: TalentStage;
  active: boolean;
  bbvaStartDate?: string | null;
  softtekHireDate?: string | null;
  entryDate: string;
  notes?: string | null;
  expectedUpdatedAt?: string | null;
}

export interface TalentHistoryRecord {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  createdByEmail: string;
}

export interface TalentCvRecord extends TalentCvMetadata {
  base64: string;
}

export interface TalentCvInput {
  fileName: string;
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  content: Buffer;
}
