import {controller, target} from '@github/catalyst'
import DetailsDialogElement from '@github/details-dialog-element'
import {parseHTML} from '../parse-html'
import {prefetchCodespaceLocation} from '../prefetch-codespace-location'

@controller
class PrefetchPaneElement extends HTMLElement {
  @target skuSelect: HTMLElement | undefined
  @target skuError: HTMLElement | undefined
  @target loadingVscode: HTMLElement | undefined
  @target vscodePoller: HTMLElement | undefined
  @target openSkuButton: HTMLElement | undefined
  @target skipSkuButton: HTMLElement | undefined
  private prefetching = false
  private remainingRetries = 3 // arbitrary #, to avoid a transient issue
  private shownButton: HTMLElement | undefined
  private currentLocation: string

  async connectedCallback() {
    if (this.openSkuButton && this.skipSkuButton) {
      // We want to be more eager about fetching SKUs when it's
      // possible we can skip the modal entirely.
      this.prefetchLocationAndSkus()
    } else {
      this.showOpenSkuButton()
    }
  }

  async prefetchLocationAndSkus() {
    if (this.prefetching) return
    const form =
      document.querySelector<HTMLFormElement>('form.js-prefetch-codespace-location') ||
      document.querySelector<HTMLFormElement>('form.js-open-in-vscode-form') ||
      document.querySelector<HTMLFormElement>('form.js-open-in-web-form')

    if (form) {
      this.prefetching = true

      // Only returns on first success, afterwards we'll need to pull it from the ivar.
      const locationJSON = await prefetchCodespaceLocation(form)
      if (locationJSON) this.currentLocation = locationJSON.current

      if (!this.skuSelect) return // Cases where the user doesn't have SKU management enabled.
      const skusUrl = this.skuSelect.getAttribute('data-codespace-skus-url')

      if (this.currentLocation && skusUrl) {
        const response = await fetch(`${skusUrl}&location=${this.currentLocation}`, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'text/html_fragment'
          }
        })
        if (response.ok) {
          const html = parseHTML(document, await response.text())

          // If the user has only one valid SKU, don't bother showing the selection modal.
          // Still show it if there are any invalid ones ruled out by the devcontainer, though.
          const inputs = Array.from(html.querySelectorAll("input[name='codespace[sku_name]']")) as HTMLInputElement[]
          const enabledInputs = inputs.filter((a: HTMLInputElement) => !a.disabled)
          const onlyOneChoice = enabledInputs.length === 1 && inputs.length === 1
          if (onlyOneChoice) {
            enabledInputs[0].select()
            this.showSkipSkuButton()
          } else {
            this.showOpenSkuButton()
          }

          this.skuSelect.replaceWith(html)
          this.skuSelect.hidden = false
          if (this.skuError) this.skuError.hidden = true
        } else {
          this.showOpenSkuButton()
          this.remainingRetries -= 1
          if (this.remainingRetries > 0) this.prefetching = false
          this.skuSelect.hidden = true
          if (this.skuError) this.skuError.hidden = false
        }
      }
    }
  }

  showOpenSkuButton() {
    if (this.shownButton === undefined && this.openSkuButton) {
      this.shownButton = this.openSkuButton
      this.shownButton.hidden = false
      this.skipSkuButton?.remove()
    }
  }

  showSkipSkuButton() {
    if (this.shownButton === undefined && this.skipSkuButton) {
      this.shownButton = this.skipSkuButton
      this.shownButton.hidden = false

      // We need to hide the parent details in this case as the button we're removing
      // is its summary, so its absence reverts the DOM to a default "Details >".
      const details = this.openSkuButton?.parentElement
      if (details && details instanceof HTMLDetailsElement) details.hidden = true

      this.openSkuButton?.remove()
    }
  }

  toggleLoadingVscode() {
    if (this.loadingVscode) {
      const isHidden = this.loadingVscode.hidden
      const children = this.children
      for (let i = 0; i < children.length; i++) {
        ;(children[i] as HTMLElement).hidden = isHidden
      }
      this.loadingVscode.hidden = !isHidden
    }
  }

  pollForVscode(event: CustomEvent) {
    if (this.vscodePoller) {
      this.toggleLoadingVscode()
      const pollingUrl = (event.currentTarget as HTMLElement).getAttribute('data-src')
      if (pollingUrl) this.vscodePoller.setAttribute('src', pollingUrl)
    }
  }
}
