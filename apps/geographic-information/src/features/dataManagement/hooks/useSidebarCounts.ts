import { useEffect, useState } from 'react'
import { getDeletedFileMetaPage } from '../services/fileMetaService'
import { getFileOptPage } from '../services/fileOptService'

interface SidebarCounts {
  /** 回收站（已删除数据文件）条数；未取到时为 null */
  readonly recycleBinTotal: number | null
  /** 导入记录条数；未取到时为 null */
  readonly importRecordTotal: number | null
}

const EMPTY_COUNTS: SidebarCounts = {
  recycleBinTotal: null,
  importRecordTotal: null,
}

/**
 * 侧边栏「回收站」「导入记录」的计数：各发一个 size=1 的轻量请求，只取 total。
 * 「全部数据」的计数由数据列表请求带回（useFileMetaPage 的 allTotal），不在这里重复取。
 * 单个请求失败保留上一次的数字，不把已有的计数清空。
 */
export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(EMPTY_COUNTS)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getDeletedFileMetaPage({ current: 1, size: 1 }, controller.signal).catch(
        () => null,
      ),
      getFileOptPage({ current: 1, size: 1 }, controller.signal).catch(
        () => null,
      ),
    ]).then(([deleted, records]) => {
      // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
      if (controller.signal.aborted) return
      setCounts((previous) => ({
        recycleBinTotal:
          deleted === null ? previous.recycleBinTotal : Number(deleted.total),
        importRecordTotal:
          records === null ? previous.importRecordTotal : Number(records.total),
      }))
    })
    return () => controller.abort()
  }, [revision])

  return {
    ...counts,
    /** 写操作（上传完成、删除文件）后重取 */
    refresh: () => setRevision((previous) => previous + 1),
  }
}
