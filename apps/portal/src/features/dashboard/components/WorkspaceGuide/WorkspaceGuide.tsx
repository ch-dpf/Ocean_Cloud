import styles from './WorkspaceGuide.module.css'
export function WorkspaceGuide() {
  return (
    <section className={styles.bottomPanel}>
      <div>
        <span className={styles.smallIcon}>◈</span>
        <div>
          <h3>为每一次海洋探索，准备就绪</h3>
          <p>从资源中心开始，了解平台的数据与应用工作流。</p>
        </div>
      </div>
      <a href="#/about">了解平台 →</a>
    </section>
  )
}
