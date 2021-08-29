import {ColorModeWithAuto, setClientMode} from '../color-modes'
import {on} from 'delegated-events'

on('submit', '.js-color-mode-keyboard-toggle', async event => {
  event.preventDefault()

  const form = event.currentTarget as HTMLFormElement
  const formData = new FormData(form)
  const colorMode = formData.get('color_mode') as ColorModeWithAuto

  const appearanceForm = document.querySelector('appearance-form')
  if (appearanceForm) {
    appearanceForm.dispatchEvent(
      new CustomEvent('color-modes-keyboard-toggle', {
        bubbles: true,
        cancelable: false,
        detail: {
          mode: colorMode
        }
      })
    )
  }

  setClientMode(colorMode)

  fetch(form.action, {
    method: form.method,
    body: formData,
    headers: {'X-Requested-With': 'XMLHttpRequest'}
  })
})
