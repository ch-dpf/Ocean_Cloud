import { useContext } from 'react'
import { ApplicationRegistryContext } from './applicationRegistryContext'
export function useApplications() {
  const context = useContext(ApplicationRegistryContext)
  if (!context) throw new Error('ApplicationRegistryProvider is required')
  return context
}
