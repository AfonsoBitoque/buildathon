import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, LogOut, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getHouseMembers } from '../lib/houses';
import { House } from '../lib/supabase';
import { supabase } from '../lib/supabase';

interface HouseMemberWithUser {
  id: string;
  joined_at: string;
  user_id: string;
  users: {
    username: string;
    tag: string;
  };
}

interface HouseDashboardScreenProps {
  houseId: string;
}

export function HouseDashboardScreen({ houseId }: HouseDashboardScreenProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<HouseMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && houseId) {
      loadHouseData();
    }
  }, [user, houseId]);

  const loadHouseData = async () => {
    if (!user || !houseId) return;

    try {
      const { data: houseData, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('id', houseId)
        .single();

      if (houseError) throw houseError;

      const { data: memberData, error: memberError } = await supabase
        .from('house_members')
        .select('*')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberData) {
        navigate('/lobby', { replace: true });
        return;
      }

      setHouse(houseData);
      const houseMembers = await getHouseMembers(houseId);
      setMembers(houseMembers as HouseMemberWithUser[]);
    } catch (error) {
      console.error('Error loading house data:', error);
      navigate('/lobby', { replace: true });
    } finally {
      setLoading(false);
    }
  };

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

  const handleLeaveHouse = async () => {
    if (!house || !user) return;

    const confirmed = confirm('Tem certeza que deseja sair desta casa?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('house_members')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving house:', error);
        alert('Erro ao sair da casa. Por favor, tente novamente.');
      } else {
        navigate('/lobby', { replace: true });
      }
    } catch (error) {
      console.error('Error leaving house:', error);
      alert('Erro ao sair da casa. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-300">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!house) {
    return null;
  }

  const isCreator = house.created_by === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <Home className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{house.name}</h1>
              <p className="text-slate-400 text-sm">
                {user?.username}#{user?.tag}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Home className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Informações da Casa</h2>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Nome da Casa</p>
                <p className="text-lg font-semibold text-white">{house.name}</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">Código de Convite</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-lg px-4 py-2">
                    <p className="text-xl font-mono font-bold text-white tracking-widest text-center">
                      {house.invite_code}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
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
                  <p className="text-xs text-green-400 mt-1 text-center">
                    Código copiado!
                  </p>
                )}
              </div>

              {isCreator && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-slate-300 text-center">
                    Você é o criador desta casa
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Membros ({members.length})
              </h2>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {member.users.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {member.users.username}#{member.users.tag}
                      </p>
                      <p className="text-xs text-slate-400">
                        Entrou {new Date(member.joined_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  {member.user_id === house.created_by && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      Criador
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Ações</h3>
          <button
            onClick={handleLeaveHouse}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sair da Casa
          </button>
        </div>
      </div>
    </div>
  );
}
