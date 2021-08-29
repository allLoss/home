// Commenting: Close button
//
// When comment fields also have a "Close" button, update the copy of the
// button when text is present to indicate that the form will both post a
// comment and close the discussion.
//
// Markup
//
//     <form>
//       <textarea class="js-comment-field"></textarea>
//       <div>
//         <button type="submit">Comment</button>
//         <button type="submit" class="js-comment-and-button"
//           data-comment-text="Close with comment">
//           Close
//         </button>
//       </div>
//     </form>

import {observe} from 'selector-observer'

const setButtonText = (button: HTMLButtonElement, hasValue: boolean) => {
  const spanText = button.querySelector('.js-form-action-text')
  const textTarget = spanText ? spanText : button
  textTarget.textContent = hasValue
    ? button.getAttribute('data-comment-text')!
    : textTarget.getAttribute('data-default-action-text')!
}

const createInputHandler = (button: HTMLButtonElement): ((event: Event) => void) => {
  let previousHasValue: string

  // Handle input.
  return (event: Event) => {
    const target = event.currentTarget
    const newValue = (target as HTMLInputElement).value.trim()

    if (newValue !== previousHasValue) {
      previousHasValue = newValue
      setButtonText(button, Boolean(newValue))
    }
  }
}

observe('.js-comment-and-button', {
  constructor: HTMLButtonElement,
  initialize(button) {
    const commentField = button.form!.querySelector<HTMLElement>('.js-comment-field')!
    const handleInput = createInputHandler(button)

    return {
      add() {
        commentField.addEventListener('input', handleInput)
        commentField.addEventListener('change', handleInput)
      },
      remove() {
        commentField.removeEventListener('input', handleInput)
        commentField.removeEventListener('change', handleInput)
      }
    }
  }
})
