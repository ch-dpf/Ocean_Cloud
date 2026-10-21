import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@ocean-cloud/ui'
import styles from './DataManagementPage.module.css'
import { DATA_MANAGEMENT_SECTIONS } from '../../config/navigation'
import { DatasetCreateDialog } from '../../features/dataManagement/components/DatasetCreateDialog/DatasetCreateDialog'
import { DatasetDetailDialog } from '../../features/dataManagement/components/DatasetDetailDialog/DatasetDetailDialog'
import { DatasetEditDialog } from '../../features/dataManagement/components/DatasetEditDialog/DatasetEditDialog'
import { DatasetWall } from '../../features/dataManagement/components/DatasetWall/DatasetWall'
import type { DatasetView } from '../../features/dataManagement/components/DatasetWall/DatasetWall'
import { FileImportDialog } from '../../features/dataManagement/components/FileImportDialog/FileImportDialog'
import { FileMetaTable } from '../../features/dataManagement/components/FileMetaTable/FileMetaTable'
import { ProcessingCreateDialog } from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import type { ManagedSubmitInput } from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import { TransferDetailDialog } from '../../features/dataManagement/components/TransferDetailDialog/TransferDetailDialog'
import { TransferRecordTable } from '../../features/dataManagement/components/TransferRecordTable/TransferRecordTable'
import { UploadProgressDialog } from '../../features/dataManagement/components/UploadProgressDialog/UploadProgressDialog'
import DocumentFolderIcon from '../../assets/icons/DocumentFolder.svg'
import {
  DATASET_CARD_PAGE_SIZE,
  DATASET_CATEGORY_IDS,
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  DATASET_PAGE_SIZE,
  FILE_PAGE_SIZE,
  TRANSFER_PAGE_SIZE,
} from '../../features/dataManagement/constants/dataset'
import {
  CATEGORY_PROCESSING_TYPES,
  UPLOAD_TASK_KINDS,
} from '../../features/dataManagement/constants/task'
import { useDatasetCatalog } from '../../features/dataManagement/hooks/useDatasetCatalog'
import { useDatasetPage } from '../../features/dataManagement/hooks/useDatasetPage'
import { useFileMetaPage } from '../../features/dataManagement/hooks/useFileMetaPage'
import { useSidebarCounts } from '../../features/dataManagement/hooks/useSidebarCounts'
import { useTransferPage } from '../../features/dataManagement/hooks/useTransferPage'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'
import {
  buildFileDownloadUrl,
  deleteFileMeta,
  getFileMetaDetail,
  retryFileMetadata,
  purgeDeletedFileMeta,
  restoreDeletedFileMeta,
} from '../../features/dataManagement/services/fileMetaService'
import { uploadGisFiles } from '../../features/dataManagement/services/gisUpload'
import { deleteDataset } from '../../features/dataManagement/services/datasetService'
import { createManagedProcessingTask } from '../../features/dataManagement/services/taskService'
import type { GeoDataset } from '../../features/dataManagement/types/dataset'
import type { TransferFilters } from '../../features/dataManagement/types/fileTransfer'
import type {
  FileMeta,
  FileMetaFilters,
  FileScope,
} from '../../features/dataManagement/types/fileMeta'

const VectorCartography = lazy(() =>
  import('../../features/dataManagement/components/VectorCartography/VectorCartography').then(
    (module) => ({ default: module.VectorCartography }),
  ),
)

interface DataManagementPageProps {
  readonly activePath: string
}

/** 数据工作区（全部数据）的路径 */
const WORKSPACE_PATH = DATA_MANAGEMENT_SECTIONS[0].path

/** 空筛选条件：引用稳定，避免每次渲染都触发查询条件比对 */
const NO_FILE_FILTERS: FileMetaFilters = {}

/** 传输记录的路径 */
const TRANSFERS_PATH = '/data-management/transfers'

/** 回收站的路径 */
const RECYCLE_BIN_PATH = '/data-management/recycle-bin'

/**
 * 切回「全部数据」栏目的哈希跳转。写在组件外：在组件内直接改写 location
 * 会被 react-compiler 的 immutability 规则拦下（修改组件外部定义的值）
 */
function goToWorkspace() {
  location.hash = `#${WORKSPACE_PATH}`
}

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

