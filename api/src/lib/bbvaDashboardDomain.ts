export interface DashboardFilters {
  technologyId?: string | null;
  profileId?: string | null;
  technologyProfile?: string | null;
  certificationId?: string | null;
  bbvaStructureLevel2?: string | null;
  bbvaStructureLevel3?: string | null;
  quarterCode?: string | null;
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
  certificationAverage: number | null;
  certificationScoreBase: number;
}

export type DashboardHistoricalMetricKey =
  | 'collaboratorsActive'
  | 'talentBankActive'
  | 'certificationsApplicable'
  | 'coveragePercent'
  | 'expiring'
  | 'expired'
  | 'recertificationPending'
  | 'pending'
  | 'dataQualityPending'
  | 'vendorReadyPercent'
  | 'vendorPending'
  | 'vendorExitRequired';

export type DashboardMetricSnapshotPoint = Pick<DashboardMetricCards, DashboardHistoricalMetricKey> & {
  snapshotDate: string;
  capturedAt: string;
};

export interface DashboardMetricComparison {
  metric: DashboardHistoricalMetricKey;
  current: number;
  previous: number;
  delta: number;
  unit: 'COUNT' | 'PERCENTAGE_POINTS';
  previousSnapshotDate: string;
}

export interface DashboardHistory {
  available: boolean;
  previousSnapshotDate: string | null;
  comparisonDays: number;
  comparisonTargetDate: string;
  historyDays: number;
  points: DashboardMetricSnapshotPoint[];
  comparisons: Partial<Record<DashboardHistoricalMetricKey, DashboardMetricComparison>>;
}

export type DashboardActivityCategory = 'COLLABORATOR' | 'TALENT' | 'CERTIFICATION';

export interface DashboardActivityItem {
  id: string;
  category: DashboardActivityCategory;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  actorEmail: string;
  collaboratorId: string | null;
  talentId: string | null;
  certificationRecordId: string | null;
  certificationName: string | null;
}

export type DashboardRecommendationPriority = 'CRITICAL' | 'ATTENTION' | 'PREVENTIVE' | 'INFO';
export type DashboardRecommendationTarget = 'TRACKING' | 'METRICS' | 'COLLABORATORS' | 'TALENT_BANK' | 'REPORTS';

export interface DashboardRecommendation {
  id: string;
  priority: DashboardRecommendationPriority;
  eyebrow: string;
  title: string;
  description: string;
  target: DashboardRecommendationTarget;
  certificationStatus: string | null;
  technology?: string | null;
  actionLabel: string;
}

export interface DashboardSlice { label: string; value: number; }
export interface DashboardMonthlyPoint { month: string; label: string; value: number; }
export interface DashboardTechnologyPoint { technologyId: string | null; label: string; value: number; }

export interface DashboardCertificationScoreSummary {
  certificationId: string;
  certificationName: string;
  average: number;
  peopleCount: number;
}

export interface DashboardCertificationScoreDetail {
  collaboratorId: string;
  personId: string;
  fullName: string;
  certificationId: string;
  certificationName: string;
  result: string | null;
  score10: number;
  applicationDate: string | null;
  attemptNumber: number | null;
}

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
  critical: number;
  bbvaStructureLevel2: string | null;
  bbvaStructureLevel3: string | null;
}

export interface DashboardQuarterExpiration {
  collaboratorId: string;
  personId: string;
  fullName: string;
  certificationId: string;
  certificationName: string;
  expirationDate: string;
  status: string;
}

export interface VendorQuarterSummary {
  calendarName: string;
  currentCode: string | null;
  selectedCode: string | null;
  targetCode: string | null;
  targetStartDate: string | null;
  targetEndDate: string | null;
  daysToTargetStart: number | null;
  daysToTargetEnd: number | null;
  daysToSelectedStart: number | null;
  daysToSelectedEnd: number | null;
  progressPercent: number | null;
  referenceDate: string;
  readyCollaborators: number;
  pendingCollaborators: number;
  exhaustedAttemptCollaborators: number;
  readinessPercent: number;
  years: number[];
  quarters: Array<{ code: string; year: number; quarter: 1 | 2 | 3 | 4; startDate: string; endDate: string }>;
}


export interface BbvaDashboardResponse {
  cards: DashboardMetricCards;
  vendorQuarter: VendorQuarterSummary;
  quarterExpirations: DashboardQuarterExpiration[];
  history: DashboardHistory;
  activity: DashboardActivityItem[];
  recommendations: DashboardRecommendation[];
  collaboratorFocus: DashboardSlice[];
  certificationCoverage: DashboardSlice[];
  expirationByMonth: DashboardMonthlyPoint[];
  technologyDistribution: DashboardTechnologyPoint[];
  deliveryManagerDistribution: DashboardSlice[];
  talentComposition: DashboardSlice[];
  attention: DashboardAttentionRow[];
  certificationScores: DashboardCertificationScoreSummary[];
  certificationScoreDetails: DashboardCertificationScoreDetail[];
  filters: {
    technologies: Array<{ id: string; name: string }>;
    profiles: Array<{ id: string; name: string }>;
    certifications: Array<{ id: string; name: string }>;
    technologyProfiles: string[];
    bbvaStructures: string[];
    bbvaStructuresLevel2: string[];
    bbvaStructuresLevel3: string[];
    deliveryManagers: string[];
  };
}
