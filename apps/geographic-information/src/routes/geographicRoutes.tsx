import type { ReactNode } from 'react'
import { NotFound } from '@ocean-cloud/ui'
import { DataManagementPage } from '../pages/DataManagementPage/DataManagementPage'
import { DataProcessingPage } from '../pages/DataProcessingPage/DataProcessingPage'
import { DataPublishingPage } from '../pages/DataPublishingPage/DataPublishingPage'
import {
  DATA_MANAGEMENT_SECTIONS,
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
  // 数据处理、数据发布的二级导航：各类型共用同一页面，由 activePath 决定高亮
  const processingSection = DATA_PROCESSING_SECTIONS.find(
    (item) => item.path === target,
  )
  if (processingSection) {
    return {
      title: '数据处理',
      subTitle: processingSection.label,
      element: <DataProcessingPage activePath={processingSection.path} />,
    }
  }
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
