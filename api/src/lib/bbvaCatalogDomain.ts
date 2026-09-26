export type BbvaCatalogType = 'categories' | 'technologies' | 'profiles' | 'technology-profiles';
export type BbvaCatalogStatus = 'ACTIVE' | 'INACTIVE';

export interface BbvaCatalogDefinition {
  type: BbvaCatalogType;
  singularLabel: string;
  pluralLabel: string;
  tableName: string;
  supportsCode: boolean;
  supportsSeniority: boolean;
  usageColumn?: 'CurrentTechnology' | 'Profile' | 'TechnologyProfile';
}

export interface BbvaCatalogInput {
  name: string;
  code?: string | null;
  description?: string | null;
  seniority?: string | null;
}

export interface BbvaCatalogRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  seniority: string | null;
  status: BbvaCatalogStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface BbvaCatalogListParams {
  search?: string;
  status?: BbvaCatalogStatus | 'ALL';
  page?: number;
  size?: number;
  sort?: 'name' | 'usageCount' | 'updatedAt' | 'status';
  direction?: 'asc' | 'desc';
}

export interface BbvaCatalogPage {
  items: BbvaCatalogRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export const bbvaCatalogDefinitions: Record<BbvaCatalogType, BbvaCatalogDefinition> = {
  categories: {
    type: 'categories',
    singularLabel: 'categoría',
    pluralLabel: 'Categorías',
    tableName: 'bbva.CatalogCategory',
    supportsCode: false,
    supportsSeniority: false,
  },
  technologies: {
    type: 'technologies',
    singularLabel: 'tecnología',
    pluralLabel: 'Tecnologías',
    tableName: 'bbva.CatalogTechnology',
    supportsCode: true,
    supportsSeniority: false,
    usageColumn: 'CurrentTechnology',
  },
  profiles: {
    type: 'profiles',
    singularLabel: 'perfil',
    pluralLabel: 'Perfiles',
    tableName: 'bbva.CatalogProfile',
    supportsCode: true,
    supportsSeniority: true,
    usageColumn: 'Profile',
  },
  'technology-profiles': {
    type: 'technology-profiles',
    singularLabel: 'perfil tecnológico',
    pluralLabel: 'Perfiles tecnológicos',
    tableName: 'bbva.CatalogTechnologyProfile',
    supportsCode: false,
    supportsSeniority: false,
    usageColumn: 'TechnologyProfile',
  },
};

export function isBbvaCatalogType(value: string | undefined): value is BbvaCatalogType {
  return Boolean(value && Object.prototype.hasOwnProperty.call(bbvaCatalogDefinitions, value));
}
