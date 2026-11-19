<script lang="ts" setup>
/**
 * 1.5 待办提醒
 * ---------------------------------------------------------------------------
 * 布局对齐《05_1.5待办与提醒.html》，视觉与另外四个驾驶舱页面统一：
 * KPI 四卡 → 待办列表(7) + 本月日历/提醒渠道(5)。
 * 演示状态支持分类筛选、完成切换、仅未完成和全部已读；业务跳转保留演示提示。
 */
import type { ReminderItem } from './data/types';

import { Button } from 'antdv-next';

import CardShell from '#/components/card-shell.vue';

import ReminderCalendar from './components/reminder-calendar.vue';
import ReminderChannels from './components/reminder-channels.vue';
import ReminderKpiStrip from './components/reminder-kpi-strip.vue';
import ReminderList from './components/reminder-list.vue';
import { useTodoReminders } from './composables/use-todo-reminders';

defineOptions({ name: 'TodoReminders' });

const {
  calendarCells,
  data,
  groups,
  kpis,
  loading,
  markAllRead,
  markRead,
  onlyIncomplete,
  pendingCount,
  quickFilter,
  setQuickFilter,
  setTypeFilter,
  toggleComplete,
  typeFilter,
  unreadCount,
  visibleCount,
} = useTodoReminders();

const pageDesc =
  '打新缴款、分红派息、止损预警、计划过期、待复盘五类提醒集中处理；缴款截止与弃购惩罚为常驻强提示。';

function onDemoAction(name: string) {
  window.message.info(`【${name}】为演示入口，接入后端后开放`);
}

function onMarkAllRead() {
  if (unreadCount.value === 0) return;
  markAllRead();
  window.message.success('全部提醒已标记为已读');
}

function onToggleComplete(id: string) {
  const target = data.value?.reminders.find((reminder) => reminder.id === id);
  toggleComplete(id);
  window.message.success(target?.completed ? '已恢复为未完成' : '已完成该事项');
}

function onReminderAction(item: ReminderItem) {
  markRead(item.id);
  onDemoAction(`${item.actionLabel}：${item.title}`);
}
</script>

<template>
  <div class="tr-page">
    <header class="tr-page__head">
      <div class="tr-page__title-wrap">
        <h1 class="tr-page__title">待办提醒</h1>
        <p class="tr-page__desc">{{ pageDesc }}</p>
      </div>
      <div class="tr-page__actions">
        <Button :disabled="unreadCount === 0" @click="onMarkAllRead">
          全部已读
        </Button>
        <Button type="primary" @click="onDemoAction('新建提醒')">
          ＋ 新建提醒
        </Button>
      </div>
    </header>

    <div v-if="data" class="tr-grid">
      <ReminderKpiStrip class="tr-grid__item tr-grid__item--12" :items="kpis" />

      <CardShell class="tr-grid__item tr-grid__item--7" flush>
        <template #title>待办与提醒</template>
        <template #sub>五类事项集中处理</template>
        <template #actions>
          <span class="tr-count-pill">待处理 {{ pendingCount }}</span>
        </template>
        <ReminderList
          :groups="groups"
          :has-unread="unreadCount > 0"
          :only-incomplete="onlyIncomplete"
          :quick-filter="quickFilter"
          :type-filter="typeFilter"
          @action="onReminderAction"
          @mark-all-read="onMarkAllRead"
          @set-quick-filter="setQuickFilter"
          @set-type-filter="setTypeFilter"
          @toggle-complete="onToggleComplete"
          @toggle-incomplete="onlyIncomplete = !onlyIncomplete"
        />
        <template #footer>
          <span>当前显示 {{ visibleCount }} 条</span>
          <span class="tr-footer__right">
            未读 {{ unreadCount }} 条 · 数据同步 {{ data.updatedAt }}
          </span>
        </template>
      </CardShell>

      <div class="tr-grid__item tr-grid__item--5 tr-side">
        <CardShell>
          <template #title>本月日历</template>
          <template #sub>{{ data.calendar.monthLabel }}</template>
          <template #actions>
            <button
              class="tr-link"
              type="button"
              @click="onDemoAction('财经日历')"
            >
              财经日历 ›
            </button>
          </template>
          <ReminderCalendar :calendar="data.calendar" :cells="calendarCells" />
        </CardShell>

        <CardShell>
          <template #title>提醒渠道与推送记录</template>
          <template #sub>4 类渠道 · 可配置免打扰</template>
          <ReminderChannels :channels="data.channels" :pushes="data.pushes" />
        </CardShell>
      </div>
    </div>

    <div v-else class="tr-loading">
      {{ loading ? '正在加载待办提醒…' : '暂无数据' }}
    </div>
  </div>
</template>

<style scoped>
.tr-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 6px 2px;
}

.tr-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.tr-page__title {
  margin: 0;
  font-size: var(--font-page);
  font-weight: var(--font-weight-strong);
  letter-spacing: -0.3px;
}

.tr-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
}

.tr-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

/* 按钮统一：同高、同基线、无下投影（黑色主按钮边框色由全局 styles/ui.css 统一） */
.tr-page__actions :deep(.ant-btn) {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 15px !important;
  font-size: var(--font-base) !important;
  line-height: 30px !important;
  border-radius: 6px;
  box-shadow: none !important;
}

.tr-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 104px minmax(0, 1fr);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.tr-grid__item--12 {
  grid-column: span 12;
}

.tr-grid__item--7 {
  grid-column: span 7;
}

.tr-grid__item--5 {
  grid-column: span 5;
}

.tr-side {
  display: grid;
  grid-template-rows: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 6px;
  min-height: 0;
}

.tr-count-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  color: hsl(var(--stock-up));
  white-space: nowrap;
  background: hsl(var(--stock-up) / 10%);
  border-radius: 10px;
}

.tr-link {
  padding: 0;
  font-size: var(--font-small);
  color: hsl(215deg 85% 55%);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.tr-footer__right {
  margin-left: auto;
}

.tr-loading {
  padding: 80px 0;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  text-align: center;
}

@media (max-width: 1200px) {
  .tr-page {
    height: auto;
  }

  .tr-grid {
    grid-template-rows: none;
    grid-template-columns: 1fr;
  }

  .tr-grid__item--12,
  .tr-grid__item--7,
  .tr-grid__item--5 {
    grid-column: auto;
  }

  .tr-grid__item--7 {
    min-height: 560px;
  }

  .tr-side {
    grid-template-rows: repeat(2, minmax(300px, auto));
  }
}
</style>
