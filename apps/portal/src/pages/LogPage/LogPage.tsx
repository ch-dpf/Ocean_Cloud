import { SubNav } from '@ocean-cloud/ui'
import styles from './LogPage.module.css'
import { LOG_SECTIONS } from '../../features/logs/constants/log'
import {
  ExceptionLogTable,
  LoginLogTable,
  OperationLogTable,
} from '../../features/logs/components/LogTables/LogTables'

interface LogPageProps {
  readonly activePath: string
}

/** 二级导航项：三类日志共用同一图标，与主平台其它二级导航一致 */
const NAV_ITEMS = LOG_SECTIONS.map((item) => ({
  path: item.path,
  label: item.label,
  icon: '/icons/Log.svg',
  activeIcon: '/icons/Log_blue.svg',
}))

export function LogPage({ activePath }: LogPageProps) {
  const section =
    LOG_SECTIONS.find((item) => item.path === activePath) ?? LOG_SECTIONS[0]
  return (
    <section className={styles.page}>
      <SubNav items={NAV_ITEMS} activePath={section.path} />
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h2>{section.label}</h2>
          <p>{section.description}</p>
        </div>
        {section.kind === 'exception' ? (
          <ExceptionLogTable />
        ) : section.kind === 'operation' ? (
          <OperationLogTable />
        ) : (
          <LoginLogTable />
        )}
      </div>
    </section>
  )
}
