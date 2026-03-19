import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { F1Provider } from './context/F1Context';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const RacesPage = lazy(() => import('./pages/RacesPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const NewSeasonPage = lazy(() => import('./pages/NewSeasonPage'));
const RaceDetailPage = lazy(() => import('./pages/RaceDetailPage'));
const DriverDetail2026 = lazy(() => import('./pages/DriverDetail2026'));
const DriverDetailPage = lazy(() => import('./pages/DriverDetailPage'));
const TeamDetail2026 = lazy(() => import('./pages/TeamDetail2026'));
const DataManagementPage = lazy(() => import('./pages/DataManagementPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

import { useF1Data } from './hooks/useF1Data';
import { LoadingSpinner } from './components/Skeletons';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useF1 } from './context/F1Context';

function AppContent() {
  const { loading, error } = useF1Data();
  const { resolvedTheme } = useF1();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const syncStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({
          style: resolvedTheme === 'dark' ? Style.Dark : Style.Light,
        });
      } catch (err) {
        console.warn('Status bar configuration failed', err);
      }
    };

    void syncStatusBar();
  }, [resolvedTheme]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">加载失败</h2>
          <p className="text-secondary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-f1-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-f1-red/20"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/races" element={<RacesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/new-season" element={<NewSeasonPage />} />
          <Route path="/new-season/race/:slug" element={<RaceDetailPage />} />
          <Route path="/new-season/driver/:id" element={<DriverDetail2026 />} />
          <Route path="/driver/:id" element={<DriverDetailPage />} />
          <Route path="/new-season/team/:id" element={<TeamDetail2026 />} />
          <Route path="/admin-console" element={<DataManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

import { AppUpdater } from './components/AppUpdater';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <F1Provider>
          <AppUpdater />
          <AppContent />
        </F1Provider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
