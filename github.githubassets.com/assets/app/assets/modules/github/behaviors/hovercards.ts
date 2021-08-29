import {compose, fromEvent} from '../subscription'
import {fetchSafeDocumentFragment} from '../fetch'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {sendOctoEvent} from './octolytics-tracking'
import {trackView} from '../hydro-tracking'

type Position = {
  containerTop: number
  containerLeft: number
  contentClassSuffix: string
}

// The card content. Moved around the page to where the current hover is
const cardContentContainer = document.querySelector('.js-hovercard-content')

const cachedFetchSafeDocumentFragment = memoize(fetchSafeDocumentFragment)

let currentTarget: Element | null | undefined

let activatingElement: Element | null = null

let deactivateTimer: number | null

// Mouse position for when links wrap lines
let mouseX = 0

const caretDistanceFromTarget = 12

// For calculating position of the card when it hangs to the left
// NOTE: These need to stay in sync with certain CSS rules in order to keep the
// caret pointing at the target.
//
// caret distance from edge of card
const caretPaddingX = 24
const caretMarginY = 7
const caretPaddingY = caretPaddingX - caretMarginY

const caretHeight = 16

// The amount of extra time given to move into the content
const deactivateTimeout = 100

// The minimum time before opening the hovercard via mouseover
const activateTimeout = 250

// Get the content class of a given selector.
// (Prefixes the selector with `Popover-message--`).
function contentClass(suffix: string): string {
  const contentClassPrefix = 'Popover-message--'
  return contentClassPrefix + suffix
}

// Track a load of the hovercard in octolytics if it stays for > 500ms.
function trackLoad(cardContentBody: HTMLElement) {
  setTimeout(() => {
    if (document.body && document.body.contains(cardContentBody)) {
      // Octolytics
      const octolyticsElement = cardContentBody.querySelector('[data-hovercard-tracking]')
      if (octolyticsElement) {
        const trackingData = octolyticsElement.getAttribute('data-hovercard-tracking')
        if (trackingData) {
          const payload: Octolytics.EventPayload = {}
          payload['event_type'] = 'user-hovercard-load'
          payload.dimensions = JSON.parse(trackingData)
          sendOctoEvent(payload)
        }
      }

      const trackingElement = cardContentBody.querySelector('[data-hydro-view]')
      if (trackingElement instanceof HTMLElement) {
        trackView(trackingElement)
      }
    }
  }, 500)
}

function hideCard() {
  if (!(cardContentContainer instanceof HTMLElement)) return

  cardContentContainer.style.display = 'none'
  cardContentContainer.children[0].innerHTML = ''

  activatingElement = null
  currentTarget = null
}

function selectRectNearestMouse(target: Element): ClientRect {
  const rects = target.getClientRects()
  let foundRect = rects[0] || target.getBoundingClientRect() || {top: 0, left: 0, height: 0, width: 0}

  if (rects.length > 0) {
    for (const rect of rects) {
      if (rect.left < mouseX && rect.right > mouseX) {
        foundRect = rect
        break
      }
    }
  }

  return foundRect
}

function calculatePositions(target: Element): Position {
  const {width: contentWidth, height: contentHeight} = cardContentContainer!.getBoundingClientRect()
  const {left: targetX, top: targetY, height: targetHeight, width: targetWidth} = selectRectNearestMouse(target)

  const roomAbove = targetY > contentHeight
  const hangLeft = target.classList.contains('js-hovercard-left')

  if (hangLeft) {
    // If there is room, show hovercard above hover position. Else, show it below
    const left = targetX - contentWidth - caretDistanceFromTarget
    const targetCenterY = targetY + targetHeight / 2
    const top = roomAbove
      ? targetCenterY - contentHeight + caretPaddingY + caretHeight / 2
      : targetCenterY - caretPaddingY - caretHeight / 2

    return {
      containerTop: top,
      containerLeft: left,
      contentClassSuffix: roomAbove ? 'right-bottom' : 'right-top'
    }
  } else {
    const roomRight = window.innerWidth - targetX > contentWidth
    const targetCenterX = targetX + targetWidth / 2
    const left = roomRight ? targetCenterX - caretPaddingX : targetCenterX - contentWidth + caretPaddingX
    const top = roomAbove
      ? targetY - contentHeight - caretDistanceFromTarget
      : targetY + targetHeight + caretDistanceFromTarget

    const contentClassSuffix = roomAbove
      ? roomRight
        ? 'bottom-left'
        : 'bottom-right'
      : roomRight
      ? 'top-left'
      : 'top-right'
    return {containerTop: top, containerLeft: left, contentClassSuffix}
  }
}

