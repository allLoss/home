import {dialog} from '../details-dialog'
import {eventToHotkeyString} from '@github/hotkey'
import {fetchSafeDocumentFragment} from '../fetch'
import {isFormField} from '../form'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

let shortcutModalShown = false

async function showKeyboardShortcuts() {
  if (shortcutModalShown) return
  shortcutModalShown = true

  const metaKeyboardShortcuts = document.querySelector<HTMLMetaElement>('meta[name=github-keyboard-shortcuts]')!
  const options = {contexts: metaKeyboardShortcuts.content}
  const url = `/site/keyboard_shortcuts?${new URLSearchParams(options).toString()}`

  const shortcutModal = await dialog({
    content: fetchSafeDocumentFragment(document, url),
    dialogClass: 'hx_Box--overlay--wide'
  })
  shortcutModal.addEventListener(
    'dialog:remove',
    function () {
      shortcutModalShown = false
    },
    {once: true}
  )
}

// Toggles ajax request to display keyboard shortcuts.
//
// Add a class of `js-keyboard-shortcuts` to get this behavior on your page.
on('click', '.js-keyboard-shortcuts', showKeyboardShortcuts)

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.target instanceof Node && isFormField(event.target)) return
  if (eventToHotkeyString(event) !== '?') return
  showKeyboardShortcuts()
})

observe('.js-modifier-key', {
  constructor: HTMLElement,
  add(container) {
    if (/Macintosh/.test(navigator.userAgent)) {
      let shortcut = container.textContent
      if (shortcut) {
        shortcut = shortcut.replace(/ctrl/, '⌘')
        shortcut = shortcut.replace(/alt/, '⌥')
        container.textContent = shortcut
      }
    }
  }
})

observe('.js-modifier-label-key', {
  add(container) {
    if (/Macintosh/.test(navigator.userAgent)) {
      let shortcutLabel = container.getAttribute('aria-label')!
      shortcutLabel = shortcutLabel.replace(/ctrl\+/, 'cmd-')
      shortcutLabel = shortcutLabel.replace(/alt\+/, 'option-')
      container.setAttribute('aria-label', shortcutLabel)
    }
  }
})
