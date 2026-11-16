<script lang="ts" setup>
import type { BrokerAccount } from '../data/types';

import { computed } from 'vue';

import { formatThousand } from '../../_shared/format';
import { grantedBoardText } from '../../_shared/rate';
import {
  accountNameOf,
  accountTypeText,
  commissionDetailText,
  experienceText,
  modeText,
  statusPillText,
} from '../data/selectors';

/**
 * 账户详情：身份信息 + 关键字段 + 板块权限台账
 * 台账是「能不能买」的前置条件，比费率更常被查，所以放在同一张卡的下半部分。
 */
interface Props {
  account: BrokerAccount | null;
}

const props = defineProps<Props>();

/** 两列排布，按「属性 → 数值」成对归组，避免单列把卡片拉到超出视口 */
const kvRows = computed(() => {
  const account = props.account;
  if (!account) return [];
  return [
    {
      key: '账户类型',
      value: `${accountTypeText(account.type)}（${account.type}）`,
    },
    { key: '风险等级', value: account.riskLevel },
    { key: '开通板块', value: grantedBoardText(account) },
    { key: '交易经验', value: experienceText(account.experienceMonths) },
    { key: '佣金费率', value: commissionDetailText(account.fee) },
    { key: '佣金口径', value: modeText(account.fee.mode) },
    { key: '最低佣金', value: `¥${account.fee.minCommission.toFixed(2)} / 笔` },
    { key: '当前资产', value: `¥ ${formatThousand(account.totalAssets, 2)}` },
  ];
});

function avatarText(account: BrokerAccount): string {
  return account.broker.slice(0, 1);
}
</script>

<template>
  <div v-if="account" class="adc">
    <div class="adc__identity">
      <span class="adc__avatar" :class="`adc__avatar--${account.chipTone}`">
        {{ avatarText(account) }}
      </span>
      <div class="adc__ident-main">
        <div class="adc__ident-name">{{ accountNameOf(account) }}</div>
        <div class="adc__ident-sub">
          资金账号 {{ account.accountNo }} · 开户 {{ account.openedAt }} ·
          用途：{{ account.purpose }}
        </div>
      </div>
      <span
        class="adc__status"
        :class="
          account.status === 'ACTIVE' ? 'adc__status--ok' : 'adc__status--off'
        "
      >
        {{ statusPillText(account) }}
      </span>
    </div>

    <dl class="adc__kv">
      <div v-for="row in kvRows" :key="row.key" class="adc__kv-row">
        <dt>{{ row.key }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>

    <div class="adc__divider"></div>

    <div class="adc__section">板块权限台账</div>
    <ul class="adc__boards">
      <li v-for="board in account.boards" :key="board.code" class="adc__board">
        <span class="adc__check" :class="{ 'is-on': board.granted }"></span>
        <span class="adc__board-name">{{ board.name }}</span>
        <span class="adc__board-req">{{ board.requirement }}</span>
        <span class="adc__board-state" :class="{ 'is-granted': board.granted }">
          {{ board.granted ? '已开通' : '未开通' }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.adc {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
}

.adc::-webkit-scrollbar {
  width: 6px;
}

.adc::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.adc__identity {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.adc__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  border-radius: 9px;
}

.adc__avatar--blue {
  background: linear-gradient(135deg, hsl(215deg 85% 52%), hsl(240deg 80% 62%));
}

.adc__avatar--violet {
  background: linear-gradient(135deg, hsl(258deg 70% 58%), hsl(285deg 70% 60%));
}

.adc__avatar--teal {
  background: linear-gradient(135deg, hsl(172deg 62% 40%), hsl(190deg 65% 45%));
}

.adc__avatar--gray {
  background: linear-gradient(135deg, hsl(215deg 12% 55%), hsl(215deg 10% 63%));
}

.adc__ident-main {
  min-width: 0;
}

.adc__ident-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.adc__ident-sub {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.adc__status {
  flex: 0 0 auto;
  padding: 1px 7px;
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 500;
  border-radius: 999px;
}

.adc__status--ok {
  color: hsl(172deg 66% 30%);
  background: hsl(172deg 72% 40% / 13%);
}

.adc__status--off {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 85%);
}

.adc__kv {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
  padding: 0;
  margin: 0;
}

.adc__kv-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed hsl(var(--border) / 55%);
}

.adc__kv-row:nth-last-child(-n + 2) {
  border-bottom: none;
}

.adc__kv-row dt {
  flex: 0 0 auto;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
}

.adc__kv-row dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.adc__divider {
  height: 1px;
  margin: 9px 0;
  background: hsl(var(--border) / 60%);
}

.adc__section {
  margin-bottom: 4px;
  font-size: 11.5px;
  font-weight: 600;
}

.adc__boards {
  padding: 0;
  margin: 0;
  list-style: none;
}

.adc__board {
  display: flex;
  gap: 7px;
  align-items: center;
  padding: 4px 0;
  font-size: 11px;
  border-bottom: 1px dashed hsl(var(--border) / 45%);
}

.adc__board:last-child {
  border-bottom: none;
}

.adc__check {
  position: relative;
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
  border: 1.2px solid hsl(var(--border));
  border-radius: 3.5px;
}

.adc__check.is-on {
  background: hsl(172deg 62% 40%);
  border-color: hsl(172deg 62% 40%);
}

.adc__check.is-on::after {
  position: absolute;
  top: 1px;
  left: 4px;
  width: 3px;
  height: 7px;
  content: '';
  border: solid #fff;
  border-width: 0 1.6px 1.6px 0;
  transform: rotate(42deg);
}

.adc__board-name {
  flex: 0 0 62px;
  font-weight: 500;
}

.adc__board-req {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.adc__board-state {
  flex: 0 0 auto;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
}

.adc__board-state.is-granted {
  color: hsl(172deg 66% 30%);
}
</style>
