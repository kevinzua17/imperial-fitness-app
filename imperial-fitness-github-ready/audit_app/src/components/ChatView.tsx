import React, { useEffect, useState } from 'react';
import { CheckCheck, MessageSquare, Send } from 'lucide-react';
import { ChatMessage, ClientProfile } from '../data/mockData';
import { ChatMessageApi, listChatMessagesByPathFromApi, listConversationsFromApi, sendChatMessageToApi } from '../services/chatService';

interface ChatViewProps {
  currentUser: ClientProfile;
}

function mapMessage(message: ChatMessageApi, currentUser: ClientProfile, users: ClientProfile[]): ChatMessage {
  const sender = users.find(user => Number(user.id) === message.sender_id);
  return {
    id: String(message.id),
    senderId: String(message.sender_id),
    senderName: sender?.name || (message.sender_id === Number(currentUser.id) ? currentUser.name : `Usuario ${message.sender_id}`),
    text: message.text,
    timestamp: new Date(message.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  };
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<ClientProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    listConversationsFromApi()
      .then(users => {
        setConversations(users);
        if (users[0]) setSelectedUserId(users[0].id);
      })
      .catch(() => setMsg('No se pudieron cargar conversaciones.'));
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    listChatMessagesByPathFromApi(selectedUserId)
      .then(rows => setMessages(rows.map(row => mapMessage(row, currentUser, conversations))))
      .catch(() => setMsg('No se pudieron cargar mensajes.'));
  }, [selectedUserId, conversations, currentUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUserId) return;
    sendChatMessageToApi(selectedUserId, inputText.trim())
      .then(row => {
        setMessages(prev => [...prev, mapMessage(row, currentUser, conversations)]);
        setInputText('');
      })
      .catch(() => setMsg('No se pudo enviar el mensaje.'));
  };

  const selectedUser = conversations.find(user => user.id === selectedUserId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-3 min-h-[650px]">
        <aside className="border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-950">
          <div className="p-4 border-b border-neutral-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Conversaciones</h2>
            <p className="text-[11px] text-neutral-500 mt-1">Mensajes guardados en backend.</p>
          </div>
          <div className="p-2 space-y-1 max-h-[580px] overflow-y-auto">
            {conversations.map(user => (
              <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full flex items-center gap-2 rounded-lg p-2 text-left transition-colors ${selectedUserId === user.id ? 'bg-red-950/30 border border-red-900/50' : 'hover:bg-neutral-900 border border-transparent'}`}>
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-neutral-700" />
                <div className="min-w-0"><span className="text-xs font-bold text-white block truncate">{user.name}</span><span className="text-[10px] text-neutral-500 uppercase">{user.role}</span></div>
              </button>
            ))}
            {conversations.length === 0 && <div className="p-6 text-center text-xs text-neutral-500">Aún no tienes conversaciones disponibles.</div>}
          </div>
        </aside>

        <section className="md:col-span-2 flex flex-col min-h-[650px]">
          <div className="bg-neutral-900 px-5 py-3.5 border-b border-neutral-800 flex items-center gap-3">
            {selectedUser ? <img src={selectedUser.avatar} alt={selectedUser.name} className="w-10 h-10 rounded-full object-cover border border-neutral-700" /> : <MessageSquare className="w-8 h-8 text-neutral-700" />}
            <div><span className="text-xs font-bold text-white block">{selectedUser?.name || 'Selecciona una conversación'}</span><span className="text-[10px] text-neutral-500">Chat REST real</span></div>
          </div>
          {msg && <div className="m-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-neutral-400">{msg}</div>}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-950/40">
            {messages.length === 0 && <div className="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-500"><MessageSquare className="w-12 h-12 text-neutral-800 mb-3" /><p>Aún no hay mensajes.</p></div>}
            {messages.map(message => {
              const isMe = message.senderId === currentUser.id;
              return <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}><div className="flex items-baseline gap-1.5 mb-0.5 px-1"><span className="text-[10px] font-bold text-neutral-400">{isMe ? 'Tú' : message.senderName}</span><span className="text-[8px] text-neutral-600">{message.timestamp}</span></div><div className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-neutral-900 text-neutral-300 rounded-bl-none'}`}>{message.text}</div>{isMe && <span className="text-[9px] text-neutral-600 flex items-center gap-0.5 mt-0.5 pr-1"><CheckCheck className="w-3 h-3 text-red-500" /> Enviado</span>}</div>;
            })}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-neutral-900 border-t border-neutral-800 flex gap-2 items-center">
            <input type="text" disabled={!selectedUserId} placeholder={selectedUserId ? 'Escribe un mensaje...' : 'Selecciona una conversación'} value={inputText} onChange={e => setInputText(e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-600 disabled:opacity-60" />
            <button type="submit" disabled={!inputText.trim() || !selectedUserId} className="bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-700 text-white font-bold p-3 rounded-xl"><Send className="w-4 h-4" /></button>
          </form>
        </section>
      </div>
    </div>
  );
};