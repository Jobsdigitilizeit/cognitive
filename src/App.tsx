import { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, initializeStorage, logoutUser, getSystemSettings } from './services/storage';
import { HomePage } from './components/HomePage';
import { AuthModal } from './components/AuthModal';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  // Initialize storage once on boot
  useEffect(() => {
    initializeStorage();
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    const settings = getSystemSettings();
    setIsSupabaseConnected(settings.isSupabaseConfigured);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthModalMode(null);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // If user is not authenticated: Show Comprehensive Research Home Page & Auth Modal
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HomePage onOpenAuth={mode => setAuthModalMode(mode)} />

        <AuthModal
          isOpen={authModalMode !== null}
          initialMode={authModalMode || 'login'}
          onClose={() => setAuthModalMode(null)}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Once authenticated: HomePage is removed entirely, user sees dedicated dashboard and relevant content
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        isSupabaseConnected={isSupabaseConnected}
      />

      <main className="flex-1 pb-16">
        {currentUser.role === 'admin' ? (
          <AdminPortal
            currentUser={currentUser}
            onSupabaseStatusChange={connected => setIsSupabaseConnected(connected)}
          />
        ) : (
          <StudentDashboard user={currentUser} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Cognitive-Behavioural Adaptive Learning System</span>
          <span className="font-mono text-[11px] text-slate-400">
            Real Telemetry Active • Academic Higher Education Environment
          </span>
        </div>
      </footer>
    </div>
  );
}
