import { useEffect, useRef, useState } from 'react'
import { Form } from 'antd'
import { SubNav } from '@ocean-cloud/ui'
import styles from './DataProcessingPage.module.css'
import {
  DATA_PROCESSING_GROUPS,
  DATA_PROCESSING_SECTIONS,
} from '../../config/navigation'
import { ProcessingCreateDialog } from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import type {
  LocalSubmitInput,
  ManagedSubmitInput,
  WorkspaceSubmitInput,
} from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import { TaskDetailDialog } from '../../features/dataManagement/components/TaskDetailDialog/TaskDetailDialog'
import { TaskListTable } from '../../features/dataManagement/components/TaskListTable/TaskListTable'
import type { TaskRow } from '../../features/dataManagement/components/TaskListTable/TaskListTable'
import { UploadProgressDialog } from '../../features/dataManagement/components/UploadProgressDialog/UploadProgressDialog'
import {
  PROCESSING_TASK_KINDS,
  PROCESSING_TYPE_IMAGERY,
  PROCESSING_TYPE_TERRAIN,
  PROCESSING_TYPE_VECTOR,
  TASK_PAGE_SIZE,
} from '../../features/dataManagement/constants/task'
import { useTaskPage } from '../../features/dataManagement/hooks/useTaskPage'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'
import {
  createManagedProcessingTask,
  createProcessingTask,
  createWorkspaceProcessingTask,
} from '../../features/dataManagement/services/taskService'
import { publishFromTask } from '../../features/dataPublishing/services/publicationService'
import { createTileSetArchive } from '../../features/tileSetArchive/services/archiveService'
import type { TaskPublishTarget } from '../../features/dataManagement/types/task'

/** 页签与任务状态的对应关系；「全部任务」不传 taskStatus */
const STATUS_TABS = [
  { label: '全部任务', status: '' },
  { label: '处理中', status: 'RUNNING' },
  { label: '待发布', status: 'QUEUED' },
  { label: '已发布', status: 'COMPLETED' },
] as const

/** 左侧分类对应的 processingType；「全部任务」等未列出的路径表示不按类型筛选 */
const SECTION_PROCESSING_TYPES: Readonly<Record<string, string>> = {
  '/data-processing/terrain': PROCESSING_TYPE_TERRAIN,
  '/data-processing/imagery': PROCESSING_TYPE_IMAGERY,
  '/data-processing/vector': PROCESSING_TYPE_VECTOR,
}

interface DataProcessingPageProps {
  readonly activePath: string
}

