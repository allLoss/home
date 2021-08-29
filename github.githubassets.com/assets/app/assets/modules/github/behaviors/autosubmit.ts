// Form AutoSubmit Behavior
//
// Automatically submits form when one of its fields change.
//
// Examples
//
//   <form action="/subscribe" data-autosubmit>
//     <input type=radio name=state value=1> Subscribe
//     <input type=radio name=state value=0> Unsubscribe
//   </form>

import {debounce} from '@github/mini-throttle'
import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {requestSubmit} from '../form'

on('change', 'form[data-autosubmit]', function (event) {
  const target = event.currentTarget
  requestSubmit(target as HTMLFormElement)
})

on('change', 'input[data-autosubmit], select[data-autosubmit]', submit)

// Submit a form from a change event.
function submit(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLSelectElement)) return

  const form = input.form
  requestSubmit(form!)
}

const debouncedSubmit = debounce(submit, 300)

observe('input[data-throttled-autosubmit]', {
  subscribe: el => fromEvent(el, 'input', debouncedSubmit)
})
