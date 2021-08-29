import {sendStats} from '../stats'

if (PerformanceObserver && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
  const observer = new PerformanceObserver(function (list) {
    const longTasks = list.getEntries().map(({name, duration}) => ({name, duration, url: window.location.href}))
    sendStats({longTasks})
  })
  observer.observe({entryTypes: ['longtask']})
}
