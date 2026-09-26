export type CollaboratorStatus = 'ACTIVE' | 'INACTIVE';

export interface CollaboratorInput {
  softtekCode: string | null;
  corporateUser: string | null;
  email: string;
  firstName: string;
  lastName: string;
  profile: string | null;
  technologyProfile: string | null;
  currentTechnology: string | null;
  expertise: string | null;
  startDate: string | null;
  endDate: string | null;
  hireDate: string | null;
  notes: string | null;
}

export interface CollaboratorRecord {
  id: string;
  personId: string;
  softtekCode: string | null;
  corporateUser: string | null;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  profile: string | null;
  technologyProfile: string | null;
  currentTechnology: string | null;
  expertise: string | null;
  status: CollaboratorStatus;
  startDate: string | null;
  endDate: string | null;
  hireDate: string | null;
  notes: string | null;
  hasCv: boolean;
  createdAt: string;
  updatedAt: string;
}
