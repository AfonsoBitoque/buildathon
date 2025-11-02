import { LogOut, Mail, User, Hash, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function DashboardScreen() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full">
              <User className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white">
                Bem-vindo de volta!
              </h2>
              <p className="text-slate-400 mt-2">
                Sua conta está ativa e pronta para uso
              </p>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Informações da Conta
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Username</p>
                  <p className="text-white font-semibold font-mono">
                    {user.username}#{user.tag}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-white font-semibold break-all">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Hash className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Tag Única</p>
                  <p className="text-white font-semibold font-mono">
                    #{user.tag}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Membro desde</p>
                  <p className="text-white font-semibold">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-sm text-slate-300 text-center">
              <span className="font-semibold text-white">Dica:</span> Compartilhe seu username completo{' '}
              <span className="font-mono text-blue-400">{user.username}#{user.tag}</span>{' '}
              com outros utilizadores para se conectarem consigo.
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
