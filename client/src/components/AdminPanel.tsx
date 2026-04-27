import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

type AdminUser = { id: string; name: string; email: string; picture?: string; approved: number; created_at: string };

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try { setUsers(await api.getAdminUsers()); }
    catch { toast.error('שגיאה בטעינת משתמשים'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const pending  = users.filter(u => !u.approved);
  const approved = users.filter(u => u.approved);

  const handleApprove = async (userId: string) => {
    await api.approveUser(userId);
    toast.success('משתמש אושר ✓');
    load();
  };

  const handleRevoke = async (userId: string) => {
    await api.revokeUser(userId);
    toast.success('גישה בוטלה');
    load();
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
      >
        🛡️ ניהול משתמשים
        {pending.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#f87171' }}>
            {pending.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-bold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>ניהול גישה למערכת</h3>

          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>טוען...</p>
          ) : (
            <>
              {/* Pending users */}
              {pending.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-2 uppercase" style={{ color: '#f87171' }}>
                    ⏳ ממתינים לאישור ({pending.length})
                  </p>
                  <div className="space-y-2">
                    {pending.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        {u.picture && <img src={u.picture} className="w-8 h-8 rounded-full" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                        <button
                          onClick={() => handleApprove(u.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                          style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
                        >✓ אשר</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved users */}
              <div>
                <p className="text-xs font-semibold mb-2 uppercase" style={{ color: '#4ade80' }}>
                  ✅ משתמשים מאושרים ({approved.length})
                </p>
                <div className="space-y-2">
                  {approved.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                      {u.picture && <img src={u.picture} className="w-8 h-8 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleRevoke(u.id)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      >בטל גישה</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
