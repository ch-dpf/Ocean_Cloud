import styles from './DataPublishingPage.module.css'
export function DataPublishingPage() {
  return (
    <section className={styles.page}>
      <div className={styles.eyebrow}>DATA PUBLISHING</div>
      <h1>数据发布</h1>
      <p>将处理后的海洋数据集发布为可访问的服务与产品。</p>
      <div className={styles.placeholder}>
        <span className={styles.icon}>▦</span>
        <h2>暂无发布记录</h2>
        <p>发布数据服务后，将在此处查看已发布条目与状态。</p>
      </div>
    </section>
  )
}
