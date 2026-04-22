import { useState } from 'react';
import { Task } from '../types';
import { api } from '../api';
import toast from 'react-hot-toast';

interface Props {
  tasks: Task[];
  onUpdate: (task: Task) => void;
}

type CalendarMode = 'day' | 'week' | 'month';

const DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const priorityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getTasksForDay(tasks: Task[], date: Date) {
  return tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), date));
}

function TaskPill({ task, onDragStart, onMoveToDay, compact = false }: {
  task: Task;
  onDragStart: () => void;
  onMoveToDay?: (date: Date) => void;
  compact?: boolean;
}) {
  const [showMove, setShowMove] = useState(false);
  const [moveDate, setMoveDate] = useState('');

  const handleMove = async () => {
    if (!moveDate || !onMoveToDay) return;
    onMoveToDay(new Date(moveDate));
    setShowMove(false);
    setMoveDate('');
  };

  return (
    <div className="group relative">
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
        className={`cursor-grab active:cursor-grabbing border rounded-lg truncate transition-all
          ${task.status === 'completed' ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' : priorityColor[task.priority]}
          ${compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}`}
        title={task.title}
      >
        <span className="flex items-center gap-1">
          {task.status === 'completed' ? '✓ ' : ''}
          {task.title}
        </span>
      </div>
      {!compact && task.status !== 'completed' && (
        <div className="hidden group-hover:flex absolute left-0 top-0 bottom-0 items-center gap-1 bg-white/90 rounded-lg px-1 z-10 shadow-sm border border-gray-100">
          <button
            onClick={() => {
              const tomorrow = new Date(task.due_date ? new Date(task.due_date) : new Date());
              tomorrow.setDate(tomorrow.getDate() + 1);
              onMoveToDay?.(tomorrow);
            }}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded whitespace-nowrap"
          >למחר</button>
          <button
            onClick={() => setShowMove(!showMove)}
            className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-0.5 rounded whitespace-nowrap"
          >העבר ל...</button>
        </div>
      )}
      {showMove && (
        <div className="absolute z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-3 mt-1 min-w-[200px]">
          <p className="text-xs text-gray-500 mb-2">בחר תאריך חדש:</p>
          <input
            type="date"
            value={moveDate}
            onChange={e => setMoveDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm mb-2"
          />
          <div className="flex gap-2">
            <button onClick={handleMove} className="flex-1 bg-indigo-600 text-white text-xs py-1 rounded-lg">אשר</button>
            <button onClick={() => setShowMove(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-1 rounded-lg">ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarView({ tasks, onUpdate }: Props) {
  const today = new Date();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const moveTaskToDay = async (task: Task, targetDate: Date) => {
    const src = task.due_date ? new Date(task.due_date) : new Date();
    targetDate.setHours(src.getHours() || 9, src.getMinutes() || 0);
    try {
      const updated = await api.updateTask(task.id, { ...task, due_date: targetDate.toISOString() });
      onUpdate(updated);
      toast.success(`הועבר ל-${targetDate.toLocaleDateString('he-IL')}`);
    } catch {
      toast.error('שגיאה בהעברת המשימה');
    }
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTask) { moveTaskToDay(draggedTask, new Date(date)); setDraggedTask(null); }
  };

  // ─── Navigation ───────────────────────────────────────────────
  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (mode === 'day') d.setDate(d.getDate() + dir);
    else if (mode === 'week') d.setDate(d.getDate() + dir * 7);
    else { d.setMonth(d.getMonth() + dir); d.setDate(1); }
    setCurrentDate(d);
  };

  const getTitle = () => {
    if (mode === 'day') {
      return currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (mode === 'week') {
      const start = getWeekStart(currentDate);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const goToToday = () => setCurrentDate(new Date());

  // ─── Week helpers ──────────────────────────────────────────────
  const getWeekStart = (d: Date) => {
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay()); // Sunday start
    return s;
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  };

  // ─── Month helpers ─────────────────────────────────────────────
  const getMonthCells = () => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  };

  const DayCell = ({ date, fullHeight = false }: { date: Date; fullHeight?: boolean }) => {
    const dayTasks = getTasksForDay(tasks, date);
    const isToday = isSameDay(date, today);
    const isPast = date < today && !isToday;
    return (
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDrop(e, date)}
        className={`${fullHeight ? 'min-h-[120px]' : 'min-h-[80px]'} p-1.5 rounded-xl border transition-all
          ${isToday ? 'border-indigo-400 bg-indigo-50' : isPast ? 'border-gray-100 bg-gray-50/50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
      >
        <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
          ${isToday ? 'bg-indigo-600 text-white' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
          {date.getDate()}
        </div>
        <div className="space-y-0.5">
          {dayTasks.slice(0, fullHeight ? 10 : 3).map(t => (
            <TaskPill
              key={t.id}
              task={t}
              compact={!fullHeight}
              onDragStart={() => setDraggedTask(t)}
              onMoveToDay={d => moveTaskToDay(t, d)}
            />
          ))}
          {dayTasks.length > (fullHeight ? 10 : 3) && (
            <div className="text-xs text-gray-400 text-center">+{dayTasks.length - (fullHeight ? 10 : 3)} נוספות</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['day', 'week', 'month'] as CalendarMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'day' ? 'יום' : m === 'week' ? 'שבוע' : 'חודש'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 text-lg">›</button>
            <div className="text-center min-w-[180px]">
              <span className="text-sm font-semibold text-gray-800">{getTitle()}</span>
            </div>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 text-lg">‹</button>
          </div>

          <button onClick={goToToday} className="text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors">
            היום
          </button>
        </div>
      </div>

      {/* ─── DAY VIEW ─── */}
      {mode === 'day' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`text-lg font-bold px-3 py-1 rounded-xl ${isSameDay(currentDate, today) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          {(() => {
            const dayTasks = getTasksForDay(tasks, currentDate);
            if (dayTasks.length === 0) return (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>אין משימות ביום זה</p>
              </div>
            );
            const groups = [
              { label: '🔴 עדיפות גבוהה', items: dayTasks.filter(t => t.priority === 'high' && t.status !== 'completed') },
              { label: '🟡 עדיפות בינונית', items: dayTasks.filter(t => t.priority === 'medium' && t.status !== 'completed') },
              { label: '🟢 עדיפות נמוכה', items: dayTasks.filter(t => t.priority === 'low' && t.status !== 'completed') },
              { label: '✅ הושלמו', items: dayTasks.filter(t => t.status === 'completed') },
            ].filter(g => g.items.length > 0);
            return (
              <div className="space-y-4">
                {groups.map(g => (
                  <div key={g.label}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{g.label}</h4>
                    <div className="space-y-2">
                      {g.items.map(t => (
                        <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                          t.status === 'completed' ? 'bg-gray-50 border-gray-100' : priorityColor[t.priority] + ' bg-opacity-30'
                        }`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                            {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                            {t.due_date && <p className="text-xs text-gray-400 mt-0.5">⏰ {new Date(t.due_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>}
                          </div>
                          {t.status !== 'completed' && (
                            <button
                              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()+1); moveTaskToDay(t,d); }}
                              className="text-xs bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
                            >למחר ›</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── WEEK VIEW ─── */}
      {mode === 'week' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_FULL.map((d, i) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{DAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getWeekDays().map((date, i) => (
              <DayCell key={i} date={date} fullHeight />
            ))}
          </div>
        </div>
      )}

      {/* ─── MONTH VIEW ─── */}
      {mode === 'month' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
          <div className="grid grid-cols-7 mb-2">
            {DAYS_FULL.map((d, i) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{DAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getMonthCells().map((date, i) =>
              date ? <DayCell key={i} date={date} /> : <div key={i} />
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 px-1 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>גבוהה</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>בינונית</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span>נמוכה</span>
        <span className="text-gray-300">|</span>
        <span>גרור משימה ליום אחר · העבר עם hover</span>
      </div>
    </div>
  );
}
