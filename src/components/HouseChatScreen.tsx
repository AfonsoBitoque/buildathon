import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Loader2, MessageCircle } from 'lucide-react';
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
  const { user } = useAuth();
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
      const unsubscribe = subscribeToMessages();
      return unsubscribe;
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
    const channel = supabase
      .channel(`chat:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `house_id=eq.${houseId}`,
        },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user || !houseId) return;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-colivin-cobalt-500 animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">A carregar chat...</p>
        </div>
      </div>
    );
  }

  if (!house) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="bg-white border-b-2 border-gray-200 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-colivin rounded-xl">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{house.name}</h1>
              <p className="text-sm text-gray-600 font-medium">Chat Geral</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">Ainda não há mensagens</p>
              <p className="text-sm text-gray-500 mt-1">Seja o primeiro a enviar uma mensagem!</p>
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
                    className={`max-w-[70%] ${
                      isOwnMessage
                        ? 'bg-gradient-colivin text-white'
                        : 'bg-white text-gray-900 border-2 border-gray-200'
                    } rounded-2xl px-4 py-3 shadow-md`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold text-colivin-cobalt-600 mb-1">
                        {message.users.username}#{message.users.tag}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-white/70' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {message.is_edited && ' (editado)'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t-2 border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escreva uma mensagem..."
              className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-gradient-colivin hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <HouseFooter />
      </div>
    </div>
  );
}
