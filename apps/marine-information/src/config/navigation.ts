import dataManagementIcon from '../assets/icons/DataManagement.svg'
import dataManagementBlueIcon from '../assets/icons/DataManagement_blue.svg'
import dataProcessingIcon from '../assets/icons/DataProcessing.svg'
import dataProcessingBlueIcon from '../assets/icons/DataProcessing_blue.svg'
import dataPublishingIcon from '../assets/icons/DataPublishing.svg'
import dataPublishingBlueIcon from '../assets/icons/DataPublishing_blue.svg'

export const NAVIGATION_ITEMS = [
  {
    path: '/',
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
