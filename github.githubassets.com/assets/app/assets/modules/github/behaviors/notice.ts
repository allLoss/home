// Notice Behavior
//
// Add basic data-remote success hook for hiding notice on ajax
// success.
//
// Markup
//
//     <div class="js-notice">
//       Hey!
//       <a href="/dismiss" class="js-notice-dismiss">
//         Dismiss
//       </a>
//     </div>
//

import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'
import {showGlobalError} from '../behaviors/ajax-error'

remoteForm('.js-notice-dismiss', async function (form, send) {
  await send.text()
  const notice = form.closest<HTMLElement>('.js-notice')!
  notice.remove()
})

on('submit', '.js-notice-dismiss-remote', async function (event) {
  const form = event.currentTarget as HTMLFormElement
  event.preventDefault()
  let response
  try {
    response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
  } catch {
    showGlobalError()
    return
  }
  if (response && !response.ok) {
    showGlobalError()
  } else {
    const notice = form.closest<HTMLElement>('.js-notice')!
    notice.remove()
  }
})
