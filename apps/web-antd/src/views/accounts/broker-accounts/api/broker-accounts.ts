import type { AccountOverview, BrokerAccount, ChipTone } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoAccountOverview } from '../data/demo';

/**
 * 券商账户（2.1）数据源 —— 已接入后端 qtp-acc 模块
 * ---------------------------------------------------------------------------
 * 一次页面加载并行取两路数据（对齐设计文档「页面初始化」）：
 *   GET /acc/brokerAccount/getSummary  顶部汇总（账户数/总资产/可用/本周净入金）
 *   GET /acc/brokerAccount/getCardList 账户卡片（含脱敏账号/权限/费率摘要）
 * 详情、板块权限、费率表均由卡片数据在本地派生（selectors），无需额外请求。
 *
 * 后端未启动或请求失败时回落到 demo 数据，保证页面可独立演示。
 */

const API = {
  cardList: '/acc/brokerAccount/getCardList',
  create: '/acc/brokerAccount/create',
  summary: '/acc/brokerAccount/getSummary',
  syncCancel: '/acc/sync/cancel',
  syncStart: '/acc/sync/start',
  syncTask: '/acc/sync/task',
} as const;

/**
 * 同步任务的 7 个步骤，逐字对齐后端 AccSyncServiceImpl.STEPS。
 * 进度条按 progress 等分映射到步骤序号（与后端 currentStep 算法一致）。
 */
export const SYNC_STEPS = [
  '锁定账户同步锁',
  '同步账户资产',
  '同步资金流水',
  '同步持仓明细',
  '同步当日成交',
  '生成本次对账记录',
  '写入导入批次',
] as const;

/** 可同步的数据类型（对应 AccSyncStartBo.dataTypes） */
export const SYNC_DATA_TYPES = [
  { label: '资产快照', value: 'ASSET' },
  { label: '资金流水', value: 'CASH' },
  { label: '持仓明细', value: 'POSITION' },
  { label: '当日成交', value: 'TRADE' },
] as const;

/** 券商默认费率预设（对齐 t_acc_broker.default_* 字段，新建时留空由后端带出） */
export const BROKER_PRESETS = [
  {
    code: 'HTZQ',
    isAllIn: 1,
    minCommission: 5,
    name: '华泰证券',
    rateWan: 1.2,
  },
  {
    code: 'GTJA',
    isAllIn: 1,
    minCommission: 5,
    name: '国泰君安',
    rateWan: 1.8,
  },
  {
    code: 'ZSZQ',
    isAllIn: 0,
    minCommission: 5,
    name: '招商证券',
    rateWan: 2.5,
  },
  {
    code: 'DFCF',
    isAllIn: 0,
    minCommission: 5,
    name: '东方财富',
    rateWan: 2.5,
  },
] as const;

/**
 * 后端原始响应类型。
 * 注意：RuoYi 后端把 BigDecimal 统一序列化为字符串（防精度丢失），
 * 因此金额/费率字段是 string（偶尔可能是 number），消费前必须经 toNum() 收敛。
 */
type NumLike = number | string;

/** 后端费率摘要（/acc/brokerAccount 返回的 fee 字段） */
interface AccFeeRate {
  commissionRate: NumLike;
  minCommission: NumLike;
  mode: 'ALL_IN' | 'NET';
  stampTaxRate: NumLike;
  transferFeeRate: NumLike;
  regulatoryFeeRate: NumLike;
}

/** 后端板块权限项 */
interface AccBoardPerm {
  code: 'BSE' | 'CONVERTIBLE' | 'GEM' | 'MAIN' | 'STAR';
  granted: boolean;
  name: string;
  requirement: string;
}

/** 后端账户卡片（AccAccountCardVo） */
interface AccAccountCard {
  id: string;
  accountNo: string;
  alias: string;
  available: NumLike;
  frozen: NumLike;
  totalAssets: NumLike;
  todayPnl: NumLike;
  broker: string;
  brokerCode: string;
  type: 'CREDIT' | 'NORMAL';
  status: 'ACTIVE' | 'CLOSED' | 'DORMANT';
  openedAt: string;
  experienceMonths: NumLike;
  purpose: string;
  riskLevel: string;
  fee: AccFeeRate;
  boards: AccBoardPerm[];
}

/** 后端顶部汇总（AccSummaryVo） */
interface AccSummary {
  accountCount: number;
  normalCount: number;
  creditCount: number;
  dormantCount: number;
  totalAssets: NumLike;
  available: NumLike;
  todayPnl: NumLike;
  creditNetAsset: NumLike;
  t0Withdrawable: NumLike;
  weeklyCash?: { inCount: NumLike; netIn: NumLike; outCount: NumLike };
  asOf: string;
  syncedAt: string;
}

/**
 * 后端 BigDecimal 统一序列化为字符串（RuoYi 防 JS 精度丢失），
 * 前端展示层契约是 number，这里做唯一一次类型收敛：字符串/数字 → number。
 * 注意：不要在组件里对后端原始值直接调 toFixed/toLocaleString，先过本函数。
 */
