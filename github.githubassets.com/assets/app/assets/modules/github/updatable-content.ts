import {hasInteractions} from './has-interactions'
import {observe} from 'selector-observer'
import {parseHTML} from './parse-html'
import {preserveAnchorNodePosition} from 'scroll-anchoring'

const pendingRequests = new WeakMap<HTMLElement, AbortController>()
export const staleRecords: {[key: string]: string} = {}

// Fetch and replace container with its data-url.
//
// This replacement uses conservative checks to safely replace the element.
// If a user is interacting with any element within the container, the
// replacement will be aborted.
export async function updateContent(el: HTMLElement): Promise<void> {
  if (pendingRequests.get(el)) return

  const retainFocus = el.hasAttribute('data-retain-focus')
  const url = el.getAttribute('data-url')!
  const controller = new AbortController()
  pendingRequests.set(el, controller)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    if (!response.ok) return
    const data = await response.text()
    if (hasInteractions(el, retainFocus)) {
      // eslint-disable-next-line no-console
      console.warn('Failed to update content with interactions', el)
      return
    }
    staleRecords[url] = data
    return replace(el, data, retainFocus)
  } catch {
    // Ignore failed request.
  } finally {
    pendingRequests.delete(el)
  }
}

// Abort any in-flight replacements and replace element without any interaction checks.
export async function replaceContent(el: HTMLElement, data: string, wasStale = false): Promise<void> {
  const controller = pendingRequests.get(el)
  controller?.abort()

  const updatable = el.closest('.js-updatable-content[data-url], .js-updatable-content [data-url]')
  if (!wasStale && updatable && updatable === el) {
    staleRecords[updatable.getAttribute('data-url')!] = data
  }
  return replace(el, data)
}

function replace(el: HTMLElement, data: string, retainFocus = false): Promise<void> {
  return preserveAnchorNodePosition(document, () => {
    const newContent = parseHTML(document, data.trim())
    const elementToRefocus =
      retainFocus && el.ownerDocument && el === el.ownerDocument.activeElement ? newContent.querySelector('*') : null

    const detailsIds = Array.from(el.querySelectorAll('details[open][id]')).map(element => element.id)
    if (el.tagName === 'DETAILS' && el.id && el.hasAttribute('open')) detailsIds.push(el.id)

    // Check the elements we are about replace to see if we want to preserve the scroll position of any of them
    for (const preserveElement of el.querySelectorAll('.js-updatable-content-preserve-scroll-position')) {
      const id = preserveElement.getAttribute('data-updatable-content-scroll-position-id')!
      heights.set(id, preserveElement.scrollTop)
    }

    for (const id of detailsIds) {
      const details = newContent.querySelector(`#${id}`)
      if (details) details.setAttribute('open', '')
    }

    el.replaceWith(newContent)
    if (elementToRefocus instanceof HTMLElement) {
      elementToRefocus.focus()
    }
  })
}

const heights = new Map()
observe('.js-updatable-content-preserve-scroll-position', {
  constructor: HTMLElement,
  add(el) {
    // When element is added to the DOM, check the map for the last scroll position we have on record for it.
    const id = el.getAttribute('data-updatable-content-scroll-position-id')
    if (!id) return
    const height = heights.get(id)
    if (height == null) return

    el.scrollTop = height
  }
})
