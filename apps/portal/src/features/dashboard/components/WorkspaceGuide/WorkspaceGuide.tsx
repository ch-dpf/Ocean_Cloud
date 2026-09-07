import styles from './WorkspaceGuide.module.css'
export function WorkspaceGuide() {
  return (
    <section className={styles.bottomPanel}>
      <div>
        <span className={styles.smallIcon}>◈</span>
        <div>
          <h3>为每一次海洋探索，准备就绪</h3>
          <p>从应用中心开始，进入地理信息与海洋信息工作空间。</p>
        </div>
      </div>
      <a href="#/about">了解平台 →</a>
    </section>
  )
}
