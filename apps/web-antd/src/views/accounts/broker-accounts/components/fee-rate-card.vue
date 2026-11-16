<script lang="ts" setup>
import type {
  AccountType,
  CommissionMode,
  FeeRow,
  FeeSummary,
} from '../data/types';

import { computed } from 'vue';

import { formatRateDecimals, formatWanRate } from '../../_shared/rate';
import {
  accountTypeText,
  modeTagText,
  netPremiumText,
  weightedRateText,
} from '../data/selectors';

/**
 * 分账户费率与口径
 * ---------------------------------------------------------------------------
 * 关键点不是佣金率本身，而是「全佣 / 净佣」口径差：
 *   全佣 = 佣金已含规费，按佣金率结算；
 *   净佣 = 佣金之外还要再交规费（万 0.541），真实成本要叠加。
 * 合计行按总资产加权，权重用总资产而非账户数，否则小额账户会拉偏结论。
 */
interface Props {
  rows: FeeRow[];
  selectedId: string;
  summary: FeeSummary;
}

const props = defineProps<Props>();

const emit = defineEmits<{ create: []; select: [id: string] }>();

/** 启用账户中最优（最低）佣金率 */
const bestRateText = computed(() => {
  const active = props.rows.filter((row) => row.status === 'ACTIVE');
  if (active.length === 0) return '—';
  const best = Math.min(...active.map((row) => row.commissionRate));
  return formatWanRate(best, 2);
});

function typeText(type: AccountType): string {
  return accountTypeText(type);
}

function modeText(mode: CommissionMode): string {
  return modeTagText(mode);
}

function isDormant(row: FeeRow): boolean {
  return row.status === 'DORMANT';
}
</script>

<template>
  <div class="frc">
    <div class="frc__tools">
      <span class="frc__tools-title">分账户费率配置</span>
      <span class="frc__tools-hint">规费 / 印花税 / 过户费为交易所统一标准</span>
      <button class="frc__link" type="button" @click="emit('create')">
        ＋ 新建账户
      </button>
    </div>

    <div class="frc__table-wrap">
      <table class="frc__table">
        <colgroup>
          <col style="width: 23%" />
          <col style="width: 8%" />
          <col style="width: 10%" />
          <col style="width: 11%" />
          <col style="width: 10%" />
          <col style="width: 10%" />
          <col style="width: 11%" />
          <col style="width: 8%" />
          <col style="width: 9%" />
        </colgroup>
        <thead>
          <tr>
            <th>账户</th>
            <th class="is-center">类型</th>
            <th class="is-right">佣金率</th>
            <th class="is-right">最低佣金</th>
            <th class="is-right">印花税</th>
            <th class="is-right">过户费</th>
            <th class="is-right">规费</th>
            <th class="is-center">口径</th>
            <th class="is-center">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.accountId"
            class="frc__row"
            :class="{
              'is-selected': row.accountId === selectedId,
              'is-dormant': isDormant(row),
            }"
            @click="emit('select', row.accountId)"
          >
            <td>
              <b class="frc__name">{{ row.accountName }}</b>
              <span class="frc__id">{{ row.accountId }}</span>
            </td>
            <td class="is-center">
              <span
                class="frc__tag"
                :class="
                  row.type === 'CREDIT' ? 'frc__tag--amber' : 'frc__tag--blue'
                "
              >
                {{ typeText(row.type) }}
              </span>
            </td>
            <td class="is-right is-mono">
              {{ formatRateDecimals(row.commissionRate) }}
            </td>
            <td class="is-right is-mono">
              ¥{{ row.minCommission.toFixed(2) }}
            </td>
            <td class="is-right is-mono">
              {{ formatRateDecimals(row.stampTaxRate) }}
            </td>
            <td class="is-right is-mono">
              {{ formatRateDecimals(row.transferFeeRate) }}
            </td>
            <td class="is-right is-mono">
              {{ formatRateDecimals(row.regulatoryFeeRate) }}
            </td>
            <td class="is-center">
              <span
                class="frc__tag"
                :class="
                  row.mode === 'ALL_IN' ? 'frc__tag--green' : 'frc__tag--red'
                "
              >
                {{ modeText(row.mode) }}
              </span>
            </td>
            <td class="is-center">
              <span
                class="frc__tag"
                :class="isDormant(row) ? 'frc__tag--slate' : 'frc__tag--green'"
              >
                {{ isDormant(row) ? '休眠' : '启用' }}
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <b>合计 / 加权</b>
            </td>
            <td class="is-center">—</td>
            <td class="is-right frc__weighted">
              {{ weightedRateText(props.summary) }}
            </td>
            <td class="is-right">—</td>
            <td class="is-right">—</td>
            <td class="is-right">—</td>
            <td class="is-right">—</td>
            <td class="is-center">综合</td>
            <td class="is-center">—</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="frc__strip">
      <div class="frc__metric">
        <span>加权综合成本</span>
        <b>{{ weightedRateText(props.summary) }}</b>
      </div>
      <div class="frc__metric">
        <span>净佣溢价</span>
        <b class="is-warn">{{ netPremiumText(props.summary) || '—' }}</b>
      </div>
      <div class="frc__metric">
        <span>最佳佣金率</span>
        <b>{{ bestRateText }}</b>
      </div>
      <div class="frc__metric">
        <span>启用账户</span>
        <b>{{ rows.filter((row) => !isDormant(row)).length }} /
          {{ rows.length }}</b>
      </div>
    </div>

    <p class="frc__note">
      <span class="frc__note-mark">!</span>
      <span>
        净佣口径的真实成本 = 佣金率 + 规费 0.00541%；
        <b>{{ props.summary.maxNetAccountName }}</b> 综合费率
        <b>{{ formatWanRate(props.summary.maxNetEffectiveRate, 2) }}</b>，比票面佣金率
        {{ netPremiumText(props.summary) }}。全佣口径无需再叠加规费。
      </span>
    </p>
  </div>
