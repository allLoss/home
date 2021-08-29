// Remote
//
// Implements `data-remote` for forms.
//
//
// Markup
//
// `<form>`
//
// ``` definition-table
// Attribute - Description
//
// `data-remote`
//   Enables remote behavior on the element if set to anything.
//
// `method`
//   Changes the method of the AJAX request. Defaults to `"get"`. Maps to
//   jQuery's [type](http://api.jquery.com/jQuery.ajax/).
//
// `action`
//   URL for AJAX request. Defaults to the current url. Maps to jQuery's
//   [`url`](http://api.jquery.com/jQuery.ajax/).
//
// `data-type`
//   Specify the data type of the response. Can be `"xml"`, `"json"`,
//   `"script"`, or `"html"`. Defaults to jQuery's *"intelligent guess"*
//   from the response content type. Maps to jQuery's
//   [`dataType`](http://api.jquery.com/jQuery.ajax/).
// ```
//
// ``` html
// <form action="/comment" method="post" data-remote></form>
// ```
//
//
// Events
//
// Use delegated jQuery's global AJAX events to handle successful
// and error states. See jQuery's [AJAX event
// documentation](http://docs.jquery.com/Ajax_Events) for a complete
// reference.
//
// `deprecatedAjaxSuccess`
//
// This event is only called if the request was successful (no errors from the server, no errors with the data).
//
// ``` definition-table
// Property - Value
//
// Synchronicity  - Sync
// Bubbles        - Yes
// Cancelable     - No
// Target         - `form` element with `[data-remote]`
// ```
//
// `ajaxError`
//
// This event is only called if an error occurred with the request (you can never
// have both an error and a success callback with a request).
//
// ``` definition-table
// Property - Value
//
// Synchronicity  - Sync
// Bubbles        - Yes
// Cancelable     - No
// Target         - `form` element with `[data-remote]`
// Extra arguments
//   `status` - Status response number
//   `error` - Error message string
//   `text` - Response text string
// ```
//
// `deprecatedAjaxComplete`
//
// This event is called regardless of if the request was successful, or not. You
// will always receive a complete callback, even for synchronous requests.
//
// ``` definition-table
// Property - Value
//
// Synchronicity  - Sync
// Bubbles        - Yes
// Cancelable     - No
// Target         - `form` element with `[data-remote]`
// ```
//
//     on('deprecatedAjaxSend', '.new-comment', function(event) {
//        event.currentTarget.classList.add('loading')
//     })
//
//     on('deprecatedAjaxComplete', '.new-comment', function(event) {
//        event.currentTarget.classList.remove('loading')
//     })
//
//     on('deprecatedAjaxSuccess', '.new-comment', function (event) {
//        event.currentTarget.classList.add('success')
//     })
//
//     on('deprecatedAjaxError', '.new-comment', function (event) {
//       alert("Something went wrong!")
//     })
//
//
// Intercept all form submissions with data-remote and turn
// it into a XHR request instead.

import type {Kicker, SimpleRequest, SimpleResponse} from '@github/remote-form'
import {afterRemote, beforeRemote, remoteForm} from '@github/remote-form'
import {findPersistedSubmitButtonValue, persistSubmitButtonValue} from '../remote-submit'
import {fire, on} from 'delegated-events'
import verifySso from '../sso'

function submitWithLegacyEvents(form: HTMLFormElement, send: Kicker, req: SimpleRequest) {
  const dataType = form.getAttribute('data-type')
  if (dataType === 'json') {
    req.headers.set('Accept', 'application/json')
  }

  fire(form, 'deprecatedAjaxSend', {request: req})

  send
    .text()
    /* eslint-disable-next-line github/no-then */
    .catch(err => {
      if (err.response) {
        return err.response
      } else {
        throw err
      }
    })
    /* eslint-disable-next-line github/no-then */
    .then(
      (response: SimpleResponse) => {
        if (response.status < 300) {
          fire(form, 'deprecatedAjaxSuccess')
        } else {
          fire(form, 'deprecatedAjaxError', {error: response.statusText, status: response.status, text: response.text})
        }
      },
      err => {
        fire(form, 'deprecatedAjaxError', {error: err.message, status: 0, text: null})
      }
    )
    /* eslint-disable-next-line github/no-then */
    .then(() => {
      fire(form, 'deprecatedAjaxComplete')
    })
}

// Persist submit button value for ALL forms, regardless of whether they are
// ajax-enabled or not. The submit value is reset after either `deprecatedAjaxComplete`
// has fired or `remoteForm` has finished processing.
on('click', ['form button:not([type])', 'form button[type=submit]', 'form input[type=submit]'].join(', '), function (
  event
) {
  const button = event.currentTarget as HTMLButtonElement | HTMLInputElement
  const form = button.form
  if (form && !event.defaultPrevented) {
    persistSubmitButtonValue(button)
  }
})

remoteForm('form[data-remote]', submitWithLegacyEvents)

// Restore forms after AJAX submissions
on('deprecatedAjaxComplete', 'form', function ({currentTarget}) {
  const el = findPersistedSubmitButtonValue(currentTarget as HTMLFormElement)
  if (el) el.remove()
})

afterRemote(form => {
  const button = findPersistedSubmitButtonValue(form)
  if (button) button.remove()
})

beforeRemote(verifySso)
