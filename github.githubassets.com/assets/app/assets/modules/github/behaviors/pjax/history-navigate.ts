// History back link
//
// Links tagged with "js-pjax-history-navigate" classname gain the behavior of popping the
// last item from the browser history stack if the link's href matches the URL of
// the last history item. This behavior is suitable for links whose purpose it so
// bring users back to the previous page.

import {getBackURL, getForwardURL} from '../../history'
import {on} from 'delegated-events'

on('pjax:click', '.js-pjax-history-navigate', function (event) {
  if (!(event.currentTarget instanceof HTMLAnchorElement)) return
  if (event.currentTarget.href === getBackURL()) {
    history.back()
    event.detail.relatedEvent.preventDefault()
    event.preventDefault()
  } else if (event.currentTarget.href === getForwardURL()) {
    history.forward()
    event.detail.relatedEvent.preventDefault()
    event.preventDefault()
  }
})
