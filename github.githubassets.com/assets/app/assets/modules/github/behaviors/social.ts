// Social Buttons
//
// Also see .social-count styles.
// Update count for Watch and Follow buttons
//
// Expects JSON response with {count: 123}

import type {SimpleResponse} from '@github/remote-form'
import {remoteForm} from '@github/remote-form'
import {showGlobalError} from './ajax-error'

remoteForm('.js-social-form', async function (form, wants) {
  let response: SimpleResponse

  try {
    response = await wants.json()
  } catch {
    showGlobalError()

    // If the social form is also a toggler, toggle it back
    const container = form.closest<HTMLElement>('.js-toggler-container')
    if (container) container.classList.toggle('on')

    return
  }

  const container = form.closest<HTMLElement>('.js-social-container')!
  for (const count of container.querySelectorAll('.js-social-count')) {
    count.textContent = response.json.count
  }
})
