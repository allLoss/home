// If the current page is openable in github.dev, do so on click.
// This would be achievable without any custom JS by just using
// data-hotkey except for two things:
//  - PJAX and other replaceState-triggered location updates like
//    the `y` hotkey need to be respected.
//  - the editor cares about the hash of the page.
// So we'll construct the href client-side.

import {on} from 'delegated-events'

function isVisible(el: HTMLElement) {
  try {
    const rect = el.getBoundingClientRect()
    if (rect.height === 0 && rect.width === 0) {
      return false
    }
    if (el.style.opacity === '0' || el.style.visibility === 'hidden') {
      return false
    }
  } catch {
    // fall through to return true below
  }
  return true
}

on('click', '.js-github-dev-shortcut', function (event) {
  event.preventDefault()
  // If content exists in any visble comment field, prompt before navigating to github.dev
  for (const el of document.querySelectorAll<HTMLTextAreaElement>('textarea.js-comment-field')) {
    // eslint-disable-next-line i18n-text/no-en
    if (el.value && isVisible(el) && !confirm('Are you sure you want to open github.dev?')) {
      return
    }
  }
  // Assumption: the href of the shortcut is the base URL for
  // the serverless editor, e.g. https://github.dev/
  const target = event.currentTarget as HTMLAnchorElement
  target.pathname = window.location.pathname
  target.hash = window.location.hash
  window.location.href = target.href
})
