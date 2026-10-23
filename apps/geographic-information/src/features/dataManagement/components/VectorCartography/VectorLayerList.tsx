import { Button, Checkbox, Spin } from 'antd'
import type { VectorGroup } from '../../types/vector'
import styles from './VectorCartography.module.css'

interface Props {
  readonly groups: readonly VectorGroup[]
  readonly hiddenGroups: ReadonlySet<string>
  readonly loading: boolean
  readonly onToggleGroup: (id: string, enabled: boolean) => void
  readonly onConfigure: (group: VectorGroup) => void
  readonly onRefresh: () => void
}
/** 默认目录只表达业务分类及要素数，不挂载重复的来源图层卡片。 */
export function VectorLayerList(props: Props) {
  const render = (groups: readonly VectorGroup[], parentHidden = false) =>
    groups.map((group) => {
      const disabled = parentHidden || !group.enabled
      const hidden = props.hiddenGroups.has(group.id)
      return (
        <div key={group.id} style={{ paddingLeft: 12, marginTop: 6 }}>
          <Checkbox
            checked={!disabled && !hidden}
            disabled={disabled}
            onChange={(event) =>
              props.onToggleGroup(group.id, event.target.checked)
            }
          >
            {group.name}（{group.featureCount}）
          </Checkbox>
          {group.assignable && (
            <Button
              type="text"
              size="small"
              onClick={() => props.onConfigure(group)}
            >
              配图
            </Button>
          )}
          {render(group.children, disabled || hidden)}
        </div>
      )
    })
  return (
    <div>
      <div className={styles.panelTitle}>
        默认分类{' '}
        <Button size="small" onClick={props.onRefresh}>
          刷新
        </Button>
      </div>
      <p className={styles.hint}>
        数量为要素数；勾选仅控制当前地图，不修改瓦片内容。
      </p>
      {props.loading && <Spin size="small" />}
      {render(props.groups)}
    </div>
  )
}
