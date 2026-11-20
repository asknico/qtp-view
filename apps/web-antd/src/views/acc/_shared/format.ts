/**
 * 账户与资金（ACC）通用格式化
 * ---------------------------------------------------------------------------
 * 金额在数据层一律为「元」的 number，精度处理只在展示层做：
 *   - 千分位 + 固定小数位，保证表格数字右对齐后视觉成列；
 *   - KPI 大字号需要把整数部分与小数部分拆开（小数部分降字号）；
 *   - 涨跌一律带符号，0 不带符号。
 */

/** 千分位 */
export function formatThousand(value: number, digits = 2): string {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** 金额拆分：整数段（含负号与千分位）与小数段分开，供 KPI 层级排版 */
export function splitAmount(value: number, decimals = 2) {
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, decPart = ''] = fixed.split('.');
  const sign = value < 0 ? '-' : '';
  return { dec: decPart, int: `${sign}${formatThousand(Number(intPart), 0)}` };
}

/** 带符号金额：+4,820.30 / -20,000.00；0 不带符号 */
export function formatSigned(value: number, digits = 2): string {
  if (value === 0) return formatThousand(0, digits);
  return `${value > 0 ? '+' : '-'}${formatThousand(Math.abs(value), digits)}`;
}
