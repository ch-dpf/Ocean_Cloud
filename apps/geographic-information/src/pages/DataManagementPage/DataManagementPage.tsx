import { useEffect, useRef, useState } from 'react'
import styles from './DataManagementPage.module.css'
import { DATA_MANAGEMENT_SECTIONS } from '../../config/navigation'
import { DatasetCreateDialog } from '../../features/dataManagement/components/DatasetCreateDialog/DatasetCreateDialog'
import { FileImportDialog } from '../../features/dataManagement/components/FileImportDialog/FileImportDialog'
import { FileMetaTable } from '../../features/dataManagement/components/FileMetaTable/FileMetaTable'
import { TaskRecordTable } from '../../features/dataManagement/components/TaskRecordTable/TaskRecordTable'
import { UploadProgressDialog } from '../../features/dataManagement/components/UploadProgressDialog/UploadProgressDialog'
import {
  DATASET_CATEGORY_IDS,
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  FILE_PAGE_SIZE,
} from '../../features/dataManagement/constants/dataset'
import {
  PROCESSING_TYPE_TERRAIN,
  TASK_PAGE_SIZE,
  TASK_TYPE_IMPORT,
} from '../../features/dataManagement/constants/task'
import { useDatasetCatalog } from '../../features/dataManagement/hooks/useDatasetCatalog'
import { useFileMetaPage } from '../../features/dataManagement/hooks/useFileMetaPage'
import { useTaskPage } from '../../features/dataManagement/hooks/useTaskPage'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'
import {
  deleteFileMeta,
  processFileMeta,
} from '../../features/dataManagement/services/fileMetaService'
import type {
  FileMeta,
  FileScope,
} from '../../features/dataManagement/types/fileMeta'

interface DataManagementPageProps {
  readonly activePath: string
}

const SECTION_DESCRIPTION: Readonly<Record<string, string>> = {
  '/data-management': '浏览、筛选与检索全部已登记的数据。',
  '/data-management/imports': '查看数据导入记录与进度。',
  '/data-management/recycle-bin': '恢复或彻底删除已移除的数据。',
}

/** 数据工作区（全部数据）的路径 */
const WORKSPACE_PATH = DATA_MANAGEMENT_SECTIONS[0].path

/** 导入记录的路径 */
const IMPORTS_PATH = '/data-management/imports'

/** 回收站的路径 */
const RECYCLE_BIN_PATH = '/data-management/recycle-bin'

/** 数据目录的选择：某个分类，或某个分类下的数据集；为空表示「全部数据」 */
type DatasetSelection =
  | { readonly kind: 'category'; readonly categoryId: number }
  | {
      readonly kind: 'dataset'
      readonly categoryId: number
      readonly dataSetId: string
    }

