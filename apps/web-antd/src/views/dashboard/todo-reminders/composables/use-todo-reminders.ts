import type {
  ReminderQuickFilter,
  ReminderTypeFilter,
  TodoRemindersOverview,
  TodoRemindersQuery,
} from '../data/types';

import { computed, onMounted, ref, shallowRef } from 'vue';

import { fetchTodoReminders } from '../api/todo-reminders';
import {
  calendarCellsOf,
  reminderGroupsOf,
  reminderKpisOf,
  unreadCountOf,
} from '../data/selectors';

/** 待办提醒数据装配与演示交互状态 */
export function useTodoReminders() {
  const data = shallowRef<null | TodoRemindersOverview>(null);
  const loading = ref(false);
  const error = ref('');

  const quickFilter = ref<ReminderQuickFilter>('all');
  const typeFilter = ref<ReminderTypeFilter>('all');
  const onlyIncomplete = ref(true);

  const filters = computed(() => ({
    onlyIncomplete: onlyIncomplete.value,
    quick: quickFilter.value,
    type: typeFilter.value,
  }));
  const groups = computed(() =>
    data.value ? reminderGroupsOf(data.value.reminders, filters.value) : [],
  );
  const visibleCount = computed(() =>
    groups.value.reduce((sum, group) => sum + group.items.length, 0),
  );
  const pendingCount = computed(
    () =>
      data.value?.reminders.filter((reminder) => !reminder.completed).length ??
      0,
  );
  const unreadCount = computed(() =>
    data.value ? unreadCountOf(data.value.reminders) : 0,
  );
  const kpis = computed(() =>
    data.value ? reminderKpisOf(data.value, pendingCount.value) : [],
  );
  const calendarCells = computed(() =>
    data.value ? calendarCellsOf(data.value.calendar) : [],
  );

  async function load(query: TodoRemindersQuery = {}): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      data.value = await fetchTodoReminders(query);
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '未知错误';
      window.message.error(`待办提醒加载失败：${error.value}`);
    } finally {
      loading.value = false;
    }
  }

  function setQuickFilter(value: ReminderQuickFilter): void {
    quickFilter.value = value;
    typeFilter.value = 'all';
  }

  function setTypeFilter(value: ReminderTypeFilter): void {
    typeFilter.value = value;
    quickFilter.value = 'all';
  }

  function updateReminder(
    id: string,
    patch: (reminder: TodoRemindersOverview['reminders'][number]) => void,
  ): void {
    if (!data.value) return;
    const reminders = data.value.reminders.map((reminder) => {
      if (reminder.id !== id) return reminder;
      const next = { ...reminder };
      patch(next);
      return next;
    });
    data.value = { ...data.value, reminders };
  }

  function toggleComplete(id: string): void {
    updateReminder(id, (reminder) => {
      reminder.completed = !reminder.completed;
      reminder.read = true;
    });
  }

  function markRead(id: string): void {
    updateReminder(id, (reminder) => {
      reminder.read = true;
    });
  }

  function markAllRead(): void {
    if (!data.value) return;
    data.value = {
      ...data.value,
      reminders: data.value.reminders.map((reminder) => ({
        ...reminder,
        read: true,
      })),
    };
  }

  onMounted(() => {
    if (!data.value) void load();
  });

  return {
    calendarCells,
    data,
    error,
    groups,
    kpis,
    loading,
    load,
    markAllRead,
    markRead,
    onlyIncomplete,
    pendingCount,
    quickFilter,
    refresh: load,
    setQuickFilter,
    setTypeFilter,
    toggleComplete,
    typeFilter,
    unreadCount,
    visibleCount,
  };
}
