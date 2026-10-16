import type { TableColumnType, TableColumnsType } from 'antd'
import { StatusDot, formatTime } from '@ocean-cloud/ui'
import {
  EXCEPTION_STATUS_LABELS,
  RESULT_STATUS_LABELS,
  toStatusOptions,
} from '../../constants/log'
import { LOG_DELETES, LOG_QUERIES } from '../../services/logService'
import type {
  SysExceptionLog,
  SysLoginLog,
  SysOperationLog,
} from '../../types/log'
import { LogPanel } from '../LogPanel/LogPanel'

/** 序号列：跨页连续，需要按当前页换算 */
function indexColumn<T>(current: number, pageSize: number): TableColumnType<T> {
  return {
    title: '序号',
    key: 'index',
    width: 70,
    render: (_, __, index) => (current - 1) * pageSize + index + 1,
  }
}

/** 状态色块：1（成功/已处理）为绿，0（失败/未处理）为红 */
function LogStatus({
  status,
  labels,
}: {
  readonly status: number
  readonly labels: Readonly<Record<number, string>>
}) {
  return (
    <StatusDot
      tone={status === 1 ? 'done' : 'failed'}
      label={labels[status] ?? String(status)}
    />
  )
}

const EXCEPTION_STATUS_OPTIONS = toStatusOptions(EXCEPTION_STATUS_LABELS)
const RESULT_STATUS_OPTIONS = toStatusOptions(RESULT_STATUS_LABELS)

/** 列宽合计 1490 */
function buildExceptionColumns(
  current: number,
  pageSize: number,
): TableColumnsType<SysExceptionLog> {
  return [
    indexColumn<SysExceptionLog>(current, pageSize),
    {
      title: '异常类型',
      dataIndex: 'exceptionType',
      width: 170,
      ellipsis: true,
    },
    {
      title: '异常消息',
      dataIndex: 'exceptionMessage',
      width: 320,
      ellipsis: true,
    },
    { title: '请求地址', dataIndex: 'requestUrl', width: 260, ellipsis: true },
    { title: '请求方式', dataIndex: 'requestMethod', width: 110 },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      width: 150,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <LogStatus status={record.status} labels={EXCEPTION_STATUS_LABELS} />
      ),
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 170,
      render: (_, record) => formatTime(record.createTime),
    },
  ]
}

/** 列宽合计 1410，加操作列（110）后为 1520 */
function buildOperationColumns(
  current: number,
  pageSize: number,
): TableColumnsType<SysOperationLog> {
  return [
    indexColumn<SysOperationLog>(current, pageSize),
    {
      title: '用户名',
      dataIndex: 'username',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    { title: '操作模块', dataIndex: 'module', width: 140, ellipsis: true },
    { title: '操作类型', dataIndex: 'operationType', width: 130 },
    { title: '操作描述', dataIndex: 'description', width: 280, ellipsis: true },
    { title: '请求方式', dataIndex: 'requestMethod', width: 110 },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      width: 150,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '执行时长',
      key: 'executionTime',
      width: 120,
      render: (_, record) =>
        record.executionTime === null ? '—' : `${record.executionTime} ms`,
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <LogStatus status={record.status} labels={RESULT_STATUS_LABELS} />
      ),
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 170,
      render: (_, record) => formatTime(record.createTime),
    },
  ]
}

/** 列宽合计 1790 */
function buildLoginColumns(
  current: number,
  pageSize: number,
): TableColumnsType<SysLoginLog> {
  return [
    indexColumn<SysLoginLog>(current, pageSize),
    {
      title: '用户名',
      dataIndex: 'username',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '登录类型',
      dataIndex: 'loginType',
      width: 120,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '登录平台',
      dataIndex: 'platform',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      width: 150,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '登录地点',
      dataIndex: 'location',
      width: 150,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      width: 150,
      ellipsis: true,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      width: 140,
      ellipsis: true,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <LogStatus status={record.status} labels={RESULT_STATUS_LABELS} />
      ),
    },
    {
      title: '提示信息',
      dataIndex: 'message',
      width: 200,
      ellipsis: true,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '登录时间',
      key: 'loginTime',
      width: 170,
      render: (_, record) => formatTime(record.loginTime),
    },
    {
      title: '登出时间',
      key: 'logoutTime',
      width: 170,
      render: (_, record) => formatTime(record.logoutTime),
    },
  ]
}

export function ExceptionLogTable() {
  return (
    <LogPanel<SysExceptionLog>
      columns={buildExceptionColumns}
      fetchPage={LOG_QUERIES.exception}
      statusOptions={EXCEPTION_STATUS_OPTIONS}
      scrollX={1600}
      onDelete={LOG_DELETES.exception}
    />
  )
}

export function OperationLogTable() {
  return (
    <LogPanel<SysOperationLog>
      columns={buildOperationColumns}
      fetchPage={LOG_QUERIES.operation}
      statusOptions={RESULT_STATUS_OPTIONS}
      scrollX={1520}
      onDelete={LOG_DELETES.operation}
    />
  )
}

export function LoginLogTable() {
  return (
    <LogPanel<SysLoginLog>
      columns={buildLoginColumns}
      fetchPage={LOG_QUERIES.login}
      statusOptions={RESULT_STATUS_OPTIONS}
      scrollX={1900}
      onDelete={LOG_DELETES.login}
    />
  )
}
