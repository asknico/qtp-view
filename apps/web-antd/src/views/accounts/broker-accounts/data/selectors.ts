import type {
  AccountKpiItem,
  AccountOverview,
  AccountSummary,
  AccountTag,
  AccountType,
  BrokerAccount,
  CommissionMode,
  FeeRate,
  FeeRow,
  FeeSummary,
} from './types';

import { formatSigned, formatThousand } from '../../_shared/format';
import { formatWanRate } from '../../_shared/rate';

/**
 * 券商账户（2.1）派生数据
 * ---------------------------------------------------------------------------
 * 页面只从本文件取「可直接渲染」的数据，不自己算数：
 * KPI、汇总、费率表行、加权成本率全部在这里由账户集合推导。
 * 接入后端若已给出聚合值，替换本文件的实现即可，组件零改动。
 */

/** 启用账户（休眠账户不计入总资产、KPI 与费率加权） */
export function activeAccountsOf(accounts: BrokerAccount[]): BrokerAccount[] {
  return accounts.filter((account) => account.status === 'ACTIVE');
}

/** 账户集合汇总 */
export function summaryOf(accounts: BrokerAccount[]): AccountSummary {
  const summary: AccountSummary = {
    available: 0,
    creditNetAsset: 0,
    todayPnl: 0,
    totalAssets: 0,
  };
  for (const account of activeAccountsOf(accounts)) {
    summary.available += account.available;
    summary.totalAssets += account.totalAssets;
    summary.todayPnl += account.todayPnl;
    if (account.type === 'CREDIT') {
      summary.creditNetAsset += account.totalAssets;
    }
  }
  return summary;
}

/** 银证转账副行文案：「银证转出 1 笔」 */
function cashHintOf(cash: AccountOverview['weeklyCash']): string {
  const parts: string[] = [];
  if (cash.inCount > 0) parts.push(`转入 ${cash.inCount} 笔`);
  if (cash.outCount > 0) parts.push(`转出 ${cash.outCount} 笔`);
  return parts.length > 0 ? `银证${parts.join(' · ')}` : '本周无银证转账';
}

/** 顶部四张 KPI */
export function kpiItemsOf(overview: AccountOverview): AccountKpiItem[] {
  const active = activeAccountsOf(overview.accounts);
  const summary = summaryOf(overview.accounts);
  const normalCount = active.filter(
    (account) => account.type === 'NORMAL',
  ).length;
  const creditCount = active.length - normalCount;

  return [
    {
      key: 'accountCount',
      label: '券商账户',
      value: active.length,
      decimals: 0,
      unit: '个',
      hint: `普通 ${normalCount} · 信用 ${creditCount} · 全部正常`,
      accent: true,
    },
    {
      key: 'totalAssets',
      label: '账户总资产',
      value: summary.totalAssets,
      decimals: 2,
      hint: `含信用账户净资产 ${formatThousand(summary.creditNetAsset, 0)}`,
    },
    {
      key: 'available',
      label: '可用资金合计',
      value: summary.available,
      decimals: 2,
      hint: `可 T+0 转出 ${formatThousand(overview.t0Withdrawable, 2)}`,
    },
    {
      key: 'weeklyNetIn',
      label: '本周净入金',
      value: overview.weeklyCash.netIn,
      decimals: 2,
      tone: overview.weeklyCash.netIn < 0 ? 'down' : 'default',
      hint: cashHintOf(overview.weeklyCash),
    },
  ];
}

/** 账户卡上的板块标签：主板在前，信用账户插入「两融」，最多 4 个 */
export function cardTagsOf(account: BrokerAccount): AccountTag[] {
  const granted = account.boards.filter((board) => board.granted);
  const tags: AccountTag[] = [];
  const main = granted.find((board) => board.code === 'MAIN');
  if (main) tags.push({ text: main.name, tone: 'blue' });
  if (account.type === 'CREDIT') tags.push({ text: '两融', tone: 'red' });

  for (const board of granted) {
    if (board.code === 'MAIN') continue;
    if (tags.length >= 4) break;
    tags.push({
      text: board.name,
      tone: board.code === 'CONVERTIBLE' ? 'amber' : 'blue',
    });
  }
  return tags;
}

