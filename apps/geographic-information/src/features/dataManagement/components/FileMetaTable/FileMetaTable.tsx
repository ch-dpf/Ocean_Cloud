import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CloseOutlined, EnvironmentOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  AppDialog,
  SearchTable,
  StatusDot,
  TableActions,
  formatFileSize,
  formatTime,
  type StatusTone,
  type TableAction,
} from '@ocean-cloud/ui'
import {
  DATASET_CATEGORY_LABELS,
  FILE_FORMAT_OPTIONS,
  METADATA_STATUS_LABELS,
  METADATA_STATUS_OPTIONS,
  toProcessLabel,
} from '../../constants/dataset'
import { getFileMetaDetail } from '../../services/fileMetaService'
import type {
  ApiNumber,
  FileMeta,
  FileMetaFilters,
  GeographicBounds,
  MetadataStatus,
  SpatialReference,
} from '../../types/fileMeta'
import detailStyles from '../TransferDetailDialog/TransferDetailDialog.module.css'

const SpatialMap = lazy(() =>
  import('../SpatialMap/SpatialMap').then((module) => ({
    default: module.SpatialMap,
  })),
)

export interface FileRowAction {
  readonly label: string
  readonly onClick?: (record: FileMeta) => void
  readonly pendingId?: string | null
  readonly disabled?: boolean | ((record: FileMeta) => boolean)
  readonly tone?: 'default' | 'danger'
  readonly link?: (record: FileMeta) => {
    readonly href: string
    readonly download: string
  }
}

interface FileMetaTableProps {
  readonly recycleBin?: boolean
  readonly records: readonly FileMeta[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  readonly onPageChange: (page: number, pageSize: number) => void
  readonly actions?: readonly FileRowAction[]
  readonly extraActions?: ReactNode
  readonly onSearch: (filters: FileMetaFilters) => void
  readonly onReset: () => void
  readonly onRetryMetadata?: (record: FileMeta) => Promise<void>
  readonly retryingMetadataId?: string | null
}

const METADATA_TONES: Readonly<Record<string, StatusTone>> = {
  QUEUED: 'pending',
  RUNNING: 'running',
  COMPLETED: 'done',
  FAILED: 'failed',
  NOT_APPLICABLE: 'warning',
}

function spatialNumber(value: ApiNumber | null): string {
  if (value === null) return '—'
  const number = Number(value)
  return Number.isFinite(number)
    ? number.toLocaleString('zh-CN', { maximumSignificantDigits: 9 })
    : '—'
}

function resolutionOf(layer: SpatialReference): string {
  if (layer.dataKind === 'VECTOR') return '不适用'
  return `${spatialNumber(layer.resolutionX)} × ${spatialNumber(layer.resolutionY)} ${layer.resolutionUnit ?? ''}/像素`
}

function zoomOf(layer: SpatialReference): string {
  return layer.recommendedMaxZoom === null
    ? layer.dataKind === 'VECTOR'
      ? '不适用'
      : '未计算'
    : spatialNumber(layer.recommendedMaxZoom)
}

function layerSummary(
  record: FileMeta,
  render: (layer: SpatialReference) => string,
): string {
  const values = [...new Set(record.spatialReferences.map(render))]
  return values.length === 0 ? '—' : values.join('；')
}

function MetadataState({ record }: { readonly record: FileMeta }) {
  return (
    <Tooltip title={record.metadataErrorMessage ?? undefined}>
      <StatusDot
        tone={METADATA_TONES[record.metadataStatus] ?? 'pending'}
        label={METADATA_STATUS_LABELS[record.metadataStatus]}
      />
    </Tooltip>
  )
}

function SpatialMetadataDialog({
  id,
  onClose,
  onRetryMetadata,
  retryingMetadataId,
}: {
  readonly id: string
  readonly onClose: () => void
  readonly onRetryMetadata?: (record: FileMeta) => Promise<void>
  readonly retryingMetadataId?: string | null
}) {
  const [detail, setDetail] = useState<FileMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      try {
        const record = await getFileMetaDetail(id, controller.signal)
        if (controller.signal.aborted) return
        setDetail(record)
        setError(null)
        if (
          record.metadataStatus === 'QUEUED' ||
          record.metadataStatus === 'RUNNING'
        ) {
          timer = setTimeout(() => void load(), 2500)
        }
      } catch {
        if (!controller.signal.aborted)
          setError('空间信息加载失败，请关闭后重试。')
      }
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [id, revision])

