import styles from './SystemManagementPage.module.css'

const MANAGEMENT_MODULES = [
  { title: '用户与组织', description: '管理用户、组织架构和成员状态' },
  { title: '角色与权限', description: '配置角色权限和资源访问范围' },
  { title: '系统配置', description: '维护基础参数、通知和安全策略' },
]

export function SystemManagementPage() {
  return (
    <div className={styles.systemManagementPage}>
      <header className={styles.pageHeader}>
        <h1>系统管理</h1>
        <p>维护平台成员、权限及系统基础配置</p>
      </header>

      <section className={styles.panel} aria-labelledby="system-module-title">
        <header className={styles.sectionHeader}>
          <h2 id="system-module-title">管理模块</h2>
          <span>待配置</span>
        </header>
        <div className={styles.grid}>
          {MANAGEMENT_MODULES.map((module) => (
            <button type="button" className={styles.module} key={module.title}>
              <span className={styles.moduleIcon} aria-hidden="true">
                ⚙
              </span>
              <span className={styles.moduleCopy}>
                <strong>{module.title}</strong>
                <small>{module.description}</small>
              </span>
              <span className={styles.moduleArrow} aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
