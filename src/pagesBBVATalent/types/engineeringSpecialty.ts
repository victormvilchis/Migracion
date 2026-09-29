export type EngineeringSpecialtyStatus = 'ACTIVE' | 'INACTIVE';

export interface EngineeringSpecialty {
  id: string;
  n3: string;
  guild: string;
  specialty: string;
  guildLeader: string | null;
  specialtyOwner: string | null;
  portfolioStaffing: string | null;
  staffer: string | null;
  status: EngineeringSpecialtyStatus;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface EngineeringSpecialtyPayload {
  n3: string;
  guild: string;
  specialty: string;
  guildLeader: string;
  specialtyOwner: string;
  portfolioStaffing: string;
  staffer: string;
}

export interface EngineeringSpecialtyPage {
  items: EngineeringSpecialty[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface EngineeringExplorerPerson {
  id: string;
  fullName: string;
  profile: string | null;
  technology: string | null;
  deliveryManager: string | null;
}

export interface EngineeringExplorerSpecialtyNode {
  id: string;
  name: string;
  staffer: string | null;
  guildLeader: string | null;
  specialtyOwner: string | null;
  portfolioStaffing: string | null;
  status: EngineeringSpecialtyStatus;
}

export interface EngineeringExplorerLevel3Node {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  collaboratorCount: number;
  specialties: EngineeringExplorerSpecialtyNode[];
  people: EngineeringExplorerPerson[];
}

export interface EngineeringExplorerLevel2Node {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  collaboratorCount: number;
  specialtyCount: number;
  level3: EngineeringExplorerLevel3Node[];
}

export interface EngineeringExplorerHeatCell {
  level2Id: string;
  level2Name: string;
  level3Id: string;
  level3Name: string;
  collaboratorCount: number;
  specialtyCount: number;
}

export interface EngineeringExplorerInsightItem {
  key: string;
  label: string;
  count: number;
  secondary?: string | null;
}

export interface EngineeringSpecialtyExplorer {
  generatedAt: string;
  metrics: {
    guilds: number;
    specialties: number;
    structureLevel2: number;
    structureLevel3: number;
    activeCollaborators: number;
    coveredCollaborators: number;
    collaboratorCoveragePercent: number;
  };
  hierarchy: EngineeringExplorerLevel2Node[];
  heatmap: EngineeringExplorerHeatCell[];
  filters: {
    staffers: string[];
  };
  insights: {
    topGuildsByCollaborators: EngineeringExplorerInsightItem[];
    topStructuresBySpecialties: EngineeringExplorerInsightItem[];
    topStaffersBySpecialties: EngineeringExplorerInsightItem[];
    structuresWithoutSpecialties: EngineeringExplorerInsightItem[];
    collaboratorsOutsideHierarchy: EngineeringExplorerPerson[];
    unmatchedSpecialtyGroups: EngineeringExplorerInsightItem[];
    specialtiesWithoutStaffer: number;
  };
}
