import type { MicroApplication } from '../../../../types/application'
import { useMicroApplication } from '../../hooks/useMicroApplication'
import styles from './MicroApplicationFrame.module.css'
interface MicroApplicationFrameProps {
  readonly application: MicroApplication
}
export function MicroApplicationFrame({
  application,
}: MicroApplicationFrameProps) {
  const { frameRef, status, retryCount, retry } =
    useMicroApplication(application)
  return (
    <section className={styles.container}>
      {status !== 'ready' && (
        <div className={styles.loading} role="status">
          <div className="eyebrow">APPLICATION</div>
          <h2>
            {status === 'error'
              ? application.name + '暂时无法连接'
              : '正在连接' + application.name + '…'}
          </h2>
          <p>
            {status === 'error'
              ? '请检查子应用服务是否启动，然后重试。'
              : '即将进入你的数据工作空间。'}
          </p>
          {status === 'error' && (
            <button type="button" onClick={retry}>
              重新连接
            </button>
          )}
        </div>
      )}
      <iframe
        key={retryCount}
        ref={frameRef}
        className={styles.frame}
        title={application.name + '子应用'}
        src={application.url}
        sandbox="allow-scripts allow-same-origin"
        style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
      />
    </section>
  )
}
