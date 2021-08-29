import {compose, fromEvent} from '../subscription'
import IncludeFragmentElement from '@github/include-fragment-element'
import hashChange from './hash-change'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

let currentlyOpenedDetailsDropdown: HTMLElement | null = null

document.addEventListener('keydown', function (event: KeyboardEvent) {
  if (!event.defaultPrevented && event.key === 'Escape' && currentlyOpenedDetailsDropdown) {
    currentlyOpenedDetailsDropdown.removeAttribute('open')
  }
})

// Dismiss open <details> when activating <details> with keyboard.
observe('.js-dropdown-details', {
  subscribe: el => {
    return compose(fromEvent(el, 'toggle', closeCurrentDetailsDropdown), fromEvent(el, 'toggle', autofocus))
  }
})

function autofocus({currentTarget}: Event) {
  const target = currentTarget as HTMLElement
  if (target.hasAttribute('open')) {
    const element = target.querySelector<HTMLElement>('[autofocus]')
    if (element) element.focus()
  } else {
    const summary = target.querySelector<HTMLElement>('summary')
    if (summary) summary.focus()
  }
}

function closeCurrentDetailsDropdown({currentTarget}: Event) {
  const target = currentTarget as HTMLElement
  if (target.hasAttribute('open')) {
    if (currentlyOpenedDetailsDropdown && currentlyOpenedDetailsDropdown !== target) {
      currentlyOpenedDetailsDropdown.removeAttribute('open')
    }

    currentlyOpenedDetailsDropdown = target
  } else if (target === currentlyOpenedDetailsDropdown) {
    currentlyOpenedDetailsDropdown = null
  }
}

observe('[data-deferred-details-content-url]:not([data-details-no-preload-on-hover])', {
  subscribe: el => {
    const summary = el.querySelector<HTMLElement>('summary')!
    return fromEvent(summary, 'mouseenter', loadDeferredContent)
  }
})

observe('[data-deferred-details-content-url]', {
  subscribe: el => {
    return fromEvent(el, 'toggle', loadDeferredContent)
  }
})

function loadDeferredContent({currentTarget}: Event) {
  if (!(currentTarget instanceof Element)) return

  const details = currentTarget.closest<HTMLElement>('details')!
  const url = details.getAttribute('data-deferred-details-content-url')!
  details.removeAttribute('data-deferred-details-content-url')
  const includeFragmentElement = details.querySelector<IncludeFragmentElement>(
    'include-fragment, poll-include-fragment'
  )!
  includeFragmentElement.src = url
}

// Additonal button trigger for <details id>
on('click', '[data-toggle-for]', function (event) {
  const id = event.currentTarget.getAttribute('data-toggle-for') || ''
  const details = document.getElementById(id)
  if (!details) return
  details.hasAttribute('open') ? details.removeAttribute('open') : details.setAttribute('open', 'open')
})

// Expand collapsed outdated diff if anchor points to it
//   /github/github/pull/123#discussion-diff-456
//   /github/github/pull/123#discussion-r345
hashChange(function ({target}) {
  if (!target || target.closest('summary')) return

  let node = target.parentElement
  while (node) {
    node = node.closest('details')
    if (node) {
      if (!node.hasAttribute('open')) {
        node.setAttribute('open', '')
      }
      node = node.parentElement
    }
  }
})

// The details dialog allows users to dismiss the dialog by clicking on the
// grayed-out background. This additional functionality prohibits dismissing
// the dialog in this way.
on('details-dialog-close', '[data-disable-dialog-dismiss]', function (event) {
  event.preventDefault()
})
