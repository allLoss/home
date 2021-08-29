// Commenting: Edit and delete buttons

import {fire, on} from 'delegated-events'
import IncludeFragmentElement from '@github/include-fragment-element'

import {dialog} from '../../details-dialog'
import {fetchSafeDocumentFragment} from '../../fetch'
import {fromEvent} from '../../subscription'
import {hasDirtyFields} from '../../has-interactions'
import {observe} from 'selector-observer'
import {remoteForm} from '@github/remote-form'
import {updateContent} from '../../updatable-content'

let bodyErrors: string[] = []

// Preload the edit form fragment when the dropdown menu is loaded
observe('.js-comment-header-actions-deferred-include-fragment', {
  subscribe: el =>
    fromEvent(
      el,
      'loadstart',
      () => {
        const container = el.closest<HTMLElement>('.js-comment')!
        loadEditFormDeferredIncludeFragment(container)
      },
      {capture: false, once: true}
    )
})

// If the comment contains a task list we need to immediately load the edit form
// because it's used to decide if the user can edit tasks in the list or not
observe('.js-comment .contains-task-list', {
  add: el => {
    const container = el.closest<HTMLElement>('.js-comment')!
    loadEditFormDeferredIncludeFragment(container)
  }
})

// Edit button
on('click', '.js-comment-edit-button', function (event) {
  const container = event.currentTarget.closest<HTMLElement>('.js-comment')!
  container.classList.add('is-comment-editing')

  // Focus on the edit form when it is loaded
  const editFormIncludeFragment = findEditFormDeferredIncludeFragment(container)
  if (!editFormIncludeFragment) {
    // Edit form is already loaded into the DOM so just focus on it
    focusEditForm(container)
  } else {
    // If an <include-fragment> exists, wait till it's loaded before focusing
    editFormIncludeFragment.addEventListener('include-fragment-replaced', () => focusEditForm(container), {once: true})
  }

  const dropdown = event.currentTarget.closest('.js-dropdown-details')
  if (dropdown) {
    dropdown.removeAttribute('open')
  }
})

function focusEditForm(container: HTMLElement) {
  container.querySelector<HTMLElement>('.js-write-tab')!.click()
  const field = container.querySelector<HTMLElement>('.js-comment-field')!
  ;(field as HTMLTextAreaElement).focus()
  // Trigger size-to-fit (see #15696)
  fire(field, 'change')
}

function findEditFormDeferredIncludeFragment(container: HTMLElement) {
  return container.querySelector<IncludeFragmentElement>('.js-comment-edit-form-deferred-include-fragment')
}

// By default the edit form include fragment is set to `loading=lazy` to avoid triggering
// loading on pageload, however sometimes we want to pre-emptively load it
function loadEditFormDeferredIncludeFragment(container: HTMLElement) {
  findEditFormDeferredIncludeFragment(container)?.setAttribute('loading', 'eager')
}

// Show minimize form button
on('click', '.js-comment-hide-button', function (event) {
  const comment = event.currentTarget.closest<HTMLElement>('.js-comment')!
  const minimizeForm = comment.querySelector('.js-minimize-comment')
  /* eslint-disable-next-line github/no-d-none */
  if (minimizeForm) minimizeForm.classList.remove('d-none')

  const dropdown = event.currentTarget.closest('.js-dropdown-details')
  if (dropdown) {
    dropdown.removeAttribute('open')
  }
})

// Hide minimize form button
on('click', '.js-comment-hide-minimize-form', function (event) {
  const minimizeForm = event.currentTarget.closest<HTMLElement>('.js-minimize-comment')!
  /* eslint-disable-next-line github/no-d-none */
  minimizeForm.classList.add('d-none')
})

