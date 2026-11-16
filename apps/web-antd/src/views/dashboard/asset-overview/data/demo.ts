import type {
  AllocationItem,
  BrokerAccount,
  GoalItem,
  KpiItem,
  NavMode,
  NavPoint,
  NavRange,
  NavStats,
} from './types';

/**
 * 资产总览（1.1）演示数据
 * ---------------------------------------------------------------------------
 * 所有数字与 UI 设计稿《01_1.1资产总览》对齐，硬编码于此。
 * 接入后端后整个文件只保留格式化函数，数据全部换成接口返回。
 *
 * 净值序列采用「分段锚点 + 几何布朗运动」确定性生成（mulberry32 固定种子）：
 *   - 交易日历剔除周末与 2026 年法定休市日，日频 140 根；
 *   - 每段波动率独立设定（回撤段放大、平稳段收敛），模拟波动率聚集；
 *   - 沪深300 与账户共用 60% 相关噪声（β 联动），回撤段同跌；
 *   - 出入金不计入市值演化，仅作为当日现金变动叠加（收盘价真实跳变）；
 *   - 锚点端点强制精确：曲线终点 = KPI 总资产，末根涨跌 = 今日盈亏 KPI。
 */

// #region 格式化工具

/** 千分位 */
export function formatThousand(value: number, digits = 0): string {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** 金额：整数部分千分位 + 小数部分（用于 KPI 主数值拆分展示） */
export function splitAmount(value: number, decimals = 2) {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const sign = value < 0 ? '-' : '';
  return { dec, int: `${sign}${formatThousand(Number(int), 0)}` };
}

/** 元 → 万元展示（如 1286430 → 128.6万） */
export function formatWan(value: number, digits = 1): string {
  return `${(value / 10_000).toFixed(digits)}万`;
}

/** 带符号的涨跌值：+8,412.30 / -1.24% */
export function formatSigned(
  value: number,
  digits = 2,
  withPercent = false,
): string {
  if (value === 0) return withPercent ? '0.00%' : '0.00';
  const fixed = formatThousand(Math.abs(value), digits);
  const sign = value > 0 ? '+' : '-';
  return `${sign}${fixed}${withPercent ? '%' : ''}`;
}

// #endregion

// #region 净值序列（确定性生成）

/** 固定种子伪随机数，保证曲线每次刷新一致 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = Math.trunc(a + 0x6D_2B_79_F5);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Box-Muller 变换：标准正态噪声（比均匀噪声更贴近真实日收益分布） */
function gauss(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** 2026 年 A 股法定休市日（周末之外的休市工作日） */
const MARKET_HOLIDAYS_2026 = new Set([
  '2026-04-06', // 清明节（4-05 周日，顺延休市）
  '2026-05-01', // 劳动节
  '2026-05-04',
  '2026-05-05',
  '2026-06-19', // 端午节
  '2026-09-25', // 中秋节
  '2026-10-01', // 国庆节
  '2026-10-02',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
]);

/** 生成 2026-04-01 ~ 2026-10-28 的交易日序列（剔除周末与法定休市日） */
function buildDates(): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(2026, 3, 1));
  const end = Date.UTC(2026, 9, 28);
  while (cursor.getTime() <= end) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !MARKET_HOLIDAYS_2026.has(iso)) {
      dates.push(iso);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** 净值走势分段锚点：段末日期 / 段末市值（不含出入金现金）/ 当日出入金 / 该段日波动率 */
interface NavAnchor {
  date: string;
  /** 段末市值（元）。账户收盘 = 市值 + 累计出入金现金 */
  nav: number;
  flow: number;
  /** 该段日波动率（回撤段放大、末端收敛，模拟波动率聚集） */
  vol: number;
}

/**
 * 走势剧本（锚点间用带漂移的几何布朗运动填充，端点强制精确）：
 *   4-01 98.5 万 → 4-08 冲高 105.2 万（+6.8%，年内峰值）
 *   → 5-26 回撤谷底 92.16 万（-12.4%：外围流动性冲击 + 一季报暴雷）
 *   → 6-10 政策底反弹 + 入金 5 万 → 7 月爬坑重回百万
 *   → 8-21 创新高后部分止盈 + 出金 2 万 → 9 月放量上攻
 *   → 10-28 收于 128.64 万（= KPI 总资产）。
 * 10-27 锚点使末根涨跌 = +8,412.30（+0.66%），与「今日盈亏」KPI 严格一致。
 */
const NAV_ANCHORS: NavAnchor[] = [
  { date: '2026-04-01', flow: 0, nav: 985_000, vol: 0.013 },
  { date: '2026-04-08', flow: 0, nav: 1_052_000, vol: 0.016 },
  { date: '2026-05-26', flow: 0, nav: 921_600, vol: 0.019 },
  { date: '2026-06-10', flow: 50_000, nav: 968_000, vol: 0.014 },
  { date: '2026-07-01', flow: 0, nav: 1_030_000, vol: 0.012 },
  { date: '2026-07-28', flow: 0, nav: 1_075_000, vol: 0.011 },
  { date: '2026-08-21', flow: -20_000, nav: 1_118_000, vol: 0.013 },
  { date: '2026-09-15', flow: 0, nav: 1_190_000, vol: 0.014 },
  { date: '2026-10-09', flow: 0, nav: 1_246_000, vol: 0.012 },
  { date: '2026-10-27', flow: 0, nav: 1_248_018.25, vol: 0.009 },
  { date: '2026-10-28', flow: 0, nav: 1_256_430.55, vol: 0.009 },
];

/** 沪深300 分段锚点：段末点位 / 该段日波动率（与账户共用噪声 → β≈0.6 联动） */
const BENCH_ANCHORS: Array<[string, number, number]> = [
  ['2026-04-01', 3886, 0.008],
  ['2026-04-08', 4022, 0.011],
  ['2026-05-26', 3646, 0.014],
  ['2026-06-10', 3716, 0.011],
  ['2026-07-01', 3788, 0.01],
  ['2026-07-28', 3862, 0.009],
  ['2026-08-21', 3951, 0.011],
  ['2026-09-15', 4058, 0.012],
  ['2026-10-09', 4132, 0.01],
  ['2026-10-27', 4156, 0.008],
  ['2026-10-28', 4176, 0.008],
];

/** 单日噪声截断：±2.2σ ≈ 组合单日 ±4%~5% 封顶，贴近真实且避免锯齿感 */
const Z_CLAMP = 2.2;
/** 向段内趋势线回归强度（模拟均值回归，防止路径大幅跑偏剧本） */
const TREND_PULL = 0.1;

/** 越界软反弹（贴近上下沿时以 0.3 倍弹回，保留探底/冲高形态） */
function reflect(v: number, lo: number, hi: number): number {
  if (v < lo) return lo + (lo - v) * 0.3;
  if (v > hi) return hi - (v - hi) * 0.3;
  return v;
}

/**
 * 逐段生成：每段按「漂移 = 段总对数收益 / 交易日数 + 日波动率 × 正态噪声」
 * 演化市值，段末强制等于锚点；基准与账户共用 60% 相关噪声。
 * 出入金不参与市值演化，仅作为当日现金变动叠加到收盘（真实会计口径）。
 */
function buildNavSeries(): NavPoint[] {
  const dates = buildDates();
  const idxOf = new Map(dates.map((d, i) => [d, i]));
  const rand = mulberry32(7);
  const market = Array.from<number>({ length: dates.length }).fill(0);
  const bench = Array.from<number>({ length: dates.length }).fill(0);
  const firstAnchor = NAV_ANCHORS[0];
  const firstBench = BENCH_ANCHORS[0];
  if (!firstAnchor || !firstBench) return [];
  market[0] = firstAnchor.nav;
  bench[0] = firstBench[1];

  for (let a = 0; a < NAV_ANCHORS.length - 1; a++) {
    const from = NAV_ANCHORS[a];
    const to = NAV_ANCHORS[a + 1];
    const bFrom = BENCH_ANCHORS[a];
    const bTo = BENCH_ANCHORS[a + 1];
    if (!from || !to || !bFrom || !bTo) break;
    const i0 = idxOf.get(from.date);
    const i1 = idxOf.get(to.date);
    if (i0 === undefined || i1 === undefined || i1 <= i0) {
      throw new Error(`净值锚点 ${to.date} 不是交易日或顺序有误`);
    }
    const days = i1 - i0;
    const drift = Math.log(to.nav / from.nav) / days;

    // 账户市值：GBM + 趋势回归 + 边界软反弹
    const zs: number[] = [];
    for (let k = 0; k < days; k++) {
      let z = gauss(rand);
      if (z > Z_CLAMP) z = Z_CLAMP;
      if (z < -Z_CLAMP) z = -Z_CLAMP;
      zs.push(z);
    }
    const lo = Math.min(from.nav, to.nav) * 0.997;
    const hi = Math.max(from.nav, to.nav) * 1.001;
    let m = from.nav;
    for (let k = 0; k < days; k++) {
      m *= Math.exp(drift + to.vol * (zs[k] ?? 0));
      const line = from.nav * Math.exp(drift * (k + 1));
      m += (line - m) * TREND_PULL;
      m = reflect(m, lo, hi);
      const idx = i0 + 1 + k;
      market[idx] = m;
    }
    market[i1] = to.nav;

    // 基准：与账户共用噪声（相关系数 ≈ 0.6）+ 独立噪声 0.8
    const bDrift = Math.log(bTo[1] / bFrom[1]) / days;
    let b = bFrom[1];
    for (let k = 0; k < days; k++) {
      let z = 0.6 * (zs[k] ?? 0) + 0.8 * gauss(rand);
      if (z > Z_CLAMP) z = Z_CLAMP;
      if (z < -Z_CLAMP) z = -Z_CLAMP;
      b *= Math.exp(bDrift + bTo[2] * z);
      const line = bFrom[1] * Math.exp(bDrift * (k + 1));
      b += (line - b) * 0.08;
      const idx = i0 + 1 + k;
      bench[idx] = Math.round(b * 100) / 100;
    }
    bench[i1] = bTo[1];
  }

  // 收盘 = 市值 + 累计出入金现金（入金日真实跳变，图上配菱形标记解释）
  const flowByDate = new Map(
    NAV_ANCHORS.filter((x) => x.flow !== 0).map((x) => [x.date, x.flow]),
  );
  let cumFlow = 0;
  return dates.map((date, i) => {
    const flow = flowByDate.get(date) ?? 0;
    cumFlow += flow;
    const benchmark = bench[i] ?? 0;
    const marketValue = market[i] ?? 0;
    return {
      benchmark,
      date,
      flow,
      nav: Math.round((marketValue + cumFlow) * 100) / 100,
    };
  });
}

/** 原始净值序列（TWR 口径，即页面默认） */
export const navSeries: NavPoint[] = buildNavSeries();

/**
 * 从序列中实测的年内最大回撤（峰值 → 谷底）。
 * KPI 卡与图例胶囊共用此值，保证「文案 = 曲线」永不脱节：
 * 当前种子下 ≈ { pct: 12.4, peakDate: '2026-04-08', troughDate: '2026-05-26' }。
 */
export const maxDrawdownStat = (() => {
  let peak = navSeries[0]?.nav ?? 0;
  let peakIdx = 0;
  let worst = 0;
  let peakIdxAtWorst = 0;
  let troughIdx = 0;
  navSeries.forEach((p, i) => {
    if (p.nav > peak) {
      peak = p.nav;
      peakIdx = i;
    }
    const dd = (peak - p.nav) / peak;
    if (dd > worst) {
      worst = dd;
      peakIdxAtWorst = peakIdx;
      troughIdx = i;
    }
  });
  const peakPoint = navSeries[peakIdxAtWorst];
  const troughPoint = navSeries[troughIdx];
  return {
    pct: Math.round(worst * 10_000) / 100,
    peakDate: peakPoint?.date ?? '',
    tradingDays: troughIdx - peakIdxAtWorst,
    troughDate: troughPoint?.date ?? '',
  };
})();

/** 总资产 KPI 的迷你走势（取净值序列末段） */
function buildSpark(nav: number[]): number[] {
  return nav.slice(-16);
}

// #endregion

// #region 顶部 KPI

export const kpiItems: KpiItem[] = [
  {
    accent: true,
    change: 8412.3,
    changePct: 0.66,
    key: 'totalAssets',
    label: '总资产（3 个账户）',
    tone: 'blue',
    trend: 'up',
    value: 1_286_430.55,
  },
  {
    changeLabel: '沪深300 +0.48%',
    changePct: 0.66,
    key: 'todayPnl',
    label: '今日盈亏',
    tone: 'orange',
    trend: 'up',
    value: 8412.3,
  },
  {
    key: 'realizedPnl',
    label: '累计已实现盈亏',
    note: '含分红 6,842 · 已扣费用 12,486',
    tone: 'violet',
    trend: 'up',
    value: 142_860.2,
  },
  {
    change: 5804.2,
    changeLabel: '持仓 9 只',
    changePct: 7.2,
    key: 'floatingPnl',
    label: '累计浮动盈亏',
    tone: 'teal',
    trend: 'up',
    value: 86_420.1,
  },
  {
    key: 'maxDrawdown',
    label: '最大回撤（近 1 年）',
    note: `${maxDrawdownStat.peakDate} → ${maxDrawdownStat.troughDate} · ${maxDrawdownStat.tradingDays} 个交易日`,
    suffix: '%',
    tone: 'amber',
    trend: 'down',
    value: -maxDrawdownStat.pct,
  },
];

/** 总资产卡迷你走势 = 净值序列末段 */
const firstKpi = kpiItems[0];
if (firstKpi) {
  firstKpi.spark = buildSpark(navSeries.map((p) => p.nav));
}

// #endregion

// #region 口径切换 / 区间 / 统计

/** 按口径得到展示序列：简单口径把出入金加回，XIRR 口径后期略微加权 */
function applyMode(series: NavPoint[], mode: NavMode): NavPoint[] {
  if (mode === 'twr') return series;
  return series.map((p, i) => {
    if (i === 0) return { ...p };
    // 简单口径：把历史出入金累计加回，曲线更平滑
    // XIRR 口径：资金加权，后期收益占比放大（演示用近似）
    let nav: number;
    if (mode === 'simple') {
      const cumFlow = series
        .slice(0, i + 1)
        .reduce((sum, x) => sum + x.flow, 0);
      nav = p.nav - cumFlow;
    } else {
      const t = i / (series.length - 1);
      nav = p.nav * (1 + 0.012 * t);
    }
    return { ...p, nav: Math.round(nav * 100) / 100 };
  });
}

/** 区间映射 */
const RANGE_SLICE: Record<NavRange, number> = {
  '1m': 22,
  '3m': 64,
  '1y': Number.MAX_SAFE_INTEGER,
  all: Number.MAX_SAFE_INTEGER,
};

/** 取指定区间 + 口径的序列 */
export function getNavSeries(range: NavRange, mode: NavMode): NavPoint[] {
  const slice = RANGE_SLICE[range];
  const full = applyMode(navSeries, mode);
  return slice === Number.MAX_SAFE_INTEGER ? full : full.slice(-slice);
}

/** 页脚统计（按区间） */
export function getNavStats(range: NavRange): NavStats {
  const series = getNavSeries(range, 'twr');
  const firstPoint = series[0];
  const lastPoint = series[series.length - 1];
  if (!firstPoint || !lastPoint) {
    return { rangeReturn: 0, twr: 0, xirr: 0 };
  }
  const first = firstPoint.nav;
  const last = lastPoint.nav;
  const cumFlow = series.reduce((sum, p) => sum + p.flow, 0);
  // 时间加权：逐日剔除出入金后链式连乘
  let twr = 1;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    if (!prev || !cur || prev.nav === 0) continue;
    const base = prev.nav;
    twr *= 1 + (cur.nav - base - cur.flow) / base;
  }
  const rangeReturn = (last - first - cumFlow) / first;
  return {
    rangeReturn: rangeReturn * 100,
    twr: (twr - 1) * 100,
    // 演示数据：XIRR（资金加权年化）用区间收益线性年化的 0.5 折近似
    xirr: rangeReturn * (365 / Math.max(series.length, 1)) * 100 * 0.5,
  };
}

