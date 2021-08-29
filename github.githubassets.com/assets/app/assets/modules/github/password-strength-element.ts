import {validate} from './behaviors/html-validation'

interface PasswordOptions {
  minimumCharacterCount: number
  passphraseLength: number
}

interface Result {
  valid: boolean
  hasMinimumCharacterCount: boolean
  hasMinimumPassphraseLength: boolean
  hasLowerCase: boolean
  hasNumber: boolean
}

class PasswordStrengthElement extends HTMLElement {
  connectedCallback() {
    this.addEventListener('input', onInput)
  }

  disconnectedCallback() {
    this.removeEventListener('input', onInput)
  }
}

if (!window.customElements.get('password-strength')) {
  window.PasswordStrengthElement = PasswordStrengthElement
  window.customElements.define('password-strength', PasswordStrengthElement)
}

declare global {
  interface Window {
    PasswordStrengthElement: typeof PasswordStrengthElement
  }
}

function onInput(event: Event) {
  const passwordStrength = event.currentTarget
  if (!(passwordStrength instanceof PasswordStrengthElement)) return
  const passwordInput = event.target
  if (!(passwordInput instanceof HTMLInputElement)) return
  const form = passwordInput.form
  if (!(form instanceof HTMLFormElement)) return

  const result = validatePassword(passwordInput.value, {
    minimumCharacterCount: Number(passwordStrength.getAttribute('minimum-character-count')!),
    passphraseLength: Number(passwordStrength.getAttribute('passphrase-length'))
  })

  if (result.valid) {
    passwordInput.setCustomValidity('')
    const errorHint = passwordStrength.querySelector('dl.form-group')
    if (errorHint) {
      errorHint.classList.remove('errored')
      errorHint.classList.add('successed')
    }
  } else {
    passwordInput.setCustomValidity(passwordStrength.getAttribute('invalid-message')!)
  }

  highlightPasswordStrengthExplainer(passwordStrength, result)
  validate(form)
}

function validatePassword(password: string, options: PasswordOptions): Result {
  const result = {
    valid: false,
    hasMinimumCharacterCount: password.length >= options.minimumCharacterCount,
    hasMinimumPassphraseLength: options.passphraseLength !== 0 && password.length >= options.passphraseLength,
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password)
  }
  result.valid =
    result.hasMinimumPassphraseLength || (result.hasMinimumCharacterCount && result.hasLowerCase && result.hasNumber)
  return result
}

function highlightPasswordStrengthExplainer(element: HTMLElement, result: Result) {
  const moreThanNCharactersEl = element.querySelector('[data-more-than-n-chars]')
  const minCharsEl = element.querySelector<HTMLElement>('[data-min-chars]')!
  const numberReqEl = element.querySelector<HTMLElement>('[data-number-requirement]')!
  const letterReqEl = element.querySelector<HTMLElement>('[data-letter-requirement]')!
  const errorClasses = element
    .getAttribute('error-class')!
    .split(' ')
    .filter(t => t.length > 0)
  const passClasses = element
    .getAttribute('pass-class')!
    .split(' ')
    .filter(t => t.length > 0)

  for (const part of [moreThanNCharactersEl, minCharsEl, numberReqEl, letterReqEl]) {
    part?.classList.remove(...errorClasses, ...passClasses)
  }

  if (result.hasMinimumPassphraseLength && moreThanNCharactersEl) {
    moreThanNCharactersEl.classList.add(...passClasses)
  } else if (result.valid) {
    minCharsEl.classList.add(...passClasses)
    numberReqEl.classList.add(...passClasses)
    letterReqEl.classList.add(...passClasses)
  } else {
    const charTextClasses = result.hasMinimumCharacterCount ? passClasses : errorClasses
    const numberTextClasses = result.hasNumber ? passClasses : errorClasses
    const caseTextClasses = result.hasLowerCase ? passClasses : errorClasses

    moreThanNCharactersEl?.classList.add(...errorClasses)
    minCharsEl.classList.add(...charTextClasses)
    numberReqEl.classList.add(...numberTextClasses)
    letterReqEl.classList.add(...caseTextClasses)
  }
}