// Comment Cancel button
export function handleCommentCancelButtonClick(event: Event & {currentTarget: Element}) {
  const form = event.currentTarget.closest<HTMLFormElement>('form')!
  const confirmText = event.currentTarget.getAttribute('data-confirm-text')!
  if (hasDirtyFields(form) && !confirm(confirmText)) {
    return false
  }

  for (const field of form.querySelectorAll('input, textarea')) {
    const fieldEl = field as HTMLInputElement | HTMLTextAreaElement
    fieldEl.value = fieldEl.defaultValue

    if (fieldEl.classList.contains('session-resumable-canceled')) {
      fieldEl.classList.add('js-session-resumable')
      fieldEl.classList.remove('session-resumable-canceled')
    }
  }

  const comment = event.currentTarget.closest('.js-comment')
  if (comment) {
    comment.classList.remove('is-comment-editing')
  }

  return true
}
on('click', '.js-comment-cancel-button', handleCommentCancelButtonClick)

// Issue edit cancel
on('click', '.js-cancel-issue-edit', function (event) {
  const container = event.currentTarget.closest<HTMLElement>('.js-details-container')!
  container.querySelector<HTMLElement>('.js-comment-form-error')!.hidden = true
})

// Show loading state for updating, deleting, minimizing, and unminimizing
// Add version so server can decide if we're working with fresh data
remoteForm(
  '.js-comment-delete, .js-comment .js-comment-update, .js-issue-update, .js-comment-minimize, .js-comment-unminimize',
  function (form, wants, request) {
    const comment = form.closest<HTMLElement>('.js-comment')!
    comment.classList.add('is-comment-loading')
    const bodyVersion = comment.getAttribute('data-body-version')
    if (bodyVersion) {
      request.headers.set('X-Body-Version', bodyVersion)
    }
  }
)

// Rejected updates that are stale freezes the form and shows an error.
// See AbstractRepositoryController#render_stale_error for stale error response.
remoteForm('.js-comment .js-comment-update', async function (form, wants) {
  let response
  const comment = form.closest<HTMLElement>('.js-comment')!
  const updateError = comment.querySelector('.js-comment-update-error')
  const bodyError = comment.querySelector('.js-comment-body-error')
  if (updateError instanceof HTMLElement) {
    updateError.hidden = true
  }
  if (bodyError instanceof HTMLElement) {
    bodyError.hidden = true
  }
  bodyErrors = []

  try {
    response = await wants.json()
  } catch (error) {
    if (error.response.status === 422) {
      const data = JSON.parse(error.response.text)

      if (data.errors) {
        if (updateError instanceof HTMLElement) {
          // eslint-disable-next-line i18n-text/no-en
          updateError.textContent = `There was an error posting your comment: ${data.errors.join(', ')}`
          updateError.hidden = false
        }
        return
      }
    } else {
      throw error
    }
  }

  if (!response) return
  const data = response.json

  if (data.errors && data.errors.length > 0) {
    bodyErrors = data.errors
    showBodyErrors(bodyError as HTMLElement)
  }

  const commentBody = comment.querySelector('.js-comment-body')
  if (commentBody && data.body) {
    commentBody.innerHTML = data.body
  }

  comment.setAttribute('data-body-version', data.newBodyVersion)
  const bodyVersionInput = comment.querySelector('.js-body-version')
  if (bodyVersionInput instanceof HTMLInputElement) {
    bodyVersionInput.value = data.newBodyVersion
  }

  for (const field of comment.querySelectorAll('input, textarea')) {
    const fieldEl = field as HTMLInputElement | HTMLTextAreaElement
    fieldEl.defaultValue = fieldEl.value
  }

  // If the comment was previously stale, remove the warning as it is now fresh
  comment.classList.remove('is-comment-stale', 'is-comment-editing')

  const edits = comment.querySelector('.js-comment-edit-history')
  if (edits) {
    const html = await fetchSafeDocumentFragment(document, data.editUrl)
    edits.innerHTML = ''
    edits.append(html)
  }
})

