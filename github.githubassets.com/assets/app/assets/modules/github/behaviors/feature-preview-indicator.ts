import {observe} from 'selector-observer'

observe('.js-feature-preview-indicator-container', container => {
  fetchFeaturePreviewIndicator(container)
})

type FeatureResponse = {
  show_indicator: boolean
}

// Load the indicator status and update any indicators on the page.
async function fetchFeaturePreviewIndicator(container: Element) {
  const url = container.getAttribute('data-feature-preview-indicator-src')!
  const show = await fetchIndicator(url)
  const indicators = container.querySelectorAll<HTMLElement>('.js-feature-preview-indicator')
  for (const indicator of indicators) {
    indicator.hidden = !show
  }
}

async function fetchIndicator(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {headers: {Accept: 'application/json'}})
    if (!response.ok) return false
    const json = (await response.json()) as FeatureResponse
    return json.show_indicator
  } catch {
    return false
  }
}
