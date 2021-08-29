// Example:
//
//    <div class="js-line-comments">
//      <div class="js-inline-comment-form-container">
//        <button class="js-toggle-inline-comment-form">
//        <form>
//          <texarea class="js-comment-field"></textarea>
//          <button class="js-hide-inline-comment-form">Cancel</button>
//        </form>
//      </div>
//    </div>

import {fire, on} from 'delegated-events'
import {hasDirtyFields} from '../has-interactions'
import {onKey} from '../onfocus'

// "Add a line note" button
//
// Hide self and show form.
on('click', '.js-toggle-inline-comment-form', function (event) {
  const comments = event.currentTarget.closest<HTMLElement>('.js-line-comments')!
  focusForm(comments)
})

// With a line comment selected, hitting "r" focuses the form with the quoted
// text.
on('quote-selection', '.js-line-comments', function (event) {
  focusForm(event.currentTarget)
})

// Install handlers on inline note comment form focusin
onKey('keydown', '.js-inline-comment-form-container form .js-comment-field', function (event: KeyboardEvent) {
  const field = event.target as HTMLTextAreaElement

  if (field.classList.contains('js-navigation-enable')) {
    return
  }

  if (event.key === 'Escape' && field.value.length === 0) {
    const form = field.closest<HTMLFormElement>('form')!
    blurForm(form)
    event.preventDefault()
  }
})

// "Close form" button
//
// Hide self and show "Add a line button" again. If theres no comments cleanup
// the empty container.
on('click', '.js-hide-inline-comment-form', function (event) {
  const form = event.currentTarget.closest<HTMLFormElement>('form')!

  const container = event.currentTarget.closest<HTMLElement>('.js-inline-comment-form-container')!
  const multiLinePreview = container.querySelector<HTMLElement>('.js-multi-line-preview')
  if (multiLinePreview) {
    multiLinePreview.hidden = true
  }

  if (!hasDirtyFields(form) || confirm((event.target as Element).getAttribute('data-confirm-cancel-text')!)) {
    blurForm(form)
  } else {
    // Do not reset form
    event.preventDefault()
  }
})

// Opens form container, ensures write tab is selected and focuses textarea.
export function focusForm(comments: Element) {
  const container = comments.querySelector<HTMLElement>('.js-inline-comment-form-container')!
  container.classList.add('open')
  container.querySelector<HTMLElement>('.js-write-tab')?.click()
  container.querySelector<HTMLElement>('.js-comment-field')!.focus()
  fire(container, 'inlinecomment:focus')
}

// Reset and close comment form. Opposite of focusForm.
//
// form - A .js-inline-comment-form HTMLFormElement
export function blurForm(form: HTMLFormElement) {
  form.reset()

  const container = form.closest<HTMLElement>('.js-inline-comment-form-container')!
  container.classList.remove('open')

  fire(container, 'inlinecomment:collapse')
}
