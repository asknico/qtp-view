/**
 * 股票业务颜色常量（TS 侧）
 * ---------------------------------------------------------------------------
 * CSS 里的 var(--stock-*) 无法直接给 ECharts / Canvas / 内联 style 使用，
 * 所以这里保留一份 hex 常量。两处必须同步修改：
 *   - 本文件
 *   - src/styles/stock.css
 *
 * 注意：ECharts 的 option 一旦 setOption 就不会自动跟随主题切换，
 * 深色模式切换后需要重新 setOption 才能拿到新颜色。
 */

/** 涨跌三态颜色（浅色模式） */
export const STOCK_COLOR_LIGHT = {
  /** 涨 */
  up: '#E02E34',
  /** 跌：同花顺同款绿（截图取色） */
  down: '#137200',
  /** 平 */
  flat: '#8C8C8C',
} as const;

/** 涨跌三态颜色（深色模式，整体提亮避免在深底上发闷） */
export const STOCK_COLOR_DARK = {
  up: '#FF6B6B',
  down: '#32C115',
  flat: '#A6A6A6',
} as const;

/** 图表多序列色板：均线、指标线等使用；K 线本体必须仍用涨跌色 */
export const CHART_PALETTE_LIGHT = [
  '#116FD4',
  '#7B61FF',
  '#13BEBE',
  '#F98F15',
  '#ED2C93',
  '#9F5C2D',
  '#5D7A98',
  '#7CB404',
] as const;

export const CHART_PALETTE_DARK = [
  '#3991EF',
  '#9985FF',
  '#26D9D9',
  '#FA9F38',
  '#F051A6',
  '#C97940',
  '#879EB5',
  '#9EDC18',
] as const;

/**
 * 按主题取涨跌色
 * @param isDark 是否深色模式
 */
export function getStockColor(isDark = false) {
  return isDark ? STOCK_COLOR_DARK : STOCK_COLOR_LIGHT;
}

/**
 * 按主题取图表色板
 * @param isDark 是否深色模式
 */
export function getChartPalette(isDark = false) {
  return isDark ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
}

/**
 * 判定涨跌方向
 * 注意：A 股「平」的门槛不是严格 0，很多行情源会给 0.001 级别的浮点误差，
 * 且部分场景（如涨跌幅显示两位小数）实际四舍五入后为 0.00% 也应视为平。
 * @param value 涨跌值（涨跌幅或价差）
 * @param threshold 视为「平」的绝对值阈值，默认 0
 */
export function getStockTrend(
  value: null | number | undefined,
  threshold = 0,
): 'down' | 'flat' | 'up' {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'flat';
  }
  if (value > threshold) {
    return 'up';
  }
  if (value < -threshold) {
    return 'down';
  }
  return 'flat';
}

/**
 * 取涨跌对应的 CSS 类名，配合 stock.css 里的工具类使用
 * @example <span :class="getStockClass(row.changePercent)">+2.35%</span>
 */
export function getStockClass(
  value: null | number | undefined,
  threshold = 0,
): string {
  const trend = getStockTrend(value, threshold);
  return trend === 'flat' ? 'stock-flat' : `stock-${trend}`;
}

/**
 * 格式化涨跌幅：正数强制带 + 号
 * 颜色只是第二通道，符号和箭头才是第一通道——这是可用性底线，
 * 不能仅靠颜色表达涨跌（色盲用户无法分辨）。
 * @param value 涨跌幅数值，如 2.35（表示 2.35%）
 * @param digits 小数位，默认 2
 */
export function formatChangePercent(
  value: null | number | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  const fixed = value.toFixed(digits);
  return value > 0 ? `+${fixed}%` : `${fixed}%`;
}
