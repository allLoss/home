import {onFocus, onInput} from '../onfocus'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

const supportedFields = [
  'input[pattern]',
  'input[required]',
  'textarea[required]',
  'input[data-required-change]',
  'textarea[data-required-change]',
  'input[data-required-value]',
  'textarea[data-required-value]'
].join(',')

type Field = HTMLInputElement | HTMLTextAreaElement

function checkValidityForRequiredValueField(field: Field) {
  const requiredValue = field.getAttribute('data-required-value')!
  const prefix = field.getAttribute('data-required-value-prefix')

  if (field.value === requiredValue) {
    field.setCustomValidity('')
  } else {
    let message = requiredValue
    if (prefix) {
      message = prefix + message
    }
    field.setCustomValidity(message)
  }
}

onInput('[data-required-value]', function (event) {
  const field = event.currentTarget as Field
  checkValidityForRequiredValueField(field)
})

on('change', '[data-required-value]', function (event) {
  const field = event.currentTarget as Field
  checkValidityForRequiredValueField(field)

  // We need to call validate since we don't fire a `change` event on the form
  // when session-resume dumps the text back into the field.
  validate(field.form!)
})

onInput('[data-required-trimmed]', function (event) {
  const field = event.currentTarget as Field
  if (field.value.trim() === '') {
    field.setCustomValidity(field.getAttribute('data-required-trimmed')!)
  } else {
    field.setCustomValidity('')
  }
})

on('change', '[data-required-trimmed]', function (event) {
  const field = event.currentTarget as Field
  if (field.value.trim() === '') {
    field.setCustomValidity(field.getAttribute('data-required-trimmed')!)
  } else {
    field.setCustomValidity('')
  }

  // We need to call validate since we don't fire a `change` event on the form
  // when session-resume dumps the text back into the field.
  validate(field.form!)
})

// Observe required fields and validate form when their validation state
// changes.
onFocus(supportedFields, field => {
  let previousValid = (field as Field).checkValidity()
  function inputHandler() {
    const currentValid = (field as Field).checkValidity()
    if (currentValid !== previousValid && (field as Field).form) {
      validate((field as Field).form!)
    }
    previousValid = currentValid
  }

  field.addEventListener('input', inputHandler)
  field.addEventListener('blur', function blurHandler() {
    field.removeEventListener('input', inputHandler)
    field.removeEventListener('blur', blurHandler)
  })
})

const installedForms = new WeakMap()

// Install validation handlers on a form.
function installHandlers(form: HTMLFormElement) {
  if (installedForms.get(form)) return
  form.addEventListener('change', () => validate(form))
  installedForms.set(form, true)
}

// Validate a form or input.
export function validate(form: HTMLInputElement | HTMLFormElement) {
  const validity = form.checkValidity()
  for (const button of form.querySelectorAll<HTMLButtonElement>('button[data-disable-invalid]')) {
    button.disabled = !validity
  }
}

observe('button[data-disable-invalid]', {
  constructor: HTMLButtonElement,
  initialize(button) {
    const form = button.form
    if (form) {
      installHandlers(form)
      button.disabled = !form.checkValidity()
    }
  }
})

// A custom attribute similar to `required`, but only passes validation once
// the value of the field has changed from its initial value.
observe('input[data-required-change], textarea[data-required-change]', function (element) {
  const field = element as Field
  const radioInputDefault =
    field.type === 'radio' && field.form ? (field.form!.elements.namedItem(field.name) as RadioNodeList).value : null

  // Custom Validity Event Handler.
  function customValidity(event?: Event) {
    const form = field.form!
    if (event && field.type === 'radio' && form && radioInputDefault) {
      for (const radio of form.elements.namedItem(field.name) as RadioNodeList) {
        if (radio instanceof HTMLInputElement) {
          radio.setCustomValidity(field.value === radioInputDefault ? 'unchanged' : '')
        }
      }
    } else {
      field.setCustomValidity(field.value === (radioInputDefault || field.defaultValue) ? 'unchanged' : '')
    }
  }

  field.addEventListener('input', customValidity)
  field.addEventListener('change', customValidity)
  customValidity()

  if ((field as Field).form) {
    validate((field as Field).form!)
  }
})

document.addEventListener('reset', function (event: Event) {
  if (event.target instanceof HTMLFormElement) {
    const form = event.target
    setTimeout(() => validate(form))
  }
})
