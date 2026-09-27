export type CollaboratorStatus = 'ACTIVE' | 'INACTIVE';

export interface CollaboratorPayload {
  softtekCode: string;
  bbvaUser: string;
  softtekEmail: string;
  bbvaEmail: string;
  deliveryManager: string;
  firstName: string;
  lastName: string;
  profile: string;
  profileCatalogId: string;
  technologyProfile: string;
  technologyProfileCatalogId: string;
  currentTechnology: string;
  currentTechnologyCatalogId: string;
  expertise: string;
  bbvaStartDate: string;
  softtekHireDate: string;
  notes: string;
  expectedUpdatedAt?: string;
  /** Compatibilidad temporal con contratos anteriores. */
  corporateUser?: string;
  email?: string;
  startDate?: string;
  hireDate?: string;
}

export interface Collaborator {
  id: string;
  personId: string;
  softtekCode: string | null;
  bbvaUser: string | null;
  softtekEmail: string;
  bbvaEmail: string | null;
  deliveryManager: string;
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
  /** Alias de compatibilidad durante la migración de identidad. */
  corporateUser: string | null;
  email: string;
  startDate: string | null;
  hireDate: string | null;
}