/** 出入金标记（用于图例与散点） */
export const flowMarks = {
  deposit: { amount: 50_000, date: '2026-06-10', label: '入金 5万' },
  withdraw: { amount: -20_000, date: '2026-08-21', label: '出金 2万' },
};

// #endregion

// #region 资产配置

export const allocationItems: AllocationItem[] = [
  { key: 'stock', name: '股票', percent: 62, value: 798_000 },
  { key: 'etf', name: 'ETF', percent: 14, value: 180_000 },
  { key: 'cash', name: '现金', percent: 14, value: 180_000 },
  { key: 'cb', name: '可转债', percent: 8, value: 103_000 },
  { key: 'other', name: '其他', percent: 2, value: 25_430 },
];

/** 股票仓位上限 */
export const positionLimit = { current: 62, limit: 75 };

export const allocationNote = '现金 18.0 万，含打新备用 5 万、机动仓 13 万';

// #endregion

// #region 分账户资产

export const brokerAccounts: BrokerAccount[] = [
  {
    accountNo: '8891****2043',
    available: 96_420.55,
    id: 'ht',
    name: '华泰 · 主账户',
    todayPnl: 4820.3,
    total: 682_410.2,
    type: '普通',
  },
  {
    accountNo: '6620****8817',
    available: 32_180,
    id: 'gtja',
    name: '国泰君安 · 长线',
    todayPnl: 2680.1,
    total: 468_220.35,
    type: '普通',
  },
  {
    accountNo: '3310****5548',
    available: 18_640.2,
    id: 'cmb',
    name: '招商 · 两融信用',
    todayPnl: 911.9,
    total: 135_800,
    type: '信用',
  },
];

export const accountsSyncNote = '上次同步 16:10 · 三账户合计净值已并入总资产';

// #endregion

// #region 目标与进度

export const goalItems: GoalItem[] = [
  {
    current: 12.4,
    hint: '15%',
    key: 'year',
    kind: 'percent',
    label: '年度收益目标',
    target: 15,
  },
  {
    current: 1.8,
    hint: '2.0%',
    key: 'month',
    kind: 'percent',
    label: '月度目标',
    target: 2,
  },
  {
    band: [60, 75],
    current: 62,
    hint: '目标区间 60–75%',
    key: 'position',
    kind: 'band',
    label: '总仓位',
  },
  {
    current: 4,
    hint: '上限 10 笔',
    key: 'trades',
    kind: 'count',
    label: '本月交易笔数',
    target: 10,
    unit: '笔',
  },
];

/** 页头副说明 */
export const pageDescription =
  '总资产、今日盈亏、累计盈亏一屏看完；净值曲线支持 TWR / XIRR / 简单收益三种口径切换，口径误差已在页脚标注。';

/** 目标卡副说明 */
export const goalHeaderHint = '2026 年度剩余可承受回撤 6.8%';

// #endregion
