import type { CustomDashboard } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoCustomDashboard } from '../data/demo';

/**
 * 自定义看板（1.6）数据源
 * 接入后端时只需将 USE_DEMO 置为 false，并在此层适配接口响应。
 * 建议接口：GET /dashboard/custom-dashboard
 */
const USE_DEMO: boolean = true;

const API = {
  overview: '/dashboard/custom-dashboard',
} as const;

export async function fetchCustomDashboard(): Promise<CustomDashboard> {
  if (USE_DEMO) return demoCustomDashboard();

  return alovaInstance.get<CustomDashboard>(API.overview);
}
