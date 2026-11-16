<script lang="ts" setup>
import type { HoldingMover } from '../data/types';

import {
  avatarChar,
  price,
  signedMoney,
  signedPct,
  toneClass,
} from '../data/format';

interface Props {
  rows: HoldingMover[];
  /** 空态文案 */
  emptyText?: string;
}

withDefaults(defineProps<Props>(), { emptyText: '今日无持仓' });

/** 按代码哈希取色板索引，同名股票在两张表里颜色一致 */
const AVATAR_TONES = ['blue', 'violet', 'teal'] as const;

function avatarTone(code: string): string {
  const hash = [...code].reduce((sum, ch) => sum + (ch.codePointAt(0) ?? 0), 0);
  return `avatar--${AVATAR_TONES[hash % AVATAR_TONES.length]}`;
}
</script>

<template>
  <div class="mover">
    <table class="mover__table">
      <colgroup>
        <col style="width: 34%" />
        <col style="width: 16%" />
        <col style="width: 16%" />
        <col style="width: 18%" />
        <col style="width: 16%" />
      </colgroup>
      <thead>
        <tr>
          <th>名称 / 代码</th>
          <th class="ta-r">现价</th>
          <th class="ta-r">涨跌幅</th>
          <th class="ta-r">浮动盈亏</th>
          <th class="ta-r">仓位</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.code">
          <td>
            <span class="mover__stock">
              <span class="mover__avatar" :class="avatarTone(row.code)">
                {{ avatarChar(row.name) }}
              </span>
              <b class="mover__name">{{ row.name }}</b>
              <span
                v-if="
                  row.stopDistancePct !== undefined && row.stopDistancePct < 0
                "
                class="mover__stop"
              >
                止损 {{ signedPct(row.stopDistancePct, 1) }}
              </span>
              <span v-else class="mover__code">{{ row.code }}</span>
            </span>
          </td>
          <td class="ta-r">{{ price(row.price, row.priceDecimals ?? 2) }}</td>
          <td class="ta-r">
            <span class="mover__pct" :class="toneClass(row.changePct)">
              {{ signedPct(row.changePct) }}
            </span>
          </td>
          <td class="ta-r" :class="toneClass(row.floatingPnl)">
            {{ signedMoney(row.floatingPnl, 0) }}
          </td>
          <td class="ta-r">
            <span class="mover__pos">
              <i class="mover__pos-bar">
                <i :style="{ width: `${Math.min(row.positionPct, 100)}%` }"></i>
              </i>
              {{ row.positionPct.toFixed(1) }}%
            </span>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td class="mover__empty" colspan="5">{{ emptyText }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.mover {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
}

.mover__table {
  flex: 1;
  width: 100%;
  font-variant-numeric: tabular-nums;
  table-layout: fixed;
  border-collapse: collapse;
}

th {
  height: 30px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  text-align: left;
  white-space: nowrap;
  background: hsl(var(--muted) / 35%);
  border-bottom: 1px solid hsl(var(--border));
}

td {
  height: 34px;
  padding: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  white-space: nowrap;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

tbody tr {
  transition: background 0.15s;
}

tbody tr:hover {
  background: hsl(var(--muted) / 40%);
}

tbody tr:last-child td {
  border-bottom: none;
}

.ta-r {
  text-align: right;
}

.mover__stock {
  display: flex;
  gap: 7px;
  align-items: center;
  min-width: 0;
}

/* ---- 头像色块（按代码哈希取色，与分账户卡同套色板） ---- */
.mover__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 6px;
}

.mover__avatar.avatar--blue {
  color: hsl(215deg 85% 48%);
  background: hsl(215deg 90% 52% / 12%);
}

.mover__avatar.avatar--violet {
  color: hsl(258deg 68% 56%);
  background: hsl(258deg 85% 60% / 13%);
}

.mover__avatar.avatar--teal {
  color: hsl(172deg 66% 32%);
  background: hsl(172deg 72% 40% / 14%);
}

.mover__name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.mover__code {
  font-family: ui-monospace, Consolas, 'SF Mono', monospace;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
  letter-spacing: -0.2px;
}

/* 止损预警小标（amber） */
.mover__stop {
  flex: 0 0 auto;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 500;
  line-height: 15px;
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 12%);
  border-radius: 999px;
}

/* ---- 涨跌幅胶囊 ---- */
.mover__pct {
  display: inline-block;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
}

.mover__pct.is-up {
  background: hsl(var(--stock-up) / 9%);
}

.mover__pct.is-down {
  background: hsl(var(--stock-down) / 9%);
}

/* ---- 仓位：细条 + 数值 ---- */
.mover__pos {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.mover__pos-bar {
  display: inline-block;
  width: 34px;
  height: 4px;
  overflow: hidden;
  background: hsl(var(--muted) / 80%);
  border-radius: 2px;
}

.mover__pos-bar i {
  display: block;
  height: 100%;
  background: hsl(var(--primary) / 70%);
  border-radius: 2px;
}

.mover__empty {
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}
</style>
