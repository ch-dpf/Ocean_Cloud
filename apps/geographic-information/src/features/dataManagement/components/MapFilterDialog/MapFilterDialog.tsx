import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { Button, Input, Spin } from 'antd'
import { AppDialog, formatFileSize } from '@ocean-cloud/ui'
import { useMapBoundsSearch } from '../../hooks/useMapBoundsSearch'
import { buildFileDownloadUrl } from '../../services/fileMetaService'
import type { FileMeta, GeographicBounds } from '../../types/fileMeta'
import { ProcessingCreateDialog } from '../ProcessingCreateDialog/ProcessingCreateDialog'
import type { ManagedSubmitInput } from '../ProcessingCreateDialog/ProcessingCreateDialog'
import { MapFilterResultTable } from './MapFilterResultTable'
import styles from './MapFilterDialog.module.css'

const SpatialMap = lazy(() =>
  import('../SpatialMap/SpatialMap').then((module) => ({
    default: module.SpatialMap,
  })),
)

interface MapFilterDialogProps {
  readonly dataSetId: string
  readonly onClose: () => void
  /** 批量处理提交回调；不传时隐藏批量处理入口（如回收站） */
  readonly onBatchProcess?: (input: ManagedSubmitInput) => void
}

interface BoundsInput {
  readonly west: string
  readonly north: string
  readonly east: string
  readonly south: string
}

const EMPTY_INPUT: BoundsInput = { west: '', north: '', east: '', south: '' }

const INPUT_FIELDS = [
  { key: 'west', label: '左上经度', placeholder: '-180 ~ 180' },
  { key: 'north', label: '左上纬度', placeholder: '-90 ~ 90' },
  { key: 'east', label: '右下经度', placeholder: '-180 ~ 180' },
  { key: 'south', label: '右下纬度', placeholder: '-90 ~ 90' },
] as const

function toInputValue(value: number): string {
  return String(Number(value.toFixed(6)))
}

/** 校验四个输入值；允许 west > east 表示跨 180° 经线。 */
function parseBounds(inputs: BoundsInput): {
  readonly bounds: GeographicBounds | null
  readonly error: string | null
} {
  const values = [inputs.west, inputs.north, inputs.east, inputs.south]
  if (values.some((value) => value.trim() === ''))
    return { bounds: null, error: null }
  const [west, north, east, south] = values.map(Number)
  if (![west, north, east, south].every(Number.isFinite))
    return { bounds: null, error: '经纬度必须是有效数字。' }
  if (Math.abs(west) > 180 || Math.abs(east) > 180)
    return { bounds: null, error: '经度需在 -180° ~ 180° 之间。' }
  if (Math.abs(north) > 90 || Math.abs(south) > 90)
    return { bounds: null, error: '纬度需在 -90° ~ 90° 之间。' }
  if (north <= south) return { bounds: null, error: '左上纬度需大于右下纬度。' }
  if (west === east)
    return { bounds: null, error: '左上经度与右下经度不能相同。' }
  return { bounds: { west, north, east, south }, error: null }
}

/**
 * 地图范围筛选：左侧框选地图，右侧经纬度输入与查询结果。
 * 只查询当前数据集内的文件，按框选矩形过滤。
 */
