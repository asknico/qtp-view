import type {
  CalendarCellVm,
  ReminderCalendar,
  ReminderFilterState,
  ReminderGroupKey,
  ReminderGroupVm,
  ReminderItem,
  TodoKpiVm,
  TodoRemindersOverview,
} from './types';

/** KPI 四卡：待处理 / 打新转债 / 持仓预警 / 待复盘 */
export function reminderKpisOf(
  data: TodoRemindersOverview,
  pendingCount = data.stats.pending,
): TodoKpiVm[] {
  const { stats } = data;
  return [
    {
      accent: true,
      key: 'pending',
      label: '待处理事项',
      note: `今日 ${stats.today} · 逾期 ${stats.overdue}`,
      value: String(pendingCount),
    },
    {
      key: 'ipo',
      label: '打新 / 转债',
      note: `${stats.newStock} 只新股 + ${stats.convertibleBond} 只转债`,
      value: String(stats.ipo),
    },
    {
      key: 'alert',
      label: '持仓预警',
      note: `触及止盈 ${stats.takeProfit} · 价格预警 ${stats.priceAlert}`,
      value: String(stats.positionAlert),
    },
    {
      key: 'review',
      label: '待复盘交易',
      note: stats.latestReview,
      value: String(stats.review),
    },
  ];
}

/** 快捷分类 + 类型 + 完成状态组合筛选 */
export function filterRemindersOf(
  items: ReminderItem[],
  filters: ReminderFilterState,
): ReminderItem[] {
  return items.filter((item) => {
    if (filters.quick !== 'all' && item.category !== filters.quick)
      return false;
    if (filters.type !== 'all' && item.category !== filters.type) return false;
    return !filters.onlyIncomplete || !item.completed;
  });
}

const GROUPS: Array<{ key: ReminderGroupKey; title: string }> = [
  { key: 'urgent', title: '紧急 · 今日截止' },
  { key: 'corporate', title: '打新与分红' },
  { key: 'review', title: '复盘与计划' },
];

/** 按设计稿三段分组，空分组不渲染 */
export function reminderGroupsOf(
  items: ReminderItem[],
  filters: ReminderFilterState,
): ReminderGroupVm[] {
  const filtered = filterRemindersOf(items, filters);
  return GROUPS.map((group) => ({
    ...group,
    items: filtered.filter((item) => item.group === group.key),
  })).filter((group) => group.items.length > 0);
}

/** 生成周一开头的月历单元格，前后空白凑成完整周 */
export function calendarCellsOf(calendar: ReminderCalendar): CalendarCellVm[] {
  const cells: CalendarCellVm[] = Array.from(
    { length: calendar.firstWeekday },
    (_, index) => ({
      day: null,
      hasEvent: false,
      isToday: false,
      key: `leading-${index}`,
    }),
  );

  for (let day = 1; day <= calendar.daysInMonth; day += 1) {
    cells.push({
      day,
      hasEvent: calendar.eventDays.includes(day),
      isToday: day === calendar.todayDay,
      key: `day-${day}`,
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailing; index += 1) {
    cells.push({
      day: null,
      hasEvent: false,
      isToday: false,
      key: `trailing-${index}`,
    });
  }
  return cells;
}

export function unreadCountOf(items: ReminderItem[]): number {
  return items.filter((item) => !item.read).length;
}
