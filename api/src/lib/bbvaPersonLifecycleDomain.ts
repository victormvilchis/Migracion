export type PersonLifecycleState = 'TALENT_BANK' | 'COLLABORATOR';
export type PersonLifecycleSource = 'LIFECYCLE' | 'COLLABORATOR' | 'TALENT_BANK';

export interface LifecycleReasonOption {
  code: string;
  name: string;
  defaultTalentStage: 'AVAILABLE' | 'UNASSIGNED';
  reasonGroup: 'AVAILABLE' | 'UNASSIGNED' | 'BBVA_EXIT' | 'OTHER';
  sortOrder: number;
}

export interface PersonLifecycleEvent {
  id: string;
  eventType: string;
  description: string;
  fromState: PersonLifecycleState | null;
  toState: PersonLifecycleState | null;
  reasonCode: string | null;
  reasonName: string | null;
  effectiveDate: string | null;
  notes: string | null;
  createdAt: string;
  createdByEmail: string;
  source: PersonLifecycleSource;
}

export interface MoveCollaboratorToTalentInput {
  reasonCode: string;
  effectiveDate: string;
  talentStage: 'AVAILABLE' | 'UNASSIGNED';
  affiliationType: 'INTERNAL' | 'EXTERNAL';
  notes: string | null;
}

export interface MoveCollaboratorToTalentResult {
  collaboratorId: string;
  talentBankEntryId: string;
  personId: string;
}
