import FuzzyListElement from '../fuzzy-list-element'
import {announce} from '../aria-live'
import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'

function noticeHandler(event: Event) {
  if (!(event instanceof CustomEvent)) return
  announce(`${event.detail} results found.`)
}

observe('fuzzy-list', {
  constructor: FuzzyListElement,
  subscribe: fuzzyList => fromEvent(fuzzyList, 'fuzzy-list-sorted', noticeHandler)
})
