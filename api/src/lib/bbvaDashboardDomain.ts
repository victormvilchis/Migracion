export interface DashboardFilters {
  technologyId?: string | null;
  profileId?: string | null;
  certificationStatus?: string | null;
  deliveryManager?: string | null;
  talentType?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  search?: string | null;
}

export interface DashboardMetricCards {
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
  vendorReadyPercent: number;
  vendorPending: number;
  vendorExitRequired: number;
}

export interface DashboardSlice { label: string; value: number; }
export interface DashboardMonthlyPoint { month: string; label: string; value: number; }
export interface DashboardTechnologyPoint { technologyId: string | null; label: string; value: number; }

export interface DashboardAttentionRow {
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
}

export interface VendorQuarterSummary {
  calendarName: string;
  currentCode: string | null;
  targetCode: string | null;
  targetStartDate: string | null;
  targetEndDate: string | null;
  daysToTargetStart: number | null;
  readyCollaborators: number;
  pendingCollaborators: number;
  exhaustedAttemptCollaborators: number;
  readinessPercent: number;
}

export interface BbvaDashboardResponse {
  cards: DashboardMetricCards;
  vendorQuarter: VendorQuarterSummary;
  collaboratorFocus: DashboardSlice[];
  certificationCoverage: DashboardSlice[];
  expirationByMonth: DashboardMonthlyPoint[];
  technologyDistribution: DashboardTechnologyPoint[];
  deliveryManagerDistribution: DashboardSlice[];
  talentComposition: DashboardSlice[];
  attention: DashboardAttentionRow[];
  filters: {
    technologies: Array<{ id: string; name: string }>;
    profiles: Array<{ id: string; name: string }>;
    deliveryManagers: string[];
  };
}