function toNum(value: unknown, fallback = 0): number {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** 卡片头像色块：启用账户按序取色，休眠账户固定灰色 */
const CHIP_TONES: ChipTone[] = ['blue', 'violet', 'teal', 'gray'];

function cardToBrokerAccount(
  card: AccAccountCard,
  index: number,
): BrokerAccount {
  return {
    id: card.id,
    accountNo: card.accountNo ?? '',
    alias: card.alias,
    broker: card.broker,
    type: card.type,
    status: card.status === 'CLOSED' ? 'DORMANT' : card.status,
    openedAt: card.openedAt ?? '',
    purpose: card.purpose ?? '',
    experienceMonths: toNum(card.experienceMonths),
    riskLevel: card.riskLevel ?? '',
    totalAssets: toNum(card.totalAssets),
    available: toNum(card.available),
    todayPnl: toNum(card.todayPnl),
    chipTone:
      card.status === 'ACTIVE'
        ? (CHIP_TONES[index % CHIP_TONES.length] ?? 'blue')
        : 'gray',
    boards: card.boards ?? [],
    fee: {
      commissionRate: toNum(card.fee?.commissionRate),
      minCommission: toNum(card.fee?.minCommission, 5),
      mode: card.fee?.mode ?? 'ALL_IN',
      stampTaxRate: toNum(card.fee?.stampTaxRate, 0.0005),
      transferFeeRate: toNum(card.fee?.transferFeeRate, 0.000_01),
      regulatoryFeeRate: toNum(card.fee?.regulatoryFeeRate, 0.000_054_1),
    },
  };
}

function composeOverview(
  summary: AccSummary,
  cards: AccAccountCard[],
): AccountOverview {
  let activeIndex = 0;
  const accounts = cards.map((card) => {
    const account = cardToBrokerAccount(
      card,
      card.status === 'ACTIVE' ? activeIndex++ : 0,
    );
    return account;
  });
  return {
    accounts,
    asOf: summary.asOf ?? '',
    syncedAt: summary.syncedAt ?? '已同步',
    t0Withdrawable: toNum(summary.t0Withdrawable),
    weeklyCash: {
      inCount: toNum(summary.weeklyCash?.inCount),
      netIn: toNum(summary.weeklyCash?.netIn),
      outCount: toNum(summary.weeklyCash?.outCount),
    },
  };
}

export async function fetchBrokerAccountOverview(): Promise<AccountOverview> {
  try {
    const [summary, cards] = await Promise.all([
      alovaInstance.get<AccSummary>(API.summary),
      alovaInstance.get<AccAccountCard[]>(`${API.cardList}`),
    ]);
    return composeOverview(summary, cards ?? []);
  } catch {
    // 后端未就绪时回落 demo 数据，保证页面可独立演示
    return { ...demoAccountOverview };
  }
}

export async function fetchCardDetail(accountCode: string) {
  return alovaInstance.get(`/acc/brokerAccount/getCardDetail`, {
    params: { accountCode },
  });
}

// ==================== 新建账户（FORM · 2.1-A） ====================

/** 新建账户入参，字段对齐后端 AccAccountCreateBo（费率留空由后端带出券商默认值） */
export interface AccAccountCreatePayload {
  /** 账户别名（必填） */
  accountName: string;
  /** 券商编码（必填，BROKER_PRESETS 里的 code） */
  brokerCode: string;
  /** 资金账号（可后补） */
  accountNo?: string;
  /** 账户类型：NORMAL / MARGIN / OPTION */
  accountType?: 'MARGIN' | 'NORMAL' | 'OPTION';
  /** 币种：CNY / HKD / USD */
  currency?: 'CNY' | 'HKD' | 'USD';
  /** 佣金费率（小数，如 0.00012） */
  commissionRate?: number;
  /** 单笔最低佣金（元） */
  minCommission?: number;
  /** 佣金口径：1=全佣 0=净佣 */
  isAllInCommission?: 0 | 1;
  /** 账户用途 */
  purpose?: string;
  /** 备注 */
  remark?: string;
}

/** 新建账户：POST /acc/brokerAccount/create，返回业务账户编号（AG-xxxx） */
export async function createAccount(payload: AccAccountCreatePayload) {
  return alovaInstance.post<string>(API.create, payload);
}

// ==================== 同步账户（SYNC · 2.1-B） ====================

/** 发起同步入参，字段对齐后端 AccSyncStartBo */
export interface AccSyncStartPayload {
  /** 要同步的账户编号（AG-xxxx），空数组 = 全部启用账户 */
  accountCodes: string[];
  /** 数据类型：ASSET / CASH / POSITION / TRADE */
  dataTypes: string[];
  /** 同步方式：MANUAL / SCHEDULED */
  syncMode?: string;
}

/** 单账户同步结果（后端 BigDecimal 序列化为字符串） */
export interface AccSyncAccountResult {
  accountCode: string;
  accountName: string;
  status: 'FAILED' | 'SUCCESS';
  totalAsset: NumLike;
  cashAvailable: NumLike;
  cashFrozen: NumLike;
  positionCount: NumLike;
  tradeCount: NumLike;
  cashFlowCount: NumLike;
  dataTime: string;
  failReason: string;
}

/** 同步任务状态（后端 AccSyncTaskVo，约 8 秒走完 7 步） */
export interface AccSyncTask {
  taskCode: string;
  status: 'CANCELLED' | 'FAILED' | 'RUNNING' | 'SUCCESS';
  progress: number;
  currentStep: string;
  accountCodes: string[];
  dataTypes: string[];
  syncMode: string;
  startedAt: string;
  finishedAt: string;
  results: AccSyncAccountResult[];
  errMsg: string;
}

/** 发起同步：POST /acc/sync/start，返回任务编码 */
export async function startSync(payload: AccSyncStartPayload) {
  return alovaInstance.post<string>(API.syncStart, payload);
}

/** 轮询同步任务进度：GET /acc/sync/task */
export async function fetchSyncTask(taskCode: string) {
  return alovaInstance.get<AccSyncTask>(API.syncTask, {
    params: { taskCode },
  });
}

/** 取消同步：POST /acc/sync/cancel（后端按 @RequestParam 接收） */
export async function cancelSync(taskCode: string) {
  return alovaInstance.post<void>(API.syncCancel, undefined, {
    params: { taskCode },
  });
}
