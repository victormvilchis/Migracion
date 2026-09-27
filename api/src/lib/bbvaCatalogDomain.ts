export type BbvaCatalogType = 'categories' | 'technologies' | 'profiles' | 'technology-profiles';
export type BbvaCatalogStatus = 'ACTIVE' | 'INACTIVE';

export interface BbvaCatalogDefinition {
  type: BbvaCatalogType;
  singularLabel: string;
  singularArticle: 'el' | 'la';
  pluralLabel: string;
  tableName: string;
  supportsSeniority: boolean;
  usageColumn?: 'CurrentTechnology' | 'Profile' | 'TechnologyProfile';
  usageIdColumn?: 'CurrentTechnologyCatalogId' | 'ProfileCatalogId' | 'TechnologyProfileCatalogId';
  extraUsageExpressions?: string[];
}

export interface BbvaCatalogInput {
  name: string;
  description?: string | null;
  seniority?: string | null;
}

export interface BbvaCatalogRecord {
  id: string;
  name: string;
  description: string | null;
  seniority: string | null;
  status: BbvaCatalogStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface BbvaCatalogOption {
  id: string;
  name: string;
  seniority: string | null;
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
    singularArticle: 'la',
    pluralLabel: 'Categorías',
    tableName: 'bbva.CatalogCategory',
    supportsSeniority: false,
  },
  technologies: {
    type: 'technologies',
    singularLabel: 'tecnología',
    singularArticle: 'la',
    pluralLabel: 'Tecnologías',
    tableName: 'bbva.CatalogTechnology',
    supportsSeniority: false,
    usageColumn: 'CurrentTechnology',
    usageIdColumn: 'CurrentTechnologyCatalogId',
    extraUsageExpressions: ['(SELECT COUNT_BIG(1) FROM bbva.CertificationCatalog cert WHERE cert.TechnologyId=c.Id)'],
  },
  profiles: {
    type: 'profiles',
    singularLabel: 'perfil',
    singularArticle: 'el',
    pluralLabel: 'Perfiles',
    tableName: 'bbva.CatalogProfile',
    supportsSeniority: true,
    usageColumn: 'Profile',
    usageIdColumn: 'ProfileCatalogId',
  },
  'technology-profiles': {
    type: 'technology-profiles',
    singularLabel: 'perfil tecnológico',
    singularArticle: 'el',
    pluralLabel: 'Perfiles tecnológicos',
    tableName: 'bbva.CatalogTechnologyProfile',
    supportsSeniority: false,
    usageColumn: 'TechnologyProfile',
    usageIdColumn: 'TechnologyProfileCatalogId',
  },
};

export function isBbvaCatalogType(value: string | undefined): value is BbvaCatalogType {
  return Boolean(value && Object.prototype.hasOwnProperty.call(bbvaCatalogDefinitions, value));
}
