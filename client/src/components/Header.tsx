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
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <h1 className="text-xl font-bold text-gray-800">מנהל משימות</h1>
        </div>

        <div className="flex items-center gap-3">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name}
              className="w-8 h-8 rounded-full border-2 border-indigo-200"
            />
          )}
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-gray-700">{user.name}</div>
            <div className="text-xs text-gray-400">{user.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
          >
            התנתק
          </button>
        </div>
      </div>
    </header>
  );
}
