import { useEffect } from 'react'
import styles from './Toast.module.css'

export type ToastType = 'success' | 'error' | 'warning'

export interface ToastData {
  readonly id: number
  readonly type: ToastType
  readonly text: string
}

interface ToastProps {
  readonly toast: ToastData | null
  readonly onDismiss: () => void
}

/** 轻量提示条：顶部居中弹出，3 秒后自动消失 */
export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onDismiss, 3000)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert">
      {toast.text}
    </div>
  )
}
