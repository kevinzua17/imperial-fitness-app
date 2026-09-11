import React, { useEffect, useState } from 'react';
import { CreditCard, UserCircle } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { ProfileView } from './ProfileView';
import { MembershipView } from './MembershipView';

interface AccountHubViewProps {
  currentUser: ClientProfile;
  onAvatarUpdated: (avatarUrl: string) => void;
  onProfileUpdated?: (profile: ClientProfile) => void;
  onMembershipUpdated?: () => void;
  initialTab?: 'profile' | 'membership';
}

export const AccountHubView: React.FC<AccountHubViewProps> = ({ currentUser, onAvatarUpdated, onProfileUpdated, onMembershipUpdated, initialTab = 'profile' }) => {
  const [tab, setTab] = useState<'profile' | 'membership'>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="flex gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-2">
          <button type="button" onClick={() => setTab('profile')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-black ${tab === 'profile' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-900'}`}><span className="inline-flex items-center gap-2"><UserCircle className="h-4 w-4" />Perfil</span></button>
          <button type="button" onClick={() => setTab('membership')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-black ${tab === 'membership' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-900'}`}><span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4" />Membresía y pagos</span></button>
        </div>
      </div>
      {tab === 'profile'
        ? <ProfileView currentUser={currentUser} onAvatarUpdated={onAvatarUpdated} onProfileUpdated={onProfileUpdated} />
        : <MembershipView currentUser={currentUser} onMembershipUpdated={onMembershipUpdated} />}
    </div>
  );
};
