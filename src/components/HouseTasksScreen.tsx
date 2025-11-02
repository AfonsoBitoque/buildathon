import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Circle, CheckCircle2, Loader2, LogOut, Calendar, User, CheckSquare, Check, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { HouseFooter } from './HouseFooter';

interface HouseTask {
  id: string;
  house_id: string;
  created_by: string;
  title: string;
  deadline_days: number;
  created_at: string;
  completed_at: string | null;
  is_completed: boolean;
  users: {
    username: string;
    tag: string;
  };
}

interface House {
  id: string;
  name: string;
}

export function HouseTasksScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: houseId } = useParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [tasks, setTasks] = useState<HouseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<HouseTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  useEffect(() => {
    if (user && houseId) {
      loadHouseData();
      loadTasks();
      const cleanup = subscribeToTasks();
      return cleanup;
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
    } catch (error) {
      console.error('Error loading house data:', error);
      navigate('/lobby', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!houseId) return;

    try {
      const { data, error } = await supabase
        .from('house_tasks')
        .select(`
          id,
          house_id,
          created_by,
          title,
          deadline_days,
          created_at,
          completed_at,
          is_completed,
          users (
            username,
            tag
          )
        `)
        .eq('house_id', houseId)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const subscribeToTasks = () => {
    if (!houseId) return;

    const channel = supabase
      .channel(`tasks:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'house_tasks',
          filter: `house_id=eq.${houseId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('house_tasks')
              .select(`
                id,
                house_id,
                created_by,
                title,
                deadline_days,
                created_at,
                completed_at,
                is_completed,
                users (
                  username,
                  tag
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data && !data.is_completed) {
              setTasks((prev) => [data as HouseTask, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_completed) {
              setTasks((prev) => prev.filter((task) => task.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((task) => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTaskTitle.trim() || !houseId || !user) return;

    const deadlineDays = parseInt(newTaskDeadline);
    if (isNaN(deadlineDays) || deadlineDays <= 0) {
      alert('Por favor, insira um prazo válido (número de dias maior que 0).');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.from('house_tasks').insert({
        house_id: houseId,
        created_by: user.id,
        title: newTaskTitle.trim(),
        deadline_days: deadlineDays,
      }).select(`
        id,
        house_id,
        created_by,
        title,
        deadline_days,
        created_at,
        completed_at,
        is_completed,
        users (
          username,
          tag
        )
      `).single();

      if (error) throw error;

      if (data && !data.is_completed) {
        setTasks((prev) => [data as HouseTask, ...prev]);
      }

      setNewTaskTitle('');
      setNewTaskDeadline('7');
      setShowNewTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Erro ao criar tarefa. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSelect = (taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
    setEditingTask(null);
  };

  const handleCompleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setSelectedTaskId(null);

    try {
      const { error } = await supabase
        .from('house_tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Erro ao concluir tarefa. Por favor, tente novamente.');
      await loadTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta tarefa?')) return;

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setSelectedTaskId(null);

    try {
      const { error } = await supabase
        .from('house_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erro ao eliminar tarefa. Por favor, tente novamente.');
      await loadTasks();
    }
  };

  const handleStartEdit = (task: HouseTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDeadline(task.deadline_days.toString());
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditDeadline('');
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editTitle.trim()) return;

    const deadlineDays = parseInt(editDeadline);
    if (isNaN(deadlineDays) || deadlineDays <= 0) {
      alert('Por favor, insira um prazo válido (número de dias maior que 0).');
      return;
    }

    try {
      const { error } = await supabase
        .from('house_tasks')
        .update({
          title: editTitle.trim(),
          deadline_days: deadlineDays,
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, title: editTitle.trim(), deadline_days: deadlineDays }
            : task
        )
      );

      setEditingTask(null);
      setEditTitle('');
      setEditDeadline('');
      setSelectedTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Erro ao atualizar tarefa. Por favor, tente novamente.');
    }
  };

  const getDeadlineDate = (createdAt: string, deadlineDays: number) => {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + deadlineDays);
    return date;
  };

  const isOverdue = (createdAt: string, deadlineDays: number) => {
    const deadline = getDeadlineDate(createdAt, deadlineDays);
    return deadline < new Date();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{house.name}</h1>
          <p className="text-sm text-slate-400">Tarefas</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              Tarefas Ativas ({tasks.length})
            </h2>
            <button
              onClick={() => setShowNewTask(!showNewTask)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Tarefa
            </button>
          </div>

          {showNewTask && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Criar Nova Tarefa</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Título da Tarefa
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ex: Comprar mantimentos"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Prazo (dias)
                  </label>
                  <input
                    type="number"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    min="1"
                    max="365"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting || !newTaskTitle.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                  >
                    {submitting ? 'A criar...' : 'Criar Tarefa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTask(false);
                      setNewTaskTitle('');
                      setNewTaskDeadline('7');
                    }}
                    disabled={submitting}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-xl">
              <CheckSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                Nenhuma tarefa pendente. Crie uma nova tarefa!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const overdue = isOverdue(task.created_at, task.deadline_days);
                const deadlineDate = getDeadlineDate(task.created_at, task.deadline_days);
                const isSelected = selectedTaskId === task.id;
                const isEditing = editingTask?.id === task.id;

                return (
                  <div key={task.id} className="space-y-2">
                    <div
                      className={`bg-slate-800 rounded-xl p-4 border ${
                        isSelected
                          ? 'border-blue-500'
                          : overdue
                          ? 'border-red-500/50'
                          : 'border-slate-700'
                      } hover:border-slate-600 transition-colors`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleToggleSelect(task.id)}
                          className={`mt-1 transition-colors ${
                            isSelected
                              ? 'text-blue-500'
                              : 'text-slate-400 hover:text-blue-400'
                          }`}
                          title="Selecionar tarefa"
                        >
                          {isSelected ? (
                            <CheckCircle2 className="w-6 h-6 fill-current" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {task.title}
                          </h3>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                              <User className="w-4 h-4" />
                              <span>
                                {task.users.username}#{task.users.tag}
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-2 ${
                                overdue ? 'text-red-400' : 'text-slate-400'
                              }`}
                            >
                              <Calendar className="w-4 h-4" />
                              <span>
                                Prazo: {task.deadline_days} dias (
                                {deadlineDate.toLocaleDateString('pt-PT')})
                              </span>
                            </div>
                          </div>

                          {overdue && (
                            <div className="mt-2 text-xs text-red-400 font-medium">
                              ⚠️ Tarefa atrasada
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && !isEditing && (
                      <div className="bg-slate-700/50 rounded-xl p-3 flex items-center justify-end gap-2 animate-in slide-in-from-top duration-200">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                          title="Concluir"
                        >
                          <Check className="w-4 h-4" />
                          Concluir
                        </button>
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    )}

                    {isEditing && (
                      <div className="bg-slate-700/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top duration-200">
                        <h4 className="text-sm font-semibold text-white">Editar Tarefa</h4>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Título
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Prazo (dias)
                          </label>
                          <input
                            type="number"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            min="1"
                            max="365"
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <HouseFooter />
    </div>
  );
}
