import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Crown, Trash2, BarChart3, AlertCircle, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface House {
  id: string;
  name: string;
  created_by: string;
}

interface HouseMember {
  id: string;
  user_id: string;
  joined_at: string;
  users: {
    username: string;
    tag: string;
  };
}

interface MemberPoints {
  user_id: string;
  points: number;
  users: {
    username: string;
    tag: string;
  };
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { id: houseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseMember | null>(null);

  const isCreator = house?.created_by === user?.id;

  useEffect(() => {
    if (user && houseId) {
      loadData();
    }
  }, [user, houseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHouseData(),
        loadMembers(),
        loadPoints()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const loadHouseData = async () => {
    if (!houseId) return;

    const { data, error } = await supabase
      .from('houses')
      .select('id, name, created_by')
      .eq('id', houseId)
      .single();

    if (error) throw error;
    setHouse(data);
  };

  const loadMembers = async () => {
    if (!houseId) return;

    const { data, error } = await supabase
      .from('house_members')
      .select(`
        id,
        user_id,
        joined_at,
        users (
          username,
          tag
        )
      `)
      .eq('house_id', houseId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    setMembers(data || []);
  };

  const loadPoints = async () => {
    if (!houseId) return;

    // Get all house members
    const { data: membersData, error: membersError } = await supabase
      .from('house_members')
      .select(`
        user_id,
        users (
          username,
          tag
        )
      `)
      .eq('house_id', houseId);

    if (membersError) throw membersError;

    // Get points for members
    const { data: pointsData, error: pointsError } = await supabase
      .from('member_points')
      .select('user_id, points')
      .eq('house_id', houseId);

    if (pointsError) throw pointsError;

    // Merge data: all members with their points (or 0 if no points)
    const pointsMap = new Map(pointsData?.map(p => [p.user_id, p]) || []);
    const mergedData = (membersData || []).map(member => ({
      user_id: member.user_id,
      points: pointsMap.get(member.user_id)?.points || 0,
      users: member.users
    }));

    // Sort by points descending
    mergedData.sort((a, b) => b.points - a.points);

    setMemberPoints(mergedData);
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === house?.created_by) {
      alert('Não é possível remover o criador da casa.');
      return;
    }

    if (!confirm('Tem certeza que deseja remover este membro da casa?')) {
      return;
    }

    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('house_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) throw deleteError;

      await loadData();
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Erro ao remover membro. Por favor, tente novamente.');
    }
  };

  const handlePromoteToCreator = async () => {
    if (!selectedMember) return;

    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('houses')
        .update({ created_by: selectedMember.user_id })
        .eq('id', houseId);

      if (updateError) throw updateError;

      setShowPromoteModal(false);
      setSelectedMember(null);
      await loadData();

      alert('Membro promovido a criador da casa com sucesso!');
    } catch (error) {
      console.error('Error promoting member:', error);
      setError('Erro ao promover membro. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">A carregar perfil...</p>
        </div>
      </div>
    );
  }

  if (!house || !houseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Casa não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Perfil da Casa</h1>
                  <p className="text-purple-100 text-sm mt-1">{house.name}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/casa/${houseId}/home`)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm"
              >
                Voltar
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {error && (
              <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Sistema de Pontos</h2>
              </div>

              <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-700">
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Despesa Fixa</p>
                    <p className="text-green-400 font-bold text-lg">+1 ponto</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Despesa Flutuante</p>
                    <p className="text-green-400 font-bold text-lg">+2 pontos</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Dívida Paga</p>
                    <p className="text-green-400 font-bold text-lg">+3 pontos</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Tarefa Concluída</p>
                    <p className="text-green-400 font-bold text-lg">+5 pontos</p>
                  </div>
                </div>

                {memberPoints.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">Nenhum ponto registado ainda.</p>
                    <p className="text-slate-600 text-sm mt-2">Complete tarefas e pague despesas para ganhar pontos!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Posição</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Membro</th>
                          <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Tarefas</th>
                          <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Fixas</th>
                          <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Dívidas</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-semibold text-sm">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberPoints.map((member, index) => {
                          const isCurrentUser = member.user_id === user?.id;
                          const positionBg =
                            index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/50' :
                            index === 1 ? 'bg-gradient-to-r from-slate-400/20 to-slate-500/20 border-slate-400/50' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-orange-600/50' :
                            isCurrentUser ? 'bg-blue-900/20 border-blue-500/30' : 'hover:bg-slate-800/30';

                          const positionTextColor =
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-slate-300' :
                            index === 2 ? 'text-orange-400' :
                            'text-slate-400';

                          return (
                            <tr
                              key={member.user_id}
                              className={`border-b border-slate-700/50 transition-colors ${positionBg} ${index < 3 ? 'border-2' : ''}`}
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                                    index === 1 ? 'bg-slate-400 text-slate-900' :
                                    index === 2 ? 'bg-orange-600 text-white' :
                                    'bg-slate-700 text-slate-300'
                                  }`}>
                                    {index + 1}º
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-col">
                                  <p className={`font-bold ${isCurrentUser ? 'text-blue-400' : 'text-slate-200'}`}>
                                    {member.users.username}#{member.users.tag}
                                  </p>
                                  {isCurrentUser && (
                                    <span className="text-blue-500 text-xs mt-0.5">(Você)</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-purple-400 font-semibold">{member.task_points}</span>
                                  <span className="text-slate-500 text-xs">{member.task_points / 5} tarefas</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-green-400 font-semibold">{member.fixed_expense_points}</span>
                                  <span className="text-slate-500 text-xs">{member.fixed_expense_points} pagos</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-blue-400 font-semibold">{member.shared_debt_points}</span>
                                  <span className="text-slate-500 text-xs">{member.shared_debt_points / 3} dívidas</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <span className={`text-2xl font-bold ${positionTextColor}`}>
                                  {member.points}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {isCreator && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-xl font-bold text-white">Gestão de Membros</h2>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                    Apenas Criador
                  </span>
                </div>

                <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-700">
                  <div className="space-y-3">
                    {members.map((member) => {
                      const isHouseCreator = member.user_id === house.created_by;
                      const isMe = member.user_id === user?.id;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-600"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-700 p-2 rounded-full">
                              <User className="w-5 h-5 text-slate-300" />
                            </div>
                            <div>
                              <p className="text-slate-200 font-semibold">
                                {member.users.username}#{member.users.tag}
                                {isMe && <span className="text-blue-500 text-sm ml-2">(Você)</span>}
                              </p>
                              <p className="text-slate-500 text-xs">
                                Entrou em {new Date(member.joined_at).toLocaleDateString('pt-PT')}
                              </p>
                            </div>
                            {isHouseCreator && (
                              <div className="bg-yellow-500/20 px-3 py-1 rounded-full">
                                <p className="text-yellow-400 text-xs font-semibold flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  Criador
                                </p>
                              </div>
                            )}
                          </div>

                          {!isHouseCreator && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setShowPromoteModal(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                <Crown className="w-4 h-4" />
                                Promover
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id, member.user_id)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 bg-blue-900/20 border border-blue-600/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Nota:</strong> Ao promover um membro a Criador, você transfere todos os
                        privilégios administrativos para esse membro. Esta ação não pode ser desfeita
                        facilmente.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPromoteModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Promover a Criador</h2>
              </div>
              <button
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedMember(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-orange-900/20 border border-orange-600/50 rounded-xl p-4">
                <p className="text-orange-300 text-sm">
                  <strong>Atenção:</strong> Esta ação irá transferir a propriedade da casa para:
                </p>
                <p className="text-white font-bold mt-2">
                  {selectedMember.users.username}#{selectedMember.users.tag}
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm text-slate-300">
                <p><strong className="text-white">O novo criador poderá:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Remover membros da casa</li>
                  <li>Promover outros membros a criador</li>
                  <li>Editar as regras da casa</li>
                  <li>Ter controle total sobre a casa</li>
                </ul>
              </div>

              <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  <strong>Aviso:</strong> Você perderá seus privilégios de criador após esta ação.
                  Certifique-se de que confia neste membro.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePromoteToCreator}
                  className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Confirmar Promoção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
