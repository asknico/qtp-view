import type { GoalsOverview, GoalsQuery } from '../data/types';

import { computed, onMounted, ref, shallowRef } from 'vue';

import { fetchGoalsOverview } from '../api/goals-progress';
import {
  allOnTrackOf,
  goalKpisOf,
  milestoneRowsOf,
  milestoneStatsOf,
  subtitleOf,
  targetBarsOf,
  yearGaugeDisplaysOf,
  yearRatePctOf,
} from '../data/selectors';

/**
 * 目标与进度（1.4）数据装配
 * ---------------------------------------------------------------------------
 * 页面只跟这个 composable 打交道：data / loading / error / refresh。
 * 数据源（演示 or 接口）由 api/goals-progress.ts 决定，此处不感知。
 */
export function useGoalsProgress() {
  /** 聚合数据（整体替换，避免深层响应式带来的无谓开销） */
  const data = shallowRef<GoalsOverview | null>(null);
  const loading = ref(false);
  const error = ref('');

  /** KPI 四卡 */
  const kpis = computed(() => (data.value ? goalKpisOf(data.value) : []));

  /** 年度目标达成率（%） */
  const yearRatePct = computed(() =>
    data.value ? yearRatePctOf(data.value) : 0,
  );

  /** 多目标进度条 */
  const bars = computed(() => (data.value ? targetBarsOf(data.value) : []));

  /** 硬性约束是否全部达标 */
  const allOnTrack = computed(() =>
    data.value ? allOnTrackOf(data.value) : true,
  );

  /** 里程碑表格行 */
  const milestoneRows = computed(() =>
    data.value ? milestoneRowsOf(data.value) : [],
  );

  /** 里程碑达成统计「3/5」 */
  const milestoneStats = computed(() =>
    data.value ? milestoneStatsOf(data.value) : '0/0',
  );

  /** 年度仪表盘三个数值展示 */
  const gaugeDisplays = computed(() =>
    data.value
      ? yearGaugeDisplaysOf(data.value)
      : { doneDisplay: '--', drawdownDisplay: '--', targetDisplay: '--' },
  );

  /** 页头副标题 */
  const subtitle = computed(() => (data.value ? subtitleOf(data.value) : ''));

  async function load(query: GoalsQuery = {}): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      data.value = await fetchGoalsOverview(query);
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '未知错误';
      window.message.error(`目标进度加载失败：${error.value}`);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    if (!data.value) void load();
  });

  return {
    allOnTrack,
    bars,
    data,
    error,
    gaugeDisplays,
    kpis,
    loading,
    load,
    milestoneRows,
    milestoneStats,
    refresh: load,
    subtitle,
    yearRatePct,
  };
}
