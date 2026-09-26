export interface BbvaIdentityDirectoryRecord {
  is: string;
  source: string;
  corporateUser?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profile?: string | null;
  technologyProfile?: string | null;
  currentTechnology?: string | null;
  expertise?: string | null;
  hireDate?: string | null;
  attributes?: Record<string, unknown>;
}

export interface BbvaIdentityDirectoryProvider {
  readonly source: string;
  lookup(isValue: string): Promise<BbvaIdentityDirectoryRecord | null>;
}