function positionCard(target: Element, cardContent: Element) {
  if (!(cardContentContainer instanceof HTMLElement)) return

  // Hide container, reset popover styles
  cardContentContainer.style.visibility = 'hidden'
  cardContentContainer.style.display = 'block'
  cardContent.classList.remove(
    contentClass('bottom-left'),
    contentClass('bottom-right'),
    contentClass('right-top'),
    contentClass('right-bottom'),
    contentClass('top-left'),
    contentClass('top-right')
  )

  const {containerTop, containerLeft, contentClassSuffix} = calculatePositions(target)

  // Add the class for correct caret location
  cardContent.classList.add(contentClass(contentClassSuffix))

  // Position the popover & inner message correctly
  cardContentContainer.style.top = `${containerTop + window.pageYOffset}px`
  cardContentContainer.style.left = `${containerLeft + window.pageXOffset}px`

  // Set z-index override
  setZIndexOverride(target, cardContentContainer)

  // After positioning correctly, show the popover again
  cardContentContainer.style.visibility = ''
}

function showCard(fragment: DocumentFragment, target: Element) {
  if (!(cardContentContainer instanceof HTMLElement)) return

  const cardContent = cardContentContainer.children[0]

  cardContent.innerHTML = ''

  const cardContentBody = document.createElement('div')
  for (const child of fragment.children) {
    cardContentBody.appendChild(child.cloneNode(true))
  }

  cardContent.appendChild(cardContentBody)

  positionCard(target, cardContent)
  trackLoad(cardContentBody)

  cardContentContainer.style.display = 'block'
}

function determineEnclosingSubject(target: Element): string | null {
  const tag = target.closest('[data-hovercard-subject-tag]')
  if (tag) return tag.getAttribute('data-hovercard-subject-tag')
  // Fall back to page context
  const meta = document.head && document.head.querySelector('meta[name="hovercard-subject-tag"]')
  if (meta) return meta.getAttribute('content')
  return null
}

function hovercardUrlFromTarget(target: Element): string {
  const baseHovercardUrl = target.getAttribute('data-hovercard-url')

  if (baseHovercardUrl) {
    const subjectTag = determineEnclosingSubject(target)
    if (subjectTag) {
      const url = new URL(baseHovercardUrl, window.location.origin)
      const params = new URLSearchParams(url.search.slice(1))
      params.append('subject', subjectTag)
      params.append('current_path', window.location.pathname + window.location.search)
      url.search = params.toString()
      return url.toString()
    }

    return baseHovercardUrl
  }

  return ''
}

// Determine if a hovercard is enabled for this type of element.
//
// Return boolean will be `true` if this link element has hovercard
// attributes and the link's particular kind of hovercard is enabled for the
// viewer and that part of the page.
function hovercardsAreEnabledForType(target: Element): boolean {
  const hovercardType = target.getAttribute('data-hovercard-type')

  if (hovercardType === 'pull_request' || hovercardType === 'issue') {
    return !!target.closest('[data-issue-and-pr-hovercards-enabled]')
  }

  if (hovercardType === 'team') {
    return !!target.closest('[data-team-hovercards-enabled]')
  }

  if (hovercardType === 'repository') {
    return !!target.closest('[data-repository-hovercards-enabled]')
  }

  if (hovercardType === 'commit') {
    return !!target.closest('[data-commit-hovercards-enabled]')
  }

  if (hovercardType === 'project') {
    return !!target.closest('[data-project-hovercards-enabled]')
  }

  if (hovercardType === 'discussion') {
    return !!target.closest('[data-discussion-hovercards-enabled]')
  }

  if (hovercardType === 'acv_badge') {
    return !!target.closest('[data-acv-badge-hovercards-enabled]')
  }

  if (hovercardType === 'sponsors_listing') {
    return !!target.closest('[data-sponsors-listing-hovercards-enabled]')
  }

  // User and organization hovercards are enabled everywhere
  return true
}

