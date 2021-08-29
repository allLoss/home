import {on} from 'delegated-events'

// Behaviors related to special cases in GFM content
// Toggles quoted email reply content
on('click', '.email-hidden-toggle', function (event) {
  // assert nextElementSibling is .email-hidden-reply
  const replyContainer = event.currentTarget.nextElementSibling
  if (!(replyContainer instanceof HTMLElement)) return

  replyContainer.style.display = ''
  replyContainer.classList.toggle('expanded')

  event.preventDefault()
})
