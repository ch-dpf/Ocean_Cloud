import { useId, useState } from 'react'
import type { UIEvent } from 'react'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import { useDatasetSearch } from '../../hooks/useDatasetSearch'
import type { GeoDataset } from '../../types/dataset'
import styles from './DatasetSearch.module.css'
import addDatasetsIcon from '../../../../assets/icons/AddDatasets.svg'
import RefreshIcon from '../../../../assets/icons/Refresh.svg'

interface DatasetSearchProps {
  /** 点击某个搜索结果：进入该数据集内部 */
  readonly onSelect: (dataset: GeoDataset) => void
  /** 点击刷新：清空搜索并刷新 */
  readonly onReset: () => void
  /** 点击「+」：打开新增数据集弹窗 */
  readonly onCreate: () => void
}

/**
 * 侧边栏数据集搜索：按名称查询（输入防抖），结果在输入框下方的浮层里展示。
 * 点结果进入对应数据集，输入框填入该名称；「+」新增数据集，刷新按钮清空搜索并回到全部数据。
 */
export function DatasetSearch({
  onSelect,
  onReset,
  onCreate,
}: DatasetSearchProps) {
  const [keyword, setKeyword] = useState('')
  const listId = useId()
  const { records, hasMore, isLoading, loadMore } = useDatasetSearch(keyword)
  const isOpen = keyword.trim() !== ''

  function handlePick(dataset: GeoDataset) {
    setKeyword(dataset.dataSetName)
    onSelect(dataset)
  }

  /** 结果列表滚动到底时继续拉下一页 */
  function handleListScroll(event: UIEvent<HTMLUListElement>) {
    const element = event.currentTarget
    const distanceToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight
    if (distanceToBottom > 24) return
    loadMore()
  }

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <input
          className={styles.input}
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="⌕  搜索数据集名称"
          aria-label="搜索数据集名称"
          aria-controls={isOpen ? listId : undefined}
        />
        <button
          type="button"
          className={styles.dataSetAdd}
          onClick={onCreate}
          aria-label="新增数据集"
          title="新增数据集"
        >
          <img src={addDatasetsIcon} alt="新增数据集" />
        </button>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => {
            setKeyword('')
            onReset()
          }}
          aria-label="刷新"
          title="刷新"
        >
          <img src={RefreshIcon} alt="刷新" />
        </button>
      </div>

      {isOpen && (
        <ul
          id={listId}
          className={styles.list}
          onScroll={handleListScroll}
          aria-label="数据集搜索结果"
        >
          {isLoading ? (
            <li className={styles.state} role="status">
              正在搜索…
            </li>
          ) : records.length === 0 ? (
            <li className={styles.state}>没有匹配的数据集。</li>
          ) : (
            records.map((dataset) => (
              <li key={dataset.id}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => handlePick(dataset)}
                >
                  <span className={styles.name}>{dataset.dataSetName}</span>
                  <span className={styles.category}>
                    {DATASET_CATEGORY_LABELS[Number(dataset.categoryId)] ??
                      '未分类'}
                  </span>
                </button>
              </li>
            ))
          )}
          {!isLoading && records.length > 0 && (
            <li className={styles.state} role="status">
              {hasMore ? '向下滚动加载更多' : '没有更多了。'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
