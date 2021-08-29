// Variant on the native `hashchange` event with extra features:
//
// * Guarantees that handlers run on DOMContentLoaded, or immediately if page has
//   already loaded;
// * If the anchor references an element by id, the `data.target` property of the
//   argument passed to handlers will be a reference to that DOM element.
//
// Each handler will be invoked with a `data` object containing properties:
//
// * `oldURL` - String URL prior to the hash change, or `null` on initial page load;
// * `newURL` - String URL after hash change, or current page URL;
// * `target` - DOM element whose id matches the anchor value, or `null`.
//
// Examples
//
// ```js
// // Redirect old anchor issue urls
// hashChange((data) => {
//   const m = data.newURL.match(/\/issues#issue\/(\d+)$/)
//   if (m) window.location = data.newURL.replace(/\/?#issue\/.+/, "/#{m[1]}")
// })
//
// // Ensure that the referenced comment's parent container is visible
// hashChange((data) => {
//   const container = data.target && data.target.closest('.js-comments-container')
//   if (container) container.classList.remove('d-none')
// })
// ```

import {ready} from '../document-ready'

const handlers: HashChangeListener[] = []
let ran = 0

type HashChangeListener = (opts: {oldURL: string | null; newURL: string; target?: Element | null}) => unknown

export default function hashChange(handler: HashChangeListener) {
  ;(async function () {
    handlers.push(handler)
    await ready
    runRemainingHandlers()
  })()
}

hashChange.clear = () => {
  handlers.length = ran = 0
}

function runRemainingHandlers() {
  const index = ran
  ran = handlers.length
  runHandlers(handlers.slice(index), null, window.location.href)
}

function runHandlers(handlersToRun: HashChangeListener[], oldURL: string | null, newURL: string) {
  const id = window.location.hash.slice(1)
  const target = id ? document.getElementById(id) : null
  const data = {oldURL, newURL, target}

  for (const fn of handlersToRun) {
    fn.call(null, data)
  }
}

// Track ieOldURL manually to work around an open IE bug where the hashchange
// event does not have oldURL or newURL attributes. See
// https://connect.microsoft.com/IE/feedback/details/828283/implement-hashchangeevent-oldurl-and-newurl
let ieOldURL = window.location.href
window.addEventListener('popstate', function () {
  ieOldURL = window.location.href
})

window.addEventListener('hashchange', function (event) {
  const newURL = window.location.href
  try {
    runHandlers(handlers, event.oldURL || ieOldURL, newURL)
  } finally {
    ieOldURL = newURL
  }
})

let pjaxOldURL: string | null = null
document.addEventListener('pjax:start', function () {
  pjaxOldURL = window.location.href
})

document.addEventListener('pjax:end', function () {
  runHandlers(handlers, pjaxOldURL, window.location.href)
})
