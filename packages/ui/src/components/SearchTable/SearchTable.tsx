import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, SyntheticEvent } from 'react'
import { Button, ConfigProvider, Form, Space, Table } from 'antd'
import type {
  FormInstance,
  TableColumnsType,
  TablePaginationConfig,
} from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import { MIN_COLUMN_WIDTH, ResizableTitle } from './ResizableTitle'
import type { ResizeCallbackData } from 'react-resizable'
import styles from './SearchTable.module.css'

/**
 * antd/locale 是 CJS 产物，经构建转成 ESM 后中文包可能被再包一层 default，
 * 不拆开会取不到 Pagination 文案（分页会退回英文 Go to Page），因此两种形态都兼容。
 */
const BASE_LOCALE =
  (zhCN as unknown as { default?: typeof zhCN }).default ?? zhCN

/** 分页文案使用中文，跳页框展示为「跳转到 __ 页 确定」 */
const SEARCH_TABLE_LOCALE = {
  ...BASE_LOCALE,
  Pagination: {
    ...(BASE_LOCALE.Pagination ?? {}),
    jump_to: '跳转到',
  },
}

/** 表体最小高度，避免容器过矮时表格不可用 */
const MIN_SCROLL_Y = 220
/** 表体之外（分页条、内边距）预留的高度 */
const TABLE_EXTRA_HEIGHT = 92

/** 列宽覆盖用的键：优先 key，其次 dataIndex，最后退回列序号 */
function columnKeyOf<T>(
  column: TableColumnsType<T>[number],
  index: number,
): string {
  if (typeof column.key === 'string' || typeof column.key === 'number')
    return String(column.key)
  // dataIndex 只在普通列上有，分组列没有
  if ('dataIndex' in column && typeof column.dataIndex === 'string')
    return column.dataIndex
  return `column-${index}`
}

export interface SearchTableProps<T> {
  readonly columns: TableColumnsType<T>
  readonly dataSource: readonly T[]
  readonly rowKey: string | ((record: T) => string)
  readonly loading: boolean
  readonly total: number
  readonly current: number
  readonly pageSize: number
  /** 页码或每页条数变化；每页条数变化由调用方决定是否回到第 1 页 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 搜索栏内容（antd Form.Item 列表）；不传时不渲染搜索栏 */
  readonly searchFormItems?: ReactNode
  /** 外部表单实例，便于在页面其它位置回写筛选值 */
  readonly searchForm?: FormInstance
  /** 搜索表单初始值，「重置」会恢复到这里 */
  readonly searchInitialValues?: Record<string, unknown>
  /** 表单值变化（用于筛选条件实时联动） */
  readonly onValuesChange?: (values: Record<string, unknown>) => void
  /** 点击搜索，回传当前表单值 */
  readonly onSearch?: (values: Record<string, unknown>) => void
  /** 点击重置（表单已重置后触发） */
  readonly onReset?: () => void
  /** 搜索栏右侧的额外操作 */
  readonly extraActions?: ReactNode
  readonly pageSizeOptions?: readonly string[]
  /** 表格横向滚动宽度；列宽合计即表格最小宽度，配合列 ellipsis 才能截断长文本 */
  readonly scrollX?: number | string
  readonly emptyText?: ReactNode
  readonly className?: string
  readonly style?: CSSProperties
}

/**
 * 通用搜索表格：搜索栏 + antd Table + antd 分页（每页条数选择、跳页、共 N 条）。
 * 表格区域高度固定，超出部分在表体内部滚动，因此每页 20 条与 10 条占用同样的高度。
 * 数据由调用方传入（受控），便于与页面其它区域复用同一份查询结果。
 */
