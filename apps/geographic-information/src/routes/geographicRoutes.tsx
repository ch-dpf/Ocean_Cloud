import type { ReactNode } from 'react'
import { NotFound } from '@ocean-cloud/ui'
import { DataManagementPage } from '../pages/DataManagementPage/DataManagementPage'
import { DataProcessingPage } from '../pages/DataProcessingPage/DataProcessingPage'
import { DataPublishingPage } from '../pages/DataPublishingPage/DataPublishingPage'
import {
  DATA_MANAGEMENT_SECTIONS,
  DATA_PROCESSING_GROUPS,
  DATA_PROCESSING_SECTIONS,
  DATA_PUBLISHING_SECTIONS,
} from '../config/navigation'
interface GeographicRoute {
  readonly title: string
  readonly subTitle?: string
  readonly element: ReactNode
}
export function resolveGeographicRoute(pathname: string): GeographicRoute {
  // 兼容旧入口：/#/ 视作数据管理默认页
  const target = pathname === '/' ? '/data-management' : pathname
  const managementSection = DATA_MANAGEMENT_SECTIONS.find(
    (item) => item.path === target,
  )
  if (managementSection) {
    return {
      title: '数据管理',
      subTitle: managementSection.label,
      element: <DataManagementPage activePath={managementSection.path} />,
    }
  }
  // 数据处理：上层（原始数据处理任务）与下层（任务类型）共用同一页面，由 activePath 决定高亮。
  // 上层里接口未接入的项（数据处理成果导出）不参与路由，直接访问该路径走 404
  const processingItem =
    DATA_PROCESSING_GROUPS.find(
      (item) => item.path === target && item.disabled !== true,
    ) ?? DATA_PROCESSING_SECTIONS.find((item) => item.path === target)
  if (processingItem) {
    return {
      title: '数据处理',
      subTitle: processingItem.label,
      element: <DataProcessingPage activePath={processingItem.path} />,
    }
  }
  // 数据发布的二级导航：各类型共用同一页面，由 activePath 决定高亮
  const publishingSection = DATA_PUBLISHING_SECTIONS.find(
    (item) => item.path === target,
  )
  if (publishingSection) {
    return {
      title: '数据发布',
      subTitle: publishingSection.label,
      element: <DataPublishingPage activePath={publishingSection.path} />,
    }
  }
  return { title: '页面未找到', element: <NotFound /> }
}
