import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SampleCrudPage } from './pages/SampleCrudPage';
import { SampleAiPage } from './pages/SampleAiPage';
import { TalentPage } from './modules/talent/pages/TalentPage';
import { TalentEditorPage } from './modules/talent/pages/TalentEditorPage';
import { TalentDetailPage } from './modules/talent/pages/TalentDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  const [userKey, setUserKey] = useState(0);

  const handleUserChanged = () => {
    // Forzar re-ejecución de queries cuando el usuario simulado cambia
    setUserKey((prev) => prev + 1);
    queryClient.invalidateQueries();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
          <Header onUserChanged={handleUserChanged} />

          <div className="flex flex-1 overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
              <div key={userKey} className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/crud" element={<SampleCrudPage />} />
                  <Route path="/ai" element={<SampleAiPage />} />
                  <Route path="/talent" element={<TalentPage />} />
                  <Route path="/talent/new" element={<TalentEditorPage />} />
                  <Route path="/talent/:id/edit" element={<TalentEditorPage />} />
                  <Route path="/talent/:id" element={<TalentDetailPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
