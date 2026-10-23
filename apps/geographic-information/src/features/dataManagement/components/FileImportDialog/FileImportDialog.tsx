import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, UIEvent } from 'react'
import { AppDialog } from '@ocean-cloud/ui'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import { useDatasetOptions } from '../../hooks/useDatasetOptions'
import type { GeoDataset } from '../../types/dataset'
import styles from './FileImportDialog.module.css'

/** 单批次文件数上限（后端分片上传的限制） */
const MAX_IMPORT_FILES = 100

/** 同名、同大小、同修改时间视为同一文件，避免重复选择后重复上传。 */
function fileKey(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`
}

function appendFiles(
  previous: readonly File[],
  picked: readonly File[],
): readonly File[] {
  const keys = new Set(previous.map(fileKey))
  const next = [...previous]
  for (const file of picked) {
    const key = fileKey(file)
    if (keys.has(key)) continue
    keys.add(key)
    next.push(file)
  }
  return next
}

interface FileImportDialogProps {
  readonly onClose: () => void
  /** 提交回调：由页面负责关窗、分片上传，并把占位条目放进「上传进度」 */
  readonly onSubmit: (input: {
    readonly dataSetId: string
    readonly files: readonly File[]
    readonly vectorPlacement: 'AUTO' | 'UNKNOWN'
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
  const optionsRef = useRef<HTMLUListElement>(null)
  const datasetInputId = useId()
  const fileInputId = useId()
  const [keyword, setKeyword] = useState(initialKeyword)
  const [selected, setSelected] = useState(initialDataset)
  const [files, setFiles] = useState<readonly File[]>([])
  const [vectorPlacement, setVectorPlacement] = useState<'AUTO' | 'UNKNOWN'>(
    'AUTO',
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const { datasets, hasMore, loadMore } = useDatasetOptions(
    allDatasets,
    keyword,
  )

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

  /** 多次选择累加文件，而不是用新一批覆盖之前的选择。 */
  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files ? Array.from(event.target.files) : []
    // 清空原生选择值，保证再次选择同一文件时也能触发 change。
    event.target.value = ''
    if (picked.length === 0) return
    setFiles((previous) => appendFiles(previous, picked))
    setValidationError(null)
  }

  /** 仅从待上传列表中移除，不会影响服务器上已有的数据。 */
  function handleRemoveFile(target: File) {
    const targetKey = fileKey(target)
    setFiles((previous) =>
      previous.filter((file) => fileKey(file) !== targetKey),
    )
    setValidationError(null)
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
    if (files.length > MAX_IMPORT_FILES) {
      setValidationError(`单批次最多导入 ${MAX_IMPORT_FILES} 个文件。`)
      return
    }
    setValidationError(null)
    onSubmit({ dataSetId: selected.id, files, vectorPlacement })
  }

  const selectedDataset = allDatasets.find(
    (dataset) => dataset.id === selected?.id,
  )

  return (
    <AppDialog title="导入GIS数据" onClose={onClose} className={styles.dialog}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.hint}>
          当前支持 GeoTIFF 和 RFC 7946 GeoJSON。GeoJSON 须使用 WGS84
          经纬度且不含旧版 crs
          声明。文件传输完成后将继续提取空间信息，最终结果请在“导入进度”中查看。
        </p>
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

        {Number(selectedDataset?.categoryId) === 2 && (
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={`${datasetInputId}-placement`}
            >
              矢量归组方式
            </label>
            <select
              id={`${datasetInputId}-placement`}
              className={styles.input}
              value={vectorPlacement}
              onChange={(event) =>
                setVectorPlacement(event.target.value as 'AUTO' | 'UNKNOWN')
              }
            >
              <option value="AUTO">自动识别业务分类</option>
              <option value="UNKNOWN">强制归入未知分类</option>
            </select>
            <p className={styles.hint}>
              自动识别按要素几何和属性分类；强制未知适合不希望套用当前规则的来源。
            </p>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor={fileInputId}>
            数据文件
          </label>
          <input
            id={fileInputId}
            className={styles.input}
            type="file"
            multiple
            onChange={handleFilesChange}
          />
          {files.length > 0 && (
            <div className={styles.fileSummary}>
              <p className={styles.hint}>已选择 {files.length} 个文件：</p>
              <ul className={styles.fileList}>
                {files.map((file) => (
                  <li className={styles.fileItem} key={fileKey(file)}>
                    <span className={styles.fileName} title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className={styles.fileRemove}
                      aria-label={`移除 ${file.name}`}
                      onClick={() => handleRemoveFile(file)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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
    </AppDialog>
  )
}
