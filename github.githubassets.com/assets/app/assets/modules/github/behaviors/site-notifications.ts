import {
  loadShelfFromStoredParams,
  remoteShelfActionForm,
  urlWithoutNotificationParameters
} from './../notifications/v2/notification-shelf-helpers'
import {loaded} from '../document-ready'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {replaceState} from '../history'
import {requestSubmit} from '../form'

remoteShelfActionForm()

// Remove the notification_referrer_id parameter from the url on page load
function removeNotificationParams() {
  const newUrl = urlWithoutNotificationParameters()
  if (newUrl) replaceState(null, '', newUrl)
}
removeNotificationParams()

observe('.js-notification-shelf-include-fragment', loadShelfFromStoredParams)

on('submit', '.js-mark-notification-form', async function (event) {
  const form = event.currentTarget as HTMLFormElement
  event.preventDefault()
  try {
    await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
  } catch {
    // Ignore network errors
  }
})

// mark related notification as read
async function markNotificationAsRead() {
  await loaded

  const form = document.querySelector('.js-mark-notification-form')
  if (form instanceof HTMLFormElement) {
    requestSubmit(form)
  }
}

markNotificationAsRead()
