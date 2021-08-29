import {getUtf8StringLength} from '../text'
import {onFocus} from '../onfocus'

function showRemainingCharacterCount(value: string, limit: number, field: HTMLTextAreaElement | HTMLInputElement) {
  const container = field.closest('.js-characters-remaining-container')
  if (!container) {
    return
  }

  const remainingEl = container.querySelector<HTMLElement>('.js-characters-remaining')!
  const suffix = String(remainingEl.getAttribute('data-suffix'))
  const valueLength = getUtf8StringLength(value)
  const remainingCount = limit - valueLength

  if (remainingCount <= 20) {
    remainingEl.textContent = `${remainingCount} ${suffix}`
    remainingEl.classList.toggle('color-text-danger', remainingCount <= 5)
    remainingEl.hidden = false
  } else {
    remainingEl.hidden = true
  }
}

function getFieldLimit(input: HTMLTextAreaElement | HTMLInputElement): number {
  if (input.hasAttribute('data-maxlength')) {
    return parseInt(input.getAttribute('data-maxlength') || '')
  }

  return input.maxLength
}

export function hasExceededCharacterLimit(input: HTMLTextAreaElement | HTMLInputElement): boolean {
  const limit = getFieldLimit(input)
  const valueLength = getUtf8StringLength(input.value)
  const remainingCount = limit - valueLength

  return remainingCount < 0
}

export function updateInputRemainingCharacters(input: HTMLTextAreaElement | HTMLInputElement) {
  const limit = getFieldLimit(input)
  showRemainingCharacterCount(input.value, limit, input)
}

export function resetCharactersRemainingCounts(container: Element) {
  const charContainers = container.querySelectorAll('.js-characters-remaining-container')

  for (const charContainer of charContainers) {
    const input = charContainer.querySelector<HTMLInputElement>('.js-characters-remaining-field')!
    updateInputRemainingCharacters(input)
  }
}

onFocus('.js-characters-remaining-field', function (input) {
  function onInput() {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      updateInputRemainingCharacters(input)
    }
  }
  onInput()

  input.addEventListener('input', onInput)
  input.addEventListener(
    'blur',
    () => {
      input.removeEventListener('input', onInput)
    },
    {once: true}
  )
})
