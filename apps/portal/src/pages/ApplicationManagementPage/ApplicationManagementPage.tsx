import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@ocean-cloud/ui'
import type {
  ApplicationInput,
  ApplicationTask,
  MicroApplication,
} from '../../types/application'
import { useApplications } from '../../features/applications/hooks/useApplications'
import { useApplicationDetail } from '../../features/applications/hooks/useApplicationDetail'
import {
  createApplication,
  updateApplication,
  startApplicationTask,
} from '../../features/applications/services/applicationService'
import { ApplicationEditor } from '../../features/applications/components/ApplicationEditor/ApplicationEditor'
import { ApplicationDetails } from '../../features/applications/components/ApplicationDetails/ApplicationDetails'
import styles from './ApplicationManagementPage.module.css'
export function ApplicationManagementPage() {
  const { applications, error, isLoading, refresh } = useApplications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<MicroApplication | null | undefined>(
    undefined,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const activeId = applications.some((app) => app.id === selectedId)
    ? selectedId
    : applications[0]?.id || null
  const { detail, error: detailError, reload } = useApplicationDetail(activeId)
  const previousSignature = useRef('')
  const signature = detail
    ? detail.application.id +
      detail.application.updatedAt +
      detail.tasks.map((task) => task.id + task.status).join()
    : ''
  useEffect(() => {
    if (signature && signature !== previousSignature.current) {
      previousSignature.current = signature
      void refresh()
    }
  }, [signature, refresh])
  async function handleSave(input: ApplicationInput) {
    if (
      applications.some(
        (app) =>
          app.id !== editor?.id &&
          (app.id === input.id || app.route === input.route),
      )
    ) {
      throw new Error('应用标识或入口路由已存在，请使用其他值。')
    }
    if (editor) await updateApplication(editor.id, input)
    else {
      const result = await createApplication(input)
      setSelectedId(result.application.id)
    }
    setEditor(undefined)
    await refresh()
    reload()
  }
  async function handleTask(kind: ApplicationTask['kind'], releaseId?: string) {
    if (!activeId) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      await startApplicationTask(activeId, kind, releaseId)
      reload()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '任务提交失败。')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="APPLICATION MANAGEMENT"
        title="应用管理"
        description="管理应用信息、访问路由与发布版本。"
        actions={
          <div className={styles.toolbar}>
            <a href="#/application-recycle-bin">回收站</a>
            <button
              className={styles.primary}
              disabled={!!error}
              onClick={() => setEditor(null)}
            >
              ＋ 创建应用
            </button>
          </div>
        }
      />
      {error ? (
        <section className={styles.empty} role="alert">
          <p>{error}</p>
          <button onClick={() => void refresh()}>重新连接</button>
        </section>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.list}>
            <div className={styles.listHeading}>
              <span>全部应用</span>
              <span>{applications.length}</span>
            </div>
            {isLoading && !applications.length && <p>正在加载…</p>}
            {applications.map((app) => (
              <button
                key={app.id}
                className={activeId === app.id ? styles.selected : ''}
                onClick={() => {
                  setSelectedId(app.id)
                  setActionError(null)
                }}
              >
                <span className={styles.appIcon}>{app.icon}</span>
                <span>
                  <strong>{app.name}</strong>
                  <small>{app.route}</small>
                </span>
                <span className={styles.status}>
                  {!app.enabled
                    ? '停用'
                    : app.activeReleaseId
                      ? '已发布'
                      : app.sourceReady
                        ? '待发布'
                        : '待生成'}
                </span>
              </button>
            ))}
          </aside>
          {!activeId ? (
            <section className={styles.empty}>
              <h2>创建第一个应用</h2>
              <p>创建应用并配置访问路由，发布后即可从应用中心访问。</p>
            </section>
          ) : detailError ? (
            <section className={styles.empty} role="alert">
              <p>{detailError}</p>
              <button onClick={reload}>重试</button>
            </section>
          ) : detail ? (
            <ApplicationDetails
              detail={detail}
              isSubmitting={isSubmitting}
              error={actionError}
              onEdit={setEditor}
              onDeleted={() => setSelectedId(null)}
              onTask={(kind, releaseId) => void handleTask(kind, releaseId)}
            />
          ) : (
            <p role="status">正在读取应用详情…</p>
          )}
        </div>
      )}
      {editor !== undefined && (
        <ApplicationEditor
          key={editor?.id || 'new'}
          application={editor}
          onClose={() => setEditor(undefined)}
          onSave={handleSave}
        />
      )}
    </>
  )
}
