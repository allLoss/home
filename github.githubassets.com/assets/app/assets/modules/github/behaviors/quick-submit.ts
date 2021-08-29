// Quick submit using ⌘-Enter or Ctrl+Enter
//
// When `.js-quick-submit` field is focused, ⌘-Enter or Ctrl+Enter will submit
// the form it belongs to unless the first submit button of that form is disabled.

import {onKey} from '../onfocus'
import {requestSubmit} from '../form'

onKey('keydown', '.js-quick-submit', function (event: KeyboardEvent) {
  quickSubmit(event)
})

function quickSubmit(event: KeyboardEvent) {
  const field = event.target as HTMLInputElement | HTMLTextAreaElement

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    const form = field.form!
    const button = form.querySelector('input[type=submit], button[type=submit]')
    if (event.shiftKey) {
      const altButton = form.querySelector('.js-quick-submit-alternative')
      if ((altButton instanceof HTMLInputElement || altButton instanceof HTMLButtonElement) && !altButton.disabled) {
        requestSubmit(form, altButton)
      }
    } else if (button instanceof HTMLInputElement || button instanceof HTMLButtonElement) {
      if (!button.disabled) {
        requestSubmit(form)
      }
    } else {
      requestSubmit(form)
    }
    event.preventDefault()
  }
}
