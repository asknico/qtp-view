<script lang="ts" setup>
import type { BrokerAccount } from '../data/types';

import { computed, ref } from 'vue';

import { formatSigned, formatThousand } from '../data/demo';

interface Props {
  accounts: BrokerAccount[];
}

const props = defineProps<Props>();

const filter = ref<'all' | 'credit' | 'normal'>('all');

const filtered = computed(() => {
  if (filter.value === 'all') return props.accounts;
  const wantType = filter.value === 'credit' ? '信用' : '普通';
  return props.accounts.filter((a) => a.type === wantType);
});

/** 合计（仅全部时显示汇总行） */
const summary = computed(() => {
  const sum = { available: 0, todayPnl: 0, total: 0 };
  for (const a of props.accounts) {
    sum.available += a.available;
    sum.todayPnl += a.todayPnl;
    sum.total += a.total;
  }
  return sum;
});

/** 头像色块色调（参考设计稿的彩色 chip，按序取色） */
const CHIP_TONES = ['blue', 'violet', 'teal'] as const;

function chipTone(index: number): string {
  return CHIP_TONES[index % CHIP_TONES.length] ?? 'blue';
}

/** 头像字符：取账户名首个字符（华泰 → 华） */
function chipText(name: string): string {
  return name.slice(0, 1);
}

function pnlClass(v: number): string {
  if (v === 0) return '';
  return v > 0 ? 'is-up' : 'is-down';
}
</script>

<template>
  <div class="acc">
    <ul class="acc__list">
      <li v-for="(item, i) in filtered" :key="item.id" class="acc__row">
        <span class="acc__avatar" :class="`acc__avatar--${chipTone(i)}`">
          {{ chipText(item.name) }}
        </span>
        <div class="acc__main">
          <div class="acc__name">
            {{ item.name }}
            <span
              class="acc__tag"
              :class="{ 'acc__tag--credit': item.type === '信用' }"
            >
              {{ item.type }}
            </span>
          </div>
          <div class="acc__no">{{ item.accountNo }}</div>
        </div>
        <div class="acc__col">
          <span class="acc__col-label">总资产</span>
          <b>¥ {{ formatThousand(item.total, 2) }}</b>
        </div>
        <div class="acc__col">
          <span class="acc__col-label">可用资金</span>
          <span>¥ {{ formatThousand(item.available, 2) }}</span>
        </div>
        <div class="acc__col acc__col--pnl">
          <span class="acc__col-label">今日盈亏</span>
          <span class="acc__pnl-pill" :class="pnlClass(item.todayPnl)">
            {{ formatSigned(item.todayPnl) }}
          </span>
        </div>
      </li>
      <li v-if="filter === 'all'" class="acc__row acc__row--total">
        <span class="acc__avatar acc__avatar--muted">
          <svg
            fill="none"
            height="13"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            width="13"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        </span>
        <div class="acc__main">
          <div class="acc__name">合计</div>
        </div>
        <div class="acc__col">
          <span class="acc__col-label">&nbsp;</span>
          <b>¥ {{ formatThousand(summary.total, 2) }}</b>
        </div>
        <div class="acc__col">
          <span class="acc__col-label">&nbsp;</span>
          <span>¥ {{ formatThousand(summary.available, 2) }}</span>
        </div>
        <div class="acc__col acc__col--pnl">
          <span class="acc__col-label">&nbsp;</span>
          <span class="acc__pnl-pill" :class="pnlClass(summary.todayPnl)">
            {{ formatSigned(summary.todayPnl) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.acc {
  height: 100%;
  overflow: auto;
}

.acc__list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.acc__row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 7px 4px;
  border-bottom: 1px dashed hsl(var(--border) / 60%);
  border-radius: 8px;
  transition: background 0.15s;
}

.acc__row:hover {
  background: hsl(var(--muted) / 35%);
}

.acc__row:last-child {
  border-bottom: none;
}

.acc__row--total {
  margin-top: 2px;
  font-weight: var(--font-weight-strong);
  background: hsl(var(--muted) / 45%);
  border-bottom: none;
}

.acc__row--total:hover {
  background: hsl(var(--muted) / 45%);
}

/* ---- 头像色块 ---- */
.acc__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: var(--font-body);
  font-weight: var(--font-weight-strong);
  border-radius: 8px;
}

.acc__avatar--blue {
  color: hsl(215deg 85% 48%);
  background: hsl(215deg 90% 52% / 11%);
}

.acc__avatar--violet {
  color: hsl(258deg 68% 56%);
  background: hsl(258deg 85% 60% / 12%);
}

.acc__avatar--teal {
  color: hsl(172deg 66% 32%);
  background: hsl(172deg 72% 40% / 13%);
}

.acc__avatar--muted {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 80%);
}

.acc__main {
  flex: 1;
  min-width: 0;
}

.acc__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;

  /* 与原型 1.1 分账户资产对齐：账户名 13px（次要正文），数值列仍为 14px */
  font-size: var(--font-body);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.acc__tag {
  padding: 1px 5px;
  margin-left: 4px;
  font-size: var(--font-tiny);
  font-weight: var(--font-weight-normal);
  vertical-align: 1px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 80%);
  border-radius: 4px;
}

.acc__tag--credit {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 8%);
}

.acc__no {
  font-family: var(--font-numeric);
  font-size: var(--font-small);
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
  letter-spacing: -0.2px;
}

.acc__col {
  min-width: 96px;
  text-align: right;
}

.acc__col--pnl {
  min-width: 88px;
}

/* 列头与数据同级可读（审查 C3：表头 12 / 表体 14） */
.acc__col-label {
  display: block;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.acc__col b {
  font-size: var(--font-base);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
}

.acc__col span:not(.acc__col-label):not(.acc__pnl-pill) {
  font-size: var(--font-base);
  font-variant-numeric: tabular-nums;
}

/* ---- 盈亏胶囊（参考设计稿 My Holdings 的百分比徽标） ---- */
.acc__pnl-pill {
  display: inline-block;
  padding: 1.5px 8px;
  font-size: var(--font-small);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  border-radius: 999px;
}

.is-up {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 9%);
}

.is-down {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}
</style>
