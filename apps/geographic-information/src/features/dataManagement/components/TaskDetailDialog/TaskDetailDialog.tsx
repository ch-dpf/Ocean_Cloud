import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AppDialog,
  PROGRESS_COLORS,
  STATUS_COLORS,
  STATUS_TINTS,
  cellText,
  copyText,
  formatDuration,
  formatFileSize,
  formatTime,
} from '@ocean-cloud/ui'
import styles from './TaskDetailDialog.module.css'
import imageryIcon from '../../../../assets/icons/Imagery.svg'
import terrainIcon from '../../../../assets/icons/Terrain.svg'
import vectorIcon from '../../../../assets/icons/Vector.svg'
import productIcon from '../../../../assets/icons/Product.svg'
import copyIcon from '../../../../assets/icons/Copy.svg'
import {
  PROCESSING_TYPE_IMAGERY,
  PROCESSING_TYPE_TERRAIN,
  PROCESSING_TYPE_VECTOR,
  toInputStatusLabel,
  toProcessingStageIndex,
  toProcessingStageLabel,
  toProcessingTypeLabel,
  toSourceTypeLabel,
  toTaskStatusLabel,
  toTileSetStatusLabel,
} from '../../constants/task'
import { getTaskDetail } from '../../services/taskService'
import type {
  TaskDetail,
  TaskDetailInfo,
  TaskPublishTarget,
} from '../../types/task'

interface TaskDetailDialogProps {
  readonly taskId: string
  readonly onClose: () => void
  /** 本次会话收到过该任务的 WS 帧时的实时百分比（当前阶段内进度）；没有帧时为 null */
  readonly livePercent?: number | null
  /** 帧里的当前阶段代号（currentStage.code）；没有帧时为空串 */
  readonly liveStageCode?: string
  /** 点击「发布」；不传时按钮仅作为占位展示 */
  readonly onPublish?: (task: TaskPublishTarget) => void
  /** 正在发布时按钮显示「发布中…」 */
  readonly publishing?: boolean
}

interface SummaryField {
  readonly label: string
  readonly value: string
}

