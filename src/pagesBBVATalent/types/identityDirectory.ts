export interface IdentityDirectoryRecord {
  is: string;
  source: string;
  bbvaUser?: string | null;
  softtekEmail?: string | null;
  bbvaEmail?: string | null;
  corporateUser?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profile?: string | null;
  technologyProfile?: string | null;
  currentTechnology?: string | null;
  expertise?: string | null;
  softtekHireDate?: string | null;
  hireDate?: string | null;
  attributes?: Record<string, unknown>;
}

export interface IdentityDirectoryLookupResponse {
  item: IdentityDirectoryRecord;
  storage: 'identity-directory';
}
