import type { AccountOverview } from '../data/types';

import { alovaInstance } from '#/utils/http';

import { demoAccountOverview } from '../data/demo';

/**
 * 券商账户（2.1）数据源
 * ---------------------------------------------------------------------------
 * 一屏数据一次取回：账户列表 + 快照时间 + 本周资金变动。
 * 接入后端时把 USE_DEMO 置为 false，并在本层适配响应字段（账户 → acc_account）。
 * 建议接口：GET /accounts/broker-accounts/overview
 */
const USE_DEMO: boolean = true;

const API = {
  overview: '/accounts/broker-accounts/overview',
} as const;

export async function fetchBrokerAccountOverview(): Promise<AccountOverview> {
  if (USE_DEMO) return { ...demoAccountOverview };

  return alovaInstance.get<AccountOverview>(API.overview);
}
