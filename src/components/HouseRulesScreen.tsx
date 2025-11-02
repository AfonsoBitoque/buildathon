import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ScrollText, Save, Edit3, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { HouseFooter } from './HouseFooter';

interface House {
  id: string;
  name: string;
  created_by: string;
}

interface HouseRulesScreenProps {
  houseId: string;
  houseName: string;
  houseCreatorId: string;
}

interface HouseRules {
  id: string;
  house_id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
}

function HouseRulesContent({ houseId, houseName, houseCreatorId }: HouseRulesScreenProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<HouseRules[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingRule, setEditingRule] = useState<HouseRules | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = user?.id === houseCreatorId;

  useEffect(() => {
    loadRules();
  }, [houseId]);

  const loadRules = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('house_rules')
        .select('*')
        .eq('house_id', houseId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setRules(data || []);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Erro ao carregar as regras da casa.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!isCreator) {
      alert('Apenas o criador da casa pode criar regras.');
      return;
    }

    if (!newTitle.trim()) {
      alert('Por favor, insira um título para a regra.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('house_rules')
        .insert({
          house_id: houseId,
          title: newTitle.trim(),
          description: newDescription.trim() || '',
          created_by: user!.id,
        });

      if (insertError) throw insertError;

      setNewTitle('');
      setNewDescription('');
      await loadRules();
    } catch (err) {
      console.error('Error saving rules:', err);
      setError('Erro ao salvar as regras. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRule = async () => {
    if (!isCreator || !editingRule) {
      return;
    }

    if (!editTitle.trim()) {
      alert('Por favor, insira um título para a regra.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('house_rules')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || '',
        })
        .eq('id', editingRule.id);

      if (updateError) throw updateError;

      setEditingRule(null);
      setEditTitle('');
      setEditDescription('');
      await loadRules();
    } catch (err) {
      console.error('Error updating rule:', err);
      setError('Erro ao atualizar a regra. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!isCreator) {
      alert('Apenas o criador da casa pode eliminar regras.');
      return;
    }

    if (!confirm('Tem certeza que deseja eliminar esta regra?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('house_rules')
        .delete()
        .eq('id', ruleId);

      if (deleteError) throw deleteError;

      await loadRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
      alert('Erro ao eliminar a regra.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">A carregar regras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <ScrollText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Regras da Casa</h1>
                  <p className="text-blue-100 text-sm mt-1">{houseName}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {isCreator && (
              <div className="mb-6 bg-slate-900/30 rounded-xl p-6 border border-slate-700 space-y-4">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Adicionar Nova Regra</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Horário de silêncio"
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex: Manter silêncio entre 22h e 8h"
                    className="w-full h-24 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={saving}
                  />
                </div>
                <button
                  onClick={handleCreateRule}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      A criar...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Adicionar Regra
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-4">
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div key={rule.id} className="bg-slate-900/30 rounded-xl p-6 border border-slate-700">
                    {editingRule?.id === rule.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Título</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full h-24 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            disabled={saving}
                          />
                        </div>
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => {
                              setEditingRule(null);
                              setEditTitle('');
                              setEditDescription('');
                            }}
                            disabled={saving}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleEditRule}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-200 mb-2">{rule.title}</h3>
                            {rule.description && (
                              <p className="text-slate-400 text-sm whitespace-pre-wrap">{rule.description}</p>
                            )}
                          </div>
                          {isCreator && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingRule(rule);
                                  setEditTitle(rule.title);
                                  setEditDescription(rule.description || '');
                                }}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="bg-slate-700/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ScrollText className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">
                    Nenhuma regra definida
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {isCreator
                      ? 'Adicione as regras da casa acima.'
                      : 'O criador da casa ainda não definiu as regras.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <HouseFooter />
      </div>
    </div>
  );
}

export default function HouseRulesScreen() {
  const { user } = useAuth();
  const { id: houseId } = useParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && houseId) {
      loadHouseData();
    }
  }, [user, houseId]);

  const loadHouseData = async () => {
    if (!houseId) return;

    try {
      const { data, error } = await supabase
        .from('houses')
        .select('id, name, created_by')
        .eq('id', houseId)
        .single();

      if (error) throw error;

      setHouse(data);
    } catch (error) {
      console.error('Error loading house:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">A carregar...</p>
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
    <HouseRulesContent
      houseId={houseId}
      houseName={house.name}
      houseCreatorId={house.created_by}
    />
  );
}
