/** 服务列表每页条数 */
export const PUBLICATION_PAGE_SIZE = 10

/** 服务状态代号 */
export const PUBLICATION_STATUS = {
  published: 'PUBLISHED',
  disabled: 'DISABLED',
} as const

/** 服务状态名称；未命中的取值按原样展示 */
export const PUBLICATION_STATUS_LABELS: Readonly<Record<string, string>> = {
  [PUBLICATION_STATUS.published]: '已发布',
  [PUBLICATION_STATUS.disabled]: '已停用',
}

export function toPublicationStatusLabel(status: string): string {
  return PUBLICATION_STATUS_LABELS[status] ?? status
}

/** 服务类型名称（「全部服务」合并视图的类型列使用） */
export const PUBLICATION_KIND_LABELS: Readonly<Record<string, string>> = {
  terrain: '地形服务',
  imagery: '影像服务',
}

export function toPublicationKindLabel(kind: string): string {
  return PUBLICATION_KIND_LABELS[kind] ?? kind
}
