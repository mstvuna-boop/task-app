import { Router, Request, Response } from 'express';
import db from '../db';
import { Task } from '../types';

const router = Router();

const cast = <T>(v: unknown): T => v as T;

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const tasks = cast<any[]>(db
    .prepare(
      `SELECT t.*,
        json_group_array(
          CASE WHEN r.id IS NOT NULL
          THEN json_object('id', r.id, 'remind_at', r.remind_at, 'sent', r.sent)
          ELSE NULL END
        ) as reminders_json
       FROM tasks t
       LEFT JOIN reminders r ON r.task_id = t.id
       WHERE t.user_id = ?
       GROUP BY t.id
       ORDER BY
         CASE t.status WHEN 'completed' THEN 1 ELSE 0 END,
         CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`
    )
    .all(userId));

  const result = tasks.map((t) => {
    const reminders = JSON.parse(t.reminders_json).filter(Boolean);
    const { reminders_json, ...task } = t;
    return { ...task, reminders };
  });

  res.json(result);
});

router.post('/', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { title, description, status, priority, due_date } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'כותרת המשימה נדרשת' });

  const result = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, title.trim(), description || '', status || 'pending', priority || 'medium', due_date || null);

  const task = cast<Task>(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
  res.status(201).json({ ...task, reminders: [] });
});

router.put('/:id', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;
  const { title, description, status, priority, due_date } = req.body;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

  const completedAt = status === 'completed' && task.status !== 'completed'
    ? new Date().toISOString()
    : status !== 'completed' ? null : (task.completed_at || null);

  db.prepare(
    `UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, completed_at=?, updated_at=CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  ).run(title, description || '', status, priority, due_date || null, completedAt, id, userId);

  const updated = cast<Task>(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
  const reminders = cast<any[]>(db.prepare('SELECT * FROM reminders WHERE task_id = ?').all(id));
  res.json({ ...updated, reminders });
});

router.delete('/:id', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
  if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

router.post('/:id/reminders', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;
  const { remind_at } = req.body;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
  if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
  if (!remind_at) return res.status(400).json({ error: 'זמן התזכורת נדרש' });

  const remindDate = new Date(remind_at);
  if (isNaN(remindDate.getTime()) || remindDate <= new Date()) {
    return res.status(400).json({ error: 'יש לבחור זמן עתידי' });
  }

  const result = db
    .prepare('INSERT INTO reminders (task_id, user_id, remind_at) VALUES (?, ?, ?)')
    .run(id, userId, remindDate.toISOString());

  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(reminder);
});

router.delete('/:id/reminders/:reminderId', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id, reminderId } = req.params;

  db.prepare('DELETE FROM reminders WHERE id = ? AND task_id = ? AND user_id = ?').run(reminderId, id, userId);
  res.json({ success: true });
});

export default router;
