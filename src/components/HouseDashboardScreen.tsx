import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, LogOut, Copy, CheckCircle2, Loader2, Trophy, TrendingUp } from 'lucide-react';
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

interface MemberPoints {
  user_id: string;
  total_points: number;
  task_points: number;
  expense_points: number;
  username: string;
  tag: string;
}

interface HouseDashboardScreenProps {
  houseId: string;
}

export function HouseDashboardScreen({ houseId }: HouseDashboardScreenProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<HouseMemberWithUser[]>([]);
  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([]);
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

      const { data: pointsData, error: pointsError } = await supabase
        .from('house_member_points')
        .select(`
          user_id,
          total_points,
          task_points,
          expense_points,
          users!inner (
            username,
            tag
          )
        `)
        .eq('house_id', houseId)
        .order('total_points', { ascending: false });

      if (pointsError) throw pointsError;

      const formattedPoints = (pointsData || []).map((p: any) => ({
        user_id: p.user_id,
        total_points: p.total_points,
        task_points: p.task_points,
        expense_points: p.expense_points,
        username: p.users.username,
        tag: p.users.tag,
      }));

      setMemberPoints(formattedPoints);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-colivin-cobalt-500 animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!house) {
    return null;
  }

  const isCreator = house.created_by === user?.id;
  const currentUserPoints = memberPoints.find(m => m.user_id === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-colivin rounded-2xl shadow-colivin">
              <Home className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{house.name}</h1>
              <p className="text-gray-600 font-medium">
                {user?.username}#{user?.tag}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        {currentUserPoints && (
          <div className="bg-gradient-colivin rounded-2xl shadow-colivin-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 font-medium mb-1">Os Seus Pontos</p>
                <p className="text-4xl font-bold">{currentUserPoints.total_points}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-white/70">Tarefas: </span>
                    <span className="font-semibold">{currentUserPoints.task_points}</span>
                  </div>
                  <div>
                    <span className="text-white/70">Despesas: </span>
                    <span className="font-semibold">{currentUserPoints.expense_points}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Trophy className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-colivin p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-colivin-cobalt-100 rounded-xl">
                <Users className="w-6 h-6 text-colivin-cobalt-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Membros</h2>
                <p className="text-sm text-gray-600">{members.length} {members.length === 1 ? 'membro' : 'membros'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {members.map((member) => {
                const points = memberPoints.find(p => p.user_id === member.user_id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {member.users.username}#{member.users.tag}
                      </p>
                      {house.created_by === member.user_id && (
                        <p className="text-xs text-colivin-mint-600 font-medium">Criador</p>
                      )}
                    </div>
                    {points && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-colivin-cobalt-600">{points.total_points} pts</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-colivin p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-colivin-lime-100 rounded-xl">
                  <Copy className="w-6 h-6 text-colivin-lime-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Código de Convite</h2>
                  <p className="text-sm text-gray-600">Partilhe com os colegas</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={house.invite_code}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-mono font-bold text-center text-lg"
                />
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 bg-gradient-colivin hover:opacity-90 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="hidden sm:inline">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {memberPoints.length > 0 && (
              <div className="bg-white rounded-2xl shadow-colivin p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-yellow-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Top 3</h2>
                    <p className="text-sm text-gray-600">Membros mais ativos</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {memberPoints.slice(0, 3).map((member, index) => (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300' :
                        index === 1 ? 'bg-gray-100 border-2 border-gray-300' :
                        'bg-orange-50 border-2 border-orange-200'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-400 text-gray-900' :
                        'bg-orange-400 text-orange-900'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {member.username}#{member.tag}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{member.total_points}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isCreator && (
              <button
                onClick={handleLeaveHouse}
                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-300 text-red-700 font-semibold rounded-xl transition-all"
              >
                Sair da Casa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
