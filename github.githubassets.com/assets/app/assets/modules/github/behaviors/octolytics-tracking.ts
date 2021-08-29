import {on} from 'delegated-events'
import {setCookie} from '../cookies'

type DisplaySet = Array<[string, number]>

type EventContext = {
  display_set?: DisplaySet
  query?: string
}

type EventDimensions = {
  actor_id?: number
  display_set?: DisplaySet
  query?: string
  scope_id?: number
  scope_type?: string
  session_id?: string
  target_id?: number
  target_type?: string
  target_scope?: string
}

type EventMeasures = {
  client_rank?: number
  display_count?: number
  filter_count?: number
  server_rank?: number
  result_count?: number
}

export type EventPayload = {
  timestamp?: number
  event_type?: string
  context?: EventContext
  dimensions?: EventDimensions
  measures?: EventMeasures
}

export function sendOctoEvent(payload: EventPayload) {
  if (!window._octo) {
    return
  }

  const unixTimeInSeconds = Math.floor(new Date().getTime() / 1000)
  payload.timestamp = unixTimeInSeconds
  const metaSelector = 'meta[name="octolytics-event-url"]'
  if (document.head && document.head.querySelector(metaSelector)) {
    const urlMetaTag = document.head.querySelector<HTMLMetaElement>(metaSelector)!
    const url = urlMetaTag.content
    const data = JSON.stringify(payload)
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, data)
      }
    } catch {
      // Silently ignore errors: https://github.com/github/github/issues/178088#issuecomment-829936461
    }
  }
}

export function generateOctolyticsId() {
  const time = new Date().getTime()
  const clientId = `${Math.round(Math.random() * (Math.pow(2, 31) - 1))}.${Math.round(time / 1000)}`
  const cookie = `GH1.1.${clientId}`
  const expiration = new Date(time + 1 * 365 * 86400 * 1000).toUTCString()
  setCookie('_octo', cookie, expiration)
  return clientId
}

on('click', '[data-octo-click]', function (event) {
  if (!window._octo) {
    return
  }

  const targetEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
  const payload = buildPayload(targetEl)
  sendOctoEvent(payload)
})

export function buildPayload(el?: HTMLElement): EventPayload {
  const eventType = el?.getAttribute('data-octo-click') || ''
  const payload: Octolytics.EventPayload = {}
  payload['event_type'] = eventType
  const dimensions: Octolytics.Dimension = {}
  const measures: Octolytics.Measure = {}
  const context: Octolytics.Context = {}

  let dimensionsList: string[] = []

  if (el?.hasAttribute('data-octo-dimensions')) {
    dimensionsList = (el.getAttribute('data-octo-dimensions') || '').split(',')
  }

  const metaTags = document.head ? document.head.querySelectorAll('meta[name^="octolytics-"]') : []
  for (const metaTag of metaTags) {
    if (!(metaTag instanceof HTMLMetaElement)) continue

    // octolytics-dimension-request_id => request_id
    if (metaTag.name.startsWith('octolytics-dimension-')) {
      const dimension = metaTag.name.replace(/^octolytics-dimension-/, '')
      dimensions[dimension] = metaTag.content
    } else if (metaTag.name.startsWith('octolytics-measure-')) {
      const measure = metaTag.name.replace(/^octolytics-measure-/, '')
      measures[measure] = metaTag.content
    } else if (metaTag.name.startsWith('octolytics-context-')) {
      const key = metaTag.name.replace(/^octolytics-context-/, '')
      context[key] = metaTag.content

      // octolytics-actor-login => actor_login
    } else if (metaTag.name.startsWith('octolytics-actor-')) {
      const dimension = metaTag.name.replace(/^octolytics-/, '').replace(/-/g, '_')
      dimensions[dimension] = metaTag.content

      // octolytics-host => host
    } else if (metaTag.name.startsWith('octolytics-')) {
      const key = metaTag.name.replace(/^octolytics-/, '').replace(/-/g, '_')
      payload[key] = metaTag.content
    }
  }

  const visitorMeta = document.querySelector('meta[name=visitor-payload]')
  if (visitorMeta instanceof HTMLMetaElement) {
    const visitorHash = JSON.parse(atob(visitorMeta.content))
    Object.assign(dimensions, visitorHash)
  }

  if (el?.hasAttribute('data-ga-click')) {
    const gaEvent = el.getAttribute('data-ga-click') || ''
    const parts = gaEvent.split(',').map(str => str.trim())
    dimensions.category = parts[0]
    dimensions.action = parts[1]
  }

  for (const dimensionPair of dimensionsList) {
    const parts = dimensionPair.split(':')
    const key = parts.shift()
    if (key) dimensions[key] = parts.join(':')
  }

  payload.dimensions = dimensions
  payload.measures = measures
  payload.context = context

  return payload
}
