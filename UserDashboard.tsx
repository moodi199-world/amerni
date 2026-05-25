/**
 * App.tsx — النسخة الكاملة النهائية
 */
import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useApp } from './contexts/AppContext';
import { LandingPage } from './pages/LandingPage';
import { UserDashboard } from './pages/UserDashboard';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { WorkerRegister } from './pages/WorkerRegister';
import { WorkerSearch } from './pages/WorkerSearch';
import { Navbar } from './components/layout/Navbar';
import AuthModal from './pages/AuthModal';
import { LegalPage } from './pages/LegalPage';

function App() {
  const { user, loading, profile } = useAuth();
  const { authModalOpen, legalDoc } = useApp();
  const [showWorkerRegister, setShowWorkerRegister] = useState(false);
  const [showWorkerSearch, setShowWorkerSearch] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">يحمّل...</span>
        </div>
      </div>
    );
  }

  // Legal modal
  if (legalDoc) {
    return <LegalPage />;
  }

  // Worker registration flow
  if (showWorkerRegister && user) {
    return (
      <>
        <Navbar />
        <WorkerRegister
          onSuccess={() => setShowWorkerRegister(false)}
          onBack={() => setShowWorkerRegister(false)}
        />
      </>
    );
  }

  // Worker search page
  if (showWorkerSearch) {
    return (
      <>
        <Navbar />
        <WorkerSearch onClose={() => setShowWorkerSearch(false)} />
      </>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <Navbar />
        <LandingPage />
        {authModalOpen && <AuthModal />}
      </>
    );
  }

  // Admin
  if (profile?.role === 'admin') {
    return (
      <>
        <Navbar />
        <AdminPanel />
      </>
    );
  }

  // Worker — check if needs to complete registration
  if (profile?.role === 'worker') {
    return (
      <>
        <Navbar />
        <WorkerDashboard />
        {authModalOpen && <AuthModal />}
      </>
    );
  }

  // Regular user
  return (
    <>
      <Navbar />
      <UserDashboard />
      {authModalOpen && <AuthModal />}
    </>
  );
}

export default App;
