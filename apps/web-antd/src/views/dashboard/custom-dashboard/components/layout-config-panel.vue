<script lang="ts" setup>
/**
 * 看板配置面板
 * ---------------------------------------------------------------------------
 * 三段配置 + 导出/导入：
 *   1. 卡片显隐：常驻卡片（总资产）锁定不可关；
 *   2. 布局列数：三列紧凑 / 两列标准 / 单列阅读；
 *   3. 卡片参数：净值区间、刷新频率（展示阈值，即时生效）。
 * 显隐与列数属「编辑草稿」，由页头「保存布局」统一提交。
 */
import type {
  DashboardCardKey,
  DashboardCardMeta,
  DashboardLayout,
  DashboardParams,
  LayoutColumns,
  NavRange,
} from '../data/types';

import { computed, ref } from 'vue';

import { Button, Switch } from 'antdv-next';

interface Props {
  cards: DashboardCardMeta[];
  layout: DashboardLayout;
  params: DashboardParams;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  export: [];
  importLayout: [text: string];
  setColumns: [value: LayoutColumns];
  setRange: [value: NavRange];
  setRefresh: [value: number];
  toggle: [key: DashboardCardKey];
}>();

const COLUMN_OPTIONS: Array<{ label: string; value: LayoutColumns }> = [
  { label: '三列紧凑', value: 3 },
  { label: '两列标准', value: 2 },
  { label: '单列阅读', value: 1 },
];

const RANGE_OPTIONS: Array<{ label: string; value: NavRange }> = [
  { label: '近 3 月', value: '3m' },
  { label: '近 6 月', value: '6m' },
  { label: '近 1 年', value: '1y' },
];

const REFRESH_OPTIONS = [1, 5, 15, 30];

const fileInput = ref<HTMLInputElement>();

/** 配置列表按当前顺序展示，和栅格里的卡片一一对应 */
const orderedCards = computed<DashboardCardMeta[]>(() => {
  const metaOf = new Map(props.cards.map((card) => [card.key, card]));
  return props.layout.order
    .map((key) => metaOf.get(key))
    .filter((card): card is DashboardCardMeta => !!card);
});

function onRangeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value === '1y' || value === '3m' || value === '6m') {
    emit('setRange', value);
  }
}

function onRefreshChange(event: Event) {
  emit('setRefresh', Number((event.target as HTMLSelectElement).value));
}

function onToggle(key: DashboardCardKey) {
  emit('toggle', key);
}

function onImportClick() {
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  emit('importLayout', text);
  // 允许重复导入同一文件
  input.value = '';
}
</script>

<template>
  <div class="cfg">
    <div class="cfg__group">
      <div class="cfg__label">卡片显隐</div>
      <div v-for="card in orderedCards" :key="card.key" class="cfg__row">
        <span class="cfg__row-label" :title="card.hint">{{ card.label }}</span>
        <Switch
          :checked="layout.visible[card.key] !== false"
          :disabled="card.required"
          size="small"
          @change="onToggle(card.key)"
        />
      </div>
    </div>

    <div class="cfg__hr"></div>

    <div class="cfg__group">
      <div class="cfg__label">布局列数</div>
      <div class="cfg__radios">
        <button
          v-for="option in COLUMN_OPTIONS"
          :key="option.value"
          class="cfg__radio"
          :class="{ 'cfg__radio--on': layout.columns === option.value }"
          type="button"
          @click="emit('setColumns', option.value)"
        >
          <i class="cfg__dot"></i>{{ option.label }}
        </button>
      </div>
    </div>

    <div class="cfg__hr"></div>

    <div class="cfg__group">
      <div class="cfg__label">卡片参数</div>
      <label class="cfg__field">
        <span>净值区间</span>
        <select
          class="cfg__select"
          :value="params.navRange"
          @change="onRangeChange"
        >
          <option
            v-for="option in RANGE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <label class="cfg__field">
        <span>刷新频率</span>
        <select
          class="cfg__select"
          :value="String(params.refreshMinutes)"
          @change="onRefreshChange"
        >
          <option
            v-for="minutes in REFRESH_OPTIONS"
            :key="minutes"
            :value="minutes"
          >
            每 {{ minutes }} 分钟
          </option>
        </select>
      </label>
    </div>

    <div class="cfg__hr"></div>

    <div class="cfg__actions">
      <Button block @click="emit('export')">导出布局</Button>
      <Button block @click="onImportClick">导入</Button>
      <input
        ref="fileInput"
        accept="application/json,.json"
        class="cfg__file"
        type="file"
        @change="onFileChange"
      />
    </div>

    <p class="cfg__note">
      口径：显隐 /
      列数为编辑草稿，点「保存布局」后生效（未保存时有提示）；卡片参数仅改展示阈值，不改全局风险规则；布局导入仅接收展示配置，不含账户凭证与风控规则。
    </p>
  </div>
</template>

<style scoped>
.cfg {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: var(--font-small);
}

.cfg__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cfg__label {
  margin-bottom: 4px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.cfg__row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed hsl(var(--border) / 70%);
}

.cfg__row:last-child {
  border-bottom: none;
}

.cfg__row-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cfg__hr {
  height: 1px;
  background: hsl(var(--border) / 60%);
}

.cfg__radios {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cfg__radio {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0;
  font-size: var(--font-small);
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
}

.cfg__dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 50%;
}

.cfg__radio--on .cfg__dot {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  box-shadow: inset 0 0 0 2.5px hsl(var(--card));
}

.cfg__field {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-small);
}

.cfg__select {
  height: 26px;
  padding: 0 6px;
  font-size: var(--font-small);
  color: hsl(var(--foreground));
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.cfg__select:focus-visible {
  outline: none;
  border-color: hsl(var(--primary) / 60%);
}

.cfg__actions {
  display: flex;
  gap: 7px;
}

/* 与页头按钮同规格：32px 高、6px 圆角、无下投影 */
.cfg__actions :deep(.ant-btn) {
  height: 30px !important;
  min-height: 30px !important;
  padding: 0 10px !important;
  font-size: var(--font-body) !important;
  line-height: 28px !important;
  border-radius: 6px;
  box-shadow: none !important;
}

.cfg__file {
  display: none;
}

.cfg__note {
  margin: 0;
  font-size: var(--font-small);
  line-height: 1.6;
  color: hsl(var(--muted-foreground) / 85%);
}
</style>
