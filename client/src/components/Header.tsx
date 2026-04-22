import { User } from '../types';
import { api } from '../api';
import toast from 'react-hot-toast';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: Props) {
  const handleLogout = async () => {
    try {
      await api.logout();
      onLogout();
    } catch {
      toast.error('שגיאה בהתנתקות');
    }
  };

  return (
    <header className="sticky top-0 z-10" style={{ background: 'rgba(7,13,26,0.95)', borderBottom: '1px solid rgba(0,229,255,0.2)', boxShadow: '0 2px 20px rgba(0,229,255,0.08)', backdropFilter: 'blur(10px)' }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="תבונה" className="h-10 object-contain" />
        </div>

        <div className="flex items-center gap-3">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name}
              className="w-8 h-8 rounded-full"
              style={{ border: '2px solid rgba(0,229,255,0.5)', boxShadow: '0 0 10px rgba(0,229,255,0.2)' }}
            />
          )}
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{user.name}</div>
            <div className="text-xs" style={{ color: '#7fb3c8' }}>{user.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: '#7fb3c8', border: '1px solid rgba(0,229,255,0.2)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#ff6b6b';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,107,0.4)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,107,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#7fb3c8';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.2)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            התנתק
          </button>
        </div>
      </div>
    </header>
  );
}
