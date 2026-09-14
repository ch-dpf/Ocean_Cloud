import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import { useDatasetOptions } from '../../hooks/useDatasetOptions'
import { uploadFileMeta } from '../../services/fileMetaService'
import { Pager } from '../Pager/Pager'
import styles from './FileImportDialog.module.css'

interface FileImportDialogProps {
  readonly onClose: () => void
  /** 任务提交成功后的回调：关闭弹窗，进度到「上传进度」里看 */
  readonly onSubmitted: () => void
  /** 筛选框初始关键字：全部数据为空、分类为分类名、数据集为数据集名 */
  readonly initialKeyword: string
  /** 初始选中的数据集，从某个数据集进入时才有值 */
  readonly initialDataset: { readonly id: string; readonly name: string } | null
}

/**
 * 导入数据的弹窗。
 * 数据集通过关键字筛选后单选，提交时取记录 id；提交成功即关闭，任务进度在「上传进度」中查看。
 */
export function FileImportDialog({
  onClose,
  onSubmitted,
  initialKeyword,
  initialDataset,
}: FileImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const datasetInputId = useId()
  const fileInputId = useId()
  const [keyword, setKeyword] = useState(initialKeyword)
  const [selected, setSelected] = useState(initialDataset)
  const [files, setFiles] = useState<readonly File[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { datasets, current, lastPage, isLoading, error, goToPage } =
    useDatasetOptions(keyword)

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  function handleKeywordChange(value: string) {
    setKeyword(value)
    // 手工改动关键字即视为重新筛选，取消已选
    if (value !== selected?.name) setSelected(null)
  }

  function handlePick(id: string, name: string) {
    setSelected({ id, name })
    setKeyword(name)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selected === null) {
      setValidationError('请选择数据集。')
      return
    }
    if (files.length === 0) {
      setValidationError('请选择要导入的文件。')
      return
    }
    setValidationError(null)
    setIsSubmitting(true)
    try {
      await uploadFileMeta({ dataSetId: selected.id, files })
      onSubmitted()
      return
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示，保留弹窗便于修改后重试
    }
    setIsSubmitting(false)
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
          导入GIS数据
        </h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={datasetInputId}>
            数据集
          </label>
          <input
            id={datasetInputId}
            className={styles.input}
            value={keyword}
            onChange={(event) => handleKeywordChange(event.target.value)}
            placeholder="输入分类名或数据集名筛选"
            autoComplete="off"
          />
          <p className={styles.hint}>清空输入可查看全部数据集。</p>
          <ul className={styles.options}>
            {error ? (
              <li className={styles.optionState} role="alert">
                {error}
              </li>
            ) : isLoading ? (
              <li className={styles.optionState} role="status">
                正在加载数据集…
              </li>
            ) : datasets.length === 0 ? (
              <li className={styles.optionState}>没有匹配的数据集。</li>
            ) : (
              datasets.map((dataset) => {
                const isPicked = dataset.id === selected?.id
                return (
                  <li key={dataset.id}>
                    <button
                      type="button"
                      className={`${styles.option}${
                        isPicked ? ` ${styles.optionActive}` : ''
                      }`}
                      onClick={() =>
                        handlePick(dataset.id, dataset.dataSetName)
                      }
                      aria-pressed={isPicked}
                    >
                      <span className={styles.optionName}>
                        {dataset.dataSetName}
                      </span>
                      <span className={styles.optionCategory}>
                        {DATASET_CATEGORY_LABELS[Number(dataset.categoryId)]}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <Pager current={current} lastPage={lastPage} onChange={goToPage} />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={fileInputId}>
            数据文件
          </label>
          <input
            id={fileInputId}
            className={styles.input}
            type="file"
            multiple
            onChange={(event) =>
              setFiles(event.target.files ? Array.from(event.target.files) : [])
            }
          />
          {files.length > 0 && (
            <p className={styles.hint}>
              已选择 {files.length} 个文件：
              {files.map((item) => item.name).join('、')}
            </p>
          )}
        </div>

        {validationError && (
          <p className={styles.error} role="alert">
            {validationError}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
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
    </dialog>
  )
}
