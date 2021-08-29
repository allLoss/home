import {eventToHotkeyString} from '@github/hotkey'
import {insertText} from '../text'
import {on} from 'delegated-events'
import {onKey} from '../onfocus'

on(
  'details-menu-select',
  '.js-saved-reply-menu',
  function (event) {
    if (!(event.target instanceof Element)) return

    const body = event.detail.relatedTarget.querySelector('.js-saved-reply-body')

    // Since this details-menu-select can hold options which arent saved
    // replies, we guard to ensure that only saved replies are handled here.
    if (!body) return

    const text = (body.textContent || '').trim()
    const container = event.target.closest<HTMLElement>('.js-previewable-comment-form')!

    const comment = container.querySelector<HTMLTextAreaElement>('textarea.js-comment-field')!
    insertText(comment, text)
    setTimeout(() => comment.focus(), 0)
  },
  {capture: true}
)

onKey('keydown', '.js-saved-reply-shortcut-comment-field', function (event) {
  if (eventToHotkeyString(event) === 'Control+.') {
    const container = (event.target as Element).closest<HTMLElement>('.js-previewable-comment-form')!
    const menu = container.querySelector<HTMLElement>('.js-saved-reply-container')!
    menu.setAttribute('open', '')
    event.preventDefault()
  }
})

onKey('keydown', '.js-saved-reply-filter-input', function (event: KeyboardEvent) {
  if (/^Control\+[1-9]$/.test(eventToHotkeyString(event))) {
    const container = (event.target as Element).closest<HTMLElement>('.js-saved-reply-container')!
    const replies = container.querySelectorAll('[role="menuitem"]')
    const savedReplyNumber = Number(event.key)
    const reply = replies[savedReplyNumber - 1]
    if (reply instanceof HTMLElement) {
      reply.click()
      event.preventDefault()
    }
  }
})
