import type {
  ApplicationDetail,
  ApplicationTask,
  MicroApplication,
} from '../../../../types/application'
import { ApplicationTasks } from '../ApplicationTasks/ApplicationTasks'
import { ApplicationDeletion } from '../ApplicationDeletion/ApplicationDeletion'
import styles from './ApplicationDetails.module.css'
interface ApplicationDetailsProps {
  readonly detail: ApplicationDetail
  readonly isSubmitting: boolean
  readonly error: string | null
  readonly onEdit: (application: MicroApplication) => void
  readonly onTask: (kind: ApplicationTask['kind'], releaseId?: string) => void
  readonly onDeleted: () => void
}
export function ApplicationDetails({
  detail,
  isSubmitting,
  error,
  onEdit,
  onTask,
  onDeleted,
}: ApplicationDetailsProps) {
  const { application, releases, tasks } = detail
  const isBusy =
    isSubmitting ||
    tasks.some((task) => ['queued', 'running'].includes(task.status))
  return (
    <section className={styles.panel}>
      <header>
        <div>
          <span className={styles.icon}>{application.icon}</span>
          <h2>{application.name}</h2>
        </div>
        <div>
          <button onClick={() => onEdit(application)}>编辑配置</button>
          <ApplicationDeletion
            key={application.id}
            application={application}
            isDisabled={isBusy}
            onDeleted={onDeleted}
          />
        </div>
      </header>
      <p>{application.description || '尚未填写应用描述'}</p>
      <dl className={styles.metadata}>
        <dt>应用标识</dt>
        <dd>{application.id}</dd>
        <dt>入口路由</dt>
        <dd>{application.route}</dd>
        <dt>应用状态</dt>
        <dd>
          {application.enabled ? '启用' : '停用'} ·{' '}
          {application.isListed ? '应用中心可见' : '应用中心隐藏'}
        </dd>
        <dt>工程来源</dt>
        <dd>
          {application.sourceKind === 'workspace'
            ? '已有工作空间'
            : '平台生成工程'}
        </dd>
      </dl>
      <details className={styles.source}>
        <summary>开发工程位置</summary>
        <code>{detail.sourceDirectory}</code>
        <p>在该目录开发业务；发布时会复制当前源码并构建独立版本。</p>
      </details>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={isBusy}
          onClick={() =>
            onTask(application.sourceReady ? 'publish' : 'generate')
          }
        >
          {isBusy
            ? '任务执行中…'
            : application.sourceReady
              ? '构建并发布'
              : '重新生成工程'}
        </button>
        {application.activeReleaseId && application.enabled && (
          <a href={'#' + application.route}>进入应用 →</a>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <section className={styles.releases}>
        <h3>发布版本</h3>
        {!releases.length ? (
          <p>尚未发布。构建成功后，应用中心将开放访问入口。</p>
        ) : (
          releases.map((release, index) => (
            <div key={release.id} className={styles.release}>
              <div>
                <strong>{new Date(release.createdAt).toLocaleString()}</strong>
                <small>
                  源码 {release.sourceRevision} · 快照{' '}
                  {release.sourceHash.slice(0, 12)}
                </small>
              </div>
              {release.id === application.activeReleaseId ? (
                <span className={styles.active}>当前版本</span>
              ) : (
                <button
                  disabled={isBusy}
                  aria-label={'回滚到版本' + (releases.length - index)}
                  onClick={() => onTask('rollback', release.id)}
                >
                  回滚到此版本
                </button>
              )}
            </div>
          ))
        )}
      </section>
      <ApplicationTasks tasks={tasks} />
    </section>
  )
}
