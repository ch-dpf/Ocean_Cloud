import { MICRO_APPLICATIONS } from './applications'
export const NAVIGATION_ITEMS = [
  { path: '/', label: '工作台', icon: '▦' },
  { path: '/applications', label: '应用中心', icon: '▥' },
  ...MICRO_APPLICATIONS.map((application) => ({
    path: application.path,
    label: application.name,
    icon: application.icon,
  })),
] as const
