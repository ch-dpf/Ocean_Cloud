import { SubNav } from '@ocean-cloud/ui'
import styles from './SystemManagementPage.module.css'
import { SYSTEM_MANAGEMENT_SECTIONS } from '../../features/users/constants/user'
import { UserTable } from '../../features/users/components/UserTable/UserTable'

interface SystemManagementPageProps {
  readonly activePath: string
}

/** 二级导航项：三栏共用同一图标，与主平台其它二级导航一致 */
const NAV_ITEMS = SYSTEM_MANAGEMENT_SECTIONS.map((item) => ({
  path: item.path,
  label: item.label,
  icon: '/icons/SystemManagement.svg',
  activeIcon: '/icons/SystemManagement_blue.svg',
  disabled: item.disabled === true,
}))

export function SystemManagementPage({
  activePath,
}: SystemManagementPageProps) {
  const section =
    SYSTEM_MANAGEMENT_SECTIONS.find((item) => item.path === activePath) ??
    SYSTEM_MANAGEMENT_SECTIONS[0]
  return (
    <section className={styles.page}>
      <SubNav items={NAV_ITEMS} activePath={section.path} />
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h2>{section.label}</h2>
          <p>{section.description}</p>
        </div>
        {section.kind === 'users' ? (
          <UserTable />
        ) : (
          // 角色与权限、系统配置的接口尚未接入，导航已置灰，这里兜直接访问地址的情况
          <p className={styles.pending}>{section.label}接口待接入。</p>
        )}
      </div>
    </section>
  )
}
