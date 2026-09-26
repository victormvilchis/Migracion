export type CatalogType = 'categories' | 'technologies' | 'profiles' | 'technology-profiles';
export type CatalogStatus = 'ACTIVE' | 'INACTIVE';

export interface CatalogRecord {
  id: string;
  name: string;
  description: string | null;
  seniority: string | null;
  status: CatalogStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface CatalogOption {
  id: string;
  name: string;
  seniority: string | null;
}

export interface CatalogPayload {
  name: string;
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
  supportsSeniority: boolean;
  namePlaceholder: string;
  descriptionPlaceholder: string;
}

export const catalogConfigs: Record<CatalogType, CatalogConfig> = {
  categories: {
    type: 'categories', singular: 'categoría', singularArticle: 'la', plural: 'Categorías', route: '/bbva/admin/catalogs/categories',
    supportsSeniority: false, namePlaceholder: 'Ej. Desarrollo Seguro', descriptionPlaceholder: 'Descripción breve de la categoría',
  },
  technologies: {
    type: 'technologies', singular: 'tecnología', singularArticle: 'la', plural: 'Tecnologías', route: '/bbva/admin/catalogs/technologies',
    supportsSeniority: false, namePlaceholder: 'Ej. APX', descriptionPlaceholder: 'Descripción breve de la tecnología',
  },
  profiles: {
    type: 'profiles', singular: 'perfil', singularArticle: 'el', plural: 'Perfiles', route: '/bbva/admin/catalogs/profiles',
    supportsSeniority: true, namePlaceholder: 'Ej. ANALISTA PROGRAMADOR SR ESPECIAL', descriptionPlaceholder: 'Descripción breve del perfil',
  },
  'technology-profiles': {
    type: 'technology-profiles', singular: 'perfil tecnológico', singularArticle: 'el', plural: 'Perfiles tecnológicos', route: '/bbva/admin/catalogs/technology-profiles',
    supportsSeniority: false, namePlaceholder: 'Ej. DESARROLLADOR', descriptionPlaceholder: 'Descripción breve del perfil tecnológico',
  },
};
