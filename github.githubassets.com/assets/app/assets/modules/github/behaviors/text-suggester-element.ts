import {controller, target} from '@github/catalyst'

@controller
class TextSuggesterElement extends HTMLElement {
  @target input: HTMLInputElement
  @target suggestionContainer: HTMLElement
  @target suggestion: HTMLElement

  acceptSuggestion() {
    if (this.suggestion?.textContent) {
      this.input.value = this.suggestion.textContent
      this.input.dispatchEvent(new Event('input'))
      if (this.suggestionContainer) this.suggestionContainer.hidden = true
      this.input.focus()
    }
  }
}
