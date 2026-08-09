// OrangeAdmin ECharts 按需引入注册中心
// 仅注册模板演示所需的图表与组件，控制打包体积（对售卖模板是加分项）
import * as echarts from 'echarts/core'
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
])

export default echarts
export type { EChartsOption } from 'echarts'
