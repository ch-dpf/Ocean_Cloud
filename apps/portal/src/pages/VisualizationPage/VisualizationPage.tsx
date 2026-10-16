import styles from './VisualizationPage.module.css'

const APPLICATIONS = [
  {
    key: 'gis',
    title: '瞰海数字地球',
    description: '二维/三维海洋数据综合可视化',
  },
  {
    key: 'ocean',
    title: '海洋专题分析',
    description: '环境场、声呐成果与任务专题展示',
  },
] as const

export function VisualizationPage() {
  return (
    <div className={styles.visualizationPage}>
      <header className={styles.pageHeader}>
        <h1>可视化应用</h1>
        <p>面向二维、三维与专题分析的业务应用入口</p>
      </header>

      <div className={styles.content}>
        {APPLICATIONS.map((application) => (
          <article className={styles.card} key={application.key}>
            <header className={styles.cardHeader}>
              <h2>{application.title}</h2>
              <p>{application.description}</p>
            </header>
            <div className={styles.cardBody}>
              <button
                type="button"
                className={`${styles.cardButton} ${styles[application.key]}`}
              >
                进入应用 <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
