import { useState } from 'react'
import { Form } from 'antd'
import { SubNav } from '@ocean-cloud/ui'
import styles from './DataProcessingPage.module.css'
import { DATA_PROCESSING_SECTIONS } from '../../config/navigation'
import { TaskListTable } from '../../features/dataManagement/components/TaskListTable/TaskListTable'
import {
  TASK_PAGE_SIZE,
  TASK_TYPE_PROCESS,
} from '../../features/dataManagement/constants/task'
import { useTaskPage } from '../../features/dataManagement/hooks/useTaskPage'

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
          <button type="button" className={styles.createButton}>
            新建处理任务
          </button>
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
        />
      </div>
    </section>
  )
}
