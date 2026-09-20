import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import { updateDataset } from '../../services/datasetService'
import type { GeoDataset } from '../../types/dataset'
import styles from './DatasetEditDialog.module.css'

interface DatasetEditDialogProps {
  readonly dataset: GeoDataset
  readonly onClose: () => void
  /** 保存成功后的回调，带回更新后的记录，供调用方刷新目录并同步选中项 */
  readonly onUpdated: (updated: GeoDataset) => void
}

/**
 * 修改数据集的弹窗：只能改名称与描述。
 * 分类不允许变更，接口仍要求回传，因此按原值提交（后端后续会去掉该参数）。
 */
export function DatasetEditDialog({
  dataset,
  onClose,
  onUpdated,
}: DatasetEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [name, setName] = useState(dataset.dataSetName)
  const [description, setDescription] = useState(dataset.description)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const categoryLabel =
    DATASET_CATEGORY_LABELS[Number(dataset.categoryId)] ?? '未分类'

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dataSetName = name.trim()
    if (!dataSetName) {
      setValidationError('请填写数据集名称。')
      return
    }
    setValidationError(null)
    setIsSubmitting(true)
    const nextDescription = description.trim()
    try {
      await updateDataset({
        id: dataset.id,
        dataSetName,
        categoryId: Number(dataset.categoryId),
        description: nextDescription,
      })
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示，保留弹窗便于修改后重试
      setIsSubmitting(false)
      return
    }
    setIsSubmitting(false)
    onUpdated({ ...dataset, dataSetName, description: nextDescription })
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => onClose()}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title} id={titleId}>
          修改数据集
        </h2>

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
          <input className={styles.input} value={categoryLabel} readOnly />
          <span className={styles.hint}>分类不可修改</span>
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
            {isSubmitting ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
