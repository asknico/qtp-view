<script lang="ts" setup>
import type { Component } from 'vue';

import type {
  ReminderGroupVm,
  ReminderIcon,
  ReminderItem,
  ReminderQuickFilter,
  ReminderTypeFilter,
} from '../data/types';

import {
  BellOutlined,
  CheckOutlined,
  FileTextOutlined,
  NotificationOutlined,
  RiseOutlined,
  StopOutlined,
  WalletOutlined,
} from '@antdv-next/icons';

interface Props {
  groups: ReminderGroupVm[];
  hasUnread: boolean;
  onlyIncomplete: boolean;
  quickFilter: ReminderQuickFilter;
  typeFilter: ReminderTypeFilter;
}

defineProps<Props>();

const emit = defineEmits<{
  action: [item: ReminderItem];
  markAllRead: [];
  setQuickFilter: [value: ReminderQuickFilter];
  setTypeFilter: [value: ReminderTypeFilter];
  toggleComplete: [id: string];
  toggleIncomplete: [];
}>();

const iconMap: Record<ReminderIcon, Component> = {
  alert: StopOutlined,
  ipo: NotificationOutlined,
  money: WalletOutlined,
  plan: FileTextOutlined,
  review: BellOutlined,
  stock: RiseOutlined,
};

const quickTabs: Array<{ label: string; value: ReminderQuickFilter }> = [
  { label: '全部', value: 'all' },
  { label: '打新', value: 'ipo' },
  { label: '预警', value: 'alert' },
  { label: '复盘', value: 'review' },
];

function onTypeChange(event: Event): void {
  emit(
    'setTypeFilter',
    (event.target as HTMLSelectElement).value as ReminderTypeFilter,
  );
}
</script>

