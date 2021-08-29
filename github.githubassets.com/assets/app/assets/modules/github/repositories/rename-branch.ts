import {on} from 'delegated-events'

function updateRenameInstructions(input: HTMLInputElement) {
  const container = input.closest<HTMLElement>('.js-rename-branch-form')!
  const newNameElements = container.querySelectorAll('.js-rename-branch-new-name')
  let newName = input.value
  const wasNewNameGiven = newName !== input.defaultValue && newName !== ''

  if (wasNewNameGiven) {
    const autocheckMessage = container.querySelector('.js-rename-branch-autocheck-message')
    if (autocheckMessage && autocheckMessage.hasAttribute('data-normalized-name')) {
      newName = autocheckMessage.getAttribute('data-normalized-name')!
    }

    for (const newNameEl of newNameElements) {
      newNameEl.textContent = newName
    }
  }
}

on('auto-check-message-updated', '.js-rename-branch-input', function (event) {
  const input = event.currentTarget as HTMLInputElement
  updateRenameInstructions(input)
})
