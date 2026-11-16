import type { TodayOverview, TodayOverviewQuery } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoTodayOverview } from '../data/demo';

/**
 * 今日速览（1.2）数据源
 * ---------------------------------------------------------------------------
 * 页面只依赖 fetchTodayOverview 一个出口，接入后端时：
 *   1. 把 USE_DEMO 改为 false；
 *   2. 确认后端返回结构符合 data/types.ts 的 TodayOverview（不一致就在此层做映射）。
 * 组件、页面、composable 均无需改动。
 *
 * 后端接口建议：GET /dashboard/today-overview?date=2026-10-28&accountId=1
 * 一次返回 summary + gainers + losers + trades，避免首屏多次往返。
 */

/** 演示数据开关：接入真实接口后置为 false */
const USE_DEMO: boolean = true;

/** 接口路径（后续可抽到 constants 统一维护） */
const API = {
  overview: '/dashboard/today-overview',
} as const;

export async function fetchTodayOverview(
  query: TodayOverviewQuery = {},
): Promise<TodayOverview> {
  if (USE_DEMO) {
    return demoTodayOverview();
  }

  const res = await alovaInstance.get<TodayOverview>(API.overview, {
    params: query,
  });
  return res;
}