export function DataManagementPage({ activePath }: DataManagementPageProps) {
  const active =
    DATA_MANAGEMENT_SECTIONS.find((item) => item.path === activePath) ??
    DATA_MANAGEMENT_SECTIONS[0]
  const [selection, setSelection] = useState<DatasetSelection | null>(null)
  const [vectorView, setVectorView] = useState<'map' | 'files'>('map')
  // 数据集卡片墙：搜索框原值、去抖后真正发给接口的关键字与展示方式（卡片 / 列表）；
  // 当前页由 useDatasetPage 持有，筛选条件或每页条数变化时它自己回到第 1 页
  const [datasetKeyword, setDatasetKeyword] = useState('')
  const [datasetKeywordQuery, setDatasetKeywordQuery] = useState('')
  const [datasetView, setDatasetView] = useState<DatasetView>('card')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  // 数据集卡片「处理」打开的处理任务弹窗：按分类锁定处理类型，文件在弹窗里选
  const [processingDatasetType, setProcessingDatasetType] = useState<
    string | null
  >(null)
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
  const [retryingMetadataId, setRetryingMetadataId] = useState<string | null>(
    null,
  )
  const [metadataRetryIds, setMetadataRetryIds] = useState<readonly string[]>(
    [],
  )
  // 文件列表的筛选条件（数据格式、文件名），由表格的搜索栏回传
  const [fileFilters, setFileFilters] =
    useState<FileMetaFilters>(NO_FILE_FILTERS)
  // 两类列表的每页条数，改动后由 hook 回到第 1 页
  const [filePageSize, setFilePageSize] = useState(FILE_PAGE_SIZE)
  const [transferPageSize, setTransferPageSize] = useState(TRANSFER_PAGE_SIZE)
  // 传输记录的筛选条件（记录编号、传输类型、数据集、创建时间）
  const [transferFilters, setTransferFilters] = useState<TransferFilters>({})
  // 打开详情弹窗的记录编号
  const [detailRecordNo, setDetailRecordNo] = useState<string | null>(null)

  const isWorkspace = active.path === WORKSPACE_PATH
  const isTransfers = active.path === TRANSFERS_PATH
  const isRecycleBin = active.path === RECYCLE_BIN_PATH
  // 数据目录的选择只在「全部数据」页面生效：切到传输记录、回收站后视为未选择
  const activeSelection = isWorkspace ? selection : null
  const {
    datasets: allDatasets,
    catalog,
    isLoading: isCatalogLoading,
    refresh: refreshCatalog,
  } = useDatasetCatalog()

  // 导入弹窗的初始上下文：全部数据为空、分类为分类名、数据集为数据集名
  const selectedDataset =
    activeSelection !== null && activeSelection.kind === 'dataset'
      ? activeSelection
      : null
  // 分类筛选与侧边栏的分类选择、工具栏的「全部类型」共用同一份状态
  const wallCategoryId =
    activeSelection !== null && activeSelection.kind === 'category'
      ? activeSelection.categoryId
      : null
  // 卡片墙的数据集按服务端分页拉取（顺带带回各数据集的轮廓，供卡片预览画范围）；
  // 已经进到某个数据集内部时主区不是卡片墙，停掉这次查询
  const wallPage = useDatasetPage(
    {
      categoryId: wallCategoryId ?? undefined,
      dataSetName: datasetKeywordQuery,
    },
    datasetView === 'card' ? DATASET_CARD_PAGE_SIZE : DATASET_PAGE_SIZE,
    isWorkspace && selectedDataset === null,
  )

  // 搜索框逐字输入会把请求打得太碎，停顿 300ms 后再把关键字交给查询
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDatasetKeywordQuery(datasetKeyword.trim()),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [datasetKeyword])

  function resolveFileScope(): FileScope | null {
    // 回收站展示的是已删除的元数据，与数据工作区的范围互不干扰
    if (isRecycleBin) return { kind: 'recycleBin' }
    if (!isWorkspace) return null
    if (activeSelection === null) return { kind: 'all' }
    if (activeSelection.kind === 'category')
      return { kind: 'category', categoryId: activeSelection.categoryId }
    if (activeSelection.categoryId === DATASET_CATEGORY_IDS.vector && vectorView === 'map')
      return null
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
  } = useFileMetaPage(resolveFileScope(), fileFilters, filePageSize)
  // 第三个参数是「当前是否停在传输记录栏目」：切到该栏目时变化，从而重新查询一次
  const transferPage = useTransferPage(
    transferFilters,
    transferPageSize,
    isTransfers,
  )
  const { refresh: refreshTransfer } = transferPage
  const {
    workspaceTotal,
    recycleBinTotal,
    transferTotal,
    refresh: refreshSidebarCounts,
  } = useSidebarCounts()
  // 只展示导入任务的帧，处理任务的帧归数据处理页的「处理进度」
  const {
    tasks,
    clearFinished,
    addPendingTask,
    updateChunkProgress,
    failTask,
  } = useUploadTasks(UPLOAD_TASK_KINDS)
  const runningCount = tasks.filter((task) => !task.done).length
  // 有任务完成时刷新列表，让新上传的文件显示出来
  const finishedTaskNos = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newlyFinished = tasks.filter(
      (task) =>
        task.done &&
        !finishedTaskNos.current.has(
          [
            task.taskNo,
            task.status,
            task.completedCount,
            task.failedCount,
          ].join(':'),
        ),
    )
    if (newlyFinished.length === 0) return
    for (const task of newlyFinished)
      finishedTaskNos.current.add(
        [task.taskNo, task.status, task.completedCount, task.failedCount].join(
          ':',
        ),
      )
    refreshFiles()
    // 导入完成后「传输记录」列表与侧边栏计数都变了
    refreshSidebarCounts()
    refreshTransfer()
    refreshCatalog()
  }, [
    tasks,
    refreshFiles,
    refreshSidebarCounts,
    refreshTransfer,
    refreshCatalog,
  ])

  // 活动导入和重新提取期间持续刷新，单个文件就绪即可进入可用列表。
  const watchingMetadata =
    fileFilters.metadataStatus === 'QUEUED' ||
    fileFilters.metadataStatus === 'RUNNING'
  useEffect(() => {
    if (
      runningCount === 0 &&
      metadataRetryIds.length === 0 &&
      !watchingMetadata
    )
      return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      const results = await Promise.allSettled(
        metadataRetryIds.map((id) => getFileMetaDetail(id, controller.signal)),
      )
      if (controller.signal.aborted) return
      const finished = results.flatMap((result) =>
        result.status === 'fulfilled' &&
        result.value.metadataStatus !== 'QUEUED' &&
        result.value.metadataStatus !== 'RUNNING'
          ? [result.value.id]
          : [],
      )
      if (finished.length > 0) {
        setMetadataRetryIds((previous) =>
          previous.filter((id) => !finished.includes(id)),
        )
        refreshCatalog()
      }
      refreshFiles()
      refreshSidebarCounts()
      refreshTransfer()
      timer = setTimeout(() => void poll(), 2500)
    }
    timer = setTimeout(() => void poll(), 2500)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [
    runningCount,
    metadataRetryIds,
    watchingMetadata,
    refreshFiles,
    refreshSidebarCounts,
    refreshTransfer,
    refreshCatalog,
  ])

  async function handleRetryMetadata(record: FileMeta) {
    setRetryingMetadataId(record.id)
    try {
      await retryFileMetadata(record.id)
      setMetadataRetryIds((previous) =>
        previous.includes(record.id) ? previous : [...previous, record.id],
      )
      refreshFiles()
      refreshSidebarCounts()
    } finally {
      setRetryingMetadataId(null)
    }
  }

  // 导入弹窗的初始上下文：全部数据为空、分类为分类名、数据集为数据集名
  const importKeyword =
    activeSelection === null
      ? ''
      : activeSelection.kind === 'category'
        ? DATASET_CATEGORY_LABELS[activeSelection.categoryId]
        : activeSelection.dataSetName
  /** 选中数据目录项：同时回到「全部数据」页面，保证内容区展示对应数据 */
  function handleSelectEntry(next: DatasetSelection) {
    setSelection(next)
    if (!isWorkspace) goToWorkspace()
  }

  // 新增成功后切到所属分类并回到第 1 页，并刷新侧边栏目录
  function handleCreated(categoryId: number) {
    wallPage.goToPage(1)
    handleSelectEntry({ kind: 'category', categoryId })
    refreshCatalog()
  }

  /** 卡片「查看数据」：进入该数据集内部（不在「全部数据」栏目时一并切回） */
  function handleViewDataset(dataset: GeoDataset) {
    wallPage.goToPage(1)
    setVectorView('map')
    handleSelectEntry({
      kind: 'dataset',
      categoryId: Number(dataset.categoryId),
      dataSetId: dataset.id,
      dataSetName: dataset.dataSetName,
    })
  }

  /** 文件列表返回：退回该数据集所属分类的卡片墙 */
  function handleBackToDatasets() {
    if (activeSelection === null) return
    setSelection({ kind: 'category', categoryId: activeSelection.categoryId })
  }

  /** 卡片「处理」：按分类锁定处理类型打开处理任务弹窗，数据在弹窗里选 */
  function handleProcessDataset(dataset: GeoDataset) {
    const type = CATEGORY_PROCESSING_TYPES[Number(dataset.categoryId)]
    if (type === undefined) return
    setProcessingDatasetType(type)
  }

  /** 卡片「···」菜单：与原数据集右键菜单一致（详情 / 重命名 / 删除） */
  function handleDatasetMenu(key: string, dataset: GeoDataset) {
    if (key === 'detail') setDetailDataset(dataset)
    else if (key === 'rename') setRenamingDataset(dataset)
    else setDeletingDataset(dataset)
  }

  /** 分类未映射到处理类型（倾斜模型、电子海图）的数据集不能发起处理 */
  function canProcessDataset(dataset: GeoDataset): boolean {
    return CATEGORY_PROCESSING_TYPES[Number(dataset.categoryId)] !== undefined
  }

  /** 工具栏搜索：只改输入框原值，去抖后再落到查询上（页码由查询条件变化自动回到第 1 页） */
  function handleDatasetKeywordChange(value: string) {
    setDatasetKeyword(value)
  }

  /** 工具栏「全部类型」：与侧边栏的分类选择共用同一个 selection */
  function handleDatasetCategoryChange(categoryId: number | null) {
    wallPage.goToPage(1)
    if (categoryId === null) setSelection(null)
    else handleSelectEntry({ kind: 'category', categoryId })
  }

  /** 工具栏刷新：回到第 1 页重新拉取卡片墙，同时刷新侧边栏目录的计数 */
  function handleDatasetRefresh() {
    wallPage.goToPage(1)
    wallPage.refresh()
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
        onChunkResult(result) {
          updateChunkProgress(result, input.files.length)
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

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handleFilePageChange(page: number, size: number) {
    setFilePageSize(size)
    goToPage(page)
  }

  /** 传输记录：每页条数变化时由 hook 回到第 1 页 */
  function handleTransferPageChange(page: number, size: number) {
    setTransferPageSize(size)
    transferPage.goToPage(page)
  }

  /**
   * 传输记录：点查询重新查询；条件与上次相同时也发一次请求（与主平台日志、发布页一致）。
   * 条件确实变化时两者在同一次渲染里生效，只发一次请求。
   */
  function handleTransferSearch(filters: TransferFilters) {
    setTransferFilters(filters)
    transferPage.refresh()
  }

  /** 传输记录：重置筛选条件，回到无筛选的第 1 页 */
  function handleTransferReset() {
    setTransferFilters({})
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

  // 传输记录的数据集下拉：显示数据集名称，取不到名称时退回 id
  const datasetFilterOptions = allDatasets.map((dataset) => ({
    value: dataset.id,
    label: dataset.dataSetName === '' ? dataset.id : dataset.dataSetName,
  }))

  // 侧边栏各栏目的计数：三个都来自轻量计数请求，与当前停在哪个栏目无关
  const sectionCounts: Readonly<Record<string, number | null>> = {
    [WORKSPACE_PATH]: workspaceTotal,
    [TRANSFERS_PATH]: transferTotal,
    [RECYCLE_BIN_PATH]: recycleBinTotal,
  }
  return (
    <section className={styles.page}>
      <div className={styles.geoSideBar}>
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
                      className={styles.dataDirectoryItemLabel}
                      onClick={() => {
                        // 分类只做筛选：回到第 1 页，让卡片墙只展示该分类的数据集
                        wallPage.goToPage(1)
                        handleSelectEntry({ kind: 'category', categoryId })
                      }}
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
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className={styles.geoContent}>
        {isRecycleBin ? (
          <div className={styles.contentPanel}>
            <FileMetaTable
              recycleBin
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
        ) : isTransfers ? (
          <div className={styles.contentPanel}>
            <TransferRecordTable
              records={transferPage.records}
              isLoading={transferPage.isLoading}
              error={transferPage.error}
              current={transferPage.current}
              total={transferPage.total}
              pageSize={transferPageSize}
              onPageChange={handleTransferPageChange}
              datasetOptions={datasetFilterOptions}
              onSearch={handleTransferSearch}
              onReset={handleTransferReset}
              onDetail={(record) => setDetailRecordNo(record.recordNo)}
            />
          </div>
        ) : selectedDataset === null ? (
          // 未进入具体数据集：展示数据集卡片墙（分类筛选与侧边栏共用同一份状态）
          <div className={styles.contentPanel}>
            <DatasetWall
              datasets={wallPage.records}
              total={wallPage.total}
              isLoading={wallPage.isLoading}
              error={wallPage.error}
              keyword={datasetKeyword}
              categoryId={wallCategoryId}
              view={datasetView}
              current={wallPage.current}
              onKeywordChange={handleDatasetKeywordChange}
              onCategoryChange={handleDatasetCategoryChange}
              onViewChange={setDatasetView}
              onRefresh={handleDatasetRefresh}
              onPageChange={wallPage.goToPage}
              onCreateDataset={() => setIsCreateOpen(true)}
              onAddData={() => setIsImportOpen(true)}
              onViewData={handleViewDataset}
              onProcess={handleProcessDataset}
              onMenuAction={handleDatasetMenu}
              canProcess={canProcessDataset}
            />
          </div>
        ) : (
          <div className={styles.contentPanel}>
            {/* 矢量数据集默认进入制图；其他数据集继续显示原有文件列表。 */}
            <div className={styles.datasetFileHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackToDatasets}
              >
                ← 返回数据集
              </button>
              <span className={styles.datasetFileTitle}>
                {selectedDataset.dataSetName}
              </span>
            </div>
            {selectedDataset.categoryId === DATASET_CATEGORY_IDS.vector && (
              <div className={styles.vectorActions}>
                <button
                  type="button"
                  className={vectorView === 'map' ? styles.vectorTabActive : styles.vectorTab}
                  onClick={() => setVectorView('map')}
                >
                  制图工作区
                </button>
                <button
                  type="button"
                  className={vectorView === 'files' ? styles.vectorTabActive : styles.vectorTab}
                  onClick={() => setVectorView('files')}
                >
                  源文件管理
                </button>
                {vectorView === 'map' && (
                  <div className={styles.vectorToolbarActions}>
                    <button
                      type="button"
                      className={styles.progressButton}
                      onClick={() => setIsProgressOpen(true)}
                    >
                      导入进度{runningCount > 0 ? ` (${runningCount})` : ''}
                    </button>
                    <button
                      type="button"
                      className={styles.importButton}
                      onClick={() => setIsImportOpen(true)}
                    >
                      导入GIS数据
                    </button>
                  </div>
                )}
              </div>
            )}
            {selectedDataset.categoryId === DATASET_CATEGORY_IDS.vector && vectorView === 'map' ? (
              <Suspense fallback={<div>制图工作区加载中…</div>}>
                <VectorCartography
                  key={selectedDataset.dataSetId}
                  dataSetId={selectedDataset.dataSetId}
                />
              </Suspense>
            ) : (
            <FileMetaTable
              extraActions={
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.progressButton}
                    onClick={() => setIsProgressOpen(true)}
                  >
                    导入进度{runningCount > 0 ? ` (${runningCount})` : ''}
                  </button>
                  <button
                    type="button"
                    className={styles.importButton}
                    onClick={() => setIsImportOpen(true)}
                  >
                    导入GIS数据
                  </button>
                </div>
              }
              records={records}
              isLoading={isLoading}
              error={error}
              current={current}
              total={total}
              pageSize={filePageSize}
              onPageChange={handleFilePageChange}
              onSearch={handleFileSearch}
              onReset={handleFileReset}
              onRetryMetadata={handleRetryMetadata}
              retryingMetadataId={retryingMetadataId}
              actions={[
                {
                  label: '处理',
                  onClick: (record) => setProcessingFile(record),
                  pendingId: processingId,
                  // 目前开放在地形与影像数据上发起处理，其余分类按钮置灰
                  disabled: (record) =>
                    record.metadataStatus !== 'COMPLETED' ||
                    CATEGORY_PROCESSING_TYPES[Number(record.categoryId)] ===
                      undefined,
                },
                {
                  // 下载走 <a> 原生导航：整份文件流式落盘，不进内存、不经过 axios。
                  // 代价是带不上 Authorization 头，也没有「下载中…」状态与失败提示
                  label: '下载',
                  link: (record) => ({
                    href: buildFileDownloadUrl(record.id),
                    download: record.originalName,
                  }),
                },
                {
                  label: '删除',
                  onClick: (record) => void handleDeleteFile(record),
                  pendingId: deletingId,
                  disabled: (record) =>
                    record.metadataStatus === 'QUEUED' ||
                    record.metadataStatus === 'RUNNING',
                  tone: 'danger',
                },
              ]}
            />
            )}
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
          title="导入进度"
          emptyText="暂无导入任务。"
          taskLabel="GIS数据导入"
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
      {processingDatasetType !== null && (
        <ProcessingCreateDialog
          lockedProcessingType={processingDatasetType}
          onClose={() => setProcessingDatasetType(null)}
          onSubmitManaged={handleManagedProcess}
        />
      )}
      {detailRecordNo !== null && (
        <TransferDetailDialog
          recordNo={detailRecordNo}
          onClose={() => setDetailRecordNo(null)}
        />
      )}
    </section>
  )
}
