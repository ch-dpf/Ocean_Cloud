import dataManagementIcon from '../assets/icons/DataManagement.svg'
import dataManagementBlueIcon from '../assets/icons/DataManagement_blue.svg'
import dataProcessingIcon from '../assets/icons/DataProcessing.svg'
import dataProcessingBlueIcon from '../assets/icons/DataProcessing_blue.svg'
import dataPublishingIcon from '../assets/icons/DataPublishing.svg'
import dataPublishingBlueIcon from '../assets/icons/DataPublishing_blue.svg'

export const NAVIGATION_ITEMS = [
  {
    path: '/data-management',
    label: '数据管理',
    icon: dataManagementIcon,
    activeIcon: dataManagementBlueIcon,
  },
  {
    path: '/data-processing',
    label: '数据处理',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
  },
  {
    path: '/data-publishing',
    label: '数据发布',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
  },
] as const

/** 数据管理二级导航 */
export const DATA_MANAGEMENT_SECTIONS = [
  {
    path: '/data-management',
    label: '全部数据',
    icon: dataManagementIcon,
    activeIcon: dataManagementBlueIcon,
  },
  {
    path: '/data-management/imports',
    label: '导入记录',
    icon: dataManagementIcon,
    activeIcon: dataManagementBlueIcon,
  },
  {
    path: '/data-management/recycle-bin',
    label: '回收站',
    icon: dataManagementIcon,
    activeIcon: dataManagementBlueIcon,
  },
] as const

/** 带图标的二级导航项 */
export interface SubNavSection {
  readonly path: string
  readonly label: string
  readonly icon: string
  readonly activeIcon: string
  /** 展开箭头（展开后为占位区域，等数据接入） */
  readonly expandable?: boolean
  /** 接口尚未接入：先展示「全部」的内容 */
  readonly pending?: boolean
}

/** 数据处理二级导航；目前只有「全部任务」接入接口，其余类型先展示全部任务 */
export const DATA_PROCESSING_SECTIONS: readonly SubNavSection[] = [
  {
    path: '/data-processing',
    label: '全部任务',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
    expandable: true,
  },
  {
    path: '/data-processing/imagery',
    label: '影像任务',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
    expandable: true,
    pending: true,
  },
  {
    path: '/data-processing/vector',
    label: '矢量任务',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
    expandable: true,
    pending: true,
  },
  {
    path: '/data-processing/terrain',
    label: '地形任务',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
    expandable: true,
    pending: true,
  },
  {
    path: '/data-processing/oblique',
    label: '倾斜模型任务',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
    expandable: true,
    pending: true,
  },
  {
    path: '/data-processing/chart',
    label: '电子海图任务',
    icon: dataProcessingIcon,
    activeIcon: dataProcessingBlueIcon,
    expandable: true,
    pending: true,
  },
]

/** 数据发布二级导航；目前只有地形服务接口，其余类型先展示全部服务 */
export const DATA_PUBLISHING_SECTIONS: readonly SubNavSection[] = [
  {
    path: '/data-publishing',
    label: '全部服务',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
    expandable: true,
  },
  {
    path: '/data-publishing/imagery',
    label: '影像服务',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
    expandable: true,
  },
  {
    path: '/data-publishing/vector',
    label: '矢量服务',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
    expandable: true,
    pending: true,
  },
  {
    path: '/data-publishing/terrain',
    label: '地形服务',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
    expandable: true,
  },
  {
    path: '/data-publishing/oblique',
    label: '倾斜模型服务',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
    expandable: true,
    pending: true,
  },
  {
    path: '/data-publishing/chart',
    label: '电子海图服务',
    icon: dataPublishingIcon,
    activeIcon: dataPublishingBlueIcon,
    expandable: true,
    pending: true,
  },
]
