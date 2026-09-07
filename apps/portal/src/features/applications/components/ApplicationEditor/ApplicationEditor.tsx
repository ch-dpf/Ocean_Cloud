import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  ApplicationInput,
  MicroApplication,
} from '../../../../types/application'
import styles from './ApplicationEditor.module.css'
interface ApplicationEditorProps {
  readonly application: MicroApplication | null
  readonly onClose: () => void
  readonly onSave: (input: ApplicationInput) => Promise<void>
}
export function ApplicationEditor({
  application,
  onClose,
  onSave,
}: ApplicationEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ApplicationInput>(
    application || {
      id: '',
      name: '',
      description: '',
      route: '/apps/',
      icon: '◈',
      enabled: true,
      isListed: true,
    },
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    nameInput.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])
  function change<K extends keyof ApplicationInput>(
    key: K,
    value: ApplicationInput[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === 'id' &&
      (!previous.route || previous.route === '/apps/' + previous.id)
        ? { route: '/apps/' + value }
        : {}),
    }))
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试。')
      setIsSaving(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault()
        if (!isSaving) onClose()
      }}
    >
      <form onSubmit={(event) => void handleSubmit(event)}>
        <header>
          <div>
            <span className="eyebrow">APPLICATION SETUP</span>
            <h2>{application ? '编辑应用' : '创建应用'}</h2>
          </div>
          <button
            type="button"
            aria-label="关闭应用表单"
            disabled={isSaving}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className={styles.fields}>
          <label>
            应用名称
            <input
              ref={nameInput}
              required
              maxLength={40}
              value={form.name}
              onChange={(event) => change('name', event.target.value)}
              placeholder="例如：海洋观测"
            />
          </label>
          <label>
            应用标识
            <input
              required
              disabled={!!application}
              pattern="[a-z][a-z0-9]*(-[a-z0-9]+)*"
              maxLength={48}
              value={form.id}
              onChange={(event) => change('id', event.target.value)}
              placeholder="例如：ocean-observation"
            />
            <small>小写字母、数字和短横线，创建后不可修改。</small>
          </label>
          <label>
            入口路由
            <input
              required
              pattern="/apps/[a-z][a-z0-9]*(-[a-z0-9]+)*"
              maxLength={80}
              value={form.route}
              onChange={(event) => change('route', event.target.value)}
            />
            <small>应用入口使用当前标签页，路由不能与其他应用重复。</small>
          </label>
          <label>
            应用描述
            <textarea
              maxLength={200}
              rows={3}
              value={form.description}
              onChange={(event) => change('description', event.target.value)}
              placeholder="描述此应用的业务用途"
            />
          </label>
          <label>
            应用图标
            <select
              value={form.icon}
              onChange={(event) => change('icon', event.target.value)}
            >
              <option value="◈">◈ 通用应用</option>
              <option value="▧">▧ 地理信息</option>
              <option value="≈">≈ 海洋信息</option>
              <option value="◎">◎ 数据观测</option>
            </select>
          </label>
          <div className={styles.switches}>
            <label>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => change('enabled', event.target.checked)}
              />
              启用应用
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isListed}
                onChange={(event) => change('isListed', event.target.checked)}
              />
              在应用中心展示
            </label>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <footer>
          <button type="button" disabled={isSaving} onClick={onClose}>
            取消
          </button>
          <button className={styles.primary} disabled={isSaving}>
            {isSaving ? '正在提交…' : application ? '保存配置' : '创建应用'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
