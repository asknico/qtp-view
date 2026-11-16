<script lang="ts" setup>
import type { MilestoneRowVm } from '../data/types';

interface Props {
  rows: MilestoneRowVm[];
}

defineProps<Props>();
</script>

<template>
  <div class="ms">
    <table>
      <colgroup>
        <col style="width: 14%" />
        <col style="width: 40%" />
        <col style="width: 28%" />
        <col style="width: 18%" />
      </colgroup>
      <thead>
        <tr>
          <th>时间</th>
          <th>里程碑</th>
          <th>条件</th>
          <th class="ms__center">状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.date}-${row.title}`">
          <td class="ms__date">{{ row.date }}</td>
          <td>{{ row.title }}</td>
          <td class="ms__cond">{{ row.condition }}</td>
          <td class="ms__center">
            <span class="ms__tag" :class="row.tagClass">{{ row.tagText }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ms {
  height: 100%;
  overflow: hidden;
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

th {
  height: 32px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  text-align: left;
  white-space: nowrap;
  background: hsl(var(--muted) / 40%);
  border-bottom: 1px solid hsl(var(--border) / 60%);
}

td {
  height: 36px;
  padding: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: hsl(var(--foreground));
  white-space: nowrap;
  border-bottom: 1px solid hsl(var(--border) / 40%);
}

tr:last-child td {
  border-bottom: none;
}

.ms__date {
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
}

.ms__cond {
  color: hsl(var(--muted-foreground));
}

.ms__center {
  text-align: center;
}

/* 状态标签 */
.ms__tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  font-size: 10.5px;
  border-radius: 4px;
}

.ms__tag.is-done {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.ms__tag.is-progress {
  color: hsl(215deg 85% 48%);
  background: hsl(215deg 90% 52% / 11%);
}

.ms__tag.is-pending {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 80%);
}
</style>
