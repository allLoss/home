import {on} from 'delegated-events'

on('auto-check-success', '.js-new-organization-name', function (event) {
  const field = event.target as HTMLInputElement
  const container = field.closest<HTMLElement>('dd')!
  const hint = container.querySelector('.js-field-hint-name')
  if (!hint) {
    return
  }
  hint.textContent = field.value
})
