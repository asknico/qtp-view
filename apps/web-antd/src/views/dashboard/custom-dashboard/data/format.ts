/**
 * 自定义看板（1.6）格式化工具
 * ---------------------------------------------------------------------------
 * 与资产总览的格式化口径保持一致（千分位、小数拆分、带符号涨跌），
 * 但独立成文件，避免模块之间互相 import 页面内部数据。
 */

/** 千分位 */
export function formatThousand(value: number, digits = 0): string {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** 金额拆分：整数部分（千分位）+ 小数部分，用于「1,286,430.55」的小字排版 */
export function splitAmount(value: number, decimals = 2) {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const sign = value < 0 ? '-' : '';
  return { dec: dec ?? '', int: `${sign}${formatThousand(Number(int), 0)}` };
}

/** 带符号数值：+8,412.30 / -1.24% */
export function formatSigned(
  value: number,
  digits = 2,
  withPercent = false,
): string {
  if (value === 0) return withPercent ? '0.00%' : '0.00';
  const fixed = formatThousand(Math.abs(value), digits);
  const sign = value > 0 ? '+' : '-';
  return `${sign}${fixed}${withPercent ? '%' : ''}`;
}

/** 元 → 万亿 / 亿 展示（成交额） */
export function formatTurnover(yi: number): string {
  if (yi >= 10_000) return `${(yi / 10_000).toFixed(2)} 万亿`;
  return `${formatThousand(yi, 0)} 亿`;
}
