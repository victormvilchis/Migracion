export type ImportChangeDecision = 'APPLY_EXCEL' | 'KEEP_CURRENT';
export type ImportLowDecision = 'DEACTIVATE' | 'KEEP_ACTIVE' | 'IGNORE' | 'REVIEW';
export type ImportCertificationBlock = 'DEVELOPMENT_SECURITY' | 'TECHNOLOGICAL' | 'ONE' | 'NORMATIVE_TESTING' | 'AGILE' | 'JIRA' | 'GITHUB';

export interface ImportSourceRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ImportPreviewRequest {
  rows: ImportSourceRow[];
}

export interface ImportFieldChange {
  resolutionKey: string;
  field: string;
  label: string;
  currentValue: string | null;
  excelValue: string | null;
  decision: ImportChangeDecision;
  resolvedPreviously: boolean;
}


export interface ImportCertificationFieldComparison {
  field: 'applicable' | 'certificationStatus' | 'examStatus' | 'applicationDate' | 'score10' | 'administrativeAttempt' | 'lifecycle' | 'initialDueDate' | 'expirationDate' | 'lastApproval';
  label: string;
  currentValue: string | null;
  excelValue: string | null;
  calculatedValue: string | null;
  origin: string | null;
}

export interface ImportCertificationIssue {
  code: string;
  message: string;
  blocking: boolean;
  category: 'ERROR' | 'CONFLICT' | 'WARNING';
}

export interface ImportCertificationPreview {
  block: ImportCertificationBlock;
  label: string;
  certificationId: string | null;
  certificationName: string | null;
  resolutionKey: string;
  sourceFingerprint: string;
  decision: ImportChangeDecision;
  resolvedPreviously: boolean;
  hasChanges: boolean;
  currentSource: string | null;
  currentStatus: string | null;
  excelStatus: string | null;
  calculatedStatus: string | null;
  ruleGap: string | null;
  fields: ImportCertificationFieldComparison[];
  issues: ImportCertificationIssue[];
}

export interface ImportCatalogAction {
  type: 'profile' | 'technologyProfile' | 'technology';
  value: string;
  action: 'USE_EXISTING' | 'CREATE' | 'INACTIVE';
}

export interface ImportNewCandidate {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  email: string | null;
  softtekCode: string | null;
  corporateUser: string | null;
  bbvaEmail: string | null;
  deliveryManager: string | null;
  profile: string | null;
  technologyProfile: string | null;
  currentTechnology: string | null;
  expertise: string | null;
  startDate: string | null;
  hireDate: string | null;
  catalogActions: ImportCatalogAction[];
  certifications: ImportCertificationPreview[];
}

export interface ImportChangedCandidate {
  rowKey: string;
  rowNumber: number;
  collaboratorId: string;
  personId: string;
  fullName: string;
  reactivationRequired: boolean;
  changes: ImportFieldChange[];
  catalogActions: ImportCatalogAction[];
  certifications: ImportCertificationPreview[];
}

export interface ImportPossibleLow {
  collaboratorId: string;
  personId: string;
  fullName: string;
  email: string;
  profile: string | null;
  currentTechnology: string | null;
  decision: ImportLowDecision;
}

export interface ImportConflict {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  message: string;
  resolutionKey?: string;
  decision?: ImportChangeDecision;
  certificationBlock?: ImportCertificationBlock;
  certificationLabel?: string;
  issueCode?: string;
  currentValue?: string | null;
  excelValue?: string | null;
  calculatedValue?: string | null;
  resolvedPreviously?: boolean;
}

export interface ImportErrorItem {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  message: string;
  code?: string;
  scope?: 'ROW' | 'CERTIFICATION';
  certificationBlock?: ImportCertificationBlock;
  certificationLabel?: string;
}

export interface ImportResolvedItem {
  rowKey: string;
  rowNumber: number;
  collaboratorId: string;
  fullName: string;
  change?: ImportFieldChange;
  certification?: ImportCertificationPreview;
}

export interface ImportPreviewResponse {
  totalRowsAnalyzed: number;
  ignoredRows: number;
  newItems: ImportNewCandidate[];
  changedItems: ImportChangedCandidate[];
  possibleLows: ImportPossibleLow[];
  conflicts: ImportConflict[];
  errors: ImportErrorItem[];
  resolvedPreviously: ImportResolvedItem[];
  certificationChanges: number;
  certificationResults: number;
  certificationRuleGaps: string[];
}

export interface ImportApplyRequest {
  rows: ImportSourceRow[];
  emails: Record<string, string>;
  softtekCodes: Record<string, string>;
  deliveryManagers: Record<string, string>;
  decisions: Record<string, ImportChangeDecision>;
  lowDecisions: Record<string, ImportLowDecision>;
}

export interface ImportApplyResult {
  created: number;
  updated: number;
  reactivated: number;
  movedToTalentBank: number;
  skipped: number;
  certificationUpdated: number;
  resultsRegistered: number;
  reusedDecisions: number;
  errors: Array<{
    rowKey?: string;
    rowNumber: number | null;
    name: string;
    message: string;
    stage: 'VALIDATION' | 'CORE' | 'CERTIFICATION' | 'LIFECYCLE' | 'UNKNOWN';
    code?: string;
  }>;
}
