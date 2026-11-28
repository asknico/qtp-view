<script lang="ts" setup>
import type { BrokerAccount } from '../data/types';

import { computed } from 'vue';

import { formatThousand } from '../../_shared/format';
import {
  accountTypeText,
  cardTagsOf,
  commissionText,
  modeTagText,
  pnlText,
} from '../data/selectors';

/**
 * 单个账户概览卡（顶部三张，选中态由父级控制）
 * 只展示「一眼要看」的三个数：总资产 / 可用资金 / 今日盈亏，其余下钻到账户详情。
 */
interface Props {
  account: BrokerAccount;
  selected: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  configPool: [id: string];
  select: [id: string];
}>();

const tags = computed(() => cardTagsOf(props.account));

/** 所属券商资金池状态（2.4 券商级一对一：池归属于券商，旗下账户共用）；点击打开配置弹窗 */
const poolText = computed(() =>
  props.account.poolConfigured
    ? `券商池 ${formatThousand(props.account.poolAllocated, 0)} · ${props.account.poolCount} 类`
    : '券商池未绑定 · 去配置',
);

const figures = computed(() => [
  {
    label: '总资产',
    value: formatThousand(props.account.totalAssets, 2),
    tone: '',
  },
  {
    label: '可用资金',
    value: formatThousand(props.account.available, 2),
    tone: '',
  },
  {
    label: '今日盈亏',
    value: pnlText(props.account.todayPnl),
    tone:
      props.account.todayPnl === 0
        ? ''
        : (props.account.todayPnl > 0
          ? 'is-up'
          : 'is-down'),
  },
]);
</script>

<template>
  <article
    class="aoc"
    :class="{ 'aoc--selected': selected }"
    @click="emit('select', account.id)"
  >
    <header class="aoc__head">
      <b class="aoc__name">{{ account.broker }} · {{ account.alias }}</b>
      <span
        class="aoc__pill"
        :class="
          account.type === 'CREDIT' ? 'aoc__pill--credit' : 'aoc__pill--normal'
        "
      >
        {{ accountTypeText(account.type) }}
      </span>
      <span class="aoc__no">{{ account.accountNo }}</span>
    </header>

    <div class="aoc__figures">
      <div v-for="fig in figures" :key="fig.label" class="aoc__fig">
        <span class="aoc__fig-label">{{ fig.label }}</span>
        <b class="aoc__fig-value" :class="fig.tone">{{ fig.value }}</b>
      </div>
    </div>

    <div class="aoc__tags">
      <span
        v-for="tag in tags"
        :key="tag.text"
        class="aoc__tag"
        :class="`aoc__tag--${tag.tone}`"
      >
        {{ tag.text }}
      </span>
      <span
        class="aoc__tag aoc__tag--pool"
        :class="account.poolConfigured ? 'aoc__tag--blue' : 'aoc__tag--amber'"
        role="button"
        title="配置所属券商资金池（券商级一对一：旗下账户共用，池总额按券商资产占比控制）"
        @click.stop="emit('configPool', account.id)"
      >
        {{ poolText }}
      </span>
    </div>

    <footer class="aoc__fee">
      <span>佣金 <b>{{ commissionText(account.fee) }}</b></span>
      <span>{{ modeTagText(account.fee.mode) }}口径</span>
      <span>最低 ¥{{ account.fee.minCommission.toFixed(2) }}</span>
    </footer>
  </article>
</template>

<style scoped>
.aoc {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 11px 14px;
  overflow: hidden;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}

.aoc:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 3px 10px rgb(16 24 40 / 7%);
}

.aoc--selected {
  border-color: hsl(var(--primary) / 42%);
  box-shadow:
    0 0 0 1px hsl(var(--primary) / 14%),
    0 2px 9px rgb(16 24 40 / 6%);
}

.aoc--selected::before {
  position: absolute;
  top: 11px;
  bottom: 11px;
  left: 0;
  width: 2.5px;
  content: '';
  background: hsl(var(--primary));
  border-radius: 0 3px 3px 0;
}

.aoc__head {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.aoc__name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-title);
  font-weight: var(--font-weight-strong);
  white-space: nowrap;
}

.aoc__pill {
  flex: 0 0 auto;
  padding: 1px 6px;
  font-size: var(--font-tiny);
  font-weight: var(--font-weight-medium);
  border-radius: 999px;
}

.aoc__pill--normal {
  color: hsl(215deg 80% 46%);
  background: hsl(215deg 90% 52% / 10%);
}

.aoc__pill--credit {
  color: hsl(32deg 88% 38%);
  background: hsl(38deg 95% 50% / 14%);
}

.aoc__no {
  margin-left: auto;
  overflow: hidden;
  font-family: var(--font-numeric);
  font-size: var(--font-small);
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
  letter-spacing: -0.2px;
  white-space: nowrap;
}

.aoc__figures {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.aoc__fig {
  min-width: 0;
}

.aoc__fig-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.aoc__fig-value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-value);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.aoc__tags {
  display: flex;
  gap: 4px;
  padding-top: 9px;
  margin-top: auto;
  overflow: hidden;
}

.aoc__tag {
  flex: 0 0 auto;
  padding: 1px 6px;
  font-size: var(--font-tiny);
  line-height: 16px;
  white-space: nowrap;
  border-radius: 4px;
}

.aoc__tag--blue {
  color: hsl(215deg 80% 46%);
  background: hsl(215deg 90% 52% / 9%);
}

.aoc__tag--amber {
  color: hsl(32deg 88% 38%);
  background: hsl(38deg 95% 50% / 13%);
}

.aoc__tag--red {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 9%);
}

.aoc__tag--slate {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 80%);
}

/* 资金池标签：可点击进入配置弹窗 */
.aoc__tag--pool {
  cursor: pointer;
  border: 1px dashed currentcolor;
}

.aoc__tag--pool:hover {
  filter: brightness(0.95);
}

.aoc__fee {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-top: 7px;
  margin-top: 7px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  border-top: 1px dashed hsl(var(--border) / 55%);
}

.aoc__fee b {
  font-weight: var(--font-weight-strong);
  color: hsl(var(--foreground));
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}
</style>
