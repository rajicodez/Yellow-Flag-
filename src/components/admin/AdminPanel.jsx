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

const screens = {
  dashboard: DashboardScreen,
  races: RacesScreen,
  questions: QuestionsScreen,
  results: ResultsScreen,
  leaderboard: LeaderboardScreen,
  users: UsersScreen,
  settings: SettingsScreen,
};

export default function AdminPanel() {
  const [demoAuthenticated, setDemoAuthenticated] = useState(false);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const ActiveScreen = screens[activeScreen] ?? DashboardScreen;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeScreen, demoAuthenticated]);

  if (!demoAuthenticated) {
    return <AdminLogin onDemoLogin={() => setDemoAuthenticated(true)} />;
  }

  const handleDemoLogout = () => {
    setActiveScreen('dashboard');
    setDemoAuthenticated(false);
  };

  return (
    <AdminLayout activeScreen={activeScreen} onNavigate={setActiveScreen} onLogout={handleDemoLogout}>
      <ActiveScreen />
    </AdminLayout>
  );
}
