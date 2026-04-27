import { api } from '../api';

export default function PendingPage({ onLogout }: { onLogout: () => void }) {
  const handleLogout = async () => {
    await api.logout();
    onLogout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-main)' }}>
      <div className="rounded-2xl p-10 max-w-md w-full text-center" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          ממתין לאישור
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          הבקשה שלך להצטרף למערכת נשלחה למנהל.
          תקבל גישה לאחר אישור.
        </p>
        <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          🔒 מערכת זו פנימית ומוגבלת למשתמשים מאושרים בלבד
        </div>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 rounded-xl transition-all"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--bg-card-alt)' }}
        >
          התנתק
        </button>
      </div>
    </div>
  );
}
