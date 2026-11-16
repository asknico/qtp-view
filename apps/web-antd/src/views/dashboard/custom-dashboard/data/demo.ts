import type {
  CustomDashboard,
  DashboardCardMeta,
  NavPoint,
  NavRange,
} from './types';

/**
 * 自定义看板（1.6）演示数据
 * ---------------------------------------------------------------------------
 * 数值与《06_1.6自定义看板.html》对齐，并与其它驾驶舱页面保持同一套口径：
 *   总资产 1,286,430.55 / 今日盈亏 +8,412.30（浮动 6,265.50 + 已实现 2,146.80）
 *   仓位 62.0%（证券市值 798,000 / 总资产 1,286,430.55，目标区间 60–75%）
 *   市场热度 58.2%（= 上涨 3,142 /（3,142 + 2,071 + 186），与 1.3 页同源）
 *
 * 净值序列按「分段锚点 + 几何布朗运动」确定性生成（固定随机种子）：
 *   - 交易日历覆盖 2025-11-03 ~ 2026-10-28，剔除周末与法定休市日；
 *   - 出入金不参与市值演化，仅作为当日现金变动叠加（真实会计口径）；
 *   - 3m / 6m / 1y 三个窗口由同一条序列切片得到，窗口间不会自相矛盾。
 */

// #region 卡片目录

/**
 * 卡片目录：数组顺序即默认布局顺序。
 * 前四张（mini）走顶部四小卡，后四张（panel）走下方内容卡；
 * 2 的列数与 3 的区间参数不影响该目录。
 */
export const dashboardCards: DashboardCardMeta[] = [
  {
    hint: '口径：三账户合计总资产（市值 + 可用资金），含信用账户净资产',
    key: 'totalAssets',
    label: '总资产',
    required: true,
    zone: 'mini',
  },
  {
    hint: '口径：浮动盈亏 + 今日已实现盈亏（已扣佣金/印花税/过户费）',
    key: 'todayPnl',
    label: '今日盈亏',
    zone: 'mini',
  },
  {
    hint: '口径：证券市值 ÷ 总资产；目标区间由「12.3 风控参数」提供',
    key: 'position',
    label: '仓位',
    zone: 'mini',
  },
  {
    hint: '口径：单票市值 ÷ 总资产，按占比降序取前 4',
    key: 'topHoldings',
    label: '持仓 TOP',
    zone: 'mini',
  },
  {
    hint: '窗口起点归一化为 100，与沪深300 同图对比；区间可切换',
    key: 'navTrend',
    label: '净值曲线',
    zone: 'panel',
  },
  {
    hint: '口径：申万一级行业，分母为证券市值；不足 5% 的行业合并为「其他」',
    key: 'industry',
    label: '行业分布',
    zone: 'panel',
  },
  {
    hint: '来源：1.5 待办提醒中「今日到期 + 已逾期」两类，最多展示 3 条',
    key: 'todo',
    label: '今日待办',
    zone: 'panel',
  },
  {
    hint: '口径：全市场上涨家数占比；成交额为两市合计，含北交所',
    key: 'marketHeat',
    label: '市场热度',
    zone: 'panel',
  },
];

// #endregion

// #region 净值序列（确定性生成）

