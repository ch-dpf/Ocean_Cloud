import styles from './DataProcessingPage.module.css'
export function DataProcessingPage() {
  return (
    <section className={styles.page}>
      <div className={styles.eyebrow}>DATA PROCESSING</div>
      <h1>数据处理</h1>
      <p>对地理空间数据执行清洗、转换与分析。</p>
      <div className={styles.placeholder}>
        <span className={styles.icon}>▦</span>
        <h2>暂无处理任务</h2>
        <p>创建处理流程后，将在此处查看任务进度与结果。</p>
      </div>
    </section>
  )
}