export function DataProcessingPage({ activePath }: DataProcessingPageProps) {
  // 上层（原始数据处理任务）与下层（任务类型）互斥高亮：命中哪个就高亮哪个
  const group = DATA_PROCESSING_GROUPS.find((item) => item.path === activePath)
  const section = DATA_PROCESSING_SECTIONS.find(
    (item) => item.path === activePath,
  )
  const activeItem = group ?? section
  // 页签与筛选栏的「任务状态」共用一份状态
  const [searchForm] = Form.useForm()
  const [taskStatus, setTaskStatus] = useState('')
  const [pageSize, setPageSize] = useState(TASK_PAGE_SIZE)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  // 打开详情弹窗的任务 id；null 表示弹窗关闭
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  // 只展示三类处理任务的帧（导入任务的帧归数据管理页的「上传进度」）
  const { tasks, clearFinished } = useUploadTasks(PROCESSING_TASK_KINDS)
  const runningCount = tasks.filter((task) => !task.done).length
  // 下层分类即入口：影像 / 矢量 / 地形任务分别按 processingType 过滤；
  // 选中上层「原始数据处理任务」时不带处理类型，即展示全部任务
  const processingType =
    section === undefined ? undefined : SECTION_PROCESSING_TYPES[section.path]

  const { records, total, current, isLoading, error, goToPage, refresh } =
    useTaskPage({
      enabled: true,
      processingType,
      taskStatus: taskStatus === '' ? undefined : taskStatus,
      size: pageSize,
    })

  // 处理任务完成时自动刷新任务列表，让状态与耗时立即更新（按任务编号去重，只刷一次）
  const finishedTaskNos = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newlyFinished = tasks.filter(
      (task) => task.done && !finishedTaskNos.current.has(task.taskNo),
    )
    if (newlyFinished.length === 0) return
    for (const task of newlyFinished) finishedTaskNos.current.add(task.taskNo)
    refresh()
  }, [tasks, refresh])

  // 把 WS 的实时进度按任务编号并进列表行：只有进行中的任务会用它画进度条长度与阶段，
  // 帧一到就重渲染，因此表格里的条会跟着动；颜色与终态一律以 REST 状态为准。
  // 帧里的 taskId 与列表行的 taskNo 是同一个值，按 taskNo 对齐即可
  const liveByTaskNo = new Map(
    tasks.map((task) => [
      task.taskNo,
      { percent: task.percent, stageCode: task.stageCode },
    ]),
  )
  const rows: readonly TaskRow[] = records.map((record) => {
    const live = liveByTaskNo.get(record.taskNo)
    return {
      ...record,
      livePercent: live?.percent ?? null,
      liveStageCode: live?.stageCode ?? '',
    }
  })

  // 详情弹窗要展示的实时进度：按 id 从当前 rows 里查即可，帧一到 rows 重算、弹窗随之刷新，
  // 不额外存一份 state（列表可能翻页/刷新，行不在本页时退回 null，弹窗自行用快照兜底）
  const detailRow =
    detailTaskId === null
      ? undefined
      : rows.find((row) => row.id === detailTaskId)

  function handleTabClick(status: string) {
    setTaskStatus(status)
    // 同步筛选栏里的状态下拉，避免两处显示不一致
    searchForm.setFieldValue('taskStatus', status === '' ? undefined : status)
    refresh()
  }

  function handleValuesChange(values: Record<string, unknown>) {
    const status = values.taskStatus
    setTaskStatus(typeof status === 'string' ? status : '')
  }

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handlePageChange(page: number, size: number) {
    setPageSize(size)
    goToPage(page)
  }

  function handleReset() {
    setTaskStatus('')
    refresh()
  }

  /** 发布已完成的任务；列表行与详情弹窗共用统一发布接口。 */
  async function handlePublish(target: TaskPublishTarget) {
    if (!window.confirm(`确定发布任务「${target.taskName}」吗？`)) return
    const type = target.processingType
    if (type !== PROCESSING_TYPE_IMAGERY && type !== PROCESSING_TYPE_TERRAIN)
      return
    setPublishingId(target.id)
    try {
      await publishFromTask(type, target.id)
      refresh()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    }
    setPublishingId(null)
  }

  /**
   * 归档已完成的任务：把它的瓦片集打成静态成果包，去「数据处理成果导出」页看进度。
   * 归档是后台任务，提交成功后刷新列表；失败提示由 RequestErrorNotice 统一展示。
   */
  async function handleArchive(target: TaskPublishTarget) {
    if (!window.confirm(`确定归档任务「${target.taskName}」吗？`)) return
    setArchivingId(target.id)
    try {
      await createTileSetArchive(target.id)
      refresh()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    }
    setArchivingId(null)
  }

  /**
   * 新建处理任务（本地上传）：提交后立即关窗，建任务与文件上传在后台进行。
   * 成功后刷新任务列表；失败提示由 RequestErrorNotice 统一展示。
   */
  async function handleCreateProcessing(input: LocalSubmitInput) {
    setIsCreateOpen(false)
    try {
      await createProcessingTask(input)
    } catch {
      return
    }
    refresh()
  }

  /**
   * 新建处理任务（数据管理数据）：提交已勾选文件的切片任务，同样关窗后在后台进行。
   */
  async function handleCreateManaged(input: ManagedSubmitInput) {
    setIsCreateOpen(false)
    try {
      await createManagedProcessingTask(input)
    } catch {
      return
    }
    refresh()
  }

  /**
   * 新建处理任务（服务器文件）：按工作区内的相对路径提交，同样关窗后在后台进行。
   */
  async function handleCreateWorkspace(input: WorkspaceSubmitInput) {
    setIsCreateOpen(false)
    try {
      await createWorkspaceProcessingTask(input)
    } catch {
      return
    }
    refresh()
  }

  return (
    <section className={styles.page}>
      <SubNav
        items={DATA_PROCESSING_SECTIONS}
        activePath={section === undefined ? '' : section.path}
        topItems={DATA_PROCESSING_GROUPS}
        topActivePath={group === undefined ? '' : group.path}
        title="数据处理"
        sectionTitle="任务类型"
      />
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div>
            <h2>GIS数据处理</h2>
            <p>
              {activeItem?.pending === true
                ? `${activeItem.label}接口待接入，暂展示全部任务`
                : '对影像、矢量、地形、倾斜模型和电子海图进行转换、切片与服务化处理'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.progressButton}
              onClick={() => setIsProgressOpen(true)}
            >
              处理进度{runningCount > 0 ? ` (${runningCount})` : ''}
            </button>
            <button
              type="button"
              className={styles.createButton}
              onClick={() => setIsCreateOpen(true)}
            >
              新建处理任务
            </button>
          </div>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="任务状态">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.status === taskStatus
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`}
                onClick={() => handleTabClick(tab.status)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <TaskListTable
          records={rows}
          isLoading={isLoading}
          error={error}
          current={current}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          searchForm={searchForm}
          onValuesChange={handleValuesChange}
          onSearch={() => refresh()}
          onReset={handleReset}
          onView={(record) => setDetailTaskId(record.id)}
          onPublish={handlePublish}
          publishingId={publishingId}
          onArchive={handleArchive}
          archivingId={archivingId}
        />
      </div>
      {isCreateOpen && (
        <ProcessingCreateDialog
          onClose={() => setIsCreateOpen(false)}
          onSubmitLocal={handleCreateProcessing}
          onSubmitManaged={handleCreateManaged}
          onSubmitWorkspace={handleCreateWorkspace}
        />
      )}
      {isProgressOpen && (
        <UploadProgressDialog
          tasks={tasks}
          title="处理进度"
          emptyText="暂无处理任务。"
          taskLabel="处理任务"
          onClearFinished={clearFinished}
          onClose={() => setIsProgressOpen(false)}
        />
      )}
      {detailTaskId !== null && (
        <TaskDetailDialog
          taskId={detailTaskId}
          livePercent={detailRow?.livePercent ?? null}
          liveStageCode={detailRow?.liveStageCode ?? ''}
          onPublish={handlePublish}
          publishing={detailRow !== undefined && publishingId === detailRow.id}
          onClose={() => setDetailTaskId(null)}
        />
      )}
    </section>
  )
}
