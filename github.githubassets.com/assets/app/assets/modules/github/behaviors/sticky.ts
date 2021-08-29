// `position: sticky` behavior that works with the notification shelf
//
// This module provides three pieces of functionality:
//
// - A JavaScript polyfill for `position: sticky` for legacy html which hasn't been upgraded to
//   use `position: sticky` or cannot yet  because the layout doesn't work with `position: sticky`
// - Augments `position: sticky` elements to add an `.is-stuck` class to elements when they are stuck
//   requires `.js-position-sticky` to be added to the stuck element
// - Ensures that any sticky headers that are on the same page as the notifications shelf sit below it
//   vertically, rather than hidden underneath the shelf
// - Provides a `.js-notification-shelf-top-offset` class, that will offset the `top` value of the
//   element it is attached to, to ensure it sits below the notification header if it exists
//   (see `.gh-header-shadow` for example usage)
//
// Usage:
//
// Legacy:
//
//    <div class="js-sticky js-sticky-offset-scroll top-0">My sticky content</div>
//
// Modern:
//
//    <div class="js-sticky js-position-sticky top-0" style="position: sticky">My sticky content</div>
//
// Aligning another element to sit below the notification shelf
//
//    <div class="js-notification-shelf-top-offset" style="position: fixed; top: 60px; left: 0; right: 0;">...</div>

import {hasSkippedToContent} from './header'
import {loaded} from '../document-ready'
import {observe} from 'selector-observer'

// Have we set up the handlers already?
let listening = false

// The current pixel height of the notification shelf
// zero if the shelf is not rendered
let notificationShelfHeight = 0

interface StickySet {
  element: HTMLElement
  placeholder: HTMLElement | null
  offsetParent: Element | null
  top: number
}

const stickySets: StickySet[] = []

function manageObservers() {
  if (stickySets.length) {
    addObservers()
  } else {
    removeObservers()
  }
}

function addObservers() {
  if (!listening) {
    /* eslint-disable-next-line github/prefer-observers */
    window.addEventListener('resize', checkElementsForStickingHandler)
    /* eslint-disable-next-line github/prefer-observers */
    document.addEventListener('scroll', checkElementsForStickingHandler)
    listening = true
  }
}

function removeObservers() {
  window.removeEventListener('resize', checkElementsForStickingHandler)
  document.removeEventListener('scroll', checkElementsForStickingHandler)
  listening = false
}

export function forceStickyRelayout() {
  checkElementsForSticking(true)
}

function checkElementsForStickingHandler() {
  checkElementsForSticking()
}

function checkElementsForSticking(force = false) {
  for (const set of stickySets) {
    if (set.element.offsetHeight > 0) {
      // element isn't hidden
      const {element, placeholder, top} = set
      const elementBox = element.getBoundingClientRect()

      if (placeholder) {
        const placeholderBox = placeholder.getBoundingClientRect()

        if (element.classList.contains('is-stuck')) {
          if (placeholderBox.top > withShelfOffset(element, top)) {
            unpinSet(set)
          } else {
            updatePinnedSet(set)
          }
        } else {
          if (elementBox.top <= withShelfOffset(element, top)) {
            pinSet(set)
          } else if (force) {
            updatePinnedSet(set)
          }
        }
      } else {
        if (elementBox.top <= withShelfOffset(element, top)) {
          pinSet(set)
        } else {
          unpinSet(set)
        }
      }
    }
  }
}

// Determine if the browser has support for `position: sticky`.
function browserHasSticky(el: HTMLElement): boolean {
  const {position} = window.getComputedStyle(el)
  return /sticky/.test(position)
}

// Pin an element.
function pinSet({element, placeholder, top}: StickySet) {
  if (placeholder) {
    const elementBox = element.getBoundingClientRect()

    setTopImportant(element, withShelfOffset(element, top))
    element.style.left = `${elementBox.left}px`
    element.style.width = `${elementBox.width}px`
    element.style.marginTop = '0'
    element.style.position = 'fixed'
    placeholder.style.display = 'block'
  }

  element.classList.add('is-stuck')
}

// Unpin an element.
function unpinSet({element, placeholder}: StickySet) {
  if (placeholder) {
    element.style.position = 'static'
    element.style.marginTop = placeholder.style.marginTop
    placeholder.style.display = 'none'
  }

  element.classList.remove('is-stuck')
}

function updatePinnedSet({element, placeholder, offsetParent, top}: StickySet) {
  if (placeholder && !hasSkippedToContent()) {
    const elementBox = element.getBoundingClientRect()
    const placeholderBox = placeholder.getBoundingClientRect()

    setTopImportant(element, withShelfOffset(element, top))
    element.style.left = `${placeholderBox.left}px`
    element.style.width = `${placeholderBox.width}px`

    // if the bottom of the fixed box overflows it's container, scroll it
    if (offsetParent) {
      const parentBox = offsetParent.getBoundingClientRect()

      if (parentBox.bottom < elementBox.height + parseInt(String(top))) {
        element.style.top = `${parentBox.bottom - elementBox.height}px`
      }
    }
  }
}

