import {announceFromElement} from '../aria-live'
import {on} from 'delegated-events'

const duration = 2000

on('clipboard-copy', '[data-copy-feedback]', event => {
  const clipboardCopyElement = event.currentTarget
  const message = clipboardCopyElement.getAttribute('data-copy-feedback')!
  const originalLabel = clipboardCopyElement.getAttribute('aria-label')
  const direction = clipboardCopyElement.getAttribute('data-tooltip-direction') || 's'

  clipboardCopyElement.setAttribute('aria-label', message)
  clipboardCopyElement.classList.add('tooltipped', `tooltipped-${direction}`)
  if (!(clipboardCopyElement instanceof HTMLElement)) return
  announceFromElement(clipboardCopyElement)

  setTimeout(() => {
    if (originalLabel) {
      clipboardCopyElement.setAttribute('aria-label', originalLabel)
    } else {
      clipboardCopyElement.removeAttribute('aria-label')
    }
    clipboardCopyElement.classList.remove('tooltipped', `tooltipped-${direction}`)
  }, duration)
})

function timerCallback(currentTarget: HTMLElement) {
  clipboardCopyElementTimers.delete(currentTarget)
  toggleCopyButton(currentTarget)
}

// Toggle a copy button.
function toggleCopyButton(button: HTMLElement) {
  const clippyIcon = button.querySelector('.js-clipboard-clippy-icon')
  const checkIcon = button.querySelector('.js-clipboard-check-icon')

  button.classList.toggle('ClipboardButton--success')

  if (clippyIcon) {
    /* eslint-disable-next-line github/no-d-none */
    clippyIcon.classList.toggle('d-none')
  }
  if (checkIcon) {
    if (checkIcon.classList.contains('d-sm-none')) {
      checkIcon.classList.toggle('d-sm-none')
    } else {
      /* eslint-disable-next-line github/no-d-none */
      checkIcon.classList.toggle('d-none')
    }
  }
}

const clipboardCopyElementTimers = new WeakMap<HTMLElement, number>()

on('clipboard-copy', '.js-clipboard-copy', function ({currentTarget}) {
  if (!(currentTarget instanceof HTMLElement)) return

  const currentTimeout = clipboardCopyElementTimers.get(currentTarget)
  if (currentTimeout) {
    clearTimeout(currentTimeout)
  } else {
    toggleCopyButton(currentTarget)
  }

  clipboardCopyElementTimers.set(currentTarget, setTimeout(timerCallback, duration, currentTarget))
})
