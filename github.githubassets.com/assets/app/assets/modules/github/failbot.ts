// Report uncaught JS errors to Sentry
//   https://sentry.io/github/github-js

import {capableBrowser} from './capable-browser'
import detectProxySite from './proxy-site-detection'
import {getOctolyticsId} from './octolytics-utils'
import {parse} from 'stacktrace-parser'
import {requestUri} from './analytics-overrides'

let extensionErrors = false
let errorsReported = 0
const loadTime = Date.now()

interface NonStandardError extends Error {
  framesToPop?: number
}

type ErrorContext = {
  message?: string
}

// Report error event to Sentry.
//
// Example:
//   window.addEventListener('error', event => { reportEvent(event) })
export function reportEvent(event: ErrorEvent) {
  if (event.error) {
    report(errorContext(formatError(event.error)))
  }
}

// Report error from a rejected Promise to Sentry.
//
// Example:
//   window.onunhandledrejection(event => { reportEvent(event) })
export async function reportPromiseRejectionEvent(event: PromiseRejectionEvent) {
  if (!event.promise) return
  try {
    await event.promise
  } catch (error) {
    // Ignore fetch responses modeled as exceptions.
    if (error && error.name !== 'AbortError' && !(error.response instanceof Response)) {
      report(errorContext(formatError(error)))
    }
  }
}

// @deprecated Re-throw the caught exception instead.
export function reportError(error: Error, context: ErrorContext = {}) {
  report(errorContext(formatError(error), context))
}

// Report context info to Sentry.
async function report(context: PlatformReportBrowserErrorInput) {
  if (!reportable()) return

  const url = document.head?.querySelector<HTMLMetaElement>('meta[name="browser-errors-url"]')?.content
  if (!url) return

  if (isExtensionError(context.error.stacktrace)) {
    extensionErrors = true
    return
  }

  errorsReported++

  try {
    await fetch(url, {method: 'post', body: JSON.stringify(context)})
  } catch {
    // Error reporting failed so do nothing.
  }
}

function formatError(error: Error): PlatformJavascriptError {
  return {type: error.name, value: error.message, stacktrace: stacktrace(error)}
}

function errorContext(error: PlatformJavascriptError, context: ErrorContext = {}): PlatformReportBrowserErrorInput {
  return Object.assign(
    {
      error,
      sanitizedUrl: requestUri() || window.location.href,
      readyState: document.readyState,
      referrer: document.referrer,
      timeSinceLoad: Math.round(Date.now() - loadTime),
      user: pageUser() || undefined
    },
    context
  )
}

export function stacktrace(error: Error): PlatformStackframe[] {
  const stack = parseStackTrace(error)
  const pop = (error as NonStandardError).framesToPop ?? 0
  return pop === 0 ? stack : stack.slice(pop)
}

function parseStackTrace(error: Error): PlatformStackframe[] {
  return parse(error.stack || '').map(frame => ({
    filename: frame.file || '',
    function: String(frame.methodName),
    lineno: (frame.lineNumber || 0).toString(),
    colno: (frame.column || 0).toString()
  }))
}

const extensions = /(chrome|moz|safari)-extension:\/\//

// Does this stack trace contain frames from browser extensions?
function isExtensionError(stack: PlatformStackframe[]): boolean {
  return stack.some(frame => extensions.test(frame.filename) || extensions.test(frame.function))
}

export function pageUser() {
  const login = document.head?.querySelector<HTMLMetaElement>('meta[name="user-login"]')?.content
  if (login) return login

  const clientId = getOctolyticsId()
  if (clientId) return `anonymous-${clientId}`

  return null
}

let unloaded = false
window.addEventListener('pageshow', () => (unloaded = false))
window.addEventListener('pagehide', () => (unloaded = true))

function reportable() {
  return !unloaded && !extensionErrors && errorsReported < 10 && capableBrowser() && !detectProxySite(document)
}
