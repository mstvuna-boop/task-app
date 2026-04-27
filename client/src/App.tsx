import { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { api } from './api';
import { User, Task, TaskStatus, TaskPriority } from './types';
import LoginPage from './components/LoginPage';
import PendingPage from './components/PendingPage';
import AdminPanel from './components/AdminPanel';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import TaskForm from './components/TaskForm';
import CalendarView from './components/CalendarView';

type ViewMode = 'list' | 'calendar';
type FilterStatus = 'all' | TaskStatus;
type FilterPriority = 'all' | TaskPriority;

const statusTabs: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'pending', label: 'ממתינות' },
  { value: 'in_progress', label: 'בביצוע' },
];

export default function App() {
  const [user, setUser]       = useState<User | null>(null);
  const [pending, setPending] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const completedRef = useRef<HTMLDivElement>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(e => {
        if (e.message === 'pending') setPending(true);
        else setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      window.history.replaceState({}, '', '/');
      api.getMe().then(setUser).catch(e => { if (e.message === 'pending') setPending(true); });
    }
    if (params.get('pending') === 'true') {
      window.history.replaceState({}, '', '/');
      setPending(true);
    }
    if (params.get('error') === 'auth') {
      window.history.replaceState({}, '', '/');
      toast.error('הכניסה נכשלה, נסה שוב');
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setTasksLoading(true);
    try {
      setTasks(await api.getTasks());
    } catch {
      toast.error('שגיאה בטעינת משימות');
    } finally {
      setTasksLoading(false);
    }
  }, [user]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleCreateTask = async (data: Partial<Task>) => {
    setSavingNew(true);
    try {
      const task = await api.createTask(data);
      setTasks((prev) => [task, ...prev]);
      setShowNewTask(false);
      toast.success('משימה נוצרה בהצלחה!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleUpdateTask = (updated: Task) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  const handleDeleteTask = (id: number) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const matchesSearch = (t: Task) =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase());

  // Split: my tasks vs assigned to me
  const myTasks       = tasks.filter(t => t.user_id === user!.id);
  const inboxTasks    = tasks.filter(t => t.assigned_to === user!.id);

  // Main list — my active tasks only
  const filtered = myTasks.filter((t) => {
    if (t.status === 'completed') return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return matchesSearch(t);
  });

  // Inbox — active tasks assigned to me
  const filteredInbox = inboxTasks.filter(t => {
    if (t.status === 'completed') return false;
    return matchesSearch(t);
  });

  // Completed — my own completed + assigned-to-me completed
  const filteredCompleted = tasks.filter((t) => {
    if (t.status !== 'completed') return false;
    if (t.user_id !== user!.id && t.assigned_to !== user!.id) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return matchesSearch(t);
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-3"
            style={{ border: '4px solid var(--border)', borderTopColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (pending) return <PendingPage onLogout={() => { setPending(false); setUser(null); }} />;
  if (!user) return <LoginPage />;

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <Toaster position="top-center" toastOptions={{
        style: { fontFamily: 'inherit', direction: 'rtl', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      }} />
      <Header user={user} onLogout={() => setUser(null)} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Admin panel */}
        {user.is_admin && <AdminPanel />}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'סה"כ', value: stats.total, color: 'var(--accent)' },
            { label: 'ממתינות', value: stats.pending, color: 'var(--text-muted)' },
            { label: 'בביצוע', value: stats.inProgress, color: '#38bdf8' },
            { label: 'הושלמו', value: stats.completed, color: '#4ade80' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ ...cardStyle }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-2 mb-4">
          {[{ mode: 'list' as ViewMode, icon: '📋', label: 'רשימה' }, { mode: 'calendar' as ViewMode, icon: '📅', label: 'לוח שנה' }].map(({ mode, icon, label }) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200"
              style={viewMode === mode
                ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.4)' }
                : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        {viewMode === 'list' && (
          <div className="rounded-2xl p-4 mb-4" style={cardStyle}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>🔍</span>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש משימות..."
                  className="w-full rounded-xl pr-9 pl-4 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                className="rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="all">כל העדיפויות</option>
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </select>
              <button onClick={() => setShowNewTask(true)}
                className="font-semibold px-5 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.4)' }}
              >
                <span className="text-lg leading-none">+</span> משימה חדשה
              </button>
            </div>
            <div className="flex gap-1 mt-3">
              {statusTabs.map((tab) => (
                <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={filterStatus === tab.value
                    ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }
                    : { color: 'var(--text-muted)' }
                  }
                >
                  {tab.label}
                  {tab.value !== 'all' && <span className="mr-1 text-xs opacity-70">({tab.value === 'pending' ? stats.pending : stats.inProgress})</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'calendar' && <CalendarView tasks={tasks} onUpdate={handleUpdateTask} currentUserId={user!.id} />}

        {viewMode === 'list' && showNewTask && (
          <div className="rounded-2xl p-5 mb-4" style={{ ...cardStyle, borderColor: 'var(--accent)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--accent)' }}>✨ משימה חדשה</h2>
            <TaskForm onSubmit={handleCreateTask} onCancel={() => setShowNewTask(false)} loading={savingNew} currentUserId={user.id} />
          </div>
        )}

        {viewMode === 'list' && (tasksLoading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2"
              style={{ border: '4px solid var(--border)', borderTopColor: 'var(--accent)' }}></div>
            טוען משימות...
          </div>
        ) : (
          <>
            {/* ── Active tasks ── */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">{tasks.filter(t => t.status !== 'completed').length === 0 ? '📋' : '🔍'}</div>
                <p style={{ color: 'var(--text-muted)' }}>
                  {tasks.filter(t => t.status !== 'completed').length === 0 ? 'אין משימות פעילות' : 'לא נמצאו משימות'}
                </p>
                {tasks.length === 0 && (
                  <button onClick={() => setShowNewTask(true)} className="mt-4 text-sm font-medium underline" style={{ color: 'var(--accent)' }}>
                    הוסף את המשימה הראשונה שלך
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                ))}
              </div>
            )}

            {/* ── Inbox — tasks assigned to me ── */}
            {filteredInbox.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">📥</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>משימות שהוקצו לך</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}>
                    {filteredInbox.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredInbox.map(task => (
                    <TaskCard key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} currentUserId={user.id} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Completed section ── */}
            {filteredCompleted.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCompleted(v => !v)}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <span className="text-base">{showCompleted ? '▾' : '▸'}</span>
                  <span>✅ הושלמו</span>
                  <span className="mr-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                    {filteredCompleted.length}
                  </span>
                  <span className="mr-auto text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    {showCompleted ? 'הסתר' : 'הצג'}
                  </span>
                </button>

                {showCompleted && (
                  <div ref={completedRef} className="space-y-2 mt-2">
                    {filteredCompleted.map((task) => (
                      <TaskCard key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ))}
      </main>
    </div>
  );
}
