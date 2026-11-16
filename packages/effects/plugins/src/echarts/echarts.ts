import {
  BarChart,
  GaugeChart,
  LineChart,
  MapChart,
  PieChart,
  RadarChart,
  ScatterChart,
  TreemapChart,
} from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import {
  LabelLayout,
  LegacyGridContainLabel,
  UniversalTransition,
} from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TitleComponent,
  PieChart,
  RadarChart,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  BarChart,
  LineChart,
  ScatterChart,
  TreemapChart,
  LabelLayout,
  LegacyGridContainLabel,
  UniversalTransition,
  CanvasRenderer,
  LegendComponent,
  ToolboxComponent,
  GaugeChart,
  VisualMapComponent,
  MapChart,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
]);
export type { ECOption } from './types';

export default echarts;
