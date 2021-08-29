import {on} from 'delegated-events'
import {onKey} from '../../onfocus'

// This regex matches a comment containing only "-1", "+1", ":-", ":-1", ":+", or ":+1"
const plusOneMarker = /^(\+1|-1|:\+1?|:-1?)$/

// Checks to see if a comment is a reaction like comment.
const isReactionLikeComment = (text: string): boolean => {
  let matched = false
  for (const line of text.split('\n')) {
    const l = line.trim()
    if (!l || l.startsWith('>')) continue
    // If a line has matched previously, but this one doesnt,
    // it means the line has more than just a reaction - so return false
    if (matched && plusOneMarker.test(l) === false) {
      return false
    }
    if (!matched && plusOneMarker.test(l)) {
      matched = true
    }
  }
  return matched
}

on('focusout', '#new_comment_field', function (event) {
  const newCommentTextField = event.currentTarget

  const suggestion = newCommentTextField.closest('.js-reaction-suggestion')
  if (suggestion) {
    clearReactionSuggestion(suggestion)
  }
})

on('focusin', '#new_comment_field', function (event) {
  toggleReactionSuggestion(event)
})

onKey('keyup', '#new_comment_field', function (event) {
  toggleReactionSuggestion(event)
})

// Toggle reaction suggestion.
function toggleReactionSuggestion(event: Event) {
  const eventTarget = event.target as HTMLTextAreaElement

  const text = eventTarget.value
  const reactionSuggestion = eventTarget.closest('.js-reaction-suggestion')

  if (!reactionSuggestion) {
    return
  }

  if (isReactionLikeComment(text)) {
    reactionSuggestion.classList.remove('hide-reaction-suggestion')
    reactionSuggestion.classList.add('reaction-suggestion')
    const suggestionText = reactionSuggestion.getAttribute('data-reaction-markup')!
    reactionSuggestion.setAttribute('data-reaction-suggestion-message', suggestionText)
  } else {
    clearReactionSuggestion(reactionSuggestion)
  }
}

// Clear reaction suggestion.
function clearReactionSuggestion(reactionSuggestion: Element) {
  reactionSuggestion.classList.remove('reaction-suggestion')
  reactionSuggestion.classList.add('hide-reaction-suggestion')
  reactionSuggestion.removeAttribute('data-reaction-suggestion-message')
}
