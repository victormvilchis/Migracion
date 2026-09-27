import type { BbvaDashboardResponse, DashboardFilters, DashboardSlice } from './bbvaDashboardDomain.js';
import { BbvaDashboardRepository, type DashboardCertificationRow, type DashboardCollaboratorRow } from './bbvaDashboardRepository.js';

const repository = new BbvaDashboardRepository();

function normalizeDate(value: string | null | undefined): string | null {
  const candidate = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function certificationStatus(row: DashboardCertificationRow, today: Date): string {
  if (!row.applicable || row.baseStatus === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (row.baseStatus !== 'APPROVED') return row.baseStatus === 'FAILED' ? 'FAILED' : row.baseStatus;
  if (!row.expirationDate) return 'VALID';
  const expiration = new Date(`${row.expirationDate}T23:59:59Z`);
  if (expiration.getTime() < today.getTime()) return row.recertificationEnabled ? 'RECERTIFICATION_PENDING' : 'EXPIRED';
  const threshold = new Date(today);
  threshold.setUTCDate(threshold.getUTCDate() + (row.expiringSoonDays ?? 90));
  if (expiration.getTime() <= threshold.getTime()) return 'EXPIRING';
  return 'VALID';
}

function matchesDate(value: string | null, fromDate: string | null, toDate: string | null): boolean {
  if (!fromDate && !toDate) return true;
  if (!value) return false;
  if (fromDate && value < fromDate) return false;
  if (toDate && value > toDate) return false;
  return true;
}

function sortSlices(values: Map<string, number>): DashboardSlice[] {
  return [...values.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es-MX'));
}

export class BbvaDashboardService {
  async get(filters: DashboardFilters, _actorEmail: string): Promise<BbvaDashboardResponse> {
    const [allCollaborators, allTalent, allCertifications, filterOptions] = await Promise.all([
      repository.collaborators(),
      repository.talent(),
      repository.certifications(),
      repository.filterOptions(),
    ]);

    const today = new Date();
    const fromDate = normalizeDate(filters.fromDate);
    const toDate = normalizeDate(filters.toDate);
    const search = String(filters.search ?? '').trim().toLocaleLowerCase('es-MX');

    const certStatusById = new Map<string, string>();
    for (const cert of allCertifications) certStatusById.set(cert.id, certificationStatus(cert, today));

    let collaborators = allCollaborators.filter((row) => {
      if (filters.technologyId && row.technologyId !== filters.technologyId) return false;
      if (filters.profileId && row.profileId !== filters.profileId) return false;
      if (!matchesDate(row.startDate, fromDate, toDate)) return false;
      if (search && !`${row.fullName} ${row.email} ${row.profile ?? ''} ${row.technology ?? ''}`.toLocaleLowerCase('es-MX').includes(search)) return false;
      return true;
    });

    if (filters.certificationStatus) {
      const personIds = new Set(
        allCertifications
          .filter((cert) => certStatusById.get(cert.id) === filters.certificationStatus)
          .map((cert) => cert.personId),
      );
      collaborators = collaborators.filter((row) => personIds.has(row.personId));
    }

    const collaboratorPersonIds = new Set(collaborators.map((row) => row.personId));
    const certifications = allCertifications.filter((row) => collaboratorPersonIds.has(row.personId) && row.applicable && certStatusById.get(row.id) !== 'NOT_APPLICABLE');

    const counts = {
      valid: 0,
      expiring: 0,
      expired: 0,
      recertificationPending: 0,
      pending: 0,
      failed: 0,
    };
    for (const cert of certifications) {
      const status = certStatusById.get(cert.id);
      if (status === 'VALID') counts.valid += 1;
      else if (status === 'EXPIRING') counts.expiring += 1;
      else if (status === 'EXPIRED') counts.expired += 1;
      else if (status === 'RECERTIFICATION_PENDING') counts.recertificationPending += 1;
      else if (status === 'FAILED') counts.failed += 1;
      else counts.pending += 1;
    }

    let talent = allTalent.filter((row) => {
      if (filters.talentType && row.talentType !== filters.talentType) return false;
      if (filters.technologyId && row.technologyId !== filters.technologyId) return false;
      if (filters.profileId && row.profileId !== filters.profileId) return false;
      if (!matchesDate(row.entryDate, fromDate, toDate)) return false;
      if (search && !row.fullName.toLocaleLowerCase('es-MX').includes(search)) return false;
      return true;
    });
    if (!filters.talentType) talent = talent.filter(Boolean);

    const totalApplicable = certifications.length;
    const covered = counts.valid + counts.expiring;
    const coveragePercent = totalApplicable ? Math.round((covered / totalApplicable) * 10000) / 100 : 100;

    const personCerts = new Map<string, DashboardCertificationRow[]>();
    for (const cert of certifications) {
      const bucket = personCerts.get(cert.personId) ?? [];
      bucket.push(cert);
      personCerts.set(cert.personId, bucket);
    }

    const collaboratorFocusMap = new Map<string, number>([
      ['En regla', 0],
      ['Próximas a vencer', 0],
      ['Vencidas', 0],
      ['Pendientes', 0],
    ]);

    const attention = collaborators.map((collaborator) => {
      const rows = personCerts.get(collaborator.personId) ?? [];
      const result = { valid: 0, expiring: 0, expired: 0, pending: 0, recertificationPending: 0 };
      for (const cert of rows) {
        const status = certStatusById.get(cert.id);
        if (status === 'VALID') result.valid += 1;
        else if (status === 'EXPIRING') result.expiring += 1;
        else if (status === 'EXPIRED') result.expired += 1;
        else if (status === 'RECERTIFICATION_PENDING') result.recertificationPending += 1;
        else result.pending += 1;
      }
      if (result.expired + result.recertificationPending > 0) collaboratorFocusMap.set('Vencidas', (collaboratorFocusMap.get('Vencidas') ?? 0) + 1);
      else if (result.expiring > 0) collaboratorFocusMap.set('Próximas a vencer', (collaboratorFocusMap.get('Próximas a vencer') ?? 0) + 1);
      else if (result.pending > 0) collaboratorFocusMap.set('Pendientes', (collaboratorFocusMap.get('Pendientes') ?? 0) + 1);
      else collaboratorFocusMap.set('En regla', (collaboratorFocusMap.get('En regla') ?? 0) + 1);
      return {
        collaboratorId: collaborator.collaboratorId,
        fullName: collaborator.fullName,
        technology: collaborator.technology ?? 'Sin tecnología',
        profile: collaborator.profile ?? 'Sin perfil',
        ...result,
      };
    }).sort((a, b) => {
      const scoreA = (a.expired + a.recertificationPending) * 100 + a.expiring * 10 + a.pending;
      const scoreB = (b.expired + b.recertificationPending) * 100 + b.expiring * 10 + b.pending;
      return scoreB - scoreA || a.fullName.localeCompare(b.fullName, 'es-MX');
    });

    const certificationCoverage: DashboardSlice[] = [
      { label: 'Vigentes', value: counts.valid },
      { label: 'Próximas a vencer', value: counts.expiring },
      { label: 'Vencidas', value: counts.expired },
      { label: 'Recertificación pendiente', value: counts.recertificationPending },
      { label: 'Pendientes', value: counts.pending + counts.failed },
    ];

    const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    const expirationByMonth = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + index, 1));
      const next = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + index + 1, 1));
      const value = certifications.filter((cert) => {
        if (!cert.expirationDate) return false;
        const expiration = new Date(`${cert.expirationDate}T00:00:00Z`);
        return expiration >= start && expiration < next;
      }).length;
      return {
        month: start.toISOString().slice(0, 7),
        label: monthFormatter.format(start).replace('.', ''),
        value,
      };
    });

    const techMap = new Map<string, { technologyId: string | null; value: number }>();
    for (const collaborator of collaborators) {
      const label = collaborator.technology ?? 'Sin tecnología';
      const current = techMap.get(label) ?? { technologyId: collaborator.technologyId, value: 0 };
      current.value += 1;
      techMap.set(label, current);
    }
    const technologyDistribution = [...techMap.entries()]
      .map(([label, data]) => ({ technologyId: data.technologyId, label, value: data.value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es-MX'));

    const talentMap = new Map<string, number>();
    const typeLabel: Record<string, string> = { ACADEMY: 'Academia', PROSPECT: 'Prospectos', BBVA_EXIT: 'Bajas de BBVA' };
    for (const item of talent) talentMap.set(typeLabel[item.talentType] ?? item.talentType, (talentMap.get(typeLabel[item.talentType] ?? item.talentType) ?? 0) + 1);

    return {
      cards: {
        collaboratorsActive: collaborators.length,
        talentBankActive: talent.length,
        certificationsApplicable: totalApplicable,
        coveragePercent,
        expiring: counts.expiring,
        expired: counts.expired,
        recertificationPending: counts.recertificationPending,
        pending: counts.pending + counts.failed,
      },
      collaboratorFocus: [...collaboratorFocusMap.entries()].map(([label, value]) => ({ label, value })),
      certificationCoverage,
      expirationByMonth,
      technologyDistribution,
      talentComposition: sortSlices(talentMap),
      attention,
      filters: filterOptions,
    };
  }
}