export function MapFilterDialog({
  dataSetId,
  onClose,
  onBatchProcess,
}: MapFilterDialogProps) {
  const searchState = useMapBoundsSearch(dataSetId)
  const [bounds, setBounds] = useState<GeographicBounds | null>(null)
  const [inputs, setInputs] = useState<BoundsInput>(EMPTY_INPUT)
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [selectedRecords, setSelectedRecords] = useState<readonly FileMeta[]>(
    [],
  )
  const selectedRows = useRef(new Map<string, FileMeta>())
  const [batchFiles, setBatchFiles] = useState<readonly FileMeta[] | null>(null)
  const parsed = useMemo(() => parseBounds(inputs), [inputs])
  const totalSizeText =
    searchState.totalSize === undefined
      ? '统计中…'
      : searchState.totalSize === null
        ? '—'
        : formatFileSize(String(searchState.totalSize))

  function handleInputChange(key: keyof BoundsInput, value: string) {
    const next = { ...inputs, [key]: value }
    setInputs(next)
    const result = parseBounds(next)
    if (result.bounds !== null) setBounds(result.bounds)
  }

  function handleBoundsChange(next: GeographicBounds | null) {
    if (next === null) {
      setBounds(null)
      setInputs(EMPTY_INPUT)
      return
    }
    setBounds(next)
    setInputs({
      west: toInputValue(next.west),
      north: toInputValue(next.north),
      east: toInputValue(next.east),
      south: toInputValue(next.south),
    })
  }

  function handleSearch() {
    if (parsed.bounds === null) return
    setBounds(parsed.bounds)
    selectedRows.current.clear()
    setSelectedIds([])
    setSelectedRecords([])
    searchState.search(parsed.bounds)
  }

  function handleSelectionChange(
    keys: readonly string[],
    rows: readonly FileMeta[],
  ) {
    const selected = new Set(keys)
    for (const row of rows) selectedRows.current.set(row.id, row)
    for (const id of [...selectedRows.current.keys()]) {
      if (!selected.has(id)) selectedRows.current.delete(id)
    }
    setSelectedIds(keys)
    setSelectedRecords(
      keys.flatMap((id) => {
        const record = selectedRows.current.get(id)
        return record ? [record] : []
      }),
    )
  }

  /** 临时按选中文件逐个发起下载，后续可替换为批量下载接口。 */
  function handleExport() {
    selectedRecords.forEach((file, index) => {
      window.setTimeout(() => {
        const link = document.createElement('a')
        link.href = buildFileDownloadUrl(file.id)
        link.download = file.originalName
        link.rel = 'noreferrer'
        document.body.appendChild(link)
        link.click()
        link.remove()
      }, index * 250)
    })
  }

  return (
    <AppDialog
      title="地图范围筛选"
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
      <div className={styles.body}>
        <div className={styles.mapPanel}>
          <Suspense
            fallback={
              <div className={styles.mapLoading}>
                <Spin />
              </div>
            }
          >
            <SpatialMap
              bounds={bounds}
              onBoundsChange={handleBoundsChange}
              showControls
              fill
              fitBounds={false}
            />
          </Suspense>
        </div>
        <div className={styles.sidePanel}>
          <div className={styles.inputPanel}>
            <p className={styles.hint}>
              在地图上拖动框选，或直接修改经纬度，两者实时联动。
            </p>
            <div className={styles.inputGrid}>
              {INPUT_FIELDS.map((field) => (
                <label className={styles.field} key={field.key}>
                  <span>{field.label}</span>
                  <Input
                    size="small"
                    inputMode="decimal"
                    allowClear
                    value={inputs[field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      handleInputChange(field.key, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
            {parsed.error !== null && (
              <p className={styles.inputError}>{parsed.error}</p>
            )}
            <Button
              type="primary"
              block
              disabled={parsed.bounds === null}
              onClick={handleSearch}
            >
              查询
            </Button>
          </div>
          <div className={styles.resultPanel}>
            <div className={styles.resultHeader}>
              <span>查询结果</span>
              {searchState.hasQuery && (
                <span className={styles.hitSummary}>
                  命中 {searchState.total} 个文件 · 总大小 {totalSizeText}
                </span>
              )}
            </div>
            <MapFilterResultTable
              records={searchState.records}
              total={searchState.total}
              current={searchState.page}
              loading={searchState.loading}
              error={searchState.error}
              hasQuery={searchState.hasQuery}
              selectedIds={selectedIds}
              onPageChange={searchState.goToPage}
              onSelectionChange={handleSelectionChange}
            />
            <div className={styles.resultFooter}>
              <Button
                type="primary"
                size="small"
                disabled={selectedIds.length === 0}
                onClick={handleExport}
              >
                导出
              </Button>
              {onBatchProcess !== undefined && (
                <Button
                  type="primary"
                  size="small"
                  disabled={selectedIds.length === 0}
                  onClick={() => setBatchFiles(selectedRecords)}
                >
                  批量处理
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {batchFiles !== null && (
        <ProcessingCreateDialog
          initialManagedFiles={batchFiles}
          onClose={() => setBatchFiles(null)}
          onSubmitManaged={(input) => {
            setBatchFiles(null)
            onBatchProcess?.(input)
          }}
        />
      )}
    </AppDialog>
  )
}