// When mousing over a hovercard target, load the data and show the card.
async function activateFn(event: Event, minimumTimeout?: number): Promise<void> {
  const target = event.currentTarget

  if (event instanceof MouseEvent) {
    mouseX = event.clientX
  }

  if (!(target instanceof Element)) return
  if (currentTarget === target) return
  if (target.closest('.js-hovercard-content')) return

  // Don't actually show issue or PR hovercards unless the link has an ancestor
  // element with data-issue-and-pr-hovercards-enabled
  if (!hovercardsAreEnabledForType(target)) return

  hideCard()

  // Set the current target as the one we're currently hovering on
  currentTarget = target
  activatingElement = document.activeElement

  const hovercardUrl = hovercardUrlFromTarget(target)

  let fragment: DocumentFragment | null | undefined
  try {
    const forcedDelay = new Promise(r => window.setTimeout(r, minimumTimeout, 0))
    fragment = await cachedFetchSafeDocumentFragment(document, hovercardUrl)
    await forcedDelay
  } catch (err) {
    const response: Response = err.response
    if (response && response.status === 404) {
      // eslint-disable-next-line i18n-text/no-en
      const notAvailableMessage = 'Hovercard is unavailable'
      target.setAttribute('aria-label', notAvailableMessage)
      target.classList.add('tooltipped', 'tooltipped-ne')
    } else if (response && response.status === 410) {
      const data: {[key: string]: string} = await response.clone().json()
      target.setAttribute('aria-label', data.message)
      target.classList.add('tooltipped', 'tooltipped-ne')
    }
    return
  }

  // Ensure that the target is still the active one
  if (target === currentTarget) {
    showCard(fragment, target)

    if (event instanceof KeyboardEvent && cardContentContainer instanceof HTMLElement) {
      cardContentContainer.focus()
    }
  }
}

// Load the data but don't show until at least `activateTimeout` Only used when
// loading via mouseover.
function activateWithTimeoutFn(event: Event) {
  activateFn(event, activateTimeout)
}

// When leaving a hovercard, deactivate unless we're moving to another child.
// This allows the user to hover into the content area without dismissing.
function deactivateFn(event: Event) {
  if (!currentTarget) return

  if (event instanceof MouseEvent && event.relatedTarget instanceof HTMLElement) {
    const relatedTarget = event.relatedTarget
    if (relatedTarget.closest('.js-hovercard-content') || relatedTarget.closest('[data-hovercard-url]')) {
      return
    }
  } else if (event instanceof KeyboardEvent && activatingElement instanceof HTMLElement) {
    // Return focus to where it was before the card was opened
    activatingElement.focus()
  }

  hideCard()
}

// Deactivate after 250 ms unless the deactivate timer is canceled as a result
// of the user entering the hovercard content area.
function deactivateWithTimeoutFn(event: Event) {
  const targetWas = currentTarget

  deactivateTimer = window.setTimeout(() => {
    if (currentTarget === targetWas) deactivateFn(event)
  }, deactivateTimeout)
}

// Triggered when a key is pressed while either a container is focused, or
// while inside of an open hovercard.
function keyupFn(event: Event) {
  if (!(event instanceof KeyboardEvent)) return
  switch (event.key) {
    case 'Escape':
      deactivateFn(event)
  }
}

// Cancel the deactivation timer since the user is inside the content now
function cancelDeactivation() {
  if (deactivateTimer) clearTimeout(deactivateTimer)
}

if (cardContentContainer) {
  observe('[data-hovercard-url]', {
    subscribe: el =>
      compose(
        fromEvent(el, 'mouseover', activateWithTimeoutFn),
        fromEvent(el, 'mouseleave', deactivateWithTimeoutFn),
        fromEvent(el, 'keyup', keyupFn)
      )
  })

  observe('[data-hovercard-url]', {
    remove(el) {
      // Hide the card if we're removing the element that triggered it
      if (currentTarget === el) hideCard()
    }
  })

  observe('.js-hovercard-content', {
    subscribe: el =>
      compose(
        fromEvent(el, 'mouseover', cancelDeactivation),
        fromEvent(el, 'mouseleave', deactivateFn),
        fromEvent(el, 'keyup', keyupFn)
      )
  })

  observe('.js-hovercard-include-fragment', {
    constructor: HTMLTemplateElement,
    add(template) {
      if (currentTarget) {
        showCard(template.content, currentTarget)
      }
    }
  })

  // eslint-disable-next-line delegated-events/global-on
  on('menu:activated', 'details', hideCard)

  window.addEventListener('statechange', hideCard)
}

function setZIndexOverride(target: Element, container: HTMLElement) {
  const zIndex = target.getAttribute('data-hovercard-z-index-override')
  if (zIndex) {
    container.style.zIndex = zIndex
  } else {
    // Reset to initial z-index from Popover
    container.style.zIndex = '100'
  }
}
