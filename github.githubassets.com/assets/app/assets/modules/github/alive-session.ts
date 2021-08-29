import {SubscriptionSet, Topic} from './subscription-set'
import type {Socket} from '@github/stable-socket'
import {StableSocket} from '@github/stable-socket'
import type {Subscription} from './subscription-set'
import {eachSlice} from './iterables'
import {retry} from './eventloop-tasks'

interface PresenceData {
  u: number // user id
  p: string // presence id with connection count 123:456.1
  m?: Record<string, string> // metadata
}

export type AliveData =
  | {
      timestamp: number
      wait: number
      gid?: string
    }
  | {
      e: 'pf'
      d: PresenceData[]
    }
  | {
      e: 'pa'
      d: PresenceData
    }
  | {
      e: 'pr'
      d: PresenceData
    }

interface Ack {
  e: 'ack'
  off: string
  health: boolean
}

interface Message {
  e: 'msg'
  ch: string
  off: string
  data: AliveData
}

export type Notifier<T> = (subscribers: Iterable<T>, name: string, data: AliveData) => void

function generatePresenceId() {
  // outputs a string like 2118047710_1628653223
  return `${Math.round(Math.random() * (Math.pow(2, 31) - 1))}_${Math.round(Date.now() / 1000)}`
}

export default class AliveSession<T> {
  private socket: Socket
  private subscriptions = new SubscriptionSet<T>()
  private notify: Notifier<T>
  private refreshUrl: string
  private shared: boolean
  private state: 'online' | 'offline' = 'online'
  private retrying: AbortController | null = null
  private readonly presenceId = generatePresenceId()
  private connectionCount = 0

  constructor(private url: string, refreshUrl: string, shared: boolean, notify: Notifier<T>) {
    this.refreshUrl = refreshUrl
    this.notify = notify
    this.shared = shared
    this.socket = this.connect()
  }

  subscribe(subscriptions: Array<Subscription<T>>) {
    const added = this.subscriptions.add(...subscriptions)
    this.sendSubscribe(added)
  }

  unsubscribe(subscriptions: Array<Subscription<T>>) {
    const removed = this.subscriptions.delete(...subscriptions)
    this.sendUnsubscribe(removed)
  }

  unsubscribeAll(...subscribers: T[]) {
    const removed = this.subscriptions.drain(...subscribers)
    this.sendUnsubscribe(removed)
  }

  online() {
    this.state = 'online'
    this.retrying?.abort()
    this.socket.open()
  }

  offline() {
    this.state = 'offline'
    this.retrying?.abort()
    this.socket.close()
  }

  shutdown() {
    if (this.shared) {
      self.close()
    }
  }

  socketDidOpen() {
    this.connectionCount++
    // force a new url into the socket so that the server can pick up the new presence id
    // TODO: we should add a method to StableSocket to allow url to be updated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.socket as any).url = this.getUrlWithPresenceId()

    // Subscribe again after connection failure.
    this.sendSubscribe(this.subscriptions.topics())
  }

  socketDidClose() {
    // Do nothing.
  }

  socketDidFinish() {
    if (this.state === 'offline') return
    this.reconnect()
  }

  socketDidReceiveMessage(_: Socket, message: string) {
    const payload = JSON.parse(message)
    switch (payload.e) {
      case 'ack': {
        this.handleAck(payload)
        break
      }
      case 'msg': {
        this.handleMessage(payload)
        break
      }
    }
  }

  private handleAck(ack: Ack) {
    for (const topic of this.subscriptions.topics()) {
      topic.offset = ack.off
    }
  }

  private handleMessage(msg: Message) {
    const name = msg.ch
    const topic = this.subscriptions.topic(name)
    if (!topic) return
    topic.offset = msg.off

    if (!('e' in msg.data) && !msg.data.wait) msg.data.wait = 0
    this.notify(this.subscriptions.subscribers(name), name, msg.data)
  }

  private async reconnect() {
    if (this.retrying) return
    try {
      this.retrying = new AbortController()
      const fn = () => fetchRefreshUrl(this.refreshUrl)
      const url = await retry(fn, Infinity, 60000, this.retrying.signal)
      if (url) {
        this.url = url
        this.socket = this.connect()
      } else {
        this.shutdown()
      }
    } catch (e) {
      if (e.name !== 'AbortError') throw e
    } finally {
      this.retrying = null
    }
  }

  private getUrlWithPresenceId() {
    const liveUrl = new URL(this.url, self.location.origin)
    liveUrl.searchParams.set('shared', this.shared.toString())
    liveUrl.searchParams.set('p', `${this.presenceId}.${this.connectionCount}`)
    return liveUrl.toString()
  }

  private connect(): Socket {
    const socket = new StableSocket(this.getUrlWithPresenceId(), this, {timeout: 4000, attempts: 7})
    socket.open()
    return socket
  }

  private sendSubscribe(topics: Iterable<Topic>) {
    const entries = Array.from(topics, t => [t.signed, t.offset])
    for (const slice of eachSlice(entries, 25)) {
      this.socket.send(JSON.stringify({subscribe: Object.fromEntries(slice)}))
    }
  }

  private sendUnsubscribe(topics: Iterable<Topic>) {
    const signed = Array.from(topics, t => t.signed)
    for (const slice of eachSlice(signed, 25)) {
      this.socket.send(JSON.stringify({unsubscribe: slice}))
    }
  }
}

type PostUrl = {url?: string; token?: string}
async function fetchRefreshUrl(url: string): Promise<string | null> {
  const data = await fetchJSON<PostUrl>(url)
  return data && data.url && data.token ? post(data.url, data.token) : null
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {headers: {Accept: 'application/json'}})
  if (response.ok) {
    return response.json()
  } else if (response.status === 404) {
    return null
  } else {
    throw new Error('fetch error')
  }
}

async function post(url: string, csrf: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    mode: 'same-origin',
    headers: {
      'Scoped-CSRF-Token': csrf
    }
  })
  if (response.ok) {
    return response.text()
  } else {
    throw new Error('fetch error')
  }
}
