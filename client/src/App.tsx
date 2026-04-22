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

  // Check URL params after Google OAuth redirect
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

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'inherit', direction: 'rtl' } }} />
      <Header user={user} onLogout={() => setUser(null)} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'סה"כ', value: stats.total, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
            { label: 'ממתינות', value: stats.pending, color: 'bg-slate-50 text-slate-600 border-slate-100' },
            { label: 'בביצוע', value: stats.inProgress, color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { label: 'הושלמו', value: stats.completed, color: 'bg-green-50 text-green-700 border-green-100' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm mt-0.5 opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📋 רשימה
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📅 לוח שנה
          </button>
        </div>

        {/* Toolbar */}
        {viewMode === 'list' && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש משימות..."
                className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">כל העדיפויות</option>
              <option value="high">גבוהה</option>
              <option value="medium">בינונית</option>
              <option value="low">נמוכה</option>
            </select>

            {/* New task button */}
            <button
              onClick={() => setShowNewTask(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-lg leading-none">+</span>
              משימה חדשה
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 mt-3">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === tab.value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
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
        </div>}

        {/* Calendar view */}
        {viewMode === 'calendar' && (
          <CalendarView tasks={tasks} onUpdate={handleUpdateTask} />
        )}

        {/* New task form */}
        {viewMode === 'list' && showNewTask && (
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-5 mb-4">
            <h2 className="text-base font-semibold text-gray-800 mb-4">✨ משימה חדשה</h2>
            <TaskForm
              onSubmit={handleCreateTask}
              onCancel={() => setShowNewTask(false)}
              loading={savingNew}
            />
          </div>
        )}

        {/* Task list */}
        {viewMode === 'list' && (tasksLoading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-8 h-8 border-4 border-indigo-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            טוען משימות...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{tasks.length === 0 ? '📋' : '🔍'}</div>
            <p className="text-gray-500 font-medium">
              {tasks.length === 0 ? 'אין משימות עדיין' : 'לא נמצאו משימות'}
            </p>
            {tasks.length === 0 && (
              <button
                onClick={() => setShowNewTask(true)}
                className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium underline"
              >
                הוסף את המשימה הראשונה שלך
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}
