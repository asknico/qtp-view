/**
 * 市场概览（1.3）演示数据
 * ---------------------------------------------------------------------------
 * 数值取自 UI 设计稿《03_1.3市场概览.html》，并做自洽修正：
 *   1. 设计稿「上涨占比 58.2%」与家数 3,142 / 1,864 / 186 对不上
 *      （3,142 / 5,192 = 60.5%）。改为由家数反推：down 2,071 时
 *      3,142 / (3,142+2,071+186) = 58.2%，页脚与仪表盘永远同源。
 *   2. 两市成交额 2.14 万亿、较 5 日均量 +8.6% ⇒ 近 5 日均值 = 19,705 亿，
 *      前 4 日数据按该均值生成。
 */

import type { MarketOverview, SectorHeat } from './types';

/** 确定性伪随机（mulberry32），保证每次进入页面演示数据一致 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = Math.trunc(a + 0x6D_2B_79_F5);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** 生成一段朝 ending 方向收敛的归一化分时（0~100，12 个点） */
function makeSpark(seed: number, endDir: -1 | 1): number[] {
  const rand = mulberry32(seed);
  const points: number[] = [];
  let level = 30 + rand() * 40;
  for (let i = 0; i < 12; i++) {
    const pull = endDir === 1 ? (100 - level) * 0.08 : level * 0.08;
    level += pull + (rand() - 0.5) * 14;
    points.push(Math.round(Math.min(100, Math.max(0, level))));
  }
  // 末端贴合方向
  points[11] =
    endDir === 1 ? 96 + Math.round(rand() * 4) : Math.round(rand() * 4);
  return points;
}

/** 板块热力数据源：[板块名, 今日成交额（亿元）]，涨跌幅由确定性随机生成 */
type HeatSource = Array<[string, number]>;

/** 行业热力（申万一级行业精选 18 个，按成交额降序） */
const INDUSTRY_HEAT: HeatSource = [
  ['电子', 2150],
  ['电力设备', 1680],
  ['非银金融', 1420],
  ['机械设备', 1520],
  ['计算机', 1380],
  ['有色金属', 1240],
  ['医药生物', 1260],
  ['汽车', 1180],
  ['食品饮料', 1150],
  ['基础化工', 1060],
  ['通信', 980],
  ['银行', 890],
  ['传媒', 720],
  ['国防军工', 640],
  ['家用电器', 560],
  ['公用事业', 510],
  ['房地产', 430],
  ['煤炭', 380],
];

/** 概念热力（28 个活跃概念，成交额跨度 110~880 亿） */
const CONCEPT_HEAT: HeatSource = [
  ['AI算力', 880],
  ['6G概念', 820],
  ['人形机器人', 640],
  ['创新药', 590],
  ['元件', 540],
  ['低空经济', 520],
  ['光伏设备', 460],
  ['减速器', 430],
  ['军工电子', 410],
  ['汽车热管理', 380],
  ['数据要素', 350],
  ['车路云', 320],
  ['煤炭开采加工', 310],
  ['BC电池', 300],
  ['商业航天', 290],
  ['卫星互联网', 260],
  ['磷化工', 240],
  ['能源金属', 210],
  ['跨境支付', 220],
  ['燃气', 190],
  ['家庭医生', 170],
  ['供气供热', 160],
  ['免税概念', 180],
  ['石墨电极', 150],
  ['脑机接口', 140],
  ['太赫兹', 130],
  ['DRG/DIP', 120],
  ['教育', 110],
];

/** 地域热力（10 个区域板块） */
const REGION_HEAT: HeatSource = [
  ['长三角', 3200],
  ['珠三角', 2800],
  ['京津冀', 2400],
  ['长江中游', 1300],
  ['成渝', 1200],
  ['山东半岛', 1100],
  ['东北', 700],
  ['海西', 600],
  ['西北', 500],
  ['海南', 300],
];

/** 生成树图板块：面积权重来自源数据，涨跌幅确定性随机（-2.6% ~ +3.5%） */
function makeHeatTiles(source: HeatSource, seed: number): SectorHeat[] {
  const rand = mulberry32(seed);
  return source.map(([name, turnoverYi]) => ({
    changePct: Math.round((rand() * 6.1 - 2.6) * 100) / 100,
    name,
    turnoverYi,
  }));
}

/** 演示数据工厂：每次调用返回新对象，便于将来替换为接口响应 */
export function demoMarketOverview(): MarketOverview {
  return {
    breadth: {
      downCount: 2071,
      flatCount: 186,
      limitDown: 9,
      limitUp: 68,
      upCount: 3142,
      volume5d: [
        { date: '10-22', turnoverYi: 18_800 },
        { date: '10-23', turnoverYi: 19_700 },
        { date: '10-24', turnoverYi: 19_900 },
        { date: '10-27', turnoverYi: 20_420 },
        { date: '10-28', turnoverYi: 21_400 },
      ],
    },
    heatmaps: {
      concept: makeHeatTiles(CONCEPT_HEAT, 20_261_028),
      industry: makeHeatTiles(INDUSTRY_HEAT, 20_261_027),
      region: makeHeatTiles(REGION_HEAT, 20_261_029),
    },
    indices: [
      {
        change: 20.92,
        changePct: 0.62,
        code: '000001.SH',
        name: '上证指数',
        spark: makeSpark(11, 1),
        turnoverYi: 4286,
        value: 3412.55,
      },
      {
        change: 68.4,
        changePct: 0.63,
        code: '399001.SZ',
        name: '深证成指',
        spark: makeSpark(22, 1),
        turnoverYi: 5842,
        value: 10_884.2,
      },
      {
        change: -6.72,
        changePct: -0.31,
        code: '399006.SZ',
        name: '创业板指',
        spark: makeSpark(33, -1),
        turnoverYi: 2416,
        value: 2158.34,
      },
      {
        change: 8.14,
        changePct: 0.85,
        code: '000688.SH',
        name: '科创50',
        spark: makeSpark(44, 1),
        turnoverYi: 486,
        value: 968.42,
      },
      {
        change: 15.6,
        changePct: 1.27,
        code: '899050.BJ',
        name: '北证50',
        spark: makeSpark(55, 1),
        turnoverYi: 218,
        value: 1246.8,
      },
      {
        change: 19.05,
        changePct: 0.48,
        code: '000300.SH',
        name: '沪深300',
        spark: makeSpark(66, 1),
        turnoverYi: 3120,
        value: 3986.2,
      },
    ],
    quoteTime: '15:00',
    sentiment: {
      marginBalanceYi: 16_200,
      marginWoWPct: 0.42,
      northDisclaimer:
        '北向资金实时净流入自 2024-05-13（「513 政策」）起已取消披露，本系统仅展示每日成交总额与季度持股变化，不设计「北向实时净流入」模块。',
      northTurnoverYi: 1286,
      sealRatePct: 74,
      timeline: [
        {
          desc: '沪深两市成交额 2.14 万亿，放量上涨，情绪偏暖',
          time: '15:00',
          title: '收盘',
          tone: 'up',
        },
        {
          desc: '沪市高开 0.32%，涨停开盘 21 只',
          time: '09:25',
          title: '集合竞价',
          tone: 'info',
        },
        {
          desc: '新增 2 只新股、3 只 ST 变更',
          time: '08:30',
          title: '证券主数据增量同步',
          tone: 'muted',
        },
      ],
      totalTurnoverYi: 21_400,
      turnoverVs5dPct: 8.6,
    },
    tradeDate: '2026-10-28',
    updatedAt: '16:10',
  };
}
