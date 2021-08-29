import detectProxySite from './proxy-site-detection'
import {loaded} from './document-ready'

let stats: PlatformBrowserStat[] = []

export function sendStats(stat: PlatformBrowserStat, flushImmediately = false): void {
  if (stat.timestamp === undefined) stat.timestamp = new Date().getTime()
  stat.loggedIn = isLoggedIn()
  stats.push(stat)

  if (flushImmediately) {
    flushStats()
  } else {
    scheduleSendStats()
  }
}

let queued: NodeJS.Timer | null = null

async function scheduleSendStats() {
  await loaded
  if (queued == null) {
    queued = window.requestIdleCallback(flushStats)
  }
}

function flushStats() {
  queued = null

  if (detectProxySite(document)) {
    return
  }

  const url = document.head?.querySelector<HTMLMetaElement>('meta[name="browser-stats-url"]')?.content
  if (!url) {
    return
  }

  const data = JSON.stringify({stats})
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, data)
    }
  } catch {
    // Silently ignore errors: https://github.com/github/github/issues/178088#issuecomment-829936461
  }
  stats = []
}

function isLoggedIn(): boolean {
  return !!document.head?.querySelector<HTMLMetaElement>('meta[name="user-login"]')?.content
}
