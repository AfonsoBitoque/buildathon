import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomeScreen } from './components/HomeScreen';
import { SignUpScreen } from './components/SignUpScreen';
import { LoginScreen } from './components/LoginScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { CreateHouseScreen } from './components/CreateHouseScreen';
import { JoinHouseScreen } from './components/JoinHouseScreen';
import { HouseSuccessScreen } from './components/HouseSuccessScreen';
import { HouseChatScreen } from './components/HouseChatScreen';
import { HouseTasksScreen } from './components/HouseTasksScreen';
import { ExpensesScreen } from './components/ExpensesScreen';
import HouseRulesScreen from './components/HouseRulesScreen';
import CalendarScreen from './components/CalendarScreen';
import ProfileScreen from './components/ProfileScreen';
import { getUserHouses } from './lib/houses';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}


function AuthRedirect() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserHouse();
    }
  }, [isAuthenticated, user]);

  const checkUserHouse = async () => {
    if (!user) return;

    try {
      const houses = await getUserHouses(user.id);
      if (houses.length > 0) {
        navigate(`/casa/${houses[0].id}/home`, { replace: true });
      } else {
        navigate('/lobby', { replace: true });
      }
    } catch (error) {
      console.error('Error checking user house:', error);
      navigate('/lobby', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white text-lg">A carregar...</div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <AuthRedirect /> : <HomeScreen />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignUpScreen />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginScreen />} />

      <Route path="/lobby" element={
        <ProtectedRoute>
          <LobbyScreen />
        </ProtectedRoute>
      } />

      <Route path="/criar-casa" element={
        <ProtectedRoute>
          <CreateHouseScreen />
        </ProtectedRoute>
      } />

      <Route path="/entrar-casa" element={
        <ProtectedRoute>
          <JoinHouseScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/sucesso" element={
        <ProtectedRoute>
          <HouseSuccessScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/home" element={
        <ProtectedRoute>
          <HouseChatScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/perfil" element={
        <ProtectedRoute>
          <ProfileScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/tarefas" element={
        <ProtectedRoute>
          <HouseTasksScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/despesas" element={
        <ProtectedRoute>
          <ExpensesScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/regras" element={
        <ProtectedRoute>
          <HouseRulesScreen />
        </ProtectedRoute>
      } />

      <Route path="/casa/:id/calendario" element={
        <ProtectedRoute>
          <CalendarScreen />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
