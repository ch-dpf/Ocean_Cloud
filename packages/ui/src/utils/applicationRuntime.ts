export interface ApplicationRuntime {
  readonly basePath: string
  readonly portalUrl?: string
  readonly name?: string
}
export function getApplicationRuntime(): ApplicationRuntime {
  const content = document.getElementById(
    'ocean-application-config',
  )?.textContent
  if (content) {
    try {
      const value = JSON.parse(content) as Partial<ApplicationRuntime>
      if (
        typeof value.basePath === 'string' &&
        /^\/apps\/[a-z][a-z0-9-]*\/$/.test(value.basePath)
      ) {
        const portalUrl =
          typeof value.portalUrl === 'string' &&
          (/^https?:\/\//.test(value.portalUrl) ||
            /^\/(?!\/)/.test(value.portalUrl))
            ? value.portalUrl
            : undefined
        return {
          basePath: value.basePath,
          portalUrl,
          name: typeof value.name === 'string' ? value.name : undefined,
        }
      }
    } catch {
      /* Missing runtime config falls back to standalone development. */
    }
  }
  return { basePath: '/' }
}
