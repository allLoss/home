// Toggle hidden attribute on elements inside <include-fragment> and
// <poll-include-fragment> elements that have the data-hide-on-error and
// data-show-on-error attributes on them when error events are fired.

import {compose, fromEvent} from '../subscription'
import type IncludeFragmentElement from '@github/include-fragment-element'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

observe('include-fragment, poll-include-fragment', {
  subscribe: el => compose(fromEvent(el, 'error', onError), fromEvent(el, 'loadstart', onLoad))
})

on('click', 'include-fragment button[data-retry-button]', ({currentTarget}) => {
  const includeFragment = currentTarget.closest<IncludeFragmentElement>('include-fragment')!
  const url = includeFragment.src
  includeFragment.src = ''
  includeFragment.src = url
})

function toggleElements(event: Event, showError: boolean) {
  const fragment = event.currentTarget
  if (!(fragment instanceof Element)) return

  for (const el of fragment.querySelectorAll('[data-show-on-error]')) {
    if (el instanceof HTMLElement) el.hidden = !showError
  }
  for (const el of fragment.querySelectorAll('[data-hide-on-error]')) {
    if (el instanceof HTMLElement) el.hidden = showError
  }
}

function onLoad(event: Event) {
  toggleElements(event, false)
}

function onError(event: Event) {
  toggleElements(event, true)
}
