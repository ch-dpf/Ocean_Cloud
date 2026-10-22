import dataManagementIcon from '../assets/icons/DataManagement.svg'
import dataManagementBlueIcon from '../assets/icons/DataManagement_blue.svg'
import dataProcessingIcon from '../assets/icons/DataProcessing.svg'
import dataProcessingBlueIcon from '../assets/icons/DataProcessing_blue.svg'
import dataPublishingIcon from '../assets/icons/DataPublishing.svg'
import dataPublishingBlueIcon from '../assets/icons/DataPublishing_blue.svg'
import dataRecycleBinIcon from '../assets/icons/RecycleBin.svg'
import dataRecycleBinBlueIcon from '../assets/icons/RecycleBin_blue.svg'
import ImportRecordIcon from '../assets/icons/ImportRecord.svg'
import ImportRecordBlueIcon from '../assets/icons/ImportRecord_blue.svg'
import TerrainIcon from '../assets/icons/Terrain.svg'
import TerrainBlueIcon from '../assets/icons/Terrain_blue.svg'
import ImageryIcon from '../assets/icons/Imagery.svg'
import ImageryBlueIcon from '../assets/icons/Imagery_blue.svg'
import VectorIcon from '../assets/icons/Vector.svg'
import VectorBlueIcon from '../assets/icons/Vector_blue.svg'
import AllServiceIcon from '../assets/icons/AllService.svg'
import AllServiceBlueIcon from '../assets/icons/AllService_blue.svg'
import AllTasksIcon from '../assets/icons/AllTasks.svg'
import AllTasksBlueIcon from '../assets/icons/AllTasks_blue.svg'
import ProductIcon from '../assets/icons/Product.svg'

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
    path: '/data-management/transfers',
    label: '传输记录',
    icon: ImportRecordIcon,
    activeIcon: ImportRecordBlueIcon,
  },
  {
    path: '/data-management/recycle-bin',
    label: '回收站',
    icon: dataRecycleBinIcon,
    activeIcon: dataRecycleBinBlueIcon,
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
  /** 接口尚未接入：置灰不可点 */
  readonly disabled?: boolean
}

/** 数据处理成果导出的路径：与「原始数据处理任务」共用同一页面的两层导航 */
export const DATA_PROCESSING_EXPORTS_PATH = '/data-processing/exports'

/**
 * 数据处理上层导航：原始数据处理任务（即全部任务）+ 数据处理成果导出。
 * 后者是有独立页面的归档成果包列表
 */
export const DATA_PROCESSING_GROUPS: readonly SubNavSection[] = [
  {
    path: '/data-processing',
    label: '原始数据处理任务',
    icon: AllTasksIcon,
    activeIcon: AllTasksBlueIcon,
  },
  {
    path: DATA_PROCESSING_EXPORTS_PATH,
    label: '数据处理成果导出',
    icon: ProductIcon,
    activeIcon: ProductIcon,
  },
]

/**
 * 数据处理下层导航：任务类型分类。全部任务已上移为上层「原始数据处理任务」，
 * 影像/地形/矢量按 processingType 过滤；倾斜模型与电子海图暂无对应枚举，置灰不可点。
 */
export const DATA_PROCESSING_SECTIONS: readonly SubNavSection[] = [
  {
    path: '/data-processing/imagery',
    label: '影像任务',
    icon: ImageryIcon,
    activeIcon: ImageryBlueIcon,
  },
  {
    path: '/data-processing/terrain',
    label: '地形任务',
    icon: TerrainIcon,
    activeIcon: TerrainBlueIcon,
  },
  {
    path: '/data-processing/vector',
    label: '矢量任务',
    icon: VectorIcon,
    activeIcon: VectorBlueIcon,
  },
  {
    path: '/data-processing/oblique',
    label: '倾斜模型任务',
    icon: VectorIcon,
    activeIcon: VectorBlueIcon,
    pending: true,
    disabled: true,
  },
  {
    path: '/data-processing/chart',
    label: '电子海图任务',
    icon: VectorIcon,
    activeIcon: VectorBlueIcon,
    pending: true,
    disabled: true,
  },
]

/**
 * 数据发布二级导航：全部服务（地形 + 影像聚合）、影像服务、地形服务已接入；
 * 矢量、倾斜模型、电子海图暂无对应接口，置灰不可点。
 */
export const DATA_PUBLISHING_SECTIONS: readonly SubNavSection[] = [
  {
    path: '/data-publishing',
    label: '全部服务',
    icon: AllServiceIcon,
    activeIcon: AllServiceBlueIcon,
  },
  {
    path: '/data-publishing/imagery',
    label: '影像服务',
    icon: ImageryIcon,
    activeIcon: ImageryBlueIcon,
  },
  {
    path: '/data-publishing/terrain',
    label: '地形服务',
    icon: TerrainIcon,
    activeIcon: TerrainBlueIcon,
  },
  {
    path: '/data-publishing/vector',
    label: '矢量服务',
    icon: VectorIcon,
    activeIcon: VectorBlueIcon,
    pending: true,
    disabled: true,
  },
  {
    path: '/data-publishing/oblique',
    label: '倾斜模型服务',
    icon: VectorIcon,
    activeIcon: VectorBlueIcon,
    pending: true,
    disabled: true,
  },
  {
    path: '/data-publishing/chart',
    label: '电子海图服务',
    icon: VectorIcon,
    activeIcon: VectorBlueIcon,
    pending: true,
    disabled: true,
  },
]
