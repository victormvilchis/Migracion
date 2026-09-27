export type CollaboratorStatus = 'ACTIVE' | 'INACTIVE';

export interface CollaboratorInput {
  softtekCode: string | null;
  corporateUser: string | null;
  email: string;
  firstName: string;
  lastName: string;
  profile: string | null;
  profileCatalogId: string | null;
  technologyProfile: string | null;
  technologyProfileCatalogId: string | null;
  currentTechnology: string | null;
  currentTechnologyCatalogId: string | null;
  expertise: string | null;
  startDate: string | null;
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
  profileCatalogId: string | null;
  technologyProfile: string | null;
  technologyProfileCatalogId: string | null;
  currentTechnology: string | null;
  currentTechnologyCatalogId: string | null;
  expertise: string | null;
  status: CollaboratorStatus;
  startDate: string | null;
  hireDate: string | null;
  notes: string | null;
  hasCv: boolean;
  certificationApplicable: number;
  certificationValid: number;
  certificationExpiring: number;
  certificationExpired: number;
  certificationPending: number;
  certificationRecertificationPending: number;
  createdAt: string;
  updatedAt: string;
}
