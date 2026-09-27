export type ImportChangeDecision = 'APPLY_EXCEL' | 'KEEP_CURRENT';
export type ImportLowDecision = 'DEACTIVATE' | 'KEEP_ACTIVE' | 'IGNORE' | 'REVIEW';

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

export interface ImportCatalogAction {
  type: 'profile' | 'technologyProfile' | 'technology';
  value: string;
  action: 'USE_EXISTING' | 'CREATE';
}

export interface ImportNewCandidate {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  email: string | null;
  softtekCode: string | null;
  corporateUser: string | null;
  profile: string | null;
  technologyProfile: string | null;
  currentTechnology: string | null;
  expertise: string | null;
  startDate: string | null;
  catalogActions: ImportCatalogAction[];
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
}

export interface ImportErrorItem {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  message: string;
}

export interface ImportResolvedItem {
  rowKey: string;
  rowNumber: number;
  collaboratorId: string;
  fullName: string;
  change: ImportFieldChange;
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
}

export interface ImportApplyRequest {
  rows: ImportSourceRow[];
  emails: Record<string, string>;
  decisions: Record<string, ImportChangeDecision>;
  lowDecisions: Record<string, ImportLowDecision>;
}

export interface ImportApplyResult {
  created: number;
  updated: number;
  reactivated: number;
  movedToTalentBank: number;
  skipped: number;
  errors: Array<{ rowNumber: number | null; name: string; message: string }>;
}
