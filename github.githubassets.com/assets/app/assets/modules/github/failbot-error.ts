import {reportEvent, reportPromiseRejectionEvent} from './failbot'

window.addEventListener('error', reportEvent)
window.addEventListener('unhandledrejection', reportPromiseRejectionEvent)

if (window.location.hash === '#b00m') {
  setTimeout(() => {
    throw new Error('b00m')
  })
}
