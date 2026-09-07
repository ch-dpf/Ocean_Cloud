import type {
  ApplicationCatalogItem,
  MicroApplication,
} from '../types/application'
export const MICRO_APPLICATIONS: readonly MicroApplication[] = [
  {
    id: 'resources',
    name: '资源中心',
    description: '海洋数据的统一入口，浏览、检索与管理你的数据资源。',
    icon: '▧',
    category: '数据服务',
    status: 'available',
    path: '/apps/resources',
    url: import.meta.env.VITE_RESOURCES_URL || 'http://localhost:5174/',
  },
]
export const APPLICATION_CATALOG: readonly ApplicationCatalogItem[] = [
  ...MICRO_APPLICATIONS,
  {
    id: 'visualization',
    name: '海洋可视化',
    description: '面向空间数据的可视化分析，探索海洋的更多维度。',
    icon: '◎',
    category: '空间分析',
    status: 'planned',
  },
  {
    id: 'processing',
    name: '智能处理',
    description: '连接数据处理与智能识别流程，让复杂任务更简单。',
    icon: '⌘',
    category: '智能服务',
    status: 'planned',
  },
]