export function DataManagementPage({ activePath }: DataManagementPageProps) {
  const active =
    DATA_MANAGEMENT_SECTIONS.find((item) => item.path === activePath) ??
    DATA_MANAGEMENT_SECTIONS[0]
  const [selection, setSelection] = useState<DatasetSelection | null>(null)
  const [expandedTypes, setExpandedTypes] = useState<Set<number>>(
    () => new Set(),
  )
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  // 两类列表的每页条数，改动后由 hook 回到第 1 页
  const [filePageSize, setFilePageSize] = useState(FILE_PAGE_SIZE)
  const [taskPageSize, setTaskPageSize] = useState(TASK_PAGE_SIZE)

  const isWorkspace = active.path === WORKSPACE_PATH
  const isImports = active.path === IMPORTS_PATH
  const isRecycleBin = active.path === RECYCLE_BIN_PATH
  // 数据目录的选择只在「全部数据」页面生效：切到导入记录、回收站后视为未选择
  const activeSelection = isWorkspace ? selection : null
  const { catalog, refresh: refreshCatalog } = useDatasetCatalog()

  function resolveFileScope(): FileScope | null {
    // 回收站展示的是已删除的元数据，与数据工作区的范围互不干扰
    if (isRecycleBin) return { kind: 'recycleBin' }
    if (!isWorkspace) return null
    if (activeSelection === null) return { kind: 'all' }
    if (activeSelection.kind === 'category')
      return { kind: 'category', categoryId: activeSelection.categoryId }
    return { kind: 'dataset', dataSetId: activeSelection.dataSetId }
  }

  const {
    records,
    total,
    allTotal,
    current,
    isLoading,
    error,
    goToPage,
    refresh: refreshFiles,
  } = useFileMetaPage(resolveFileScope(), filePageSize)
  const taskPage = useTaskPage({
    enabled: isImports,
    taskType: TASK_TYPE_IMPORT,
    size: taskPageSize,
  })
  const { tasks, clearFinished } = useUploadTasks()
  const runningCount = tasks.filter((task) => !task.done).length
  // 有任务完成时刷新列表，让新上传的文件显示出来
  const finishedTaskNos = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newlyFinished = tasks.filter(
      (task) => task.done && !finishedTaskNos.current.has(task.taskNo),
    )
    if (newlyFinished.length === 0) return
    for (const task of newlyFinished) finishedTaskNos.current.add(task.taskNo)
    refreshFiles()
  }, [tasks, refreshFiles])
  const dataTypes = [...new Set(records.map((record) => record.extension))]
  // 导入弹窗的初始上下文：全部数据为空、分类为分类名、数据集为数据集名
  const selectedDataset =
    activeSelection !== null && activeSelection.kind === 'dataset'
      ? (catalog[activeSelection.categoryId]?.datasets.find(
          (item) => item.id === activeSelection.dataSetId,
        ) ?? null)
      : null
  const importKeyword =
    activeSelection === null
      ? ''
      : activeSelection.kind === 'category'
        ? DATASET_CATEGORY_LABELS[activeSelection.categoryId]
        : (selectedDataset?.dataSetName ?? '')

  /** 选中数据目录项：同时回到「全部数据」页面，保证内容区展示对应数据 */
  function handleSelectEntry(next: DatasetSelection) {
    setSelection(next)
    if (!isWorkspace) location.hash = `#${WORKSPACE_PATH}`
  }

  // 新增成功后切到所属分类，并刷新侧边栏目录
  function handleCreated(categoryId: number) {
    handleSelectEntry({ kind: 'category', categoryId })
    refreshCatalog()
  }

  /** 删除数据文件：确认后调用接口并刷新当前列表 */
  async function handleDeleteFile(record: FileMeta) {
    if (!window.confirm(`确定删除「${record.originalName}」吗？`)) return
    setDeletingId(record.id)
    try {
      await deleteFileMeta(record.id)
      refreshFiles()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    }
    setDeletingId(null)
  }

  /** 处理数据文件：确认后提交处理任务，进度到数据处理页查看 */
  async function handleProcessFile(record: FileMeta) {
    if (!window.confirm(`确定对「${record.originalName}」提交地形处理任务吗？`))
      return
    setProcessingId(record.id)
    try {
      await processFileMeta(record.id, PROCESSING_TYPE_TERRAIN)
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    }
    setProcessingId(null)
  }

  function toggleType(type: number) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handleFilePageChange(page: number, size: number) {
    setFilePageSize(size)
    goToPage(page)
  }

  function handleTaskPageChange(page: number, size: number) {
    setTaskPageSize(size)
    taskPage.goToPage(page)
  }

  // 数据工作区与回收站的筛选栏已并入表格组件的搜索栏

  return (
    <section className={styles.page}>
      <div className={styles.geoSideBar}>
        <div className={styles.geoSideBarTitle}>
          <div className={styles.searchBar}>
            <div className={styles.searchBarInput}>
              <input type="text" placeholder="⌕  搜索数据集名称" />
            </div>
            <button>↺</button>
          </div>
        </div>
        <nav className={styles.geoSideBarDirectory}>
          {DATA_MANAGEMENT_SECTIONS.map((item) => {
            // 上方导航与数据目录互斥：选中了分类或数据集时，这里不再高亮
            const isActive =
              item.path === active.path && activeSelection === null
            return (
              <a
                key={item.path}
                href={`#${item.path}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setSelection(null)}
                className={`${styles.geoSideBarDirectoryItem}${
                  isActive ? ` ${styles.geoSideBarDirectoryItemActive}` : ''
                }`}
              >
                <span className={styles.geoSideBarDirectoryIcon}>
                  <img
                    src={item.icon}
                    alt=""
                    className={styles.geoSideBarDirectoryIconDefault}
                  />
                  <img
                    src={item.activeIcon}
                    alt=""
                    className={styles.geoSideBarDirectoryIconActive}
                  />
                </span>
                <span className={styles.geoSideBarDirectoryText}>
                  {item.label}
                </span>
                {/* 全部数据的条数（数据个数），切到分类/数据集后仍显示全量值 */}
                {item.path === WORKSPACE_PATH && allTotal !== null && (
                  <span className={styles.geoSideBarDirectoryCount}>
                    {allTotal}
                  </span>
                )}
              </a>
            )
          })}
        </nav>
        <div className={styles.geoSideBarDivider} />
        <div className={styles.dataDirectory}>
          <div className={styles.dataDirectoryTitle}>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: '700',
                fontStyle: 'Bold',
                fontSize: '13px',
                color: '#13293D',
              }}
            >
              ▱ 数据目录
            </span>
            <button
              type="button"
              className={styles.dataSetAdd}
              onClick={() => setIsCreateOpen(true)}
              aria-label="新增数据集"
            >
              +
            </button>
          </div>
          <ul className={styles.dataDirectoryList}>
            {DATASET_CATEGORY_ORDER.map((categoryId) => {
              const label = DATASET_CATEGORY_LABELS[categoryId]
              const entry = catalog[categoryId]
              const isOpen = expandedTypes.has(categoryId)
              const isSelected =
                activeSelection !== null &&
                activeSelection.categoryId === categoryId
              return (
                <li key={categoryId}>
                  <div
                    className={`${styles.dataDirectoryItem}${
                      isSelected ? ` ${styles.dataDirectoryItemActive}` : ''
                    }`}
                  >
                    <button
                      type="button"
                      className={styles.dataDirectoryChevron}
                      onClick={() => toggleType(categoryId)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? `收起${label}` : `展开${label}`}
                    >
                      <span
                        className={`${styles.dataDirectoryChevronIcon}${
                          isOpen ? ` ${styles.dataDirectoryChevronOpen}` : ''
                        }`}
                        aria-hidden="true"
                      >
                        &gt;
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.dataDirectoryItemLabel}
                      onClick={() =>
                        handleSelectEntry({ kind: 'category', categoryId })
                      }
                      aria-pressed={isSelected}
                    >
                      <span className={styles.dataDirectoryItemName}>
                        {label}
                      </span>
                      {entry && (
                        <span className={styles.dataDirectoryItemCount}>
                          {entry.total}
                        </span>
                      )}
                    </button>
                  </div>
                  {isOpen && (
                    <ul className={styles.dataDirectoryDataSetList}>
                      {entry === undefined ? (
                        <li className={styles.dataDirectoryDataSetHint}>
                          正在加载数据集…
                        </li>
                      ) : entry.datasets.length === 0 ? (
                        <li className={styles.dataDirectoryDataSetHint}>
                          该分类下暂无数据集
                        </li>
                      ) : (
                        entry.datasets.map((dataset) => {
                          const isDataSetSelected =
                            activeSelection !== null &&
                            activeSelection.kind === 'dataset' &&
                            activeSelection.dataSetId === dataset.id
                          return (
                            <li key={dataset.id}>
                              <button
                                type="button"
                                className={`${styles.dataDirectoryDataSetItem}${
                                  isDataSetSelected
                                    ? ` ${styles.dataDirectoryDataSetItemActive}`
                                    : ''
                                }`}
                                onClick={() =>
                                  handleSelectEntry({
                                    kind: 'dataset',
                                    categoryId,
                                    dataSetId: dataset.id,
                                  })
                                }
                                aria-pressed={isDataSetSelected}
                              >
                                {dataset.dataSetName}
                              </button>
                            </li>
                          )
                        })
                      )}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className={styles.geoContent}>
        {isRecycleBin ? (
          <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
              <div
                className={`${styles.contentTitle} ${styles.contentTitleRecycle}`}
              >
                <h2>回收站</h2>
                <p>{SECTION_DESCRIPTION[RECYCLE_BIN_PATH] ?? ''}</p>
              </div>
            </div>
            <FileMetaTable
              records={records}
              isLoading={isLoading}
              error={error}
              current={current}
              total={total}
              pageSize={filePageSize}
              onPageChange={handleFilePageChange}
              dataFormatOptions={dataTypes}
              onSearch={() => refreshFiles()}
              onReset={() => refreshFiles()}
              // 恢复接口尚未接入，按钮先置灰占位
              actions={[{ label: '恢复', disabled: true }]}
            />
          </div>
        ) : isImports ? (
          <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
              <div className={styles.contentTitle}>
                <h2>导入记录</h2>
                <p>{SECTION_DESCRIPTION[IMPORTS_PATH] ?? ''}</p>
              </div>
            </div>
            <TaskRecordTable
              records={taskPage.records}
              isLoading={taskPage.isLoading}
              error={taskPage.error}
              current={taskPage.current}
              total={taskPage.total}
              pageSize={taskPageSize}
              onPageChange={handleTaskPageChange}
            />
          </div>
        ) : (
          <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
              <div className={styles.contentTitle}>
                <h2>GIS 数据管理</h2>
                <p>当前域：GIS · {total} 个数据集</p>
              </div>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.progressButton}
                  onClick={() => setIsProgressOpen(true)}
                >
                  上传进度{runningCount > 0 ? ` (${runningCount})` : ''}
                </button>
                <button
                  type="button"
                  className={styles.importButton}
                  onClick={() => setIsImportOpen(true)}
                >
                  导入GIS数据
                </button>
              </div>
            </div>
            <FileMetaTable
              records={records}
              isLoading={isLoading}
              error={error}
              current={current}
              total={total}
              pageSize={filePageSize}
              onPageChange={handleFilePageChange}
              dataFormatOptions={dataTypes}
              onSearch={() => refreshFiles()}
              onReset={() => refreshFiles()}
              actions={[
                {
                  label: '处理',
                  onClick: handleProcessFile,
                  pendingId: processingId,
                  // 暂只开放地形数据的处理，其余分类按钮置灰
                  disabled: (record) =>
                    Number(record.categoryId) !== DATASET_CATEGORY_IDS.terrain,
                },
                {
                  label: '删除',
                  onClick: handleDeleteFile,
                  pendingId: deletingId,
                  tone: 'danger',
                },
              ]}
            />
          </div>
        )}
      </div>
      {isCreateOpen && (
        <DatasetCreateDialog
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {isImportOpen && (
        <FileImportDialog
          initialKeyword={importKeyword}
          initialDataset={
            selectedDataset
              ? { id: selectedDataset.id, name: selectedDataset.dataSetName }
              : null
          }
          onClose={() => setIsImportOpen(false)}
          // 提交成功即关闭，上传进度到「上传进度」里看
          onSubmitted={() => setIsImportOpen(false)}
        />
      )}
      {isProgressOpen && (
        <UploadProgressDialog
          tasks={tasks}
          onClearFinished={clearFinished}
          onClose={() => setIsProgressOpen(false)}
        />
      )}
    </section>
  )
}
