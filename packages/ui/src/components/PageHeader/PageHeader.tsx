import type { ReactNode } from 'react'
interface PageHeaderProps {
  readonly title: string
  readonly eyebrow?: string
  readonly subtitle?: string
  readonly description?: string
  readonly actions?: ReactNode
}
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>
          {title}
          {subtitle && <span>{subtitle}</span>}
        </h1>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </div>
  )
}
