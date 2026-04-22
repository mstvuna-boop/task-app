import { useState } from 'react';
import { Task, Reminder } from '../types';
import { api } from '../api';
import toast from 'react-hot-toast';

interface Props {
  task: Task;
  onUpdate: (task: Task) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReminderPanel({ task, onUpdate }: Props) {
  const [remindAt, setRemindAt] = useState('');
  const [loading, setLoading] = useState(false);

  const addReminder = async () => {
    if (!remindAt) return toast.error('בחר תאריך ושעה');
    setLoading(true);
    try {
      const reminder = await api.addReminder(task.id, new Date(remindAt).toISOString()) as Reminder;
      onUpdate({ ...task, reminders: [...task.reminders, reminder] });
      setRemindAt('');
      toast.success('תזכורת נוספה בהצלחה!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteReminder = async (reminderId: number) => {
    try {
      await api.deleteReminder(task.id, reminderId);
      onUpdate({ ...task, reminders: task.reminders.filter((r) => r.id !== reminderId) });
      toast.success('תזכורת נמחקה');
    } catch {
      toast.error('שגיאה במחיקת תזכורת');
    }
  };

  // Min datetime = now + 1 minute
  const minDatetime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        <span>🔔</span> תזכורות
      </h4>

      {task.reminders.length > 0 && (
        <div className="space-y-2 mb-3">
          {task.reminders.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                r.sent ? 'bg-gray-50 text-gray-400' : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{r.sent ? '✓' : '⏰'}</span>
                <span>{formatDate(r.remind_at)}</span>
                {r.sent && <span className="text-xs">(נשלח)</span>}
              </div>
              {!r.sent && (
                <button
                  onClick={() => deleteReminder(r.id)}
                  className="text-indigo-400 hover:text-red-500 transition-colors text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={remindAt}
          min={minDatetime}
          onChange={(e) => setRemindAt(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
        <button
          onClick={addReminder}
          disabled={loading || !remindAt}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? '...' : '+ הוסף'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">תישלח תזכורת למייל {task.user_id && ''} בזמן שהגדרת</p>
    </div>
  );
}
