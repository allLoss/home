import type {AliveData} from '../alive-session'
import type {Topic} from '../subscription-set'
import {channels} from './socket-channel'

type Entry = {name: string; data: AliveData; arrived: number}
const cache = new Map<string, Entry>()

function stale(topics: Topic[], since: number): Entry[] {
  const entries = []
  for (const topic of topics) {
    const entry = cache.get(topic.name)
    if (entry && entry.arrived > since) {
      entries.push(entry)
    }
  }
  return entries
}

function dispatch(container: Element, cachedAt: number) {
  for (const el of container.querySelectorAll('.js-socket-channel[data-channel]')) {
    for (const entry of stale(channels(el), cachedAt)) {
      el.dispatchEvent(
        new CustomEvent('socket:message', {
          bubbles: false,
          cancelable: false,
          detail: {name: entry.name, data: entry.data, cached: true}
        })
      )
    }
  }
}

function store(event: Event) {
  const {name, data, cached} = (event as CustomEvent).detail
  if (cached) return
  const entry = {name, data: {...data}, arrived: Date.now()}
  entry.data.wait = 0
  cache.set(name, entry)
}

// Cache socket messages for future delivery.
document.addEventListener('socket:message', store, {capture: true})

// Dispatch socket:message when elements are restored from PJAX cache.
document.addEventListener('pjax:popstate', function (event: Event) {
  const container = event.target as Element
  const cachedAt = (event as CustomEvent).detail.cachedAt
  if (cachedAt) setTimeout(() => dispatch(container, cachedAt))
})
