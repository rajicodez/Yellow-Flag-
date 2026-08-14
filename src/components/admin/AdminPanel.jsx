import { useEffect, useState } from 'react';
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
import { useLocation, useNavigate } from 'react-router-dom';

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

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [demoAuthenticated, setDemoAuthenticated] = useState(false);
  const [activeScreen, setActiveScreen] = useState(() => screenForPath(location.pathname));
  const raceWorkspace = useAdminRaceWorkspace();
  const ActiveScreen = screens[activeScreen] ?? DashboardScreen;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeScreen, demoAuthenticated]);

  useEffect(() => {
    if (location.pathname === '/admin/race-history') {
      setActiveScreen('raceHistory');
    } else {
      setActiveScreen((current) => current === 'raceHistory' ? 'dashboard' : current);
    }
  }, [location.pathname]);

  if (!demoAuthenticated) {
    return <AdminLogin onDemoLogin={() => setDemoAuthenticated(true)} />;
  }

  const handleDemoLogout = () => {
    setActiveScreen('dashboard');
    navigate('/admin', { replace: true });
    setDemoAuthenticated(false);
  };

  const handleNavigate = (screenId) => {
    setActiveScreen(screenId);
    const nextPath = screenId === 'raceHistory' ? '/admin/race-history' : '/admin';
    if (location.pathname !== nextPath) navigate(nextPath);
  };

  return (
    <AdminLayout activeScreen={activeScreen} onNavigate={handleNavigate} onLogout={handleDemoLogout}>
      <ActiveScreen {...raceWorkspace} onNavigate={handleNavigate} />
    </AdminLayout>
  );
}
