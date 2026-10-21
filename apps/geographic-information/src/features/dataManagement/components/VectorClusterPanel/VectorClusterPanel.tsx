import { useEffect, useState } from 'react'
import { Alert, Button, Drawer, Space, Spin, Typography } from 'antd'
import { getVectorClusterMembers } from '../../services/vectorService'
import type { VectorClusterHit, VectorClusterMember } from '../../types/vector'
interface Props {
  readonly hit: VectorClusterHit
  readonly onSelect: (layerId: string, featureId: string) => void
  readonly onZoom: () => void
  readonly onClose: () => void
  readonly onRefresh: () => void
}
/** 成员按原始 ID 游标分页；重叠点无需继续放大即可选择。 */
export function VectorClusterPanel({
  hit,
  onSelect,
  onZoom,
  onClose,
  onRefresh,
}: Props) {
  const [members, setMembers] = useState<readonly VectorClusterMember[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      setLoading(true)
      setError(null)
      try {
        const result = await getVectorClusterMembers(
          hit,
          cursor,
          controller.signal,
        )
        if (controller.signal.aborted) return
        setMembers((previous) =>
          cursor ? [...previous, ...result.members] : result.members,
        )
        setNext(result.hasMore ? result.nextCursor : null)
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '成员加载失败')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })
    return () => controller.abort()
  }, [hit, cursor])
  return (
    <Drawer open title="聚合成员" width={420} mask={false} onClose={onClose}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Typography.Text>
          {hit.kind === 'aggregate' ? '概化对象' : hit.pointCount + ' 个点位'}
          ，来自 {hit.featureCount} 个原始要素
        </Typography.Text>
        <Button onClick={onZoom}>放大查看聚合区域</Button>
        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={onRefresh}>
                刷新图层
              </Button>
            }
          />
        )}
        {members.map((member) => (
          <div key={member.featureId}>
            <Button
              block
              onClick={() => onSelect(hit.layerId, member.featureId)}
              aria-label={'查看原始要素 ' + member.featureId}
            >
              查看要素 {member.featureId}
            </Button>
            <Typography.Paragraph ellipsis={{ rows: 2 }}>
              {JSON.stringify(member.properties)}
            </Typography.Paragraph>
          </div>
        ))}
        {loading && <Spin size="small" />}
        {next && (
          <Button disabled={loading} onClick={() => setCursor(next)}>
            加载更多成员
          </Button>
        )}
      </Space>
    </Drawer>
  )
}