<template>
  <div class="reminders">
    <div class="reminders__toolbar">
      <div class="reminders__tabs" aria-label="提醒快捷分类">
        <button
          v-for="tab in quickTabs"
          :key="tab.value"
          type="button"
          :aria-pressed="quickFilter === tab.value"
          :class="{ 'is-active': quickFilter === tab.value }"
          @click="emit('setQuickFilter', tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <span class="reminders__toolbar-note">按紧急度排序</span>
    </div>

    <div class="reminders__filters">
      <select
        class="reminders__select"
        aria-label="提醒类型"
        :value="typeFilter"
        @change="onTypeChange"
      >
        <option value="all">全部类型</option>
        <option value="ipo">打新 / 转债</option>
        <option value="alert">持仓预警</option>
        <option value="dividend">分红派息</option>
        <option value="review">待复盘</option>
        <option value="plan">交易计划</option>
      </select>
      <button
        class="reminders__filter"
        :class="{ 'is-active': onlyIncomplete }"
        type="button"
        :aria-pressed="onlyIncomplete"
        @click="emit('toggleIncomplete')"
      >
        <CheckOutlined v-if="onlyIncomplete" />
        仅未完成
      </button>
      <button
        class="reminders__read-all"
        type="button"
        :disabled="!hasUnread"
        @click="emit('markAllRead')"
      >
        全部标记已读
      </button>
    </div>

    <div class="reminders__scroll">
      <section v-for="group in groups" :key="group.key" class="reminder-group">
        <h4 class="reminder-group__title">{{ group.title }}</h4>
        <div
          v-for="item in group.items"
          :key="item.id"
          class="reminder"
          :class="{
            'reminder--completed': item.completed,
            'reminder--unread': !item.read,
          }"
        >
          <button
            class="reminder__icon"
            :class="`reminder__icon--${item.tone}`"
            type="button"
            :title="item.completed ? '恢复为未完成' : '标记为已完成'"
            :aria-label="`${item.completed ? '恢复' : '完成'}：${item.title}`"
            @click="emit('toggleComplete', item.id)"
          >
            <CheckOutlined v-if="item.completed" />
            <component :is="iconMap[item.icon]" v-else />
          </button>
          <div class="reminder__content">
            <div class="reminder__title">{{ item.title }}</div>
            <div class="reminder__desc">{{ item.description }}</div>
          </div>
          <button
            class="reminder__action"
            :class="[
              `reminder__action--${item.actionStyle}`,
              `reminder__action--${item.tone}`,
            ]"
            type="button"
            @click="emit('action', item)"
          >
            {{ item.actionLabel }}
          </button>
        </div>
      </section>
      <div v-if="groups.length === 0" class="reminders__empty" role="status">
        当前筛选条件下暂无待办提醒
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminders {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.reminders__toolbar {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding: 9px 12px 7px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.reminders__tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: hsl(var(--muted) / 65%);
  border-radius: 7px;
}

.reminders__tabs button {
  min-width: 46px;
  height: 26px;
  padding: 0 9px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 5px;
}

.reminders__tabs button.is-active {
  font-weight: var(--font-weight-strong);
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  box-shadow: 0 1px 3px rgb(16 24 40 / 10%);
}

.reminders__toolbar-note {
  margin-left: auto;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.reminders__filters {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding: 8px 12px 5px;
}

.reminders__select,
.reminders__filter {
  height: 30px;
  padding: 0 9px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  outline: none;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.reminders__select {
  min-width: 100px;
  cursor: pointer;
}

.reminders__filter {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  cursor: pointer;
}

.reminders__filter.is-active {
  color: hsl(215deg 85% 52%);
  background: hsl(215deg 90% 55% / 6%);
  border-color: hsl(215deg 85% 55% / 55%);
}

.reminders__read-all {
  padding: 0;
  margin-left: auto;
  font-size: var(--font-small);
  color: hsl(215deg 85% 55%);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.reminders__read-all:disabled {
  color: hsl(var(--muted-foreground));
  cursor: default;
  opacity: 0.65;
}

.reminders__scroll {
  flex: 1;
  min-height: 0;
  padding: 0 12px 8px;
  overflow: auto;
}

.reminder-group__title {
  margin: 7px 0 2px;
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  color: hsl(var(--muted-foreground));
}

.reminder {
  display: flex;
  gap: 9px;
  align-items: center;
  min-height: 52px;
  padding: 7px 0;
  border-bottom: 1px dashed hsl(var(--border) / 65%);
}

.reminder:last-child {
  border-bottom: none;
}

.reminder__icon {
  display: inline-flex;
  flex: 0 0 25px;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  padding: 0;
  font-size: var(--font-body);
  cursor: pointer;
  border: none;
  border-radius: 7px;
}

.reminder__icon--danger {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 10%);
}

.reminder__icon--info {
  color: hsl(215deg 85% 52%);
  background: hsl(215deg 90% 55% / 11%);
}

.reminder__icon--success {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.reminder__icon--warning {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 13%);
}

.reminder__content {
  flex: 1;
  min-width: 0;
}

.reminder__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-base);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.reminder--unread .reminder__title::after {
  display: inline-block;
  width: 4px;
  height: 4px;
  margin-left: 6px;
  vertical-align: 2px;
  content: '';
  background: hsl(215deg 85% 55%);
  border-radius: 50%;
}

.reminder__desc {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.reminder__action {
  flex: 0 0 auto;
  padding: 0;
  font-size: var(--font-small);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.reminder__action--link {
  font-size: var(--font-small);
  color: hsl(215deg 85% 55%);
}

.reminder__action--pill {
  height: 22px;
  padding: 0 7px;
  border-radius: 10px;
}

.reminder__action--pill.reminder__action--danger {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 10%);
}

.reminder__action--pill.reminder__action--info {
  color: hsl(215deg 85% 52%);
  background: hsl(215deg 90% 55% / 11%);
}

.reminder__action--pill.reminder__action--success {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.reminder__action--pill.reminder__action--warning {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 13%);
}

.reminder--completed .reminder__content {
  text-decoration: line-through;
  opacity: 0.55;
}

.reminders__empty {
  padding: 60px 0;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  text-align: center;
}

@media (max-width: 1500px) {
  .reminders__toolbar-note {
    display: none;
  }
}
</style>
