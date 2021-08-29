// Perform CSS transition once
//
// Examples
//
//   .foo.will-transition-once {
//     transition: color ...;
//   }
//
//   .foo.is-successful {
//     background: green;
//   }
//

import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'

observe('.will-transition-once', {
  constructor: HTMLElement,
  subscribe: el => fromEvent(el, 'transitionend', onTransitionEnd)
})

function onTransitionEnd(event: Event) {
  const target = event.target as Element
  target.classList.remove('will-transition-once')
}
