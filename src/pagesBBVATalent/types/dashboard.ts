export interface DashboardFilters {
  technologyId: string;
  profileId: string;
  technologyProfile: string;
  certificationId: string;
  bbvaStructureLevel2: string;
  certificationStatus: string;
  deliveryManager: string;
  talentType: string;
  fromDate: string;
  toDate: string;
  search: string;
  historyDays?: string;
  comparisonDays?: string;
  activityDays?: string;
  activityLimit?: string;
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

export interface DashboardMetricComparison {
  metric: DashboardHistoricalMetricKey;
  current: number;
  previous: number;
  delta: number;
  unit: 'COUNT' | 'PERCENTAGE_POINTS';
  previousSnapshotDate: string;
}

export interface DashboardMetricSnapshotPoint {
  snapshotDate: string;
  collaboratorsActive: number;
  talentBankActive: number;
  certificationsApplicable: number;
  coveragePercent: number;
  expiring: number;
  expired: number;
  recertificationPending: number;
  pending: number;
  dataQualityPending: number;
  vendorReadyPercent: number;
  vendorPending: number;
  vendorExitRequired: number;
  capturedAt: string;
}

export interface DashboardRecommendation {
  id: string;
  priority: 'CRITICAL' | 'ATTENTION' | 'PREVENTIVE' | 'INFO';
  eyebrow: string;
  title: string;
  description: string;
  target: 'TRACKING' | 'METRICS' | 'COLLABORATORS' | 'TALENT_BANK' | 'REPORTS';
  certificationStatus: string | null;
  actionLabel: string;
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
    vendorReadyPercent: number;
    vendorPending: number;
    vendorExitRequired: number;
    certificationAverage: number | null;
    certificationScoreBase: number;
  };
  vendorQuarter: {
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
  };
  history: {
    available: boolean;
    previousSnapshotDate: string | null;
    comparisonDays: number;
    comparisonTargetDate: string;
    historyDays: number;
    points: DashboardMetricSnapshotPoint[];
    comparisons: Partial<Record<DashboardHistoricalMetricKey, DashboardMetricComparison>>;
  };
  activity: Array<{
    id: string;
    category: 'COLLABORATOR' | 'TALENT' | 'CERTIFICATION';
    eventType: string;
    title: string;
    description: string;
    occurredAt: string;
    actorEmail: string;
    collaboratorId: string | null;
    talentId: string | null;
    certificationRecordId: string | null;
    certificationName: string | null;
  }>;
  recommendations: DashboardRecommendation[];
  collaboratorFocus: Array<{ label: string; value: number }>;
  certificationCoverage: Array<{ label: string; value: number }>;
  expirationByMonth: Array<{ month: string; label: string; value: number }>;
  technologyDistribution: Array<{ technologyId: string | null; label: string; value: number }>;
  deliveryManagerDistribution: Array<{ label: string; value: number }>;
  talentComposition: Array<{ label: string; value: number }>;
  certificationScores: Array<{ certificationId:string; certificationName:string; average:number; peopleCount:number }>;
  certificationScoreDetails: Array<{ collaboratorId:string; personId:string; fullName:string; certificationId:string; certificationName:string; result:string|null; score10:number; applicationDate:string|null; attemptNumber:number|null }>;
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
    critical: number;
  }>;
  filters: {
    technologies: Array<{ id: string; name: string }>;
    profiles: Array<{ id: string; name: string }>;
    certifications: Array<{ id: string; name: string }>;
    technologyProfiles: string[];
    bbvaStructures: string[];
    deliveryManagers: string[];
  };
}
