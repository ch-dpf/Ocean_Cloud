import styles from './ResourceTable.module.css'
import type { ResourceRecord } from '../../types/resource'
import { RESOURCE_KIND_LABELS } from '../../constants/resource'
interface ResourceTableProps {
  readonly resources: readonly ResourceRecord[]
  readonly onSelectResource: (resource: ResourceRecord) => void
}
export function ResourceTable({
  resources,
  onSelectResource,
}: ResourceTableProps) {
  return (
    <>
      {' '}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>资源名称</th>
              <th>类型 / 格式</th>
              <th>大小</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td>
                  <strong>{resource.name}</strong>
                  <small>{resource.id}</small>
                </td>
                <td>
                  {RESOURCE_KIND_LABELS[resource.kind]}
                  <small>{resource.format}</small>
                </td>
                <td>{resource.sizeLabel}</td>
                <td>{resource.updatedAt}</td>
                <td>
                  <button
                    className={styles.detailButton}
                    onClick={() => onSelectResource(resource)}
                  >
                    查看详情 ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resources.length === 0 && (
        <div className={styles.empty}>没有匹配的资源，请调整搜索条件。</div>
      )}
      <div className={styles.tableFooter}>
        共 {resources.length} 项资源 <span>演示数据</span>
      </div>
    </>
  )
}