// this block will show the error block if there were errors on body modification
observe('.js-comment-body-error', {
  add: el => {
    if (bodyErrors && bodyErrors.length > 0) {
      showBodyErrors(el as HTMLElement)
    }
  }
})

function showBodyErrors(el: HTMLElement) {
  const ol = el.querySelector('ol')
  if (ol) {
    ol.innerHTML = ''
    const items = bodyErrors.map(e => {
      const li = document.createElement('li')
      li.textContent = e
      return li
    })
    for (const li of items) {
      ol.appendChild(li)
    }
  }
  el.hidden = false
}

// Hide loading state for updating, deleting, minimizing, and unminimizing
remoteForm(
  '.js-comment .js-comment-delete, .js-comment .js-comment-update, .js-comment-minimize, .js-comment-unminimize',
  async function (form, wants) {
    const comment = form.closest<HTMLElement>('.js-comment')!
    try {
      await wants.text()
    } catch (error) {
      if (error.response.status === 422) {
        let data
        try {
          data = JSON.parse(error.response.text)
        } catch (e) {
          // Do nothing
        }

        if (data && data.stale) comment.classList.add('is-comment-stale')
      } else {
        throw error
      }
    }

    comment.classList.remove('is-comment-loading')
  }
)

remoteForm('.js-discussion-comment-unminimize, .js-discussion-comment-minimize', async function (form, wants) {
  const comment = form.closest<HTMLElement>('.js-discussion-comment')!
  const minimizeError = comment.querySelector<HTMLElement>('.js-discussion-comment-error')
  if (minimizeError) {
    minimizeError.hidden = true
  }

  try {
    const response = await wants.html()
    comment.replaceWith(response.html)
  } catch (error) {
    if (error.response.status >= 400 && error.response.status < 500) {
      if (error.response.html) {
        const errorMessage = error.response.html.querySelector('.js-discussion-comment')!.getAttribute('data-error')!
        if (minimizeError instanceof HTMLElement) {
          minimizeError.textContent = errorMessage
          minimizeError.hidden = false
        }
      }
    } else {
      throw error
    }
  }
})

// Remove comment if deleted successfully
remoteForm('.js-comment-delete', async function (form, wants) {
  await wants.json()
  let container = form.closest('.js-comment-delete-container')

  if (!container) {
    container = form.closest('.js-comment-container') || form.closest('.js-line-comments')

    if (container && container.querySelectorAll('.js-comment').length !== 1) {
      container = form.closest<HTMLElement>('.js-comment')!
    }
  }

  container!.remove()
})

// Update issue/PR/discussion title if successful
remoteForm('.js-issue-update', async function (form, wants) {
  const container = form.closest<HTMLElement>('.js-details-container')!
  const errorDisplay = container.querySelector<HTMLElement>('.js-comment-form-error')!

  let response
  try {
    response = await wants.json()
  } catch (error) {
    // eslint-disable-next-line i18n-text/no-en
    errorDisplay.textContent = error.response?.json?.errors?.[0] || 'Something went wrong. Please try again.'
    errorDisplay.hidden = false
  }

  if (!response) return

  container.classList.remove('open')
  errorDisplay.hidden = true
  const data = response.json
  if (data.issue_title != null) {
    container.querySelector<HTMLElement>('.js-issue-title')!.textContent = data.issue_title
    const issuesContainer = container.closest('.js-issues-results')
    if (issuesContainer) {
      if (issuesContainer.querySelector('.js-merge-pr.is-merging')) {
        const mergeField = issuesContainer.querySelector('.js-merge-pull-request textarea')
        if (mergeField instanceof HTMLTextAreaElement && mergeField.value === mergeField.defaultValue) {
          mergeField.value = mergeField.defaultValue = data.issue_title
        }
      } else if (issuesContainer.querySelector('.js-merge-pr.is-squashing')) {
        const mergeField = issuesContainer.querySelector('.js-merge-pull-request .js-merge-title')
        if (mergeField instanceof HTMLInputElement && mergeField.value === mergeField.defaultValue) {
          mergeField.value = mergeField.defaultValue = data.default_squash_commit_title
        }
      }

      const mergeButton = issuesContainer.querySelector('button[value=merge]')
      if (mergeButton) {
        mergeButton.setAttribute('data-input-message-value', data.issue_title)
      }

      const squashInput = issuesContainer.querySelector('button[value=squash]')
      if (squashInput) {
        squashInput.setAttribute('data-input-title-value', data.default_squash_commit_title)
      }
    }
  }
  document.title = data.page_title
  for (const field of form.elements) {
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.defaultValue = field.value
    }
  }
})

