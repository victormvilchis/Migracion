export type CollaboratorStatus = 'ACTIVE' | 'INACTIVE';

export interface CollaboratorPayload {
  softtekCode: string;
  corporateUser: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  profileCatalogId: string;
  technologyProfile: string;
  technologyProfileCatalogId: string;
  currentTechnology: string;
  currentTechnologyCatalogId: string;
  expertise: string;
  startDate: string;
  endDate: string;
  hireDate: string;
  notes: string;
}

export interface Collaborator {
  id: string;
  personId: string;
  softtekCode: string | null;
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
  status: CollaboratorStatus;
  startDate: string | null;
  endDate: string | null;
  hireDate: string | null;
  notes: string | null;
  hasCv: boolean;
  createdAt: string;
  updatedAt: string;
}
