import styles from './WorkspacePanels.module.css'
import type { SystemMetrics } from '../../hooks/useSystemMetrics'

interface WorkspacePanelsProps {
  readonly metrics: SystemMetrics | null
}

const STORAGE_CATEGORIES = ['影像数据', '矢量数据', '模型数据', '海洋数据']

function formatPercent(value: number | undefined): string {
  return value != null ? `${value.toFixed(1)}%` : '--'
}

export function WorkspacePanels({ metrics }: WorkspacePanelsProps) {
  const cpu = formatPercent(metrics?.cpuUsage)
  const memory = formatPercent(metrics?.memoryUsage)
  const disk = '--' // ws 暂无磁盘字段

  return (
    <div className={styles.workspacePanels}>
      <div className={styles.row}>
        <section
          className={styles.resourceUsageTrend}
          aria-label="资源使用趋势"
        >
          <div className={styles.trendHeader}>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 700,
                fontStyle: 'Bold',
                fontSize: '15px',
              }}
            >
              资源使用趋势&nbsp;&nbsp;
            </span>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 400,
                fontStyle: 'Normal',
                fontSize: '11px',
                color: '#576E85',
              }}
            >
              {' '}
              最近24小时
            </span>
          </div>
          <div className={styles.trendLegend}>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 400,
                fontStyle: 'Regular',
                fontSize: '10px',
                color: '#095ED4',
              }}
            >
              <i
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#095ED4',
                }}
              />
              CPU {cpu}
            </span>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 400,
                fontStyle: 'Regular',
                fontSize: '10px',
                color: '#089466',
              }}
            >
              <i
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#089466',
                }}
              />
              内存 {memory}
            </span>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 400,
                fontStyle: 'Regular',
                fontSize: '10px',
                color: '#576E85',
              }}
            >
              <i
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#576E85',
                }}
              />
              磁盘 {disk}
            </span>
          </div>
        </section>

        <section className={styles.runStatus} aria-label="运行状态">
          <div className={styles.runStatusHeader}>
            <span
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 700,
                fontStyle: 'Bold',
                fontSize: '15px',
              }}
            >
              运行状态
            </span>
            {/* TODO: 查看全部跳转链接待接入 */}
            <a
              style={{
                fontFamily: 'Noto Sans SC',
                fontWeight: 400,
                fontStyle: 'Normal',
                fontSize: '11px',
                color: '#1267d6',
              }}
            >
              查看全部 →
            </a>
          </div>
          {/* 一行三个占位框 */}
          <div className={styles.statusOverview}>
            <div className={styles.statusOverviewItem}>
              <div>
                <span
                  style={{
                    fontFamily: 'Noto Sans SC',
                    fontWeight: 400,
                    fontStyle: 'Regular',
                    fontSize: '11px',
                    color: '#576E85',
                  }}
                >
                  运行中任务
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontFamily: 'Noto Sans SC',
                    fontWeight: 700,
                    fontStyle: 'Bold',
                    fontSize: '19px',
                    color: '#095ED4',
                  }}
                >
                  --
                </span>
              </div>
            </div>
            <div className={styles.statusOverviewItem}>
              <div>
                <span
                  style={{
                    fontFamily: 'Noto Sans SC',
                    fontWeight: 400,
                    fontStyle: 'Regular',
                    fontSize: '11px',
                    color: '#576E85',
                  }}
                >
                  需要关注
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontFamily: 'Noto Sans SC',
                    fontWeight: 700,
                    fontStyle: 'Bold',
                    fontSize: '19px',
                    color: '#E03833',
                  }}
                >
                  --
                </span>
              </div>
            </div>
          </div>
          <div className={styles.statusDetail}>
            <div className={styles.statusDetailItem}></div>
            <div className={styles.statusDetailItem}></div>
            <div className={styles.statusDetailItem}></div>
          </div>
        </section>
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
