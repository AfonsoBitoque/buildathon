import { useNavigate } from 'react-router-dom';
import { Home, Plus, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LobbyScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-end">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
            <Home className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Bem-vindo!
            </h1>
            <p className="text-lg text-slate-300 mt-2">
              Olá, <span className="font-semibold text-blue-400">{user.username}#{user.tag}</span>
            </p>
          </div>

          <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
            Crie uma nova casa ou entre numa casa existente usando um código de convite.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/criar-casa')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Criar Casa
          </button>

          <button
            onClick={() => navigate('/entrar-casa')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <LogIn className="w-5 h-5" />
            Inserir Convite
          </button>
        </div>
      </div>
    </div>
  );
}
