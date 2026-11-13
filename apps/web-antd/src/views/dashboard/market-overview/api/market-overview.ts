import type { MarketOverview, MarketOverviewQuery } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoMarketOverview } from '../data/demo';

/**
 * 市场概览（1.3）数据源
 * ---------------------------------------------------------------------------
 * 页面只依赖 fetchMarketOverview 一个出口，接入后端时：
 *   1. 把 USE_DEMO 改为 false；
 *   2. 确认后端返回结构符合 data/types.ts 的 MarketOverview（不一致就在此层做映射）。
 * 组件、页面、composable 均无需改动。
 *
 * 后端接口建议：GET /dashboard/market-overview?date=2026-10-28
 * 一次返回 indices + heatmaps + breadth + sentiment，避免首屏多次往返。
 */

/** 演示数据开关：接入真实接口后置为 false */
const USE_DEMO: boolean = true;

/** 接口路径（后续可抽到 constants 统一维护） */
const API = {
  overview: '/dashboard/market-overview',
} as const;

export async function fetchMarketOverview(
  query: MarketOverviewQuery = {},
): Promise<MarketOverview> {
  if (USE_DEMO) {
    return demoMarketOverview();
  }

  const res = await alovaInstance.get<MarketOverview>(API.overview, {
    params: query,
  });
  return res;
}
