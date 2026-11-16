import type { FeeDetail, TodayOverview, TodayTrade } from './types';

/**
 * 今日速览（1.2）演示数据
 * ---------------------------------------------------------------------------
 * 数值取自 UI 设计稿《02_1.2今日速览.html》。
 *
 * 与设计稿的差异（刻意为之）：设计稿的 KPI「今日成交额 ¥86,420 / 费用 ¥128.60」
 * 与下方成交明细（合计 ¥231,640.00）对不上。这里改为由成交明细 + A 股费率规则
 * 反推汇总指标，保证「笔数 / 成交额 / 费用 / 已实现」四项永远自洽，
 * 也正好对应后端返回 summary 时的一致性要求。
 */

// #region 费率规则与汇总计算

/** A 股默认费率（演示用，真实值以后端 12.2 费率配置为准） */
const FEE_RULE = {
  /** 佣金 0.025% */
  commissionRate: 0.000_25,
  /** 最低佣金 5 元 */
  minCommission: 5,
  /** 印花税 0.05%，仅卖出 */
  stampTaxRate: 0.0005,
  /** 过户费 0.001%，双向 */
  transferRate: 0.000_01,
} as const;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** 按成交额与方向计算费用 */
function calcFee(
  amount: number,
  side: 'buy' | 'sell',
): FeeDetail & { total: number } {
  const commission = round2(
    Math.max(amount * FEE_RULE.commissionRate, FEE_RULE.minCommission),
  );
  const stampTax = side === 'sell' ? round2(amount * FEE_RULE.stampTaxRate) : 0;
  const transferFee = round2(amount * FEE_RULE.transferRate);
  return {
    commission,
    stampTax,
    total: round2(commission + stampTax + transferFee),
    transferFee,
  };
}

/** 输入原始成交要素，自动补全成交额与费用 */
function buildTrade(input: Omit<TodayTrade, 'amount' | 'fee'>): TodayTrade {
  const amount = round2(input.price * input.qty);
  return { ...input, amount, fee: calcFee(amount, input.side).total };
}

// #endregion

// #region 今日成交明细

const TRADES: TodayTrade[] = [
  buildTrade({
    account: '华泰-主',
    code: '600519.SH',
    id: 'T-20261028-001',
    name: '贵州茅台',
    planned: true,
    price: 1658,
    qty: 100,
    realizedPnl: null,
    side: 'buy',
    time: '09:41:22',
  }),
  buildTrade({
    account: '华泰-主',
    code: '300750.SZ',
    id: 'T-20261028-002',
    name: '宁德时代',
    planned: true,
    price: 236.4,
    qty: 200,
    realizedPnl: null,
    side: 'buy',
    time: '10:12:08',
  }),
  buildTrade({
    account: '招商-两融',
    code: '601899.SH',
    id: 'T-20261028-003',
    name: '紫金矿业',
    planned: false,
    price: 18.56,
    qty: 1000,
    realizedPnl: 2146.8,
    side: 'sell',
    time: '14:03:55',
  }),
];

/** 由成交明细汇总出 summary，保证卡片与表格数字同源 */
function summarizeTrades(trades: TodayTrade[]) {
  const feeDetail: FeeDetail = { commission: 0, stampTax: 0, transferFee: 0 };
  for (const trade of trades) {
    const fee = calcFee(trade.amount, trade.side);
    feeDetail.commission = round2(feeDetail.commission + fee.commission);
    feeDetail.stampTax = round2(feeDetail.stampTax + fee.stampTax);
    feeDetail.transferFee = round2(feeDetail.transferFee + fee.transferFee);
  }

  return {
    buyCount: trades.filter((t) => t.side === 'buy').length,
    fee: round2(
      feeDetail.commission + feeDetail.stampTax + feeDetail.transferFee,
    ),
    feeDetail,
    realizedPnl: round2(
      trades.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0),
    ),
    sellCount: trades.filter((t) => t.side === 'sell').length,
    tradeCount: trades.length,
    turnover: round2(trades.reduce((sum, t) => sum + t.amount, 0)),
  };
}

// #endregion

/** 演示数据工厂：每次调用返回新对象，便于将来替换为接口响应 */
export function demoTodayOverview(): TodayOverview {
  const totals = summarizeTrades(TRADES);

  return {
    dataSource: '交割单导入 2026-10-28.xlsx',
    gainers: [
      {
        changePct: 3.42,
        code: '600519.SH',
        floatingPnl: 12_860,
        name: '贵州茅台',
        positionPct: 12.4,
        price: 1682,
      },
      {
        changePct: 2.81,
        code: '300750.SZ',
        floatingPnl: 6420,
        name: '宁德时代',
        positionPct: 8.6,
        price: 238.6,
      },
      {
        changePct: 2.35,
        code: '601899.SH',
        floatingPnl: 3180,
        name: '紫金矿业',
        positionPct: 5.2,
        price: 18.42,
      },
      {
        changePct: 1.02,
        code: '510300.SH',
        floatingPnl: 1240,
        name: '沪深300ETF',
        positionPct: 7.8,
        price: 3.986,
        priceDecimals: 3,
      },
      {
        changePct: 0.84,
        code: '000858.SZ',
        floatingPnl: 860,
        name: '五粮液',
        positionPct: 4.1,
        price: 142.3,
      },
    ],
    losers: [
      {
        changePct: -2.14,
        code: '002594.SZ',
        floatingPnl: -4860,
        name: '比亚迪',
        positionPct: 9.2,
        price: 264.8,
        stopDistancePct: -1.2,
      },
      {
        changePct: -1.46,
        code: '600036.SH',
        floatingPnl: -2140,
        name: '招商银行',
        positionPct: 11.8,
        price: 38.62,
      },
      {
        changePct: -1.2,
        code: '01211.HK',
        floatingPnl: -1020,
        name: '比亚迪股份',
        positionPct: 2.4,
        price: 246.2,
      },
      {
        changePct: -0.88,
        code: '601318.SH',
        floatingPnl: -640,
        name: '中国平安',
        positionPct: 6.3,
        price: 52.18,
      },
      {
        changePct: -0.31,
        code: '159915.SZ',
        floatingPnl: -180,
        name: '创业板ETF',
        positionPct: 4.6,
        price: 2.158,
        priceDecimals: 3,
      },
    ],
    quoteTime: '15:00',
    risk: {
      alerts: [{ code: '002594.SZ', name: '比亚迪', stopDistancePct: -1.2 }],
      stopLossHit: 0,
    },
    summary: {
      ...totals,
      operationCount: 3,
      operationLimit: 10,
      prevTurnover: 373_600,
      // 已实现收益率 = 已实现盈亏 / 卖出成交额（近似口径，真实值由后端计算）
      realizedPct: round2((totals.realizedPnl / 80_000) * 100),
    },
    syncedModules: ['3.1 成交记录', '2.2 资金流水'],
    tradeDate: '2026-10-28',
    trades: TRADES,
    updatedAt: '16:10',
  };
}
