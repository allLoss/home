// Common behaviors associated with <auto-complete>

import AutocompleteElement from '@github/auto-complete-element'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

// Display spinner during query server fetch.
observe('auto-complete', function (el) {
  el.addEventListener('loadstart', () => el.classList.add('is-auto-complete-loading'))
  el.addEventListener('loadend', () => el.classList.remove('is-auto-complete-loading'))
})

observe('auto-complete', {constructor: AutocompleteElement, initialize: toggleSubmitButton})

on('auto-complete-change', 'auto-complete', function (event) {
  toggleSubmitButton(event.currentTarget as AutocompleteElement)
})

// TODO Upstream `required` attribute to <auto-complete> so it can
// participate in data-disable-invalid form validation.
//
// Toggle the submit button disabled/enabled based on the completer.
function toggleSubmitButton(completer: AutocompleteElement) {
  const form = completer.closest('form')
  if (!form) return
  const button = form.querySelector('.js-auto-complete-button')
  if (!(button instanceof HTMLButtonElement)) return
  button.disabled = !completer.value
}
