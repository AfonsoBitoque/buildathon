import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, DollarSign, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HouseExpensesScreen } from './HouseExpensesScreen';
import { SharedExpensesScreen } from './SharedExpensesScreen';
import { HouseFooter } from './HouseFooter';

type TabType = 'house' | 'shared';

export function ExpensesScreen() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('house');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="flex-1 pb-20">
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Despesas</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Voltar ao Dashboard"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-slate-800 rounded-xl p-1 mb-6 flex gap-1">
            <button
              onClick={() => setActiveTab('house')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'house'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              Despesas da Casa
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'shared'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Users className="w-5 h-5" />
              Despesas Partilhadas
            </button>
          </div>

          {activeTab === 'house' ? <HouseExpensesScreen /> : <SharedExpensesScreen />}
        </div>
      </div>

      <HouseFooter />
    </div>
  );
}
