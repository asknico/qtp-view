import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getPopupContainer } from '@vben/utils';

/**
 * 券商管理（2.6）页面配置 —— 对齐设计稿 12_2.6券商管理.html
 */

/** 机构类型 */
export const BROKER_TYPE_OPTIONS = [
  { label: '证券公司', value: 'SECURITIES' },
  { label: '银行', value: 'BANK' },
  { label: '期货', value: 'FUTURES' },
  { label: '其他机构', value: 'OTHER' },
];

/** 券商状态（CLOSED 仅随销户流程流转，页面不下拉提供） */
export const BROKER_STATUS_OPTIONS = [
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
];

/** 默认交易方式 */
export const TRADE_CHANNEL_OPTIONS = [
  { label: '手工录入', value: 'MANUAL' },
  { label: '交割单导入', value: 'IMPORT' },
  { label: '自动 API', value: 'API' },
];

/** 佣金口径 */
export const COMMISSION_MODE_OPTIONS = [
  { label: '全佣', value: 'ALL_IN' },
  { label: '净佣', value: 'NET' },
];

/** 支持市场 */
export const MARKET_OPTIONS = [
  { label: '沪 SH', value: 'SH' },
  { label: '深 SZ', value: 'SZ' },
  { label: '北 BJ', value: 'BJ' },
  { label: '港 HK', value: 'HK' },
  { label: '美 US', value: 'US' },
];

export const BROKER_TYPE_MAP = new Map(
  BROKER_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);
export const BROKER_STATUS_MAP = new Map(
  BROKER_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);
export const MARKET_MAP = new Map(
  MARKET_OPTIONS.map((o) => [o.value, o.label]),
);

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'brokerCode',
    label: '券商编码',
    componentProps: { allowClear: true, placeholder: '编码模糊匹配，如 HT' },
  },
  {
    component: 'Input',
    fieldName: 'brokerName',
    label: '券商名称',
    componentProps: { allowClear: true, placeholder: '全称或简称关键字' },
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: BROKER_TYPE_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'brokerType',
    label: '机构类型',
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: BROKER_STATUS_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'brokerStatus',
    label: '状态',
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: TRADE_CHANNEL_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'defaultTradeChannel',
    label: '交易方式',
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: COMMISSION_MODE_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'commissionMode',
    label: '佣金口径',
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: MARKET_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'supportMarket',
    label: '覆盖市场',
  },
];

export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 50 },
  { title: '排序', field: 'orderNum', width: 64, align: 'center' },
  { title: '编码', field: 'brokerCode', width: 90 },
  {
    title: '券商全称 / 简称',
    field: 'brokerName',
    minWidth: 200,
    slots: { default: 'brokerName' },
  },
  {
    title: '机构类型',
    field: 'brokerType',
    width: 100,
    slots: { default: 'brokerType' },
  },
  {
    title: '状态',
    field: 'brokerStatus',
    width: 80,
    align: 'center',
    slots: { default: 'brokerStatus' },
  },
  {
    title: '默认佣金率',
    field: 'commissionRateWan',
    width: 130,
    align: 'right',
    slots: { default: 'commissionRate' },
  },
  {
    title: '最低佣金',
    field: 'minCommission',
    width: 100,
    align: 'right',
    formatter: ({ cellValue }) =>
      cellValue === null || cellValue === undefined
        ? ''
        : `¥${Number(cellValue).toFixed(2)}`,
  },
  {
    title: '口径',
    field: 'commissionMode',
    width: 72,
    align: 'center',
    slots: { default: 'commissionMode' },
  },
  {
    title: '规费',
    field: 'exchangeFeeRate',
    width: 100,
    align: 'right',
    formatter: ({ cellValue }) =>
      cellValue === null || cellValue === undefined
        ? ''
        : Number(cellValue).toFixed(7),
  },
  {
    title: '交收',
    field: 'settleCycle',
    width: 66,
    align: 'center',
    formatter: ({ cellValue }) =>
      cellValue === 'T1' ? 'T+1' : (cellValue === 'T0' ? 'T+0' : ''),
  },
  {
    title: '支持市场',
    field: 'supportMarkets',
    width: 130,
    slots: { default: 'supportMarkets' },
  },
  {
    title: '交易方式',
    field: 'defaultTradeChannelText',
    width: 104,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    resizable: false,
    width: 120,
  },
];
