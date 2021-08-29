// Global handler for uncaught AJAX errors.
//
// Only enabled by default on new style `data-remote` requests.

import {on} from 'delegated-events'

export function showGlobalError() {
  const ajaxErrorMessage = document.getElementById('ajax-error-message')
  if (ajaxErrorMessage) {
    ajaxErrorMessage.hidden = false
  }
}

export function hideGlobalError() {
  const ajaxErrorMessage = document.getElementById('ajax-error-message')
  if (ajaxErrorMessage) {
    ajaxErrorMessage.hidden = true
  }
}

on('deprecatedAjaxError', '[data-remote]', function (event) {
  const detail = (event as CustomEvent).detail
  const {error, text} = detail

  if (event.currentTarget !== event.target) {
    return
  }
  if (error === 'abort' || error === 'canceled') {
    return
  }

  if (/<html/.test(text)) {
    showGlobalError()
    event.stopImmediatePropagation()
  } else {
    setTimeout(function () {
      if (event.defaultPrevented) {
        return
      }
      showGlobalError()
    }, 0)
  }
})

// Clear any errors when the request is tried again
on('deprecatedAjaxSend', '[data-remote]', function () {
  hideGlobalError()
})

// "Dismiss" button
on('click', '.js-ajax-error-dismiss', function () {
  hideGlobalError()
})
