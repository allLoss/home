// The UI for the "Fetch upstream" drop down (in fork branches) depends on whether
// the base is cleanly mergeable. This script makes that check asynchronously,
// only once, and only if the drop down is clicked.
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

observe('.js-fetch-upstream-details-content', {
  constructor: HTMLElement,
  initialize(content) {
    content.hidden = true
  }
})

on('click', '.js-fetch-upstream-summary', async function () {
  const parent: HTMLDetailsElement = document.querySelector('details.js-fetch-upstream-details')!
  const spinner: HTMLElement = parent.querySelector('.js-fetch-upstream-details-spinner')!

  // When we close the `<details>` element this click handler while fire while the `open` attribute
  // is still set. At that point we want to reset the `spinner.hidden` attribute, otherwise none
  // of the subsequent logic will run if the user navigates away from the page.
  if (parent.open) {
    spinner.hidden = false
    return
  }
  // We render the spinner in a visible state when the page loads. Once the user has opened the dialog for the first
  // time, we set `spinner.hidden = true`. This early return keeps us from fetching the mergeability
  // data from the server more than once.
  if (spinner.hidden) {
    return
  }

  const content: HTMLElement = parent.querySelector('.js-fetch-upstream-details-content')!
  const conflictsUI: HTMLElement = content.querySelector('.js-fetch-upstream-conflicts-ui')!
  const noConflictsUI: HTMLElement = content.querySelector('.js-fetch-upstream-no-conflicts-ui')!
  const conflictsErrorMessage: HTMLElement = content.querySelector('.js-fetch-upstream-conflicts-error-message')!
  const conflictsNoErrorMessage: HTMLElement = content.querySelector('.js-fetch-upstream-conflicts-no-error-message')!

  const behind = parseInt(content.getAttribute('data-behind')!)
  if (behind === 0) {
    conflictsUI.hidden = true
    noConflictsUI.hidden = false
    content.hidden = false
    spinner.hidden = true
    return
  }
  const url = content.getAttribute('data-mergeability-check-url')!
  const response = await fetch(url, {headers: {Accept: 'application/json'}})
  content.hidden = false
  spinner.hidden = true
  if (response.ok) {
    const data = await response.json()
    if (data.state === 'clean') {
      noConflictsUI.hidden = false
    } else {
      conflictsUI.hidden = false
    }
  } else {
    conflictsUI.hidden = false
    conflictsErrorMessage.hidden = false
    conflictsNoErrorMessage.hidden = true
  }
})
