import { createContext } from 'react'
import type { MicroApplication } from '../../../types/application'
export interface ApplicationRegistry {
  readonly applications: readonly MicroApplication[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly refresh: () => Promise<void>
}
export const ApplicationRegistryContext =
  createContext<ApplicationRegistry | null>(null)
