import { useState } from 'react'
import { Form } from 'antd'
import { SubNav } from '@ocean-cloud/ui'
import styles from './DataProcessingPage.module.css'
import { DATA_PROCESSING_SECTIONS } from '../../config/navigation'
import { ProcessingCreateDialog } from '../../features/dataManagement/components/ProcessingCreateDialog/ProcessingCreateDialog'
import { TaskListTable } from '../../features/dataManagement/components/TaskListTable/TaskListTable'
import { UploadProgressDialog } from '../../features/dataManagement/components/UploadProgressDialog/UploadProgressDialog'
import {
  PROCESSING_TASK_KINDS,
  TASK_PAGE_SIZE,
  TASK_TYPE_PROCESS,
} from '../../features/dataManagement/constants/task'
import { useTaskPage } from '../../features/dataManagement/hooks/useTaskPage'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'
import { createProcessingTask } from '../../features/dataManagement/services/taskService'
import { publishTerrainFromTask } from '../../features/dataPublishing/services/publicationService'
import type {
  ProcessingParameters,
  TaskRecord,
} from '../../features/dataManagement/types/task'

/** 页签与任务状态的对应关系；「全部任务」不传 taskStatus */
const STATUS_TABS = [
  { label: '全部任务', status: '' },
  { label: '处理中', status: 'RUNNING' },
  { label: '待发布', status: 'QUEUED' },
  { label: '已发布', status: 'COMPLETED' },
] as const

interface DataProcessingPageProps {
  readonly activePath: string
}

export function DataProcessingPage({ activePath }: DataProcessingPageProps) {
  const section =
    DATA_PROCESSING_SECTIONS.find((item) => item.path === activePath) ??
    DATA_PROCESSING_SECTIONS[0]
  // 页签与筛选栏的「任务状态」共用一份状态
  const [searchForm] = Form.useForm()
  const [taskStatus, setTaskStatus] = useState('')
  const [pageSize, setPageSize] = useState(TASK_PAGE_SIZE)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)

  // 只展示三类处理任务的帧（导入任务的帧归数据管理页的「上传进度」）
  const { tasks, clearFinished } = useUploadTasks(PROCESSING_TASK_KINDS)
  const runningCount = tasks.filter((task) => !task.done).length

  const { records, total, current, isLoading, error, goToPage, refresh } =
    useTaskPage({
      enabled: true,
      taskType: TASK_TYPE_PROCESS,
      taskStatus: taskStatus === '' ? undefined : taskStatus,
      size: pageSize,
    })

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

  /** 发布已完成的任务：确认后调用发布接口，成功后刷新列表 */
  async function handlePublish(record: TaskRecord) {
    if (!window.confirm(`确定发布任务「${record.taskName}」吗？`)) return
    setPublishingId(record.id)
    try {
      await publishTerrainFromTask(record.id)
      refresh()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    }
    setPublishingId(null)
  }

  /**
   * 新建处理任务：提交后立即关窗，建任务与文件上传在后台进行。
   * 成功后刷新任务列表；失败提示由 RequestErrorNotice 统一展示。
   */
  async function handleCreateProcessing(input: {
    readonly processingType: string
    readonly taskName: string
    readonly parameters: ProcessingParameters
    readonly files: readonly File[]
  }) {
    setIsCreateOpen(false)
    try {
      await createProcessingTask(input)
    } catch {
      return
    }
    refresh()
  }

  return (
    <section className={styles.page}>
      <SubNav
        items={DATA_PROCESSING_SECTIONS}
        activePath={section.path}
        title={section.label}
        subtitle="按处理类型筛选"
      />
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.contentTitle}>
            <h2>GIS数据处理</h2>
            <p>
              {section.pending === true
                ? `${section.label}接口待接入，暂展示全部任务`
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
          records={records}
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
          onPublish={handlePublish}
          publishingId={publishingId}
        />
      </div>
      {isCreateOpen && (
        <ProcessingCreateDialog
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateProcessing}
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
    </section>
  )
}
