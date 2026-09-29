import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  IMAGERY_OUTPUT_FORMAT_OPTIONS,
  IMAGERY_TARGET_CRS_OPTIONS,
  IMAGERY_TILE_PROFILE_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  PROCESSING_TYPE_IMAGERY,
  PROCESSING_TYPE_OPTIONS,
  TARGET_CRS_OPTIONS,
  TILE_PROFILE_OPTIONS,
  toProcessingTypeLabel,
} from '../../constants/task'
import type { FileMeta } from '../../types/fileMeta'
import type { ProcessingParameters } from '../../types/task'
import { ManagedFileSelectOverlay } from '../ManagedFileSelectOverlay/ManagedFileSelectOverlay'
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
  readonly fileMetaIds: readonly string[]
}

/** 服务器文件的提交内容：只带工作区内的相对路径，文件由后端解析 */
export interface WorkspaceSubmitInput {
  readonly processingType: string
  readonly taskName: string
  readonly parameters: ProcessingParameters
  readonly relativePath: string
}

interface ProcessingCreateDialogProps {
  readonly onClose: () => void
  /**
   * 预置的数据管理文件：传入时默认且锁定在「数据管理数据」页签，该条只读不可改（数据管理页入口）。
   * 不传入时该页签在影像切片下可用，可在数据管理数据里勾选多个文件。
   */
  readonly presetFile?: ManagedFileRef
  /**
   * 锁定的处理类型：传入时处理类型不可切换（其余选项置灰），
   * 预处理参数也按该类型初始化。数据管理页按文件分类锁定用。
   */
  readonly lockedProcessingType?: string
  /** 本地上传的提交回调；由页面负责关窗、发起请求并刷新任务列表 */
  readonly onSubmitLocal?: (input: LocalSubmitInput) => void
  /** 数据管理数据的提交回调 */
  readonly onSubmitManaged?: (input: ManagedSubmitInput) => void
  /** 服务器文件的提交回调 */
  readonly onSubmitWorkspace?: (input: WorkspaceSubmitInput) => void
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

/** 选项统一成 { value, label }：没有单独标签的直接用取值展示 */
function toOptions(
  options: readonly { readonly value: string; readonly label?: string }[],
): readonly { readonly value: string; readonly label: string }[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label ?? option.value,
  }))
}

/** 默认任务名称：只选了一个文件时带上文件名，其余情况只用处理类型名 */
function buildDefaultTaskName(
  typeLabel: string,
  fileNames: readonly string[],
): string {
  return fileNames.length === 1 ? `${typeLabel}：${fileNames[0]}` : typeLabel
}

/**
 * 新建处理任务弹窗：选切片类型、任务名称与待处理文件，预处理参数按类型给出下拉框。
 * 数据来源分三个页签：本地上传（文件以 multipart 提交）、数据管理数据（已登记文件，
 * 只带文件标识）、服务器文件（工作区内的相对路径，文件由后端解析）。
 */
