import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Loader2, CheckCircle2, Home } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="bg-white rounded-3xl shadow-colivin-lg p-8 space-y-8 border border-gray-100">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-colivin rounded-2xl mb-2">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-colivin bg-clip-text text-transparent">
              Co-Livin
            </h1>
            <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
            <p className="text-gray-600">Aceda à sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email ou Username#Tag
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
                  placeholder="email@exemplo.com ou usuario#A1B2"
                  disabled={loading || success}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Pode usar seu email ou username no formato username#tag
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
                  placeholder="Insira a sua palavra-passe"
                  disabled={loading || success}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-colivin-mint-50 border-2 border-colivin-mint-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-colivin-mint-600" />
                <p className="text-sm text-colivin-mint-700 font-medium">Login efetuado com sucesso!</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-4 bg-gradient-colivin hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-colivin disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  A entrar...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Sucesso!
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-gray-600">
              Não tem conta?{' '}
              <button
                onClick={() => navigate('/registar')}
                className="text-colivin-cobalt-600 hover:text-colivin-cobalt-700 font-semibold transition-colors"
              >
                Criar conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
