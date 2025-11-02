import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { joinHouseByInviteCode } from '../lib/houses';
import { useAuth } from '../context/AuthContext';

export function JoinHouseScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteCode || inviteCode.trim().length !== 8) {
      setError('O código de convite deve ter 8 caracteres');
      return;
    }

    if (!user) {
      setError('Utilizador não autenticado');
      return;
    }

    setLoading(true);

    try {
      const house = await joinHouseByInviteCode(inviteCode, user.id);
      navigate(`/casa/${house.id}/home`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar na casa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-block p-3 bg-cyan-500/20 rounded-xl">
              <Key className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Entrar na Casa</h2>
            <p className="text-slate-400">Insira o código de convite</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Código de Convite (8 caracteres)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-lg tracking-wider text-center"
                  placeholder="XXXXXXXX"
                  disabled={loading}
                  maxLength={8}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                O código foi fornecido pelo criador da casa
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || inviteCode.length !== 8}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  A entrar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Entrar na Casa
                </>
              )}
            </button>
          </form>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-xs text-slate-400 text-center">
              Peça o código de convite ao criador ou administrador da casa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
