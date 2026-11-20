<script lang="ts" setup>
/**
 * 看板卡片外壳（可拖拽）
 * ---------------------------------------------------------------------------
 * 与 _shared/card-shell 视觉一致，额外提供：拖拽把手 + 拖拽反馈 + 常驻/可拖标记。
 * 拖拽只挂在把手上，卡片内容（图表 / 滚动区）不受影响。
 */
import type { DashboardCardKey } from '../data/types';

import { ref } from 'vue';

interface Props {
  /** 紧凑模式：顶部四小卡用，标题更小、内边距更窄 */
  dense?: boolean;
  dragging?: boolean;
  /** 提示文案：口径说明，鼠标悬浮在标题上时展示 */
  hint?: string;
  /** 卡片标识，随拖拽事件回传给页面 */
  cardKey: DashboardCardKey;
  label: string;
}

const props = withDefaults(defineProps<Props>(), {
  dense: false,
  dragging: false,
  hint: '',
});

const emit = defineEmits<{
  dragEnd: [];
  dragStart: [key: DashboardCardKey];
  dropCard: [key: DashboardCardKey];
}>();

const over = ref(false);

function onGripStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  // Firefox 必须写入数据，否则 dragstart 不触发
  event.dataTransfer.setData('text/plain', props.cardKey);
  emit('dragStart', props.cardKey);
}

function onGripEnd() {
  emit('dragEnd');
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  over.value = true;
}

function onDragLeave() {
  over.value = false;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  over.value = false;
  emit('dropCard', props.cardKey);
}
</script>

<template>
  <section
    class="dcard"
    :class="{
      'dcard--dense': dense,
      'dcard--dragging': dragging,
      'dcard--over': over,
    }"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <header class="dcard__head">
      <span
        class="dcard__grip"
        draggable="true"
        title="拖拽排序"
        @dragend="onGripEnd"
        @dragstart="onGripStart"
        >⠿</span>
      <h3 class="dcard__label" :title="hint">{{ label }}</h3>
      <div class="dcard__extra">
        <slot name="extra"></slot>
      </div>
    </header>
    <div class="dcard__body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.dcard {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
  transition:
    box-shadow 0.2s,
    border-color 0.2s,
    opacity 0.15s;
}

.dcard:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 3px 12px rgb(16 24 40 / 6%);
}

.dcard--dragging {
  opacity: 0.45;
}

.dcard--over {
  border-color: hsl(var(--primary) / 55%);
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%);
}

.dcard__head {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  padding: 9px 12px 8px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.dcard--dense .dcard__head {
  padding: 7px 12px 6px;
}

.dcard__grip {
  font-size: var(--font-base);
  line-height: 1;
  color: hsl(var(--muted-foreground) / 55%);
  cursor: grab;
  user-select: none;
}

.dcard__grip:active {
  cursor: grabbing;
}

.dcard__label {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-title);
  font-weight: var(--font-weight-strong);
  white-space: nowrap;
}

.dcard--dense .dcard__label {
  /* 与原型 1.6 自定义看板对齐：小卡标题同样使用区块标题字号 */
  font-size: var(--font-title);
}

.dcard__extra {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.dcard__body {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  overflow: hidden;
}

.dcard--dense .dcard__body {
  padding: 7px 12px 9px;
}
</style>
