import { Dropdown, Input, Pagination, Segmented, Select, Table } from 'antd'
import type { MenuProps, TableColumnsType } from 'antd'
import {
  TableActions,
  cellText,
  formatFileSize,
  formatTime,
} from '@ocean-cloud/ui'
import {
  DATASET_CARD_PAGE_SIZE,
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  DATASET_PAGE_SIZE,
} from '../../constants/dataset'
import refreshIcon from '../../../../assets/icons/Refresh.svg'
import { DatasetCard } from '../DatasetCard/DatasetCard'
import styles from './DatasetWall.module.css'
import type { GeoDataset } from '../../types/dataset'

/** 数据集展示方式：卡片墙 / 列表 */
export type DatasetView = 'card' | 'list'

/** 类型筛选：值为 'all' 或分类代号字符串，与侧边栏的分类选择共用同一份状态 */
const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部类型' },
  ...DATASET_CATEGORY_ORDER.map((categoryId) => ({
    value: String(categoryId),
    label: DATASET_CATEGORY_LABELS[categoryId] ?? '—',
  })),
]

/** 状态筛选：后端暂无状态字段与查询参数，先渲染为不可选 */
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'unpublished', label: '未发布' },
]

/** 首个卡片与列表视图顶部「新增」入口共用的菜单 */
const ADD_MENU_ITEMS: MenuProps['items'] = [
  { key: 'create', label: '新增数据集' },
  { key: 'addData', label: '向数据集添加数据' },
]

/** 卡片「···」菜单：与卡片内菜单一致，承接原数据集右键菜单 */
const CARD_MENU_ITEMS: MenuProps['items'] = [
  { key: 'detail', label: '详情' },
  { key: 'rename', label: '重命名' },
  { key: 'delete', label: '删除', danger: true },
]

const VIEW_OPTIONS = [
  { value: 'card', label: '卡片' },
  { value: 'list', label: '列表' },
]

const LIST_COLUMNS: TableColumnsType<GeoDataset> = [
  {
    title: '数据集名称',
    dataIndex: 'dataSetName',
    width: 240,
    ellipsis: true,
    render: (value: string | null) => cellText(value),
  },
  {
    title: '类型',
    key: 'category',
    width: 110,
    render: (_, record) =>
      DATASET_CATEGORY_LABELS[Number(record.categoryId)] ?? '—',
  },
  { title: '文件数', dataIndex: 'fileCount', width: 90 },
  {
    title: '大小',
    key: 'size',
    width: 100,
    // 数据集内文件总大小（totalSizeBytes），缺失时统一显示 —
    render: (_, record) => formatFileSize(record.totalSizeBytes),
  },
  {
    title: '描述',
    dataIndex: 'description',
    ellipsis: true,
    render: (value: string | null) => cellText(value),
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170,
    render: (_, record) => formatTime(record.createTime),
  },
]

export interface DatasetWallProps {
  /** 当前页的数据集记录（服务端分页，卡片与列表共用） */
  readonly datasets: readonly GeoDataset[]
  /** 满足筛选条件的数据集总数 */
  readonly total: number
  readonly isLoading: boolean
  readonly error: string | null
  readonly keyword: string
  /** 当前分类筛选；null 表示「全部类型」 */
  readonly categoryId: number | null
  readonly view: DatasetView
  readonly current: number
  readonly onKeywordChange: (keyword: string) => void
  readonly onCategoryChange: (categoryId: number | null) => void
  readonly onViewChange: (view: DatasetView) => void
  readonly onRefresh: () => void
  readonly onPageChange: (current: number) => void
  readonly onCreateDataset: () => void
  readonly onAddData: () => void
  readonly onViewData: (dataset: GeoDataset) => void
  readonly onProcess: (dataset: GeoDataset) => void
  readonly onMenuAction: (key: string, dataset: GeoDataset) => void
  /** 该数据集能否发起处理（分类映射未覆盖的置灰） */
  readonly canProcess: (dataset: GeoDataset) => boolean
}

/**
 * 数据集展示区：工具栏（搜索 / 类型 / 状态 / 刷新 / 卡片列表切换）
 * + 卡片墙（首个固定是「新增数据集 / 添加数据」卡片）+ 列表视图。
 * 当前页记录、总数、关键字与分类筛选、当前页都由调用方持有，这里只负责渲染与回传。
 */
