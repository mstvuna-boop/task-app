import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { api } from './api';
import { User, Task, TaskStatus, TaskPriority } from './types';
import LoginPage from './components/LoginPage';
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
  { value: 'completed', label: 'הושלמו' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      window.history.replaceState({}, '', '/');
      api.getMe().then(setUser).catch(() => {});
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
      const data = await api.getTasks();
      setTasks(data);
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

  const handleUpdateTask = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const cardStyle = { background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(0,229,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d1a' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-3" style={{ border: '4px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff' }}></div>
          <p style={{ color: '#7fb3c8' }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen" style={{ background: '#070d1a' }}>
      <Toaster position="top-center" toastOptions={{
        style: { fontFamily: 'inherit', direction: 'rtl', background: '#0d1f3c', color: '#e2e8f0', border: '1px solid rgba(0,229,255,0.3)' }
      }} />
      <Header user={user} onLogout={() => setUser(null)} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'סה"כ', value: stats.total, color: '#00e5ff', bg: 'rgba(0,229,255,0.08)' },
            { label: 'ממתינות', value: stats.pending, color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
            { label: 'בביצוע', value: stats.inProgress, color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
            { label: 'הושלמו', value: stats.completed, color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-sm mt-0.5" style={{ color: '#7fb3c8' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-2 mb-4">
          {[
            { mode: 'list' as ViewMode, icon: '📋', label: 'רשימה' },
            { mode: 'calendar' as ViewMode, icon: '📅', label: 'לוח שנה' },
          ].map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200"
              style={viewMode === mode
                ? { background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.4)' }
                : { background: 'rgba(255,255,255,0.05)', color: '#7fb3c8', border: '1px solid rgba(255,255,255,0.1)' }
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#7fb3c8' }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש משימות..."
                  className="w-full rounded-xl pr-9 pl-4 py-2 text-sm focus:outline-none"
                  style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', color: '#e2e8f0' }}
                />
              </div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                className="rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', color: '#e2e8f0' }}
              >
                <option value="all">כל העדיפויות</option>
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </select>
              <button
                onClick={() => setShowNewTask(true)}
                className="font-semibold px-5 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.4)', boxShadow: '0 0 15px rgba(0,229,255,0.1)' }}
              >
                <span className="text-lg leading-none">+</span>
                משימה חדשה
              </button>
            </div>
            <div className="flex gap-1 mt-3">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={filterStatus === tab.value
                    ? { background: 'rgba(0,229,255,0.15)', color: '#00e5ff' }
                    : { color: '#7fb3c8' }
                  }
                >
                  {tab.label}
                  {tab.value !== 'all' && (
                    <span className="mr-1 text-xs opacity-70">
                      ({tab.value === 'pending' ? stats.pending : tab.value === 'in_progress' ? stats.inProgress : stats.completed})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'calendar' && <CalendarView tasks={tasks} onUpdate={handleUpdateTask} />}

        {viewMode === 'list' && showNewTask && (
          <div className="rounded-2xl p-5 mb-4" style={{ ...cardStyle, borderColor: 'rgba(0,229,255,0.4)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#00e5ff' }}>✨ משימה חדשה</h2>
            <TaskForm onSubmit={handleCreateTask} onCancel={() => setShowNewTask(false)} loading={savingNew} />
          </div>
        )}

        {viewMode === 'list' && (tasksLoading ? (
          <div className="text-center py-12" style={{ color: '#7fb3c8' }}>
            <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2" style={{ border: '4px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff' }}></div>
            טוען משימות...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{tasks.length === 0 ? '📋' : '🔍'}</div>
            <p style={{ color: '#7fb3c8' }}>{tasks.length === 0 ? 'אין משימות עדיין' : 'לא נמצאו משימות'}</p>
            {tasks.length === 0 && (
              <button onClick={() => setShowNewTask(true)} className="mt-4 text-sm font-medium underline" style={{ color: '#00e5ff' }}>
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
        ))}
      </main>
    </div>
  );
}
