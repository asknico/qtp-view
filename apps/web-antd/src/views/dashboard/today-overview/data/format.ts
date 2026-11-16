/**
 * 今日速览（1.2）纯格式化函数
 * ---------------------------------------------------------------------------
 * 不依赖任何演示数据，接入真实接口后原样复用。
 * 所有金额/涨跌的展示规则集中在此，避免在模板里散落 toFixed。
 */

/** 千分位（不带货币符） */
export function thousands(value: number, digits = 2): string {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** 金额：231,640.00 */
export function money(value: number, digits = 2): string {
  return thousands(value, digits);
}

/** 带符号金额：+2,146.80 / -4,860.00 / 0.00 */
export function signedMoney(value: number, digits = 2): string {
  if (value === 0) return thousands(0, digits);
  const sign = value > 0 ? '+' : '-';
  return `${sign}${thousands(Math.abs(value), digits)}`;
}

/** 带符号百分比：+3.42% / -2.14% / 0.00% */
export function signedPct(value: number, digits = 2): string {
  if (value === 0) return `${thousands(0, digits)}%`;
  const sign = value > 0 ? '+' : '-';
  return `${sign}${thousands(Math.abs(value), digits)}%`;
}

/** 百分比（不带符号）：62.0% */
export function pct(value: number, digits = 2): string {
  return `${thousands(value, digits)}%`;
}

/** 价格：1,682.00 / 3.986（ETF 三位小数） */
export function price(value: number, digits = 2): string {
  return thousands(value, digits);
}

/** 涨跌方向 → 通用色值 class */
export function toneClass(value: number): string {
  if (!value) return '';
  return value > 0 ? 'is-up' : 'is-down';
}

/** 证券名首字，用作列表头像（贵州茅台 → 贵） */
export function avatarChar(name: string): string {
  return name.slice(0, 1);
}

/** 买卖方向中文 */
export function sideLabel(side: 'buy' | 'sell'): string {
  return side === 'buy' ? '买入' : '卖出';
}

/** 是否在计划内中文 */
export function planLabel(planned: boolean): string {
  return planned ? '计划内' : '计划外';
}
