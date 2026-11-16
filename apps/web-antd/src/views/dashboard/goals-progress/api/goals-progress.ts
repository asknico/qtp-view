import type { GoalsOverview, GoalsQuery } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoGoalsOverview } from '../data/demo';

/**
 * 目标与进度（1.4）数据源
 * ---------------------------------------------------------------------------
 * 页面只依赖 fetchGoalsOverview 一个出口，接入后端时：
 *   1. 把 USE_DEMO 改为 false；
 *   2. 确认后端返回结构符合 data/types.ts 的 GoalsOverview（不一致就在此层做映射）。
 * 组件、页面、composable 均无需改动。
 *
 * 后端接口建议：GET /dashboard/goals-progress?date=2026-10-28
 * 一次返回目标配置 + 完成度 + 里程碑，避免首屏多次往返。
 */

/** 演示数据开关：接入真实接口后置为 false */
const USE_DEMO: boolean = true;

/** 接口路径（后续可抽到 constants 统一维护） */
const API = {
  overview: '/dashboard/goals-progress',
} as const;

export async function fetchGoalsOverview(
  query: GoalsQuery = {},
): Promise<GoalsOverview> {
  if (USE_DEMO) {
    return demoGoalsOverview();
  }

  const res = await alovaInstance.get<GoalsOverview>(API.overview, {
    params: query,
  });
  return res;
}
