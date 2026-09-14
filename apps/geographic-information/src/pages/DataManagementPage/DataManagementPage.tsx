import { useEffect, useRef, useState } from 'react'
import styles from './DataManagementPage.module.css'
import { DATA_MANAGEMENT_SECTIONS } from '../../config/navigation'
import { DatasetCreateDialog } from '../../features/dataManagement/components/DatasetCreateDialog/DatasetCreateDialog'
import { FileImportDialog } from '../../features/dataManagement/components/FileImportDialog/FileImportDialog'
import { FileMetaTable } from '../../features/dataManagement/components/FileMetaTable/FileMetaTable'
import { TaskRecordTable } from '../../features/dataManagement/components/TaskRecordTable/TaskRecordTable'
import { UploadProgressDialog } from '../../features/dataManagement/components/UploadProgressDialog/UploadProgressDialog'
import {
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  FILE_PAGE_SIZE,
} from '../../features/dataManagement/constants/dataset'
import { TASK_PAGE_SIZE } from '../../features/dataManagement/constants/task'
import { useDatasetCatalog } from '../../features/dataManagement/hooks/useDatasetCatalog'
import { useFileMetaPage } from '../../features/dataManagement/hooks/useFileMetaPage'
import { useTaskPage } from '../../features/dataManagement/hooks/useTaskPage'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'
import { deleteFileMeta } from '../../features/dataManagement/services/fileMetaService'
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
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  // 筛选条件暂未接入接口参数，仅保留输入状态
  const [dataType, setDataType] = useState('')
  const [fileName, setFileName] = useState('')
  const [collectedAt, setCollectedAt] = useState('')

  const isWorkspace = active.path === WORKSPACE_PATH
  const isImports = active.path === IMPORTS_PATH
  // 数据目录的选择只在「全部数据」页面生效：切到导入记录、回收站后视为未选择
  const activeSelection = isWorkspace ? selection : null
  const { catalog, refresh: refreshCatalog } = useDatasetCatalog()

  function resolveFileScope(): FileScope | null {
    if (!isWorkspace) return null
    if (activeSelection === null) return { kind: 'all' }
    if (activeSelection.kind === 'category')
      return { kind: 'category', categoryId: activeSelection.categoryId }
    return { kind: 'dataset', dataSetId: activeSelection.dataSetId }
  }

  const {
    records,
    total,
    current,
    isLoading,
    error,
    goToPage,
    refresh: refreshFiles,
  } = useFileMetaPage(resolveFileScope())
  const lastPage = Math.max(1, Math.ceil(total / FILE_PAGE_SIZE))
  const taskPage = useTaskPage(isImports)
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

  function toggleType(type: number) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function handleFilterReset() {
    setDataType('')
    setFileName('')
    setCollectedAt('')
    refreshFiles()
  }

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
        {isImports ? (
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
              lastPage={taskPage.lastPage}
              total={taskPage.total}
              pageSize={TASK_PAGE_SIZE}
              onPageChange={taskPage.goToPage}
            />
          </div>
        ) : !isWorkspace ? (
          <div className={styles.geoContentPlaceholder}>
            <h2>{active.label}</h2>
            <p>{SECTION_DESCRIPTION[active.path] ?? ''}</p>
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
            <div className={styles.filterBar}>
              <label className={styles.filterField}>
                <span>数据格式</span>
                <select
                  value={dataType}
                  onChange={(event) => setDataType(event.target.value)}
                >
                  <option value="">全部类型</option>
                  {dataTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>文件名</span>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="请输入文件名"
                />
              </label>
              <label className={styles.filterField}>
                <span>采集时间</span>
                <input
                  type="date"
                  value={collectedAt}
                  onChange={(event) => setCollectedAt(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.filterButton}
                onClick={() => refreshFiles()}
              >
                筛选
              </button>
              <button
                type="button"
                className={styles.filterButtonGhost}
                onClick={handleFilterReset}
              >
                重置
              </button>
            </div>
            <FileMetaTable
              records={records}
              isLoading={isLoading}
              error={error}
              current={current}
              lastPage={lastPage}
              total={total}
              pageSize={FILE_PAGE_SIZE}
              onPageChange={goToPage}
              onDelete={handleDeleteFile}
              deletingId={deletingId}
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
