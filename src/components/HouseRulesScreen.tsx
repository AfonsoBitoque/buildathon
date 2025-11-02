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
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function HouseRulesContent({ houseId, houseName, houseCreatorId }: HouseRulesScreenProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<HouseRules | null>(null);
  const [content, setContent] = useState('');
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
        .maybeSingle();

      if (fetchError) throw fetchError;

      setRules(data);
      setContent(data?.content || '');
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Erro ao carregar as regras da casa.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isCreator) {
      alert('Apenas o criador da casa pode editar as regras.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (rules) {
        const { error: updateError } = await supabase
          .from('house_rules')
          .update({ content: content.trim() })
          .eq('id', rules.id);

        if (updateError) throw updateError;
      } else {
        const { data: newRules, error: insertError } = await supabase
          .from('house_rules')
          .insert({
            house_id: houseId,
            content: content.trim(),
            created_by: user!.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setRules(newRules);
      }

      setIsEditing(false);
      await loadRules();
    } catch (err) {
      console.error('Error saving rules:', err);
      setError('Erro ao salvar as regras. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(rules?.content || '');
    setIsEditing(false);
    setError(null);
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
              {isCreator && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {isCreator && isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Defina as regras da casa
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva aqui as regras da casa... &#10;&#10;Exemplo:&#10;1. Manter a casa limpa e organizada&#10;2. Respeitar os horários de silêncio (22h-8h)&#10;3. Avisar com antecedência quando convidar visitas&#10;4. Dividir igualmente as tarefas domésticas&#10;5. Comunicar qualquer problema ou conflito de forma respeitosa"
                    className="w-full h-96 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                    disabled={saving}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {content.length} caracteres
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        A guardar...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar Regras
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {content && content.trim() !== '' ? (
                  <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-700">
                    <pre className="whitespace-pre-wrap text-slate-200 font-sans text-base leading-relaxed">
                      {content}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="bg-slate-700/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ScrollText className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">
                      Nenhuma regra definida
                    </h3>
                    <p className="text-slate-500 text-sm mb-4">
                      {isCreator
                        ? 'Clique em "Editar" para adicionar as regras da casa.'
                        : 'O criador da casa ainda não definiu as regras.'}
                    </p>
                  </div>
                )}

                {!isCreator && content && content.trim() !== '' && (
                  <div className="mt-6 bg-blue-900/20 border border-blue-600/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Estas regras foram definidas pelo criador da casa. Todos os membros devem
                        respeitá-las para uma convivência harmoniosa.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isCreator && !isEditing && (
          <div className="mt-6 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">Nota:</strong> Como criador da casa, apenas você
                pode editar estas regras. Todos os membros podem visualizá-las.
              </span>
            </p>
          </div>
        )}
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
