import {addThrottledInputEventListener} from '../throttled-input'
import {fetchSafeDocumentFragment} from '../fetch'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'

// Toggle verify SSL visibility for https web hook URLs
observe('.js-hook-url-field', {
  constructor: HTMLInputElement,
  add(input) {
    function checkUrl() {
      const form = input.form
      if (!form) return
      let url
      try {
        // eslint-disable-next-line no-restricted-syntax
        url = new URL(input.value)
      } catch (e) {
        // Do nothing.
      }
      const invalidNotice = form.querySelector('.js-invalid-url-notice')
      if (invalidNotice instanceof HTMLElement) {
        invalidNotice.hidden = !!(input.value === '' || (url && /^https?:/.test(url.protocol)))
      }
      const insecureNotice = form.querySelector('.js-insecure-url-notice')
      if (insecureNotice instanceof HTMLElement && url && input.value) {
        insecureNotice.hidden = /^https:$/.test(url.protocol)
      }
      const sslFields = form.querySelector('.js-ssl-hook-fields')
      if (sslFields instanceof HTMLElement) {
        sslFields.hidden = !(url && 'https:' === url.protocol)
      }
    }

    addThrottledInputEventListener(input, checkUrl)
    checkUrl()
  }
})

function chooseEvents(selector: string): void {
  const events = document.querySelectorAll<HTMLInputElement>('.js-hook-event-checkbox')
  for (const eventCheckbox of events) {
    eventCheckbox.checked = eventCheckbox.matches(selector)
  }
}

on('change', '.js-hook-event-choice', function (event) {
  const checkbox = event.currentTarget as HTMLInputElement
  const customIsSelected = checkbox.checked && checkbox.value === 'custom'
  const hookEventsField = checkbox.closest('.js-hook-events-field')
  if (hookEventsField) hookEventsField.classList.toggle('is-custom', customIsSelected)

  if (checkbox.checked) {
    if (customIsSelected) {
      const hookWildcardEvent = document.querySelector<HTMLInputElement>('.js-hook-wildcard-event')!
      hookWildcardEvent.checked = false
    } else if (checkbox.value === 'push') {
      chooseEvents('[value="push"]')
    } else if (checkbox.value === 'all') {
      chooseEvents('.js-hook-wildcard-event')
    }
  }
})

// Load more delivery logs
on('click', '.js-hook-deliveries-pagination-button', async function (event) {
  const button = event.currentTarget as HTMLButtonElement
  button.disabled = true
  const wrapper = button.parentElement!

  const url = button.getAttribute('data-url')!
  wrapper.before(await fetchSafeDocumentFragment(document, url))
  wrapper.remove()
})

// Redeliver Payload Button
remoteForm('.js-redeliver-hook-form', async function (form, wants) {
  let response
  try {
    response = await wants.html()
  } catch (responseError) {
    form.classList.add('failed')
    return
  }

  // replace the whole deliveries index
  const deliveriesDetails = document.querySelector<HTMLElement>(`.js-hook-deliveries-container`)!
  deliveriesDetails.replaceWith(response.html)
})
