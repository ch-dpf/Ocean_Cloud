import styles from './Pager.module.css'

interface PagerProps {
  readonly current: number
  readonly lastPage: number
  readonly onChange: (page: number) => void
}

/** 页码槽位固定为 5 个，超出总页数的槽位置灰，保证翻页条宽度不变 */
const PAGE_COUNT = 5

/** 生成页码序列，跳过的页码用 gap 表示省略号 */
function buildPages(
  current: number,
  lastPage: number,
): readonly (number | 'gap')[] {
  const start = Math.max(1, Math.min(current - 2, lastPage - PAGE_COUNT + 1))
  const end = start + PAGE_COUNT - 1
  const pages: (number | 'gap')[] = []
  if (start > 1) pages.push(1)
  if (start > 2) pages.push('gap')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < lastPage - 1) pages.push('gap')
  if (end < lastPage) pages.push(lastPage)
  return pages
}

/** 数字页码，首尾恒显，可一步跳到最后一页 */
export function Pager({ current, lastPage, onChange }: PagerProps) {
  return (
    <nav className={styles.pager} aria-label="分页">
      {buildPages(current, lastPage).map((page, index) =>
        page === 'gap' ? (
          <span className={styles.gap} key={`gap-${index}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={`${styles.page}${
              page === current ? ` ${styles.pageActive}` : ''
            }`}
            onClick={() => onChange(page)}
            disabled={page > lastPage}
            aria-current={page === current ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}
    </nav>
  )
}
