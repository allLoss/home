import {controller, target} from '@github/catalyst'
import {fetchSafeDocumentFragment} from '../fetch'
import {parseHTML} from '../parse-html'
import {toggleFormSubmissionInFlight} from './dropdown-list'

@controller
class OptionsPopoverElement extends HTMLElement {
  @target dropdownDetails: HTMLDetailsElement
  @target modalDetails: HTMLDetailsElement
  @target settingsModal: HTMLElement
  @target skuForm: HTMLFormElement
  @target resultMessage: HTMLElement
  @target errorMessage: HTMLElement
  @target exportDetails: HTMLDetailsElement
  @target dynamicSkus: HTMLElement

  reset(event: Event) {
    event.preventDefault() // We don't want default details-dialog-close behavior, which resets the form.
    this.dropdownDetails.hidden = false
    this.modalDetails.hidden = true
    this.exportDetails.hidden = true

    this.skuForm.hidden = false
    while (this.resultMessage.firstChild) {
      this.resultMessage.removeChild(this.resultMessage.firstChild)
    }
    this.resultMessage.hidden = true
    this.errorMessage.hidden = true
  }

  showSettingsModal() {
    this.dropdownDetails.hidden = true
    this.modalDetails.open = true
    this.modalDetails.hidden = false
    if (this.dynamicSkus) {
      // Setting `src` attribute on `<include-fragment>` will trigger a load request,
      // which updates the list content.
      this.dynamicSkus.setAttribute('src', this.dynamicSkus.getAttribute('data-src')!)
    }
  }

  showExportModal() {
    this.dropdownDetails.hidden = true
    this.exportDetails.open = true
    this.exportDetails.hidden = false
    this.insertBranchExportComponent()
  }

  async updateSku() {
    toggleFormSubmissionInFlight(this.skuForm)
    try {
      const response = await fetch(this.skuForm.action, {
        method: this.skuForm.method,
        body: new FormData(this.skuForm),
        headers: {
          // We're passing *both* the Accept header and the XHR header. Ideally
          // we'd *only* pass Accept but currently the SAML filter only returns a
          // 401 for XHR requests. So we need to pass both headers to get the
          // behavior we want here.
          Accept: 'text/fragment+html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      if (response.ok) {
        const html = parseHTML(document, await response.text())
        this.resultMessage.appendChild(html)
        this.skuForm.hidden = true
        this.resultMessage.hidden = false
      } else {
        this.errorMessage.hidden = false
        this.skuForm.hidden = true
      }
    } finally {
      toggleFormSubmissionInFlight(this.skuForm)
    }
  }

  async insertBranchExportComponent() {
    const container = this.querySelector<HTMLElement>('[data-branch-export-url]')
    if (!container) return

    const url = container.getAttribute('data-branch-export-url')
    if (!url) return

    const branchExportComponentHTML = await fetchSafeDocumentFragment(document, url)
    if (!branchExportComponentHTML) return

    // It would be nicer to use replaceChildren but it's too recent and still unsupported in TypeScript.
    container.innerHTML = ''
    container.appendChild(branchExportComponentHTML)
  }
}
