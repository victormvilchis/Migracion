export type BbvaStructureLevel = 2 | 3;
export type BbvaStructureStatus = 'ACTIVE' | 'INACTIVE';

export interface BbvaStructureRecord {
  id: string;
  level: BbvaStructureLevel;
  parentId: string | null;
  parentName: string | null;
  name: string;
  description: string | null;
  status: BbvaStructureStatus;
  usageCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface BbvaStructureInput {
  level: BbvaStructureLevel;
  parentId: string | null;
  name: string;
  description: string | null;
}

export interface BbvaStructureOption {
  id: string;
  level: BbvaStructureLevel;
  parentId: string | null;
  parentName: string | null;
  name: string;
}
