/**
 * 待办提醒（1.5）数据结构
 * ---------------------------------------------------------------------------
 * 接口契约与视图模型分离，与另外四个驾驶舱页面保持一致：
 * api 只负责取数，selectors 负责统计/筛选/日历派生，组件只负责渲染。
 */

// #region 接口契约

export type ReminderCategory = 'alert' | 'dividend' | 'ipo' | 'plan' | 'review';

export type ReminderGroupKey = 'corporate' | 'review' | 'urgent';
export type ReminderIcon =
  | 'alert'
  | 'ipo'
  | 'money'
  | 'plan'
  | 'review'
  | 'stock';
export type ReminderTone = 'danger' | 'info' | 'muted' | 'success' | 'warning';

/** 单条待办或提醒 */
export interface ReminderItem {
  id: string;
  category: ReminderCategory;
  group: ReminderGroupKey;
  icon: ReminderIcon;
  tone: ReminderTone;
  title: string;
  description: string;
  actionLabel: string;
  actionStyle: 'link' | 'pill';
  completed: boolean;
  read: boolean;
}

/** 汇总统计：由后端按全量数据聚合，列表只是当前页数据 */
export interface ReminderStats {
  pending: number;
  today: number;
  overdue: number;
  ipo: number;
  newStock: number;
  convertibleBond: number;
  positionAlert: number;
  takeProfit: number;
  priceAlert: number;
  review: number;
  latestReview: string;
}

export interface CalendarEvent {
  dateLabel: string;
  title: string;
  detail: string;
}

export interface ReminderCalendar {
  year: number;
  month: number;
  monthLabel: string;
  daysInMonth: number;
  /** 每月 1 日在一周中的偏移，周一为 0 */
  firstWeekday: number;
  todayDay: number;
  eventDays: number[];
  events: CalendarEvent[];
}

export interface ChannelSummary {
  key: string;
  label: string;
  value: string;
  note: string;
}

export interface PushRecord {
  time: string;
  title: string;
  description: string;
  tone: ReminderTone;
}

/** 待办提醒聚合数据（GET /dashboard/todo-reminders） */
export interface TodoRemindersOverview {
  tradeDate: string;
  updatedAt: string;
  stats: ReminderStats;
  reminders: ReminderItem[];
  calendar: ReminderCalendar;
  channels: ChannelSummary[];
  pushes: PushRecord[];
}

export interface TodoRemindersQuery {
  /** 交易日 YYYY-MM-DD，缺省为最新交易日 */
  date?: string;
}

// #endregion

// #region 视图模型

export interface TodoKpiVm {
  key: string;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}

export type ReminderQuickFilter = 'alert' | 'all' | 'ipo' | 'review';
export type ReminderTypeFilter = 'all' | ReminderCategory;

export interface ReminderFilterState {
  quick: ReminderQuickFilter;
  type: ReminderTypeFilter;
  onlyIncomplete: boolean;
}

export interface ReminderGroupVm {
  key: ReminderGroupKey;
  title: string;
  items: ReminderItem[];
}

export interface CalendarCellVm {
  key: string;
  day: null | number;
  isToday: boolean;
  hasEvent: boolean;
}

// #endregion
