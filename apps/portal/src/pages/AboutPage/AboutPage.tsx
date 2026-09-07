import styles from './AboutPage.module.css'
export function AboutPage() {
  return (
    <section className={styles.about}>
      <img src="/ocean-logo.png" alt="云海 Logo" />
      <div className={'eyebrow'}>OCEAN CLOUD</div>
      <h1>云海平台</h1>
      <p>连接海洋数据、应用与协作的统一工作空间。</p>
      <p>当前版本：0.1.0</p>
      <p>统一管理应用信息、访问路由与发布版本。</p>
    </section>
  )
}
