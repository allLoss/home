import memoize from '@github/memoize'

const features = memoize(enabledFeatures)

function enabledFeatures(): string[] {
  return (document.head?.querySelector<HTMLMetaElement>('meta[name="enabled-features"]')?.content || '').split(',')
}

const isFeatureEnabled = memoize(isEnabled)

function isEnabled(name: string): boolean {
  return features().indexOf(name) !== -1
}

export {isFeatureEnabled}
