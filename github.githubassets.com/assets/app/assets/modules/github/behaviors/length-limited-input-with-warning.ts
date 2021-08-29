import {observe} from 'selector-observer'

// Length-limited input with warning.
//
// Limit the length of user input and provide a warning with a character count
// when the user approaches the length limit.
//
// Three classes must be set.
//  - js-length-limited-input.
//  - js-length-limited-input-container.
//  - js-length-limited-input-warning (probably also hidden by default).
//
// Two data attributes should be set on .js-length-limited-input:
//  - data-warning-text, a string template for the warning message.
//    Use `{{remaining}}` to interpolate the number of characters remaining.
//  - data-input-max-length.
//
// @example
// ```html
//    <dd class="js-length-limited-input-container">
//      <input type="text"
//             class="js-length-limited-input"
//             data-warning-text="You have {{remaining}} characters remaining"
//             data-input-max-length="160">
//
//      <p class="js-length-limited-input-warning d-none">
//      </p>
//    </dd>
// ```
function displayLengthWarning(event: Event) {
  // The user input field (<input>, <textarea>, etc)
  const inputField = event.currentTarget
  if (!(inputField instanceof HTMLInputElement || inputField instanceof HTMLTextAreaElement)) return

  // The character limit, set in data attribute "max-length"
  const maxLength = parseInt(inputField.getAttribute('data-input-max-length') || '', 10)

  // The remaining length to start showing the warning for, defaults to 5
  const warningLength = parseInt(inputField.getAttribute('data-warning-length') || '', 10) || 5

  // The user input field (<input>, <textarea>, etc)
  const inputValue = inputField.value

  // New lines need to be counted as two characters. They are by the server.
  const inputValueWithNewLinesFix = inputValue.replace(/(\r\n|\n|\r)/g, '\r\n')

  // Characters remaining before the limit is reached
  let remainingLength = maxLength - inputValueWithNewLinesFix.length

  // HTML maxLength attribute does not count carriage returns correctly.
  // It is also inconsistent between Chrome and Firefox
  // and therefore can't be used bugfree without browser sniffing
  // Creating our own maxLength implementation instead.
  if (remainingLength <= 0) {
    let truncatedInputValue = inputValueWithNewLinesFix.substr(0, maxLength)
    // Trim trailing \r so we don't truncate in the middle of a \r\n newline
    if (truncatedInputValue.endsWith('\r')) {
      truncatedInputValue = truncatedInputValue.substr(0, maxLength - 1)
      remainingLength = 1
    } else {
      remainingLength = 0
    }
    inputField.value = truncatedInputValue
  }

  // The warning message to display after the remaining character count
  const warningText = inputField.getAttribute('data-warning-text')!

  // The container enclosing the length-limited input field
  const inputContainer = inputField.closest<HTMLElement>('.js-length-limited-input-container')!

  // The container for the warning message
  const warningArea = inputContainer.querySelector<HTMLElement>('.js-length-limited-input-warning')!

  if (remainingLength <= warningLength) {
    warningArea.textContent = warningText.replace(new RegExp('{{remaining}}', 'g'), `${remainingLength}`)
    /* eslint-disable-next-line github/no-d-none */
    warningArea.classList.remove('d-none')
  } else {
    warningArea.textContent = ''
    /* eslint-disable-next-line github/no-d-none */
    warningArea.classList.add('d-none')
  }
}

observe('.js-length-limited-input', {
  add(el) {
    el.addEventListener('input', displayLengthWarning)
    el.addEventListener('change', displayLengthWarning)
  },
  remove(el) {
    el.removeEventListener('input', displayLengthWarning)
    el.removeEventListener('change', displayLengthWarning)
  }
})
