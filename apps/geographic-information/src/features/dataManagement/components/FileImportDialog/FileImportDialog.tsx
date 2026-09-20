import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, UIEvent } from 'react'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import { useDatasetOptions } from '../../hooks/useDatasetOptions'
import type { GeoDataset } from '../../types/dataset'
import styles from './FileImportDialog.module.css'

interface FileImportDialogProps {
  readonly onClose: () => void
  /** 提交回调：由页面负责关窗、建任务、上传，并把占位条目放进「上传进度」 */
  readonly onSubmit: (input: {
    readonly dataSetId: string
    readonly files: readonly File[]
  }) => void
  /** 筛选框初始关键字：全部数据为空、分类为分类名、数据集为数据集名 */
  readonly initialKeyword: string
  /** 初始选中的数据集，从某个数据集进入时才有值 */
  readonly initialDataset: { readonly id: string; readonly name: string } | null
  /** 全量数据集，候选列表在本地筛选 */
  readonly datasets: readonly GeoDataset[]
  /** 数据集是否仍在加载 */
  readonly datasetsLoading: boolean
}

/**
 * 导入数据的弹窗。
 * 数据集通过关键字筛选后单选，提交时取记录 id 并把数据集与文件交给页面；
 * 提交后立即关闭，任务进度在「上传进度」中查看。
 */
export function FileImportDialog({
  onClose,
  onSubmit,
  initialKeyword,
  initialDataset,
  datasets: allDatasets,
  datasetsLoading,
}: FileImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const optionsRef = useRef<HTMLUListElement>(null)
  const titleId = useId()
  const datasetInputId = useId()
  const fileInputId = useId()
  const [keyword, setKeyword] = useState(initialKeyword)
  const [selected, setSelected] = useState(initialDataset)
  const [files, setFiles] = useState<readonly File[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const { datasets, hasMore, loadMore } = useDatasetOptions(
    allDatasets,
    keyword,
  )

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  // 筛选条件变化后回到列表顶部，否则会停在上一次的滚动位置
  useEffect(() => {
    optionsRef.current?.scrollTo({ top: 0 })
  }, [keyword])

  /** 候选项滚动到底部时继续拉下一页 */
  function handleOptionsScroll(event: UIEvent<HTMLUListElement>) {
    const element = event.currentTarget
    const distanceToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight
    if (distanceToBottom > 24) return
    loadMore()
  }

  function handleKeywordChange(value: string) {
    setKeyword(value)
    // 手工改动关键字即视为重新筛选，取消已选
    if (value !== selected?.name) setSelected(null)
  }

  function handlePick(id: string, name: string) {
    setSelected({ id, name })
    setKeyword(name)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    onSubmit({ dataSetId: selected.id, files })
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
          <ul
            ref={optionsRef}
            className={styles.options}
            onScroll={handleOptionsScroll}
          >
            {datasetsLoading ? (
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
            {!datasetsLoading && datasets.length > 0 && (
              <li className={styles.optionState} role="status">
                {hasMore ? '向下滚动加载更多' : '没有更多了。'}
              </li>
            )}
          </ul>
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
          <button type="button" className={styles.cancel} onClick={onClose}>
            取消
          </button>
          <button type="submit" className={styles.confirm}>
            确定
          </button>
        </div>
      </form>
    </dialog>
  )
}
