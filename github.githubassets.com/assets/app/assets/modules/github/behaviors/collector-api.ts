/* eslint @typescript-eslint/no-shadow: off */
/* eslint eslint-comments/no-use: off */
/* eslint-disable no-console */

import {generateOctolyticsId} from './octolytics-tracking'
import {getOctolyticsId} from '../octolytics-utils'

// */
//                                                                      #
//                   ,,//////,,,                                        #
//               ,,/////////////,,                                      #
//             ,////////%%%////////,                                    #
//           ,/////%%//%%%%/////////,                                   #
//          ,,////%%%%/%/%//%%////////                                  #
//         ,,///%/%%%/%%/   ,//////////                                 #
//        ,///%%%%/%%//      ,%%////////,                               #
//       ,,///%%%%%%%/         ,/////////,,                             #
//       ,//%%%//%%%//         ,/%/////////,,                           #
//      ,//%%%%/%%%//           /%//////////,,                          #
//       ,//%%/%%%//              ,////////////,                 //     #
//       ,/%/////,,                  ,//////////,,,,,       ,,,///,     #
//                                     ,/%%/////////////////,///,,      #
//                                       ,///%///////////////,,         #
//                                            ,,//////////,,            #
//      ____  ____  _____  ____  _    ___  _ _____  _  ____  ____       #
//     /  _ \/   _\/__ __\/  _ \/ \   \  \///__ __\/ \/   _\/ ___\      #
//     | / \||  /    / \  | / \|| |    \  /   / \  | ||  /  |    \      #
//     | \_/||  \__  | |  | \_/|| |_/\ / /    | |  | ||  \__\___ |      #
//     \____/\____/  \_/  \____/\____//_/     \_/  \_/\____/\____/      #
//                                                                      #
// */
//
// How to use this:
//
// A. Set data. You can set it declaratively or imperatively (or both,
//    with the imperative data taking precedence).
//
//    Note that actor is set as one object. The dimensions are also set
//    as one object that includes all dimension information. So, if you
//    try to set some actor information imperatively and some
//    declaratively, you'll end up with only the declaratively-set
//    information.
//
// OPTION 1 (imperative):
//
// Include a script like this on your page, substituting the app:
//
//     <script language="CoffeeScript">
//       window._octo ?= []
//
//       window._octo.push ["setHost", "collector.githubapp.com"]
//
//       window._octo.push ["setApp",  "aaaaa-bb-cc-dd-eeeee"]
//
//       # If you know who the actor is:
//       window._octo.push ["setActor", {id: 1, hash: "(see docs for how to do this)"}]
//
//       # If you have dimensions:
//       window._octo.push ["addDimensions", {"dimension-name": "dimensionValue",
//         "other-dimension": "other"}]
//
//       # If you have other context:
//       window._octo.push ["addContext", {"context-name": ["a", "b", "c"]}]
//     </script>
//
// OPTION 2 (declarative):
//
//     <meta name="octolytics-host" content="collector.githubapp.com">
//
//     <meta name="octolytics-app" content="aaaaa-bb-cc-dd-eeeee">
//
//     <!-- If you know who the actor is: -->
//     <meta name="octolytics-actor-id" content="1">
//     <meta name="octolytics-actor-hash" content="(see docs)">
//
//     <!-- If you have dimensions: -->
//     <meta name="octolytics-dimension-name" content="dimensionValue">
//     <meta name="octolytics-dimension-other-name" content="other">
//
//     <!-- If you have context: -->
//     <meta name="octolytics-context-filter_level" content="medium">
//
//
// B. Tell octolytics to record a page view. You can do this whenever you
//    have a page view event, including initial page load and ajax/pjax refreshes.
//
//     <script language="CoffeeScript">
//       window._octo ?= []
//       window._octo.push ['recordPageView']
//     </script>
//
// C. Include a `<script>` tag that links to this file. This can be anywhere, and
//    the end of the file is a great place to add it.
//
//     <script src="//collector.githubapp.com/assets/api.js"></script>
//
//
// Development Note: Changes to this file require the CDN to be purged after
// deployment. See
// <https://github.com/github/analytics/blob/master/doc/CollectorJavascript.md>
// for more details.
//
// Development Note: This file is vendored in the github/github repo. You'll need
// to update it there after making changes in this repository.
// https://github.com/github/github/blob/master/vendor/assets/javascripts/collector-api.coffee

const hasProp = {}.hasOwnProperty

