export type CatalogType = 'categories' | 'technologies' | 'profiles' | 'technology-profiles';
export type CatalogStatus = 'ACTIVE' | 'INACTIVE';

export interface CatalogRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  seniority: string | null;
  status: CatalogStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface CatalogPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  seniority?: string | null;
}

export interface CatalogPageResponse {
  items: CatalogRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  storage: string;
}

export interface CatalogConfig {
  type: CatalogType;
  singular: string;
  singularArticle: 'la' | 'el';
  plural: string;
  route: string;
  supportsCode: boolean;
  supportsSeniority: boolean;
  namePlaceholder: string;
  codePlaceholder?: string;
  descriptionPlaceholder: string;
}

export const catalogConfigs: Record<CatalogType, CatalogConfig> = {
  categories: {
    type: 'categories', singular: 'categoría', singularArticle: 'la', plural: 'Categorías', route: '/bbva/admin/catalogs/categories',
    supportsCode: false, supportsSeniority: false, namePlaceholder: 'Ej. Desarrollo Seguro', descriptionPlaceholder: 'Descripción breve de la categoría',
  },
  technologies: {
    type: 'technologies', singular: 'tecnología', singularArticle: 'la', plural: 'Tecnologías', route: '/bbva/admin/catalogs/technologies',
    supportsCode: true, supportsSeniority: false, namePlaceholder: 'Ej. APX', codePlaceholder: 'Ej. APX', descriptionPlaceholder: 'Descripción breve de la tecnología',
  },
  profiles: {
    type: 'profiles', singular: 'perfil', singularArticle: 'el', plural: 'Perfiles', route: '/bbva/admin/catalogs/profiles',
    supportsCode: true, supportsSeniority: true, namePlaceholder: 'Ej. ANALISTA PROGRAMADOR SR ESPECIAL', codePlaceholder: 'Código opcional', descriptionPlaceholder: 'Descripción breve del perfil',
  },
  'technology-profiles': {
    type: 'technology-profiles', singular: 'perfil tecnológico', singularArticle: 'el', plural: 'Perfiles tecnológicos', route: '/bbva/admin/catalogs/technology-profiles',
    supportsCode: false, supportsSeniority: false, namePlaceholder: 'Ej. DESARROLLADOR', descriptionPlaceholder: 'Descripción breve del perfil tecnológico',
  },
};
