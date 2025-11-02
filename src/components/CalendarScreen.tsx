import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, X, Clock, User, AlertCircle, Repeat, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { HouseFooter } from './HouseFooter';

interface House {
  id: string;
  name: string;
  created_by: string;
}

interface CalendarEvent {
  id: string;
  house_id: string;
  created_by: string;
  title: string;
  description: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  event_type: 'single' | 'recurring';
  event_date: string | null;
  created_at: string;
  creator?: {
    username: string;
    tag: string;
  };
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarScreen() {
  const { user } = useAuth();
  const { id: houseId } = useParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    day_of_week: 0,
    start_time: '09:00',
    end_time: '10:00',
    event_type: 'single' as 'single' | 'recurring',
    event_date: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && houseId) {
      loadHouseData();
      loadEvents();
    }
  }, [user, houseId, currentWeekStart]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getWeekDates(): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

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
    }
  };

  const loadEvents = async () => {
    if (!houseId) return;

    setLoading(true);
    try {
      const weekDates = getWeekDates();
      const weekStart = formatDate(weekDates[0]);
      const weekEnd = formatDate(weekDates[6]);

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          users (
            username,
            tag
          )
        `)
        .eq('house_id', houseId)
        .or(`event_type.eq.recurring,and(event_type.eq.single,event_date.gte.${weekStart},event_date.lte.${weekEnd})`);

      if (error) throw error;

      const formattedEvents = (data || []).map(event => ({
        ...event,
        creator: event.users,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConflict = (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    eventDate: string | null,
    excludeEventId?: string
  ): boolean => {
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    return events.some(event => {
      if (excludeEventId && event.id === excludeEventId) return false;

      if (event.event_type === 'recurring') {
        if (event.day_of_week !== dayOfWeek) return false;
      } else {
        if (event.event_date !== eventDate) return false;
      }

      const existingStart = timeToMinutes(event.start_time);
      const existingEnd = timeToMinutes(event.end_time);

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }

    if (newEvent.start_time >= newEvent.end_time) {
      setError('A hora de fim deve ser posterior à hora de início.');
      return;
    }

    const eventDate = newEvent.event_type === 'single' ? newEvent.event_date : null;

    if (newEvent.event_type === 'single' && !eventDate) {
      setError('Por favor, selecione uma data para a atividade única.');
      return;
    }

    if (checkConflict(newEvent.day_of_week, newEvent.start_time, newEvent.end_time, eventDate)) {
      setError('Já existe uma atividade agendada neste horário. Por favor, escolha outro horário.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          house_id: houseId,
          created_by: user!.id,
          title: newEvent.title.trim(),
          description: newEvent.description.trim(),
          day_of_week: newEvent.day_of_week,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          event_type: newEvent.event_type,
          event_date: eventDate,
        });

      if (insertError) throw insertError;

      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        day_of_week: 0,
        start_time: '09:00',
        end_time: '10:00',
        event_type: 'single',
        event_date: '',
      });
      await loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Erro ao criar atividade. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta atividade?')) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setSelectedEvent(null);
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Erro ao eliminar atividade.');
    }
  };

  const getEventsForDay = (dayOfWeek: number, date: Date): CalendarEvent[] => {
    const dateStr = formatDate(date);
    return events.filter(event => {
      if (event.event_type === 'recurring') {
        return event.day_of_week === dayOfWeek;
      } else {
        return event.event_date === dateStr;
      }
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(getWeekStart(newDate));
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  if (loading && !house) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">A carregar calendário...</p>
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

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Calendário Partilhado</h1>
                  <p className="text-green-100 text-sm mt-1">{house.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm"
              >
                <Plus className="w-4 h-4" />
                Nova Atividade
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateWeek('prev')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                ← Semana Anterior
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Próxima Semana →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day, index) => {
                const date = weekDates[index];
                const isToday = formatDate(new Date()) === formatDate(date);
                const dayEvents = getEventsForDay(index, date);

                return (
                  <div key={index} className="min-h-[500px]">
                    <div className={`p-3 rounded-t-xl text-center font-semibold ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      <div className="text-sm">{day}</div>
                      <div className="text-xs mt-1 opacity-80">
                        {date.getDate()}/{date.getMonth() + 1}
                      </div>
                    </div>
                    <div className="bg-slate-900/30 rounded-b-xl p-2 min-h-[450px] space-y-2">
                      {dayEvents.length === 0 ? (
                        <p className="text-slate-500 text-xs text-center mt-4">Sem atividades</p>
                      ) : (
                        dayEvents
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map(event => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="w-full text-left p-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all duration-200 shadow-lg"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-white font-semibold text-sm line-clamp-2">
                                  {event.title}
                                </p>
                                {event.event_type === 'recurring' && (
                                  <Repeat className="w-3 h-3 text-white/70 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-blue-100 text-xs mb-1">
                                <Clock className="w-3 h-3" />
                                <span>{event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-blue-200 text-xs">
                                <User className="w-3 h-3" />
                                <span>{event.creator?.username}#{event.creator?.tag}</span>
                              </div>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova Atividade</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título da Atividade *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="ex: Máquina de Lavar, Cozinhar Jantar"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de Atividade *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewEvent({ ...newEvent, event_type: 'single' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      newEvent.event_type === 'single'
                        ? 'border-green-500 bg-green-900/20'
                        : 'border-slate-600 bg-slate-900/30 hover:bg-slate-900/50'
                    }`}
                    disabled={submitting}
                  >
                    <CalendarDays className={`w-6 h-6 mx-auto mb-2 ${
                      newEvent.event_type === 'single' ? 'text-green-400' : 'text-slate-400'
                    }`} />
                    <p className={`text-sm font-medium ${
                      newEvent.event_type === 'single' ? 'text-green-300' : 'text-slate-300'
                    }`}>
                      Única
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Ocorre apenas uma vez</p>
                  </button>
                  <button
                    onClick={() => setNewEvent({ ...newEvent, event_type: 'recurring' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      newEvent.event_type === 'recurring'
                        ? 'border-green-500 bg-green-900/20'
                        : 'border-slate-600 bg-slate-900/30 hover:bg-slate-900/50'
                    }`}
                    disabled={submitting}
                  >
                    <Repeat className={`w-6 h-6 mx-auto mb-2 ${
                      newEvent.event_type === 'recurring' ? 'text-green-400' : 'text-slate-400'
                    }`} />
                    <p className={`text-sm font-medium ${
                      newEvent.event_type === 'recurring' ? 'text-green-300' : 'text-slate-300'
                    }`}>
                      Semanal
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Repete toda semana</p>
                  </button>
                </div>
              </div>

              {newEvent.event_type === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => {
                      const date = new Date(e.target.value + 'T00:00:00');
                      setNewEvent({
                        ...newEvent,
                        event_date: e.target.value,
                        day_of_week: date.getDay()
                      });
                    }}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                  />
                </div>
              )}

              {newEvent.event_type === 'recurring' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dia da Semana *
                  </label>
                  <select
                    value={newEvent.day_of_week}
                    onChange={(e) => setNewEvent({ ...newEvent, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hora de Início *
                  </label>
                  <input
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hora de Fim *
                  </label>
                  <input
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição (Opcional)
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Adicione detalhes sobre a atividade..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      A criar...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Criar Atividade
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="bg-slate-700 p-2 rounded-lg">
                  {selectedEvent.event_type === 'recurring' ? (
                    <Repeat className="w-5 h-5 text-blue-400" />
                  ) : (
                    <CalendarDays className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Tipo</p>
                  <p className="text-slate-200">
                    {selectedEvent.event_type === 'recurring' ? 'Atividade Semanal' : 'Atividade Única'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <div className="bg-slate-700 p-2 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {selectedEvent.event_type === 'recurring' ? 'Dia da Semana' : 'Data'}
                  </p>
                  <p className="text-slate-200">
                    {selectedEvent.event_type === 'recurring'
                      ? DAYS_OF_WEEK[selectedEvent.day_of_week]
                      : new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <div className="bg-slate-700 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Horário</p>
                  <p className="text-slate-200">
                    {selectedEvent.start_time.slice(0, 5)} - {selectedEvent.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <div className="bg-slate-700 p-2 rounded-lg">
                  <User className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Criado por</p>
                  <p className="text-slate-200">
                    {selectedEvent.creator?.username}#{selectedEvent.creator?.tag}
                  </p>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-sm font-medium text-slate-400 mb-2">Descrição</p>
                  <p className="text-slate-200 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.created_by === user?.id && (
                <div className="pt-4 border-t border-slate-700">
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Eliminar Atividade
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <HouseFooter />
      </div>
    </div>
  );
}
