// Handle immediate updates returned from the server on ajax success.
//
// See ShowPartial#render_immediate_partials

import {remoteForm} from '@github/remote-form'
import {replaceContent} from '../updatable-content'

remoteForm('.js-immediate-updates', async function (form, wants) {
  let updateContent

  try {
    const response = await wants.json()
    updateContent = response.json.updateContent
  } catch (error) {
    if (error.response.json) {
      updateContent = error.response.json.updateContent
    }
  }

  if (updateContent) {
    for (const selector in updateContent) {
      const html = updateContent[selector]
      const el = document.querySelector(selector)
      if (el instanceof HTMLElement) {
        replaceContent(el, html)
      }
    }
  }
})
