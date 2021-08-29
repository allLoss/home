import {microtask} from '../eventloop-tasks'
import {sendStats} from '../stats'

let lastPjaxRequestUrl: string | null = null

// Collect User Timing metrics so we can track time-to-load on pjax actions
const pjaxMeasure = 'last_pjax_request'
const pjaxStartMark = 'pjax_start'
const pjaxEndMark = 'pjax_end'

// Mark pjax start on performance timeline and save url for last pjax request.
function markPjaxStart(event: CustomEvent<{url?: string}>) {
  if (event instanceof CustomEvent && event.detail && event.detail.url) {
    window.performance.mark(pjaxStartMark)
    lastPjaxRequestUrl = event.detail.url
  }
}

// Mark pjax end on performance timeline and report results.
async function trackPjaxTiming() {
  await microtask()

  if (!window.performance.getEntriesByName(pjaxStartMark).length) return

  window.performance.mark(pjaxEndMark)
  window.performance.measure(pjaxMeasure, pjaxStartMark, pjaxEndMark)
  const measures = window.performance.getEntriesByName(pjaxMeasure)

  const measure = measures.pop()
  const duration = measure ? measure.duration : null
  if (!duration) return

  if (lastPjaxRequestUrl) {
    sendStats({
      requestUrl: lastPjaxRequestUrl,
      pjaxDuration: Math.round(duration)
    })
  }
  clearPjaxMarks()
}

// Clear pjax marks from performance timeline.
function clearPjaxMarks() {
  window.performance.clearMarks(pjaxStartMark)
  window.performance.clearMarks(pjaxEndMark)
  window.performance.clearMeasures(pjaxMeasure)
}

if ('getEntriesByName' in window.performance) {
  document.addEventListener('pjax:start', markPjaxStart)
  document.addEventListener('pjax:end', trackPjaxTiming)
}
