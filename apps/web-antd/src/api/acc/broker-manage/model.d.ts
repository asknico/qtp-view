import type { PageQuery } from '#/api/common';

/**
 * 券商管理（2.6）列表/详情行
 * <p>后端直接返回展示字段：佣金率万文本、口径/交易方式文案、市场数组
 */
export interface BrokerManage {
  brokerId: number;
  brokerCode: string;
  brokerName: string;
  shortName?: null | string;
  brokerType: string;
  brokerStatus: string;
  commissionRate: number;
  commissionRateWan?: null | string;
  minCommission: number;
  commissionMode: 'ALL_IN' | 'NET';
  commissionModeText: string;
  exchangeFeeRate?: null | number;
  settleCycle?: null | string;
  supportMarkets: string[];
  defaultTradeChannel: string;
  defaultTradeChannelText?: null | string;
  licenseNo?: null | string;
  website?: null | string;
  servicePhone?: null | string;
  appName?: null | string;
  marginRate?: null | number;
  shortSellRate?: null | number;
  openUrl?: null | string;
  orderNum?: null | number;
  /** 绑定银行卡张数（券商级主数据，预算分配 2.4 体系） */
  cardCount?: null | number;
  /** 资金池是否已绑定（券商级一对一） */
  poolBound?: boolean | null;
  /** 资金池类别摘要（如：长线池 26万 + 稳定池 10万） */
  poolText?: null | string;
  remark?: null | string;
  createTime?: null | string;
}

/** 顶部汇总（券商总数 / 覆盖市场数 / 默认佣金区间 / 全佣净佣分布） */
export interface BrokerManageSummary {
  total: number;
  activeCount: number;
  inactiveCount: number;
  marketCount: number;
  minRate: null | number;
  maxRate: null | number;
  allInCount: number;
  netCount: number;
  /** 当前最大排序号（新建默认排序号 = 此值 + 1） */
  maxOrderNum: number;
  /** 各市场券商数（SH/SZ/BJ/HK/US → 支持该市场的券商数量） */
  marketCounts: Record<string, number>;
}

/** 列表查询参数 */
export interface BrokerManageQuery extends PageQuery {
  brokerCode?: string;
  brokerName?: string;
  brokerType?: string;
  brokerStatus?: string;
  defaultTradeChannel?: string;
  commissionMode?: string;
  supportMarket?: string;
}

/** 新建/编辑表单参数 */
export interface BrokerManageSave {
  id?: number;
  brokerCode?: string;
  brokerName: string;
  shortName?: string;
  brokerType: string;
  licenseNo?: string;
  website?: string;
  servicePhone?: string;
  appName?: string;
  defaultTradeChannel: string;
  defaultCommissionRate: number;
  defaultMinCommission: number;
  defaultAllIn: number;
  exchangeFeeRate?: number;
  settleCycle?: string;
  supportMarkets?: string;
  brokerStatus?: string;
  orderNum?: number;
  remark?: string;
}
