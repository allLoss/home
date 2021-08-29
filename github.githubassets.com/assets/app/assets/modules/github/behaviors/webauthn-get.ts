import {attr, controller, target, targets} from '@github/catalyst'
import {get, supported} from '@github/webauthn-json'
import type {CredentialRequestOptionsJSON} from '@github/webauthn-json'
import {requestSubmit} from '../form'

enum State {
  Initializing = 'initializing',
  Unsupported = 'unsupported',
  Ready = 'ready',
  Waiting = 'waiting',
  Error = 'error',
  Submitting = 'submitting'
}

@controller
export class WebauthnGetElement extends HTMLElement {
  state: State = State.Initializing
  @target button: HTMLButtonElement
  // `messages` contains all the message elements.
  @targets messages: HTMLElement[]
  @target unsupportedMessage: HTMLElement
  @target waitingMessage: HTMLElement
  @target errorMessage: HTMLElement

  @attr json = ''
  // We can't call this `autofocus`, since that's already an `HTMLElement` property.
  @attr autofocusWhenReady = false

  private originalButtonText: string | null
  private hasErrored = false

  connectedCallback(): void {
    this.originalButtonText = this.button.textContent
    this.setState(supported() ? State.Ready : State.Unsupported)
  }

  setState(state: State): void {
    // Reset to defaults
    this.button.textContent = this.hasErrored ? this.button.getAttribute('data-retry-message') : this.originalButtonText
    this.button.disabled = false
    this.button.hidden = false
    for (const elem of this.messages) {
      elem.hidden = true
    }

    switch (state) {
      case State.Initializing:
        this.button.disabled = true
        break
      case State.Unsupported:
        this.button.disabled = true
        this.unsupportedMessage.hidden = false
        break
      case State.Ready:
        if (this.autofocusWhenReady) {
          this.button.focus()
        }
        break
      case State.Waiting:
        this.waitingMessage.hidden = false
        this.button.hidden = true
        break
      case State.Error:
        this.errorMessage.hidden = false
        break
      case State.Submitting:
        this.button.textContent = 'Verifying…'
        this.button.disabled = true
        break
      default:
        throw new Error('invalid state')
    }

    this.state = state
  }

  async prompt(event: Event): Promise<void> {
    event.preventDefault() // prevent default page form submission
    this.dispatchEvent(new CustomEvent('webauthn-get-prompt'))
    try {
      this.setState(State.Waiting)

      const json: CredentialRequestOptionsJSON = JSON.parse(this.json)
      const signResponse = await get(json)
      this.setState(State.Submitting)

      // Each `<webauthn-get>` element is currently embedded in a form (not
      // the other way around), so we have to query for for the form outside of it.
      const form = this.closest<HTMLFormElement>('.js-webauthn-form')!
      const responseField = form.querySelector<HTMLInputElement>('.js-webauthn-response')!
      responseField.value = JSON.stringify(signResponse)
      requestSubmit(form)
    } catch (error) {
      this.hasErrored = true
      this.setState(State.Error)
      throw error
    }
  }
}

enum SudoPasswordElementState {
  Initializing = 'initializing',
  ShowingForm = 'showing-form',
  ShowingRevealer = 'showing-revealer'
}

@controller
export class SudoPasswordElement extends HTMLElement {
  @attr state: SudoPasswordElementState = SudoPasswordElementState.ShowingForm

  @target revealer: HTMLElement
  @target form: HTMLElement
  @target passwordField: HTMLInputElement

  // Note: The form is revealed in the DOM by default, because we want to make
  // sure that the form loads when JS is not working.
  connectedCallback(): void {
    // Update the DOM from its default (showing the password for, in case JS
    // doesn't work) to the initial state.
    this.setState(this.state)
  }

  setState(state: SudoPasswordElementState): void {
    // Reset to defaults
    this.revealer.hidden = true
    this.form.hidden = false

    switch (state) {
      case SudoPasswordElementState.Initializing:
        break
      case SudoPasswordElementState.ShowingForm:
        this.passwordField.focus()
        this.dispatchEvent(new CustomEvent('sudo-password-showing-form'))
        break
      case SudoPasswordElementState.ShowingRevealer:
        this.revealer.hidden = false
        this.form.hidden = true
        break
      default:
        throw new Error('invalid state')
    }

    this.state = state
  }

  reveal(): void {
    this.setState(SudoPasswordElementState.ShowingForm)
  }
}

@controller
export class SudoAuthElement extends HTMLElement {
  // `<webauthn-get>` is only in the DOM if the user has has a necessary
  // registration.
  @target webauthnGet: WebauthnGetElement
  @target sudoPassword: SudoPasswordElement

  connectedCallback(): void {
    this.webauthnGet?.addEventListener('webauthn-get-prompt', () => {
      this.sudoPassword.setState(SudoPasswordElementState.ShowingRevealer)
    })

    this.sudoPassword.addEventListener('sudo-password-showing-form', () => {
      this.webauthnGet?.setState(State.Ready)
    })
  }
}
