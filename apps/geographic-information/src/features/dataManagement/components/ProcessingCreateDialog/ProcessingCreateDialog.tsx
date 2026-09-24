import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  GEOTIFF_BLOCK_SIZE_OPTIONS,
  IMAGERY_FIXED_PARAMETERS,
  IMAGERY_OUTPUT_FORMAT_OPTIONS,
  IMAGERY_TARGET_CRS_OPTIONS,
  IMAGERY_TILE_PROFILE_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  PROCESSING_TYPE_IMAGERY,
  PROCESSING_TYPE_OPTIONS,
  TARGET_CRS_OPTIONS,
  TILE_PROFILE_OPTIONS,
} from '../../constants/task'
import type { ProcessingParameters } from '../../types/task'
import styles from './ProcessingCreateDialog.module.css'

/** 文件来源页签 */
const SOURCE_TABS = [
  { key: 'local', label: '本地上传' },
  { key: 'server', label: '服务器文件' },
  { key: 'managed', label: '数据管理数据' },
] as const

type SourceTabKey = (typeof SOURCE_TABS)[number]['key']

/** 预置的数据管理文件：传入时锁定在「数据管理数据」页签，该条只读不可改 */
export interface ManagedFileRef {
  readonly id: string
  readonly originalName: string
  readonly extension: string
  readonly sizeBytes: string
}

/** 本地上传的提交内容：文件以 multipart 上传 */
export interface LocalSubmitInput {
  readonly processingType: string
  readonly taskName: string
  readonly parameters: ProcessingParameters
  readonly files: readonly File[]
}

/** 数据管理数据的提交内容：只带文件标识，不上传文件内容 */
export interface ManagedSubmitInput {
  readonly processingType: string
  readonly taskName: string
  readonly parameters: ProcessingParameters
  readonly fileMetaId: string
}

interface ProcessingCreateDialogProps {
  readonly onClose: () => void
  /**
   * 预置的数据管理文件：传入时默认且锁定在「数据管理数据」页签（从数据管理页进入）；
   * 不传时「数据管理数据」页签置灰（从「新建处理任务」进入，数据列表接口尚未接入）。
   */
  readonly presetFile?: ManagedFileRef
  /** 本地上传的提交回调；由页面负责关窗、发起请求并刷新任务列表 */
  readonly onSubmitLocal?: (input: LocalSubmitInput) => void
  /** 数据管理数据的提交回调 */
  readonly onSubmitManaged?: (input: ManagedSubmitInput) => void
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** 后端返回字节数字符串，展示为带单位的可读大小 */
function formatFileSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes)
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${SIZE_UNITS[unit]}`
}

/**
 * 新建处理任务弹窗：选切片类型、任务名称与待处理文件，预处理参数暂各只有一个取值。
 * 数据来源分三个页签：本地上传（文件以 multipart 提交）、数据管理数据（已登记文件，
 * 只带文件标识）、服务器文件（暂未接入）。传入 presetFile 时锁定在「数据管理数据」。
 */
export function ProcessingCreateDialog({
  onClose,
  presetFile,
  onSubmitLocal,
  onSubmitManaged,
}: ProcessingCreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const fileInputId = useId()
  const hasPresetFile = presetFile !== undefined
  // 从数据管理页进入时锁定在「数据管理数据」，否则只用本地上传
  const [sourceTab, setSourceTab] = useState<SourceTabKey>(
    hasPresetFile ? 'managed' : 'local',
  )
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
  const isImagery = processingType === PROCESSING_TYPE_IMAGERY

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  /** 切换处理类型时把预处理参数重置为该类型的默认值，避免残留上一类型的取值 */
  function handleTypeChange(value: string) {
    setProcessingType(value)
    if (value === PROCESSING_TYPE_IMAGERY) {
      setTargetCrs(IMAGERY_TARGET_CRS_OPTIONS[0].value)
      setTileProfile(IMAGERY_TILE_PROFILE_OPTIONS[0].value)
      setOutputFormat(IMAGERY_OUTPUT_FORMAT_OPTIONS[0].value)
    } else {
      setTargetCrs(TARGET_CRS_OPTIONS[0].value)
      setTileProfile(TILE_PROFILE_OPTIONS[0].value)
      setOutputFormat(OUTPUT_FORMAT_OPTIONS[0].value)
    }
  }

  /** 页签可用性：服务器文件未接入；数据管理数据只在传入预置文件时可用（且锁定） */
  function isTabEnabled(key: SourceTabKey): boolean {
    if (key === 'server') return false
    if (key === 'managed') return hasPresetFile
    return !hasPresetFile
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = taskName.trim()
    if (name === '') {
      setValidationError('请填写任务名称。')
      return
    }
    const parameters: ProcessingParameters = isImagery
      ? { targetCrs, tileProfile, outputFormat, ...IMAGERY_FIXED_PARAMETERS }
      : { targetCrs, tileProfile, outputFormat }

    if (sourceTab === 'managed') {
      if (presetFile === undefined) {
        setValidationError('未选择数据管理数据。')
        return
      }
      if (onSubmitManaged === undefined) return
      setValidationError(null)
      onSubmitManaged({
        processingType,
        taskName: name,
        parameters,
        fileMetaId: presetFile.id,
      })
      return
    }

    if (files.length === 0) {
      setValidationError('请选择要处理的文件。')
      return
    }
    if (onSubmitLocal === undefined) return
    setValidationError(null)
    onSubmitLocal({ processingType, taskName: name, parameters, files })
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
            const isActive = tab.key === sourceTab
            const enabled = isTabEnabled(tab.key)
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`}
                disabled={!enabled}
                title={enabled ? undefined : '暂未开放'}
                onClick={() => setSourceTab(tab.key)}
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
                  onChange={() => handleTypeChange(option.value)}
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

        {sourceTab === 'managed' && presetFile !== undefined ? (
          // 数据管理数据：该条由入口页锁定，只读展示
          <div className={styles.field}>
            <span className={styles.label}>{selectedType.dataLabel}</span>
            <div className={styles.readonlyFile}>
              <span
                className={styles.readonlyName}
                title={presetFile.originalName}
              >
                {presetFile.originalName}
              </span>
              <span className={styles.readonlyMeta}>
                {presetFile.extension} · {formatFileSize(presetFile.sizeBytes)}
              </span>
            </div>
          </div>
        ) : (
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
                setFiles(
                  event.target.files ? Array.from(event.target.files) : [],
                )
              }
            />
            {files.length > 0 && (
              <p className={styles.hint}>
                已选择 {files.length} 个文件：
                {files.map((item) => item.name).join('、')}
              </p>
            )}
          </div>
        )}

        <div className={styles.section}>
          <p className={styles.sectionTitle}>高级选项</p>
          <p className={styles.subTitle}>预处理</p>
          <div className={styles.grid}>
            {isImagery ? (
              <>
                <label className={styles.field}>
                  <span className={styles.label}>目标坐标系</span>
                  <select
                    className={styles.input}
                    value={targetCrs}
                    onChange={(event) => setTargetCrs(event.target.value)}
                  >
                    {IMAGERY_TARGET_CRS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>瓦片格式</span>
                  <select
                    className={styles.input}
                    value={outputFormat}
                    onChange={(event) => setOutputFormat(event.target.value)}
                  >
                    {IMAGERY_OUTPUT_FORMAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>服务格式</span>
                  <select
                    className={styles.input}
                    value={tileProfile}
                    onChange={(event) => setTileProfile(event.target.value)}
                  >
                    {IMAGERY_TILE_PROFILE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
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
              </>
            )}
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
