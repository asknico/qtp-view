<script lang="ts" setup>
/**
 * 今日待办卡
 * ---------------------------------------------------------------------------
 * 只展示 1.5 待办提醒里「今日到期 + 已逾期」的前 3 条；
 * 右侧动作分成两类：带 action 的可点（去复盘），其余是语气标签（紧急/待确认）。
 */
import type { DashboardTodoItem } from '../data/types';

interface Props {
  items: DashboardTodoItem[];
}

defineProps<Props>();

const emit = defineEmits<{
  action: [item: DashboardTodoItem];
}>();
</script>

<template>
  <div class="tdl">
    <div v-for="item in items" :key="item.id" class="tdl__row">
      <span class="tdl__icon">{{ item.icon }}</span>
      <div class="tdl__text">
        <b class="tdl__title">{{ item.title }}</b>
        <span class="tdl__detail">{{ item.detail }}</span>
      </div>
      <button
        v-if="item.action"
        class="tdl__link"
        type="button"
        @click="emit('action', item)"
      >
        {{ item.action }}
      </button>
      <span
        v-else-if="item.tag"
        class="tdl__tag"
        :class="`tdl__tag--${item.tag.tone}`"
      >
        {{ item.tag.text }}
      </span>
    </div>
    <div v-if="items.length === 0" class="tdl__empty">今日无到期事项</div>
  </div>
</template>

<style scoped>
.tdl {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  min-height: 0;
}

.tdl__row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px dashed hsl(var(--border) / 70%);
}

.tdl__row:last-child {
  border-bottom: none;
}

.tdl__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: var(--font-small);
  background: hsl(var(--muted) / 60%);
  border-radius: 6px;
}

.tdl__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.tdl__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  font-weight: var(--font-weight-strong);
  white-space: nowrap;
}

.tdl__detail {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.tdl__tag {
  flex: 0 0 auto;
  padding: 1px 6px;
  font-size: var(--font-tiny);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  border-radius: 9px;
}

.tdl__tag--danger {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 10%);
}

.tdl__tag--warning {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 12%);
}

.tdl__link {
  flex: 0 0 auto;
  padding: 0;
  font-size: var(--font-small);
  color: hsl(215deg 85% 55%);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.tdl__empty {
  padding: 24px 0;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  text-align: center;
}
</style>
