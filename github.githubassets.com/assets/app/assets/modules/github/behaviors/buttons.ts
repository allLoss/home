// Behaviors complementing buttons or minibuttons
//
// See also
//   primer/buttons.scss
//

import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'

function cancelEvent(event: Event) {
  event.preventDefault()
  event.stopPropagation()
}

// Prevent minibutton click if target is disabled
observe('a.btn.disabled', {
  subscribe: el => fromEvent(el, 'click', cancelEvent)
})