/** 可空数字（int32 也可能以字符串返回） */
function numberText(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/** 布尔展示为 是 / 否；null 为 — */
function boolText(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value ? '是' : '否'
}

/**
 * 任务状态 → 状态档次名：失败类 failed，其余（排队/进行中/已完成）一律 running。
 * 本弹窗只用蓝 / 红两色，已完成的绿色在这里显得突兀，所以与进行中同用蓝色。
 * 卡片浅底与进度条饱和色共用这一处映射，避免两边各写一遍分支。
 */
function headerTone(taskStatus: string): 'running' | 'failed' {
  if (taskStatus === 'FAILED' || taskStatus === 'PARTIAL_FAILED') {
    return 'failed'
  }
  return 'running'
}

/** 顶部卡片的浅色底（STATUS_TINTS） */
function headerTint(taskStatus: string): string {
  return STATUS_TINTS[headerTone(taskStatus)]
}

/** 进度条填充与百分比用的状态饱和色（PROGRESS_COLORS） */
function headerAccent(taskStatus: string): string {
  return PROGRESS_COLORS[headerTone(taskStatus)]
}

/** 处理类型 → 顶部卡片图标；未列出的类型（如海图）不显示图标 */
const TYPE_ICONS: Readonly<Record<string, string>> = {
  [PROCESSING_TYPE_IMAGERY]: imageryIcon,
  [PROCESSING_TYPE_TERRAIN]: terrainIcon,
  [PROCESSING_TYPE_VECTOR]: vectorIcon,
}

interface ProgressView {
  /** 进度条宽度所用的百分比（0-100） */
  readonly barPercent: number
  /** 右侧大字文案；百分比不可得时为 — */
  readonly label: string
}

/**
 * 顶部卡片的进度：优先用本次会话的 WS 帧（livePercent）。处理任务的 percent 是
 * 当前阶段内的进度，每个阶段会各自从 0 走到 100，所以把阶段名一并写进文案，
 * 避免数字重置让人困惑。没有实时帧的历史任务退回快照：已完成记 100%，
 * 否则用「已完成 / 总数」折算；总数非法时不显示百分比，进度条为 0。
 */
function buildProgress(
  task: TaskDetailInfo,
  livePercent: number | null,
  liveStageCode: string,
): ProgressView {
  let percent: number | null
  let stageText = ''
  if (livePercent !== null) {
    percent = livePercent
    const stage = toProcessingStageLabel(liveStageCode)
    if (stage !== '') {
      const index = toProcessingStageIndex(
        task.processingType ?? '',
        liveStageCode,
      )
      stageText = index === '' ? stage : `${stage} ${index}`
    }
  } else if (task.taskStatus === 'COMPLETED') {
    percent = 100
  } else {
    const completed = Number(task.completedCount)
    const total = Number(task.totalCount)
    percent =
      Number.isFinite(completed) && Number.isFinite(total) && total > 0
        ? Math.min(100, Math.round((completed / total) * 100))
        : null
  }
  const barPercent = percent === null ? 0 : Math.max(0, percent)
  const label =
    percent === null
      ? '—'
      : `${stageText === '' ? '' : `${stageText} · `}${percent}%`
  return { barPercent, label }
}

/** 任务信息与处理参数（两列 6 项）：时间用 formatTime，耗时为完成减开始 */
function buildInfoFields(detail: TaskDetail): readonly SummaryField[] {
  const task = detail.task
  const p = detail.parameters
  return [
    { label: '开始时间', value: formatTime(task.startTime) },
    { label: '目标坐标系', value: cellText(p?.targetCrs) },
    { label: '完成时间', value: formatTime(task.finishTime) },
    { label: '输出格式', value: cellText(p?.outputFormat) },
    {
      label: '处理耗时',
      value: formatDuration(task.startTime, task.finishTime),
    },
    { label: '瓦片方案', value: cellText(p?.tileProfile) },
  ]
}

/**
 * 技术详情字段：任务/参数/请求/产物层面零碎信息集中到这里，默认收起。
 * 目标坐标系 / 瓦片方案 / 输出格式与 ② 重复，不在产物里重复展示
 */
function buildTechFields(detail: TaskDetail): readonly SummaryField[] {
  const task = detail.task
  const p = detail.parameters
  const tileSet = detail.tileSet
  const fields: SummaryField[] = [
    { label: '任务编号', value: task.taskNo },
    {
      label: '数据接入方式',
      value:
        task.sourceTypeName ??
        (task.sourceType ? toSourceTypeLabel(task.sourceType) : '—'),
    },
    {
      label: '优先级',
      value: task.priority === null ? '—' : String(task.priority),
    },
    {
      label: '当前阶段',
      value: task.currentStage ? toTaskStatusLabel(task.currentStage) : '—',
    },
    {
      label: '已完成 / 总数',
      value: `${task.completedCount} / ${task.totalCount}`,
    },
    { label: '失败数', value: task.failedCount },
    { label: '创建时间', value: formatTime(task.createTime) },
    { label: '更新时间', value: formatTime(task.updateTime) },
    {
      label: '参数版本',
      value:
        detail.parameterSchemaVersion === null
          ? '—'
          : String(detail.parameterSchemaVersion),
    },
    { label: '最小层级', value: numberText(p?.minZoom) },
    { label: '最大层级', value: numberText(p?.maxZoom) },
    { label: '重采样方式', value: cellText(p?.resampling) },
    { label: '是否透明', value: boolText(p?.transparent) },
    { label: '请求指纹', value: cellText(detail.requestFingerprint) },
  ]
  if (tileSet !== null) {
    fields.push(
      {
        label: '层级范围',
        value: `${numberText(tileSet.minZoom)} ~ ${numberText(tileSet.maxZoom)}`,
      },
      { label: '清单路径', value: cellText(tileSet.manifestKey) },
      { label: '瓦片类型', value: cellText(tileSet.tileType) },
      {
        label: '瓦片状态',
        value: tileSet.tileSetStatus
          ? toTileSetStatusLabel(tileSet.tileSetStatus)
          : '—',
      },
      { label: '瓦片创建时间', value: formatTime(tileSet.createTime) },
      { label: '瓦片更新时间', value: formatTime(tileSet.updateTime) },
    )
  }
  return fields
}

/**
 * 输入文件状态小签的取色：处理中蓝、已处理绿、失败红。
 * 未命中的取值（已跳过、后端新增值）用中性灰，文案仍由常量统一成中文
 */
const INPUT_STATUS_TONES: Readonly<
  Record<string, { readonly color: string; readonly tint: string }>
> = {
  PENDING: { color: PROGRESS_COLORS.running, tint: STATUS_TINTS.running },
  CONSUMED: { color: PROGRESS_COLORS.done, tint: STATUS_TINTS.done },
  FAILED: { color: PROGRESS_COLORS.failed, tint: STATUS_TINTS.failed },
}

/** 未命中映射的状态：灰字灰底 */
const INPUT_STATUS_FALLBACK_TONE = {
  color: STATUS_COLORS.pending,
  tint: '#f1f4f7',
}

/**
 * 区块标题：左侧小条的颜色与顶部卡片进度条一致（同一处 headerAccent），
 * 让同一任务的各区块在纵向视觉上串起来
 */
function SectionTitle({
  accent,
  children,
}: {
  readonly accent: string
  readonly children: ReactNode
}) {
  return (
    <p className={styles.sectionTitle}>
      <span className={styles.sectionBar} style={{ background: accent }} />
      {children}
    </p>
  )
}

/** 复制成功后按钮文案的停留时长（毫秒） */
const COPY_HINT_MS = 1600

/**
 * 处理任务详情：状态卡片 + 任务信息与处理参数 + 输入文件 + 处理产物 + 技术详情
 */
export function TaskDetailDialog({
  taskId,
  onClose,
  livePercent = null,
  liveStageCode = '',
  onPublish,
  publishing = false,
}: TaskDetailDialogProps) {
  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 复制结果反馈：null 未操作、true 已复制、false 复制失败；到点自动复原
  const [copyState, setCopyState] = useState<boolean | null>(null)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getTaskDetail(taskId, controller.signal)
      .then((value) => {
        setDetail(value)
        setIsLoading(false)
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setIsLoading(false)
        setError('详情加载失败。')
      })
    return () => controller.abort()
  }, [taskId])

  const inputs = detail?.inputs ?? []
  const tileSet = detail?.tileSet ?? null
  const task = detail?.task ?? null
  const progress =
    task === null ? null : buildProgress(task, livePercent, liveStageCode)
  const taskIcon =
    task === null ? undefined : TYPE_ICONS[task.processingType ?? '']
  // 区块标题小条与顶部进度条同色
  const accent = task === null ? '' : headerAccent(task.taskStatus)
  // 可发布的条件与任务列表一致：已完成，且是地形 / 影像
  const canPublish =
    task !== null &&
    task.taskStatus === 'COMPLETED' &&
    (task.processingType === PROCESSING_TYPE_TERRAIN ||
      task.processingType === PROCESSING_TYPE_IMAGERY)
  // 产物路径原文：空值时复制按钮置灰（展示仍由 cellText 统一成 —）
  const outputKey = tileSet?.outputKey ?? ''

  /** 复制产物路径：按钮文案短暂变成「已复制 / 复制失败」作为反馈 */
  async function handleCopyPath() {
    setCopyState(await copyText(outputKey))
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(
      () => setCopyState(null),
      COPY_HINT_MS,
    )
  }

  return (
    <AppDialog
      title="处理任务详情"
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
      <div className={styles.body}>
        {isLoading ? (
          <p className={styles.state} role="status">
            正在加载详情…
          </p>
        ) : error !== null || detail === null || task === null ? (
          <p className={styles.state}>{error ?? '详情加载失败。'}</p>
        ) : (
          <>
            {/* ① 顶部状态卡片：浅色底区分状态，右侧大字为百分比（含阶段），数字与进度条用状态饱和色 */}
            <div
              className={styles.headerCard}
              style={{ background: headerTint(task.taskStatus) }}
            >
              <div className={styles.headerMain}>
                {taskIcon !== undefined && (
                  // 装饰性图标：处理类型名就在旁边，alt 留空避免重复朗读
                  <img className={styles.headerIcon} src={taskIcon} alt="" />
                )}
                <div className={styles.headerIdentity}>
                  <p className={styles.headerName} title={task.taskName}>
                    {task.taskName}
                  </p>
                  <p className={styles.headerType}>
                    <span>处理类型：</span>
                    <span style={{ color: '#173042' }}>
                      {toProcessingTypeLabel(task.processingType ?? '')}
                    </span>
                  </p>
                </div>
                <p
                  className={styles.headerPercent}
                  style={{ color: headerAccent(task.taskStatus) }}
                >
                  {progress?.label}
                </p>
              </div>
              <span className={styles.headerTrack}>
                <span
                  className={styles.headerBar}
                  style={{
                    width: `${progress?.barPercent ?? 0}%`,
                    background: headerAccent(task.taskStatus),
                  }}
                />
              </span>
            </div>
            {/* 任务错误信息留在明面，弹窗变红时能直接看到原因 */}
            {task.errorMessage !== null && task.errorMessage !== '' && (
              <p className={styles.errorText}>错误信息：{task.errorMessage}</p>
            )}

            {/* ② 任务信息与处理参数 */}
            <SectionTitle accent={accent}>任务信息与处理参数</SectionTitle>
            <dl className={styles.summary}>
              {buildInfoFields(detail).map((field) => (
                <div className={styles.summaryItem} key={field.label}>
                  <dt>{field.label}</dt>
                  <dd title={field.value}>{field.value}</dd>
                </div>
              ))}
            </dl>

            {/* ③ 输入文件 */}
            <SectionTitle accent={accent}>
              输入文件（{inputs.length}）
            </SectionTitle>
            {inputs.length === 0 ? (
              <p className={styles.inputEmpty}>该任务暂无输入文件</p>
            ) : (
              // 只展示 3 条（见 .inputList 的高度），第 4 条起在列表内滚动，
              // 且滚动不会外溢到弹窗内容与页面（overscroll-behavior: contain）
              <ul className={styles.inputList}>
                {inputs.map((input) => {
                  const tone =
                    INPUT_STATUS_TONES[input.inputStatus] ??
                    INPUT_STATUS_FALLBACK_TONE
                  return (
                    <li className={styles.inputItem} key={input.id}>
                      {taskIcon !== undefined && (
                        // 处理类型图标：类型名就在文件名里，alt 留空避免重复朗读
                        <img
                          className={styles.inputIcon}
                          src={taskIcon}
                          alt=""
                        />
                      )}
                      <div className={styles.inputIdentity}>
                        <span
                          className={styles.inputName}
                          title={input.originalName ?? undefined}
                        >
                          {cellText(input.originalName)}
                        </span>
                        <span className={styles.inputMeta}>
                          {`${cellText(input.extension)} · ${formatFileSize(input.sizeBytes)}`}
                        </span>
                      </div>
                      <span
                        className={styles.inputStatus}
                        style={{ color: tone.color, background: tone.tint }}
                      >
                        {toInputStatusLabel(input.inputStatus)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* ④ 处理产物：卡片（标题 + 查看 / 发布）+ 卡片下一行产物路径（可复制） */}
            {tileSet !== null && (
              <>
                <SectionTitle accent={accent}>处理产物</SectionTitle>
                <div className={styles.artifactCard}>
                  {/* 与顶部状态卡片同构：装饰性图标 + 标题成组靠左，按钮推到最右 */}
                  <img
                    className={styles.artifactIcon}
                    src={productIcon}
                    alt=""
                  />
                  {/* 产物标识上下两行：按处理类型给「影像 / 地形 / 矢量产物」，下面一行是切割层级 */}
                  <p className={styles.artifactIdentity}>
                    <span className={styles.artifactTitle}>
                      {toProcessingTypeLabel(task.processingType ?? '')}产物
                    </span>
                    <span className={styles.artifactZoom}>
                      {`层级：${numberText(tileSet.minZoom)} ~ ${numberText(tileSet.maxZoom)}`}
                    </span>
                  </p>
                  <div className={styles.artifactActions}>
                    <button
                      type="button"
                      className={styles.artifactButton}
                      // 服务详情接口尚未接入，与发布列表的「查看」一样先置灰占位
                      disabled
                      title="服务详情待接入"
                    >
                      查看
                    </button>
                    <button
                      type="button"
                      className={styles.artifactButton}
                      disabled={!canPublish || publishing}
                      onClick={() => onPublish?.(task)}
                    >
                      {publishing === true ? '发布中…' : '发布'}
                    </button>
                  </div>
                </div>
                <div className={styles.artifactPath}>
                  <span
                    className={styles.artifactPathText}
                    title={cellText(tileSet.outputKey)}
                  >
                    产物路径：{cellText(tileSet.outputKey)}
                  </span>
                  <button
                    type="button"
                    className={styles.copyButton}
                    // 路径为空时没东西可复制，直接置灰
                    disabled={outputKey === ''}
                    onClick={() => void handleCopyPath()}
                  >
                    {/* 装饰性图标：旁边就是「复制」文案，alt 留空避免重复朗读 */}
                    <img className={styles.copyIcon} src={copyIcon} alt="" />
                    {copyState === null
                      ? '复制'
                      : copyState
                        ? '已复制'
                        : '复制失败'}
                  </button>
                </div>
                {tileSet.errorMessage !== null &&
                  tileSet.errorMessage !== '' && (
                    <p className={styles.errorText}>
                      瓦片错误信息：{tileSet.errorMessage}
                    </p>
                  )}
              </>
            )}

            {/* ⑤ 技术详情：默认收起 */}
            <details className={styles.details}>
              <summary className={styles.detailsSummary}>技术详情</summary>
              <dl className={styles.summary}>
                {buildTechFields(detail).map((field) => (
                  <div className={styles.summaryItem} key={field.label}>
                    <dt>{field.label}</dt>
                    <dd title={field.value}>{field.value}</dd>
                  </div>
                ))}
              </dl>
              {inputs.length > 0 && (
                <>
                  <p className={styles.detailSubTitle}>输入文件明细</p>
                  <ul className={styles.inputDetailList}>
                    {inputs.map((input) => (
                      <li className={styles.inputDetailItem} key={input.id}>
                        <span className={styles.inputDetailName}>
                          {cellText(input.originalName)}
                        </span>
                        <span className={styles.inputDetailMeta}>
                          SHA256：{cellText(input.sha256)} · 错误信息：
                          {cellText(input.errorMessage)} · 创建时间：
                          {formatTime(input.createTime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </details>
          </>
        )}
      </div>
    </AppDialog>
  )
}
