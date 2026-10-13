import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './AppDialog.module.css'

interface AppDialogProps {
  /** 标题，同时作为 aria-labelledby 指向的元素 */
  readonly title: string
  /** 标题上方的装饰性小标签（可选） */
  readonly eyebrow?: string
  /** 关闭弹窗：点右上角 × 或按 Esc（原生 close 事件）都会触发 */
  readonly onClose: () => void
  /** 关闭按钮放到弹窗外侧右上角；默认放在标题行内 */
  readonly closeOutside?: boolean
  /**
   * 是否允许关闭，默认允许。为 false 时禁用 × 并拦掉 Esc，
   * 用于保存 / 删除等请求进行中不允许关闭的场景。
   */
  readonly closable?: boolean
  /** 各弹窗的尺寸等定制（弹窗外壳的边框、圆角、内边距由本组件统一提供） */
  readonly className?: string
  readonly children: ReactNode
}

/**
 * 弹窗外壳：负责 showModal 挂载、aria 关联、标题行与关闭按钮。
 * 原先这套样板（<dialog> + useRef + showModal + useId + aria-labelledby + × 按钮）
 * 在仓库里重复了 11 份。
 */
export function AppDialog({
  title,
  eyebrow,
  onClose,
  closeOutside = false,
  closable = true,
  className,
  children,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  // 弹窗打开期间锁住页面滚动：原生 showModal 只让背景不可交互，滚轮仍会滚动 document，
  // 弹窗内滚到边界后背景就跟着动。隐藏滚动条会占掉宽度导致内容横向跳动，用等宽内边距补回。
  useEffect(() => {
    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [])

  const closeButton = (
    <button
      type="button"
      className={`${styles.close}${closeOutside ? ` ${styles.closeOutside}` : ''}`}
      onClick={onClose}
      disabled={!closable}
      aria-label={`关闭${title}`}
    >
      ×
    </button>
  )

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog}${
        closeOutside ? ` ${styles.dialogOutsideClose}` : ''
      }${className === undefined ? '' : ` ${className}`}`}
      aria-labelledby={titleId}
      // 不允许关闭时拦掉 Esc，否则原生行为会把弹窗关掉、请求结果就丢了
      onCancel={(event) => {
        if (!closable) event.preventDefault()
      }}
      onClose={() => onClose()}
    >
      {closeOutside && closeButton}
      <div className={styles.heading}>
        <div className={styles.headingText}>
          {eyebrow !== undefined && (
            <span className={styles.eyebrow}>{eyebrow}</span>
          )}
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
        </div>
        {!closeOutside && closeButton}
      </div>
      {children}
    </dialog>
  )
}
