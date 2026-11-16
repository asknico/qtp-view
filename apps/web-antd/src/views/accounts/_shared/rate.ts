import type { BrokerAccount } from '../broker-accounts/data/types';

/** 费率 → 万分比数值：0.00012 → 1.2 */
export function rateToWan(rate: number): number {
  return rate * 10_000;
}

/** 费率 → 万分比文案：0.00012 → 万 1.20 */
export function formatWanRate(rate: number, digits = 2): string {
  return `万 ${rateToWan(rate).toFixed(digits)}`;
}

/** 费率 → 小数原值（去掉末尾零）：0.0000541 → "0.0000541" */
export function formatRateDecimals(rate: number): string {
  return rate.toFixed(7).replace(/0+$/, '');
}

/** 详情页「开通板块」摘要：只取三大交易板块（主板 / 创业板 / 科创板） */
const MAIN_BOARDS = ['MAIN', 'GEM', 'STAR'] as const;

export function grantedBoardText(account: BrokerAccount): string {
  const names = account.boards
    .filter(
      (board) =>
        board.granted &&
        MAIN_BOARDS.includes(board.code as (typeof MAIN_BOARDS)[number]),
    )
    .map((board) => board.name);
  return names.length > 0 ? names.join(' / ') : '无';
}
