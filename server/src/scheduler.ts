import cron from 'node-cron';
import db from './db';
import { sendReminderEmail, sendDailySummary } from './email';
import { Reminder, Task, User } from './types';

export function startScheduler(): void {
  cron.schedule('* * * * *', async () => {
    const now = new Date().toISOString();

    const pendingReminders = (db
      .prepare(
        `SELECT r.*, t.title, t.description, t.status, t.priority, t.due_date,
                u.email, u.name
         FROM reminders r
         JOIN tasks t ON r.task_id = t.id
         JOIN users u ON r.user_id = u.id
         WHERE r.sent = 0 AND r.remind_at <= ?`
      )
      .all(now) as unknown) as Array<Reminder & Task & User>;

    for (const row of pendingReminders) {
      try {
        const task: Task = {
          id: row.task_id,
          user_id: row.user_id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          due_date: row.due_date,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };

        await sendReminderEmail(row.email, row.name, task);
        db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(row.id);
        console.log(`Reminder sent for task "${row.title}" to ${row.email}`);
      } catch (err) {
        console.error(`Failed to send reminder ${row.id}:`, err);
      }
    }
  });

  console.log('Reminder scheduler started');

  cron.schedule('0 23 * * *', async () => {
    console.log('Sending daily summaries...');
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
    const ts = todayStart.toISOString();
    const te = todayEnd.toISOString();

    const users = (db.prepare('SELECT * FROM users').all() as unknown) as User[];

    for (const user of users) {
      try {
        const newTasks = (db.prepare(
          `SELECT * FROM tasks WHERE user_id=? AND created_at >= ? AND created_at <= ?`
        ).all(user.id, ts, te) as unknown) as Task[];

        const completedTasks = (db.prepare(
          `SELECT * FROM tasks WHERE user_id=? AND completed_at >= ? AND completed_at <= ?`
        ).all(user.id, ts, te) as unknown) as Task[];

        const pendingTasks = (db.prepare(
          `SELECT * FROM tasks WHERE user_id=? AND status != 'completed'`
        ).all(user.id) as unknown) as Task[];

        await sendDailySummary(user.email, user.name, newTasks, completedTasks, pendingTasks);
        console.log(`Daily summary sent to ${user.email}`);
      } catch (err) {
        console.error(`Failed to send daily summary to ${user.email}:`, err);
      }
    }
  });
}
