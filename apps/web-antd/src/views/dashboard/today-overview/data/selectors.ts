import type { TodayKpiCard, TodayOverview } from './types';

import { money, signedMoney, signedPct } from './format';

/**
 * 今日速览（1.2）视图模型派生
 * ---------------------------------------------------------------------------
 * DTO → 展示模型的唯一入口：组件只管画，页面只管排版，
 * 所有「算占比 / 拼文案 / 判超限」的逻辑集中在此，方便单测与接口切换。
 */

/** 顶部 5 张 KPI 卡 */
export function buildKpiCards(data: TodayOverview): TodayKpiCard[] {
  const s = data.summary;
  const share = s.prevTurnover > 0 ? (s.turnover / s.prevTurnover) * 100 : 0;
  const overLimit = s.operationCount > s.operationLimit;

  return [
    {
      icon: 'tradeCount',
      key: 'tradeCount',
      label: '今日成交',
      display: `${s.tradeCount}`,
      tone: 'blue',
      unit: '笔',
      parts: [
        { text: `买入 ${s.buyCount} · 卖出 ${s.sellCount}`, tone: 'muted' },
      ],
    },
    {
      icon: 'turnover',
      key: 'turnover',
      label: '今日成交额',
      display: `¥ ${money(s.turnover, 0)}`,
      tone: 'teal',
      parts: [{ text: `占昨日成交额 ${share.toFixed(0)}%`, tone: 'muted' }],
    },
    {
      accent: true,
      icon: 'realizedPnl',
      key: 'realizedPnl',
      label: '今日实现盈亏',
      display: signedMoney(s.realizedPnl, 2),
      tone: 'violet',
      valueTone: s.realizedPnl >= 0 ? 'up' : 'down',
      parts: [
        {
          text: signedPct(s.realizedPct, 2),
          tone: s.realizedPct >= 0 ? 'up' : 'down',
        },
        { text: '已扣费用', tone: 'muted' },
      ],
    },
    {
      icon: 'fee',
      key: 'fee',
      label: '今日费用',
      display: `¥ ${money(s.fee, 2)}`,
      tone: 'amber',
      parts: [
        {
          text: `佣金 ${money(s.feeDetail.commission)} · 印花税 ${money(s.feeDetail.stampTax)} · 过户费 ${money(s.feeDetail.transferFee)}`,
          tone: 'muted',
        },
      ],
    },
    {
      icon: 'operationCount',
      key: 'operationCount',
      label: '今日操作次数',
      display: `${s.operationCount}`,
      tone: 'orange',
      unit: `/ ${s.operationLimit}`,
      parts: [],
      pill: overLimit
        ? { text: '已超限', tone: 'danger' }
        : { text: '未超限', tone: 'ok' },
    },
  ];
}

/** 页头副标题：交易日 + 行情时间 + 同步时间 */
export function subtitleOf(data: TodayOverview): string {
  return `${data.tradeDate} 收盘 · 行情 ${data.quoteTime} · 数据同步 ${data.updatedAt}`;
}

/** 涨幅榜页脚 */
export function gainerFooterOf(data: TodayOverview): string {
  return `行情时间 ${data.quoteTime} 收盘 · 浮动盈亏按移动加权成本计算`;
}

/** 跌幅榜页脚：止损/预警命中情况 */
export function loserFooterOf(data: TodayOverview): string {
  const { alerts, stopLossHit } = data.risk;
  const base = `触及止损 ${stopLossHit} 只 · 触及预警 ${alerts.length} 只`;
  const first = alerts[0];
  if (!first) return base;
  const names = alerts.map((item) => item.name).join('、');
  return `${base}（${names}，距止损 ${first.stopDistancePct.toFixed(1)}%）`;
}

/** 成交记录页脚：合计行 */
export function tradeTotalsOf(data: TodayOverview): string {
  const s = data.summary;
  return `合计 ${s.tradeCount} 笔 · 成交额 ¥${money(s.turnover)} · 费用 ¥${money(s.fee)}`;
}

/** 成交记录页脚：同步去向 */
export function syncedModulesOf(data: TodayOverview): string {
  const list = data.syncedModules ?? [];
  return list.length > 0
    ? `已同步至 ${list.join(' / ')}`
    : '尚未同步至其他模块';
}

/** 数据来源（成交记录卡副标题） */
export function dataSourceOf(data: TodayOverview): string {
  return data.dataSource ?? '手工记录';
}