/** 综合成本率：全佣即佣金率，净佣需叠加规费 */
export function effectiveCostRate(fee: FeeRate): number {
  return fee.mode === 'NET'
    ? fee.commissionRate + fee.regulatoryFeeRate
    : fee.commissionRate;
}

/** 佣金率文案：万 1.20 */
export function commissionText(fee: FeeRate): string {
  return formatWanRate(fee.commissionRate);
}

/** 佣金率明细：「0.00012（万 1.20）」 */
export function commissionDetailText(fee: FeeRate): string {
  return `${fee.commissionRate.toFixed(5)}（${formatWanRate(fee.commissionRate, 1)}）`;
}

/** 佣金口径文案 */
export function modeText(mode: CommissionMode): string {
  return mode === 'ALL_IN' ? '全佣（已含规费）' : '净佣（另计规费）';
}

/** 费率表里的口径短标签 */
export function modeTagText(mode: CommissionMode): string {
  return mode === 'ALL_IN' ? '全佣' : '净佣';
}

/** 账户类型文案 */
export function accountTypeText(type: AccountType): string {
  return type === 'CREDIT' ? '信用' : '普通';
}

/** 详情卡状态胶囊：正常 / 休眠 */
export function statusPillText(account: BrokerAccount): string {
  return account.status === 'ACTIVE' ? '正常' : '休眠';
}

/** 费率表状态列：启用 / 休眠 */
export function statusTableText(account: BrokerAccount): string {
  return account.status === 'ACTIVE' ? '启用' : '休眠';
}

/** 交易经验：101 → 「8 年 5 个月」 */
export function experienceText(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} 个月`;
  return rest === 0 ? `${years} 年` : `${years} 年 ${rest} 个月`;
}

/** 账户展示名：「华泰证券 · 主账户」 */
export function accountNameOf(account: BrokerAccount): string {
  return `${account.broker} · ${account.alias}`;
}

/** 费率表行（含休眠账户，便于备查） */
export function feeRowsOf(accounts: BrokerAccount[]): FeeRow[] {
  return accounts.map((account) => ({
    accountId: account.id,
    accountName: accountNameOf(account),
    commissionRate: account.fee.commissionRate,
    effectiveRate: effectiveCostRate(account.fee),
    minCommission: account.fee.minCommission,
    mode: account.fee.mode,
    regulatoryFeeRate: account.fee.regulatoryFeeRate,
    status: account.status,
    stampTaxRate: account.fee.stampTaxRate,
    transferFeeRate: account.fee.transferFeeRate,
    type: account.type,
  }));
}

/** 费率表汇总：按总资产加权，并挑出净佣口径里成本最高的账户 */
export function feeSummaryOf(accounts: BrokerAccount[]): FeeSummary {
  const active = activeAccountsOf(accounts);
  let totalAssets = 0;
  let weightedCost = 0;
  let maxNet: BrokerAccount | null = null;

  for (const account of active) {
    totalAssets += account.totalAssets;
    weightedCost += account.totalAssets * effectiveCostRate(account.fee);
    if (account.fee.mode !== 'NET') continue;
    if (
      !maxNet ||
      effectiveCostRate(account.fee) > effectiveCostRate(maxNet.fee)
    ) {
      maxNet = account;
    }
  }

  return {
    weightedRate: totalAssets > 0 ? weightedCost / totalAssets : 0,
    maxNetAccountName: maxNet ? accountNameOf(maxNet) : '',
    maxNetCommissionRate: maxNet ? maxNet.fee.commissionRate : 0,
    maxNetEffectiveRate: maxNet ? effectiveCostRate(maxNet.fee) : 0,
  };
}

/** 加权佣金率的展示文案：万 1.61 */
export function weightedRateText(summary: FeeSummary): string {
  return formatWanRate(summary.weightedRate, 2);
}

/** 净佣账户综合成本相对佣金率的溢价：「高出 21.6%」 */
export function netPremiumText(summary: FeeSummary): string {
  const { maxNetCommissionRate, maxNetEffectiveRate } = summary;
  if (maxNetCommissionRate <= 0 || maxNetEffectiveRate <= 0) return '';
  const premium = (maxNetEffectiveRate / maxNetCommissionRate - 1) * 100;
  return `高出 ${premium.toFixed(1)}%`;
}

/** 今日盈亏文案 +4,820.30 */
export function pnlText(value: number): string {
  return formatSigned(value);
}
