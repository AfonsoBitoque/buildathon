import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { loginUser } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { User } from '../lib/supabase';

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!identifier || !password) {
      setError('Todos os campos são obrigatórios');
      return false;
    }

    if (password.length < 6) {
      setError('Palavra-passe deve ter pelo menos 6 caracteres');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const userData = await loginUser(identifier, password);
      setSuccess(true);

      setTimeout(() => {
        login(userData as User);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Entrar</h2>
            <p className="text-slate-400">Aceda à sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email ou Username#Tag
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="email@exemplo.com ou usuario#A1B2"
                  disabled={loading || success}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pode usar seu email ou username no formato username#tag
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading || success}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Login bem-sucedido! Redirecionando...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {success ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => navigate('/signup')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
              disabled={loading || success}
            >
              Não tem conta? <span className="text-blue-400 font-semibold">Registar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
