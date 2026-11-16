import type { TodoRemindersOverview, TodoRemindersQuery } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoTodoReminders } from '../data/demo';

/**
 * 待办提醒（1.5）数据源
 * 接入后端时只需将 USE_DEMO 置为 false，并在此层适配接口响应。
 * 建议接口：GET /dashboard/todo-reminders?date=2026-10-28
 */
const USE_DEMO: boolean = true;

const API = {
  overview: '/dashboard/todo-reminders',
} as const;

export async function fetchTodoReminders(
  query: TodoRemindersQuery = {},
): Promise<TodoRemindersOverview> {
  if (USE_DEMO) return demoTodoReminders();

  const res = await alovaInstance.get<TodoRemindersOverview>(API.overview, {
    params: query,
  });
  return res;
}
