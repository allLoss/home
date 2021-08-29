import {controller, target} from '@github/catalyst'

@controller
class VscodeForwarderElement extends HTMLElement {
  @target vscodeLink: HTMLSpanElement

  async connectedCallback() {
    const codespaceUrl = this.getAttribute('data-codespace-url')
    if (codespaceUrl) window.location.href = codespaceUrl
  }
}