  async function retry() {
    if (detail === null || onRetryMetadata === undefined) return
    try {
      await onRetryMetadata(detail)
      setRevision((previous) => previous + 1)
    } catch {
      // 请求失败由统一错误提示展示；当前详情保留。
    }
  }

  return (
    <AppDialog
      title="文件空间信息"
      onClose={onClose}
      closeOutside
      className={detailStyles.dialog}
    >
      <div className={detailStyles.body}>
        {error !== null ? (
          <Alert type="error" showIcon message={error} />
        ) : detail === null ? (
          <Spin tip="正在加载空间信息">
            <div style={{ minHeight: 100 }} />
          </Spin>
        ) : (
          <>
            <Descriptions
              size="small"
              column={2}
              style={{ marginTop: 16 }}
              items={[
                { key: 'name', label: '文件名', children: detail.originalName },
                {
                  key: 'state',
                  label: '空间信息状态',
                  children: <MetadataState record={detail} />,
                },
                {
                  key: 'time',
                  label: '提取时间',
                  children: formatTime(detail.metadataExtractedAt),
                },
                {
                  key: 'layers',
                  label: '图层数',
                  children: detail.spatialReferences.length,
                },
              ]}
            />
            {detail.metadataErrorMessage !== null && (
              <Alert
                type="error"
                showIcon
                message="空间信息提取失败"
                description={detail.metadataErrorMessage}
              />
            )}
            {(detail.metadataStatus === 'QUEUED' ||
              detail.metadataStatus === 'RUNNING') && (
              <Alert
                type="info"
                showIcon
                message="正在提取空间信息，完成后才可参与范围和层级筛选。"
              />
            )}
            {detail.spatialReferences.some(
              (layer) => layer.geographicExtent !== null,
            ) && (
              <Suspense
                fallback={
                  <Spin tip="正在加载地图">
                    <div style={{ minHeight: 300 }} />
                  </Spin>
                }
              >
                <SpatialMap
                  geometries={detail.spatialReferences.flatMap((layer) =>
                    layer.geographicExtent === null
                      ? []
                      : [layer.geographicExtent],
                  )}
                />
              </Suspense>
            )}
            {detail.spatialReferences.map((layer) => (
              <section key={layer.layerKey}>
                <p className={detailStyles.sectionTitle}>
                  {layer.layerName || layer.layerKey}
                </p>
                <Descriptions
                  bordered
                  size="small"
                  column={2}
                  items={[
                    {
                      key: 'type',
                      label: '数据类型',
                      children: layer.dataKind === 'RASTER' ? '栅格' : '矢量',
                    },
                    {
                      key: 'crs',
                      label: '源坐标系',
                      children: layer.sourceCrsCode || '自定义坐标系（见定义）',
                    },
                    {
                      key: 'tl',
                      label: '范围左上角',
                      children: `${spatialNumber(layer.west)}°，${spatialNumber(layer.north)}°`,
                    },
                    {
                      key: 'br',
                      label: '范围右下角',
                      children: `${spatialNumber(layer.east)}°，${spatialNumber(layer.south)}°`,
                    },
                    {
                      key: 'res',
                      label: '源分辨率',
                      children: resolutionOf(layer),
                    },
                    {
                      key: 'zoom',
                      label: '推荐最大层级',
                      children: zoomOf(layer),
                    },
                    ...(layer.dataKind === 'RASTER'
                      ? [
                          {
                            key: 'size',
                            label: '栅格尺寸',
                            children: `${spatialNumber(layer.rasterWidth)} × ${spatialNumber(layer.rasterHeight)} 像素`,
                          },
                          {
                            key: 'bands',
                            label: '波段数',
                            children: spatialNumber(layer.bandCount),
                          },
                        ]
                      : []),
                    {
                      key: 'matrix',
                      label: '层级计算口径',
                      span: 2,
                      children:
                        layer.tileMatrixSetId === null
                          ? '不适用或未计算'
                          : `${layer.tileMatrixSetId} · ${layer.tileWidth} × ${layer.tileHeight} 像素瓦片`,
                    },
                  ]}
                />
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  范围使用 WGS84
                  经纬度。矢量按包围范围检索，栅格范围未扣除无数据区域；推荐层级是原始精度参考，并非已生成的成果层级。
                </Typography.Paragraph>
                <Collapse
                  size="small"
                  items={[
                    {
                      key: 'crs',
                      label: '坐标参考定义',
                      children: (
                        <Typography.Paragraph
                          copyable
                          style={{
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {layer.sourceCrsWkt}
                        </Typography.Paragraph>
                      ),
                    },
                    ...(layer.geographicExtent === null
                      ? []
                      : [
                          {
                            key: 'extent',
                            label: 'WGS84 范围几何',
                            children: (
                              <Typography.Paragraph
                                copyable
                                style={{
                                  overflowWrap: 'anywhere',
                                  maxHeight: 180,
                                  overflow: 'auto',
                                }}
                              >
                                {layer.geographicExtent}
                              </Typography.Paragraph>
                            ),
                          },
                        ]),
                  ]}
                />
              </section>
            ))}
            {onRetryMetadata !== undefined &&
              (detail.metadataStatus === 'FAILED' ||
                detail.metadataStatus === 'COMPLETED') && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button
                    loading={retryingMetadataId === id}
                    onClick={() => void retry()}
                  >
                    重新提取空间信息
                  </Button>
                </div>
              )}
          </>
        )}
      </div>
    </AppDialog>
  )
}

function buildColumns(
  current: number,
  pageSize: number,
  actions: readonly FileRowAction[] | undefined,
  onDetail: (id: string) => void,
): TableColumnsType<FileMeta> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    {
      title: '文件名',
      key: 'originalName',
      width: 170,
      ellipsis: true,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          style={{
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={record.originalName}
          onClick={() => onDetail(record.id)}
        >
          {record.originalName}
        </Button>
      ),
    },
    { title: '文件路径', dataIndex: 'storageKey', width: 220, ellipsis: true },
    {
      title: '上传时间',
      key: 'createTime',
      width: 170,
      render: (_, record) => formatTime(record.createTime),
    },
    {
      title: '数据规模',
      key: 'sizeBytes',
      width: 110,
      render: (_, record) => formatFileSize(record.sizeBytes),
    },
    {
      title: '数据类型',
      key: 'categoryId',
      width: 110,
      render: (_, record) => DATASET_CATEGORY_LABELS[Number(record.categoryId)],
    },
    { title: '数据格式', dataIndex: 'extension', width: 90 },
    {
      title: '处理类型',
      key: 'process',
      width: 130,
      render: (_, record) => toProcessLabel(Number(record.categoryId)),
    },
    {
      title: '空间信息状态',
      key: 'metadataStatus',
      width: 130,
      render: (_, record) => <MetadataState record={record} />,
    },
    {
      title: '源坐标系',
      key: 'sourceCrs',
      width: 150,
      ellipsis: true,
      render: (_, record) =>
        layerSummary(record, (layer) => layer.sourceCrsCode || '自定义坐标系'),
    },
    {
      title: '源分辨率',
      key: 'resolution',
      width: 200,
      ellipsis: true,
      render: (_, record) => layerSummary(record, resolutionOf),
    },
    {
      title: '推荐最大层级',
      key: 'recommendedMaxZoom',
      width: 130,
      render: (_, record) => layerSummary(record, zoomOf),
    },
    {
      title: '失败原因',
      key: 'metadataErrorMessage',
      width: 220,
      ellipsis: true,
      render: (_, record) => record.metadataErrorMessage || '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          justify="evenly"
          actions={(actions ?? []).map((item): TableAction => {
            const pending = item.pendingId === record.id
            const disabled =
              typeof item.disabled === 'function'
                ? item.disabled(record)
                : item.disabled === true
            const link = item.link?.(record)
            return {
              key: item.label,
              label: pending ? '处理中…' : item.label,
              tone: item.tone === 'danger' ? 'danger' : 'default',
              disabled: disabled || pending,
              href: link?.href,
              download: link?.download,
              onClick:
                item.onClick === undefined
                  ? undefined
                  : () => item.onClick?.(record),
            }
          })}
        />
      ),
    },
  ]
}

