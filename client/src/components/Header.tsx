import { User } from '../types';
import { api } from '../api';
import toast from 'react-hot-toast';

interface Props {
  user: User;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Header({ user, onLogout, isDark, onToggleTheme }: Props) {
  const handleLogout = async () => {
    try {
      await api.logout();
      onLogout();
    } catch {
      toast.error('שגיאה בהתנתקות');
    }
  };

  return (
    <header className="sticky top-0 z-10" style={{
      background: 'var(--header-bg)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 2px 20px rgba(var(--accent-rgb), 0.08)',
      backdropFilter: 'blur(10px)',
    }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <img src="/logo.png" alt="תבונה" className="h-10 object-contain" />

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="px-3 py-1.5 rounded-lg text-sm transition-all duration-200"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            title={isDark ? 'מצב בהיר' : 'מצב כהה'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {user.picture && (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full"
              style={{ border: '2px solid var(--border)' }} />
          )}
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            התנתק
          </button>
        </div>
      </div>
    </header>
  );
}
