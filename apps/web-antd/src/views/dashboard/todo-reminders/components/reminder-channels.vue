<script lang="ts" setup>
import type { ChannelSummary, PushRecord } from '../data/types';

interface Props {
  channels: ChannelSummary[];
  pushes: PushRecord[];
}

defineProps<Props>();
</script>

<template>
  <div class="channels">
    <div class="channels__summary">
      <div v-for="channel in channels" :key="channel.key" class="channel">
        <div class="channel__label">{{ channel.label }}</div>
        <div class="channel__value">{{ channel.value }}</div>
        <div class="channel__note">{{ channel.note }}</div>
      </div>
    </div>

    <div class="channels__timeline">
      <div
        v-for="(record, index) in pushes"
        :key="`${record.time}-${record.title}`"
        class="push"
      >
        <span class="push__time">{{ record.time }}</span>
        <span class="push__rail">
          <i class="push__dot" :class="`push__dot--${record.tone}`"></i>
          <i v-if="index < pushes.length - 1" class="push__line"></i>
        </span>
        <div class="push__body">
          <div class="push__title">{{ record.title }}</div>
          <div class="push__desc">{{ record.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.channels {
  display: flex;
  flex-direction: column;
  gap: 9px;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.channels__summary {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.channel {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 7px;
}

.channel__label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.channel__value {
  margin-top: 1px;
  font-size: var(--font-value);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}

.channel__note {
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.channels__timeline {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.push {
  display: flex;
  flex: 1;
  gap: 9px;
  min-height: 42px;
}

.push__time {
  flex: 0 0 54px;
  padding-top: 1px;
  font-size: var(--font-small);
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
  text-align: right;
  white-space: nowrap;
}

.push__rail {
  display: flex;
  flex: 0 0 8px;
  flex-direction: column;
  align-items: center;
}

.push__dot {
  display: inline-block;
  flex: 0 0 7px;
  width: 7px;
  height: 7px;
  margin-top: 4px;
  border-radius: 50%;
}

.push__dot--danger {
  background: hsl(var(--stock-up));
  box-shadow: 0 0 0 3px hsl(var(--stock-up) / 13%);
}

.push__dot--warning {
  background: hsl(32deg 85% 48%);
  box-shadow: 0 0 0 3px hsl(32deg 95% 53% / 13%);
}

.push__dot--info {
  background: hsl(215deg 85% 55%);
  box-shadow: 0 0 0 3px hsl(215deg 85% 55% / 13%);
}

.push__dot--muted {
  background: hsl(var(--muted-foreground) / 65%);
  box-shadow: 0 0 0 3px hsl(var(--muted-foreground) / 12%);
}

.push__line {
  flex: 1;
  width: 1px;
  margin-top: 3px;
  background: hsl(var(--border) / 70%);
}

.push__body {
  flex: 1;
  min-width: 0;
  padding-bottom: 7px;
}

.push__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-body);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.push__desc {
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}
</style>
