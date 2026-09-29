import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BBVALayout } from './componentsBBVATalent/BBVALayout';
import { DashboardPage } from './pages/DashboardPage';
import { SampleCrudPage } from './pages/SampleCrudPage';
import { SampleAiPage } from './pages/SampleAiPage';
import { subscribeBbvaDataChange } from './pagesBBVATalent/lib/bbvaDataSync';
import { BBVAFilterPersistenceBoundary } from './pagesBBVATalent/hooks/BBVAFilterPersistenceScope';

const BBVADashboardPage = React.lazy(() => import('./pagesBBVATalent/dashboard/BBVADashboardPage').then((m) => ({ default: m.BBVADashboardPage })));
const CollaboratorCertificationsPage = React.lazy(() => import('./pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage').then((m) => ({ default: m.CollaboratorCertificationsPage })));
const CollaboratorCertificationDetailPage = React.lazy(() => import('./pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationDetailPage').then((m) => ({ default: m.CollaboratorCertificationDetailPage })));
const CertificationAttemptPage = React.lazy(() => import('./pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage').then((m) => ({ default: m.CertificationAttemptPage })));
const TalentPage = React.lazy(() => import('./pagesBBVATalent/talentBank/TalentBankPage').then((m) => ({ default: m.TalentPage })));
const TalentEditorPage = React.lazy(() => import('./pagesBBVATalent/talentBank/TalentEditorPage').then((m) => ({ default: m.TalentEditorPage })));
const TalentDetailPage = React.lazy(() => import('./pagesBBVATalent/talentBank/TalentDetailPage').then((m) => ({ default: m.TalentDetailPage })));
const TalentConvertPage = React.lazy(() => import('./pagesBBVATalent/talentBank/TalentConvertPage').then((m) => ({ default: m.TalentConvertPage })));
const CollaboratorsPage = React.lazy(() => import('./pagesBBVATalent/collaborators/CollaboratorsPage').then((m) => ({ default: m.CollaboratorsPage })));
const CollaboratorDetailPage = React.lazy(() => import('./pagesBBVATalent/collaborators/CollaboratorDetailPage').then((m) => ({ default: m.CollaboratorDetailPage })));
const CollaboratorEditorPage = React.lazy(() => import('./pagesBBVATalent/collaborators/CollaboratorEditorPage').then((m) => ({ default: m.CollaboratorEditorPage })));
const CollaboratorImportPage = React.lazy(() => import('./pagesBBVATalent/collaborators/CollaboratorImportPage').then((m) => ({ default: m.CollaboratorImportPage })));
const CollaboratorMoveToTalentPage = React.lazy(() => import('./pagesBBVATalent/collaborators/CollaboratorMoveToTalentPage').then((m) => ({ default: m.CollaboratorMoveToTalentPage })));
const CatalogListPage = React.lazy(() => import('./pagesBBVATalent/catalogs/CatalogListPage').then((m) => ({ default: m.CatalogListPage })));
const CatalogEditorPage = React.lazy(() => import('./pagesBBVATalent/catalogs/CatalogEditorPage').then((m) => ({ default: m.CatalogEditorPage })));
const CatalogDetailPage = React.lazy(() => import('./pagesBBVATalent/catalogs/CatalogDetailPage').then((m) => ({ default: m.CatalogDetailPage })));
const CertificationTrackingPage = React.lazy(() => import('./pagesBBVATalent/certifications/CertificationTrackingPage').then((m) => ({ default: m.CertificationTrackingPage })));
const CertificationMetricsPage = React.lazy(() => import('./pagesBBVATalent/certifications/CertificationMetricsPage').then((m) => ({ default: m.CertificationMetricsPage })));
const CertificationCatalogListPage = React.lazy(() => import('./pagesBBVATalent/certifications/CertificationCatalogListPage').then((m) => ({ default: m.CertificationCatalogListPage })));
const CertificationCatalogEditorPage = React.lazy(() => import('./pagesBBVATalent/certifications/CertificationCatalogEditorPage').then((m) => ({ default: m.CertificationCatalogEditorPage })));
const CertificationCatalogDetailPage = React.lazy(() => import('./pagesBBVATalent/certifications/CertificationCatalogDetailPage').then((m) => ({ default: m.CertificationCatalogDetailPage })));
const StructureCatalogEditorPage = React.lazy(() => import('./pagesBBVATalent/catalogs/StructureCatalogEditorPage').then((m) => ({ default: m.StructureCatalogEditorPage })));
const StructureCatalogDetailPage = React.lazy(() => import('./pagesBBVATalent/catalogs/StructureCatalogDetailPage').then((m) => ({ default: m.StructureCatalogDetailPage })));
const EngineeringSpecialtyExplorerPage = React.lazy(() => import('./pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage').then((m) => ({ default: m.EngineeringSpecialtyExplorerPage })));
const EngineeringSpecialtyEditorPage = React.lazy(() => import('./pagesBBVATalent/staffing/EngineeringSpecialtyEditorPage').then((m) => ({ default: m.EngineeringSpecialtyEditorPage })));
const EngineeringSpecialtyDetailPage = React.lazy(() => import('./pagesBBVATalent/staffing/EngineeringSpecialtyDetailPage').then((m) => ({ default: m.EngineeringSpecialtyDetailPage })));
const BBVAReportsPage = React.lazy(() => import('./pagesBBVATalent/reports/BBVAReportsPage').then((m) => ({ default: m.BBVAReportsPage })));
const AdminUsersPage = React.lazy(() => import('./pagesBBVATalent/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminUserEditorPage = React.lazy(() => import('./pagesBBVATalent/admin/AdminUserEditorPage').then((m) => ({ default: m.AdminUserEditorPage })));
const AdminRolesPage = React.lazy(() => import('./pagesBBVATalent/admin/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })));
const AdminRoleEditorPage = React.lazy(() => import('./pagesBBVATalent/admin/AdminRoleEditorPage').then((m) => ({ default: m.AdminRoleEditorPage })));
const BBVAPlaceholderPage = React.lazy(() => import('./pagesBBVATalent/BBVAPlaceholderPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const modulePage = (page: React.ReactNode) => (
  <React.Suspense fallback={<div className="p-4 text-xs text-slate-500">Cargando módulo...</div>}>
    {page}
  </React.Suspense>
);

interface RoutedAppProps {
  userKey: number;
  onUserChanged: () => void;
}

const RoutedApp: React.FC<RoutedAppProps> = ({ userKey, onUserChanged }) => {
  const location = useLocation();
  const isBbvaRoute = location.pathname.startsWith('/bbva/');

  useEffect(() => {
    if (!isBbvaRoute) return undefined;
    const refresh = () => { void queryClient.invalidateQueries({ refetchType: 'active' }); };
    const unsubscribe = subscribeBbvaDataChange(refresh);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { unsubscribe(); window.removeEventListener('focus', onFocus); };
  }, [isBbvaRoute]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Header BFS corporativo/global: obligatorio en todos los módulos. */}
      <Header onUserChanged={onUserChanged} />

      {isBbvaRoute ? (
        <BBVALayout>
          <BBVAFilterPersistenceBoundary pathname={location.pathname}>
            <div key={userKey} className="w-full min-w-0">
              <Routes>
              <Route path="/bbva/dashboard" element={modulePage(<BBVADashboardPage />)} />
              <Route path="/bbva/talent-bank" element={modulePage(<TalentPage />)} />
              <Route path="/bbva/talent-bank/new" element={modulePage(<TalentEditorPage />)} />
              <Route path="/bbva/talent-bank/:id/edit" element={modulePage(<TalentEditorPage />)} />
              <Route path="/bbva/talent-bank/:id/delete" element={modulePage(<TalentDetailPage mode="delete" />)} />
              <Route path="/bbva/talent-bank/:id/convert" element={modulePage(<TalentConvertPage />)} />
              <Route path="/bbva/talent-bank/:id" element={modulePage(<TalentDetailPage mode="view" />)} />
              <Route path="/bbva/collaborators" element={modulePage(<CollaboratorsPage />)} />
              <Route path="/bbva/collaborators/new" element={modulePage(<CollaboratorEditorPage />)} />
              <Route path="/bbva/collaborators/import" element={modulePage(<CollaboratorImportPage />)} />
              <Route path="/bbva/collaborators/:id/edit" element={modulePage(<CollaboratorEditorPage />)} />
              <Route path="/bbva/collaborators/:id/manage" element={<Navigate to="/bbva/collaborators" replace />} />
              <Route path="/bbva/collaborators/:id/move-to-talent" element={modulePage(<CollaboratorMoveToTalentPage />)} />
              <Route path="/bbva/collaborators/:id/certifications" element={modulePage(<CollaboratorCertificationsPage />)} />
              <Route path="/bbva/collaborators/:id/certifications/:certificationRecordId/edit" element={modulePage(<CollaboratorCertificationDetailPage mode="edit" />)} />
              <Route path="/bbva/collaborators/:id/certifications/:certificationRecordId/delete" element={modulePage(<CollaboratorCertificationDetailPage mode="delete" />)} />
              <Route path="/bbva/collaborators/:id/certifications/:certificationRecordId/attempt" element={modulePage(<CertificationAttemptPage />)} />
              <Route path="/bbva/collaborators/:id/certifications/:certificationRecordId/attempts/:attemptId/edit" element={modulePage(<CertificationAttemptPage />)} />
              <Route path="/bbva/collaborators/:id/certifications/:certificationRecordId" element={modulePage(<CollaboratorCertificationDetailPage mode="view" />)} />
              <Route path="/bbva/collaborators/:id" element={modulePage(<CollaboratorDetailPage />)} />

              <Route path="/bbva/certifications/tracking" element={modulePage(<CertificationTrackingPage />)} />
              <Route path="/bbva/certifications/metrics" element={modulePage(<CertificationMetricsPage />)} />
              <Route path="/bbva/certifications/second-plans" element={<Navigate to="/bbva/collaborators" replace />} />
              <Route path="/bbva/certifications/second-plans/*" element={<Navigate to="/bbva/collaborators" replace />} />

              <Route path="/bbva/reports/talent" element={modulePage(<BBVAReportsPage type="talent" />)} />
              <Route path="/bbva/reports/collaborators" element={modulePage(<BBVAReportsPage type="collaborators" />)} />
              <Route path="/bbva/reports/certifications" element={modulePage(<BBVAReportsPage type="certifications" />)} />

              <Route path="/bbva/admin/users" element={modulePage(<AdminUsersPage />)} />
              <Route path="/bbva/admin/users/new" element={modulePage(<AdminUserEditorPage />)} />
              <Route path="/bbva/admin/users/:id/edit" element={modulePage(<AdminUserEditorPage />)} />
              <Route path="/bbva/admin/roles" element={modulePage(<AdminRolesPage />)} />
              <Route path="/bbva/admin/roles/new" element={modulePage(<AdminRoleEditorPage />)} />
              <Route path="/bbva/admin/roles/:id/edit" element={modulePage(<AdminRoleEditorPage />)} />

              <Route path="/bbva/admin/catalogs/categories" element={modulePage(<CatalogListPage type="categories" />)} />
              <Route path="/bbva/admin/catalogs/categories/new" element={modulePage(<CatalogEditorPage type="categories" />)} />
              <Route path="/bbva/admin/catalogs/categories/:id/edit" element={modulePage(<CatalogEditorPage type="categories" />)} />
              <Route path="/bbva/admin/catalogs/categories/:id/delete" element={modulePage(<CatalogDetailPage type="categories" mode="delete" />)} />
              <Route path="/bbva/admin/catalogs/categories/:id" element={modulePage(<CatalogDetailPage type="categories" mode="view" />)} />

              <Route path="/bbva/admin/catalogs/technologies" element={modulePage(<CatalogListPage type="technologies" />)} />
              <Route path="/bbva/admin/catalogs/technologies/new" element={modulePage(<CatalogEditorPage type="technologies" />)} />
              <Route path="/bbva/admin/catalogs/technologies/:id/edit" element={modulePage(<CatalogEditorPage type="technologies" />)} />
              <Route path="/bbva/admin/catalogs/technologies/:id/delete" element={modulePage(<CatalogDetailPage type="technologies" mode="delete" />)} />
              <Route path="/bbva/admin/catalogs/technologies/:id" element={modulePage(<CatalogDetailPage type="technologies" mode="view" />)} />

              <Route path="/bbva/admin/catalogs/profiles" element={modulePage(<CatalogListPage type="profiles" />)} />
              <Route path="/bbva/admin/catalogs/profiles/new" element={modulePage(<CatalogEditorPage type="profiles" />)} />
              <Route path="/bbva/admin/catalogs/profiles/:id/edit" element={modulePage(<CatalogEditorPage type="profiles" />)} />
              <Route path="/bbva/admin/catalogs/profiles/:id/delete" element={modulePage(<CatalogDetailPage type="profiles" mode="delete" />)} />
              <Route path="/bbva/admin/catalogs/profiles/:id" element={modulePage(<CatalogDetailPage type="profiles" mode="view" />)} />

              <Route path="/bbva/admin/catalogs/technology-profiles" element={modulePage(<CatalogListPage type="technology-profiles" />)} />
              <Route path="/bbva/admin/catalogs/technology-profiles/new" element={modulePage(<CatalogEditorPage type="technology-profiles" />)} />
              <Route path="/bbva/admin/catalogs/technology-profiles/:id/edit" element={modulePage(<CatalogEditorPage type="technology-profiles" />)} />
              <Route path="/bbva/admin/catalogs/technology-profiles/:id/delete" element={modulePage(<CatalogDetailPage type="technology-profiles" mode="delete" />)} />
              <Route path="/bbva/admin/catalogs/technology-profiles/:id" element={modulePage(<CatalogDetailPage type="technology-profiles" mode="view" />)} />

              <Route path="/bbva/admin/catalogs/structures/*" element={<Navigate to="/bbva/admin/catalogs/engineering-specialties" replace />} />
              <Route path="/bbva/admin/catalogs/engineering-specialties" element={modulePage(<EngineeringSpecialtyExplorerPage />)} />
              <Route path="/bbva/admin/catalogs/engineering-specialties/structures/new" element={modulePage(<StructureCatalogEditorPage />)} />
              <Route path="/bbva/admin/catalogs/engineering-specialties/structures/:id/edit" element={modulePage(<StructureCatalogEditorPage />)} />
              <Route path="/bbva/admin/catalogs/engineering-specialties/structures/:id" element={modulePage(<StructureCatalogDetailPage />)} />
              <Route path="/bbva/admin/catalogs/engineering-specialties/new" element={modulePage(<EngineeringSpecialtyEditorPage />)} />
              <Route path="/bbva/admin/catalogs/engineering-specialties/:id/edit" element={modulePage(<EngineeringSpecialtyEditorPage />)} />
              <Route path="/bbva/admin/catalogs/engineering-specialties/:id" element={modulePage(<EngineeringSpecialtyDetailPage />)} />

              <Route path="/bbva/admin/catalogs/certifications" element={modulePage(<CertificationCatalogListPage />)} />
              <Route path="/bbva/admin/catalogs/certifications/new" element={modulePage(<CertificationCatalogEditorPage />)} />
              <Route path="/bbva/admin/catalogs/certifications/:id/edit" element={modulePage(<CertificationCatalogEditorPage />)} />
              <Route path="/bbva/admin/catalogs/certifications/:id/delete" element={modulePage(<CertificationCatalogDetailPage mode="delete" />)} />
              <Route path="/bbva/admin/catalogs/certifications/:id" element={modulePage(<CertificationCatalogDetailPage mode="view" />)} />

              <Route path="/bbva/*" element={modulePage(<BBVAPlaceholderPage />)} />
              </Routes>
            </div>
          </BBVAFilterPersistenceBoundary>
        </BBVALayout>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-8">
            <BBVAFilterPersistenceBoundary pathname={location.pathname}>
              <div key={userKey} className="mx-auto max-w-7xl">
                <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/crud" element={<SampleCrudPage />} />
                <Route path="/ai" element={<SampleAiPage />} />
                <Route path="/talent/*" element={<Navigate to="/bbva/talent-bank" replace />} />
                <Route path="/collaborators/*" element={<Navigate to="/bbva/collaborators" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </BBVAFilterPersistenceBoundary>
          </main>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const [userKey, setUserKey] = useState(0);

  const handleUserChanged = () => {
    setUserKey((previous) => previous + 1);
    void queryClient.invalidateQueries();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RoutedApp userKey={userKey} onUserChanged={handleUserChanged} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;


