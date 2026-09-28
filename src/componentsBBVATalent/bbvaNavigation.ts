import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpenCheck,
  Gauge,
  GraduationCap,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

export interface BBVANavModule {
  id: string;
  label: string;
  path: string;
  description?: string;
  status?: 'ready' | 'planned';
}

export interface BBVANavSection {
  id: string;
  label: string;
  modules: BBVANavModule[];
}

export interface BBVANavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  modules?: BBVANavModule[];
  sections?: BBVANavSection[];
}

/**
 * Navegación oficial BBVA Workspace.
 *
 * Orden:
 * Panel > Talento > Certificaciones > Reportes > Estudio > Administración.
 *
 * Reglas:
 * - Una entrada por módulo funcional; las operaciones viven dentro de la vista.
 * - Certificaciones de catálogo y sus reglas viven en Administración > Catálogos > Certificaciones.
 * - Las reglas de una certificación se configuran dentro de la propia certificación
 *   (perfiles aplicables, vigencia, tiempo para completar y obligatoriedad).
 * - Seguimiento de certificaciones es un solo módulo.
 * - Métricas de certificaciones es un solo módulo.
 * - Estudio agrupa Banco de Preguntas y Evaluaciones con sus módulos funcionales.
 */
export const bbvaNavigation: BBVANavGroup[] = [
  {
    id: 'dashboard',
    label: 'Panel',
    icon: Gauge,
    path: '/bbva/dashboard',
  },
  {
    id: 'talent',
    label: 'Talento',
    icon: UsersRound,
    modules: [
      { id: 'collaborators', label: 'Colaboradores', path: '/bbva/collaborators', status: 'ready' },
      { id: 'talent-bank', label: 'Banco de talento', path: '/bbva/talent-bank', status: 'ready' },
    ],
  },
  {
    id: 'certifications',
    label: 'Certificaciones',
    icon: GraduationCap,
    modules: [
      {
        id: 'certifications-tracking',
        label: 'Seguimiento',
        path: '/bbva/certifications/tracking',
        description: 'Vigencias, próximas a vencer e historial en una sola vista.',
        status: 'ready',
      },
      {
        id: 'certifications-metrics',
        label: 'Métricas',
        path: '/bbva/certifications/metrics',
        description: 'Cumplimiento, estado y tendencias en una sola vista.',
        status: 'ready',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: BarChart3,
    modules: [
      { id: 'reports-talent', label: 'Talento', path: '/bbva/reports/talent', status: 'ready' },
      { id: 'reports-collaborators', label: 'Colaboradores', path: '/bbva/reports/collaborators', status: 'ready' },
      { id: 'reports-evaluations', label: 'Evaluaciones', path: '/bbva/reports/evaluations', status: 'planned' },
      { id: 'reports-certifications', label: 'Certificaciones', path: '/bbva/reports/certifications', status: 'ready' },
    ],
  },
  {
    id: 'study',
    label: 'Estudio',
    icon: BookOpenCheck,
    sections: [
      {
        id: 'question-bank',
        label: 'Banco de Preguntas',
        modules: [
          { id: 'questions', label: 'Preguntas', path: '/bbva/study/questions', status: 'planned' },
          { id: 'forms', label: 'Formularios', path: '/bbva/study/forms', status: 'planned' },
          { id: 'collections', label: 'Colecciones', path: '/bbva/study/collections', status: 'planned' },
        ],
      },
      {
        id: 'evaluations',
        label: 'Evaluaciones',
        modules: [
          { id: 'evaluations-list', label: 'Evaluaciones', path: '/bbva/study/evaluations', status: 'planned' },
          { id: 'paths', label: 'Rutas', path: '/bbva/study/paths', status: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administración',
    icon: ShieldCheck,
    modules: [
      { id: 'users', label: 'Usuarios', path: '/bbva/admin/users', status: 'ready' },
      { id: 'roles', label: 'Roles', path: '/bbva/admin/roles', status: 'ready' },
    ],
    sections: [
      {
        id: 'catalogs',
        label: 'Catálogos',
        modules: [
          { id: 'categories', label: 'Categorías', path: '/bbva/admin/catalogs/categories', status: 'ready' },
          { id: 'technologies', label: 'Tecnologías', path: '/bbva/admin/catalogs/technologies', status: 'ready' },
          { id: 'profiles', label: 'Perfiles', path: '/bbva/admin/catalogs/profiles', status: 'ready' },
          {
            id: 'technology-profiles',
            label: 'Perfiles tecnológicos',
            path: '/bbva/admin/catalogs/technology-profiles',
            status: 'ready',
          },
          {
            id: 'certification-catalog',
            label: 'Certificaciones',
            path: '/bbva/admin/catalogs/certifications',
            description: 'Catálogo y reglas por certificación.',
            status: 'ready',
          },
        ],
      },
    ],
  },
];

export interface BBVANavigationMatch {
  group: BBVANavGroup;
  section?: BBVANavSection;
  module: BBVANavModule;
}

const normalizePath = (path: string): string => {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '');
};

export const flattenBbvaNavigation = (): BBVANavigationMatch[] =>
  bbvaNavigation.flatMap((group) => {
    const directModules = (group.modules ?? []).map((module) => ({ group, module }));
    const sectionModules = (group.sections ?? []).flatMap((section) =>
      section.modules.map((module) => ({ group, section, module }))
    );
    return [...directModules, ...sectionModules];
  });

export const findBbvaNavigationMatch = (pathname: string): BBVANavigationMatch | undefined => {
  const normalized = normalizePath(pathname);
  const modules = flattenBbvaNavigation();

  const exact = modules.find(({ module }) => normalizePath(module.path) === normalized);
  if (exact) return exact;

  return modules
    .filter(({ module }) => normalized.startsWith(`${normalizePath(module.path)}/`))
    .sort((a, b) => b.module.path.length - a.module.path.length)[0];
};

export const findBbvaGroupByPath = (pathname: string): BBVANavGroup | undefined => {
  const normalized = normalizePath(pathname);
  return bbvaNavigation.find((group) => group.path && normalizePath(group.path) === normalized);
};

export const getBbvaBreadcrumbAction = (pathname: string): string | undefined => {
  const normalized = normalizePath(pathname);

  if (/\/new$/.test(normalized)) return 'Nuevo';
  if (/\/edit$/.test(normalized)) return 'Editar';
  if (/\/delete$/.test(normalized)) return 'Eliminar';
  if (/\/convert$/.test(normalized)) return 'Convertir';
  if (/\/import$/.test(normalized)) return 'Importar Excel';
  if (/\/move-to-talent$/.test(normalized)) return 'Mover a Banco de talento';
  if (/\/certifications$/.test(normalized) && normalized.includes('/collaborators/')) return 'Certificaciones';
  if (/\/attempt$/.test(normalized) && normalized.includes('/certifications/')) return 'Registrar intento';

  const match = findBbvaNavigationMatch(normalized);
  if (match && normalized !== normalizePath(match.module.path)) return 'Ver';

  return undefined;
};


export interface BBVABreadcrumbPart {
  label: string;
  path?: string;
}

const firstReadyModulePath = (group: BBVANavGroup): string | undefined => {
  const direct = (group.modules ?? []).find((module) => module.status !== 'planned');
  if (direct) return direct.path;
  return (group.sections ?? []).flatMap((section) => section.modules).find((module) => module.status !== 'planned')?.path;
};

export const getBbvaBreadcrumbParts = (pathname: string): BBVABreadcrumbPart[] => {
  const normalized = normalizePath(pathname);
  const directGroup = findBbvaGroupByPath(normalized);
  if (directGroup) return [{ label: directGroup.label }];

  const match = findBbvaNavigationMatch(normalized);
  if (!match) return [];
  const action = getBbvaBreadcrumbAction(normalized);
  const groupPath = match.group.path ?? firstReadyModulePath(match.group);
  const sectionPath = match.section?.modules.find((module) => module.status !== 'planned')?.path;
  const parts: BBVABreadcrumbPart[] = [
    { label: match.group.label, path: groupPath },
    ...(match.section ? [{ label: match.section.label, path: sectionPath }] : []),
    { label: match.module.label, path: action ? match.module.path : undefined },
  ];
  if (action) parts.push({ label: action });
  return parts;
};