const GitHubAnalytics: Octolytics.GitHubAnalytics = {
  host: '',
  type: 'page_view',
  dimensions: {},
  measures: {},
  context: {},
  actor: {},
  image: new Image(),
  performance: {},
  expectedPerformanceTimingKeys: [
    'connectEnd',
    'connectStart',
    'domComplete',
    'domContentLoadedEventEnd',
    'domContentLoadedEventStart',
    'domInteractive',
    'domLoading',
    'domainLookupEnd',
    'domainLookupStart',
    'fetchStart',
    'loadEventEnd',
    'loadEventStart',
    'navigationStart',
    'redirectEnd',
    'redirectStart',
    'requestStart',
    'responseEnd',
    'responseStart',
    'secureConnectionStart',
    'unloadEventEnd',
    'unloadEventStart'
  ],
  recordPageView() {
    this.applyMetaTags()
    if (this.app == null) {
      return false
    }
    if (this.host == null) {
      console && console.warn && console.warn('Host not set, you are doing something wrong')
      return false
    }
    this.image.src = this._src()
    this._clearPerformance()
    return true
  },
  setHost(host) {
    this.host = host
  },
  setApp(app) {
    this.app = app
  },
  setDimensions(dimensions) {
    this.dimensions = dimensions
  },
  addDimensions(dimensions) {
    let k: string | null
    if (this.dimensions == null) {
      this.dimensions = {}
    }
    const results = []
    for (k in dimensions) {
      if (!hasProp.call(dimensions, k)) continue
      const v = dimensions[k]
      results.push((this.dimensions[k] = v))
    }
    return results
  },
  setMeasures(measures) {
    this.measures = measures
  },
  addMeasures(measures) {
    let k
    if (this.measures == null) {
      this.measures = {}
    }
    const results = []
    for (k in measures) {
      if (!hasProp.call(measures, k)) continue
      const v = measures[k]
      results.push((this.measures[k] = v))
    }
    return results
  },
  setContext(context) {
    this.context = context
  },
  addContext(context) {
    let k: string | null
    if (this.context == null) {
      this.context = {}
    }
    const results: Octolytics.Context[] = []
    for (k in context) {
      if (!hasProp.call(context, k)) continue
      const v = context[k]
      results.push((this.context[k] = v))
    }
    return results
  },
  setActor(actor) {
    this.actor = actor
  },
  push(array) {
    return this.applyCall(array)
  },
  enablePerformance() {
    this.performance = this._performanceTiming()
  },
  _recordSrc(type, dimensions, measures, context) {
    return `//${this.host}/${this.app}/${type}?${this._queryString(dimensions, measures, context)}`
  },
  _src() {
    return `//${this.host}/${this.app}/${this.type}?${this._queryString()}`
  },
  _queryString(dimensions, measures, context) {
    let key: string | null
    let value: string | number | null

    const ref = this._params()
    const paramPieces = []
    for (key in ref) {
      value = ref[key]
      paramPieces.push(`dimensions[${key}]=${value}`)
    }

    paramPieces.push(this._encodeObject('dimensions', Object.assign({}, this.dimensions, dimensions)))
    paramPieces.push(this._encodeObject('measures', Object.assign({}, this.measures, measures)))
    if (this.performance != null) {
      paramPieces.push(
        this._encodeObject('measures', {
          performance_timing: String(this.performance)
        })
      )
    }
    paramPieces.push(this._encodeObject('context', Object.assign({}, this.context, context)))
    paramPieces.push(this._actor())
    paramPieces.push(
      this._encodeObject('dimensions', {
        cid: this._clientId()
      })
    )
    return paramPieces.join('&')
  },
  _clearPerformance() {
    this.performance = null
  },
  _performanceTiming() {
    if (
      window.performance == null ||
      window.performance.timing == null ||
      window.performance.timing.navigationStart == null
    ) {
      return null
    }

    const timing: {[key: string]: number} = this.expectedPerformanceTimingKeys.reduce((timing, key) => {
      const time = window.performance.timing[key]
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore needlessly strict compiler error around assigning string subset to string key
      timing[key] = typeof time == 'number' ? time : 0
      return timing
    }, {})
    const version = 1
    const measures = []
    const epoch = timing['navigationStart']
    for (const key in timing) {
      const value = timing[key]
      const measure = value === 0 ? null : value - epoch
      measures.push(measure)
    }
    return `${version}-${measures.join('-')}`
  },
  _params() {
    return {
      page: this._encode(this._page()),
      title: this._encode(this._title()),
      referrer: this._encode(this._referrer()),
      user_agent: this._encode(this._agent()),
      screen_resolution: this._encode(this._screenResolution()),
      pixel_ratio: this._encode(this._pixelRatio()),
      browser_resolution: this._encode(this._browserResolution()),
      tz_seconds: this._encode(this._tzSeconds()),
      timestamp: new Date().getTime()
    }
  },
  _page() {
    try {
      const locationOverride = document.querySelector('meta[name=octolytics-location]')
      if (locationOverride instanceof HTMLMetaElement) {
        return document.location.origin + locationOverride.content
      } else {
        return document.location.href
      }
    } catch (error) {
      // ignore
    }
  },
  _title() {
    try {
      return document.title
    } catch (error) {
      // ignore
    }
  },
  _referrer() {
    let referrer = ''
    try {
      referrer = window.top.document.referrer
    } catch (error) {
      if (window.parent) {
        try {
          referrer = window.parent.document.referrer
        } catch (error) {
          // ignore
        }
      }
    }
    if (referrer === '') {
      referrer = document.referrer
    }
    return referrer
  },
  _agent() {
    try {
      return navigator.userAgent
    } catch (error) {
      // ignore
    }
  },
  _screenResolution() {
    try {
      return `${screen.width}x${screen.height}`
    } catch (error) {
      return 'unknown'
    }
  },
  _pixelRatio() {
    return window.devicePixelRatio
  },
  _browserResolution() {
    let height = 0
    let width = 0
    try {
      if (typeof window.innerWidth === 'number') {
        width = window.innerWidth
        height = window.innerHeight
      } else if (document.documentElement != null && document.documentElement.clientWidth != null) {
        width = document.documentElement.clientWidth
        height = document.documentElement.clientHeight
      } else if (document.body != null && document.body.clientWidth != null) {
        width = document.body.clientWidth
        height = document.body.clientHeight
      }
      return `${width}x${height}`
    } catch (error) {
      return 'unknown'
    }
  },
  _tzSeconds() {
    try {
      return new Date().getTimezoneOffset() * -60
    } catch (error) {
      return ''
    }
  },
  _encodeObject(key, object) {
    const pieces = []
    if (Array.isArray(object)) {
      for (const item of object) {
        pieces.push(this._encodeObject(`${key}[]`, item))
      }
    } else if (typeof object === 'object') {
      for (const subkey in object) {
        pieces.push(this._encodeObject(`${key}[${subkey}]`, object[subkey]))
      }
    } else {
      pieces.push(`${key}=${this._encode(object)}`)
    }
    return pieces.join('&')
  },
  _actor() {
    let j
    let key
    let len
    const actorPieces = []
    const ref = this.actor
    for (key in ref) {
      const value = ref[key]
      const actorKey = `dimensions[actor_${key}]`
      if (Array.isArray(value)) {
        for (j = 0, len = value.length; j < len; j++) {
          const item = value[j]
          actorPieces.push(`${actorKey}[]=${this._encode(item)}`)
        }
      } else {
        actorPieces.push(`${actorKey}=${this._encode(value)}`)
      }
    }
    return actorPieces.join('&')
  },
  _clientId() {
    let clientId = getOctolyticsId()
    if (clientId === '') {
      clientId = generateOctolyticsId()
    }
    return clientId
  },
  _encode(string) {
    if (string != null) {
      return window.encodeURIComponent(string)
    } else {
      return ''
    }
  },
  applyQueuedCalls(calls) {
    const results = []
    for (const call of calls) {
      results.push(this.applyCall(call))
    }
    return results
  },
  applyCall(array) {
    const name = array[0]
    const args = array.slice(1)
    if (typeof this[name] === 'function') {
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore this is a dynamic function call with variadic arguments, TS doesn't like this
      return this[name](...args)
    } else {
      return console && console.warn && console.warn(`${name} is not a valid method`)
    }
  },
  applyMetaTags() {
    const data = this.loadMetaTags()
    if (data.host) {
      this.setHost(data.host)
    }
    if (data.app) {
      this.setApp(data.app)
    }
    if (!this._objectIsEmpty(data.actor)) {
      this.setActor(data.actor)
    }
    this.addDimensions(data.dimensions)
    this.addMeasures(data.measures)
    return this.addContext(data.context)
  },
  loadMetaTags() {
    let j: number | null
    let len: number | null

    const result: Octolytics.MetaPayload = {
      dimensions: {},
      measures: {},
      context: {},
      actor: {}
    }

    const ref = document.getElementsByTagName('meta')
    for (j = 0, len = ref.length; j < len; j++) {
      const meta = ref[j]
      if (meta.name && meta.content) {
        const nameParts = meta.name.match(this.octolyticsMetaTagName)
        if (nameParts) {
          switch (nameParts[1]) {
            case 'host':
              result.host = meta.content
              break
            case 'app-id':
              result.app = meta.content
              break
            case 'app':
              result.app = meta.content
              break
            case 'dimension':
              this._addField(result.dimensions, nameParts[2], meta)
              break
            case 'measure':
              this._addField(result.measures, nameParts[2], meta)
              break
            case 'context':
              this._addField(result.context, nameParts[2], meta)
              break
            case 'actor':
              this._addField(result.actor, nameParts[2], meta)
          }
        }
      }
    }

    const visitorMeta = document.querySelector('meta[name=visitor-payload]')
    if (visitorMeta instanceof HTMLMetaElement) {
      const visitorHash = JSON.parse(atob(visitorMeta.content))
      this.addDimensions(visitorHash)
    }
    return result
  },
  _addField(target, fieldName, metaTag) {
    target[fieldName] = metaTag.content
  },
  _objectIsEmpty(obj) {
    let k: string | null
    for (k in obj) {
      if (!hasProp.call(obj, k)) continue
      return false
    }
    return true
  },
  octolyticsMetaTagName: /^octolytics-(host|app-id|app|dimension|measure|context|actor)-?(.*)/
}

if (window._octo) {
  if (window._octo.slice) {
    const queuedFunctionCalls = window._octo.slice(0)
    window._octo = GitHubAnalytics
    window._octo.applyQueuedCalls(queuedFunctionCalls)
  }
} else {
  window._octo = GitHubAnalytics
}
