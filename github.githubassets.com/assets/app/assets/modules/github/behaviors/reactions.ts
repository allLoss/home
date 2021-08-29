import {on} from 'delegated-events'
import {parseHTML} from '../parse-html'
import {remoteForm} from '@github/remote-form'

remoteForm('.js-pick-reaction', async function (form, send) {
  const response = await send.json()

  const comment = form.closest<HTMLElement>('.js-comment')!
  const reactionsContainer = comment.querySelector<HTMLElement>('.js-reactions-container')!
  const reactionsHeader = comment.querySelector<HTMLElement>('.js-comment-header-reaction-button')!

  const newReactions = parseHTML(document, response.json['reactions_container'].trim())
  const newReactionButton = parseHTML(document, response.json['comment_header_reaction_button'].trim())
  reactionsContainer.replaceWith(newReactions)
  reactionsHeader.replaceWith(newReactionButton)
})

function showReactionContent(event: MouseEvent) {
  const target = event.target as HTMLElement

  const label = target.getAttribute('data-reaction-label')!
  const container = target.closest<HTMLElement>('.js-add-reaction-popover')!
  const description = container.querySelector<HTMLElement>('.js-reaction-description')!

  if (!description.hasAttribute('data-default-text')) {
    description.setAttribute('data-default-text', description.textContent || '')
  }

  description.textContent = label
}

function hideReactionContent(event: MouseEvent) {
  const container = (event.target as HTMLElement).closest<HTMLElement>('.js-add-reaction-popover')!
  const description = container.querySelector<HTMLElement>('.js-reaction-description')!

  const defaultText = description.getAttribute('data-default-text')
  if (defaultText) {
    description.textContent = defaultText
  }
}

on(
  'toggle',
  '.js-reaction-popover-container',
  function (event) {
    const isOpen = event.currentTarget.hasAttribute('open')
    for (const item of (event.target as Element).querySelectorAll<HTMLElement>('.js-reaction-option-item')) {
      if (isOpen) {
        item.addEventListener('mouseenter', showReactionContent)
        item.addEventListener('mouseleave', hideReactionContent)
      } else {
        item.removeEventListener('mouseenter', showReactionContent)
        item.removeEventListener('mouseleave', hideReactionContent)
      }
    }
  },
  {capture: true}
)