function toFilters(
  values: Record<string, unknown>,
  bounds: GeographicBounds | null,
): FileMetaFilters {
  const originalName =
    typeof values.originalName === 'string' ? values.originalName.trim() : ''
  return {
    ...(originalName ? { originalName } : {}),
    ...(typeof values.extension === 'string' && values.extension !== ''
      ? { extension: values.extension }
      : {}),
    ...(typeof values.metadataStatus === 'string' &&
    values.metadataStatus !== ''
      ? { metadataStatus: values.metadataStatus as MetadataStatus }
      : {}),
    ...(bounds ? { ...bounds, spatialRelation: 'INTERSECTS' as const } : {}),
  }
}

export function FileMetaTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
  actions,
  extraActions,
  onSearch,
  onReset,
  onRetryMetadata,
  retryingMetadataId,
  recycleBin = false,
}: FileMetaTableProps) {
  const [form] = Form.useForm()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapBounds, setMapBounds] = useState<GeographicBounds | null>(null)
  const [draftBounds, setDraftBounds] = useState<GeographicBounds | null>(null)
  return (
    <>
      <SearchTable<FileMeta>
        compact
        extraActions={extraActions}
        columns={buildColumns(current, pageSize, actions, setDetailId)}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        total={total}
        current={current}
        pageSize={pageSize}
        onPageChange={onPageChange}
        searchForm={form}
        onSearch={(values) => onSearch(toFilters(values, mapBounds))}
        onReset={() => {
          setMapBounds(null)
          onReset()
        }}
        scrollX={2160}
        emptyText={error ?? undefined}
        searchFormItems={
          <>
            <Form.Item label="格式" name="extension">
              <Select
                placeholder="全部类型"
                allowClear
                style={{ width: 100 }}
                options={FILE_FORMAT_OPTIONS.map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Form.Item>
            <Form.Item label="文件名" name="originalName">
              <Input
                placeholder="请输入文件名"
                allowClear
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item label="空间状态" name="metadataStatus">
              <Select
                placeholder={recycleBin ? '全部状态' : '可用数据（默认）'}
                allowClear
                style={{ width: 140 }}
                options={METADATA_STATUS_OPTIONS}
              />
            </Form.Item>
            <Form.Item label="范围">
              <Space size={4}>
                <Button
                  icon={<EnvironmentOutlined />}
                  type={mapBounds ? 'dashed' : 'default'}
                  onClick={() => {
                    setDraftBounds(mapBounds)
                    setMapOpen(true)
                  }}
                >
                  {mapBounds ? '已框选' : '地图框选'}
                </Button>
                {mapBounds && (
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    aria-label="清除范围筛选"
                    onClick={() => setMapBounds(null)}
                  />
                )}
              </Space>
            </Form.Item>
          </>
        }
      />
      {mapOpen && (
        <AppDialog
          title="地图范围筛选"
          onClose={() => setMapOpen(false)}
          closeOutside
          className={detailStyles.dialog}
        >
          <div className={detailStyles.body}>
            <Suspense
              fallback={
                <Spin tip="正在加载地图">
                  <div style={{ minHeight: 300 }} />
                </Spin>
              }
            >
              <SpatialMap
                bounds={draftBounds}
                onBoundsChange={setDraftBounds}
              />
            </Suspense>
            <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
              框选后点击“使用此范围”，再点击页面“搜索”，检索与所选范围相交的文件。
            </Typography.Paragraph>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setMapOpen(false)}>取消</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setMapBounds(draftBounds)
                    setMapOpen(false)
                  }}
                >
                  使用此范围
                </Button>
              </Space>
            </div>
          </div>
        </AppDialog>
      )}
      {detailId !== null && (
        <SpatialMetadataDialog
          id={detailId}
          onClose={() => setDetailId(null)}
          onRetryMetadata={onRetryMetadata}
          retryingMetadataId={retryingMetadataId}
        />
      )}
    </>
  )
}