function findOrCreatePlaceholder(el: HTMLElement): HTMLElement | null {
  if (browserHasSticky(el)) {
    return null
  }

  const previousElement = el.previousElementSibling as HTMLElement
  if (previousElement && previousElement.classList.contains('is-placeholder')) {
    return previousElement
  }

  const div = document.createElement('div')
  div.style.visibility = 'hidden'
  div.style.display = 'none'
  div.style.height = window.getComputedStyle(el).height
  div.className = el.className
  div.classList.remove('js-sticky')
  div.classList.add('is-placeholder')

  return el.parentNode!.insertBefore(div, el)
}

function createSet(el: HTMLElement) {
  const placeholder = findOrCreatePlaceholder(el)
  const oldPosition = window.getComputedStyle(el).position

  el.style.position = 'static' // do this to get offsetParent
  const offsetParent = el.offsetParent

  // set to fixed so we can read the `top` value from CSS
  el.style.position = 'fixed'

  const top = getOriginalTop(el)
  const hash = {
    element: el,
    placeholder,
    offsetParent,
    top: top === 'auto' ? 0 : parseInt(top || '0')
  }

  // set back to static
  el.style.position = oldPosition

  stickySets.push(hash)
}

function removeSet(el: HTMLElement) {
  const idx = stickySets.map(set => set.element).indexOf(el)
  stickySets.splice(idx, 1)
}

async function initializeSet(el: HTMLElement) {
  await loaded
  createSet(el)
  checkElementsForSticking()
  manageObservers()
}

observe('.js-sticky', {
  constructor: HTMLElement,
  add(el) {
    initializeSet(el)
  },
  remove(el) {
    removeSet(el)
    manageObservers()
  }
})

observe('.js-notification-top-shelf', {
  constructor: HTMLElement,
  add(shelfEl) {
    initializeNotificationShelf(shelfEl)
  },
  remove() {
    // Some pages have two shelves rendered for differing layouts at responsive
    // breakpoints, so remove all shelves when any one is removed
    for (const shelfEl of document.querySelectorAll('.js-notification-top-shelf')) {
      shelfEl.remove()
    }

    if (notificationShelfHeight > 0) {
      notificationShelfHeight = 0
      updateTopOffsets()
      forceStickyRelayout()
    }
  }
})

// Update the top value to include the shelf offset if elements are added later.
observe('.js-notification-shelf-offset-top, .js-position-sticky', {
  constructor: HTMLElement,
  add: updateTopOffset
})

// Sets the global notificationShelfHeight variable to match a newly rendered shelf
// if required, so that other sticky headers can adjust their position to match.
async function initializeNotificationShelf(shelfEl: HTMLElement) {
  // don't measure the height of a hidden shelf
  if (shelfEl.offsetParent === null) return
  await loaded

  const height = Math.floor(shelfEl.getBoundingClientRect().height)
  if (height > 0) {
    notificationShelfHeight = height
    updateTopOffsets()
    forceStickyRelayout()
  }
}

// Updates the top offset of all js-position-sticky or js-notification-shelf-offset-top
// elements to include the height of the notification shelf.
//
// If the shelf has since been removed, will return `top` to it's original value.
function updateTopOffsets() {
  for (const el of document.querySelectorAll<HTMLElement>('.js-position-sticky, .js-notification-shelf-offset-top')) {
    updateTopOffset(el)
  }
}

// Updates the top offset to include the notification bar offset.
function updateTopOffset(el: HTMLElement) {
  if (el.classList.contains('js-notification-top-shelf')) return

  const top = parseInt(getOriginalTop(el)) || 0
  setTopImportant(el, top + notificationShelfHeight)
}

// Returns the original-top value if it's been set as a data-attribute, or if not
// retrieves it from getComputedStyle and caches it.
//
// This is required because an element with an already modified top value may be
// loaded in from the PJAX cache, and without this attribute, we cannot tell if
// we already added the shelf offset to it's top value or not.
function getOriginalTop(el: HTMLElement): string {
  const originalTop = el.getAttribute('data-original-top')
  if (originalTop != null) return originalTop

  const top = window.getComputedStyle(el).top
  el.setAttribute('data-original-top', top)
  return top
}

// Add a pixel offset to a number (e.g an existing top value) to offset it
// by the current height of the notification shelf.
function withShelfOffset(el: HTMLElement, top: number): number {
  if (el.classList.contains('js-notification-top-shelf')) return top

  return top + notificationShelfHeight
}

// Update the top style property of an element with !important.
function setTopImportant(el: HTMLElement, top: number) {
  el.style.setProperty('top', `${top}px`, 'important')
}