export function SearchTable<T extends object>({
  columns,
  dataSource,
  rowKey,
  loading,
  total,
  current,
  pageSize,
  onPageChange,
  searchFormItems,
  searchForm: externalForm,
  searchInitialValues,
  onValuesChange,
  onSearch,
  onReset,
  extraActions,
  pageSizeOptions = ['10', '20', '50', '100'],
  scrollX = 'max-content',
  emptyText = '暂无数据',
  className,
  style,
}: SearchTableProps<T>) {
  const [internalForm] = Form.useForm()
  const form = externalForm ?? internalForm
  const tableAreaRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(MIN_SCROLL_Y)

  // 按可用高度算表体高度：ResizeObserver 回调异步触发，不会在渲染期间同步 setState
  useEffect(() => {
    const element = tableAreaRef.current
    if (element === null) return
    const observer = new ResizeObserver(() => {
      setScrollY(
        Math.max(MIN_SCROLL_Y, element.clientHeight - TABLE_EXTRA_HEIGHT),
      )
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  // 拖拽后的列宽覆盖：未拖过的列沿用调用方声明的宽度
  const [columnWidths, setColumnWidths] = useState<
    Readonly<Record<string, number>>
  >({})

  const resizableColumns = useMemo(
    () =>
      columns.map((column, index) => {
        const columnKey = columnKeyOf(column, index)
        const width = columnWidths[columnKey] ?? column.width
        // 没有数值宽度的列无从计算基准，不提供拖拽手柄
        if (typeof width !== 'number') return column
        return {
          ...column,
          width,
          onHeaderCell: () => ({
            width,
            onResize: (_event: SyntheticEvent, data: ResizeCallbackData) => {
              setColumnWidths((previous) => ({
                ...previous,
                [columnKey]: Math.max(
                  MIN_COLUMN_WIDTH,
                  Math.round(data.size.width),
                ),
              }))
            },
          }),
        }
      }),
    [columnWidths, columns],
  )

  // 所有列都有数值宽度时，横向滚动宽度取列宽合计，拖宽后自动延长
  const mergedScrollX = resizableColumns.every(
    (column) => typeof column.width === 'number',
  )
    ? resizableColumns.reduce(
        (sum, column) =>
          sum + (typeof column.width === 'number' ? column.width : 0),
        0,
      )
    : scrollX

  function handleTableChange(pagination: TablePaginationConfig) {
    onPageChange(pagination.current ?? 1, pagination.pageSize ?? pageSize)
  }

  function handleReset() {
    form.resetFields()
    onReset?.()
  }

  return (
    <ConfigProvider
      locale={SEARCH_TABLE_LOCALE}
      theme={{ token: { colorPrimary: '#1f75f2' } }}
    >
      <div
        className={[styles.root, className].filter(Boolean).join(' ')}
        style={style}
      >
        {searchFormItems !== undefined && (
          <div className={styles.searchBar}>
            <Form
              form={form}
              layout="inline"
              className={styles.searchForm}
              initialValues={searchInitialValues}
              onFinish={(values: Record<string, unknown>) => onSearch?.(values)}
              onValuesChange={(_, values: Record<string, unknown>) =>
                onValuesChange?.(values)
              }
            >
              {searchFormItems}
              <Form.Item className={styles.searchActions}>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                  >
                    搜索
                  </Button>
                  <Button onClick={handleReset} icon={<ReloadOutlined />}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
            {extraActions !== undefined && (
              <div className={styles.extraActions}>{extraActions}</div>
            )}
          </div>
        )}
        <div ref={tableAreaRef} className={styles.tableArea}>
          <Table<T>
            rowKey={rowKey}
            columns={resizableColumns}
            components={{ header: { cell: ResizableTitle } }}
            dataSource={dataSource}
            loading={loading}
            onChange={handleTableChange}
            scroll={{ x: mergedScrollX, y: scrollY }}
            size="middle"
            locale={{ emptyText }}
            pagination={{
              current,
              pageSize,
              total,
              size: 'small',
              showSizeChanger: true,
              showQuickJumper: { goButton: true },
              showLessItems: true,
              showTotal: (value) => `共 ${value} 条`,
              pageSizeOptions: [...pageSizeOptions],
            }}
          />
        </div>
      </div>
    </ConfigProvider>
  )
}
