import { useEffect, useRef, useState } from 'react'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { ConfirmDialog } from '@ocean-cloud/ui'
import styles from './DataManagementPage.module.css'
import { DATA_MANAGEMENT_SECTIONS } from '../../config/navigation'
import { DatasetCreateDialog } from '../../features/dataManagement/components/DatasetCreateDialog/DatasetCreateDialog'
import { DatasetDetailDialog } from '../../features/dataManagement/components/DatasetDetailDialog/DatasetDetailDialog'
import { DatasetEditDialog } from '../../features/dataManagement/components/DatasetEditDialog/DatasetEditDialog'
import { DatasetSearch } from '../../features/dataManagement/components/DatasetSearch/DatasetSearch'
import { FileImportDialog } from '../../features/dataManagement/components/FileImportDialog/FileImportDialog'
import { FileMetaTable } from '../../features/dataManagement/components/FileMetaTable/FileMetaTable'
import { FileOptDetailDialog } from '../../features/dataManagement/components/FileOptDetailDialog/FileOptDetailDialog'
import { FileOptRecordTable } from '../../features/dataManagement/components/FileOptRecordTable/FileOptRecordTable'
import { ProcessingCreateDialog } from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import type { ManagedSubmitInput } from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import { UploadProgressDialog } from '../../features/dataManagement/components/UploadProgressDialog/UploadProgressDialog'
import DocumentFolderIcon from '../../assets/icons/DocumentFolder.svg'
import {
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  FILE_OPT_PAGE_SIZE,
  FILE_PAGE_SIZE,
} from '../../features/dataManagement/constants/dataset'
import {
  CATEGORY_PROCESSING_TYPES,
  UPLOAD_TASK_KINDS,
} from '../../features/dataManagement/constants/task'
import { useDatasetCatalog } from '../../features/dataManagement/hooks/useDatasetCatalog'
import { useFileMetaPage } from '../../features/dataManagement/hooks/useFileMetaPage'
import { useFileOptPage } from '../../features/dataManagement/hooks/useFileOptPage'
import { useSidebarCounts } from '../../features/dataManagement/hooks/useSidebarCounts'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'
import {
  deleteFileMeta,
  downloadFileMeta,
  purgeDeletedFileMeta,
  restoreDeletedFileMeta,
} from '../../features/dataManagement/services/fileMetaService'
import { uploadGisFiles } from '../../features/dataManagement/services/gisUpload'
import { deleteDataset } from '../../features/dataManagement/services/datasetService'
import { createManagedProcessingTask } from '../../features/dataManagement/services/taskService'
import type { GeoDataset } from '../../features/dataManagement/types/dataset'
import type { FileOptFilters } from '../../features/dataManagement/types/fileOpt'
import type {
  FileMeta,
  FileMetaFilters,
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

/** 「全部数据」在副标题里的名字 */
const WORKSPACE_LABEL = DATA_MANAGEMENT_SECTIONS[0].label

/** 空筛选条件：引用稳定，避免每次渲染都触发查询条件比对 */
const NO_FILE_FILTERS: FileMetaFilters = {}

/** 导入记录的路径 */
const IMPORTS_PATH = '/data-management/imports'

/** 回收站的路径 */
const RECYCLE_BIN_PATH = '/data-management/recycle-bin'

/** 数据集右键菜单：查看详情、重命名与删除 */
const DATASET_MENU_ITEMS: MenuProps['items'] = [
  { key: 'detail', label: '详情' },
  { key: 'rename', label: '重命名' },
  { key: 'delete', label: '删除', danger: true },
]

/** 数据目录的选择：某个分类，或某个分类下的数据集；为空表示「全部数据」 */
type DatasetSelection =
  | { readonly kind: 'category'; readonly categoryId: number }
  | {
      readonly kind: 'dataset'
      readonly categoryId: number
      readonly dataSetId: string
      /** 选中时一并带上名称，供副标题与导入弹窗使用 */
      readonly dataSetName: string
    }

/** 把二进制内容存成本地文件：临时 a 标签 + object URL，稍后再回收 */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // 立即回收会让部分浏览器来不及读取，延后释放
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  // 数据集右键菜单触发的弹窗：详情、重命名与删除
  const [detailDataset, setDetailDataset] = useState<GeoDataset | null>(null)
  const [renamingDataset, setRenamingDataset] = useState<GeoDataset | null>(
    null,
  )
  const [deletingDataset, setDeletingDataset] = useState<GeoDataset | null>(
    null,
  )
  // 数据文件行操作触发的确认弹窗；回收站另有两个行内操作（恢复、彻底删除）
  const [processingFile, setProcessingFile] = useState<FileMeta | null>(null)
  const [purgingFile, setPurgingFile] = useState<FileMeta | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [purgingId, setPurgingId] = useState<string | null>(null)
  // 文件列表的筛选条件（数据格式、文件名），由表格的搜索栏回传
  const [fileFilters, setFileFilters] =
    useState<FileMetaFilters>(NO_FILE_FILTERS)
  // 两类列表的每页条数，改动后由 hook 回到第 1 页
  const [filePageSize, setFilePageSize] = useState(FILE_PAGE_SIZE)
  const [fileOptPageSize, setFileOptPageSize] = useState(FILE_OPT_PAGE_SIZE)
  // 导入记录的筛选条件（记录编号、数据集、分类、状态、文件名、格式、创建时间）
  const [fileOptFilters, setFileOptFilters] = useState<FileOptFilters>({})
  // 打开详情弹窗的记录编号
  const [detailRecordNo, setDetailRecordNo] = useState<string | null>(null)

  const isWorkspace = active.path === WORKSPACE_PATH
  const isImports = active.path === IMPORTS_PATH
  const isRecycleBin = active.path === RECYCLE_BIN_PATH
  // 数据目录的选择只在「全部数据」页面生效：切到导入记录、回收站后视为未选择
  const activeSelection = isWorkspace ? selection : null
  const {
    datasets: allDatasets,
    catalog,
    isLoading: isCatalogLoading,
    refresh: refreshCatalog,
  } = useDatasetCatalog()

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
  } = useFileMetaPage(resolveFileScope(), fileFilters, filePageSize)
  // 第三个参数是「当前是否停在导入记录栏目」：切到该栏目时变化，从而重新查询一次
  const fileOptPage = useFileOptPage(fileOptFilters, fileOptPageSize, isImports)
  const { refresh: refreshFileOpt } = fileOptPage
  const {
    recycleBinTotal,
    importRecordTotal,
    refresh: refreshSidebarCounts,
  } = useSidebarCounts()
  // 只展示导入任务的帧，处理任务的帧归数据处理页的「处理进度」
  const { tasks, clearFinished, addPendingTask, failTask } =
    useUploadTasks(UPLOAD_TASK_KINDS)
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
    // 导入完成后「导入记录」列表与侧边栏计数都变了
    refreshSidebarCounts()
    refreshFileOpt()
  }, [tasks, refreshFiles, refreshSidebarCounts, refreshFileOpt])
  // 导入弹窗的初始上下文：全部数据为空、分类为分类名、数据集为数据集名
  const selectedDataset =
    activeSelection !== null && activeSelection.kind === 'dataset'
      ? activeSelection
      : null
  const importKeyword =
    activeSelection === null
      ? ''
      : activeSelection.kind === 'category'
        ? DATASET_CATEGORY_LABELS[activeSelection.categoryId]
        : activeSelection.dataSetName
  // 副标题的当前域：全部数据 / 分类名 / 数据集名
  const scopeLabel =
    activeSelection === null
      ? WORKSPACE_LABEL
      : activeSelection.kind === 'category'
        ? DATASET_CATEGORY_LABELS[activeSelection.categoryId]
        : activeSelection.dataSetName

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

  /** 搜索结果中选中数据集：进入该数据集内部（不在全部数据时一并切回） */
  function handleSearchSelect(dataset: GeoDataset) {
    handleSelectEntry({
      kind: 'dataset',
      categoryId: Number(dataset.categoryId),
      dataSetId: dataset.id,
      dataSetName: dataset.dataSetName,
    })
  }

  /** 搜索栏刷新：回到「全部数据」并重新拉一次目录 */
  function handleSearchReset() {
    setSelection(null)
    if (!isWorkspace) location.hash = `#${WORKSPACE_PATH}`
    refreshCatalog()
  }

  /**
   * 导入数据：分片上传，任务由后端在第一块上传时创建，拿到任务编号后再插「上传中」占位。
   * 提交后立即关窗，进度到「上传进度」里看；失败时把占位标为失败
   * （连第一块都没成功时还没有占位可收口）。失败提示由 RequestErrorNotice 统一展示。
   */
  async function handleImport(input: {
    readonly dataSetId: string
    readonly files: readonly File[]
  }) {
    setIsImportOpen(false)
    let taskId: string | null = null
    try {
      await uploadGisFiles({
        dataSetId: input.dataSetId,
        files: input.files,
        onTaskCreated(createdTaskId) {
          taskId = createdTaskId
          addPendingTask(createdTaskId, input.files.length)
        },
      })
    } catch (error) {
      // http 层失败会自己派发全局错误条；这里只兜住非 http 的异常（例如浏览器 API 不可用），
      // 至少不让它静默消失
      console.error('导入上传失败', error)
      if (taskId !== null) failTask(taskId)
    }
  }

  /** 删除数据文件：不再二次确认，成功刷新当前列表与侧边栏计数（数据进回收站） */
  async function handleDeleteFile(record: FileMeta) {
    setDeletingId(record.id)
    try {
      await deleteFileMeta(record.id)
      refreshFiles()
      // 删除后「全部数据」与「回收站」的条数都变了
      refreshSidebarCounts()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    } finally {
      setDeletingId(null)
    }
  }

  /** 恢复回收站里的数据文件：直接执行，成功刷新列表与侧边栏计数 */
  async function handleRestoreFile(record: FileMeta) {
    setRestoringId(record.id)
    try {
      await restoreDeletedFileMeta(record.id)
      refreshFiles()
      refreshSidebarCounts()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    } finally {
      setRestoringId(null)
    }
  }

  /** 彻底删除：在确认弹窗里执行，删除后不可恢复 */
  async function confirmPurgeFile() {
    if (purgingFile === null) return
    setPurgingId(purgingFile.id)
    try {
      await purgeDeletedFileMeta(purgingFile.id)
      refreshFiles()
      refreshSidebarCounts()
    } finally {
      setPurgingId(null)
    }
  }

  /**
   * 提交处理任务：地形与影像都走已管理文件的切片接口（带文件标识）。
   * 进度到数据处理页查看，失败提示由 RequestErrorNotice 统一展示。
   */
  async function handleManagedProcess(input: ManagedSubmitInput) {
    setProcessingFile(null)
    const [fileMetaId] = input.fileMetaIds
    if (fileMetaId === undefined) return
    setProcessingId(fileMetaId)
    try {
      await createManagedProcessingTask(input)
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    } finally {
      setProcessingId(null)
    }
  }

  /** 下载数据文件：取回二进制内容后交给浏览器保存 */
  async function handleDownloadFile(record: FileMeta) {
    setDownloadingId(record.id)
    try {
      const blob = await downloadFileMeta(record.id)
      saveBlob(blob, record.originalName)
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    } finally {
      setDownloadingId(null)
    }
  }

  /** 删除数据集：成功后刷新目录；若正选中该数据集则回到「全部数据」 */
  async function confirmDeleteDataset() {
    if (deletingDataset === null) return
    await deleteDataset(deletingDataset.id)
    refreshCatalog()
    if (
      selection !== null &&
      selection.kind === 'dataset' &&
      selection.dataSetId === deletingDataset.id
    ) {
      setSelection(null)
    }
  }

  /** 重命名数据集成功：刷新目录，并同步选中项里的名称 */
  function handleDatasetUpdated(updated: GeoDataset) {
    refreshCatalog()
    setSelection((prev) =>
      prev !== null && prev.kind === 'dataset' && prev.dataSetId === updated.id
        ? { ...prev, dataSetName: updated.dataSetName }
        : prev,
    )
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

  /** 导入记录：每页条数变化时由 hook 回到第 1 页 */
  function handleFileOptPageChange(page: number, size: number) {
    setFileOptPageSize(size)
    fileOptPage.goToPage(page)
  }

  /**
   * 导入记录：点查询重新查询；条件与上次相同时也发一次请求（与主平台日志、发布页一致）。
   * 条件确实变化时两者在同一次渲染里生效，只发一次请求。
   */
  function handleFileOptSearch(filters: FileOptFilters) {
    setFileOptFilters(filters)
    fileOptPage.refresh()
  }

  /** 导入记录：重置筛选条件，回到无筛选的第 1 页 */
  function handleFileOptReset() {
    setFileOptFilters({})
  }

  /**
   * 搜索：按「数据格式」「文件名」重新查询；条件与上次相同时也发一次请求。
   * 条件确实变化时两者在同一次渲染里生效，只发一次请求。
   */
  function handleFileSearch(filters: FileMetaFilters) {
    setFileFilters(filters)
    refreshFiles()
  }

  /** 重置：清空筛选条件，回到无筛选的第 1 页 */
  function handleFileReset() {
    setFileFilters(NO_FILE_FILTERS)
  }

  // 导入记录的数据集下拉：显示数据集名称，取不到名称时退回 id
  const datasetFilterOptions = allDatasets.map((dataset) => ({
    value: dataset.id,
    label: dataset.dataSetName === '' ? dataset.id : dataset.dataSetName,
  }))

  // 侧边栏各栏目的计数：全部数据用列表带回的全量条数，另两个来自轻量计数请求
  const sectionCounts: Readonly<Record<string, number | null>> = {
    [WORKSPACE_PATH]: allTotal,
    [IMPORTS_PATH]: importRecordTotal,
    [RECYCLE_BIN_PATH]: recycleBinTotal,
  }
  return (
    <section className={styles.page}>
      <div className={styles.geoSideBar}>
        <div className={styles.geoSideBarTitle}>
          <DatasetSearch
            onSelect={handleSearchSelect}
            onReset={handleSearchReset}
            onCreate={() => setIsCreateOpen(true)}
          />
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
                onClick={() => {
                  setSelection(null)
                  // 栏目切换后搜索栏会重新挂载，这里一并清空筛选条件
                  setFileFilters(NO_FILE_FILTERS)
                }}
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
                {/* 各栏目的条数：切到分类/数据集后，全部数据仍显示全量值 */}
                {sectionCounts[item.path] !== undefined &&
                  sectionCounts[item.path] !== null && (
                    <span className={styles.geoSideBarDirectoryCount}>
                      {sectionCounts[item.path]}
                    </span>
                  )}
              </a>
            )
          })}
        </nav>
        <div className={styles.geoSideBarDivider} />
        <div className={styles.dataDirectory}>
          <div className={styles.dataDirectoryTitle}>
            <img
              src={DocumentFolderIcon}
              alt=""
              className={styles.dataDirectoryIcon}
            />
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: '700',
                fontStyle: 'Bold',
                fontSize: '13px',
                color: '#13293D',
                marginLeft: '4px',
              }}
            >
              数据目录
            </span>
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
                      {isCatalogLoading ? (
                        <li className={styles.dataDirectoryDataSetHint}>
                          正在加载数据集…
                        </li>
                      ) : entry === undefined ? (
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
                              <Dropdown
                                trigger={['contextMenu']}
                                menu={{
                                  items: DATASET_MENU_ITEMS,
                                  onClick: ({ key }) => {
                                    if (key === 'detail')
                                      setDetailDataset(dataset)
                                    else if (key === 'rename')
                                      setRenamingDataset(dataset)
                                    else setDeletingDataset(dataset)
                                  },
                                }}
                              >
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
                                      dataSetName: dataset.dataSetName,
                                    })
                                  }
                                  aria-pressed={isDataSetSelected}
                                >
                                  {dataset.dataSetName}
                                </button>
                              </Dropdown>
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
              <div>
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
              onSearch={handleFileSearch}
              onReset={handleFileReset}
              actions={[
                {
                  label: '恢复',
                  onClick: (record) => void handleRestoreFile(record),
                  pendingId: restoringId,
                },
                {
                  label: '彻底删除',
                  onClick: (record) => setPurgingFile(record),
                  pendingId: purgingId,
                  tone: 'danger',
                },
              ]}
            />
          </div>
        ) : isImports ? (
          <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
              <div>
                <h2>导入记录</h2>
                <p>{SECTION_DESCRIPTION[IMPORTS_PATH] ?? ''}</p>
              </div>
            </div>
            <FileOptRecordTable
              records={fileOptPage.records}
              isLoading={fileOptPage.isLoading}
              error={fileOptPage.error}
              current={fileOptPage.current}
              total={fileOptPage.total}
              pageSize={fileOptPageSize}
              onPageChange={handleFileOptPageChange}
              datasetOptions={datasetFilterOptions}
              onSearch={handleFileOptSearch}
              onReset={handleFileOptReset}
              onDetail={(record) => setDetailRecordNo(record.recordNo)}
            />
          </div>
        ) : (
          <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
              <div>
                <h2>GIS 数据管理</h2>
                <p className={styles.contentMetaLine}>
                  当前域：{scopeLabel} · {total} 条数据
                </p>
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
              onSearch={handleFileSearch}
              onReset={handleFileReset}
              actions={[
                {
                  label: '处理',
                  onClick: (record) => setProcessingFile(record),
                  pendingId: processingId,
                  // 目前开放在地形与影像数据上发起处理，其余分类按钮置灰
                  disabled: (record) =>
                    CATEGORY_PROCESSING_TYPES[Number(record.categoryId)] ===
                    undefined,
                },
                {
                  label: '下载',
                  onClick: (record) => void handleDownloadFile(record),
                  pendingId: downloadingId,
                },
                {
                  label: '删除',
                  onClick: (record) => void handleDeleteFile(record),
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
              ? {
                  id: selectedDataset.dataSetId,
                  name: selectedDataset.dataSetName,
                }
              : null
          }
          datasets={allDatasets}
          datasetsLoading={isCatalogLoading}
          onClose={() => setIsImportOpen(false)}
          onSubmit={handleImport}
        />
      )}
      {isProgressOpen && (
        <UploadProgressDialog
          tasks={tasks}
          onClearFinished={clearFinished}
          onClose={() => setIsProgressOpen(false)}
        />
      )}
      {detailDataset !== null && (
        <DatasetDetailDialog
          dataset={detailDataset}
          onClose={() => setDetailDataset(null)}
        />
      )}
      {renamingDataset !== null && (
        <DatasetEditDialog
          dataset={renamingDataset}
          onClose={() => setRenamingDataset(null)}
          onUpdated={handleDatasetUpdated}
        />
      )}
      {deletingDataset !== null && (
        <ConfirmDialog
          title="删除数据集"
          message={`确定删除数据集「${deletingDataset.dataSetName}」吗？该操作不可撤销。`}
          confirmLabel="删除"
          danger
          onConfirm={confirmDeleteDataset}
          onClose={() => setDeletingDataset(null)}
        />
      )}
      {purgingFile !== null && (
        <ConfirmDialog
          title="彻底删除"
          message={`确定彻底删除「${purgingFile.originalName}」吗？删除后无法恢复。`}
          confirmLabel="彻底删除"
          danger
          onConfirm={confirmPurgeFile}
          onClose={() => setPurgingFile(null)}
        />
      )}
      {processingFile !== null && (
        <ProcessingCreateDialog
          presetFile={processingFile}
          lockedProcessingType={
            CATEGORY_PROCESSING_TYPES[Number(processingFile.categoryId)]
          }
          onClose={() => setProcessingFile(null)}
          onSubmitManaged={handleManagedProcess}
        />
      )}
      {detailRecordNo !== null && (
        <FileOptDetailDialog
          recordNo={detailRecordNo}
          onClose={() => setDetailRecordNo(null)}
        />
      )}
    </section>
  )
}
