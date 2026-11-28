import type {
  AccountOverview,
  BoardCode,
  BoardPermission,
  BrokerAccount,
  FeeRate,
} from './types';

/**
 * 券商账户（2.1）演示数据
 * ---------------------------------------------------------------------------
 * 与「资产总览」「今日速览」「自定义看板」同一套口径，改动时三处一起改：
 *   总资产   1,286,430.55 = 682,410.20 + 468,220.35 + 135,800.00
 *   可用资金   147,240.75 =  96,420.55 +  32,180.00 +  18,640.20
 *   今日盈亏     8,412.30 =   4,820.30 +   2,680.10 +     911.90
 * 休眠账户（东财 · 观察仓）资产为 0，只出现在费率表里，不计入合计与加权。
 *
 * 接入后端后本文件只保留常量文案，账户与费率全部换成接口返回。
 */

/** 数据基准日：最近一个交易日收盘后（2026-11-13 周五） */
const AS_OF = '2026-11-13';

/** 费率公共部分：印花税 / 过户费 / 规费为交易所统一标准，不随券商变化 */
const COMMON_FEE = {
  minCommission: 5,
  regulatoryFeeRate: 0.000_054_1,
  stampTaxRate: 0.0005,
  transferFeeRate: 0.000_01,
} as const;

function feeRate(commissionRate: number, mode: FeeRate['mode']): FeeRate {
  return { ...COMMON_FEE, commissionRate, mode };
}

/** 板块规格：条件文案来自开户规则，同一板块在不同账户下条件一致 */
const BOARD_SPECS: Array<Omit<BoardPermission, 'granted'>> = [
  { code: 'MAIN', name: '主板', requirement: '开户即开通' },
  { code: 'GEM', name: '创业板', requirement: '24 个月 + 日均 10 万' },
  { code: 'STAR', name: '科创板', requirement: '24 个月 + 日均 50 万' },
  { code: 'BSE', name: '北交所', requirement: '24 个月 + 日均 50 万 + C4' },
  { code: 'CONVERTIBLE', name: '可转债', requirement: '24 个月 + 日均 10 万' },
];

function boardsOf(granted: BoardCode[]): BoardPermission[] {
  return BOARD_SPECS.map((spec) => ({
    ...spec,
    granted: granted.includes(spec.code),
  }));
}

/** 全部账户（4 个，含 1 个休眠） */
const ACCOUNTS: BrokerAccount[] = [
  {
    id: 'AG-0001',
    broker: '华泰证券',
    brokerCode: 'HTZQ',
    alias: '主账户',
    type: 'NORMAL',
    status: 'ACTIVE',
    accountNo: '8891****2043',
    openedAt: '2018-06-12',
    purpose: '长线主仓',
    experienceMonths: 101,
    riskLevel: 'C4 积极型',
    remark: '客户经理渠道开户，首年免五',
    totalAssets: 682_410.2,
    available: 96_420.55,
    todayPnl: 4820.3,
    chipTone: 'blue',
    boards: boardsOf(['MAIN', 'GEM', 'STAR', 'CONVERTIBLE']),
    fee: feeRate(0.000_12, 'ALL_IN'),
    poolConfigured: true,
    poolAllocated: 280_000,
    poolFree: 402_410.2,
    poolCount: 4, // 所属券商池类别数（2.4 券商级）
  },
  {
    id: 'AG-0002',
    broker: '国泰君安',
    brokerCode: 'GTJA',
    alias: '长线',
    type: 'NORMAL',
    status: 'ACTIVE',
    accountNo: '6620****8817',
    openedAt: '2019-03-08',
    purpose: '趋势仓',
    experienceMonths: 92,
    riskLevel: 'C3 稳健型',
    remark: '2024 年转户，同步降佣至万 1.8',
    totalAssets: 468_220.35,
    available: 32_180,
    todayPnl: 2680.1,
    chipTone: 'violet',
    boards: boardsOf(['MAIN', 'GEM', 'CONVERTIBLE']),
    fee: feeRate(0.000_18, 'ALL_IN'),
    poolConfigured: true,
    poolAllocated: 100_000,
    poolFree: 368_220.35,
    poolCount: 3,
  },
  {
    id: 'AG-0003',
    broker: '招商证券',
    brokerCode: 'ZSZQ',
    alias: '两融',
    type: 'CREDIT',
    status: 'ACTIVE',
    accountNo: '3310****5548',
    openedAt: '2021-11-22',
    purpose: '融资仓',
    experienceMonths: 59,
    riskLevel: 'C5 激进型',
    remark: '两融授信 50 万，警戒线 160%',
    totalAssets: 135_800,
    available: 18_640.2,
    todayPnl: 911.9,
    chipTone: 'teal',
    boards: boardsOf(['MAIN', 'STAR']),
    fee: feeRate(0.000_25, 'NET'),
    poolConfigured: false,
    poolAllocated: 0,
    poolFree: 135_800,
    poolCount: 0,
  },
  {
    id: 'AG-0004',
    broker: '东方财富',
    brokerCode: 'DFCF',
    alias: '观察仓',
    type: 'NORMAL',
    status: 'DORMANT',
    accountNo: '5210****9032',
    openedAt: '2023-05-16',
    purpose: '观察仓',
    experienceMonths: 41,
    riskLevel: 'C3 稳健型',
    remark: '观察账户，仅保留登录',
    totalAssets: 0,
    available: 0,
    todayPnl: 0,
    chipTone: 'gray',
    boards: boardsOf(['MAIN']),
    fee: feeRate(0.000_25, 'NET'),
    poolConfigured: false,
    poolAllocated: 0,
    poolFree: 0,
    poolCount: 0,
  },
];

/** 一屏所需数据 */
export const demoAccountOverview: AccountOverview = {
  accounts: ACCOUNTS,
  asOf: AS_OF,
  syncedAt: '16:05 已同步',
  t0Withdrawable: 96_420.55,
  weeklyCash: { inCount: 0, netIn: -20_000, outCount: 1 },
};
