import { useState } from 'react'
import type { FormEvent } from 'react'
import { AppDialog } from '@ocean-cloud/ui'
import {
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
} from '../../constants/dataset'
import { createDataset } from '../../services/datasetService'
import styles from './DatasetCreateDialog.module.css'

interface DatasetCreateDialogProps {
  readonly onClose: () => void
  /** 新增成功后回调，参数为所属分类，供调用方刷新对应数据 */
  readonly onCreated: (categoryId: number) => void
}

export function DatasetCreateDialog({
  onClose,
  onCreated,
}: DatasetCreateDialogProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dataSetName = name.trim()
    if (!dataSetName) {
      setValidationError('请填写数据集名称。')
      return
    }
    if (!categoryId) {
      setValidationError('请选择数据集分类。')
      return
    }
    setValidationError(null)
    setIsSubmitting(true)
    try {
      await createDataset({
        dataSetName,
        categoryId: Number(categoryId),
        description: description.trim(),
      })
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示，保留弹窗便于修改后重试
      setIsSubmitting(false)
      return
    }
    setIsSubmitting(false)
    onCreated(Number(categoryId))
    onClose()
  }

  return (
    <AppDialog title="新增数据集" onClose={onClose} className={styles.dialog}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>数据集名称</span>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="请输入数据集名称"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>数据集分类</span>
          <select
            className={styles.input}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">请选择数据集分类</option>
            {DATASET_CATEGORY_ORDER.map((id) => (
              <option key={id} value={id}>
                {DATASET_CATEGORY_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>数据集描述</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="可不填"
            rows={3}
          />
        </label>

        {validationError && (
          <p className={styles.error} role="alert">
            {validationError}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => onClose()}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className={styles.confirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中…' : '确定'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}
