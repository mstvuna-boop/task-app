import { useState, useRef, useCallback, useEffect } from 'react';
import { Task } from '../types';
import { api } from '../api';
import toast from 'react-hot-toast';

interface Props {
  tasks: Task[];
  onUpdate: (task: Task) => void;
  currentUserId?: string;
}

type CalendarMode = 'day' | 'week' | 'month';

const DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAYS_FULL  = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS     = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  high:   { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'גבוהה'   },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  label: 'בינונית' },
  low:    { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  label: 'נמוכה'   },
};
const statusLabel: Record<string, string> = {
  pending: 'ממתינה', in_progress: 'בביצוע', completed: 'הושלמה',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function getTasksForDay(tasks: Task[], date: Date) {
  return tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), date));
}

/* ─── Task Detail Modal ─────────────────────────────────────── */
function TaskModal({ task, onClose, onToggleComplete, onMoveToDay, isAssigned }: {
  task: Task;
  onClose: () => void;
  onToggleComplete: () => Promise<void>;
  onMoveToDay: (date: Date) => void;
  isAssigned: boolean;
}) {
  const [loading,      setLoading]      = useState(false);
  const [showDatePick, setShowDatePick] = useState(false);
  const [customDate,   setCustomDate]   = useState('');

  const p = priorityConfig[task.priority];
  const isCompleted = task.status === 'completed';

  const handleToggle = async () => {
    setLoading(true);
    try { await onToggleComplete(); } finally { setLoading(false); }
  };

  const moveTomorrow = () => {
    const d = task.due_date ? new Date(task.due_date) : new Date();
    d.setDate(d.getDate() + 1);
    onMoveToDay(d);
    onClose();
  };

  const moveCustom = () => {
    if (!customDate) return;
    const d = new Date(customDate);
    if (task.due_date) {
      const src = new Date(task.due_date);
      d.setHours(src.getHours(), src.getMinutes());
    }
    onMoveToDay(d);
    setShowDatePick(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-5 max-w-sm w-full shadow-2xl"
        style={{ background: 'var(--bg-card)', border: `1px solid ${isAssigned ? 'rgba(var(--accent-rgb),0.5)' : 'var(--border)'}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Assigned banner */}
        {isAssigned && task.assigned_by_name && (
          <div className="flex items-center gap-1.5 mb-3 text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
            📥 הוקצה אליך על-ידי <strong>{task.assigned_by_name}</strong>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-base font-bold leading-snug" style={{
            color: 'var(--text-primary)',
            textDecoration: isCompleted ? 'line-through' : 'none',
            opacity: isCompleted ? 0.6 : 1,
          }}>{task.title}</h2>
          <button onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)' }}>×</button>
        </div>

        {task.description && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
        )}

        <div className="space-y-1.5 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>עדיפות:</span>
            <span className="font-semibold px-2 py-0.5 rounded-full text-xs" style={{ color: p.color, background: p.bg }}>{p.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>סטטוס:</span>
            <span className="font-medium" style={{ color: isCompleted ? '#4ade80' : 'var(--text-primary)' }}>
              {isCompleted ? '✅ הושלמה' : statusLabel[task.status]}
            </span>
          </div>
          {task.due_date && (
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>תאריך יעד:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {new Date(task.due_date).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {task.reminders && task.reminders.filter(r => !r.sent).length > 0 && (
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>תזכורות:</span>
              <span style={{ color: 'var(--accent)' }}>🔔 {task.reminders.filter(r => !r.sent).length} פעילות</span>
            </div>
          )}
        </div>

        {/* Move buttons */}
        {!isCompleted && (
          <div className="flex gap-2 mb-2">
            <button onClick={moveTomorrow}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}>
              📅 העבר למחר
            </button>
            <button onClick={() => setShowDatePick(v => !v)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              🗓 תאריך אחר
            </button>
          </div>
        )}

        {showDatePick && (
          <div className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <button onClick={moveCustom}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'var(--accent)', color: '#000' }}>אשר</button>
              <button onClick={() => setShowDatePick(false)}
                className="flex-1 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>ביטול</button>
            </div>
          </div>
        )}

        {/* Complete / Undo */}
        <button onClick={handleToggle} disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all mb-2"
          style={isCompleted
            ? { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }
            : { background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }
          }>
          {loading ? '...' : isCompleted ? '↩ בטל סימון כבוצע' : '✓ סמן כבוצעה'}
        </button>

        <button onClick={onClose}
          className="w-full py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(var(--accent-rgb),0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          סגור
        </button>
      </div>
    </div>
  );
}

/* ─── Task Pill ─────────────────────────────────────────────── */
function TaskPill({ task, onDragStart, onMoveToDay, compact = false, onSelect, onTouchDragStart, onToggleComplete, onCancelDrag, isAssigned = false }: {
  task: Task;
  onDragStart: () => void;
  onMoveToDay?: (date: Date) => void;
  compact?: boolean;
  onSelect: () => void;
  onTouchDragStart: (e: React.TouchEvent) => void;
  onToggleComplete: () => void;
  onCancelDrag: () => void;
  isAssigned?: boolean;
}) {
  const [showMove, setShowMove] = useState(false);
  const [moveDate, setMoveDate] = useState('');

  const handleMove = async () => {
    if (!moveDate || !onMoveToDay) return;
    onMoveToDay(new Date(moveDate));
    setShowMove(false);
    setMoveDate('');
  };

  const p = priorityConfig[task.priority];
  const isCompleted = task.status === 'completed';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <div className="group relative">
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
        onTouchStart={onTouchDragStart}
        onTouchCancel={onCancelDrag}
        onClick={handleClick}
        className={`cursor-grab active:cursor-grabbing rounded-lg truncate transition-all select-none
          ${compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}`}
        style={{
          color: isCompleted ? 'var(--text-muted)' : isAssigned ? 'var(--accent)' : p.color,
          background: isCompleted ? 'var(--bg-card-alt)' : isAssigned ? 'rgba(var(--accent-rgb),0.08)' : p.bg,
          border: isCompleted
            ? '1px solid var(--border)'
            : isAssigned
              ? '1.5px dashed rgba(var(--accent-rgb),0.6)'
              : `1px solid ${p.color}55`,
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}
        title={task.title}
      >
        <span className="flex items-center gap-1">
          {isCompleted ? '✓ ' : isAssigned ? '📥 ' : ''}
          {task.title}
        </span>
      </div>

      {!compact && (
        <div className="hidden group-hover:flex absolute left-0 top-0 bottom-0 items-center gap-1 rounded-lg px-1 z-10 shadow-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* Complete / undo */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
            className="text-xs px-2 py-0.5 rounded whitespace-nowrap font-bold transition-all"
            style={isCompleted
              ? { background: 'rgba(248,113,113,0.1)', color: '#f87171' }
              : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
            }
          >{isCompleted ? '↩' : '✓'}</button>
          {!isCompleted && <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const tomorrow = new Date(task.due_date ? new Date(task.due_date) : new Date());
                tomorrow.setDate(tomorrow.getDate() + 1);
                onMoveToDay?.(tomorrow);
              }}
              className="text-xs px-2 py-0.5 rounded whitespace-nowrap transition-all"
              style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}
            >למחר</button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMove(!showMove); }}
              className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
              style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}
            >העבר ל...</button>
          </>}
        </div>
      )}

      {showMove && (
        <div className="absolute z-20 rounded-xl shadow-lg p-3 mt-1 min-w-[200px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>בחר תאריך חדש:</p>
          <input
            type="date"
            value={moveDate}
            onChange={e => setMoveDate(e.target.value)}
            className="w-full rounded-lg px-2 py-1 text-sm mb-2"
            style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button onClick={handleMove} className="flex-1 text-white text-xs py-1 rounded-lg" style={{ background: 'var(--accent)' }}>אשר</button>
            <button onClick={() => setShowMove(false)} className="flex-1 text-xs py-1 rounded-lg" style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main CalendarView ─────────────────────────────────────── */
export default function CalendarView({ tasks, onUpdate, currentUserId }: Props) {
  const today = new Date();
  const [mode, setMode]               = useState<CalendarMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask,   setDraggedTask]   = useState<Task | null>(null);
  const [selectedTask,  setSelectedTask]  = useState<Task | null>(null);
  const [expandedDays,  setExpandedDays]  = useState<Set<string>>(new Set());

  // Touch drag state
  const calendarRef    = useRef<HTMLDivElement>(null);
  const touchDragTask  = useRef<Task | null>(null);
  const touchGhost     = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchActive    = useRef(false);

  /* ── Toggle complete ── */
  const toggleComplete = useCallback(async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { ...task, status: newStatus });
      onUpdate(updated);
      setSelectedTask(updated);
      toast.success(newStatus === 'completed' ? 'משימה סומנה כבוצעה ✓' : 'סימון בוטל');
    } catch {
      toast.error('שגיאה בעדכון המשימה');
    }
  }, [onUpdate]);

  /* ── Move task ── */
  const moveTaskToDay = useCallback(async (task: Task, targetDate: Date) => {
    const src = task.due_date ? new Date(task.due_date) : new Date();
    const d = new Date(targetDate); // avoid mutating caller's Date
    d.setHours(src.getHours() || 9, src.getMinutes() || 0);
    try {
      const updated = await api.updateTask(task.id, {
        ...task,
        due_date: d.toISOString(),
        // preserve assignment fields explicitly
        assigned_to: task.assigned_to,
        assigned_by: task.assigned_by,
      });
      onUpdate(updated);
      // if this task is open in the modal, refresh it there too
      setSelectedTask(prev => prev?.id === updated.id ? updated : prev);
      toast.success(`הועבר ל-${d.toLocaleDateString('he-IL')}`);
    } catch {
      toast.error('שגיאה בהעברת המשימה');
    }
  }, [onUpdate]);

  /* ── Desktop DnD ── */
  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTask) { moveTaskToDay(draggedTask, new Date(date)); setDraggedTask(null); }
  };

  /* ── Touch DnD ── */
  // Register non-passive listeners on the container so preventDefault() actually works
  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;

    const onMove = (e: TouchEvent) => {
      if (!touchActive.current) return;
      e.preventDefault(); // stops page scroll during drag — only works non-passive
      const t = e.touches[0];
      if (touchGhost.current) {
        touchGhost.current.style.left = `${t.clientX}px`;
        touchGhost.current.style.top  = `${t.clientY}px`;
      }
    };

    const onEnd = (e: TouchEvent) => {
      // Cancel long-press if still pending
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      if (!touchActive.current) return;
      touchActive.current = false;

      const t = e.changedTouches[0];
      touchGhost.current?.remove();
      touchGhost.current = null;

      if (touchDragTask.current) {
        const hit = document.elementFromPoint(t.clientX, t.clientY);
        const cell = hit?.closest('[data-date]') as HTMLElement | null;
        if (cell?.dataset.date) {
          const date = new Date(cell.dataset.date);
          if (!isNaN(date.getTime())) moveTaskToDay(touchDragTask.current, date);
        }
        touchDragTask.current = null;
      }
    };

    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend',  onEnd,  { passive: false });
    return () => {
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend',  onEnd);
    };
  }, [moveTaskToDay]);

  const handleTouchDragStart = (task: Task) => (e: React.TouchEvent) => {
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;

    // Long-press: wait 250 ms before activating drag
    longPressTimer.current = setTimeout(() => {
      touchDragTask.current = task;
      touchActive.current   = true;

      const ghost = document.createElement('div');
      ghost.textContent = task.title;
      ghost.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        background:#00e5ff; color:#000;
        padding:5px 12px; border-radius:10px;
        font-size:13px; font-weight:700; opacity:0.95;
        box-shadow:0 4px 20px rgba(0,229,255,0.45);
        transform:translate(-50%,-50%);
        left:${startX}px; top:${startY}px;
      `;
      document.body.appendChild(ghost);
      touchGhost.current = ghost;

      // Haptic feedback on supported devices
      if (navigator.vibrate) navigator.vibrate(40);
    }, 250);
  };

  const handleTouchCancelDrag = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    touchActive.current = false;
    touchDragTask.current = null;
    touchGhost.current?.remove();
    touchGhost.current = null;
  };

  /* ── Navigation ── */
  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (mode === 'day')        d.setDate(d.getDate() + dir);
    else if (mode === 'week')  d.setDate(d.getDate() + dir * 7);
    else { d.setMonth(d.getMonth() + dir); d.setDate(1); }
    setCurrentDate(d);
  };

  const getTitle = () => {
    if (mode === 'day') return currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (mode === 'week') {
      const start = getWeekStart(currentDate);
      const end   = new Date(start); end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const getWeekStart = (d: Date) => {
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay());
    return s;
  };
  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  };
  const getMonthCells = () => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  };

  /* ── Day Cell ── */
  const DayCell = ({ date, fullHeight = false }: { date: Date; fullHeight?: boolean }) => {
    const dayTasks = getTasksForDay(tasks, date);
    const isToday  = isSameDay(date, today);
    const isPast   = date < today && !isToday;
    const dateKey  = date.toISOString().slice(0, 10);
    const limit    = fullHeight ? 10 : 3;
    const isExpanded = expandedDays.has(dateKey);
    const shown    = isExpanded ? dayTasks.length : limit;
    const hidden   = dayTasks.length - shown;

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedDays(prev => {
        const next = new Set(prev);
        next.has(dateKey) ? next.delete(dateKey) : next.add(dateKey);
        return next;
      });
    };

    return (
      <div
        data-date={dateKey}
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDrop(e, date)}
        className={`${fullHeight ? 'min-h-[120px]' : 'min-h-[80px]'} p-1.5 rounded-xl border transition-all`}
        style={{
          background: isToday ? 'rgba(var(--accent-rgb),0.08)' : isPast ? 'var(--bg-card-alt)' : 'var(--bg-card)',
          border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
          opacity: isPast ? 0.7 : 1,
        }}
      >
        <div className="text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full"
          style={isToday
            ? { background: 'var(--accent)', color: '#fff' }
            : { color: isPast ? 'var(--text-muted)' : 'var(--text-primary)' }
          }>
          {date.getDate()}
        </div>
        <div className="space-y-0.5">
          {dayTasks.slice(0, shown).map(t => (
            <TaskPill
              key={t.id}
              task={t}
              compact={!fullHeight}
              isAssigned={!!(currentUserId && t.assigned_to === currentUserId)}
              onDragStart={() => setDraggedTask(t)}
              onTouchDragStart={handleTouchDragStart(t)}
              onCancelDrag={handleTouchCancelDrag}
              onMoveToDay={d => moveTaskToDay(t, d)}
              onSelect={() => setSelectedTask(t)}
              onToggleComplete={() => toggleComplete(t)}
            />
          ))}

          {/* Expand / collapse toggle */}
          {hidden > 0 && (
            <button
              onClick={toggleExpand}
              className="w-full text-xs rounded py-0.5 font-semibold transition-all"
              style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)' }}
            >
              +{hidden} נוספות ▾
            </button>
          )}
          {isExpanded && dayTasks.length > limit && (
            <button
              onClick={toggleExpand}
              className="w-full text-xs rounded py-0.5 transition-all"
              style={{ color: 'var(--text-muted)' }}
            >
              הסתר ▴
            </button>
          )}
        </div>
      </div>
    );
  };

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  };

  return (
    <div ref={calendarRef} className="space-y-3">
      {/* ─── Task Modal ─── */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onToggleComplete={() => toggleComplete(selectedTask)}
          onMoveToDay={d => moveTaskToDay(selectedTask, d)}
          isAssigned={!!(currentUserId && selectedTask.assigned_to === currentUserId)}
        />
      )}

      {/* ─── Toolbar ─── */}
      <div className="rounded-2xl p-3" style={cardStyle}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Mode tabs */}
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--bg-card-alt)' }}>
            {(['day', 'week', 'month'] as CalendarMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={mode === m
                  ? { background: 'var(--bg-card)', color: 'var(--accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                  : { color: 'var(--text-muted)' }
                }
              >
                {m === 'day' ? 'יום' : m === 'week' ? 'שבוע' : 'חודש'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)' }}>›</button>
            <div className="text-center min-w-[180px]">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{getTitle()}</span>
            </div>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)' }}>‹</button>
          </div>

          <button onClick={() => setCurrentDate(new Date())}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),0.4)', background: 'rgba(var(--accent-rgb),0.05)' }}>
            היום
          </button>
        </div>
      </div>

      {/* ─── DAY VIEW ─── */}
      {mode === 'day' && (
        <div className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-base font-bold px-3 py-1 rounded-xl"
              style={isSameDay(currentDate, today)
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--bg-card-alt)', color: 'var(--text-primary)' }
              }>
              {currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          {(() => {
            const dayTasks = getTasksForDay(tasks, currentDate);
            if (dayTasks.length === 0) return (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <div className="text-4xl mb-2">📭</div>
                <p>אין משימות ביום זה</p>
              </div>
            );
            const groups = [
              { label: '🔴 עדיפות גבוהה',   items: dayTasks.filter(t => t.priority === 'high'   && t.status !== 'completed') },
              { label: '🟡 עדיפות בינונית', items: dayTasks.filter(t => t.priority === 'medium' && t.status !== 'completed') },
              { label: '🟢 עדיפות נמוכה',   items: dayTasks.filter(t => t.priority === 'low'    && t.status !== 'completed') },
              { label: '✅ הושלמו',          items: dayTasks.filter(t => t.status === 'completed') },
            ].filter(g => g.items.length > 0);
            return (
              <div className="space-y-4">
                {groups.map(g => (
                  <div key={g.label}>
                    <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>{g.label}</h4>
                    <div className="space-y-2">
                      {g.items.map(t => {
                        const p = priorityConfig[t.priority];
                        const assigned = !!(currentUserId && t.assigned_to === currentUserId);
                        return (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                            style={{
                              background: t.status === 'completed' ? 'var(--bg-card-alt)' : assigned ? 'rgba(var(--accent-rgb),0.06)' : p.bg,
                              border: t.status === 'completed'
                                ? '1px solid var(--border)'
                                : assigned
                                  ? '1.5px dashed rgba(var(--accent-rgb),0.5)'
                                  : `1px solid ${p.color}44`,
                            }}
                            onClick={() => setSelectedTask(t)}
                          >
                            {assigned
                              ? <span className="text-sm flex-shrink-0">📥</span>
                              : <div className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: t.priority === 'high' ? '#f87171' : t.priority === 'medium' ? '#fbbf24' : '#4ade80' }} />
                            }
                            <div className="flex-1 min-w-0">
                              {assigned && t.assigned_by_name && (
                                <p className="text-xs mb-0.5" style={{ color: 'var(--accent)' }}>מ: {t.assigned_by_name}</p>
                              )}
                              <p className="text-sm font-medium truncate" style={{
                                color: t.status === 'completed' ? 'var(--text-muted)' : assigned ? 'var(--text-primary)' : 'var(--text-primary)',
                                textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                              }}>{t.title}</p>
                              {t.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{t.description}</p>}
                              {t.due_date && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>⏰ {new Date(t.due_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>}
                            </div>
                            {t.status !== 'completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const d = new Date(currentDate); d.setDate(d.getDate() + 1); moveTaskToDay(t, d);
                                }}
                                className="text-xs px-2 py-1 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                              >למחר ›</button>
                            )}
                          </div>
                        );
                      })}
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
        <div className="rounded-2xl p-3" style={cardStyle}>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_FULL.map((d, i) => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--text-muted)' }}>
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
        <div className="rounded-2xl p-3" style={cardStyle}>
          <div className="grid grid-cols-7 mb-2">
            {DAYS_FULL.map((d, i) => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--text-muted)' }}>
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

      {/* ─── Legend ─── */}
      <div className="flex items-center gap-4 text-xs px-1 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>גבוהה</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>בינונית</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span>נמוכה</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span className="flex items-center gap-1">
          <span style={{ border: '1.5px dashed rgba(var(--accent-rgb),0.6)', borderRadius: '3px', padding: '0 4px', color: 'var(--accent)', fontSize: '10px' }}>📥</span>
          הוקצה אליך
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>לחץ על משימה לפרטים · גרור ליום אחר</span>
      </div>
    </div>
  );
}
