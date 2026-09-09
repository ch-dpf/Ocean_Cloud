import styles from './Brand.module.css'
import logoUrl from './assets/logo.svg'
interface BrandProps {
  readonly collapsed?: boolean
  readonly logoName?: string
}
export function Brand({
  collapsed = false,
  logoName = '云海 Ocean Cloud',
}: BrandProps = {}) {
  return (
    <div
      className={`${styles.brand}${collapsed ? ` ${styles.brandCollapsed}` : ''}`}
    >
      <div className={styles.logoIcon}>
        <img src={logoUrl} alt="云海 Logo" />
      </div>
      <span className={styles.logoName}>{logoName}</span>
    </div>
  )
}
