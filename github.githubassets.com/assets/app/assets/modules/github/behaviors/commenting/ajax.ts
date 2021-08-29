// Commenting: AJAX form submission
//
// Markup
//
//     <form class="js-new-comment-form">
//       <div class="js-comment-form-error" hidden>
//       </div>
//
//       <textarea class="js-comment-field"></textarea>
//
//       <button type="submit">
//         Comment
//       </button>
//     </form>
//
// Primer Validation example:
// see: https://primer.style/css/components/forms#form-group-validation
//
//   <form class="js-new-comment-form">
//     <div class="form-group js-remove-error-state-on-click">
//       <textarea class="js-comment-field" aria-describedby="body-input-validation",
//       </textarea>
//
//       <p class="note error js-comment-form-error" id="body-input-validation" hidden></p>
//
//       <button type="submit">
//         Comment
//       </button>
//     </div>
//   </form>

import {fire, on} from 'delegated-events'
import type {ErrorWithResponse} from '@github/remote-form'
import {changeValue} from '../../form'
import {remoteForm} from '@github/remote-form'
import {replaceContent} from '../../updatable-content'

// Hide any comment errors on retry.
function clearFormError(form: Element) {
  const formError = form.querySelector('.js-comment-form-error')
  if (formError instanceof HTMLElement) {
    formError.hidden = true
  }
}

// Remove error state when Primer Form Validation enabled field is clicked on
on('click', '.errored.js-remove-error-state-on-click', function ({currentTarget}) {
  currentTarget.classList.remove('errored')
})

// Reset form after AJAX request is successful
remoteForm('.js-new-comment-form', async function (form, wants) {
  let response
  clearFormError(form)
  try {
    response = await wants.json()
  } catch (error) {
    handleFormError(form, error)
  }

  if (!response) {
    return
  }

  form.reset()
  for (const field of form.querySelectorAll<HTMLInputElement>('.js-resettable-field')) {
    changeValue(field, field.getAttribute('data-reset-value') || '')
  }
  const writeTab = form.querySelector('.js-write-tab')
  if (writeTab instanceof HTMLElement) {
    writeTab.click()
  }
  const ref = response.json.updateContent

  for (const selector in ref) {
    const html = ref[selector]
    const el = document.querySelector(selector)
    if (el instanceof HTMLElement) {
      replaceContent(el, html)
    } else {
      // eslint-disable-next-line no-console
      console.warn(`couldn't find ${selector} for immediate update`)
    }
  }

  fire(form, 'comment:success')
})

// Show comment error if ajax request fails.
function handleFormError(form: Element, error: ErrorWithResponse) {
  // eslint-disable-next-line i18n-text/no-en
  let message = "You can't comment at this time"
  if (error.response && error.response.status === 422) {
    const data = error.response.json
    if (data.errors) {
      if (Array.isArray(data.errors)) {
        message += ` — your comment ${data.errors.join(', ')}`
      } else {
        message = data.errors
      }
    }
  }

  message += '. '

  const formError = form.querySelector('.js-comment-form-error')
  if (formError instanceof HTMLElement) {
    formError.textContent = message
    formError.hidden = false

    const formGroupValidationFormWrapper = formError.closest('div.form-group.js-remove-error-state-on-click')

    if (formGroupValidationFormWrapper) {
      formGroupValidationFormWrapper.classList.add('errored')
    }
  }
}
