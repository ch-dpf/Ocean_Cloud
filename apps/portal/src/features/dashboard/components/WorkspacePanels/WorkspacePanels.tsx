import styles from './WorkspacePanels.module.css'

const STORAGE_CATEGORIES = ['影像数据', '矢量数据', '模型数据', '海洋数据']

export function WorkspacePanels() {
  return (
    <div className={styles.workspacePanels}>
      <div className={styles.row}>
        <section
          className={styles.resourceUsageTrend}
          aria-label="资源使用趋势"
        />
        <section className={styles.runStatus} aria-label="运行状态" />
      </div>

      <div className={styles.row}>
        <section
          className={styles.fileStoreDetail}
          aria-labelledby="file-store-title"
        >
          <header className={styles.panelHeader}>
            <h2 id="file-store-title">静态文件使用存储情况（分类）</h2>
          </header>
          <div className={styles.storageContent}>
            <ul className={styles.storageList}>
              {STORAGE_CATEGORIES.map((category) => (
                <li key={category}>
                  <div>
                    <span>{category}</span>
                    <span>--</span>
                  </div>
                  <span className={styles.track} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className={styles.apiUsageTrend}
          aria-labelledby="api-usage-title"
        >
          <header className={styles.apiHeader}>
            <h2 id="api-usage-title">API调用趋势</h2>
            <span>七日服务调用情况</span>
          </header>
          <div className={styles.apiMetrics}>
            <span>
              今日调用 <b>--</b>
            </span>
            <span>
              成功率 <b>--</b>
            </span>
            <span>
              失败请求 <b>--</b>
            </span>
          </div>
          <div className={styles.apiState}>暂无调用数据</div>
        </section>
      </div>
    </div>
  )
}
