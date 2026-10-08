import { useState } from 'react'
import type { Key } from 'react'
import { Checkbox, Input, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './ManagedFileSelectOverlay.module.css'
import {
  DATASET_CATEGORY_LABELS,
  FILE_PAGE_SIZE,
} from '../../constants/dataset'
import {
  PROCESSING_TYPE_IMAGERY,
  toCategoryOfProcessingType,
} from '../../constants/task'
import { useDatasetCatalog } from '../../hooks/useDatasetCatalog'
import { useFileMetaPage } from '../../hooks/useFileMetaPage'
import { getAllFileMeta } from '../../services/fileMetaService'
import type { FileMeta, FileScope } from '../../types/fileMeta'

interface ManagedFileSelectOverlayProps {
  /** 当前处理类型：决定列哪个分类的数据，也决定能否勾选 */
  readonly processingType: string
  /** 打开时已选中的文件，来自任务弹窗当前的已选列表；影像只取第一条 */
  readonly initialSelected: readonly FileMeta[]
  /** 退出选择：不改动弹窗里原有的已选列表 */
  readonly onCancel: () => void
  readonly onConfirm: (files: readonly FileMeta[]) => void
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']
const DATASET_CATEGORY=['影像','地形','矢量']

/** 后端返回字节数字符串，展示为带单位的可读大小 */
function formatFileSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes)
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${SIZE_UNITS[unit]}`
}

/** 后端返回形如 2026-09-11T20:55:43.623167，展示为 2026-09-11 20:55:43 */
function formatTime(value: string): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

const COLUMNS: TableColumnsType<FileMeta> = [
  { title: '文件名', dataIndex: 'originalName', ellipsis: true },
  { title: '数据格式', dataIndex: 'extension', width: 110 },
  { title: '分类', dataIndex: 'categoryId', width: 120,render: (value) => DATASET_CATEGORY[value] },
  {
    title: '数据规模',
    key: 'sizeBytes',
    width: 120,
    render: (_, record) => formatFileSize(record.sizeBytes),
  },
  {
    title: '上传时间',
    key: 'createTime',
    width: 180,
    render: (_, record) => formatTime(record.createTime),
  },
]

/** 整选范围的稳定标识，用于回显勾选状态与取消整选 */
function scopeIdOf(scope: FileScope): string {
  if (scope.kind === 'dataset') return `dataset:${scope.dataSetId}`
  if (scope.kind === 'category') return `category:${scope.categoryId}`
  return scope.kind
}

/**
 * 数据管理数据的选择浮层：左侧切换「整个分类 / 某个数据集」，右侧是文件列表。
 * 影像切片一次只处理一个数据，列表为单选；地形可多选，且左侧分类与数据集行上
 * 带整选勾选框，勾选后把该范围下全部文件批量加入已选。
 * 右下角「确定」把所选文件交回任务弹窗，「退出选择」则保留原选择不变。
 */
export function ManagedFileSelectOverlay({
  processingType,
  initialSelected,
  onCancel,
  onConfirm,
}: ManagedFileSelectOverlayProps) {
  // 已选文件与各次整选归属的范围 id：取消整选时要按范围把文件一并移出
  const [selection, setSelection] = useState<{
    readonly files: Map<string, FileMeta>
    readonly scopes: Map<string, readonly string[]>
  }>(() => ({
    files: new Map(initialSelected.map((file) => [file.id, file])),
    scopes: new Map(),
  }))
  // 正在批量拉取的整选范围 id：拉取期间对应勾选框置灰
  const [bulkLoadingIds, setBulkLoadingIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  // 当前查看范围：null 表示整个分类，否则是某个数据集
  const [activeDataSetId, setActiveDataSetId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')

  // 影像切片对应影像数据、地形切片对应地形数据；其余类型暂未开放处理
  const categoryId = toCategoryOfProcessingType(processingType)
  // 影像与地形都支持已管理数据的切片；分类映射里没有的类型暂不开放
  const canSelect = categoryId !== undefined
  // 影像一次只处理一个数据，地形可多选并用整选勾选框
  const isSingle = processingType === PROCESSING_TYPE_IMAGERY

  const { catalog } = useDatasetCatalog()
  const datasets =
    categoryId === undefined ? [] : (catalog[categoryId]?.datasets ?? [])
  // 分类未知时传 null，hook 会跳过请求并保持空列表
  const scope: FileScope | null =
    categoryId === undefined
      ? null
      : activeDataSetId === null
        ? { kind: 'category', categoryId }
        : { kind: 'dataset', dataSetId: activeDataSetId }
  const { records, total, current, isLoading, error, goToPage } =
    useFileMetaPage(
      scope,
      keyword === '' ? {} : { originalName: keyword },
      FILE_PAGE_SIZE,
    )

  /** 行勾选变化：影像只保留最新勾选的那一条，地形与已选合并；取消勾选即移除 */
  function handleSelectChange(
    _keys: readonly Key[],
    rows: readonly FileMeta[],
  ) {
    if (isSingle) {
      const added = rows.find((row) => !selection.files.has(row.id))
      setSelection({
        files: added === undefined ? new Map() : new Map([[added.id, added]]),
        scopes: new Map(),
      })
      return
    }
    const pageIds = new Set(records.map((record) => record.id))
    setSelection((previous) => {
      const files = new Map(previous.files)
      for (const id of pageIds) files.delete(id)
      for (const row of rows) files.set(row.id, row)
      // 个别取消后，已不再完整覆盖的整选范围同步取消勾选
      const scopes = new Map(previous.scopes)
      for (const [id, ids] of previous.scopes) {
        if (!ids.every((fileId) => files.has(fileId))) scopes.delete(id)
      }
      return { files, scopes }
    })
  }

  /**
   * 整选 / 取消整选一个范围：勾选时逐页拉全量后整体加入已选并记下归属，
   * 取消时按记录的文件 id 一并移出。
   */
  async function handleScopeToggle(target: FileScope) {
    const id = scopeIdOf(target)
    if (selection.scopes.has(id)) {
      setSelection((previous) => {
        const files = new Map(previous.files)
        for (const fileId of previous.scopes.get(id) ?? []) files.delete(fileId)
        const scopes = new Map(previous.scopes)
        scopes.delete(id)
        return { files, scopes }
      })
      return
    }
    setBulkLoadingIds((previous) => new Set(previous).add(id))
    try {
      const all = await getAllFileMeta(target)
      setSelection((previous) => {
        const files = new Map(previous.files)
        for (const file of all) files.set(file.id, file)
        const scopes = new Map(previous.scopes)
        scopes.set(
          id,
          all.map((file) => file.id),
        )
        return { files, scopes }
      })
    } catch {
      // 拉取失败保持原选择不变；其余错误同时由 RequestErrorNotice 统一展示
    } finally {
      setBulkLoadingIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    }
  }

  const scopeLabel =
    activeDataSetId === null
      ? (DATASET_CATEGORY_LABELS[categoryId ?? -1] ?? '')
      : (datasets.find((dataset) => dataset.id === activeDataSetId)
          ?.dataSetName ?? '')

  return (
    <div className={styles.overlay}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarTitle}>数据目录</p>
        {categoryId === undefined ? (
          <p className={styles.sidebarHint}>该处理类型暂无可选数据</p>
        ) : (
          <ul className={styles.tree}>
            <li>
              <div className={styles.nodeRow}>
                {/* 整选勾选框：影像一次只处理一个数据，只在多选模式（地形）下给出 */}
                {!isSingle && (
                  <Checkbox
                    className={styles.nodeCheck}
                    checked={selection.scopes.has(`category:${categoryId}`)}
                    disabled={bulkLoadingIds.has(`category:${categoryId}`)}
                    onChange={() =>
                      handleScopeToggle({ kind: 'category', categoryId })
                    }
                    aria-label={`选择${DATASET_CATEGORY_LABELS[categoryId]}全部数据`}
                  />
                )}
                <button
                  type="button"
                  className={`${styles.nodeLabel}${
                    activeDataSetId === null ? ` ${styles.nodeLabelActive}` : ''
                  }`}
                  onClick={() => setActiveDataSetId(null)}
                >
                  {DATASET_CATEGORY_LABELS[categoryId]}
                </button>
              </div>
              <ul className={styles.tree}>
                {datasets.map((dataset) => {
                  const isActive = activeDataSetId === dataset.id
                  const scopeId = `dataset:${dataset.id}`
                  return (
                    <li key={dataset.id}>
                      <div className={styles.nodeRow}>
                        {!isSingle && (
                          <Checkbox
                            className={styles.nodeCheck}
                            checked={selection.scopes.has(scopeId)}
                            disabled={bulkLoadingIds.has(scopeId)}
                            onChange={() =>
                              handleScopeToggle({
                                kind: 'dataset',
                                dataSetId: dataset.id,
                              })
                            }
                            aria-label={`选择数据集${dataset.dataSetName}全部数据`}
                          />
                        )}
                        <button
                          type="button"
                          className={`${styles.nodeLabel}${
                            isActive ? ` ${styles.nodeLabelActive}` : ''
                          }`}
                          title={dataset.dataSetName}
                          onClick={() => setActiveDataSetId(dataset.id)}
                        >
                          {dataset.dataSetName}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        )}
      </aside>

      <div className={styles.main}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>选择数据</h2>
            <p className={styles.panelMeta}>
              当前域：{scopeLabel} · {total} 条数据 · 已选{' '}
              {selection.files.size} 条
            </p>
          </div>

          {!canSelect && (
            <p className={styles.notice}>
              该处理类型暂不支持已管理数据，请改用本地上传。
            </p>
          )}
          {isSingle && (
            <p className={styles.noticeInfo}>
              影像切片一次仅支持选择一个数据。
            </p>
          )}

          <div className={styles.toolbar}>
            <Input.Search
              className={styles.search}
              placeholder="按文件名筛选"
              allowClear
              onSearch={(value) => setKeyword(value.trim())}
            />
          </div>

          <Table<FileMeta>
            rowKey="id"
            size="small"
            columns={COLUMNS}
            dataSource={[...records]}
            loading={isLoading}
            rowSelection={{
              selectedRowKeys: [...selection.files.keys()],
              onChange: handleSelectChange,
              getCheckboxProps: () => ({ disabled: !canSelect }),
            }}
            pagination={{
              current,
              pageSize: FILE_PAGE_SIZE,
              total,
              size: 'small',
              showSizeChanger: false,
              showTotal: (value) => `共 ${value} 条`,
            }}
            onChange={(pagination) => goToPage(pagination.current ?? 1)}
            locale={{ emptyText: error ?? '暂无数据' }}
          />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            退出选择
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => onConfirm([...selection.files.values()])}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
