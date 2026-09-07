import styles from './NotFound.module.css'
export function NotFound() {
  return (
    <section className={styles.container}>
      <div className={styles.code}>404</div>
      <h1>页面不存在</h1>
      <p>链接可能已失效，或页面地址输入有误。</p>
      <a href="/">返回首页</a>
    </section>
  )
}
