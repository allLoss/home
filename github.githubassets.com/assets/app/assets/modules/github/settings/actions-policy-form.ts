import {controller, target} from '@github/catalyst'

@controller
class ActionsPolicyFormElement extends HTMLElement {
  @target specificOptions: HTMLElement
  @target submitButton: HTMLButtonElement
  @target selectRadio: HTMLInputElement

  connectedCallback() {
    // Submit button is disabled until a change is made
    this.submitButton.disabled = true

    // Incase user refreshes the page and the form saved state in Firefox
    this.toggleSpecificOptions()
  }

  enableForm() {
    this.submitButton.disabled = false
  }

  toggleSpecificOptions() {
    if (this.selectRadio.checked) {
      this.specificOptions.hidden = false
    } else {
      this.specificOptions.hidden = true
    }
  }
}
