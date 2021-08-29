import {AnalyticsClient, getOptionsFromMeta} from '@github/hydro-analytics-client'
import {generateOctolyticsId} from './octolytics-tracking'
import {getOctolyticsId} from '../octolytics-utils'
import {loaded} from '../document-ready'

const clientId = getOctolyticsId() || generateOctolyticsId()
const dimensionPrefix = 'dimension_'
let hydroAnalyticsClient: AnalyticsClient | undefined

try {
  const options = getOptionsFromMeta('octolytics')

  if (options.baseContext) {
    delete options.baseContext.app_id
    delete options.baseContext.event_url
    delete options.baseContext.host

    for (const key in options.baseContext) {
      // some octolytics meta tags are prefixed with dimension-, which we don't need with the new hydro-analytics-client
      if (key.startsWith(dimensionPrefix)) {
        options.baseContext[key.replace(dimensionPrefix, '')] = options.baseContext[key]
        delete options.baseContext[key]
      }
    }
  }

  hydroAnalyticsClient = new AnalyticsClient({
    ...options,
    clientId
  })

  // Send a page view as soon as the page is loaded
  ;(async function () {
    await loaded

    hydroAnalyticsClient?.sendPageView()
  })()

  // PJAX should be treated like pageloads
  document.addEventListener('pjax:complete', function () {
    hydroAnalyticsClient?.sendPageView()
  })
} catch (_) {
  // Failed to get options from meta tags.  This most likely means analytics are disabled.
}

// This can't be exported yet since it isn't used, but will be used by anyone wanting to send a custom event

// export function sendEvent(type: string, context: Context) {
//   hydroAnalyticsClient?.sendEvent(type, context)
// }
