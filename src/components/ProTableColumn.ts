import { defineComponent, h } from 'vue'
import { ElTableColumn } from 'element-plus'
import type { ProColumn } from './ProTable.vue'

/**
 * ProTableColumn —— 把「动态列」抽成独立子组件。
 *
 * 关键修复：原先在 ProTable 模板里用
 *   <el-table-column v-for="col in renderColumns">
 *     <template #default="{ row }"><slot :name="col.slot" :row="row"/></template>
 *   </el-table-column>
 * 时，<slot :name="col.slot"> 的 col 来自 v-for 作用域变量，Vue 3 在 v-for + v-slot
 * 组合下会把作用域变量闭包「串味」，导致只有最后一个 v-for 列的具名插槽能解析，
 * 其余列（即使声明了 slot）单元格渲染为空 → el-table 收不到它们的 cell 从而整列不注册。
 *
 * 这里把 col 作为「组件 prop」下传（每个实例一份稳定值，不再是 v-for 闭包变量），
 * 再用 render 函数的 default 插槽渲染单元格：有具名插槽就调用父级插槽，否则回退
 * 到 row[col.prop]（并支持 formatter）。插槽函数来自父组件 $slots，作用域仍绑定原定义
 * 组件，因此跨组件调用渲染结果正确。
 */
export default defineComponent({
  name: 'ProTableColumn',
  props: {
    col: { type: Object as () => ProColumn<any>, required: true },
    slots: {
      type: Object as () => Record<string, ((scope: any) => any) | undefined>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const c = props.col
      const defaultSlot = (scope: { row: any }) => {
        const row = scope.row
        if (c.slot && props.slots[c.slot]) {
          return props.slots[c.slot]!({ row })
        }
        const val = c.formatter ? c.formatter(row) : row?.[c.prop]
        return h('span', val == null ? '' : String(val))
      }
      return h(
        ElTableColumn,
        {
          prop: c.prop,
          label: c.label,
          width: c.width,
          minWidth: c.minWidth,
          sortable: c.sortable || undefined,
          fixed: c.fixed === undefined ? undefined : c.fixed,
          align: c.align || 'left',
          showOverflowTooltip: true,
        },
        { default: defaultSlot },
      )
    }
  },
})