/** 固定种子伪随机数，保证每次进入页面曲线一致 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = Math.trunc(a + 0x6D_2B_79_F5);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Box-Muller 变换：标准正态噪声 */
function gauss(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** 法定休市日（周末之外的休市工作日） */
const MARKET_HOLIDAYS = new Set([
  '2026-01-01', // 元旦
  '2026-01-02',
  '2026-02-16', // 春节
  '2026-02-17',
  '2026-02-18',
  '2026-02-19',
  '2026-02-20',
  '2026-04-06', // 清明
  '2026-05-01', // 劳动节
  '2026-05-04',
  '2026-05-05',
  '2026-06-19', // 端午
  '2026-09-25', // 中秋
  '2026-10-01', // 国庆
  '2026-10-02',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
]);

/** 生成 2025-11-03 ~ 2026-10-28 的交易日序列 */
function buildDates(): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(2025, 10, 3));
  const end = Date.UTC(2026, 9, 28);
  while (cursor.getTime() <= end) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !MARKET_HOLIDAYS.has(iso)) {
      dates.push(iso);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** 账户锚点：段末市值（不含出入金）/ 当日出入金 / 该段日波动率 */
interface NavAnchor {
  date: string;
  flow: number;
  nav: number;
  vol: number;
}

/** 账户剧本：年底冲高 → 一季报回撤 → 入金爬坑 → 9 月放量 → 10-28 收于 125.6 万 */
const NAV_ANCHORS: NavAnchor[] = [
  { date: '2025-11-03', flow: 0, nav: 900_000, vol: 0.012 },
  { date: '2025-12-31', flow: 0, nav: 1_010_000, vol: 0.013 },
  { date: '2026-02-27', flow: 0, nav: 1_000_000, vol: 0.014 },
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

/** 沪深300 锚点：段末点位 / 该段日波动率 */
const BENCH_ANCHORS: Array<[string, number, number]> = [
  ['2025-11-03', 4520, 0.008],
  ['2025-12-31', 4610, 0.009],
  ['2026-02-27', 4530, 0.01],
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

/** 单日噪声截断（±2.2σ）与趋势回归强度 */
const Z_CLAMP = 2.2;
const TREND_PULL = 0.1;

/** 逐段生成：段末强制等于锚点，基准与账户共用 60% 相关噪声（β 联动） */
function buildNavSeries(): NavPoint[] {
  const dates = buildDates();
  const idxOf = new Map(dates.map((d, i) => [d, i]));
  const rand = mulberry32(11);
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

    const zs: number[] = [];
    for (let k = 0; k < days; k++) {
      let z = gauss(rand);
      if (z > Z_CLAMP) z = Z_CLAMP;
      if (z < -Z_CLAMP) z = -Z_CLAMP;
      zs.push(z);
    }

    let m = from.nav;
    for (let k = 0; k < days; k++) {
      m *= Math.exp(drift + to.vol * (zs[k] ?? 0));
      const line = from.nav * Math.exp(drift * (k + 1));
      m += (line - m) * TREND_PULL;
      market[i0 + 1 + k] = m;
    }
    market[i1] = to.nav;

    const bDrift = Math.log(bTo[1] / bFrom[1]) / days;
    let b = bFrom[1];
    for (let k = 0; k < days; k++) {
      let z = 0.6 * (zs[k] ?? 0) + 0.8 * gauss(rand);
      if (z > Z_CLAMP) z = Z_CLAMP;
      if (z < -Z_CLAMP) z = -Z_CLAMP;
      b *= Math.exp(bDrift + bTo[2] * z);
      const line = bFrom[1] * Math.exp(bDrift * (k + 1));
      b += (line - b) * 0.08;
      bench[i0 + 1 + k] = Math.round(b * 100) / 100;
    }
    bench[i1] = bTo[1];
  }

  const flowByDate = new Map(
    NAV_ANCHORS.filter((x) => x.flow !== 0).map((x) => [x.date, x.flow]),
  );
  let cumFlow = 0;
  return dates.map((date, i) => {
    cumFlow += flowByDate.get(date) ?? 0;
    return {
      benchmark: bench[i] ?? 0,
      date,
      nav: Math.round(((market[i] ?? 0) + cumFlow) * 100) / 100,
    };
  });
}

/** 全量序列（2025-11-03 ~ 2026-10-28） */
const fullSeries = buildNavSeries();

/** 区间切片：3 月 / 6 月 / 1 年（1 年 = 全部，账户建立不足 12 个月） */
const RANGE_SLICE: Record<NavRange, number> = {
  '1y': Number.MAX_SAFE_INTEGER,
  '3m': 64,
  '6m': 128,
};

function seriesOf(range: NavRange): NavPoint[] {
  const slice = RANGE_SLICE[range];
  return slice === Number.MAX_SAFE_INTEGER
    ? fullSeries
    : fullSeries.slice(-slice);
}

/** 最近 16 个交易日收盘市值（总资产卡迷你走势） */
function sparkOf(): number[] {
  return fullSeries.slice(-16).map((p) => p.nav);
}

// #endregion

// #region 演示数据

const TOTAL_ASSETS = 1_286_430.55;
const STOCK_VALUE = 798_000;

/** 生成一份独立的演示数据（每次调用返回新对象，避免被页面改写污染） */
export function demoCustomDashboard(): CustomDashboard {
  return {
    cards: dashboardCards,
    industry: {
      items: [
        { name: '电子', pct: 24 },
        { name: '食品饮料', pct: 21 },
        { name: '银行', pct: 18 },
        { name: '有色', pct: 14 },
        { name: '其他', pct: 23 },
      ],
      note: '分母：证券市值 798,000；< 5% 的 5 个行业并入「其他」',
      totalCount: 9,
    },
    marketHeat: {
      downCount: 2071,
      flatCount: 186,
      ma5Yi: 19_705,
      turnoverYi: 21_400,
      upCount: 3142,
      upRatio: 3142 / (3142 + 2071 + 186),
      vsMa5Pct: 8.6,
    },
    navTrend: {
      '1y': seriesOf('1y'),
      '3m': seriesOf('3m'),
      '6m': seriesOf('6m'),
    },
    position: {
      band: [60, 75],
      pct: (STOCK_VALUE / TOTAL_ASSETS) * 100,
      stockValue: STOCK_VALUE,
      totalAssets: TOTAL_ASSETS,
    },
    quoteTime: '15:00',
    todos: [
      {
        detail: '500 股 · 16:00 截止',
        icon: '🎯',
        id: 'ipo-pay',
        tag: { text: '紧急', tone: 'danger' },
        title: '中签缴款 N 华辰',
      },
      {
        detail: '264.80 跌破 268.00',
        icon: '⚠',
        id: 'stop-loss',
        tag: { text: '待确认', tone: 'warning' },
        title: '比亚迪触及止损',
      },
      {
        action: '去复盘',
        detail: '紫金矿业 · 已实现 +2,146.80',
        icon: '📝',
        id: 'review',
        title: '10-27 卖出未复盘',
      },
    ],
    todayPnl: {
      benchName: '沪深300',
      floating: 6265.5,
      realized: 2146.8,
      total: 8412.3,
      vsBenchPct: 0.18,
    },
    topHoldings: [
      { code: '600519.SH', name: '贵州茅台', pct: 12.4 },
      { code: '600036.SH', name: '招商银行', pct: 11.8 },
      { code: '002594.SZ', name: '比亚迪', pct: 9.2 },
      { code: '300750.SZ', name: '宁德时代', pct: 8.6 },
    ],
    totalAssets: {
      dayChange: 8412.3,
      dayChangePct: 0.66,
      spark: sparkOf(),
      value: TOTAL_ASSETS,
    },
    tradeDate: '2026-10-28',
    updatedAt: '16:05',
  };
}

// #endregion
