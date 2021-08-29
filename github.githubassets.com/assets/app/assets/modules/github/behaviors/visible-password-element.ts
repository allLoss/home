import {controller, target} from '@github/catalyst'

@controller
class VisiblePasswordElement extends HTMLElement {
  @target input: HTMLInputElement
  @target showButton: HTMLElement
  @target hideButton: HTMLElement

  show() {
    this.input.type = 'text'
    this.input.focus()
    this.showButton.hidden = true
    this.hideButton.hidden = false
  }

  hide() {
    this.input.type = 'password'
    this.input.focus()
    this.hideButton.hidden = true
    this.showButton.hidden = false
  }
}
