import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

export function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
            <UserPlus className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-5xl font-bold text-white tracking-tight">
            UniApp Login
          </h1>

          <p className="text-lg text-slate-300 max-w-sm mx-auto leading-relaxed">
            Sistema de autenticação moderno com tags únicas.
            Crie sua conta e junte-se à comunidade.
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <LogIn className="w-5 h-5" />
            Entrar
          </button>

          <button
            onClick={() => navigate('/signup')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <UserPlus className="w-5 h-5" />
            Registar
          </button>
        </div>

        <div className="pt-8">
          <p className="text-sm text-slate-500">
            Versão 1.0 • Sistema seguro de autenticação
          </p>
        </div>
      </div>
    </div>
  );
}
