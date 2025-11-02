import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, LogOut, Loader2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { HouseFooter } from './HouseFooter';

interface ChatMessage {
  id: string;
  house_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  users: {
    username: string;
    tag: string;
  };
}

interface House {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export function HouseChatScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: houseId } = useParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && houseId) {
      loadHouseData();
      loadMessages();
      subscribeToMessages();
    }
  }, [user, houseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const loadMessages = async () => {
    if (!houseId) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          house_id,
          user_id,
          content,
          created_at,
          updated_at,
          is_edited,
          users (
            username,
            tag
          )
        `)
        .eq('house_id', houseId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!houseId) return;

    const channel = supabase
      .channel(`chat:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `house_id=eq.${houseId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('chat_messages')
              .select(`
                id,
                house_id,
                user_id,
                content,
                created_at,
                updated_at,
                is_edited,
                users (
                  username,
                  tag
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) => [...prev, data as ChatMessage]);
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            const { data } = await supabase
              .from('chat_messages')
              .select(`
                id,
                house_id,
                user_id,
                content,
                created_at,
                updated_at,
                is_edited,
                users (
                  username,
                  tag
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) =>
                prev.map((msg) => (msg.id === data.id ? (data as ChatMessage) : msg))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !houseId || !user) return;

    setSending(true);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        house_id: houseId,
        user_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem. Por favor, tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{house.name}</h1>
          <p className="text-sm text-slate-400">Chat Geral</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/casa/${houseId}/perfil`)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="text-sm">Perfil</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">
              Nenhuma mensagem ainda. Seja o primeiro a enviar!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 opacity-90">
                      {message.users.username}#{message.users.tag}
                    </p>
                  )}
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {formatTime(message.created_at)}
                    {message.is_edited && ' (editado)'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-7xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escreva uma mensagem..."
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar
              </>
            )}
          </button>
        </form>
      </div>

      <HouseFooter />
    </div>
  );
}
