import {ready} from './document-ready'

let container: HTMLElement | null = null

;(async function () {
  await ready
  createNoticeContainer()
})()

// Announce an element's text to the screen reader.
export function announceFromElement(el: HTMLElement) {
  announce(getTextContent(el))
}

// Announce message update to screen reader.
export function announce(message: string) {
  if (!container) return
  // Clear content first in case the new notice content is the same as the last
  container.textContent = ''
  container.textContent = message
}

// Get the global screen reader notice container.
function createNoticeContainer() {
  container = document.createElement('div')
  container.setAttribute('aria-live', 'polite')
  container.classList.add('sr-only')
  document.body.append(container)
}

// Gets the trimmed text content of an element.
function getTextContent(el: HTMLElement): string {
  // innerText does not contain hidden text
  /* eslint-disable-next-line github/no-innerText */
  return (el.getAttribute('aria-label') || el.innerText || '').trim()
}
