import { ApplicationRegistryProvider } from './features/applications/components/ApplicationRegistryProvider/ApplicationRegistryProvider'
import { PortalContent } from './layouts/PortalContent/PortalContent'
export function App() {
  return (
    <ApplicationRegistryProvider>
      <PortalContent />
    </ApplicationRegistryProvider>
  )
}
