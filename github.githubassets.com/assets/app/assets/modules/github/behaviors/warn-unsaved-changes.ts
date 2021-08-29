import {hasDirtyFields} from '../has-interactions'
import {observe} from 'selector-observer'

// Add the 'data-warn-unsaved-changes' attribute to any form/container element
// and it will be monitored for changes. If the user attempts to
// navigate away from the page without first saving their changes, an alert
// will warn them.
observe('[data-warn-unsaved-changes]', {
  add(container) {
    container.addEventListener('input', prepareUnsavedChangesWarning)
    container.addEventListener('change', prepareUnsavedChangesWarning)
    container.addEventListener('submit', disableSaveChangesReminder)

    const dialog = container.closest('details-dialog')
    if (dialog) {
      dialog.closest<HTMLElement>('details')!.addEventListener('toggle', disableSaveChangesReminderOnClosedDialogs)
      dialog.addEventListener('details-dialog-close', promptOnDialogClosing)
    }
  },
  remove(container) {
    container.removeEventListener('input', prepareUnsavedChangesWarning)
    container.removeEventListener('change', prepareUnsavedChangesWarning)
    container.removeEventListener('submit', disableSaveChangesReminder)

    const dialog = container.closest('details-dialog')
    if (dialog) {
      dialog.closest<HTMLElement>('details')!.removeEventListener('toggle', disableSaveChangesReminderOnClosedDialogs)
      dialog.removeEventListener('details-dialog-close', promptOnDialogClosing)
      disableSaveChangesReminder()
    }
  }
})

function prepareUnsavedChangesWarning(event: Event) {
  const currentTarget = event.currentTarget as Element

  if (hasDirtyFields(currentTarget)) {
    enableSaveChangesReminder(currentTarget)
  } else {
    disableSaveChangesReminder()
  }
}

function enableSaveChangesReminder(container: Element) {
  // This message is ignored by most browsers.
  // eslint-disable-next-line i18n-text/no-en
  const message = container.getAttribute('data-warn-unsaved-changes') || 'Changes you made may not be saved.'

  window.onbeforeunload = function (event: BeforeUnloadEvent): string {
    event.returnValue = message
    return message
  }
}

function disableSaveChangesReminder() {
  window.onbeforeunload = null
}

function disableSaveChangesReminderOnClosedDialogs({currentTarget}: Event) {
  if (!(currentTarget as Element).hasAttribute('open')) {
    disableSaveChangesReminder()
  }
}

function promptOnDialogClosing(event: Event) {
  const dialog = event.currentTarget as Element
  const details = dialog.closest('details[open]')
  if (!details) {
    return
  }

  let confirmed = true
  const confirmationForms = dialog.querySelectorAll<HTMLFormElement>('form[data-warn-unsaved-changes]')
  for (const form of confirmationForms) {
    if (hasDirtyFields(form)) {
      const message = form.getAttribute('data-warn-unsaved-changes')!
      confirmed = confirm(message)
      break
    }
  }

  if (!confirmed) {
    event.preventDefault()
  }
}
