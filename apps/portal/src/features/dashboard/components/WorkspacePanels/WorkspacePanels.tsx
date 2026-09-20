import styles from './WorkspacePanels.module.css'
import type { SystemMetrics } from '../../hooks/useSystemMetrics'
import { useTaskOverview } from '../../hooks/useTaskOverview'

interface WorkspacePanelsProps {
  readonly metrics: SystemMetrics | null
}

const STORAGE_CATEGORIES = ['影像数据', '矢量数据', '模型数据', '海洋数据']

/** 任务状态对应的进度颜色：运行中蓝、已完成绿、失败红、排队灰 */
const TASK_STATUS_COLORS: Readonly<Record<string, string>> = {
  RUNNING: '#095ED4',
  COMPLETED: '#089466',
  PARTIAL_FAILED: '#E03833',
  FAILED: '#E03833',
  QUEUED: '#576E85',
}

const TASK_STATUS_FALLBACK_COLOR = '#576E85'

function formatPercent(value: number | undefined): string {
  return value != null ? `${value.toFixed(1)}%` : '--'
}

export function WorkspacePanels({ metrics }: WorkspacePanelsProps) {
  const cpu = formatPercent(metrics?.cpuUsage)
  const memory = formatPercent(metrics?.memoryUsage)
  const disk = '--' // ws 暂无磁盘字段
  const { runningTotal, attentionTotal, tasks } = useTaskOverview()

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
                  {runningTotal ?? '--'}
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
                  {attentionTotal ?? '--'}
                </span>
              </div>
            </div>
          </div>
          {/* 最近三条任务：进度来自 /ws/task 长连接 */}
          <div className={styles.statusDetail}>
            {tasks.length === 0 ? (
              <div className={styles.statusDetailEmpty}>暂无任务</div>
            ) : (
              tasks.map((task) => {
                const color =
                  TASK_STATUS_COLORS[task.taskStatus] ??
                  TASK_STATUS_FALLBACK_COLOR
                return (
                  <div className={styles.statusDetailItem} key={task.taskNo}>
                    <span className={styles.taskName} title={task.taskName}>
                      {task.taskName}
                    </span>
                    <span className={styles.taskTrack} aria-hidden="true">
                      <span
                        className={styles.taskProgress}
                        style={{ width: `${task.percent}%`, background: color }}
                      />
                    </span>
                    <span className={styles.taskPercent} style={{ color }}>
                      {task.percent}%
                    </span>
                  </div>
                )
              })
            )}
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
