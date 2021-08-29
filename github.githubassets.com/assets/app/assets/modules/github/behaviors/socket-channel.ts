import type {AliveData, Notifier} from '../alive-session'
import {SubscriptionSet, Topic} from '../subscription-set'
import AliveSession from '../alive-session'
import type {Subscription} from '../subscription-set'
import {observe} from 'selector-observer'
import {ready} from '../document-ready'
import {taskQueue} from '../eventloop-tasks'

function isSharedWorkerSupported(): boolean {
  return 'SharedWorker' in window
}

function workerSrc(): string | null {
  return document.head.querySelector<HTMLLinkElement>('link[rel=shared-web-socket-src]')?.href ?? null
}

function socketUrl(): string | null {
  return document.head.querySelector<HTMLLinkElement>('link[rel=shared-web-socket]')?.href ?? null
}

function socketRefreshUrl(): string | null {
  return (
    document.head.querySelector<HTMLLinkElement>('link[rel=shared-web-socket]')?.getAttribute('data-refresh-url') ??
    null
  )
}

function sessionIdentifier(): string | null {
  return (
    document.head.querySelector<HTMLLinkElement>('link[rel=shared-web-socket]')?.getAttribute('data-session-id') ?? null
  )
}

function subscriptions(el: Element): Array<Subscription<Element>> {
  return channels(el).map((topic: Topic) => ({subscriber: el, topic}))
}

export function channels(el: Element): Topic[] {
  const names = (el.getAttribute('data-channel') || '').trim().split(/\s+/)
  return names.map(Topic.parse).filter(isPresent)
}

function isPresent(value: Topic | null): value is Topic {
  return value != null
}

function notify(subscribers: Iterable<Element>, name: string, data: AliveData) {
  for (const el of subscribers) {
    el.dispatchEvent(
      new CustomEvent('socket:message', {
        bubbles: false,
        cancelable: false,
        detail: {name, data}
      })
    )
  }
}

class AliveSessionProxy {
  private worker: SharedWorker
  private subscriptions = new SubscriptionSet<Element>()
  private notify: Notifier<Element>

  constructor(src: string, url: string, refreshUrl: string, sessionId: string, notifier: Notifier<Element>) {
    this.notify = notifier
    this.worker = new SharedWorker(src, `github-socket-worker-v2-${sessionId}`)
    this.worker.port.onmessage = ({data}) => this.receive(data)
    this.worker.port.postMessage({connect: {url, refreshUrl}})
  }

  subscribe(subs: Array<Subscription<Element>>) {
    const added = this.subscriptions.add(...subs)
    if (added.length) {
      this.worker.port.postMessage({subscribe: added})
    }
  }

  unsubscribeAll(...subscribers: Element[]) {
    const removed = this.subscriptions.drain(...subscribers)
    if (removed.length) {
      this.worker.port.postMessage({unsubscribe: removed})
    }
  }

  online() {
    this.worker.port.postMessage({online: true})
  }

  offline() {
    this.worker.port.postMessage({online: false})
  }

  hangup() {
    this.worker.port.postMessage({hangup: true})
  }

  private receive(message: WorkerMessage) {
    const {name, data} = message
    this.notify(this.subscriptions.subscribers(name), name, data)
  }
}

type WorkerMessage = {name: string; data: AliveData}

function connect() {
  const src = workerSrc()
  if (!src) return

  const url = socketUrl()
  if (!url) return

  const refreshUrl = socketRefreshUrl()
  if (!refreshUrl) return

  const sessionId = sessionIdentifier()
  if (!sessionId) return

  const session = isSharedWorkerSupported()
    ? new AliveSessionProxy(src, url, refreshUrl, sessionId, notify)
    : new AliveSession(url, refreshUrl, false, notify)

  type Subs = Array<Subscription<Element>>
  const queueSubscribe = taskQueue<Subs>(subs => session.subscribe(subs.flat()))
  const queueUnsubscribe = taskQueue<Element>(els => session.unsubscribeAll(...els))

  observe('.js-socket-channel[data-channel]', {
    add: el => queueSubscribe(subscriptions(el)),
    remove: el => queueUnsubscribe(el)
  })

  window.addEventListener('online', () => session.online())
  window.addEventListener('offline', () => session.offline())
  window.addEventListener('unload', () => {
    if ('hangup' in session) session.hangup()
  })
}

;(async () => {
  await ready
  connect()
})()
