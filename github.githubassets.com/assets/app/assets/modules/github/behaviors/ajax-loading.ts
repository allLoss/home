// Global handler for AJAX loading indicators.
//
// Only enabled on new style `data-remote` requests.
//
// Examples
//
//   .loading-spinner { display: none; }
//   form.loading .loading-spinner { display: block; }
//

import {on} from 'delegated-events'

on('deprecatedAjaxSend', '[data-remote]', function (event) {
  if (event.currentTarget !== event.target) {
    return
  }
  if (event.defaultPrevented) {
    return
  }
  event.currentTarget.classList.add('loading')
})

// Clear any errors when the request is tried again
on('deprecatedAjaxComplete', '[data-remote]', function (event) {
  if (event.currentTarget !== event.target) {
    return
  }
  event.currentTarget.classList.remove('loading')
})
