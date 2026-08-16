import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import AdminLogin from './AdminLogin';
import DashboardScreen from './screens/DashboardScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import QuestionsScreen from './screens/QuestionsScreen';
import RacesScreen from './screens/RacesScreen';
import ResultsScreen from './screens/ResultsScreen';
import SettingsScreen from './screens/SettingsScreen';
import UsersScreen from './screens/UsersScreen';
import RaceHistoryScreen from './screens/RaceHistoryScreen';
import useAdminRaceWorkspace from './useAdminRaceWorkspace';

const screens = {
  dashboard: DashboardScreen,
  races: RacesScreen,
  questions: QuestionsScreen,
  results: ResultsScreen,
  leaderboard: LeaderboardScreen,
  users: UsersScreen,
  raceHistory: RaceHistoryScreen,
  settings: SettingsScreen,
};

const screenForPath = (pathname) => (
  pathname === '/admin/race-history' ? 'raceHistory' : 'dashboard'
);

function AdminAccessLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070708] text-white">
      <div role="status" className="flex items-center gap-3 text-sm font-bold text-zinc-300">
        <LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" aria-hidden="true" />
        Verifying administrator access...
      </div>
    </main>
  );
}

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [access, setAccess] = useState({ status: 'checking', user: null, role: null, profile: null });
  const [activeScreen, setActiveScreen] = useState(() => screenForPath(location.pathname));
  const raceWorkspace = useAdminRaceWorkspace();
  const ActiveScreen = screens[activeScreen] ?? DashboardScreen;

  const verifySession = useCallback(async (session) => {
    if (!session?.user) {
      setAccess({ status: 'signed-out', user: null, role: null, profile: null });
      return;
    }

    try {
      const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .in('role', ['admin', 'super_admin']),
        supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle(),
      ]);

      if (rolesError) throw rolesError;
      if (profileError) throw profileError;

      const role = roles?.some((item) => item.role === 'super_admin')
        ? 'super_admin'
        : roles?.some((item) => item.role === 'admin')
          ? 'admin'
          : null;

      setAccess({
        status: role ? 'authorized' : 'forbidden',
        user: session.user,
        role,
        profile,
      });
    } catch {
      setAccess({ status: 'error', user: session.user, role: null, profile: null });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAccess({ status: 'unavailable', user: null, role: null, profile: null });
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAccess({ status: 'error', user: null, role: null, profile: null });
        return;
      }
      verifySession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) verifySession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [verifySession]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeScreen, access.status]);

  useEffect(() => {
    if (location.pathname === '/admin/race-history') {
      setActiveScreen('raceHistory');
    } else {
      setActiveScreen((current) => current === 'raceHistory' ? 'dashboard' : current);
    }
  }, [location.pathname]);

  if (access.status === 'checking') return <AdminAccessLoading />;

  if (access.status !== 'authorized') {
    const messages = {
      forbidden: 'This account is signed in but does not have an Admin or Super Admin role.',
      error: 'Administrator access could not be verified. Please try signing in again.',
      unavailable: 'Supabase authentication is not configured for this deployment.',
    };
    return <AdminLogin initialError={messages[access.status]} onAuthenticated={verifySession} />;
  }

  const handleLogout = async () => {
    setActiveScreen('dashboard');
    navigate('/admin', { replace: true });
    await supabase.auth.signOut();
  };

  const handleNavigate = (screenId) => {
    setActiveScreen(screenId);
    const nextPath = screenId === 'raceHistory' ? '/admin/race-history' : '/admin';
    if (location.pathname !== nextPath) navigate(nextPath);
  };

  return (
    <AdminLayout
      activeScreen={activeScreen}
      adminUser={{ ...access.user, ...access.profile, role: access.role }}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      <ActiveScreen {...raceWorkspace} onNavigate={handleNavigate} />
    </AdminLayout>
  );
}
