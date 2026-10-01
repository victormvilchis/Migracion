export interface CertificationCoverageCandidate {
  recordId: string;
  personId: string;
  certificationName?: string;
  applicable: boolean;
  baseStatus: string;
  coverageGroupId: string | null;
  coveragePriority: number;
  expirationDate: string | null;
}

export interface CertificationCoverageActivity {
  metricActive: boolean;
  handover: boolean;
  previousCertificationName: string | null;
  noValidCoverage: boolean;
}

function activeByConfiguredOrder(bucket: CertificationCoverageCandidate[], todayIso: string): CertificationCoverageCandidate | null {
  const validApproved = bucket.find((item) => item.baseStatus === 'APPROVED' && (!item.expirationDate || item.expirationDate >= todayIso));
  if (validApproved) return validApproved;
  return bucket.find((item) => !item.expirationDate || item.expirationDate >= todayIso) ?? bucket[bucket.length - 1] ?? null;
}

function hasValidCoverage(bucket: CertificationCoverageCandidate[], todayIso: string): boolean {
  return bucket.some((item) => item.baseStatus === 'APPROVED' && (!item.expirationDate || item.expirationDate >= todayIso));
}

export function certificationCoverageActivity(items: CertificationCoverageCandidate[], todayIso: string): Map<string, CertificationCoverageActivity> {
  const activity = new Map<string, CertificationCoverageActivity>();
  const grouped = new Map<string, CertificationCoverageCandidate[]>();

  for (const item of items) {
    if (!item.applicable || item.baseStatus === 'NOT_APPLICABLE') {
      activity.set(item.recordId, { metricActive: false, handover: false, previousCertificationName: null, noValidCoverage: false });
      continue;
    }
    if (!item.coverageGroupId) {
      activity.set(item.recordId, { metricActive: true, handover: false, previousCertificationName: null, noValidCoverage: false });
      continue;
    }
    const key = `${item.personId}::${item.coverageGroupId}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => Math.max(1, a.coveragePriority) - Math.max(1, b.coveragePriority) || a.recordId.localeCompare(b.recordId));
    for (const item of bucket) {
      activity.set(item.recordId, { metricActive: false, handover: false, previousCertificationName: null, noValidCoverage: false });
    }

    const current = activeByConfiguredOrder(bucket, todayIso);
    if (!current) continue;
    const currentIndex = bucket.findIndex((item) => item.recordId === current.recordId);
    const previousExpired = currentIndex > 0 ? [...bucket.slice(0, currentIndex)].reverse().find((item) => Boolean(item.expirationDate && item.expirationDate < todayIso)) ?? null : null;
    const validCoverage = hasValidCoverage(bucket, todayIso);
    activity.set(current.recordId, {
      metricActive: true,
      handover: validCoverage && Boolean(previousExpired),
      previousCertificationName: validCoverage ? previousExpired?.certificationName ?? null : null,
      noValidCoverage: !validCoverage,
    });
  }

  return activity;
}

export function metricActiveCertificationIds(items: CertificationCoverageCandidate[], todayIso: string): Set<string> {
  const active = new Set<string>();
  for (const [recordId, item] of certificationCoverageActivity(items, todayIso)) {
    if (item.metricActive) active.add(recordId);
  }
  return active;
}
