/**
 * 市场概览（1.3）纯格式化函数
 * ---------------------------------------------------------------------------
 * 不依赖任何演示数据，接入真实接口后原样复用。
 * 指数点位 / 亿-万亿金额 / 涨跌符号的展示规则集中在此。
 */

/** 千分位（不带货币符） */
export function thousands(value: number, digits = 2): string {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** 指数点位：3,412.55 */
export function idxValue(value: number): string {
  return thousands(value, 2);
}

/** 带符号数值：+20.92 / -6.72 */
export function signed(value: number, digits = 2): string {
  if (value === 0) return thousands(0, digits);
  const sign = value > 0 ? '+' : '-';
  return `${sign}${thousands(Math.abs(value), digits)}`;
}

/** 带符号百分比：+0.62% / -0.31% */
export function signedPct(value: number, digits = 2): string {
  return `${signed(value, digits)}%`;
}

/** 亿元金额：<1 万亿显示「4,286 亿」，≥1 万亿显示「2.14 万亿」 */
export function formatYi(valueYi: number, digits = 2): string {
  if (Math.abs(valueYi) >= 10_000) {
    return `${thousands(valueYi / 10_000, digits)} 万亿`;
  }
  return `${thousands(valueYi, 0)} 亿`;
}

/** 涨跌方向 → 通用色值 class */
export function toneClass(value: number): string {
  if (!value) return '';
  return value > 0 ? 'is-up' : 'is-down';
}

/** 热力树图格子背景不透明度（按幅度分级，比网格版更深，14~85） */
export function heatTileAlphaPct(value: number): number {
  return Math.round(Math.min(0.14 + Math.abs(value) * 0.22, 0.85) * 100);
}
