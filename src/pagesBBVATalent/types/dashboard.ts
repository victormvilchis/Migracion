export interface DashboardFilters {
  technologyId: string;
  profileId: string;
  certificationStatus: string;
  deliveryManager: string;
  talentType: string;
  fromDate: string;
  toDate: string;
  search: string;
}

export interface DashboardResponse {
  cards: {
    collaboratorsActive: number;
    talentBankActive: number;
    certificationsApplicable: number;
    coveragePercent: number;
    expiring: number;
    expired: number;
    recertificationPending: number;
    pending: number;
    deliveryManagersRepresented: number;
    dataQualityPending: number;
  };
  collaboratorFocus: Array<{ label: string; value: number }>;
  certificationCoverage: Array<{ label: string; value: number }>;
  expirationByMonth: Array<{ month: string; label: string; value: number }>;
  technologyDistribution: Array<{ technologyId: string | null; label: string; value: number }>;
  deliveryManagerDistribution: Array<{ label: string; value: number }>;
  talentComposition: Array<{ label: string; value: number }>;
  attention: Array<{
    collaboratorId: string;
    fullName: string;
    technology: string;
    profile: string;
    deliveryManager: string;
    valid: number;
    expiring: number;
    expired: number;
    pending: number;
    recertificationPending: number;
  }>;
  filters: {
    technologies: Array<{ id: string; name: string }>;
    profiles: Array<{ id: string; name: string }>;
    deliveryManagers: string[];
  };
}
