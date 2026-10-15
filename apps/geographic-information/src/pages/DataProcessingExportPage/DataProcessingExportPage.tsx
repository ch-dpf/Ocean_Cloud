import { useEffect, useRef, useState } from 'react'
import { SubNav } from '@ocean-cloud/ui'
import styles from './DataProcessingExportPage.module.css'
import {
  DATA_PROCESSING_GROUPS,
  DATA_PROCESSING_SECTIONS,
} from '../../config/navigation'
import { ArchiveDetailDialog } from '../../features/tileSetArchive/components/ArchiveDetailDialog/ArchiveDetailDialog'
import { ArchiveTable } from '../../features/tileSetArchive/components/ArchiveTable/ArchiveTable'
import type { ArchiveRow } from '../../features/tileSetArchive/components/ArchiveTable/ArchiveTable'
import {
  ARCHIVE_PAGE_SIZE,
  ARCHIVE_TASK_KINDS,
} from '../../features/tileSetArchive/constants/archive'
import { useArchivePage } from '../../features/tileSetArchive/hooks/useArchivePage'
import { retryArchive } from '../../features/tileSetArchive/services/archiveService'
import type { TileSetArchive } from '../../features/tileSetArchive/types/archive'
import { useUploadTasks } from '../../features/dataManagement/hooks/useUploadTasks'

interface DataProcessingExportPageProps {
  readonly activePath: string
}

/**
 * 数据处理成果导出：归档后的静态瓦片集成果包列表。
 * 侧边栏与数据处理页共用同一套两层导航，这里只高亮上层「数据处理成果导出」，
 * 下层任务类型不参与筛选（归档列表的接口没有类型筛选参数）。
 */
export function DataProcessingExportPage({
  activePath,
}: DataProcessingExportPageProps) {
  const [pageSize, setPageSize] = useState(ARCHIVE_PAGE_SIZE)
  const [retryingNo, setRetryingNo] = useState<string | null>(null)
  // 打开详情弹窗的归档编号；null 表示弹窗关闭
  const [detailArchiveNo, setDetailArchiveNo] = useState<string | null>(null)

  const { records, total, current, isLoading, error, goToPage, refresh } =
    useArchivePage(pageSize)
  // 只取归档任务的帧：帧里的 taskId 就是归档编号，与列表行的 archiveNo 对齐
  const { tasks } = useUploadTasks(ARCHIVE_TASK_KINDS)

  // 把 WS 的实时进度按归档编号并进列表行：只有进行中的归档会用到，
  // 帧一到就重渲染，因此条会跟着动；颜色与终态一律以 REST 的 archiveStatus 为准
  const liveByArchiveNo = new Map(
    tasks.map((task) => [
      task.taskNo,
      { percent: task.percent, stageText: task.statusText },
    ]),
  )
  const rows: readonly ArchiveRow[] = records.map((record) => {
    const live = liveByArchiveNo.get(record.archiveNo)
    return {
      ...record,
      livePercent: live?.percent ?? null,
      liveStageText: live?.stageText ?? '',
    }
  })

  // 归档结束时刷新列表：让状态、大小、文件数等 REST 字段跟上，而不是停在「打包中」
  const finishedArchiveNos = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newlyFinished = tasks.filter(
      (task) => task.done && !finishedArchiveNos.current.has(task.taskNo),
    )
    if (newlyFinished.length === 0) return
    for (const task of newlyFinished)
      finishedArchiveNos.current.add(task.taskNo)
    refresh()
  }, [tasks, refresh])

  /** 每页条数变化时回到第 1 页 */
  function handlePageChange(page: number, size: number) {
    setPageSize(size)
    goToPage(page)
  }

  /** 重试失败的归档：成功后刷新列表；失败提示由 RequestErrorNotice 统一展示 */
  async function handleRetry(record: TileSetArchive) {
    setRetryingNo(record.archiveNo)
    try {
      await retryArchive(record.archiveNo)
      refresh()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示
    } finally {
      setRetryingNo(null)
    }
  }

  return (
    <section className={styles.page}>
      <SubNav
        items={DATA_PROCESSING_SECTIONS}
        // 下层任务类型不筛选归档列表，因此不高亮任何一项
        activePath=""
        topItems={DATA_PROCESSING_GROUPS}
        topActivePath={activePath}
        title="数据处理"
        sectionTitle="任务类型"
      />
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div>
            <h2>数据处理成果导出</h2>
            <p>归档后的静态瓦片集成果包，可下载与重试。</p>
          </div>
        </div>
        <ArchiveTable
          records={rows}
          isLoading={isLoading}
          error={error}
          current={current}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onDetail={(record) => setDetailArchiveNo(record.archiveNo)}
          onRetry={handleRetry}
          retryingNo={retryingNo}
        />
      </div>
      {detailArchiveNo !== null && (
        <ArchiveDetailDialog
          archiveNo={detailArchiveNo}
          onClose={() => setDetailArchiveNo(null)}
        />
      )}
    </section>
  )
}
