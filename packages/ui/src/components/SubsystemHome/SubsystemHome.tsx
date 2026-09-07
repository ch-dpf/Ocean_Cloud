import styles from './SubsystemHome.module.css'
export interface SubsystemNavigation {
  readonly portalUrl: string
  readonly isEmbedded: boolean
  readonly onNavigateHome: () => void
}
interface SubsystemHomeProps extends SubsystemNavigation {
  readonly title: string
  readonly eyebrow: string
  readonly description: string
  readonly tone: 'geographic' | 'marine'
}
export function SubsystemHome({
  title,
  eyebrow,
  description,
  tone,
  portalUrl,
  isEmbedded,
  onNavigateHome,
}: SubsystemHomeProps) {
  return (
    <div className={styles.page} data-tone={tone}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            {tone === 'geographic' ? '▧' : '≈'}
          </span>
          <span>
            云海平台 <span className={styles.separator}>/</span> {title}
          </span>
        </div>
        {isEmbedded ? (
          <button type="button" onClick={onNavigateHome}>
            返回云海平台
          </button>
        ) : (
          <a className={styles.backLink} href={portalUrl}>
            ← 返回云海平台
          </a>
        )}
      </header>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>{eyebrow}</div>
            <h1>{title}</h1>
            <p>{description}</p>
            <span className={styles.status}>
              <i /> 应用已创建
            </span>
          </div>
          <div className={styles.art} aria-hidden="true">
            <span>{tone === 'geographic' ? '◎' : '≈'}</span>
          </div>
        </section>
        <div className={styles.content}>
          <section className={styles.modules}>
            <h2>业务工作空间</h2>
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                {tone === 'geographic' ? '▧' : '≈'}
              </span>
              <h3>暂无业务模块</h3>
              <p>
                {title}应用首页已建立。
                <br />
                后续将在这里接入具体业务功能。
              </p>
            </div>
          </section>
          <aside className={styles.info}>
            <h2>应用信息</h2>
            <dl>
              <dt>应用名称</dt>
              <dd>{title}</dd>
              <dt>所属平台</dt>
              <dd>Ocean_Cloud · 云海平台</dd>
              <dt>运行方式</dt>
              <dd>{isEmbedded ? '平台内运行' : '独立运行'}</dd>
              <dt>当前阶段</dt>
              <dd>应用初始化</dd>
            </dl>
            <p>目前仅提供应用基础框架，尚未接入业务数据。</p>
          </aside>
        </div>
      </main>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Ocean Cloud · {title}
      </footer>
    </div>
  )
}
