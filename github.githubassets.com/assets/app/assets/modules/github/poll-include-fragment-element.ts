/* eslint eslint-comments/no-use: off */

import './include-fragment-element-hacks'
import IncludeFragmentElement from '@github/include-fragment-element'

class PollIncludeFragmentElement extends IncludeFragmentElement {
  async fetch(request: Request, ms = 1000): Promise<Response> {
    const response = await super.fetch(request)

    if (response.status === 202) {
      await new Promise(resolve => setTimeout(resolve, ms))
      return this.fetch(request, ms * 1.5)
    } else {
      return response
    }
  }
}

if (!window.customElements.get('poll-include-fragment')) {
  window.PollIncludeFragmentElement = PollIncludeFragmentElement
  window.customElements.define('poll-include-fragment', PollIncludeFragmentElement)
}

declare global {
  interface Window {
    PollIncludeFragmentElement: typeof PollIncludeFragmentElement
  }
}