</template>

<style scoped>
.frc {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 9px 14px 11px;
}

.frc__tools {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
}

.frc__tools-title {
  font-size: 12px;
  font-weight: 600;
}

.frc__tools-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.frc__link {
  padding: 0;
  margin-left: auto;
  font-size: 11.5px;
  color: hsl(var(--primary));
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.frc__table-wrap {
  flex: 1;
  min-height: 0;
  margin: 0 -14px;
  overflow: auto;
  scrollbar-width: thin;
}

.frc__table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.frc__table th {
  height: 30px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  text-align: left;
  white-space: nowrap;
  background: hsl(var(--muted) / 34%);
  border-bottom: 1px solid hsl(var(--border) / 70%);
}

.frc__table td {
  height: 36px;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  white-space: nowrap;
  border-bottom: 1px solid hsl(var(--border) / 40%);
}

.frc__row {
  cursor: pointer;
  transition: background 0.15s;
}

.frc__row:hover {
  background: hsl(var(--muted) / 30%);
}

.frc__row.is-selected {
  background: hsl(var(--primary) / 5%);
}

.frc__row.is-selected td:first-child {
  box-shadow: inset 2.5px 0 0 hsl(var(--primary));
}

.frc__row.is-dormant td {
  color: hsl(var(--muted-foreground));
}

.frc__table tfoot td {
  height: 34px;
  font-size: 11.5px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 45%);
  border-bottom: none;
}

.frc__weighted {
  color: hsl(var(--foreground));
}

.frc__name {
  font-weight: 500;
}

.frc__id {
  margin-left: 4px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
}

.is-mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
}

.is-right {
  text-align: right;
}

.is-center {
  text-align: center;
}

.frc__tag {
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  line-height: 16px;
  border-radius: 4px;
}

.frc__tag--blue {
  color: hsl(215deg 80% 46%);
  background: hsl(215deg 90% 52% / 10%);
}

.frc__tag--amber {
  color: hsl(32deg 88% 38%);
  background: hsl(38deg 95% 50% / 14%);
}

.frc__tag--green {
  color: hsl(172deg 66% 30%);
  background: hsl(172deg 72% 40% / 13%);
}

.frc__tag--red {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 9%);
}

.frc__tag--slate {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 85%);
}

.frc__strip {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 0 0;
}

.frc__metric {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px;
  background: hsl(var(--muted) / 30%);
  border-radius: 8px;
}

.frc__metric span {
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
}

.frc__metric b {
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}

.frc__metric .is-warn {
  color: hsl(32deg 88% 38%);
}

.frc__note {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
  align-items: flex-start;
  padding: 8px 10px;
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.55;
  color: hsl(32deg 70% 28%);
  background: hsl(38deg 95% 50% / 9%);
  border: 1px solid hsl(38deg 90% 55% / 22%);
  border-radius: 8px;
}

.frc__note b {
  font-weight: 600;
}

.frc__note-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  margin-top: 1px;
  font-size: 9.5px;
  font-weight: 700;
  color: #fff;
  background: hsl(32deg 85% 48%);
  border-radius: 50%;
}
</style>