export function DatasetWall({
  datasets,
  total,
  isLoading,
  error,
  keyword,
  categoryId,
  view,
  current,
  onKeywordChange,
  onCategoryChange,
  onViewChange,
  onRefresh,
  onPageChange,
  onCreateDataset,
  onAddData,
  onViewData,
  onProcess,
  onMenuAction,
  canProcess,
}: DatasetWallProps) {
  // 记录已是服务端按当前页返回的：卡片与列表每页条数不同，各自对应一次查询
  // （卡片一页 11 条 + 首个新增卡片 = 12 格）
  const pageSize = view === 'card' ? DATASET_CARD_PAGE_SIZE : DATASET_PAGE_SIZE

  const listColumns: TableColumnsType<GeoDataset> = [
    ...LIST_COLUMNS,
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <div className={styles.rowActions}>
          <TableActions
            justify="evenly"
            actions={[
              {
                key: 'view',
                label: '查看数据',
                onClick: () => onViewData(record),
              },
              {
                key: 'process',
                label: '处理',
                disabled: !canProcess(record),
                onClick: () => onProcess(record),
              },
              { key: 'publish', label: '发布详情', disabled: true },
            ]}
          />
          <Dropdown
            trigger={['click']}
            menu={{
              items: CARD_MENU_ITEMS,
              onClick: ({ key }) => onMenuAction(key, record),
            }}
          >
            <button type="button" className={styles.more} aria-label="更多操作">
              ···
            </button>
          </Dropdown>
        </div>
      ),
    },
  ]

  const emptyText =
    error ?? (keyword === '' ? '暂无数据集' : '没有匹配的数据集')

  return (
    <div className={styles.wall}>
      <div className={styles.toolbar}>
        <Input.Search
          className={styles.search}
          placeholder="按数据集名称筛选"
          allowClear
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
        <Select
          className={styles.select}
          value={categoryId === null ? 'all' : String(categoryId)}
          options={CATEGORY_OPTIONS}
          onChange={(value) =>
            onCategoryChange(value === 'all' ? null : Number(value))
          }
        />
        {/* 后端暂无状态字段与查询参数：先渲染出来，等接口支持后接上筛选 */}
        <Select
          className={styles.select}
          value="all"
          options={STATUS_OPTIONS}
          disabled
          title="状态筛选待后端支持"
        />
        <button type="button" className={styles.refresh} onClick={onRefresh}>
          <img className={styles.refreshIcon} src={refreshIcon} alt="" />
          刷新
        </button>
        <Segmented
          className={styles.viewSwitch}
          value={view}
          options={VIEW_OPTIONS}
          onChange={(value) => onViewChange(value as DatasetView)}
        />
      </div>

      <div className={styles.scrollArea}>
        {view === 'card' ? (
          <>
            <div className={styles.grid}>
              {/* 首个永远是新增入口：与其它卡片同尺寸，灰化样式 */}
              <div className={styles.addCard}>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: ADD_MENU_ITEMS,
                    onClick: ({ key }) =>
                      key === 'create' ? onCreateDataset() : onAddData(),
                  }}
                >
                  <button
                    type="button"
                    className={styles.addButton}
                    aria-label="新增数据集或向数据集添加数据"
                  >
                    <span className={styles.addIcon} aria-hidden="true">
                      +
                    </span>
                    <span className={styles.addLabel}>
                      新增数据集 / 添加数据
                    </span>
                  </button>
                </Dropdown>
              </div>
              {datasets.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  canProcess={canProcess(dataset)}
                  onViewData={onViewData}
                  onProcess={onProcess}
                  onMenuAction={onMenuAction}
                />
              ))}
            </div>
            {isLoading && total === 0 && (
              <p className={styles.hint}>正在加载数据集…</p>
            )}
            {!isLoading && total === 0 && (
              <p className={styles.hint}>{emptyText}</p>
            )}
          </>
        ) : (
          <>
            {/* 列表视图同样要有新增入口：做成表格上方的一行虚线按钮，与卡片墙一致的能力 */}
            <Dropdown
              trigger={['click']}
              menu={{
                items: ADD_MENU_ITEMS,
                onClick: ({ key }) =>
                  key === 'create' ? onCreateDataset() : onAddData(),
              }}
            >
              <button type="button" className={styles.addBar}>
                <span className={styles.addIcon} aria-hidden="true">
                  +
                </span>
                新增数据集 / 添加数据
              </button>
            </Dropdown>
            <Table<GeoDataset>
              rowKey="id"
              size="small"
              columns={listColumns}
              dataSource={[...datasets]}
              loading={isLoading}
              scroll={{ x: 1100 }}
              // 分页统一交给外层的 Pagination：钉在展示区底部，不随行数变化上下浮动
              pagination={false}
              locale={{ emptyText }}
            />
          </>
        )}
      </div>
      {total > 0 && (
        <div className={styles.pagination}>
          {/* 分页固定在整个展示区底部：条目变少时也不跟着内容往上跑 */}
          <Pagination
            size="small"
            current={current}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            showTotal={(value) => `共 ${value} 条`}
            onChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
