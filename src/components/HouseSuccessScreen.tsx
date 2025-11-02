import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { CheckCircle2, Copy, Home, ArrowLeft, LogOut } from 'lucide-react';
import { House } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function HouseSuccessScreen() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [house, setHouse] = useState<House | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stateData = location.state as { house?: House; isCreator?: boolean };
    if (stateData?.house) {
      setHouse(stateData.house);
      setIsCreator(stateData.isCreator || searchParams.get('creator') === 'true');
    } else {
      navigate('/lobby', { replace: true });
    }
  }, [location.state, searchParams, navigate]);

  const handleCopyCode = async () => {
    if (!house) return;
    try {
      await navigator.clipboard.writeText(house.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!house) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/casa/${id}/home`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Ir para Casa
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
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-10 h-10 text-green-400" strokeWidth={2.5} />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white">
                {isCreator ? 'Casa Criada!' : 'Entrou na Casa!'}
              </h2>
              <p className="text-slate-400 mt-2">
                {isCreator ? 'A sua casa foi criada com sucesso' : 'Juntou-se com sucesso à casa'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Home className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Nome da Casa</p>
                  <p className="text-lg font-semibold text-white">{house.name}</p>
                </div>
              </div>

              {isCreator && (
                <>
                  <div className="border-t border-slate-600 pt-4">
                    <p className="text-sm text-slate-400 mb-2">Código de Convite</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-lg px-4 py-3">
                        <p className="text-2xl font-mono font-bold text-white tracking-widest text-center">
                          {house.invite_code}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="p-3 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-400 mt-2 text-center">
                        Código copiado!
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-slate-300 text-center">
                      Partilhe este código com outras pessoas para que possam entrar na sua casa.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/casa/${id}/home`)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
            >
              Ir para Casa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
