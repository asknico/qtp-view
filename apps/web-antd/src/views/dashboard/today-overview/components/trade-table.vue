<script lang="ts" setup>
import type { TodayTrade } from '../data/types';

import {
  avatarChar,
  money,
  planLabel,
  price,
  sideLabel,
  signedMoney,
  thousands,
  toneClass,
} from '../data/format';

interface Props {
  rows: TodayTrade[];
  emptyText?: string;
}

withDefaults(defineProps<Props>(), { emptyText: '今日暂无成交记录' });

/** 按代码哈希取色板索引，与涨跌榜同规则同名同色 */
const AVATAR_TONES = ['blue', 'violet', 'teal'] as const;

function avatarTone(code: string): string {
  const hash = [...code].reduce((sum, ch) => sum + (ch.codePointAt(0) ?? 0), 0);
  return `avatar--${AVATAR_TONES[hash % AVATAR_TONES.length]}`;
}
</script>

<template>
  <div class="trade">
    <table class="trade__table">
      <colgroup>
        <col style="width: 7%" />
        <col style="width: 12%" />
        <col style="width: 22%" />
        <col style="width: 8%" />
        <col style="width: 10%" />
        <col style="width: 10%" />
        <col style="width: 12%" />
        <col style="width: 9%" />
        <col style="width: 10%" />
        <col style="width: 10%" />
      </colgroup>
      <thead>
        <tr>
          <th>时间</th>
          <th>账户</th>
          <th>名称 / 代码</th>
          <th class="ta-c">方向</th>
          <th class="ta-r">成交价</th>
          <th class="ta-r">数量</th>
          <th class="ta-r">成交额</th>
          <th class="ta-r">费用</th>
          <th class="ta-r">已实现</th>
          <th class="ta-c">计划</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td class="trade__time">{{ row.time }}</td>
          <td>{{ row.account }}</td>
          <td>
            <span class="trade__stock">
              <span class="trade__avatar" :class="avatarTone(row.code)">
                {{ avatarChar(row.name) }}
              </span>
              <b class="trade__name">{{ row.name }}</b>
              <span class="trade__code">{{ row.code }}</span>
            </span>
          </td>
          <td class="ta-c">
            <span
              class="tag"
              :class="row.side === 'buy' ? 'tag--buy' : 'tag--sell'"
            >
              {{ sideLabel(row.side) }}
            </span>
          </td>
          <td class="ta-r">{{ price(row.price, 2) }}</td>
          <td class="ta-r">{{ thousands(row.qty, 0) }}</td>
          <td class="ta-r">{{ money(row.amount) }}</td>
          <td class="ta-r">{{ money(row.fee) }}</td>
          <td class="ta-r" :class="toneClass(row.realizedPnl ?? 0)">
            {{ row.realizedPnl === null ? '—' : signedMoney(row.realizedPnl) }}
          </td>
          <td class="ta-c">
            <span
              class="tag"
              :class="row.planned ? 'tag--planned' : 'tag--unplanned'"
            >
              {{ planLabel(row.planned) }}
            </span>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td class="trade__empty" colspan="10">{{ emptyText }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.trade {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
}

.trade__table {
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

.ta-c {
  text-align: center;
}

.trade__time {
  font-family: ui-monospace, Consolas, 'SF Mono', monospace;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
}

.trade__stock {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.trade__avatar {
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

.trade__avatar.avatar--blue {
  color: hsl(215deg 85% 48%);
  background: hsl(215deg 90% 52% / 12%);
}

.trade__avatar.avatar--violet {
  color: hsl(258deg 68% 56%);
  background: hsl(258deg 85% 60% / 13%);
}

.trade__avatar.avatar--teal {
  color: hsl(172deg 66% 32%);
  background: hsl(172deg 72% 40% / 14%);
}

.trade__name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.trade__code {
  font-family: ui-monospace, Consolas, 'SF Mono', monospace;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
  letter-spacing: -0.2px;
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  font-size: 10.5px;
  font-weight: 500;
  border-radius: 999px;
}

.tag--buy {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 9%);
}

.tag--sell {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 9%);
}

.tag--planned {
  color: hsl(215deg 85% 58%);

  /* 主题安全色：--primary 在深色主题下是黑色，标签需恒定亮色 */
  background: hsl(215deg 85% 55% / 13%);
}

.tag--unplanned {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 12%);
}

.trade__empty {
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