export function ProcessingCreateDialog({
  onClose,
  presetFile,
  lockedProcessingType,
  onSubmitLocal,
  onSubmitManaged,
  onSubmitWorkspace,
}: ProcessingCreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const fileInputId = useId()
  const pathInputId = useId()
  const hasPresetFile = presetFile !== undefined
  // 从数据管理页进入时锁定在「数据管理数据」，否则只用本地上传
  const [sourceTab, setSourceTab] = useState<SourceTabKey>(
    hasPresetFile ? 'managed' : 'local',
  )
  // 处理类型锁定后不可切换，只允许匹配的那一项
  const isTypeLocked = lockedProcessingType !== undefined
  const initialProcessingType =
    lockedProcessingType ?? PROCESSING_TYPE_OPTIONS[0].value
  // 影像用另一套预处理默认值：锁定时必须按锁定类型取，否则会带出地形的参数
  const isInitialImagery = initialProcessingType === PROCESSING_TYPE_IMAGERY
  const [processingType, setProcessingType] = useState(initialProcessingType)
  const [taskName, setTaskName] = useState('')
  // 用户是否手改过任务名称：没改过时名称跟随处理类型与已选文件自动更新
  const [isNameEdited, setIsNameEdited] = useState(false)
  const [files, setFiles] = useState<readonly File[]>([])
  // 数据管理数据页签选中的文件：由入口页预置（单条）或在选择浮层里多选
  const [managedFiles, setManagedFiles] = useState<readonly FileMeta[]>([])
  // 是否正在选择数据：为 true 时整层让位给选择浮层
  const [isSelecting, setIsSelecting] = useState(false)
  // 服务器文件页签的相对路径：留空时提交会被拦下
  const [relativePath, setRelativePath] = useState('')
  const [targetCrs, setTargetCrs] = useState<string>(
    isInitialImagery
      ? IMAGERY_TARGET_CRS_OPTIONS[0].value
      : TARGET_CRS_OPTIONS[0].value,
  )
  const [tileProfile, setTileProfile] = useState<string>(
    isInitialImagery
      ? IMAGERY_TILE_PROFILE_OPTIONS[0].value
      : TILE_PROFILE_OPTIONS[0].value,
  )
  const [outputFormat, setOutputFormat] = useState<string>(
    isInitialImagery
      ? IMAGERY_OUTPUT_FORMAT_OPTIONS[0].value
      : OUTPUT_FORMAT_OPTIONS[0].value,
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const selectedType =
    PROCESSING_TYPE_OPTIONS.find((option) => option.value === processingType) ??
    PROCESSING_TYPE_OPTIONS[0]
  const isImagery = processingType === PROCESSING_TYPE_IMAGERY
  // 地形与影像的候选值不同，界面各只保留推荐的那一个
  const targetCrsOptions = toOptions(
    isImagery ? IMAGERY_TARGET_CRS_OPTIONS : TARGET_CRS_OPTIONS,
  )
  const tileProfileOptions = toOptions(
    isImagery ? IMAGERY_TILE_PROFILE_OPTIONS : TILE_PROFILE_OPTIONS,
  )
  const outputFormatOptions = toOptions(
    isImagery ? IMAGERY_OUTPUT_FORMAT_OPTIONS : OUTPUT_FORMAT_OPTIONS,
  )
  // 当前已选文件名：数据管理页入口是锁定的一条，服务器文件页签取不到文件名
  const selectedFileNames =
    presetFile !== undefined
      ? [presetFile.originalName]
      : sourceTab === 'managed'
        ? managedFiles.map((file) => file.originalName)
        : sourceTab === 'local'
          ? files.map((file) => file.name)
          : []
  // 未手改时任务名称用「处理类型名（+ 文件名）」的默认值
  const effectiveTaskName = isNameEdited
    ? taskName
    : buildDefaultTaskName(
        toProcessingTypeLabel(processingType),
        selectedFileNames,
      )

  // 选择浮层期间 <dialog> 会卸载，关闭后需要重新打开
  useEffect(() => {
    if (isSelecting) return
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [isSelecting])

  /** 切换处理类型时把预处理参数重置为该类型的默认值，避免残留上一类型的取值 */
  function handleTypeChange(value: string) {
    setProcessingType(value)
    // 已选数据与本地文件可能与被切换后的类型不符，直接清空避免错配
    setManagedFiles([])
    setFiles([])
    if (value === PROCESSING_TYPE_IMAGERY) {
      setTargetCrs(IMAGERY_TARGET_CRS_OPTIONS[0].value)
      setTileProfile(IMAGERY_TILE_PROFILE_OPTIONS[0].value)
      setOutputFormat(IMAGERY_OUTPUT_FORMAT_OPTIONS[0].value)
      return
    }
    setTargetCrs(TARGET_CRS_OPTIONS[0].value)
    setTileProfile(TILE_PROFILE_OPTIONS[0].value)
    setOutputFormat(OUTPUT_FORMAT_OPTIONS[0].value)
  }

  /**
   * 本地上传选文件：在已有选择上追加，同名同大小视为同一个文件不再重复加入。
   * 影像切片一次只处理一个数据，已选一个后再选会被拒绝并提示，不替换原来那条。
   */
  function handleLocalFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files ? Array.from(event.target.files) : []
    // 清空 value，便于再次选中同一个文件
    event.target.value = ''
    if (picked.length === 0) return
    if (isImagery) {
      if (files.length > 0) {
        setValidationError('影像切片一次仅支持一个文件。')
        return
      }
      setValidationError(null)
      setFiles([picked[0]])
      return
    }
    setFiles((previous) => {
      const next = [...previous]
      for (const file of picked) {
        const exists = next.some(
          (item) => item.name === file.name && item.size === file.size,
        )
        if (!exists) next.push(file)
      }
      return next
    })
    setValidationError(null)
  }

  /**
   * 页签可用性：数据来源与处理类型无关，数据管理数据始终可点；
   * 本地上传与服务器文件只从「新建处理任务」进入时可用，
   * 数据管理页的单条处理入口锁定在「数据管理数据」这一页签上。
   */
  function isTabEnabled(key: SourceTabKey): boolean {
    if (key === 'managed') return true
    return !hasPresetFile
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = effectiveTaskName.trim()
    if (name === '') {
      setValidationError('请填写任务名称。')
      return
    }
    // 影像的层级、重采样、透明背景由后端自行计算，这里只下发界面可见的三个参数
    const parameters: ProcessingParameters = {
      targetCrs,
      tileProfile,
      outputFormat,
    }

    if (sourceTab === 'managed') {
      const fileMetaIds =
        presetFile === undefined
          ? managedFiles.map((file) => file.id)
          : [presetFile.id]
      if (fileMetaIds.length === 0) {
        setValidationError('请选择要处理的数据。')
        return
      }
      if (onSubmitManaged === undefined) return
      setValidationError(null)
      onSubmitManaged({
        processingType,
        taskName: name,
        parameters,
        fileMetaIds,
      })
      return
    }

    if (sourceTab === 'server') {
      const path = relativePath.trim()
      if (path === '') {
        setValidationError('请填写相对路径。')
        return
      }
      if (onSubmitWorkspace === undefined) return
      setValidationError(null)
      onSubmitWorkspace({
        processingType,
        taskName: name,
        parameters,
        relativePath: path,
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

  // 选择数据期间让位给选择浮层：<dialog> 卸载，但组件状态（任务名称、参数、已选文件）保留
  if (isSelecting) {
    return (
      <ManagedFileSelectOverlay
        processingType={processingType}
        initialSelected={managedFiles}
        onCancel={() => setIsSelecting(false)}
        onConfirm={(files) => {
          setManagedFiles(files)
          setIsSelecting(false)
        }}
      />
    )
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
                title={enabled ? undefined : '从数据管理页进入时不可切换'}
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
            {PROCESSING_TYPE_OPTIONS.map((option) => {
              // 处理类型被锁定时，只有匹配的那一项可选
              const isLockedOut =
                isTypeLocked && option.value !== lockedProcessingType
              const isDisabled = option.disabled || isLockedOut
              return (
                <label
                  key={option.value}
                  className={`${styles.radio}${
                    isDisabled ? ` ${styles.radioDisabled}` : ''
                  }`}
                  title={
                    option.disabled
                      ? '暂未开放'
                      : isLockedOut
                        ? '与当前数据类型不匹配'
                        : undefined
                  }
                >
                  <input
                    type="radio"
                    name="processingType"
                    value={option.value}
                    checked={option.value === processingType}
                    disabled={isDisabled}
                    onChange={() => handleTypeChange(option.value)}
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>任务名称</span>
          <input
            className={styles.input}
            value={effectiveTaskName}
            onChange={(event) => {
              setIsNameEdited(true)
              setTaskName(event.target.value)
            }}
            placeholder="请输入任务名称"
          />
        </label>

        {sourceTab === 'managed' ? (
          presetFile === undefined ? (
            // 从「新建处理任务」进入：点「选取文件」打开选择浮层，可多选
            <div className={styles.field}>
              <span className={styles.label}>{selectedType.dataLabel}</span>
              <div className={styles.pickRow}>
                <button
                  type="button"
                  className={styles.pickButton}
                  onClick={() => setIsSelecting(true)}
                >
                  选取文件
                </button>
                <span className={styles.pickCount}>
                  已选 {managedFiles.length} 个
                </span>
              </div>
              {managedFiles.length > 0 && (
                <ul className={styles.pickedList}>
                  {managedFiles.map((file) => (
                    <li className={styles.pickedItem} key={file.id}>
                      <span
                        className={styles.pickedName}
                        title={file.originalName}
                      >
                        {file.originalName}
                      </span>
                      <button
                        type="button"
                        className={styles.pickedRemove}
                        aria-label={`移除 ${file.originalName}`}
                        onClick={() =>
                          setManagedFiles((previous) =>
                            previous.filter((item) => item.id !== file.id),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            // 从数据管理页进入：该条由入口页锁定，只读展示
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
                  {presetFile.extension} ·{' '}
                  {formatFileSize(presetFile.sizeBytes)}
                </span>
              </div>
            </div>
          )
        ) : sourceTab === 'server' ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={pathInputId}>
              相对路径
            </label>
            <input
              id={pathInputId}
              className={styles.input}
              value={relativePath}
              onChange={(event) => setRelativePath(event.target.value)}
              placeholder="请输入工作区内的相对路径，如：data/input.tif"
            />
            <p className={styles.hint}>路径相对工作区根目录。</p>
            {isImagery && (
              <p className={styles.hint}>
                影像切片一次仅支持一个数据，请填写单个文件的相对路径。
              </p>
            )}
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
              // 影像切片一次只处理一个数据，地形可多选
              multiple={!isImagery}
              onChange={handleLocalFilesChange}
            />
            {isImagery && (
              <p className={styles.hint}>影像切片一次仅支持上传一个文件。</p>
            )}
            {files.length > 0 && (
              <ul className={styles.pickedList}>
                {files.map((item) => (
                  <li
                    className={styles.pickedItem}
                    key={`${item.name}:${item.size}:${item.lastModified}`}
                  >
                    <span className={styles.pickedName} title={item.name}>
                      {item.name}
                    </span>
                    <button
                      type="button"
                      className={styles.pickedRemove}
                      aria-label={`移除 ${item.name}`}
                      onClick={() =>
                        setFiles((previous) =>
                          previous.filter((file) => file !== item),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <p className={styles.label}>处理参数</p>
          <div className={styles.section}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.label}>目标坐标系</span>
                <select
                  className={styles.input}
                  value={targetCrs}
                  onChange={(event) => setTargetCrs(event.target.value)}
                >
                  {targetCrsOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>瓦片编号方案</span>
                <select
                  className={styles.input}
                  value={tileProfile}
                  onChange={(event) => setTileProfile(event.target.value)}
                >
                  {tileProfileOptions.map((option) => (
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
                  {outputFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
