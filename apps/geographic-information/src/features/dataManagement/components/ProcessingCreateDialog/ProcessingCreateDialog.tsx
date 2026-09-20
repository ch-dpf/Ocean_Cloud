import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  GEOTIFF_BLOCK_SIZE_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  PROCESSING_TYPE_OPTIONS,
  TARGET_CRS_OPTIONS,
  TILE_PROFILE_OPTIONS,
} from '../../constants/task'
import type { ProcessingParameters } from '../../types/task'
import styles from './ProcessingCreateDialog.module.css'

/** 文件来源页签：当前只开放本地上传 */
const SOURCE_TABS = [
  { key: 'local', label: '本地上传' },
  { key: 'server', label: '服务器文件' },
  { key: 'managed', label: '数据管理数据' },
] as const

interface ProcessingCreateDialogProps {
  readonly onClose: () => void
  /** 校验通过后的提交回调：由页面负责关窗、发起请求并刷新任务列表 */
  readonly onSubmit: (input: {
    readonly processingType: string
    readonly taskName: string
    readonly parameters: ProcessingParameters
    readonly files: readonly File[]
  }) => void
}

/**
 * 新建处理任务弹窗：选切片类型、任务名称与待处理文件，预处理参数暂各只有一个取值。
 * 服务器文件、数据管理数据两个来源尚未接入，先置灰。
 */
export function ProcessingCreateDialog({
  onClose,
  onSubmit,
}: ProcessingCreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const fileInputId = useId()
  const [processingType, setProcessingType] = useState<string>(
    PROCESSING_TYPE_OPTIONS[0].value,
  )
  const [taskName, setTaskName] = useState('')
  const [files, setFiles] = useState<readonly File[]>([])
  const [targetCrs, setTargetCrs] = useState<string>(
    TARGET_CRS_OPTIONS[0].value,
  )
  const [blockSize, setBlockSize] = useState<string>(
    GEOTIFF_BLOCK_SIZE_OPTIONS[0].value,
  )
  const [tileProfile, setTileProfile] = useState<string>(
    TILE_PROFILE_OPTIONS[0].value,
  )
  const [outputFormat, setOutputFormat] = useState<string>(
    OUTPUT_FORMAT_OPTIONS[0].value,
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const selectedType =
    PROCESSING_TYPE_OPTIONS.find((option) => option.value === processingType) ??
    PROCESSING_TYPE_OPTIONS[0]

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = taskName.trim()
    if (name === '') {
      setValidationError('请填写任务名称。')
      return
    }
    if (files.length === 0) {
      setValidationError('请选择要处理的文件。')
      return
    }
    setValidationError(null)
    onSubmit({
      processingType,
      taskName: name,
      parameters: { targetCrs, tileProfile, outputFormat },
      files,
    })
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
          新建处理任务
        </h2>

        <div className={styles.tabs} role="tablist" aria-label="文件来源">
          {SOURCE_TABS.map((tab) => {
            const isActive = tab.key === 'local'
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`}
                disabled={!isActive}
                title={isActive ? undefined : '暂未开放'}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>处理任务类型</span>
          <div className={styles.radioRow}>
            {PROCESSING_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`${styles.radio}${
                  option.disabled ? ` ${styles.radioDisabled}` : ''
                }`}
                title={option.disabled ? '暂未开放' : undefined}
              >
                <input
                  type="radio"
                  name="processingType"
                  value={option.value}
                  checked={option.value === processingType}
                  disabled={option.disabled}
                  onChange={() => setProcessingType(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>任务名称</span>
          <input
            className={styles.input}
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="请输入任务名称"
          />
        </label>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={fileInputId}>
            {selectedType.dataLabel}
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

        <div className={styles.section}>
          <p className={styles.sectionTitle}>高级选项</p>
          <p className={styles.subTitle}>预处理</p>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>目标坐标系</span>
              <select
                className={styles.input}
                value={targetCrs}
                onChange={(event) => setTargetCrs(event.target.value)}
              >
                {TARGET_CRS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>GEOTIFF 块大小</span>
              <select
                className={styles.input}
                value={blockSize}
                onChange={(event) => setBlockSize(event.target.value)}
              >
                {GEOTIFF_BLOCK_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>瓦片切分剖面</span>
              <select
                className={styles.input}
                value={tileProfile}
                onChange={(event) => setTileProfile(event.target.value)}
              >
                {TILE_PROFILE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>输出格式</span>
              <select
                className={styles.input}
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value)}
              >
                {OUTPUT_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
