import styles from './DataManagementPage.module.css'
export function DataManagementPage() {
  return (
    <section className={styles.page}>
      <div className={styles.eyebrow}>DATA MANAGEMENT</div>
      <h1>数据管理</h1>
      <p>组织、检索与维护海洋数据资产。</p>
      <div className={styles.placeholder}>
        <span className={styles.icon}>▦</span>
        <h2>暂无数据集合</h2>
        <p>数据集合登记后，将在此处浏览、筛选与检索。</p>
      </div>
    </section>
  )
}
