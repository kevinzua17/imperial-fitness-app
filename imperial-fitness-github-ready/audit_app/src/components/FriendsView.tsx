import React, { useEffect, useState } from 'react';
import { Check, Send, UserPlus, Users, X } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { acceptFriendRequestInApi, deleteFriendshipInApi, FriendshipApi, listFriendRequestsFromApi, listFriendsFromApi, listSentFriendRequestsFromApi, rejectFriendRequestInApi, sendFriendRequestInApi } from '../services/friendService';
import { discoverCommunityUsersFromApi } from '../services/communityService';

interface FriendsViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
}

export const FriendsView: React.FC<FriendsViewProps> = ({ currentUser, users }) => {
  const [friends, setFriends] = useState<FriendshipApi[]>([]);
  const [received, setReceived] = useState<FriendshipApi[]>([]);
  const [sent, setSent] = useState<FriendshipApi[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<ClientProfile[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    Promise.all([listFriendsFromApi(), listFriendRequestsFromApi(), listSentFriendRequestsFromApi(), discoverCommunityUsersFromApi()])
      .then(([f, r, s, d]) => { setFriends(f); setReceived(r); setSent(s); setDiscoverUsers(d); })
      .catch(() => setMsg('No se pudo cargar amistades desde la API.'));
  };

  useEffect(() => { load(); }, []);

  const allKnownUsers = discoverUsers.length > 0 ? [...discoverUsers, ...users] : users;
  const userName = (id: number) => allKnownUsers.find(u => Number(u.id) === id)?.name || `Usuario ${id}`;
  const availableUsers = (discoverUsers.length > 0 ? discoverUsers : users.filter(u => u.role === 'client')).filter(u => Number(u.id) !== Number(currentUser.id));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
          <Users className="w-3.5 h-3.5" /> Red privada
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Amigos y solicitudes</h1>
        <p className="text-sm text-neutral-400 mt-2">Envía solicitudes, acepta o rechaza invitaciones y elimina amistades cuando lo desees.</p>
      </div>
      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Agregar amigos" icon={<UserPlus className="w-4 h-4 text-red-500" />}>
          {availableUsers.length > 0 ? availableUsers.map(user => (
            <Row key={user.id} title={user.name} subtitle={user.email}>
              <button onClick={() => sendFriendRequestInApi(Number(user.id)).then(() => { setMsg('Solicitud enviada.'); load(); })} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold flex items-center gap-1"><Send className="w-3 h-3" /> Solicitar</button>
            </Row>
          )) : <Empty text="No hay usuarios disponibles para agregar." />}
        </Panel>

        <Panel title="Solicitudes recibidas" icon={<Check className="w-4 h-4 text-emerald-500" />}>
          {received.length > 0 ? received.map(req => (
            <Row key={req.id} title={userName(req.requester_id)} subtitle="Quiere agregarte como amigo">
              <div className="flex gap-1">
                <button onClick={() => acceptFriendRequestInApi(req.id).then(load)} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold">Aceptar</button>
                <button onClick={() => rejectFriendRequestInApi(req.id).then(load)} className="text-[10px] bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded font-bold">Rechazar</button>
              </div>
            </Row>
          )) : <Empty text="No tienes solicitudes pendientes." />}
        </Panel>

        <Panel title="Mis amigos" icon={<Users className="w-4 h-4 text-sky-500" />}>
          {friends.length > 0 ? friends.map(friend => {
            const otherId = friend.requester_id === Number(currentUser.id) ? friend.addressee_id : friend.requester_id;
            return <Row key={friend.id} title={userName(otherId)} subtitle="Amistad activa"><button onClick={() => deleteFriendshipInApi(friend.id).then(load)} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold flex items-center gap-1"><X className="w-3 h-3" /> Eliminar</button></Row>;
          }) : <Empty text="No tienes amigos agregados todavía." />}
          {sent.length > 0 && <div className="pt-3 border-t border-neutral-800"><span className="text-[10px] text-neutral-500 uppercase font-bold">Enviadas: {sent.length}</span></div>}
        </Panel>
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><div className="flex items-center gap-2 mb-4 border-b border-neutral-900 pb-3">{icon}<h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2></div><div className="space-y-2">{children}</div></div>;
const Row: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex items-center justify-between gap-3"><div><span className="text-xs font-bold text-white block">{title}</span><span className="text-[10px] text-neutral-500 block">{subtitle}</span></div>{children}</div>;
const Empty: React.FC<{ text: string }> = ({ text }) => <div className="py-8 text-center text-xs text-neutral-500">{text}</div>;