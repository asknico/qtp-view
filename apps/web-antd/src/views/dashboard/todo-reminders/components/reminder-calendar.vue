<script lang="ts" setup>
import type { CalendarCellVm, ReminderCalendar } from '../data/types';

interface Props {
  calendar: ReminderCalendar;
  cells: CalendarCellVm[];
}

defineProps<Props>();

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
</script>

<template>
  <div class="calendar">
    <div class="calendar__grid" aria-label="本月事件日历">
      <span v-for="day in weekdays" :key="day" class="calendar__weekday">
        {{ day }}
      </span>
      <span
        v-for="cell in cells"
        :key="cell.key"
        class="calendar__day"
        :class="{
          'calendar__day--blank': cell.day === null,
          'calendar__day--event': cell.hasEvent,
          'calendar__day--today': cell.isToday,
        }"
      >
        {{ cell.day ?? '' }}
      </span>
    </div>

    <div class="calendar__legend">
      <span><i class="calendar__event-dot"></i>事件日</span>
      <span><i class="calendar__today-dot"></i>今天</span>
    </div>

    <div class="calendar__events">
      <div
        v-for="event in calendar.events"
        :key="`${event.dateLabel}-${event.title}`"
        class="calendar__event"
      >
        <span>{{ event.dateLabel }}</span>
        <b>{{ event.detail }}</b>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px 3px;
  text-align: center;
}

.calendar__weekday {
  height: 16px;
  font-size: 10px;
  color: hsl(var(--muted-foreground));
}

.calendar__day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
  border-radius: 4px;
}

.calendar__day--blank {
  background: hsl(var(--muted) / 55%);
}

.calendar__day--event {
  color: hsl(var(--foreground));
  box-shadow: inset 0 -2px 0 hsl(var(--stock-up));
}

.calendar__day--today {
  font-weight: 650;
  color: hsl(215deg 85% 52%);
  background: hsl(215deg 90% 55% / 12%);
  box-shadow: none;
}

.calendar__legend {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 7px;
  font-size: 10px;
  color: hsl(var(--muted-foreground));
}

.calendar__legend span {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.calendar__legend i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.calendar__event-dot {
  background: hsl(var(--stock-up));
}

.calendar__today-dot {
  background: hsl(215deg 90% 55% / 20%);
}

.calendar__events {
  padding-top: 4px;
  margin-top: 7px;
  border-top: 1px solid hsl(var(--border) / 55%);
}

.calendar__event {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-height: 23px;
  font-size: 10.5px;
  border-bottom: 1px dashed hsl(var(--border) / 55%);
}

.calendar__event:last-child {
  border-bottom: none;
}

.calendar__event span {
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.calendar__event b {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 550;
  white-space: nowrap;
}
</style>
