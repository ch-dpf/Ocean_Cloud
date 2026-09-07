import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '@ocean-cloud/ui'
import type { MicroApplication } from '../../types/application'
import {
  listDeletedApplications,
  restoreApplication,
} from '../../features/applications/services/applicationService'
import { useApplications } from '../../features/applications/hooks/useApplications'
import styles from './ApplicationRecycleBinPage.module.css'
export function ApplicationRecycleBinPage() {
  const [applications, setApplications] = useState<readonly MicroApplication[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const { refresh } = useApplications()
  const load = useCallback(async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setIsLoading(true)
    try {
      const result = await listDeletedApplications(request.signal)
      if (!request.signal.aborted) {
        setApplications(result)
        setError(null)
      }
    } catch {
      if (!request.signal.aborted) setError('回收站加载失败，请检查后台连接。')
    } finally {
      if (!request.signal.aborted) setIsLoading(false)
    }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => {
      window.clearTimeout(timer)
      controller.current?.abort()
    }
  }, [load])
  async function handleRestore(application: MicroApplication) {
    setRestoringId(application.id)
    setError(null)
    setNotice(null)
    try {
      await restoreApplication(application.id)
      setApplications((previous) =>
        previous.filter((app) => app.id !== application.id),
      )
      setNotice(
        '已恢复“' + application.name + '”，保留删除前的配置和发布版本。',
      )
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '恢复失败，请重试。')
    } finally {
      setRestoringId(null)
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="APPLICATION RECYCLE BIN"
        title="应用回收站"
        description="恢复已删除的应用，继续使用原工程、配置和发布版本。"
        actions={<a href="#/application-management">返回应用管理 →</a>}
      />
      <p className={styles.hint}>
        删除期间保留应用标识与路由；恢复后沿用删除前的启用和展示设置。
      </p>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          <button onClick={() => void load()}>重新加载</button>
        </div>
      )}
      {isLoading && !applications.length ? (
        <p role="status">正在读取回收站…</p>
      ) : !applications.length && !error ? (
        <section className={styles.empty}>
          <span>♧</span>
          <h2>回收站为空</h2>
          <p>删除的应用会出现在这里。</p>
        </section>
      ) : (
        <div className={styles.list}>
          {applications.map((app) => (
            <article key={app.id}>
              <span className={styles.icon}>{app.icon}</span>
              <div className={styles.info}>
                <h2>{app.name}</h2>
                <p>{app.route}</p>
                <small>
                  删除于 {new Date(app.deletedAt!).toLocaleString()}
                </small>
              </div>
              <button
                disabled={!!restoringId}
                onClick={() => void handleRestore(app)}
              >
                {restoringId === app.id ? '正在恢复…' : '恢复应用'}
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
