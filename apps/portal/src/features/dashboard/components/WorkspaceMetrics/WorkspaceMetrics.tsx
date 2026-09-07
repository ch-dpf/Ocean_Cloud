import styles from './WorkspaceMetrics.module.css'
import { MICRO_APPLICATIONS } from '../../../../config/applications'
export function WorkspaceMetrics() {
  return (
    <div className={styles.metrics}>
      <article>
        <span>已接入应用</span>
        <strong>
          {String(MICRO_APPLICATIONS.length).padStart(2, '0')}
          <small>个</small>
        </strong>
        <p>
          <i /> 资源中心已注册
        </p>
      </article>
      <article>
        <span>数据资源</span>
        <strong>
          03<small>项</small>
        </strong>
        <p>示例数据 · 用于功能演示</p>
      </article>
      <article>
        <span>平台架构</span>
        <strong className={styles.metricText}>应用级微前端</strong>
        <p>独立运行 · 独立部署</p>
      </article>
      <article>
        <span>工作空间</span>
        <strong className={styles.metricText}>Ocean_Cloud</strong>
        <p>开发工作空间</p>
      </article>
    </div>
  )
}
