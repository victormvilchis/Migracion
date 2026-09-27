export type CollaboratorStatus = 'ACTIVE' | 'INACTIVE';

export interface CollaboratorInput {
  softtekCode: string | null;
  bbvaUser: string | null;
  softtekEmail: string;
  bbvaEmail: string | null;
  firstName: string;
  lastName: string;
  profile: string | null;
  profileCatalogId: string | null;
  technologyProfile: string | null;
  technologyProfileCatalogId: string | null;
  currentTechnology: string | null;
  currentTechnologyCatalogId: string | null;
  expertise: string | null;
  bbvaStartDate: string | null;
  softtekHireDate: string | null;
  notes: string | null;
  expectedUpdatedAt: string | null;
}

export interface CollaboratorRecord {
  id: string;
  personId: string;
  softtekCode: string | null;
  bbvaUser: string | null;
  softtekEmail: string;
  bbvaEmail: string | null;
  /** Alias temporal para compatibilidad con módulos anteriores. */
  corporateUser: string | null;
  /** Alias temporal para compatibilidad con módulos anteriores. */
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
  bbvaStartDate: string | null;
  softtekHireDate: string | null;
  /** Alias temporal para compatibilidad. */
  startDate: string | null;
  /** Alias temporal para compatibilidad. */
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
