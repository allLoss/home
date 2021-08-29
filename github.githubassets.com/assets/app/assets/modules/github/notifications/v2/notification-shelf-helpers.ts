import {getStoredShelfParamsForCurrentPage, storeAndStripShelfParams} from './notification-shelf-referrer-params'
import IncludeFragmentElement from '@github/include-fragment-element'
import type {Kicker} from '@github/remote-form'
import {remoteForm} from '@github/remote-form'
import {updateNotificationStates} from './update-notification-states'

// Perform an action and change the status of the notification shelf.
export async function remoteShelfActionForm() {
  return remoteForm('.js-notification-shelf .js-notification-action form', async function (form, wants) {
    const shouldRedirect = form.hasAttribute('data-redirect-to-inbox-on-submit')

    if (shouldRedirect) {
      await performRequest(wants)
      const inboxButton = document.querySelector<HTMLAnchorElement>('.js-notifications-back-to-inbox')!

      if (inboxButton) {
        inboxButton.click()
      }

      return
    }

    updateNotificationStates(form, form)
    await performRequest(wants)
  })
}

export function urlWithoutNotificationParameters() {
  const searchParams = new URLSearchParams(window.location.search)
  const cleanSearchParams = storeAndStripShelfParams(searchParams)

  if (cleanSearchParams) {
    const newUrl = new URL(window.location.href, window.location.origin)
    newUrl.search = cleanSearchParams.toString()
    return newUrl.toString()
  }
}

export function loadShelfFromStoredParams(includeFragmentEl: Element) {
  if (!(includeFragmentEl instanceof IncludeFragmentElement)) {
    return
  }

  const params = getStoredShelfParamsForCurrentPage()
  if (!params) return

  const baseUrl = includeFragmentEl.getAttribute('data-base-src')
  if (!baseUrl) return

  const shelfURL = new URL(baseUrl, window.location.origin)
  const searchParams = new URLSearchParams(shelfURL.search)

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') searchParams.set(key, value)
  }
  shelfURL.search = searchParams.toString()
  includeFragmentEl.setAttribute('src', shelfURL.toString())
}

// Submits an AJAX request, but ignores any errors.
async function performRequest(wants: Kicker) {
  try {
    await wants.text()
  } catch (error) {
    // TODO show error message
  }
}
