import styles from './DataServicePage.module.css'
import { useServiceCounts } from '../../features/dataService/hooks/useServiceCounts'

const CAPABILITIES = ['数据管理', '数据处理', '数据发布']

/** 计数单位统一为「个」；未取到计数（加载中或失败）时保持占位 */
function formatCount(total: number | null | undefined): string {
  return total === null || total === undefined ? '--' : `${total} 个`
}

// 入口使用同源相对路径：浏览器自动补上当前页面的源，开发、部署地址一致，不写死主机和端口。
// 待应用注册表服务就绪后，可改回按注册表的 route / launchUrl 在运行时解析。
const MODULES = [
  {
    key: 'gis',
    entry: '/apps/geographic-information/',
    icon: '/icons/GISIcon.svg',
    iconAlt: 'GIS 图标',
    title: 'GIS模块',
    description: '影像、矢量、地形、倾斜模型与电子海图',
    buttonLabel: '进入 GIS 模块',
  },
  {
    key: 'ocean',
    entry: '/apps/marine-information/',
    icon: '/icons/OceanIcon.svg',
    iconAlt: '海洋图标',
    title: '海洋模块',
    description: '海洋环境、声呐、多波束、浅剖与装备轨迹',
    buttonLabel: '进入 海洋模块',
  },
] as const

export function DataServicePage() {
  const { datasetTotal, taskTotal, publicationTotal } = useServiceCounts()
  // 顺序与 CAPABILITIES 一致：数据集、任务、已发布服务；海洋接口未就绪，保持占位
  const gisCounts = [datasetTotal, taskTotal, publicationTotal]
  return (
    <div className={styles.dataServicePage}>
      <header className={styles.pageHeader}>
        <h1>数据服务</h1>
        <p>选择 GIS 或海洋服务域，进入独立的数据管理、处理与发布工作空间</p>
      </header>

      <div className={styles.content}>
        {MODULES.map((module) => (
          <article className={styles.card} key={module.key}>
            <header className={styles.cardHeader}>
              <span className={`${styles.icon} ${styles[module.key]}`}>
                <img src={module.icon} alt={module.iconAlt} />
              </span>
              <div className={styles.cardTitle}>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </div>
            </header>

            <div className={styles.divider} />

            <div className={styles.cardBody}>
              <dl className={styles.capabilities}>
                {CAPABILITIES.map((capability, index) => (
                  <div key={capability}>
                    <dt>{capability}</dt>
                    <dd>
                      {formatCount(
                        module.key === 'gis' ? gisCounts[index] : undefined,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <a href={module.entry}>
                <button
                  type="button"
                  className={`${styles.cardButton} ${styles[module.key]}`}
                >
                  {module.buttonLabel} <span aria-hidden="true">→</span>
                </button>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
