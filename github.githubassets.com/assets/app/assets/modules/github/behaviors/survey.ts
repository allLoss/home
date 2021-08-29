import {fire, on} from 'delegated-events'

// Handle "Other" text input for the early access survey.
//
// field - The field.
// isOther - If true then the "Other" input will be set to required, and focussed.
function handleOther(field: Element, isOther: boolean) {
  const question = field.closest<HTMLElement>('.js-survey-question-form')!
  const otherInput = question.querySelector<HTMLInputElement>('input.js-survey-other-text')!
  const isOtherSelected = isOther && !question.classList.contains('is-other-selected')

  question.classList.toggle('is-other-selected', isOtherSelected)
  otherInput.hidden = !isOther
  if (isOtherSelected) {
    otherInput.required = true
    otherInput.focus()
  } else {
    otherInput.required = false
  }
  fire(otherInput, 'change')
}

on('change', 'input.js-survey-radio', function ({currentTarget}) {
  handleOther(currentTarget, currentTarget.classList.contains('js-survey-radio-other'))
})

on('change', 'input.js-survey-checkbox-other', function ({currentTarget}) {
  handleOther(currentTarget, true)
})

on('change', 'input.js-survey-checkbox-enable-submit', function ({currentTarget}) {
  const checked = (currentTarget as HTMLInputElement).checked
  const submitButton = currentTarget
    .closest<HTMLElement>('form')
    ?.querySelector<HTMLButtonElement>('button[type=submit]')

  submitButton!.disabled = !checked
})

on('change', 'input.js-survey-contact-checkbox', function (event: Event) {
  const currentTarget = event.currentTarget as HTMLInputElement
  const question = currentTarget.closest<HTMLElement>('.js-survey-question-form')!
  const hiddenInput = question.querySelector<HTMLElement>('.js-survey-contact-checkbox-hidden')!
  if (currentTarget.checked) {
    hiddenInput.setAttribute('disabled', 'true')
  } else {
    hiddenInput.removeAttribute('disabled')
  }
})