// Hide comment if minimized successfully
remoteForm('.js-comment-minimize', async function (form, wants) {
  await wants.json()
  const comment = form.closest<HTMLElement>('.js-comment')!

  const minimizeForm = comment.querySelector('.js-minimize-comment')

  if (minimizeForm && minimizeForm.classList.contains('js-update-minimized-content')) {
    const submitButton = form.querySelector<HTMLInputElement | HTMLButtonElement>(
      'input[type=submit], button[type=submit]'
    )

    if (submitButton) {
      submitButton.classList.add('disabled')
    }
    const updatableCommentContainer = comment.closest<HTMLElement>('.js-comment-container')
    if (updatableCommentContainer) {
      await updateContent(updatableCommentContainer)
    }
  } else {
    /* eslint-disable-next-line github/no-d-none */
    if (minimizeForm) minimizeForm.classList.add('d-none')
    const unminimizedComment = form.closest<HTMLElement>('.unminimized-comment')!
    /* eslint-disable-next-line github/no-d-none */
    unminimizedComment.classList.add('d-none')
    unminimizedComment.classList.remove('js-comment')

    const commentGroup = form.closest<HTMLElement>('.js-minimizable-comment-group')!
    const minimizedComment = commentGroup.querySelector('.minimized-comment')
    /* eslint-disable-next-line github/no-d-none */
    if (minimizedComment) minimizedComment.classList.remove('d-none')
    if (minimizedComment) minimizedComment.classList.add('js-comment')
  }
})

// Show comment if unminimized successfully
remoteForm('.js-comment-unminimize', async function (form, wants) {
  await wants.json()
  const commentGroup = form.closest<HTMLElement>('.js-minimizable-comment-group')!
  const unminimizedComment = commentGroup.querySelector('.unminimized-comment')
  const minimizedComment = commentGroup.querySelector('.minimized-comment')

  if (unminimizedComment) {
    /* eslint-disable-next-line github/no-d-none */
    unminimizedComment.classList.remove('d-none')
    unminimizedComment.classList.add('js-comment')

    /* eslint-disable-next-line github/no-d-none */
    if (minimizedComment) minimizedComment.classList.add('d-none')
    if (minimizedComment) minimizedComment.classList.remove('js-comment')
  } else {
    // if the unminimizedComment is not present at this point,
    // try to fetch it from the server
    if (minimizedComment) {
      const actionForm = minimizedComment.querySelector('.timeline-comment-actions')
      // hide form while waiting for updated content
      /* eslint-disable-next-line github/no-d-none */
      if (actionForm) actionForm.classList.add('d-none')
      minimizedComment.classList.remove('js-comment')
    }

    const updatableCommentContainer = commentGroup.closest<HTMLElement>('.js-comment-container')!
    await updateContent(updatableCommentContainer)
  }
})

on(
  'details-menu-select',
  '.js-comment-edit-history-menu',
  event => {
    const url = (event as CustomEvent).detail.relatedTarget.getAttribute('data-edit-history-url')
    if (!url) return
    // Prevent menu from closing
    event.preventDefault()
    const content = fetchSafeDocumentFragment(document, url)
    dialog({content, dialogClass: 'Box-overlay--wide'})
  },
  {capture: true}
)
