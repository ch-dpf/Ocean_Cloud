import { useEffect, useState } from 'react'
import {
  getDeletedFileMetaPage,
  getFileMetaPage,
} from '../services/fileMetaService'
import { getTransferPage } from '../services/fileTransferService'

interface SidebarCounts {
  /** 全部数据（数据工作区）条数；未取到时为 null */
  readonly workspaceTotal: number | null
  /** 回收站（已删除数据文件）条数；未取到时为 null */
  readonly recycleBinTotal: number | null
  /** 传输记录条数；未取到时为 null */
  readonly transferTotal: number | null
}

const EMPTY_COUNTS: SidebarCounts = {
  workspaceTotal: null,
  recycleBinTotal: null,
  transferTotal: null,
}

/**
 * 侧边栏「全部数据」「回收站」「传输记录」的计数：各发一个 size=1 的轻量请求，只取 total。
 * 这三个计数与当前停在哪个栏目无关：放在页面级一次性取回，切到传输记录、回收站后
 * 「全部数据」的条数才不会因为数据列表未发起请求而消失。
 * 单个请求失败保留上一次的数字，不把已有的计数清空。
 */
export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(EMPTY_COUNTS)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getFileMetaPage({ current: 1, size: 1 }, controller.signal).catch(
        () => null,
      ),
      getDeletedFileMetaPage({ current: 1, size: 1 }, controller.signal).catch(
        () => null,
      ),
      getTransferPage({ current: 1, size: 1 }, controller.signal).catch(
        () => null,
      ),
    ]).then(([workspace, deleted, records]) => {
      // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
      if (controller.signal.aborted) return
      setCounts((previous) => ({
        workspaceTotal:
          workspace === null
            ? previous.workspaceTotal
            : Number(workspace.total),
        recycleBinTotal:
          deleted === null ? previous.recycleBinTotal : Number(deleted.total),
        transferTotal:
          records === null ? previous.transferTotal : Number(records.total),
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
